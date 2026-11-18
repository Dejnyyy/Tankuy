/**
 * Pure, dependency-free statistics over fuel entries.
 *
 * Everything here works in metric + CZK (the DB's units); the UI converts for
 * display. All functions are deterministic given `now`, so they are unit-tested
 * in lib/__tests__/stats.test.ts (run: `npm test`).
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Shape the API returns (numbers may arrive as strings from MySQL DECIMAL). */
export interface RawEntry {
  id: string;
  vehicleId?: string | null;
  vehicleName?: string | null;
  stationName?: string | null;
  stationAddress?: string | null;
  date: string;
  time?: string | null;
  pricePerLiter?: number | string | null;
  totalLiters?: number | string | null;
  totalCost: number | string;
  mileage?: number | string | null;
  notes?: string | null;
  receiptImageUrl?: string | null;
}

export interface Entry {
  id: string;
  vehicleId: string | null;
  vehicleName: string | null;
  station: string | null;
  stationKey: string | null;
  address: string | null;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM or null */
  time: string | null;
  liters: number | null;
  /** Explicit price, or derived cost/liters when missing. */
  price: number | null;
  cost: number;
  mileage: number | null;
  notes: string | null;
  receiptImageUrl: string | null;
  /** ms timestamp of date (+time) in local time, for ordering. */
  ts: number;
}

export type Granularity = 'week' | 'month' | 'year';
export type Metric = 'cost' | 'liters' | 'price' | 'consumption';

export interface SeriesPoint {
  key: string;
  /** Start of the bucket (YYYY-MM-DD) */
  start: string;
  value: number | null;
  count: number;
}

export interface Segment {
  /** Date of the fill-up that closes the segment */
  date: string;
  fromDate: string;
  km: number;
  liters: number;
  cost: number;
  l100: number;
  vehicleId: string | null;
  /** Far from the median — usually a partial fill. Kept in totals, hidden from records. */
  outlier: boolean;
}

export interface StationStat {
  key: string;
  name: string;
  count: number;
  totalCost: number;
  totalLiters: number;
  /** Weighted (cost / liters) */
  avgPrice: number | null;
  lastDate: string;
  share: number;
}

export interface Gap {
  days: number;
  from: string;
  to: string;
}

export interface FullStats {
  count: number;
  firstDate: string | null;
  lastDate: string | null;
  daysTracked: number;
  totalCost: number;
  totalLiters: number;
  avgCost: number | null;
  avgLiters: number | null;
  medianLiters: number | null;
  /** Largest fill observed — a lower bound on tank size. */
  maxLiters: number | null;
  estimatedTank: number | null;
  avgPrice: number | null;
  minPrice: { value: number; date: string; station: string | null } | null;
  maxPrice: { value: number; date: string; station: string | null } | null;
  /** Linear regression slope of price over time, CZK/L per 30 days. */
  priceTrendPerMonth: number | null;
  /** Recent (last 90 days) weighted price vs. previous 90 days, as ratio - 1. */
  priceChangeRecent: number | null;
  biggestFill: Entry | null;
  smallestFill: Entry | null;
  mostExpensiveFill: Entry | null;
  cheapestFill: Entry | null;
  avgIntervalDays: number | null;
  medianIntervalDays: number | null;
  longestGap: Gap | null;
  shortestGap: Gap | null;
  avgKmBetween: number | null;
  weekday: { counts: number[]; cost: number[]; top: number | null };
  dayparts: { counts: number[]; top: number | null; withTime: number };
  hours: number[];
  topHour: number | null;
  stations: StationStat[];
  cheapestStation: StationStat | null;
  priciestStation: StationStat | null;
  /** What you'd save always paying the lowest price you paid within ±30 days. */
  potentialSavings: number | null;
  consumption: ConsumptionResult;
  months: MonthBucket[];
  avgMonthlyCost: number | null;
  avgMonthlyFills: number | null;
  busiestMonth: MonthBucket | null;
  priciestMonth: MonthBucket | null;
  kmPerMonth: number | null;
  latestMileage: number | null;
  nextFillEstimate: { date: string; inDays: number } | null;
}

export interface MonthBucket {
  key: string; // YYYY-MM
  cost: number;
  liters: number;
  count: number;
}

export interface ConsumptionResult {
  segments: Segment[];
  avgL100: number | null;
  totalKm: number;
  costPerKm: number | null;
  best: Segment | null;
  worst: Segment | null;
}

