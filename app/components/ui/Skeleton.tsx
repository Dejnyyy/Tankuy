import React from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { radii } from '@/constants/Theme';

interface Props {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Static placeholder block (no pulsing). */
export function Skeleton({ width = '100%', height = 16, radius = radii.sm, style }: Props) {
  const { colors } = useTheme();
  return <View style={[{ width, height, borderRadius: radius, backgroundColor: colors.skeleton }, style]} />;
}
