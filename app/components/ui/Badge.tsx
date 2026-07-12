import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { spacing, radii, typography } from '@/constants/Theme';

interface BadgeProps {
  label: string;
  /**
   * Accent color, e.g. colors.stats.green. Defaults to colors.primary.
   * Must be a 6-digit hex color (e.g. "#FF9500") — an alpha suffix is
   * appended to it for the background fill, and that only produces a
   * valid color when `color` itself is opaque hex. rgba()/hsl() strings
   * will not compose correctly here.
   */
  color?: string;
}

export function Badge({ label, color }: BadgeProps) {
  const { colors } = useTheme();
  const accent = color ?? colors.primary;
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: `${accent}26`, // ~15% alpha over card background
        borderRadius: radii.full,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
      }}
    >
      <Text style={[typography.label, { color: accent }]}>{label}</Text>
    </View>
  );
}