// ─── Parsing & normalisation ──────────────────────────────────────────────────

export function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Accepts "2026-11-14", "2026-11-14T00:00:00.000Z" or a Date. Returns YYYY-MM-DD. */
export function toIsoDate(v: unknown): string {
  if (v instanceof Date) return ymd(v);
  const s = String(v ?? '');
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : ymd(d);
}

export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse YYYY-MM-DD as a local date (midnight). */
export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function normTime(t: unknown): string | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(String(t));
  if (!m) return null;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

const STATION_NOISE =
  /\b(cash\s*&\s*carry|cash\s+and\s+carry|s\.?\s*r\.?\s*o\.?|a\.?\s*s\.?|spol\.?|cerpaci\s+stanice|cs)\b/g;

/**
 * Chains written many ways that are one station brand: any name containing the
 * word "ono" ("ONO", "Tank ONO", "TANK ONO Teplice") → key "tank ono".
 */
const CANONICAL_STATIONS: { word: string; key: string; name: string }[] = [
  { word: 'ono', key: 'tank ono', name: 'Tank ONO' },
];

/**
 * Merge spelling variants: "makro", "Makro", "Makro Cash & Carry" → "makro";
 * "ONO", "Tank ONO", "TANK ONO …" → "tank ono".
 */
export function stationKey(name: string | null | undefined): string | null {
  if (!name) return null;
  const k = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(STATION_NOISE, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!k) return null;
  const words = k.split(' ');
  const canon = CANONICAL_STATIONS.find((c) => words.includes(c.word));
  return canon ? canon.key : k;
}

export function normalizeEntry(r: RawEntry): Entry {
  const cost = toNum(r.totalCost) ?? 0;
  const liters = toNum(r.totalLiters);
  let price = toNum(r.pricePerLiter);
  if ((price === null || price <= 0) && liters && liters > 0 && cost > 0) {
    price = cost / liters;
  }
  const date = toIsoDate(r.date);
  const time = normTime(r.time);
  const d = parseDate(date);
  if (time) {
    const [h, mi] = time.split(':').map(Number);
    d.setHours(h, mi);
  }
  const mileage = toNum(r.mileage);
  const station = r.stationName?.trim() || null;
  return {
    id: String(r.id),
    vehicleId: r.vehicleId ?? null,
    vehicleName: r.vehicleName ?? null,
    station,
    stationKey: stationKey(station),
    address: r.stationAddress?.trim() || null,
    date,
    time,
    liters: liters && liters > 0 ? liters : null,
    price: price && price > 0 ? price : null,
    cost,
    mileage: mileage && mileage > 0 ? Math.round(mileage) : null,
    notes: r.notes ?? null,
    receiptImageUrl: r.receiptImageUrl ?? null,
    ts: d.getTime(),
  };
}

/** Normalise and sort ascending by time. */
export function normalizeEntries(raw: RawEntry[]): Entry[] {
  return raw.map(normalizeEntry).sort((a, b) => a.ts - b.ts || a.id.localeCompare(b.id));
}

export interface EntryFilter {
  vehicleId?: string | null; // null/undefined/'all' = all
  from?: string | null; // inclusive YYYY-MM-DD
  to?: string | null; // inclusive
}

export function filterEntries(entries: Entry[], f: EntryFilter): Entry[] {
  return entries.filter(
    (e) =>
      (!f.vehicleId || f.vehicleId === 'all' || e.vehicleId === f.vehicleId) &&
      (!f.from || e.date >= f.from) &&
      (!f.to || e.date <= f.to),
  );
}

// ─── Small math helpers ───────────────────────────────────────────────────────

const DAY = 86_400_000;

export function daysBetween(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / DAY);
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function sum(xs: number[]): number {
  let t = 0;
  for (const x of xs) t += x;
  return t;
}

function weightedPrice(es: Entry[]): number | null {
  let c = 0;
  let l = 0;
  for (const e of es) {
    if (e.liters && e.price) {
      c += e.liters * e.price;
      l += e.liters;
    }
  }
  return l > 0 ? c / l : null;
}

// ─── Consumption ──────────────────────────────────────────────────────────────

const MIN_L100 = 2;
const MAX_L100 = 30;
const MAX_KM_PER_DAY = 1500;

/**
 * Drop odometer readings that are obviously typos (an extra digit, a reading
 * lower than the previous one). Input must be one vehicle, sorted ascending.
 */
