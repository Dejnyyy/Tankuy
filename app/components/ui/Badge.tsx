import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { spacing, radii, typography } from '@/constants/Theme';

interface BadgeProps {
  label: string;
  /**
   * Accent color, e.g. colors.stats.green.
   * Must be a 6-digit hex color (e.g. "#FF9500") — an alpha suffix is
   * appended to it for the background fill, and that only produces a
   * valid color when `color` itself is opaque hex. rgba()/hsl() strings
   * will not compose correctly here.
   */
  color?: string;
}

export function Badge({ label, color }: BadgeProps) {
  const { colors } = useTheme();
  const solid = !color;
  const accent = color ?? colors.buttonPrimary;
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: solid ? colors.buttonPrimary : `${accent}26`,
        borderRadius: radii.full,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
      }}
    >
      <Text style={[typography.label, { color: solid ? colors.buttonPrimaryText : accent }]}>
        {label}
      </Text>
    </View>
  );
}
