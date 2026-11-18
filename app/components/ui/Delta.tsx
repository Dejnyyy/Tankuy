import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { fonts } from '@/constants/Theme';

interface Props {
  /** Ratio, e.g. 0.12 = +12 %. */
  value: number | null | undefined;
  label: string;
  /** Kept for API compatibility; deltas are monochrome. */
  upIsBad?: boolean;
  size?: 'sm' | 'md';
}

/** Plain signed change: "▲ 12 %". Monochrome — the number speaks. */
export function Delta({ value, label, size = 'sm' }: Props) {
  const { colors } = useTheme();
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const flat = Math.abs(value) < 0.005;
  const arrow = flat ? '' : value > 0 ? '▲ ' : '▼ ';
  return (
    <Text style={{ color: colors.text, fontSize: size === 'sm' ? 13 : 15, fontFamily: fonts.semi, fontVariant: ['tabular-nums'] }}>
      {arrow}
      {label.replace(/^[+−-]/, '')}
    </Text>
  );
}