export function cleanMileage(entries: Entry[]): Entry[] {
  const withM = entries.filter((e) => e.mileage !== null);
  if (withM.length === 0) return [];
  const med = median(withM.map((e) => e.mileage as number)) as number;
  const plausible = withM.filter((e) => {
    const m = e.mileage as number;
    return m <= med * 5 && m >= med / 5;
  });
  const kept: Entry[] = [];
  for (const e of plausible) {
    const prev = kept[kept.length - 1];
    if (!prev) {
      kept.push(e);
      continue;
    }
    const dKm = (e.mileage as number) - (prev.mileage as number);
    const dDays = Math.max(1, daysBetween(prev.date, e.date));
    // Backwards readings and impossible jumps are typos — skip them.
    if (dKm < 0) continue;
    if (dKm > MAX_KM_PER_DAY * dDays + 2000) continue;
    kept.push(e);
  }
  return kept;
}

/**
 * Consumption by the full-tank method: between two odometer readings A → B,
 * the fuel burnt equals everything added after A up to and including B.
 * Fill-ups without a reading in between are folded into the next segment, so
 * occasional missing mileage doesn't break the chain. Segments with implausible
 * results (partial fills, typos) are dropped.
 */
export function computeConsumption(entries: Entry[]): ConsumptionResult {
  const byVehicle = new Map<string, Entry[]>();
  for (const e of entries) {
    const k = e.vehicleId ?? '__none__';
    if (!byVehicle.has(k)) byVehicle.set(k, []);
    byVehicle.get(k)!.push(e);
  }

  const segments: Segment[] = [];
  for (const list of byVehicle.values()) {
    const sorted = [...list].sort((a, b) => a.ts - b.ts);
    const anchors = cleanMileage(sorted);
    const anchorIdx = new Set(anchors.map((a) => a.id));
    let prevAnchor: Entry | null = null;
    let liters = 0;
    let cost = 0;
    let complete = true;
    for (const e of sorted) {
      if (prevAnchor) {
        if (e.liters === null) complete = false;
        liters += e.liters ?? 0;
        cost += e.cost;
      }
      if (anchorIdx.has(e.id)) {
        if (prevAnchor && complete) {
          const km = (e.mileage as number) - (prevAnchor.mileage as number);
          if (km > 0 && liters > 0) {
            const l100 = (liters / km) * 100;
            if (l100 >= MIN_L100 && l100 <= MAX_L100) {
              segments.push({
                date: e.date,
                fromDate: prevAnchor.date,
                km,
                liters,
                cost,
                l100,
                vehicleId: e.vehicleId,
                outlier: false,
              });
            }
          }
        }
        prevAnchor = e;
        liters = 0;
        cost = 0;
        complete = true;
      }
    }
  }
  segments.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const med = median(segments.map((s) => s.l100));
  if (med !== null && segments.length >= 4) {
    for (const s of segments) s.outlier = s.l100 < med * 0.6 || s.l100 > med * 1.7;
  }
  const totalKm = sum(segments.map((s) => s.km));
  const totalL = sum(segments.map((s) => s.liters));
  const totalC = sum(segments.map((s) => s.cost));
  let best: Segment | null = null;
  let worst: Segment | null = null;
  for (const s of segments) {
    if (s.km < 100 || s.outlier) continue; // too short / partial fill — not a fair record
    if (!best || s.l100 < best.l100) best = s;
    if (!worst || s.l100 > worst.l100) worst = s;
  }
  return {
    segments,
    avgL100: totalKm > 0 ? (totalL / totalKm) * 100 : null,
    totalKm,
    costPerKm: totalKm > 0 ? totalC / totalKm : null,
    best,
    worst,
  };
}

// ─── Buckets & series ─────────────────────────────────────────────────────────

/** Monday-based ISO-ish week start. */
export function weekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - dow);
  return x;
}

export function bucketStart(date: string, g: Granularity): string {
  const d = parseDate(date);
  if (g === 'week') return ymd(weekStart(d));
  if (g === 'month') return `${date.slice(0, 7)}-01`;
  return `${date.slice(0, 4)}-01-01`;
}

function addBucket(start: string, g: Granularity, n: number): string {
  const d = parseDate(start);
  if (g === 'week') d.setDate(d.getDate() + 7 * n);
  else if (g === 'month') d.setMonth(d.getMonth() + n);
  else d.setFullYear(d.getFullYear() + n);
  return ymd(d);
}

