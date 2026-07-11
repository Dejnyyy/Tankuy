import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/Theme';
import { Button } from './Button';

interface EmptyStateProps {
  /** Illustration or icon element shown above the title. */
  icon: React.ReactNode;
  title: string;
  message?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({ icon, title, message, ctaLabel, onCta }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxxl,
        paddingHorizontal: spacing.xxl,
        gap: spacing.md,
      }}
    >
      {icon}
      <Text style={[typography.heading, { color: colors.text, textAlign: 'center' }]}>
        {title}
      </Text>
      {message ? (
        <Text
          style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}
        >
          {message}
        </Text>
      ) : null}
      {ctaLabel && onCta ? (
        <Button title={ctaLabel} onPress={onCta} style={{ marginTop: spacing.sm }} />
      ) : null}
    </View>
  );
}
