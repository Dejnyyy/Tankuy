import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/Theme';

interface ScreenHeaderProps {
  title: string;
  /** Optional right-aligned actions (icon buttons etc.). */
  rightElement?: React.ReactNode;
}

export function ScreenHeader({ title, rightElement }: ScreenHeaderProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.lg,
      }}
    >
      <Text style={[typography.title, { color: colors.text }]}>{title}</Text>
      {rightElement ?? null}
    </View>
  );
}
