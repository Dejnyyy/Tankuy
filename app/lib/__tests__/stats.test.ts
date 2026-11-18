import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEntries,
  normalizeEntry,
  stationKey,
  cleanMileage,
  computeConsumption,
  computeStats,
  buildSeries,
  monthComparison,
  yearProjection,
  daysSinceLast,
  filterEntries,
  rangeFrom,
  daypartOf,
  type RawEntry,
} from '../stats';

let seq = 0;
const raw = (p: Partial<RawEntry> & { date: string; totalCost: number | string }): RawEntry => ({
  id: `e${++seq}`,
  vehicleId: 'v1',
  stationName: 'Tank ONO',
  ...p,
});

const NOW = new Date(2026, 10, 18, 12, 0); // 18 Nov 2026

test('normalizeEntry parses MySQL strings, ISO dates and derives price', () => {
  const e = normalizeEntry(
    raw({ date: '2026-11-14T00:00:00.000Z', time: '14:03:00', totalCost: '2008.70', totalLiters: '53.00', pricePerLiter: null, mileage: '264601' }),
  );
  assert.equal(e.date, '2026-11-14');
  assert.equal(e.time, '14:03');
  assert.equal(e.cost, 2008.7);
  assert.equal(e.liters, 53);
  assert.ok(Math.abs((e.price as number) - 37.9) < 1e-9);
  assert.equal(e.mileage, 264601);
});

test('normalizeEntry handles missing optional fields', () => {
  const e = normalizeEntry({ id: 'x', date: '2026-01-02', totalCost: 500 });
  assert.equal(e.liters, null);
  assert.equal(e.price, null);
  assert.equal(e.mileage, null);
  assert.equal(e.station, null);
  assert.equal(e.vehicleId, null);
});

test('stationKey merges spelling variants', () => {
  assert.equal(stationKey('makro'), stationKey('Makro'));
  assert.equal(stationKey('Makro Cash & Carry'), 'makro');
  assert.equal(stationKey('A.G. Service S.r.o.'), 'a g service');
  assert.equal(stationKey(''), null);
  assert.equal(stationKey(null), null);
});

test('cleanMileage drops an extra-digit typo and backwards readings', () => {
  const es = normalizeEntries([
    raw({ date: '2026-10-11', totalCost: 2120, totalLiters: 48.74, mileage: 262767 }),
    raw({ date: '2026-10-25', totalCost: 1626, totalLiters: 38.25, mileage: 263286 }),
    raw({ date: '2026-11-06', totalCost: 1830, totalLiters: 47.05, mileage: 2633916 }),
    raw({ date: '2026-11-14', totalCost: 2008, totalLiters: 53, mileage: 264601 }),
    raw({ date: '2026-11-15', totalCost: 100, totalLiters: 2, mileage: 264000 }),
  ]);
  const kept = cleanMileage(es).map((e) => e.mileage);
  assert.deepEqual(kept, [262767, 263286, 264601]);
});

test('computeConsumption: full-tank method, folds fills without mileage', () => {
  const es = normalizeEntries([
    raw({ date: '2026-01-01', totalCost: 2000, totalLiters: 50, mileage: 10000 }),
    raw({ date: '2026-01-10', totalCost: 800, totalLiters: 20 }), // no mileage → folded
    raw({ date: '2026-01-20', totalCost: 1200, totalLiters: 30, mileage: 10800 }),
    raw({ date: '2026-02-01', totalCost: 1600, totalLiters: 40, mileage: 11300 }),
  ]);
  const c = computeConsumption(es);
  assert.equal(c.segments.length, 2);
  // (20 + 30) L / 800 km = 6.25
  assert.ok(Math.abs(c.segments[0].l100 - 6.25) < 1e-9);
  // 40 / 500 = 8
  assert.ok(Math.abs(c.segments[1].l100 - 8) < 1e-9);
  assert.equal(c.totalKm, 1300);
  assert.ok(Math.abs((c.avgL100 as number) - (90 / 1300) * 100) < 1e-9);
  assert.ok(Math.abs((c.costPerKm as number) - 3600 / 1300) < 1e-9);
});

