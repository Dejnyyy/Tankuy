import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { radii } from '@/constants/Theme';
import { PressableScale } from './PressableScale';

/**
 * Quick light/dark switch: a hairline square holding a half-filled disc.
 * Drawn with views so it stays crisp and dependency-free.
 */
export function ThemeToggle({ size = 40 }: { size?: number }) {
  const { colors, isDark, setPreference } = useTheme();
  const d = 16;
  return (
    <PressableScale
      onPress={() => setPreference(isDark ? 'light' : 'dark')}
      accessibilityRole="switch"
      accessibilityState={{ checked: isDark }}
      accessibilityLabel={isDark ? 'Světlý režim' : 'Tmavý režim'}
      hitSlop={4}
      style={{ width: size, height: size, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
    >
      <View style={{ width: d, height: d, borderRadius: d / 2, borderWidth: 1.5, borderColor: colors.text, overflow: 'hidden', flexDirection: 'row' }}>
        <View style={{ flex: 1, backgroundColor: isDark ? 'transparent' : colors.text }} />
        <View style={{ flex: 1, backgroundColor: isDark ? colors.text : 'transparent' }} />
      </View>
    </PressableScale>
  );
}
