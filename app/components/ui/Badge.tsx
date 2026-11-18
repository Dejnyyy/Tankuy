import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { AppText } from './AppText';

interface BadgeProps {
  label: string;
  color?: string;
}

/** Plain small label (no pill). */
export function Badge({ label, color }: BadgeProps) {
  const { colors } = useTheme();
  return (
    <AppText variant="captionBold" style={{ color: color ?? colors.textSecondary }}>
      {label}
    </AppText>
  );
}