export const DEFAULT_BUCKETS: Record<Granularity, number> = { week: 12, month: 12, year: 6 };

/**
 * Build a continuous series of buckets ending at `now` (empty buckets included,
 * so gaps read as gaps). For 'year' the series starts at the first entry year.
 */
export function buildSeries(
  entries: Entry[],
  metric: Metric,
  g: Granularity,
  now: Date,
  bucketCount = DEFAULT_BUCKETS[g],
): SeriesPoint[] {
  const last = bucketStart(ymd(now), g);
  let first = addBucket(last, g, -(bucketCount - 1));
  if (g === 'year' && entries.length) {
    const firstYear = bucketStart(entries[0].date, 'year');
    first = firstYear < first ? first : firstYear;
  }
  const keys: string[] = [];
  for (let k = first; k <= last; k = addBucket(k, g, 1)) keys.push(k);

  const groups = new Map<string, Entry[]>();
  for (const e of entries) {
    const k = bucketStart(e.date, g);
    if (k < first || k > last) continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(e);
  }

  let segByBucket: Map<string, Segment[]> | null = null;
  if (metric === 'consumption') {
    segByBucket = new Map();
    for (const s of computeConsumption(entries).segments) {
      const k = bucketStart(s.date, g);
      if (!segByBucket.has(k)) segByBucket.set(k, []);
      segByBucket.get(k)!.push(s);
    }
  }

  return keys.map((k) => {
    const es = groups.get(k) ?? [];
    let value: number | null = null;
    if (metric === 'cost') value = sum(es.map((e) => e.cost));
    else if (metric === 'liters') value = sum(es.map((e) => e.liters ?? 0));
    else if (metric === 'price') value = weightedPrice(es);
    else {
      const segs = segByBucket!.get(k) ?? [];
      const km = sum(segs.map((s) => s.km));
      value = km > 0 ? (sum(segs.map((s) => s.liters)) / km) * 100 : null;
    }
    return { key: k, start: k, value, count: es.length };
  });
}

/** Per fill-up price series (for the price-over-time chart in Stats). */
export function priceSeries(entries: Entry[]): { date: string; value: number; station: string | null }[] {
  return entries
    .filter((e) => e.price !== null)
    .map((e) => ({ date: e.date, value: e.price as number, station: e.station }));
}

export function monthBuckets(entries: Entry[], now: Date): MonthBucket[] {
  if (!entries.length) return [];
  const map = new Map<string, MonthBucket>();
  const firstKey = entries[0].date.slice(0, 7);
  const lastKey = ymd(now).slice(0, 7);
  const end = lastKey > entries[entries.length - 1].date.slice(0, 7) ? lastKey : entries[entries.length - 1].date.slice(0, 7);
  for (let k = firstKey; k <= end; ) {
    map.set(k, { key: k, cost: 0, liters: 0, count: 0 });
    const d = parseDate(`${k}-01`);
    d.setMonth(d.getMonth() + 1);
    k = ymd(d).slice(0, 7);
  }
  for (const e of entries) {
    const b = map.get(e.date.slice(0, 7));
    if (!b) continue;
    b.cost += e.cost;
    b.liters += e.liters ?? 0;
    b.count += 1;
  }
  return [...map.values()];
}

// ─── Periods ──────────────────────────────────────────────────────────────────

export interface PeriodSummary {
  cost: number;
  liters: number;
  count: number;
  avgPrice: number | null;
}

export function summarize(es: Entry[]): PeriodSummary {
  return {
    cost: sum(es.map((e) => e.cost)),
    liters: sum(es.map((e) => e.liters ?? 0)),
    count: es.length,
    avgPrice: weightedPrice(es),
  };
}

export function monthRange(now: Date, offset = 0): { from: string; to: string } {
  const a = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const b = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { from: ymd(a), to: ymd(b) };
}

/** Compare this month so far against the same span of last month and full last month. */
export function monthComparison(entries: Entry[], now: Date) {
  const cur = monthRange(now, 0);
  const prev = monthRange(now, -1);
  const thisMonth = summarize(filterEntries(entries, cur));
  const lastMonth = summarize(filterEntries(entries, prev));
  const change = lastMonth.cost > 0 ? thisMonth.cost / lastMonth.cost - 1 : null;
  return { thisMonth, lastMonth, change };
}

export type RangeKey = '3m' | '6m' | '12m' | 'ytd' | 'all';

