import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/** Font family names registered in app/_layout.tsx (useFonts). */
export const fonts = {
  display: 'Archivo_800ExtraBold',
  displayBold: 'Archivo_700Bold',
  displaySemi: 'Archivo_600SemiBold',
  mono: 'JetBrainsMono_500Medium',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

const tnum = ['tabular-nums'] as TextStyle['fontVariant'];

export const typography = {
  /** Big numbers (hero KPI). */
  hero: { fontFamily: fonts.display, fontSize: 44, lineHeight: 48, letterSpacing: -1.6, fontVariant: tnum },
  /** Screen titles. */
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.9 },
  /** Card / section titles. */
  heading: { fontFamily: fonts.displayBold, fontSize: 18, lineHeight: 24, letterSpacing: -0.3 },
  /** KPI value inside a stat tile. */
  stat: { fontFamily: fonts.displayBold, fontSize: 22, lineHeight: 28, letterSpacing: -0.5, fontVariant: tnum },
  statSm: { fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 22, letterSpacing: -0.3, fontVariant: tnum },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 21 },
  bodyBold: { fontSize: 15, fontWeight: '600', lineHeight: 21 },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  captionBold: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  /** Small uppercase overline. */
  label: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  /** Receipt-like data (dates, odometer, codes). */
  mono: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
} satisfies Record<string, TextStyle>;

/** Soft, warm elevation. Web gets a CSS box-shadow, native gets shadow*. */
export function elevation(level: 1 | 2 | 3, shadowColor: string, isDark: boolean): ViewStyle {
  if (isDark) return {};
  const cfg = {
    1: { o: 0.05, r: 6, y: 2 },
    2: { o: 0.08, r: 16, y: 6 },
    3: { o: 0.14, r: 28, y: 12 },
  }[level];
  if (Platform.OS === 'android') return { elevation: level * 2 };
  return {
    shadowColor,
    shadowOpacity: cfg.o,
    shadowRadius: cfg.r,
    shadowOffset: { width: 0, height: cfg.y },
  };
}

/** Content width cap on desktop browsers. */
export const MAX_CONTENT_WIDTH = 1120;
