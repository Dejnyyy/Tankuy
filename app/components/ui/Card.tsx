import React from 'react';
import { View, type ViewProps } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { spacing, radii } from '@/constants/Theme';

interface CardProps extends ViewProps {
  /** Apply default inner padding (spacing.lg). Default true. */
  padded?: boolean;
}

export function Card({ padded = true, style, children, ...rest }: CardProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        { backgroundColor: colors.card, borderRadius: radii.lg },
        padded && { padding: spacing.lg },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