export function rangeFrom(range: RangeKey, now: Date): string | null {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (range) {
    case '3m':
      d.setMonth(d.getMonth() - 3);
      return ymd(d);
    case '6m':
      d.setMonth(d.getMonth() - 6);
      return ymd(d);
    case '12m':
      d.setFullYear(d.getFullYear() - 1);
      return ymd(d);
    case 'ytd':
      return `${now.getFullYear()}-01-01`;
    default:
      return null;
  }
}

/** Projected spend for the current calendar year (YTD pace, fallback trailing 12m). */
export function yearProjection(entries: Entry[], now: Date) {
  const year = now.getFullYear();
  const ytd = summarize(filterEntries(entries, { from: `${year}-01-01`, to: ymd(now) }));
  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year + 1, 0, 1).getTime();
  const elapsed = Math.max(1, (now.getTime() - start) / DAY);
  const total = (end - start) / DAY;
  const t12 = new Date(now);
  t12.setFullYear(t12.getFullYear() - 1);
  const trailing = summarize(filterEntries(entries, { from: ymd(t12), to: ymd(now) }));
  // Early in the year the YTD pace is noisy; blend toward trailing-12m.
  const w = Math.min(1, elapsed / 120);
  const pace = (ytd.cost / elapsed) * total;
  const projected = entries.length ? w * pace + (1 - w) * trailing.cost : 0;
  return { year, ytd: ytd.cost, projected, trailing12: trailing.cost };
}

// ─── Day parts ────────────────────────────────────────────────────────────────

/** Night 0–5, Morning 5–9, Late morning 9–12, Afternoon 12–17, Evening 17–21, Late 21–24 */
export const DAYPART_BOUNDS = [0, 5, 9, 12, 17, 21, 24];

export function daypartOf(hour: number): number {
  for (let i = 0; i < DAYPART_BOUNDS.length - 1; i++) {
    if (hour >= DAYPART_BOUNDS[i] && hour < DAYPART_BOUNDS[i + 1]) return i;
  }
  return 0;
}

function argmax(xs: number[]): number | null {
  let best = -1;
  let idx: number | null = null;
  xs.forEach((x, i) => {
    if (x > best && x > 0) {
      best = x;
      idx = i;
    }
  });
  return idx;
}

// ─── Stations ─────────────────────────────────────────────────────────────────

export function stationStats(entries: Entry[]): StationStat[] {
  const map = new Map<string, { names: Map<string, number>; es: Entry[] }>();
  for (const e of entries) {
    if (!e.stationKey || !e.station) continue;
    if (!map.has(e.stationKey)) map.set(e.stationKey, { names: new Map(), es: [] });
    const g = map.get(e.stationKey)!;
    g.es.push(e);
    g.names.set(e.station, (g.names.get(e.station) ?? 0) + 1);
  }
  const total = entries.filter((e) => e.stationKey).length || 1;
  const out: StationStat[] = [];
  for (const [key, g] of map) {
    // Canonical brand name if there is one; otherwise the most frequent spelling,
    // tie → the one with more capitals ("Makro" over "makro").
    const name = CANONICAL_STATIONS.find((c) => c.key === key)?.name ?? [...g.names.entries()].sort(
      (a, b) => b[1] - a[1] || caps(b[0]) - caps(a[0]) || a[0].length - b[0].length,
    )[0][0];
    out.push({
      key,
      name,
      count: g.es.length,
      totalCost: sum(g.es.map((e) => e.cost)),
      totalLiters: sum(g.es.map((e) => e.liters ?? 0)),
      avgPrice: weightedPrice(g.es),
      lastDate: g.es.reduce((m, e) => (e.date > m ? e.date : m), g.es[0].date),
      share: g.es.length / total,
    });
  }
  return out.sort((a, b) => b.count - a.count || b.totalCost - a.totalCost);
}

