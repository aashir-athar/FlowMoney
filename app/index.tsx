// app/index.tsx
// Entry point: redirect based on onboarding state

import { Redirect } from 'expo-router';
import { useAppStore } from '../store/useAppStore';

export default function Index() {
  const onboardingComplete = useAppStore((s) => s.preferences.onboardingComplete);
  return <Redirect href={onboardingComplete ? '/(tabs)' : '/onboarding'} />;
}
