import { router } from 'expo-router';
import { DuplicateEntryError, type EntryInput } from '@/context/DataContext';
import type { Formatter } from '@/hooks/useFormat';
import type { FormState } from '@/components/EntryForm';
import { confirmDialog } from '@/lib/dialog';
import { haptics } from '@/lib/haptics';
import { normalizeEntry, toNum } from '@/lib/stats';
import type { FuelEntry } from '@/services/api';

const keep = (v: number | null, d: number) => (v === null ? '' : String(+v.toFixed(d)));

export function entryToForm(raw: FuelEntry, f: Formatter): FormState {
  const e = normalizeEntry(raw as any);
  return {
    station: e.station ?? '',
    address: e.address ?? '',
    date: e.date,
    time: e.time ?? '',
    liters: keep(f.units.formatVolume(toNum(raw.totalLiters)), 2),
    price: keep(f.units.formatPricePerVolume(toNum(raw.pricePerLiter)), 2),
    cost: keep(f.units.convertCurrency(e.cost), 2),
    mileage: e.mileage ? String(Math.round(f.units.formatDistance(e.mileage) as number)) : '',
    notes: e.notes ?? '',
    vehicleId: e.vehicleId,
  };
}

/** Save with the server's duplicate guard: ask, then force. Returns false if the user cancelled. */
export async function saveWithDuplicateCheck(add: (d: EntryInput, force?: boolean) => Promise<void>, data: EntryInput, t: (k: string) => string) {
  try {
    await add(data);
    return true;
  } catch (e) {
    if (!(e instanceof DuplicateEntryError)) throw e;
    haptics.warning();
    const ok = await confirmDialog(t('entry.dupTitle'), t('entry.dupMessage'), { confirm: t('entry.dupConfirm'), cancel: t('common.cancel') });
    if (!ok) return false;
    await add(data, true);
    return true;
  }
}

export function closeModal() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

