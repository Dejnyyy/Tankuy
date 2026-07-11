import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { spacing, radii, typography } from '@/constants/Theme';

interface BadgeProps {
  label: string;
  /** Accent color, e.g. colors.stats.green. Defaults to colors.primary. */
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
