const primary = '#FF9500'; // Orange
const primaryLight = 'rgba(255, 149, 0, 0.15)';
const primaryDark = '#CC7700';

const common = {
  primary,
  primaryLight,
  primaryDark,
  success: '#30D158',
  warning: '#FFD60A',
  error: '#FF453A',
  info: '#32ADE6',
  accent: '#BF5AF2',
  // Categorical accents for stat tiles and charts. Use by role position,
  // not by literal color meaning.
  stats: {
    green: '#30D158',
    teal: '#32ADE6',
    lightBlue: '#5AC8FA',
    indigo: '#5E5CE6',
    pink: '#FF375F',
    amber: '#FF9F0A',
    purple: '#BF5AF2',
    blue: '#007AFF',
  },
  white: '#FFFFFF',
  black: '#000000',
};

const light = {
  ...common,
  text: '#000000',
  textSecondary: '#8E8E93',
  textMuted: '#AEAEB2',
  background: '#F2F2F7',
  card: '#FFFFFF',
  elevated: '#FFFFFF',
  border: '#C6C6C8',
  inputBackground: '#E5E5EA',
  placeholder: '#C7C7CC',
  tint: primary,
  tabIconDefault: '#8E8E93',
  tabIconSelected: primary,
  barStyle: 'dark-content' as const,
};

const dark = {
  ...common,
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  textMuted: '#6E6E73',
  background: '#0D0D0D',
  card: '#1C1C1E',
  elevated: '#2C2C2E',
  border: '#2C2C2E',
  inputBackground: '#2C2C2E',
  placeholder: '#6E6E73',
  tint: primary,
  tabIconDefault: '#6E6E73',
  tabIconSelected: primary,
  barStyle: 'light-content' as const,
};

export default {
  light,
  dark,
};
