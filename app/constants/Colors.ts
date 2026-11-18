/**
 * Tankuy colour tokens.
 *
 * Monochrome on purpose: ink on white (or white on black). The accent IS the
 * text colour. The only real colours in the app are the fuel-station brands
 * (see constants/Brands.ts). Red is reserved for destructive actions and
 * validation errors.
 *
 * Both themes share the exact same keys; never hardcode hex in screens.
 */

const common = {
  white: '#FFFFFF',
  black: '#000000',
  stats: {
    green: '#1A7F4B',
  },
};

const light = {
  ...common,
  // Surfaces
  background: '#FFFFFF',
  card: '#FFFFFF',
  elevated: '#FFFFFF',
  surface: '#F4F4F4',
  surface2: '#F4F4F4',
  sunken: '#F4F4F4',
  /** Hairline dividers */
  border: '#E6E6E6',
  borderStrong: '#111111',
  // Text
  text: '#111111',
  textSecondary: '#555555',
  textMuted: '#8C8C8C',
  placeholder: '#B4B4B4',
  inputBackground: '#FFFFFF',
  // Accent = ink
  tint: '#111111',
  tintPressed: '#000000',
  tintSoft: '#F4F4F4',
  primary: '#111111',
  primaryDark: '#000000',
  primaryLight: '#F4F4F4',
  onTint: '#FFFFFF',
  accent: '#111111',
  info: '#111111',
  // Buttons
  buttonPrimary: '#111111',
  buttonPrimaryText: '#FFFFFF',
  // Semantic (used sparingly)
  success: '#1A7F4B',
  positive: '#1A7F4B',
  positiveSoft: '#F4F4F4',
  warning: '#B26B00',
  error: '#D92D20',
  negative: '#D92D20',
  negativeSoft: '#FDF1F0',
  // Charts
  chartLine: '#111111',
  chartFill: '#111111',
  chartGrid: '#EDEDED',
  chartBar: '#DCDCDC',
  chartBarActive: '#111111',
  series: ['#111111', '#111111', '#111111', '#111111', '#111111', '#111111'],
  /** Neutral marker for stations without a brand colour */
  stationNeutral: '#CFCFCF',
  // Nav
  tabIconDefault: '#9A9A9A',
  tabIconSelected: '#111111',
  tabBar: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.4)',
  shadow: '#000000',
  skeleton: '#F0F0F0',
  skeletonHighlight: '#F7F7F7',
  barStyle: 'dark-content' as 'dark-content' | 'light-content',
};

const dark: typeof light = {
  ...common,
  background: '#0B0B0B',
  card: '#0B0B0B',
  elevated: '#161616',
  surface: '#171717',
  surface2: '#171717',
  sunken: '#171717',
  border: '#242424',
  borderStrong: '#F2F2F2',
  text: '#F2F2F2',
  textSecondary: '#A6A6A6',
  textMuted: '#6E6E6E',
  placeholder: '#4F4F4F',
  inputBackground: '#0B0B0B',
  tint: '#F2F2F2',
  tintPressed: '#FFFFFF',
  tintSoft: '#171717',
  primary: '#F2F2F2',
  primaryDark: '#FFFFFF',
  primaryLight: '#171717',
  onTint: '#0B0B0B',
  accent: '#F2F2F2',
  info: '#F2F2F2',
  buttonPrimary: '#F2F2F2',
  buttonPrimaryText: '#0B0B0B',
  success: '#3DBE7A',
  positive: '#3DBE7A',
  positiveSoft: '#171717',
  warning: '#E0A030',
  error: '#FF5A4E',
  negative: '#FF5A4E',
  negativeSoft: '#2A1412',
  chartLine: '#F2F2F2',
  chartFill: '#F2F2F2',
  chartGrid: '#1E1E1E',
  chartBar: '#333333',
  chartBarActive: '#F2F2F2',
  series: ['#F2F2F2', '#F2F2F2', '#F2F2F2', '#F2F2F2', '#F2F2F2', '#F2F2F2'],
  stationNeutral: '#4A4A4A',
  tabIconDefault: '#6E6E6E',
  tabIconSelected: '#F2F2F2',
  tabBar: '#0B0B0B',
  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: '#000000',
  skeleton: '#161616',
  skeletonHighlight: '#1E1E1E',
  barStyle: 'light-content',
};

export type ThemeColors = typeof light;
export default { light, dark };
