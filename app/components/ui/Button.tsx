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

/**
 * primary / accent → solid ink block. secondary → hairline outline.
 * ghost → text only. destructive → red text on outline.
 */
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
  const solid = variant === 'primary' || variant === 'accent';
  const bg = solid ? colors.buttonPrimary : 'transparent';
  const fg = solid ? colors.buttonPrimaryText : variant === 'destructive' ? colors.negative : colors.text;
  const bordered = variant === 'secondary' || variant === 'destructive';
  const sz = {
    lg: { h: 56, px: spacing.xxl, fs: 16, icon: 15 },
    md: { h: 44, px: spacing.lg, fs: 15, icon: 13 },
    sm: { h: 32, px: spacing.md, fs: 13, icon: 12 },
  }[size];
  const isDisabled = disabled || loading;
  const iconNode =
    typeof icon === 'string' ? <FontAwesome name={icon as any} size={sz.icon} color={fg} /> : icon;

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      haptic={solid ? 'light' : 'tap'}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        {
          height: sz.h,
          paddingHorizontal: variant === 'ghost' ? spacing.sm : sz.px,
          borderRadius: radii.md,
          backgroundColor: bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          borderWidth: bordered ? 1 : 0,
          borderColor: variant === 'destructive' ? colors.border : colors.border,
        },
        fullWidth ? { alignSelf: 'stretch' } : null,
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : iconNode ? <View>{iconNode}</View> : null}
      <Text numberOfLines={1} style={{ color: fg, fontSize: sz.fs, fontFamily: fonts.semi, letterSpacing: -0.1 }}>
        {title}
      </Text>
    </PressableScale>
  );
}
