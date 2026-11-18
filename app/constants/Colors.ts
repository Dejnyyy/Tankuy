/**
 * Tankuy colour tokens.
 *
 * Identity: "fuel docket" — warm paper and ink with a single hot signal
 * orange (the pump nozzle). Data colours are muted so the accent stays loud.
 * Both themes share the exact same keys; never hardcode hex in screens.
 */

const brand = {
  orange: '#FF6A13',
  orangeDeep: '#E2540A',
  orangeSoftLight: 'rgba(255, 106, 19, 0.11)',
  orangeSoftDark: 'rgba(255, 122, 45, 0.16)',
};

const common = {
  white: '#FFFFFF',
  black: '#000000',
  // Legacy aliases kept for older screens (profile, login, legal).
  primary: brand.orange,
  primaryDark: brand.orangeDeep,
  success: '#1F9D63',
  warning: '#D9930D',
  error: '#E0463E',
  info: '#2F6FE4',
  accent: '#7A5AF8',
  stats: {
    green: '#1F9D63',
    teal: '#0F9488',
    lightBlue: '#4D9DE0',
    indigo: '#5B5FD6',
    pink: '#D6457A',
    amber: '#D9930D',
    purple: '#7A5AF8',
    blue: '#2F6FE4',
  },
};

const light = {
  ...common,
  // Surfaces
  background: '#F3F1EC',
  card: '#FFFFFF',
  elevated: '#FFFFFF',
  surface2: '#F7F5F1',
  sunken: '#ECE9E2',
  border: '#E5E1D8',
  borderStrong: '#D6D1C5',
  // Text
  text: '#16171A',
  textSecondary: '#5E5C57',
  textMuted: '#8F8C85',
  placeholder: '#B0ACA2',
  inputBackground: '#F7F5F1',
  // Accent
  tint: brand.orange,
  tintPressed: brand.orangeDeep,
  primaryLight: brand.orangeSoftLight,
  tintSoft: brand.orangeSoftLight,
  onTint: '#FFFFFF',
  // Buttons
  buttonPrimary: '#16171A',
  buttonPrimaryText: '#FFFFFF',
  // Semantic
  positive: '#1F9D63',
  positiveSoft: 'rgba(31, 157, 99, 0.12)',
  negative: '#E0463E',
  negativeSoft: 'rgba(224, 70, 62, 0.11)',
  // Charts
  chartLine: brand.orange,
  chartFill: brand.orange,
  chartGrid: '#ECE8E0',
  chartBar: '#D9D4C8',
  chartBarActive: brand.orange,
  series: ['#FF6A13', '#2F6FE4', '#0F9488', '#7A5AF8', '#D6457A', '#D9930D'],
  // Nav
  tabIconDefault: '#8F8C85',
  tabIconSelected: '#16171A',
  tabBar: 'rgba(255, 255, 255, 0.92)',
  overlay: 'rgba(22, 23, 26, 0.45)',
  shadow: '#2B2414',
  skeleton: '#ECE9E2',
  skeletonHighlight: '#F7F5F1',
  barStyle: 'dark-content' as 'dark-content' | 'light-content',
};

const dark: typeof light = {
  ...common,
  background: '#0D0E10',
  card: '#16181B',
  elevated: '#1D2024',
  surface2: '#1B1E22',
  sunken: '#111315',
  border: '#25282D',
  borderStrong: '#33373D',
  text: '#F4F2EE',
  textSecondary: '#A7A49E',
  textMuted: '#6F6D69',
  placeholder: '#55534F',
  inputBackground: '#1B1E22',
  tint: '#FF7A2D',
  tintPressed: brand.orange,
  primaryLight: brand.orangeSoftDark,
  tintSoft: brand.orangeSoftDark,
  onTint: '#FFFFFF',
  buttonPrimary: '#F4F2EE',
  buttonPrimaryText: '#121315',
  positive: '#3BC48A',
  positiveSoft: 'rgba(59, 196, 138, 0.14)',
  negative: '#FF6B5E',
  negativeSoft: 'rgba(255, 107, 94, 0.14)',
  chartLine: '#FF7A2D',
  chartFill: '#FF7A2D',
  chartGrid: '#1F2226',
  chartBar: '#2E3238',
  chartBarActive: '#FF7A2D',
  series: ['#FF7A2D', '#5B8EF0', '#2BB3A3', '#9580FA', '#E86A98', '#E5AA33'],
  tabIconDefault: '#6F6D69',
  tabIconSelected: '#F4F2EE',
  tabBar: 'rgba(22, 24, 27, 0.92)',
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: '#000000',
  skeleton: '#1B1E22',
  skeletonHighlight: '#25282D',
  barStyle: 'light-content',
};

export type ThemeColors = typeof light;
export default { light, dark };
