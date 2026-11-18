import React from 'react';
import { Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { radii } from '@/constants/Theme';

interface Props {
  /** Ratio, e.g. 0.12 = +12 %. */
  value: number | null | undefined;
  label: string;
  /** If true, an increase is bad (spend, price, consumption). */
  upIsBad?: boolean;
  size?: 'sm' | 'md';
}

/** Small ▲/▼ pill comparing to a previous period. */
export function Delta({ value, label, upIsBad = true, size = 'sm' }: Props) {
  const { colors } = useTheme();
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const flat = Math.abs(value) < 0.005;
  const up = value > 0;
  const good = flat ? null : upIsBad ? !up : up;
  const fg = good === null ? colors.textSecondary : good ? colors.positive : colors.negative;
  const bg = good === null ? colors.sunken : good ? colors.positiveSoft : colors.negativeSoft;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        paddingHorizontal: size === 'sm' ? 7 : 9,
        paddingVertical: size === 'sm' ? 2 : 4,
        borderRadius: radii.full,
        backgroundColor: bg,
      }}
    >
      {!flat && <FontAwesome name={up ? 'caret-up' : 'caret-down'} size={size === 'sm' ? 11 : 13} color={fg} />}
      <Text style={{ color: fg, fontSize: size === 'sm' ? 11 : 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}
