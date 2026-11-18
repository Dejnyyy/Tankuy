import React from 'react';
import { ActivityIndicator, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { fonts, radii, spacing } from '@/constants/Theme';
import { PressableScale } from './PressableScale';

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'lg' | 'md' | 'sm';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  /** Leading icon: a FontAwesome name or any node. */
  icon?: React.ReactNode | string;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
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
  fullWidth,
}: ButtonProps) {
  const { colors } = useTheme();
  const bg: Record<ButtonVariant, string> = {
    primary: colors.buttonPrimary,
    accent: colors.tint,
    secondary: colors.surface2,
    ghost: 'transparent',
    destructive: colors.negativeSoft,
  };
  const fg: Record<ButtonVariant, string> = {
    primary: colors.buttonPrimaryText,
    accent: colors.onTint,
    secondary: colors.text,
    ghost: colors.text,
    destructive: colors.negative,
  };
  const sz = {
    lg: { h: 56, px: spacing.xxl, fs: 16, icon: 17 },
    md: { h: 46, px: spacing.xl, fs: 15, icon: 15 },
    sm: { h: 36, px: spacing.lg, fs: 13, icon: 13 },
  }[size];
  const isDisabled = disabled || loading;
  const iconNode =
    typeof icon === 'string' ? <FontAwesome name={icon as any} size={sz.icon} color={fg[variant]} /> : icon;

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      haptic={variant === 'accent' || variant === 'primary' ? 'light' : 'tap'}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        {
          height: sz.h,
          paddingHorizontal: sz.px,
          borderRadius: radii.md,
          backgroundColor: bg[variant],
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: colors.border,
        },
        fullWidth ? { alignSelf: 'stretch' } : null,
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg[variant]} /> : iconNode ? <View>{iconNode}</View> : null}
      <Text
        numberOfLines={1}
        style={{ color: fg[variant], fontSize: sz.fs, fontFamily: fonts.displayBold, letterSpacing: -0.1 }}
      >
        {title}
      </Text>
    </PressableScale>
  );
}
