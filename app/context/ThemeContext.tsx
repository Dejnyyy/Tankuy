import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, useColorScheme as useSystemScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors, { type ThemeColors } from '@/constants/Colors';

type Theme = 'light' | 'dark';
export type ThemePreference = 'system' | Theme;

interface ThemeContextType {
  theme: Theme;
  colors: ThemeColors;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  /** Legacy helpers */
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

// New key on purpose: the redesign defaults everyone to "follow system";
// the old '@tankuy_theme' override is ignored.
const STORAGE_KEY = '@tankuy_theme_pref';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useSystemScheme();
  const [preference, setPref] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setPref(v);
      })
      .catch(() => {});
  }, []);

  const theme: Theme = preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
  const colors = Colors[theme];

  // Keep the browser chrome + page background in sync (PWA status bar, overscroll).
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.style.backgroundColor = colors.background;
    document.body.style.backgroundColor = colors.background;
    document.documentElement.style.colorScheme = theme;
    const metas = Array.from(document.querySelectorAll('meta[name="theme-color"]')) as HTMLMetaElement[];
    if (!metas.length) {
      const m = document.createElement('meta');
      m.name = 'theme-color';
      document.head.appendChild(m);
      metas.push(m);
    }
    metas.forEach((m) => (m.content = colors.background));
  }, [colors.background, theme]);

  const setPreference = useCallback((p: ThemePreference) => {
    setPref(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  }, []);

  const value = useMemo<ThemeContextType>(
    () => ({
      theme,
      colors,
      isDark: theme === 'dark',
      preference,
      setPreference,
      setTheme: (t) => setPreference(t),
      toggleTheme: () => setPreference(theme === 'dark' ? 'light' : 'dark'),
    }),
    [theme, colors, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
