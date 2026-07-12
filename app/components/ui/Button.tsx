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

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
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
  loading = false,
  disabled = false,
  icon,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const background: Record<ButtonVariant, string> = {
    primary: colors.primary,
    secondary: colors.elevated,
    ghost: 'transparent',
    destructive: colors.error,
  };
  const foreground: Record<ButtonVariant, string> = {
    primary: colors.white,
    secondary: colors.text,
    ghost: colors.tint,
    destructive: colors.white,
  };
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
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
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
      <Text style={[typography.bodyBold, { color: foreground[variant] }]}>{title}</Text>
    </Pressable>
  );
}
