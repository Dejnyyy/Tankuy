import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { typography } from '@/constants/Theme';

export type TextVariant = keyof typeof typography;
export type TextTone = 'primary' | 'secondary' | 'muted' | 'tint' | 'positive' | 'negative' | 'inverse' | 'onTint';

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  align?: TextStyle['textAlign'];
}

export function AppText({ variant = 'body', tone = 'primary', align, style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  const color = {
    primary: colors.text,
    secondary: colors.textSecondary,
    muted: colors.textMuted,
    tint: colors.tint,
    positive: colors.positive,
    negative: colors.negative,
    inverse: colors.buttonPrimaryText,
    onTint: colors.onTint,
  }[tone];
  return <Text {...rest} style={[typography[variant], { color }, align ? { textAlign: align } : null, style]} />;
}
