// constants/design.ts
// FlowMoney 2026 Design System
// Philosophy: Quiet luxury fintech — numbers as art, generous breathing room,
// motion as language, every pixel intentional. Built for low-end Android first.

import { ColorTokens } from '../types/theme';

// ─────────────────────────────────────────────────────────────
// DARK THEME — ink-black with indigo undertone, surface hierarchy
// ─────────────────────────────────────────────────────────────
export const DARK_COLORS: ColorTokens = {
  background: '#05050B',
  backgroundSecondary: '#0B0B16',
  backgroundTertiary: '#11111E',
  surface: '#15152A',
  surfaceElevated: '#1B1B33',

  textPrimary: '#F4F4FF',
  textSecondary: '#9595BD',
  textTertiary: '#7474A8',
  textInverse: '#05050B',

  accent: '#7B68EE',
  accentMuted: '#4A3FA0',
  accentSubtle: 'rgba(123,104,238,0.12)',

  positive: '#52E5B0',
  positiveSubtle: 'rgba(82,229,176,0.12)',
  warning: '#F5A623',
  warningSubtle: 'rgba(245,166,35,0.12)',
  danger: '#FF6B6B',
  dangerSubtle: 'rgba(255,107,107,0.12)',

  border: 'rgba(255,255,255,0.06)',
  borderSubtle: 'rgba(255,255,255,0.03)',
  divider: 'rgba(255,255,255,0.05)',

  categoryFood: '#FF8C61',
  categoryTransport: '#61B4FF',
  categoryBills: '#B061FF',
  categoryShopping: '#FF61A6',
  categoryEntertainment: '#61FFD5',
  categoryHealth: '#61FF8C',
  categorySubscriptions: '#FFD561',
  categoryOther: '#8C8C9E',
};

// ─────────────────────────────────────────────────────────────
// LIGHT THEME — warm paper white, soft contrast for daylight reading
// ─────────────────────────────────────────────────────────────
export const LIGHT_COLORS: ColorTokens = {
  background: '#FAFAF7',
  backgroundSecondary: '#F2F2EE',
  backgroundTertiary: '#EBEBE5',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  textPrimary: '#0A0A14',
  textSecondary: '#4A4A6A',
  textTertiary: '#8E8EA8',
  textInverse: '#FAFAF7',

  accent: '#5A4DD0',
  accentMuted: '#9589F0',
  accentSubtle: 'rgba(90,77,208,0.10)',

  positive: '#1FAA7A',
  positiveSubtle: 'rgba(31,170,122,0.10)',
  warning: '#C77A0E',
  warningSubtle: 'rgba(199,122,14,0.10)',
  danger: '#D43E3E',
  dangerSubtle: 'rgba(212,62,62,0.10)',

  border: 'rgba(10,10,20,0.07)',
  borderSubtle: 'rgba(10,10,20,0.03)',
  divider: 'rgba(10,10,20,0.05)',

  categoryFood: '#E06030',
  categoryTransport: '#2A7AD4',
  categoryBills: '#8A30D4',
  categoryShopping: '#D43080',
  categoryEntertainment: '#1AADAB',
  categoryHealth: '#1AAD4A',
  categorySubscriptions: '#D4A030',
  categoryOther: '#6A6A8A',
};

// ─────────────────────────────────────────────────────────────
// TYPOGRAPHY — DM Sans + DM Mono. Sharp, spacious, financial precision.
// 2026 update: extreme display sizes for hero numbers; tabular mono for amounts.
//
// HERO MONEY RULES (do not break — readability > drama):
//   - Use a single fixed display size per screen, never adjustsFontSizeToFit.
//     Auto-shrinking hero numbers makes the same screen render different
//     "weights" depending on the amount, which destroys hierarchy.
//   - HERO_MONEY chooses the right size for the expected order of magnitude:
//       small  → up to ~6 digits incl. currency       (Rs. 9,999)
//       medium → up to ~8 digits                      (Rs. 999,999)
//       large  → 9+ digits / multi-line headlines     (Rs. 12,34,567)
//   - If the value can grow beyond the chosen bucket, format with formatCompact
//     (e.g. "Rs. 1.2M") rather than shrinking the font.
// ─────────────────────────────────────────────────────────────
export const TYPOGRAPHY = {
  // Display — hero numbers, one per screen max
  displayXXL: { fontSize: 68, fontFamily: 'DMSans-Bold', letterSpacing: -3.0, lineHeight: 72 },
  displayXL: { fontSize: 56, fontFamily: 'DMSans-Bold', letterSpacing: -2.5, lineHeight: 60 },
  displayL: { fontSize: 42, fontFamily: 'DMSans-Bold', letterSpacing: -1.5, lineHeight: 48 },
  displayM: { fontSize: 32, fontFamily: 'DMSans-Bold', letterSpacing: -1.0, lineHeight: 38 },

  // Heading
  h1: { fontSize: 28, fontFamily: 'DMSans-SemiBold', letterSpacing: -0.6, lineHeight: 34 },
  h2: { fontSize: 20, fontFamily: 'DMSans-SemiBold', letterSpacing: -0.3, lineHeight: 26 },
  h3: { fontSize: 17, fontFamily: 'DMSans-Medium', letterSpacing: -0.2, lineHeight: 22 },

  // Body
  bodyL: { fontSize: 16, fontFamily: 'DMSans-Regular', letterSpacing: -0.1, lineHeight: 24 },
  bodyM: { fontSize: 14, fontFamily: 'DMSans-Regular', letterSpacing: 0, lineHeight: 20 },
  bodyS: { fontSize: 12, fontFamily: 'DMSans-Regular', letterSpacing: 0.1, lineHeight: 18 },

  // Label — UI elements, chips
  labelL: { fontSize: 14, fontFamily: 'DMSans-Medium', letterSpacing: 0.1, lineHeight: 18 },
  labelM: { fontSize: 12, fontFamily: 'DMSans-Medium', letterSpacing: 0.2, lineHeight: 16 },
  labelS: { fontSize: 10, fontFamily: 'DMSans-SemiBold', letterSpacing: 0.6, lineHeight: 14 },

  // Mono — amounts, numbers, technical data
  monoXL: { fontSize: 22, fontFamily: 'DMMono-Medium', letterSpacing: -0.4, lineHeight: 28 },
  monoL: { fontSize: 16, fontFamily: 'DMMono-Medium', letterSpacing: -0.3, lineHeight: 22 },
  monoM: { fontSize: 14, fontFamily: 'DMMono-Regular', letterSpacing: -0.2, lineHeight: 20 },
  monoS: { fontSize: 12, fontFamily: 'DMMono-Regular', letterSpacing: 0, lineHeight: 16 },
} as const;

