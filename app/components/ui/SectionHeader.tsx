import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/Theme';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
      }}
    >
      <Text style={[typography.heading, { color: colors.text }]}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={spacing.sm}>
          <Text style={[typography.bodyBold, { color: colors.tint }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