test('computeConsumption rejects implausible segments and keeps vehicles apart', () => {
  const es = normalizeEntries([
    raw({ date: '2026-01-01', totalCost: 100, totalLiters: 50, mileage: 1000 }),
    raw({ date: '2026-01-02', totalCost: 100, totalLiters: 50, mileage: 1010 }), // 500 l/100km → dropped
    raw({ vehicleId: 'v2', date: '2026-01-03', totalCost: 100, totalLiters: 40, mileage: 50000 }),
    raw({ vehicleId: 'v2', date: '2026-01-15', totalCost: 100, totalLiters: 30, mileage: 50500 }),
  ]);
  const c = computeConsumption(es);
  assert.equal(c.segments.length, 1);
  assert.equal(c.segments[0].vehicleId, 'v2');
  assert.ok(Math.abs(c.segments[0].l100 - 6) < 1e-9);
});

test('computeConsumption with no mileage at all', () => {
  const es = normalizeEntries([raw({ date: '2026-01-01', totalCost: 1000, totalLiters: 25 })]);
  const c = computeConsumption(es);
  assert.equal(c.segments.length, 0);
  assert.equal(c.avgL100, null);
  assert.equal(c.costPerKm, null);
});

test('computeStats on empty input is all-null and does not throw', () => {
  const s = computeStats([], NOW);
  assert.equal(s.count, 0);
  assert.equal(s.avgCost, null);
  assert.equal(s.avgPrice, null);
  assert.equal(s.longestGap, null);
  assert.equal(s.weekday.top, null);
  assert.equal(s.stations.length, 0);
  assert.equal(s.nextFillEstimate, null);
  assert.equal(s.potentialSavings, null);
});

test('computeStats on a single entry', () => {
  const s = computeStats(normalizeEntries([raw({ date: '2026-11-02', totalCost: 1500, totalLiters: 40 })]), NOW);
  assert.equal(s.count, 1);
  assert.equal(s.avgIntervalDays, null);
  assert.equal(s.avgCost, 1500);
  assert.equal(s.maxLiters, 40);
  assert.equal(s.estimatedTank, null); // needs ≥3 fills
  assert.equal(s.weekday.top, 0); // 2 Nov 2026 is a Monday
});

test('computeStats: intervals, weekday, day parts, stations, savings', () => {
  const es = normalizeEntries([
    raw({ date: '2026-09-07', time: '08:10', stationName: 'Makro', totalCost: 400, totalLiters: 10 }), // 40/L Mon
    raw({ date: '2026-09-14', time: '18:30', stationName: 'makro', totalCost: 410, totalLiters: 10 }), // 41/L Mon
    raw({ date: '2026-09-28', time: '18:45', stationName: 'Shell', totalCost: 450, totalLiters: 10 }), // 45/L Mon
    raw({ date: '2026-10-02', time: '19:00', stationName: 'Shell', totalCost: 470, totalLiters: 10 }), // 47/L Fri
  ]);
  const s = computeStats(es, NOW);
  assert.equal(s.count, 4);
  assert.equal(s.avgIntervalDays, 25 / 3);
  assert.deepEqual(s.longestGap, { days: 14, from: '2026-09-14', to: '2026-09-28' });
  assert.deepEqual(s.shortestGap, { days: 4, from: '2026-09-28', to: '2026-10-02' });
  assert.equal(s.weekday.top, 0);
  assert.equal(s.weekday.counts[4], 1);
  assert.equal(s.dayparts.top, 4); // evening
  assert.equal(s.dayparts.withTime, 4);
  assert.equal(s.stations.length, 2);
  assert.equal(s.stations[0].count, 2);
  const makro = s.stations.find((x) => x.key === 'makro')!;
  assert.equal(makro.name, 'Makro');
  assert.ok(Math.abs((makro.avgPrice as number) - 40.5) < 1e-9);
  assert.equal(s.cheapestStation?.key, 'makro');
  assert.equal(s.priciestStation?.key, 'shell');
  // All fills within 30 days of the 40/L one: 10 × (1 + 5 + 7) = 130
  assert.ok(Math.abs((s.potentialSavings as number) - 130) < 1e-9);
  assert.equal(s.minPrice?.value, 40);
  assert.equal(s.maxPrice?.value, 47);
  assert.ok((s.priceTrendPerMonth as number) > 0);
  assert.equal(s.biggestFill?.liters, 10);
  assert.equal(s.mostExpensiveFill?.cost, 470);
  assert.ok(s.nextFillEstimate);
});

