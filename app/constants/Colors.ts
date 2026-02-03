// Tankuy Brand Colors
const primary = '#FF9500'; // Orange - fuel themed
const primaryLight = 'rgba(255, 149, 0, 0.15)';
const primaryDark = '#CC7700';

const background = {
  dark: '#0D0D0D',
  card: '#1C1C1E',
  elevated: '#2C2C2E',
};

const text = {
  primary: '#FFFFFF',
  secondary: '#8E8E93',
  muted: '#6E6E73',
};

const success = '#30D158';
const warning = '#FFD60A';
const error = '#FF453A';

export const Colors = {
  primary,
  primaryLight,
  primaryDark,
  background,
  text,
  success,
  warning,
  error,
};

export default {
  light: {
    text: '#000',
    background: '#F2F2F7',
    tint: primary,
    tabIconDefault: '#8E8E93',
    tabIconSelected: primary,
    card: '#FFFFFF',
  },
  dark: {
    text: '#FFFFFF',
    background: background.dark,
    tint: primary,
    tabIconDefault: '#6E6E73',
    tabIconSelected: primary,
    card: background.card,
  },
};
