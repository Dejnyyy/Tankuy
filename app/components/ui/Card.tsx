import React from 'react';
import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { radii, spacing } from '@/constants/Theme';
import { PressableScale } from './PressableScale';

interface CardProps extends ViewProps {
  /** Apply default inner padding. Default true. */
  padded?: boolean;
  tone?: 'default' | 'sunken' | 'ink' | 'tint';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** A hairline-outlined box. Use sparingly — prefer rules and plain sections. */
export function Card({ padded = true, tone = 'default', style, children, onPress, ...rest }: CardProps) {
  const { colors } = useTheme();
  const bg = {
    default: colors.background,
    sunken: colors.surface,
    ink: colors.buttonPrimary,
    tint: colors.buttonPrimary,
  }[tone];
  const base: StyleProp<ViewStyle> = [
    {
      backgroundColor: bg,
      borderRadius: radii.lg,
      borderWidth: tone === 'default' ? 1 : 0,
      borderColor: colors.border,
    },
    padded && { padding: spacing.lg },
    style,
  ];
  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={base} {...(rest as any)}>
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
