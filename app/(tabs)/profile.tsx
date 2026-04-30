// app/(tabs)/profile.tsx
// Profile — settings, your goal, privacy assertion. Quiet and assured.

import React, { memo, useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SmsPermissionSheet } from '../../components/ui/SmsPermissionSheet';
import { LAYOUT, RADIUS, SPACING, TYPOGRAPHY } from '../../constants/design';
import { useColors } from '../../hooks/useTheme';
import { LanguagePreference, useT } from '../../i18n';
import {
  checkSmsPermission,
  isSmsReadingSupported,
  readFinancialSms,
  requestSmsPermissions,
} from '../../services/smsReader';
import { useAppStore } from '../../store/useAppStore';
import { formatCurrency } from '../../utils/analytics';

// Resolve a goal id to its translated label via the i18n key suffix.
function goalLabelKey(goal: string | null): string {
  switch (goal) {
    case 'save_money':
      return 'profile.goalSaveMoney';
    case 'control_spending':
      return 'profile.goalControlSpending';
    case 'just_track':
      return 'profile.goalJustTrack';
    default:
      return 'profile.goalNotSet';
  }
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const preferences = useAppStore((s) => s.preferences);
  const setNotificationsEnabled = useAppStore((s) => s.setNotificationsEnabled);
  const setSmsPermission = useAppStore((s) => s.setSmsPermission);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const addTransactions = useAppStore((s) => s.addTransactions);
  const summary = useAppStore((s) => s.summary);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  // Two-stage flow:
  //   1. Tap on the row → open the explainer sheet (SmsPermissionSheet).
  //   2. From the sheet, "Continue" triggers the OS prompt.
  // We track `previouslyDenied` so a second visit can offer "Open Settings"
  // instead of silently failing on Android's "don't ask again".
  const [showSheet, setShowSheet] = useState(false);
  const [previouslyDenied, setPreviouslyDenied] = useState(false);

  const handleSmsPress = useCallback(async () => {
    if (!isSmsReadingSupported()) {
      Alert.alert(
        t('profile.androidOnlyTitle'),
        t('profile.androidOnlyMessage')
      );
      return;
    }
    if (preferences.smsPermissionGranted) return;

    // If the OS already has a "denied" verdict, the request will silently
    // resolve. Detect it up front so we can route the user to Settings.
    const currentlyGranted = await checkSmsPermission();
    setPreviouslyDenied(false);
    if (!currentlyGranted) {
      // We can't directly distinguish "never asked" from "denied permanently"
      // in expo-transaction-sms-reader, so we attempt a request inside the
      // sheet flow and flip `previouslyDenied` if it comes back denied.
    }
    setShowSheet(true);
  }, [preferences.smsPermissionGranted, t]);

  const handleLanguageSelect = useCallback(
    (next: LanguagePreference) => {
      setLanguage(next);
      setShowLanguagePicker(false);
    },
    [setLanguage]
  );

  const handleConfirmRequest = useCallback(async () => {
    setShowSheet(false);
    const granted = await requestSmsPermissions();
    setSmsPermission(granted);
    if (!granted) {
      // Reopen the sheet in "previouslyDenied" mode so the next tap shows
      // Open Settings rather than re-prompting.
      setPreviouslyDenied(true);
      setShowSheet(true);
      return;
    }
    const historic = await readFinancialSms(30);
    addTransactions(historic);
  }, [setSmsPermission, addTransactions]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + SPACING.s,
            paddingBottom: insets.bottom + LAYOUT.scrollBottomInset + SPACING.l,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('profile.title')}</Text>
        </Animated.View>

        {/* Goal card */}
        <Animated.View
          entering={FadeInDown.delay(60).springify().damping(20)}
          style={[
            styles.goalCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardLabel, { color: colors.textTertiary }]}>
            {t('profile.yourGoal')}
          </Text>
          <Text style={[styles.goalText, { color: colors.textPrimary }]}>
            {t(goalLabelKey(preferences.goal))}
          </Text>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(120).springify().damping(20)}>
          <SectionLabel title={t('profile.sectionStats')} colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <StatRow
              label={t('profile.spentThisMonth')}
              value={formatCurrency(summary?.thisMonth ?? 0)}
              colors={colors}
            />
            <Divider colors={colors} />
            <StatRow
              label={t('profile.dailyAverage')}
              value={formatCurrency(summary?.dailyAverageThisMonth ?? 0)}
              colors={colors}
            />
            <Divider colors={colors} />
            <StatRow
              label={t('profile.vsLastMonth')}
              value={`${(summary?.monthlyChange ?? 0) > 0 ? '+' : ''}${(
                summary?.monthlyChange ?? 0
              ).toFixed(0)}%`}
              valueColor={
                (summary?.monthlyChange ?? 0) > 0 ? colors.warning : colors.positive
              }
              colors={colors}
            />
          </View>
        </Animated.View>

        {/* Settings */}
        <Animated.View entering={FadeInDown.delay(180).springify().damping(20)}>
          <SectionLabel title={t('profile.sectionSettings')} colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                  {t('profile.notifications')}
                </Text>
                <Text style={[styles.settingHint, { color: colors.textTertiary }]}>
                  {t('profile.notificationsHint')}
                </Text>
              </View>
              <Switch
                value={preferences.notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: colors.border, true: colors.accentMuted }}
                thumbColor={
                  preferences.notificationsEnabled ? colors.accent : colors.textTertiary
                }
              />
            </View>
            <Divider colors={colors} />
            <Pressable
              onPress={handleSmsPress}
              disabled={preferences.smsPermissionGranted}
              style={({ pressed }) => [
                styles.settingRow,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                {t('profile.smsReading')}
              </Text>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: preferences.smsPermissionGranted
                      ? colors.positiveSubtle
                      : colors.warningSubtle,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color: preferences.smsPermissionGranted
                        ? colors.positive
                        : colors.warning,
                    },
                  ]}
                >
                  {t(preferences.smsPermissionGranted ? 'profile.smsActive' : 'profile.smsTapToEnable')}
                </Text>
              </View>
            </Pressable>
            <Divider colors={colors} />
            <Pressable
              onPress={() => setShowLanguagePicker((v) => !v)}
              style={({ pressed }) => [
                styles.settingRow,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                {t('profile.language')}
              </Text>
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                {preferences.language === 'system'
                  ? t('language.systemDefault')
                  : t(`language.${preferences.language}`)}
              </Text>
            </Pressable>
            {showLanguagePicker && (
              <View style={styles.languageOptions}>
                {(['system', 'en', 'ur', 'hi'] as LanguagePreference[]).map((lang) => {
                  const isSelected = preferences.language === lang;
                  return (
                    <Pressable
                      key={lang}
                      onPress={() => handleLanguageSelect(lang)}
                      style={({ pressed }) => [
                        styles.languageOption,
                        {
                          backgroundColor: isSelected
                            ? colors.accentSubtle
                            : colors.backgroundSecondary,
                          borderColor: isSelected ? colors.accent : 'transparent',
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.languageOptionText,
                          {
                            color: isSelected ? colors.accent : colors.textSecondary,
                          },
                        ]}
                      >
                        {lang === 'system'
                          ? t('language.systemDefault')
                          : t(`language.${lang}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            <Divider colors={colors} />
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                {t('profile.currency')}
              </Text>
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                Rs. (PKR)
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Privacy assertion */}
        <Animated.View
          entering={FadeInDown.delay(240).springify().damping(20)}
          style={[
            styles.privacyNote,
            {
              backgroundColor: colors.positiveSubtle,
              borderColor: colors.positive + '30',
            },
          ]}
        >
          <Text style={[styles.privacyTitle, { color: colors.positive }]}>
            {t('profile.privacyTitle')}
          </Text>
          <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
            {t('profile.privacyText')}
          </Text>
        </Animated.View>

        <Text style={[styles.version, { color: colors.textTertiary }]}>
          {t('profile.version', { version: '1.0.0' })}
        </Text>
      </ScrollView>

      <SmsPermissionSheet
        visible={showSheet}
        previouslyDenied={previouslyDenied}
        onConfirm={handleConfirmRequest}
        onDismiss={() => setShowSheet(false)}
      />
    </View>
  );
}

const SectionLabel = memo(function SectionLabel({
  title,
  colors,
}: {
  title: string;
  colors: any;
}) {
  return (
    <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{title}</Text>
  );
});

const StatRow = memo(function StatRow({
  label,
  value,
  colors,
  valueColor,
}: {
  label: string;
  value: string;
  colors: any;
  valueColor?: string;
}) {
  return (
    <View style={styles.statRow}>
      <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.statValue, { color: valueColor ?? colors.textPrimary }]}>
        {value}
      </Text>
    </View>
  );
});

const Divider = memo(function Divider({ colors }: { colors: any }) {
  return <View style={[styles.divider, { backgroundColor: colors.divider }]} />;
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: LAYOUT.screenHorizontalPadding,
    gap: SPACING.s,
  },
  title: { ...TYPOGRAPHY.h1, marginBottom: SPACING.m },
  sectionTitle: {
    ...TYPOGRAPHY.labelS,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: SPACING.l,
    marginBottom: SPACING.s,
  },
  goalCard: {
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.l,
    gap: SPACING.s,
  },
  cardLabel: {
    ...TYPOGRAPHY.labelS,
    textTransform: 'uppercase',
  },
  goalText: { ...TYPOGRAPHY.h2 },
  card: {
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.l,
    gap: SPACING.m,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: { ...TYPOGRAPHY.bodyM },
  settingHint: { ...TYPOGRAPHY.bodyS, marginTop: 2 },
  settingValue: { ...TYPOGRAPHY.bodyM },
  statValue: { ...TYPOGRAPHY.monoM },
  divider: { height: StyleSheet.hairlineWidth },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  badgeText: { ...TYPOGRAPHY.labelS },
  languageOptions: {
    gap: SPACING.xs,
  },
  languageOption: {
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.m,
    borderWidth: 1.5,
  },
  languageOptionText: {
    ...TYPOGRAPHY.labelL,
  },
  privacyNote: {
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.m,
    gap: SPACING.xs,
    marginTop: SPACING.l,
  },
  privacyTitle: { ...TYPOGRAPHY.labelL },
  privacyText: { ...TYPOGRAPHY.bodyS, lineHeight: 19 },
  version: {
    ...TYPOGRAPHY.labelS,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
});
