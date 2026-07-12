const primary = '#FF9500'; // brand orange — ACCENT role only in the new identity
const primaryLight = 'rgba(255, 149, 0, 0.15)';
const primaryDark = '#CC7700';

const common = {
  primary,
  primaryLight,
  primaryDark,
  success: '#30A46C',
  warning: '#E5A50A',
  error: '#D64545',
  white: '#FFFFFF',
  black: '#000000',
  info: '#3E7BB6',
  accent: '#9A6BB5',
  // Categorical accents, muted to sit on cream and anthracite alike.
  stats: {
    green: '#30A46C',
    teal: '#3E8E9E',
    lightBlue: '#6FA8C9',
    indigo: '#6A6FB5',
    pink: '#C25E7E',
    amber: '#D99A2B',
    purple: '#9A6BB5',
    blue: '#3E7BB6',
  },
};

const light = {
  ...common,
  text: '#141414',
  textSecondary: '#6E6A5F',
  textMuted: '#8A8578',
  background: '#EFEDE8',
  card: '#FAF9F7',
  elevated: '#FFFFFF',
  border: '#E3E0D8',
  inputBackground: '#F1EFE9',
  placeholder: '#B5B0A4',
  buttonPrimary: '#141414',
  buttonPrimaryText: '#FFFFFF',
  tint: primary,
  tabIconDefault: '#8A8578',
  tabIconSelected: primary,
  barStyle: 'dark-content' as const,
};

const dark = {
  ...common,
  text: '#F2F0EB',
  textSecondary: '#A8A296',
  textMuted: '#787265',
  background: '#161513',
  card: '#1E1C19',
  elevated: '#26231F',
  border: '#2E2B26',
  inputBackground: '#26231F',
  placeholder: '#5E594F',
  buttonPrimary: '#F2F0EB',
  buttonPrimaryText: '#141414',
  tint: primary,
  tabIconDefault: '#787265',
  tabIconSelected: primary,
  barStyle: 'light-content' as const,
};

export default { light, dark };
