import React from 'react';
import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { elevation, radii, spacing } from '@/constants/Theme';
import { PressableScale } from './PressableScale';

interface CardProps extends ViewProps {
  /** Apply default inner padding. Default true. */
  padded?: boolean;
  tone?: 'default' | 'sunken' | 'ink' | 'tint';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Card({ padded = true, tone = 'default', style, children, onPress, ...rest }: CardProps) {
  const { colors, isDark } = useTheme();
  const bg = {
    default: colors.card,
    sunken: colors.surface2,
    ink: colors.buttonPrimary,
    tint: colors.tint,
  }[tone];
  const base: StyleProp<ViewStyle> = [
    {
      backgroundColor: bg,
      borderRadius: radii.lg,
      borderWidth: tone === 'default' ? 1 : 0,
      borderColor: colors.border,
    },
    tone === 'default' ? elevation(1, colors.shadow, isDark) : null,
    padded && { padding: spacing.lg },
    style,
  ];
  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={base} scaleTo={0.985} {...(rest as any)}>
        {children}
      </PressableScale>
    );
  }
  return (
    <View style={base} {...rest}>
      {children}
    </View>
  );
}
