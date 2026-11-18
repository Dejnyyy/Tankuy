import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { stationColors } from '@/constants/Brands';

/** Solid brand-colour bar (Tank ONO yellow, Makro blue, others grey). */
export function StationMark({ name, height = 32, width = 4 }: { name: string | null | undefined; height?: number; width?: number }) {
  const { colors } = useTheme();
  const c = stationColors(name, colors);
  return <View style={{ width, height, backgroundColor: c.fill }} />;
}
