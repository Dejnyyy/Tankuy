import React from 'react';
import { View, type ViewProps } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { spacing, radii } from '@/constants/Theme';

interface CardProps extends ViewProps {
  /** Apply default inner padding (spacing.lg). Default true. */
  padded?: boolean;
}

export function Card({ padded = true, style, children, ...rest }: CardProps) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
        },
        !isDark && {
          shadowColor: colors.black,
          shadowOpacity: 0.04,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
          elevation: 1,
        },
        padded && { padding: spacing.lg },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
