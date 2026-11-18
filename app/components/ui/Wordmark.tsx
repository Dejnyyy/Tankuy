import React from 'react';
import { fonts } from '@/constants/Theme';
import { AppText } from './AppText';

export function Wordmark({ size = 24 }: { size?: number }) {
  return (
    <AppText accessibilityRole="header" style={{ fontFamily: fonts.heavy, fontSize: size, lineHeight: Math.round(size * 1.15), letterSpacing: -size * 0.05 }}>
      tankuy
    </AppText>
  );
}
