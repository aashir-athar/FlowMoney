// types/theme.ts

export interface ColorTokens {
  // Backgrounds
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  surface: string;
  surfaceElevated: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  // Brand
  accent: string;
  accentMuted: string;
  accentSubtle: string;

  // Semantic
  positive: string;
  positiveSubtle: string;
  warning: string;
  warningSubtle: string;
  danger: string;
  dangerSubtle: string;

  // UI
  border: string;
  borderSubtle: string;
  divider: string;

  // Categories
  categoryFood: string;
  categoryTransport: string;
  categoryBills: string;
  categoryShopping: string;
  categoryEntertainment: string;
  categoryHealth: string;
  categorySubscriptions: string;
  categoryOther: string;
}

export interface Theme {
  colors: ColorTokens;
  isDark: boolean;
}