test('buildSeries month: continuous buckets, sums and weighted price', () => {
  const es = normalizeEntries([
    raw({ date: '2026-09-03', totalCost: 400, totalLiters: 10 }),
    raw({ date: '2026-09-20', totalCost: 600, totalLiters: 12 }),
    raw({ date: '2026-11-01', totalCost: 500, totalLiters: 10 }),
  ]);
  const cost = buildSeries(es, 'cost', 'month', NOW, 4);
  assert.deepEqual(cost.map((p) => p.key), ['2026-08-01', '2026-09-01', '2026-10-01', '2026-11-01']);
  assert.deepEqual(cost.map((p) => p.value), [0, 1000, 0, 500]);
  const price = buildSeries(es, 'price', 'month', NOW, 4);
  assert.equal(price[0].value, null);
  assert.ok(Math.abs((price[1].value as number) - 1000 / 22) < 1e-9);
  const liters = buildSeries(es, 'liters', 'month', NOW, 4);
  assert.equal(liters[1].value, 22);
});

test('buildSeries week buckets start on Monday and year starts at first entry', () => {
  const es = normalizeEntries([raw({ date: '2026-11-15', totalCost: 100 }), raw({ date: '2026-11-16', totalCost: 200 })]);
  const w = buildSeries(es, 'cost', 'week', NOW, 2);
  assert.deepEqual(w.map((p) => p.key), ['2026-11-09', '2026-11-16']);
  assert.deepEqual(w.map((p) => p.value), [100, 200]);
  const y = buildSeries(normalizeEntries([raw({ date: '2025-07-17', totalCost: 100 })]), 'cost', 'year', NOW);
  assert.deepEqual(y.map((p) => p.key), ['2025-01-01', '2026-01-01']);
});

test('monthComparison, projection, daysSinceLast, filters', () => {
  const es = normalizeEntries([
    raw({ date: '2026-10-05', totalCost: 1000 }),
    raw({ date: '2026-10-20', totalCost: 1000 }),
    raw({ date: '2026-11-10', totalCost: 1500 }),
  ]);
  const m = monthComparison(es, NOW);
  assert.equal(m.thisMonth.cost, 1500);
  assert.equal(m.lastMonth.cost, 2000);
  assert.equal(m.change, -0.25);
  const p = yearProjection(es, NOW);
  assert.equal(p.ytd, 3500);
  assert.ok(p.projected > 3500);
  assert.equal(daysSinceLast(es, NOW), 8);
  assert.equal(daysSinceLast([], NOW), null);
  assert.equal(filterEntries(es, { from: '2026-11-01' }).length, 1);
  assert.equal(filterEntries(es, { vehicleId: 'nope' }).length, 0);
  assert.equal(filterEntries(es, { vehicleId: 'all' }).length, 3);
  assert.equal(rangeFrom('ytd', NOW), '2026-01-01');
  assert.equal(rangeFrom('3m', NOW), '2026-08-18');
  assert.equal(rangeFrom('all', NOW), null);
  assert.equal(daypartOf(3), 0);
  assert.equal(daypartOf(23), 5);
});

test('computeConsumption flags partial-fill outliers and excludes them from records', () => {
  const rows = [
    { d: '2026-01-01', l: 40, m: 10000 },
    { d: '2026-01-10', l: 40, m: 10550 }, // 7.27
    { d: '2026-01-20', l: 40, m: 11100 }, // 7.27
    { d: '2026-01-30', l: 10, m: 11650 }, // 1.8 → filtered (< 2) entirely
    { d: '2026-02-05', l: 45, m: 11900 }, // 18 → outlier
    { d: '2026-02-15', l: 40, m: 12450 }, // 7.27
    { d: '2026-02-25', l: 38, m: 13000 }, // 6.9
  ];
  const es = normalizeEntries(rows.map((r) => raw({ date: r.d, totalCost: r.l * 40, totalLiters: r.l, mileage: r.m })));
  const c = computeConsumption(es);
  const out = c.segments.filter((s) => s.outlier);
  assert.equal(out.length, 1);
  assert.ok(Math.abs(out[0].l100 - 18) < 1e-9);
  assert.ok((c.worst as any).l100 < 8);
  assert.ok(Math.abs((c.best as any).l100 - 38 / 5.5) < 1e-9);
});
