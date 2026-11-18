import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { spacing } from '@/constants/Theme';
import { AppText, PressableScale, StationMark } from '@/components/ui';
import type { Entry } from '@/lib/stats';
import type { Formatter } from '@/hooks/useFormat';

interface Props {
  entry: Entry;
  f: Formatter;
  onPress?: () => void;
  onLongPress?: () => void;
  showVehicle?: boolean;
  compact?: boolean;
  /** Horizontal inset (rows sit flush with the page by default). */
  inset?: number;
}

/** One fill-up: brand bar · station + meta · cost. */
export function EntryRow({ entry: e, f, onPress, onLongPress, showVehicle, compact, inset = 0 }: Props) {
  const { t } = useTranslation();
  const meta = [
    `${f.date(e.date, false)}${e.time ? `, ${e.time}` : ''}`,
    e.liters ? f.volume(e.liters, 1) : null,
    showVehicle && e.vehicleName ? e.vehicleName : null,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      scaleTo={1}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: compact ? spacing.sm + 2 : spacing.md, paddingHorizontal: inset }}
    >
      <StationMark name={e.station} height={compact ? 34 : 40} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="bodyBold" numberOfLines={1}>
          {e.station ?? t('entry.unknownStation')}
        </AppText>
        <AppText variant="mono" tone="muted" numberOfLines={1}>
          {meta}
        </AppText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <AppText variant="statSm">{f.money(e.cost)}</AppText>
        {e.price ? (
          <AppText variant="mono" tone="muted">
            {f.price(e.price)}
          </AppText>
        ) : null}
      </View>
    </PressableScale>
  );
}
