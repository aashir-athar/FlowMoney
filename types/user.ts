// types/user.ts

export type OnboardingGoal = 'save_money' | 'control_spending' | 'just_track';

// 'system' means follow the OS locale; otherwise an explicit user choice.
export type LanguagePreference = 'system' | 'en' | 'ur' | 'hi';

export interface UserPreferences {
  goal: OnboardingGoal | null;
  currency: string;
  onboardingComplete: boolean;
  notificationsEnabled: boolean;
  smsPermissionGranted: boolean;
  theme: 'system' | 'dark' | 'light';
  language: LanguagePreference;
  name?: string;
}
