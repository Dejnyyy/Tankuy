import { parseDate } from './stats';

export type Lang = 'cs' | 'en';

const MONTHS: Record<Lang, string[]> = {
  cs: ['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const MONTHS_GEN_CS = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
const MONTHS_SHORT: Record<Lang, string[]> = {
  cs: ['led', 'úno', 'bře', 'dub', 'kvě', 'čvn', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
export const WEEKDAYS_SHORT: Record<Lang, string[]> = {
  cs: ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};
export const WEEKDAYS: Record<Lang, string[]> = {
  cs: ['pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota', 'neděle'],
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
};

export function asLang(l: string | undefined): Lang {
  return l && l.startsWith('en') ? 'en' : 'cs';
}

/** 12 345,6 (cs) / 12,345.6 (en). Uses a narrow no-break space for cs thousands. */
export function formatNumber(n: number | null | undefined, decimals = 0, lang: Lang = 'cs'): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '–';
  const neg = n < 0;
  const fixed = Math.abs(n).toFixed(decimals);
  const [int, frac] = fixed.split('.');
  const sep = lang === 'cs' ? ' ' : ',';
  const dec = lang === 'cs' ? ',' : '.';
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return `${neg ? '−' : ''}${grouped}${frac ? dec + frac : ''}`;
}

export function formatPercent(ratio: number | null | undefined, lang: Lang = 'cs', signed = true): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return '–';
  const v = ratio * 100;
  const s = formatNumber(Math.abs(v), Math.abs(v) < 10 ? 1 : 0, lang);
  const sign = signed ? (v > 0.05 ? '+' : v < -0.05 ? '−' : '') : '';
  return `${sign}${s}${lang === 'cs' ? ' %' : '%'}`;
}

/** "14. 11. 2026" / "Nov 14, 2026" */
export function formatDate(iso: string, lang: Lang = 'cs', withYear = true): string {
  const d = parseDate(iso);
  if (lang === 'cs') return `${d.getDate()}. ${d.getMonth() + 1}.${withYear ? ` ${d.getFullYear()}` : ''}`;
  return `${MONTHS_SHORT.en[d.getMonth()]} ${d.getDate()}${withYear ? `, ${d.getFullYear()}` : ''}`;
}

/** "14. listopadu" / "November 14" */
export function formatDateLong(iso: string, lang: Lang = 'cs', withYear = false): string {
  const d = parseDate(iso);
  if (lang === 'cs') return `${d.getDate()}. ${MONTHS_GEN_CS[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ''}`;
  return `${MONTHS.en[d.getMonth()]} ${d.getDate()}${withYear ? `, ${d.getFullYear()}` : ''}`;
}

/** "listopad 2026" */
export function formatMonth(isoOrKey: string, lang: Lang = 'cs', withYear = true): string {
  const d = parseDate(isoOrKey.length === 7 ? `${isoOrKey}-01` : isoOrKey);
  const name = MONTHS[lang][d.getMonth()];
  const cap = name.charAt(0).toUpperCase() + name.slice(1);
  return withYear ? `${cap} ${d.getFullYear()}` : cap;
}

export function formatMonthShort(isoOrKey: string, lang: Lang = 'cs'): string {
  const d = parseDate(isoOrKey.length === 7 ? `${isoOrKey}-01` : isoOrKey);
  return MONTHS_SHORT[lang][d.getMonth()];
}

/** Axis/tooltip label for a series bucket. */
export function bucketLabel(start: string, g: 'week' | 'month' | 'year', lang: Lang, long = false): string {
  const d = parseDate(start);
  if (g === 'year') return String(d.getFullYear());
  if (g === 'month') {
    if (long) return formatMonth(start, lang);
    const m = MONTHS_SHORT[lang][d.getMonth()];
    return d.getMonth() === 0 ? `${m} ’${String(d.getFullYear()).slice(2)}` : m;
  }
  if (long) {
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    return lang === 'cs'
      ? `${d.getDate()}. ${d.getMonth() + 1}. – ${end.getDate()}. ${end.getMonth() + 1}.`
      : `${MONTHS_SHORT.en[d.getMonth()]} ${d.getDate()} – ${MONTHS_SHORT.en[end.getMonth()]} ${end.getDate()}`;
  }
  return lang === 'cs' ? `${d.getDate()}. ${d.getMonth() + 1}.` : `${d.getMonth() + 1}/${d.getDate()}`;
}

/** Czech plural helper: plural(n, ['den','dny','dní']) */
export function plural(n: number, forms: [string, string, string], lang: Lang = 'cs'): string {
  const a = Math.abs(n);
  if (lang === 'en') return a === 1 ? forms[0] : forms[2];
  if (a === 1) return forms[0];
  if (a >= 2 && a <= 4 && Number.isInteger(a)) return forms[1];
  return forms[2];
}

/** Stable pastel-ish hue per station for avatars. */
export function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}
