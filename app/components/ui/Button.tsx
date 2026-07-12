import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { spacing, radii, typography } from '@/constants/Theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'md' | 'sm';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  /** Optional leading icon; hidden while loading. */
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const background: Record<ButtonVariant, string> = {
    primary: colors.buttonPrimary,
    secondary: colors.elevated,
    ghost: 'transparent',
    destructive: colors.error,
  };
  const foreground: Record<ButtonVariant, string> = {
    primary: colors.buttonPrimaryText,
    secondary: colors.text,
    ghost: colors.tint,
    destructive: colors.white,
  };
  const sizing = {
    md: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, text: typography.bodyBold },
    sm: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      // 14px has no typography token; literal per the lineHeight rule
      text: { fontSize: 14, fontWeight: '600' as const },
    },
  }[size];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        {
          backgroundColor: background[variant],
          borderRadius: radii.md,
          paddingVertical: sizing.paddingVertical,
          paddingHorizontal: sizing.paddingHorizontal,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={foreground[variant]} /> : icon}
      <Text style={[sizing.text, { color: foreground[variant] }]}>{title}</Text>
    </Pressable>
  );
}
