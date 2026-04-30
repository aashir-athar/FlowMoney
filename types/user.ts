// types/user.ts

export type OnboardingGoal = 'save_money' | 'control_spending' | 'just_track';

export interface UserPreferences {
  goal: OnboardingGoal | null;
  currency: string;
  onboardingComplete: boolean;
  notificationsEnabled: boolean;
  smsPermissionGranted: boolean;
  theme: 'system' | 'dark' | 'light';
  name?: string;
}
