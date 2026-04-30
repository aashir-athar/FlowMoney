// app/onboarding.tsx
// First impression. Three steps. Builds trust before extracting commitment.
//
// Psychology:
//   - Step 1 (welcome): the promise — "money, clear at last"
//   - Step 2 (privacy): the trust — "your data never leaves your phone"
//   - Step 3 (goal): the commitment — they tell us what matters
//   This sequence is intentional: trust before ask. People commit to systems
//   they feel are on their side.

import { router } from 'expo-router';
import React, { memo, useCallback, useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LAYOUT, RADIUS, SPACING, SPRING, TYPOGRAPHY } from '../constants/design';
import { useTheme } from '../hooks/useTheme';
import { useHaptics } from '../hooks/useTransactions';
import { useAppStore } from '../store/useAppStore';
import { OnboardingGoal } from '../types/user';

const { height: SCREEN_H } = Dimensions.get('window');

const STEPS = [
  {
    id: 'welcome',
    eyebrow: 'Welcome',
    headline: 'Your money,\nclear at last.',
    subtext:
      'FlowMoney reads your bank alerts and turns them into a picture of your financial life. No manual entry. No spreadsheets.',
    cta: 'Get started',
  },
  {
    id: 'privacy',
    eyebrow: 'Privacy first',
    headline: 'Your data never\nleaves your phone.',
    subtext:
      'We read transaction alerts only — never personal messages. Everything is processed on-device. There is no FlowMoney server.',
    cta: 'That works for me',
  },
  {
    id: 'goal',
    eyebrow: 'One last thing',
    headline: 'What matters\nmost to you?',
    subtext: 'This shapes how we show your money.',
    cta: null,
  },
] as const;

const GOALS: { id: OnboardingGoal; label: string; sub: string }[] = [
  { id: 'save_money', label: 'Save more money', sub: 'Track what is holding you back' },
  { id: 'control_spending', label: 'Control my spending', sub: 'Know where every rupee goes' },
  { id: 'just_track', label: 'Just track for now', sub: 'Awareness without pressure' },
];

export default function Onboarding() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { light, success } = useHaptics();
  const setGoal = useAppStore((s) => s.setGoal);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const [step, setStep] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<OnboardingGoal | null>(null);

  const progressWidth = useSharedValue((1 / STEPS.length) * 100);

  const goNext = useCallback(() => {
    light();
    if (step < STEPS.length - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      progressWidth.value = withSpring(
        ((nextStep + 1) / STEPS.length) * 100,
        SPRING.gentle
      );
    }
  }, [step, light, progressWidth]);

  const handleGoalSelect = useCallback(
    (goal: OnboardingGoal) => {
      light();
      setSelectedGoal(goal);
    },
    [light]
  );

  const handleFinish = useCallback(() => {
    if (!selectedGoal) return;
    success();
    setGoal(selectedGoal);
    completeOnboarding();
    router.replace('/(tabs)');
  }, [selectedGoal, setGoal, completeOnboarding, success]);

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  const progressAnimStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={
          isDark
            ? ['rgba(123,104,238,0.20)', 'transparent']
            : ['rgba(90,77,208,0.10)', 'transparent']
        }
        style={styles.gradientAmbient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        pointerEvents="none"
      />

      {/* Progress */}
      <View
        style={[
          styles.progressTrack,
          { top: insets.top + 16, backgroundColor: colors.borderSubtle },
        ]}
      >
        <Animated.View
          style={[styles.progressFill, { backgroundColor: colors.accent }, progressAnimStyle]}
        />
      </View>

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 64,
            paddingBottom: insets.bottom + SPACING.l,
          },
        ]}
      >
        <Animated.Text
          entering={FadeIn.delay(100)}
          style={[styles.eyebrow, { color: colors.textTertiary }]}
        >
          {currentStep.eyebrow}
        </Animated.Text>

        <Animated.Text
          key={`headline-${step}`}
          entering={FadeInDown.delay(80).springify().damping(18)}
          style={[styles.headline, { color: colors.textPrimary }]}
        >
          {currentStep.headline}
        </Animated.Text>

        <Animated.Text
          key={`sub-${step}`}
          entering={FadeInDown.delay(160).springify().damping(18)}
          style={[styles.subtext, { color: colors.textSecondary }]}
        >
          {currentStep.subtext}
        </Animated.Text>

        {isLastStep && (
          <View style={styles.goalsContainer}>
            {GOALS.map((goal, i) => (
              <Animated.View
                key={goal.id}
                entering={FadeInDown.delay(200 + i * 80).springify().damping(20)}
              >
                <GoalRow
                  goal={goal}
                  selected={selectedGoal === goal.id}
                  onPress={handleGoalSelect}
                  colors={colors}
                />
              </Animated.View>
            ))}
          </View>
        )}

        <View style={styles.spacer} />

        {!isLastStep ? (
          <Animated.View entering={FadeInDown.delay(300)}>
            <Pressable
              onPress={goNext}
              style={({ pressed }) => [
                styles.ctaButton,
                { backgroundColor: colors.accent, opacity: pressed ? 0.92 : 1 },
              ]}
            >
              <Text style={[styles.ctaText, { color: '#fff' }]}>
                {currentStep.cta}
              </Text>
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(400)}>
            <Pressable
              onPress={handleFinish}
              disabled={!selectedGoal}
              style={({ pressed }) => [
                styles.ctaButton,
                {
                  backgroundColor: selectedGoal ? colors.accent : colors.surface,
                  borderColor: colors.border,
                  borderWidth: selectedGoal ? 0 : StyleSheet.hairlineWidth,
                  opacity: pressed && selectedGoal ? 0.92 : selectedGoal ? 1 : 0.6,
                },
              ]}
            >
              <Text
                style={[
                  styles.ctaText,
                  { color: selectedGoal ? '#fff' : colors.textTertiary },
                ]}
              >
                Start tracking
              </Text>
            </Pressable>
          </Animated.View>
        )}

      </View>
    </View>
  );
}