function caps(s: string): number {
  return (s.match(/[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/g) ?? []).length;
}

// ─── Everything ───────────────────────────────────────────────────────────────

export function computeStats(entries: Entry[], now: Date): FullStats {
  const es = [...entries].sort((a, b) => a.ts - b.ts);
  const n = es.length;
  const withLiters = es.filter((e) => e.liters !== null);
  const withPrice = es.filter((e) => e.price !== null);
  const litersArr = withLiters.map((e) => e.liters as number);

  const totalCost = sum(es.map((e) => e.cost));
  const totalLiters = sum(litersArr);
  const firstDate = n ? es[0].date : null;
  const lastDate = n ? es[n - 1].date : null;

  // Prices
  let minPrice: FullStats['minPrice'] = null;
  let maxPrice: FullStats['maxPrice'] = null;
  for (const e of withPrice) {
    const p = e.price as number;
    if (!minPrice || p < minPrice.value) minPrice = { value: p, date: e.date, station: e.station };
    if (!maxPrice || p > maxPrice.value) maxPrice = { value: p, date: e.date, station: e.station };
  }
  let priceTrendPerMonth: number | null = null;
  if (withPrice.length >= 3) {
    const t0 = withPrice[0].ts;
    const xs = withPrice.map((e) => (e.ts - t0) / (30 * DAY));
    const ys = withPrice.map((e) => e.price as number);
    const mx = sum(xs) / xs.length;
    const my = sum(ys) / ys.length;
    let num = 0;
    let den = 0;
    xs.forEach((x, i) => {
      num += (x - mx) * (ys[i] - my);
      den += (x - mx) ** 2;
    });
    priceTrendPerMonth = den > 0 ? num / den : null;
  }
  const today = ymd(now);
  const d90 = new Date(now);
  d90.setDate(d90.getDate() - 90);
  const d180 = new Date(now);
  d180.setDate(d180.getDate() - 180);
  const recentP = weightedPrice(filterEntries(es, { from: ymd(d90), to: today }));
  const prevP = weightedPrice(filterEntries(es, { from: ymd(d180), to: ymd(new Date(d90.getTime() - DAY)) }));
  const priceChangeRecent = recentP && prevP ? recentP / prevP - 1 : null;

  // Records
  const pick = (arr: Entry[], f: (e: Entry) => number, dir: 1 | -1) =>
    arr.reduce<Entry | null>((best, e) => (!best || dir * (f(e) - f(best)) > 0 ? e : best), null);
  const biggestFill = pick(withLiters, (e) => e.liters as number, 1);
  const smallestFill = pick(withLiters, (e) => e.liters as number, -1);
  const mostExpensiveFill = pick(es, (e) => e.cost, 1);
  const cheapestFill = pick(withPrice, (e) => e.price as number, -1);

  // Intervals
  const gaps: Gap[] = [];
  for (let i = 1; i < n; i++) {
    gaps.push({ days: daysBetween(es[i - 1].date, es[i].date), from: es[i - 1].date, to: es[i].date });
  }
  const gapDays = gaps.map((g) => g.days);
  const longestGap = gaps.reduce<Gap | null>((m, g) => (!m || g.days > m.days ? g : m), null);
  const positiveGaps = gaps.filter((g) => g.days > 0);
  const shortestGap = positiveGaps.reduce<Gap | null>((m, g) => (!m || g.days < m.days ? g : m), null);
  const avgIntervalDays = n >= 2 ? daysBetween(es[0].date, es[n - 1].date) / (n - 1) : null;

  // Weekday & time of day
  const wdCounts = [0, 0, 0, 0, 0, 0, 0];
  const wdCost = [0, 0, 0, 0, 0, 0, 0];
  const dpCounts = [0, 0, 0, 0, 0, 0];
  const hours = new Array(24).fill(0);
  let withTime = 0;
  for (const e of es) {
    const wd = (parseDate(e.date).getDay() + 6) % 7;
    wdCounts[wd] += 1;
    wdCost[wd] += e.cost;
    if (e.time) {
      const h = parseInt(e.time.slice(0, 2), 10);
      if (h >= 0 && h < 24) {
        hours[h] += 1;
        dpCounts[daypartOf(h)] += 1;
        withTime += 1;
      }
    }
  }

  // Stations
  const stations = stationStats(es);
  const priced = stations.filter((s) => s.avgPrice !== null && s.totalLiters > 0);
  // Prefer stations with ≥ 2 visits for "cheapest/priciest" when there are enough.
  const pool = priced.filter((s) => s.count >= 2).length >= 2 ? priced.filter((s) => s.count >= 2) : priced;
  const cheapestStation = pool.reduce<StationStat | null>(
    (m, s) => (!m || (s.avgPrice as number) < (m.avgPrice as number) ? s : m),
    null,
  );
  const priciestStation = pool.reduce<StationStat | null>(
    (m, s) => (!m || (s.avgPrice as number) > (m.avgPrice as number) ? s : m),
    null,
  );
  // Time-fair savings: each fill vs. the cheapest price you paid within ±30 days
  // (comparing against an all-time station average would mix in price trends).
  let potentialSavings: number | null = null;
  if (withPrice.length >= 2 && stations.length >= 2) {
    let sv = 0;
    for (const e of withPrice) {
      if (!e.liters) continue;
      let ref = e.price as number;
      for (const o of withPrice) {
        if (Math.abs(o.ts - e.ts) <= 30 * DAY && (o.price as number) < ref) ref = o.price as number;
      }
      sv += e.liters * ((e.price as number) - ref);
    }
    potentialSavings = sv;
  }

  // Mileage-based
  const consumption = computeConsumption(es);
  const kmGaps = consumption.segments.map((s) => s.km);
  // avg km between consecutive fills ~ total km / number of fills covered
  let fillsCovered = 0;
  for (const s of consumption.segments) {
    fillsCovered += es.filter(
      (e) => e.date > s.fromDate && e.date <= s.date && (e.vehicleId ?? null) === s.vehicleId,
    ).length || 1;
  }
  const avgKmBetween = kmGaps.length && fillsCovered ? consumption.totalKm / fillsCovered : null;

  let latestMileage: number | null = null;
  const cleaned = cleanMileage(es);
  if (cleaned.length) latestMileage = cleaned[cleaned.length - 1].mileage;

  const segDays = consumption.segments.length
    ? daysBetween(consumption.segments[0].fromDate, consumption.segments[consumption.segments.length - 1].date)
    : 0;
  const kmPerMonth = segDays >= 14 ? (consumption.totalKm / segDays) * 30.44 : null;

  // Months
  const months = monthBuckets(es, now);
  const avgMonthlyCost = months.length ? totalCost / months.length : null;
  const avgMonthlyFills = months.length ? n / months.length : null;
  const busiestMonth = months.reduce<MonthBucket | null>((m, b) => (!m || b.count > m.count ? b : m), null);
  const priciestMonth = months.reduce<MonthBucket | null>((m, b) => (!m || b.cost > m.cost ? b : m), null);

  let nextFillEstimate: FullStats['nextFillEstimate'] = null;
  if (lastDate && n >= 3) {
    const interval = median(gapDays.filter((d) => d > 0)) ?? avgIntervalDays;
    if (interval) {
      const d = parseDate(lastDate);
      d.setDate(d.getDate() + Math.round(interval));
      nextFillEstimate = { date: ymd(d), inDays: daysBetween(today, ymd(d)) };
    }
  }

  const maxLiters = litersArr.length ? Math.max(...litersArr) : null;

  return {
    count: n,
    firstDate,
    lastDate,
    daysTracked: firstDate && lastDate ? daysBetween(firstDate, lastDate) : 0,
    totalCost,
    totalLiters,
    avgCost: n ? totalCost / n : null,
    avgLiters: litersArr.length ? totalLiters / litersArr.length : null,
    medianLiters: median(litersArr),
    maxLiters,
    // Round the largest fill up to the next 5 L — tanks rarely run fully dry.
    estimatedTank: maxLiters && litersArr.length >= 3 ? Math.ceil((maxLiters + 2) / 5) * 5 : null,
    avgPrice: weightedPrice(es),
    minPrice,
    maxPrice,
    priceTrendPerMonth,
    priceChangeRecent,
    biggestFill,
    smallestFill,
    mostExpensiveFill,
    cheapestFill,
    avgIntervalDays,
    medianIntervalDays: median(gapDays),
    longestGap,
    shortestGap,
    avgKmBetween,
    weekday: { counts: wdCounts, cost: wdCost, top: argmax(wdCounts) },
    dayparts: { counts: dpCounts, top: argmax(dpCounts), withTime },
    hours,
    topHour: argmax(hours),
    stations,
    cheapestStation,
    priciestStation,
    potentialSavings,
    consumption,
    months,
    avgMonthlyCost,
    avgMonthlyFills,
    busiestMonth,
    priciestMonth,
    kmPerMonth,
    latestMileage,
    nextFillEstimate,
  };
}

/** Days from the last fill-up to `now` (null without entries). */
export function daysSinceLast(entries: Entry[], now: Date): number | null {
  if (!entries.length) return null;
  const last = entries.reduce((m, e) => (e.ts > m.ts ? e : m), entries[0]);
  return daysBetween(last.date, ymd(now));
}
