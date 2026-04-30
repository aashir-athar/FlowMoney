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
import {
  checkSmsPermission,
  isSmsReadingSupported,
  readFinancialSms,
  requestSmsPermissions,
} from '../../services/smsReader';
import { useAppStore } from '../../store/useAppStore';
import { formatCurrency } from '../../utils/analytics';

function goalLabel(goal: string | null): string {
  switch (goal) {
    case 'save_money':
      return 'Save more money';
    case 'control_spending':
      return 'Control my spending';
    case 'just_track':
      return 'Just tracking for now';
    default:
      return 'Not set';
  }
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const preferences = useAppStore((s) => s.preferences);
  const setNotificationsEnabled = useAppStore((s) => s.setNotificationsEnabled);
  const setSmsPermission = useAppStore((s) => s.setSmsPermission);
  const addTransactions = useAppStore((s) => s.addTransactions);
  const summary = useAppStore((s) => s.summary);

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
        'Android only',
        'SMS-based tracking is only available on Android.'
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
  }, [preferences.smsPermissionGranted]);

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
          <Text style={[styles.title, { color: colors.textPrimary }]}>Profile</Text>
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
            Your goal
          </Text>
          <Text style={[styles.goalText, { color: colors.textPrimary }]}>
            {goalLabel(preferences.goal)}
          </Text>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(120).springify().damping(20)}>
          <SectionLabel title="Stats" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <StatRow
              label="Spent this month"
              value={formatCurrency(summary?.thisMonth ?? 0)}
              colors={colors}
            />
            <Divider colors={colors} />
            <StatRow
              label="Daily average"
              value={formatCurrency(summary?.dailyAverageThisMonth ?? 0)}
              colors={colors}
            />
            <Divider colors={colors} />
            <StatRow
              label="vs last month"
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
          <SectionLabel title="Settings" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                  Notifications
                </Text>
                <Text style={[styles.settingHint, { color: colors.textTertiary }]}>
                  Alert me when a transaction is detected
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
                SMS Reading
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
                  {preferences.smsPermissionGranted ? 'Active' : 'Tap to enable'}
                </Text>
              </View>
            </Pressable>
            <Divider colors={colors} />
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                Currency
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
            On-device only
          </Text>
          <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
            Your transactions never leave this phone. SMS messages are parsed locally.
            FlowMoney does not run a server.
          </Text>
        </Animated.View>

        <Text style={[styles.version, { color: colors.textTertiary }]}>
          FlowMoney 1.0.0
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
