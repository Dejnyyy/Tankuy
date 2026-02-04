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
