import React from 'react';
import { Text } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { radii, spacing } from '@/constants/Theme';
import { PressableScale } from './PressableScale';

interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: string;
}

export function Chip({ label, active, onPress, icon }: ChipProps) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 34,
        paddingHorizontal: spacing.md + 2,
        borderRadius: radii.full,
        backgroundColor: active ? colors.buttonPrimary : colors.card,
        borderWidth: 1,
        borderColor: active ? colors.buttonPrimary : colors.border,
      }}
    >
      {icon ? (
        <FontAwesome name={icon as any} size={12} color={active ? colors.buttonPrimaryText : colors.textSecondary} />
      ) : null}
      <Text
        numberOfLines={1}
        style={{ fontSize: 13, fontWeight: '600', color: active ? colors.buttonPrimaryText : colors.textSecondary }}
      >
        {label}
      </Text>
    </PressableScale>
  );
}