// Hero money display sizes — pick one per screen, do NOT enable adjustsFontSizeToFit.
// Sizes are derived from TYPOGRAPHY display tokens so they stay in lock-step.
export const HERO_MONEY = {
  small: TYPOGRAPHY.displayL,   // up to ~6 digits with currency prefix
  medium: TYPOGRAPHY.displayXL, // up to ~8 digits
  large: TYPOGRAPHY.displayXXL, // 9+ digits or multi-line hero
} as const;

// ─────────────────────────────────────────────────────────────
// SPACING — 4pt grid. Generous by default; whitespace is the design.
// ─────────────────────────────────────────────────────────────
export const SPACING = {
  xs: 4,
  s: 8,
  sm: 12,
  m: 16,
  ml: 20,
  l: 24,
  xl: 32,
  xxl: 40,
  xxxl: 56,
  huge: 72,
} as const;

// ─────────────────────────────────────────────────────────────
// RADIUS
// ─────────────────────────────────────────────────────────────
export const RADIUS = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 22,
  xxl: 28,
  xxxl: 36,
  full: 999,
} as const;

// ─────────────────────────────────────────────────────────────
// SHADOWS — platform-aware. Restraint: never more than necessary.
// ─────────────────────────────────────────────────────────────
export const SHADOWS = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 6,
  },
  strong: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.20,
    shadowRadius: 28,
    elevation: 14,
  },
  // Floating: used for tab bar and FABs
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  accent: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.30,
    shadowRadius: 16,
    elevation: 10,
  }),
} as const;

// ─────────────────────────────────────────────────────────────
// MOTION — 2026 spring presets. Use these by name; never bespoke.
// Springs over timings everywhere except progress fills.
// ─────────────────────────────────────────────────────────────
export const DURATION = {
  instant: 80,
  fast: 150,
  normal: 250,
  slow: 400,
  verySlow: 600,
} as const;

export const SPRING = {
  // Tactile press response — fast, slightly bouncy
  press: { damping: 18, stiffness: 380, mass: 0.9 },
  // Gentle UI motion — pills, sliding accents
  gentle: { damping: 22, stiffness: 220, mass: 1 },
  // Confident — sheets, big elements settling
  settle: { damping: 24, stiffness: 180, mass: 1.1 },
  // Snappy reveal — modals, dropdowns
  snap: { damping: 16, stiffness: 320, mass: 0.85 },
} as const;

// ─────────────────────────────────────────────────────────────
// CATEGORY METADATA
// ─────────────────────────────────────────────────────────────
export const CATEGORY_META = {
  food: { label: 'Food', icon: 'utensils' },
  transport: { label: 'Transport', icon: 'car' },
  bills: { label: 'Bills', icon: 'file-text' },
  shopping: { label: 'Shopping', icon: 'shopping-bag' },
  entertainment: { label: 'Entertainment', icon: 'play' },
  health: { label: 'Health', icon: 'heart' },
  subscriptions: { label: 'Subscriptions', icon: 'repeat' },
  transfer: { label: 'Transfer', icon: 'arrow-right-left' },
  other: { label: 'Other', icon: 'circle' },
} as const;

// ─────────────────────────────────────────────────────────────
// LAYOUT CONSTANTS — used by the floating tab bar and screen padding
// ─────────────────────────────────────────────────────────────
export const LAYOUT = {
  tabBarHeight: 62,
  tabBarHorizontalInset: 16,
  tabBarBottomGap: 12,
  // Combined offset that screens apply to bottom paddings to clear the floating bar
  scrollBottomInset: 62 + 16 + 12,
  screenHorizontalPadding: 24,
} as const;
