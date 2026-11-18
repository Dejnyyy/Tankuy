import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { radii, spacing } from '@/constants/Theme';
import { AppText, PressableScale } from '@/components/ui';
import { hashHue } from '@/lib/format';
import type { Entry } from '@/lib/stats';
import type { Formatter } from '@/hooks/useFormat';

export function StationAvatar({ name, size = 40 }: { name: string | null; size?: number }) {
  const { isDark, colors } = useTheme();
  if (!name) {
    return (
      <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: colors.sunken, alignItems: 'center', justifyContent: 'center' }}>
        <AppText variant="heading" tone="muted">
          ?
        </AppText>
      </View>
    );
  }
  const h = hashHue(name.toLowerCase());
  const bg = isDark ? `hsl(${h}, 30%, 19%)` : `hsl(${h}, 70%, 93%)`;
  const fg = isDark ? `hsl(${h}, 75%, 72%)` : `hsl(${h}, 55%, 34%)`;
  const initials = name
    .split(/[\s.&,-]+/)
    .filter((w) => /^[A-Za-z0-9\u00C0-\u017F]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <AppText variant="heading" style={{ color: fg, fontSize: size * 0.36, lineHeight: size * 0.46 }}>
        {initials || '?'}
      </AppText>
    </View>
  );
}

interface Props {
  entry: Entry;
  f: Formatter;
  onPress?: () => void;
  onLongPress?: () => void;
  showVehicle?: boolean;
  compact?: boolean;
}

/** One fill-up: avatar · station + meta · cost. */
export function EntryRow({ entry: e, f, onPress, onLongPress, showVehicle, compact }: Props) {
  const { t } = useTranslation();
  const meta = [
    `${f.date(e.date, false)}${e.time ? ` · ${e.time}` : ''}`,
    e.liters ? f.volume(e.liters, 1) : null,
    showVehicle && e.vehicleName ? e.vehicleName : null,
  ]
    .filter(Boolean)
    .join('  ·  ');
  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      scaleTo={0.985}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: compact ? 10 : 12, paddingHorizontal: spacing.lg, borderRadius: radii.md }}
    >
      <StationAvatar name={e.station} size={compact ? 36 : 40} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="bodyBold" numberOfLines={1}>
          {e.station ?? t('entry.unknownStation')}
        </AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={1}>
          {meta}
        </AppText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <AppText variant="statSm" style={{ fontSize: 16 }}>
          {f.money(e.cost)}
        </AppText>
        {e.price ? (
          <AppText variant="mono" tone="muted">
            {f.price(e.price)}
          </AppText>
        ) : null}
      </View>
    </PressableScale>
  );
}