const GoalRow = memo(function GoalRow({
  goal,
  selected,
  onPress,
  colors,
}: {
  goal: { id: OnboardingGoal; label: string; sub: string };
  selected: boolean;
  onPress: (id: OnboardingGoal) => void;
  colors: any;
}) {
  return (
    <Pressable
      onPress={() => onPress(goal.id)}
      style={({ pressed }) => [
        styles.goalCard,
        {
          backgroundColor: selected ? colors.accentSubtle : colors.surface,
          borderColor: selected ? colors.accent : colors.border,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.goalRadio,
          {
            borderColor: selected ? colors.accent : colors.textTertiary,
            backgroundColor: selected ? colors.accent : 'transparent',
          },
        ]}
      >
        {selected && <View style={styles.goalRadioInner} />}
      </View>
      <View style={styles.goalText}>
        <Text style={[styles.goalLabel, { color: colors.textPrimary }]}>
          {goal.label}
        </Text>
        <Text style={[styles.goalSub, { color: colors.textSecondary }]}>{goal.sub}</Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradientAmbient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_H * 0.5,
  },
  progressTrack: {
    position: 'absolute',
    left: LAYOUT.screenHorizontalPadding,
    right: LAYOUT.screenHorizontalPadding,
    height: 2,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: RADIUS.full },
  content: {
    flex: 1,
    paddingHorizontal: LAYOUT.screenHorizontalPadding,
  },
  eyebrow: {
    ...TYPOGRAPHY.labelM,
    marginBottom: SPACING.l,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  headline: {
    ...TYPOGRAPHY.displayM,
    marginBottom: SPACING.m,
  },
  subtext: {
    ...TYPOGRAPHY.bodyL,
    lineHeight: 26,
    maxWidth: 340,
  },
  goalsContainer: {
    marginTop: SPACING.xl,
    gap: SPACING.s,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.m,
    borderRadius: RADIUS.l,
    borderWidth: 1.5,
    gap: SPACING.m,
  },
  goalRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  goalText: { flex: 1, gap: 2 },
  goalLabel: { ...TYPOGRAPHY.labelL },
  goalSub: { ...TYPOGRAPHY.bodyS },
  spacer: { flex: 1 },
  ctaButton: {
    height: 58,
    borderRadius: RADIUS.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  ctaText: { ...TYPOGRAPHY.h3 },
});
