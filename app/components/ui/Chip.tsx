import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { fonts, radii, spacing } from '@/constants/Theme';
import { PressableScale } from './PressableScale';

interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  /** Kept for API compatibility; chips are text-only. */
  icon?: string;
  /** Small leading colour square (station brand). */
  mark?: string;
  /** Override the active fill (station brand) and its text colour. */
  activeFill?: { fill: string; on: string };
}

/** Flat selectable chip: hairline outline, solid ink when active. */
export function Chip({ label, active, onPress, mark, activeFill }: ChipProps) {
  const { colors } = useTheme();
  const fill = activeFill?.fill ?? colors.buttonPrimary;
  const on = activeFill?.on ?? colors.buttonPrimaryText;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        height: 32,
        paddingHorizontal: spacing.md,
        borderRadius: radii.md,
        backgroundColor: active ? fill : 'transparent',
        borderWidth: 1,
        borderColor: active ? fill : colors.border,
      }}
    >
      {mark && !active ? <View style={{ width: 8, height: 8, backgroundColor: mark }} /> : null}
      <Text numberOfLines={1} style={{ fontSize: 13, fontFamily: fonts.semi, color: active ? on : colors.text }}>
        {label}
      </Text>
    </PressableScale>
  );
}
