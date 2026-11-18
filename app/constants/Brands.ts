import { stationKey } from '@/lib/stats';
import type { ThemeColors } from './Colors';

/**
 * Fuel-station brand colours — the only colours in the UI.
 * Matched on the normalised station key, so "Makro Cash & Carry",
 * "makro" and "MAKRO" all resolve to Makro; "Tank ONO" / "ono" to ONO.
 */
export const BRANDS = {
  ono: { name: 'Tank ONO', color: '#FFD200', on: '#111111' },
  makro: { name: 'Makro', color: '#0033A0', on: '#FFFFFF' },
} as const;

export type BrandId = keyof typeof BRANDS;

export function brandOf(name: string | null | undefined): BrandId | null {
  const k = stationKey(name);
  if (!k) return null;
  const words = k.split(' ');
  if (words.includes('ono')) return 'ono';
  if (words.includes('makro')) return 'makro';
  return null;
}

/** Fill + foreground colour for a station marker. Unbranded → neutral grey. */
export function stationColors(name: string | null | undefined, colors: ThemeColors): { fill: string; on: string; brand: BrandId | null } {
  const b = brandOf(name);
  if (b) return { fill: BRANDS[b].color, on: BRANDS[b].on, brand: b };
  return { fill: colors.stationNeutral, on: colors.text, brand: null };
}
