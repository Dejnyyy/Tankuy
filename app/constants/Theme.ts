import { type TextStyle, type ViewStyle } from 'react-native';

/**
 * One family (Geist), three weights. Registered in app/_layout.tsx.
 * Always set fontFamily (not fontWeight) so native picks the right file.
 */
export const fonts = {
  regular: 'Geist_400Regular',
  semi: 'Geist_600SemiBold',
  heavy: 'Geist_800ExtraBold',
  // Legacy aliases
  display: 'Geist_800ExtraBold',
  displayBold: 'Geist_800ExtraBold',
  displaySemi: 'Geist_600SemiBold',
  mono: 'Geist_400Regular',
} as const;

/** Strict 4/8 grid. */
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
  giant: 64,
} as const;

/** Small radii only. */
export const radii = {
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 8,
  full: 999,
} as const;

export const HAIRLINE = 1;

const tnum = ['tabular-nums'] as TextStyle['fontVariant'];

export const typography = {
  /** The one big number on a screen. */
  display: { fontFamily: fonts.heavy, fontSize: 64, lineHeight: 68, letterSpacing: -2.4, fontVariant: tnum },
  /** Big numbers (hero KPI). */
  hero: { fontFamily: fonts.heavy, fontSize: 44, lineHeight: 48, letterSpacing: -1.8, fontVariant: tnum },
  /** Screen titles. */
  title: { fontFamily: fonts.heavy, fontSize: 32, lineHeight: 36, letterSpacing: -1.2 },
  /** Section titles. */
  heading: { fontFamily: fonts.heavy, fontSize: 20, lineHeight: 24, letterSpacing: -0.5 },
  /** Secondary big value. */
  stat: { fontFamily: fonts.heavy, fontSize: 26, lineHeight: 30, letterSpacing: -0.9, fontVariant: tnum },
  statSm: { fontFamily: fonts.semi, fontSize: 16, lineHeight: 22, letterSpacing: -0.2, fontVariant: tnum },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyBold: { fontFamily: fonts.semi, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  captionBold: { fontFamily: fonts.semi, fontSize: 13, lineHeight: 18 },
  /** Small field/column label — sentence case, never uppercase. */
  label: { fontFamily: fonts.semi, fontSize: 13, lineHeight: 18 },
  /** Tabular small data (dates, odometer). */
  mono: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, fontVariant: tnum },
} satisfies Record<string, TextStyle>;

/** Flat UI: no shadows anywhere. Kept as a no-op for older call sites. */
export function elevation(_level: 1 | 2 | 3, _shadowColor: string, _isDark: boolean): ViewStyle {
  return {};
}

/** Content width cap on desktop browsers. */
export const MAX_CONTENT_WIDTH = 1180;
