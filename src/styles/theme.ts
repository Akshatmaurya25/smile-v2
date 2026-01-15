// Smile App Theme - Dark mode with neon accents

export const colors = {
  // Base colors
  background: '#0D0D0D',
  surface: '#1A1A1A',
  card: '#242424',
  cardHover: '#2E2E2E',
  border: '#333333',
  glass: 'rgba(30, 30, 30, 0.6)',

  // Neon accents
  primary: '#00FF88', // Neon green - main actions
  primaryDim: '#00CC6A',
  primaryGlow: 'rgba(0, 255, 136, 0.3)',
  secondary: '#00D4FF', // Neon cyan - secondary info
  secondaryDim: '#00A8CC',
  secondaryGlow: 'rgba(0, 212, 255, 0.3)',
  accent: '#FF00FF', // Neon magenta - highlights
  accentDim: '#CC00CC',
  accentGlow: 'rgba(255, 0, 255, 0.3)',
  tertiary: '#FFD700', // Gold - warnings, income

  // Semantic colors
  income: '#00FF88',
  expense: '#FF4444',
  borrowing: '#FF00FF',
  warning: '#FFD700',
  error: '#FF4444',
  success: '#00FF88',

  // Text colors
  text: '#FFFFFF',
  textSecondary: '#888888',
  textMuted: '#555555',
  textOnPrimary: '#0D0D0D',

  // Gradient colors
  gradientStart: '#00FF88',
  gradientEnd: '#00D4FF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  // Font sizes
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 24,
    xxxl: 32,
    display: 48,
  },
  // Font weights
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const shadows = {
  sm: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  neonGlow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
};

export const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
};

export type Theme = typeof theme;
export default theme;
