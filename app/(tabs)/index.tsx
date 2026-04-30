// app/(tabs)/index.tsx
// Home Dashboard — the first thing users see every day.
//
// Design philosophy:
//   ONE hero, ONE question per screen. The user opens the app and the very
//   first thing they read is an honest answer to "did I overspend today?".
//   Every other element is supporting evidence.
//
// Psychology:
//   - Hero "Today" amount is the first focal point — no competing elements
//     above it. Reduces decision fatigue (Hick's Law).
//   - Action affordances (Add, Ask) live at the top-right where the thumb
//     naturally lives on phones (Fitts's Law).
//   - Section headers double as nav: tap "Recent" or "Insights" to jump.
//   - Pulse animation only fires when over daily average — earned signal,
//     never gratuitous.
//
// Performance:
//   - Single ScrollView (not nested lists). Children are at most ~10 items.
//   - All sub-components are memoized.
//   - No LinearGradient inside list items.
//   - Pulse uses Reanimated UI thread; never crosses the bridge.

import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InsightCard } from '../../components/cards/InsightCard';
import { SubscriptionAlert } from '../../components/cards/SubscriptionAlert';
import { TransactionRow } from '../../components/cards/TransactionRow';
import { SpendingRing } from '../../components/charts/SpendingRing';
import { WeeklyBarChart } from '../../components/charts/WeeklyBarChart';
import { AskFab } from '../../components/ui/AskFab';
import { EmptyState } from '../../components/ui/EmptyState';
import {
    DashboardHeroSkeleton,
    Skeleton,
    TransactionRowSkeleton,
} from '../../components/ui/Skeleton';
import { SmsPermissionSheet } from '../../components/ui/SmsPermissionSheet';
import { LAYOUT, RADIUS, SPACING, TYPOGRAPHY } from '../../constants/design';
import { useColors, useTheme } from '../../hooks/useTheme';
import { useHaptics, useTransactions } from '../../hooks/useTransactions';
import { useT } from '../../i18n';
import {
    isSmsReadingSupported,
    readFinancialSms,
    requestSmsPermissions,
} from '../../services/smsReader';
import { useAppStore } from '../../store/useAppStore';
import {
    formatCurrency,
    getDailySpendForChart,
    getTrendLabel,
} from '../../utils/analytics';

// Returns the i18n key for the greeting based on local time of day.
function greetingKey(): 'morning' | 'afternoon' | 'evening' {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export default function HomeScreen() {
  const colors = useColors();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { light } = useHaptics();
  const { t, locale } = useT();
  const { summary, recent } = useTransactions();
  const insights = useAppStore((s) => s.insights);
  const subscriptions = useAppStore((s) => s.subscriptions);
  const refreshSummary = useAppStore((s) => s.refreshSummary);
  const transactions = useAppStore((s) => s.transactions);
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const smsGranted = useAppStore((s) => s.preferences.smsPermissionGranted);
  const setSmsPermission = useAppStore((s) => s.setSmsPermission);
  const addTransactions = useAppStore((s) => s.addTransactions);

  const [refreshing, setRefreshing] = useState(false);
  const [showSmsSheet, setShowSmsSheet] = useState(false);
  const [smsPreviouslyDenied, setSmsPreviouslyDenied] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshSummary();
    setTimeout(() => setRefreshing(false), 600);
  }, [refreshSummary]);

  const handleConnectSms = useCallback(() => {
    light();
    setShowSmsSheet(true);
  }, [light]);

  const handleConfirmSmsRequest = useCallback(async () => {
    setShowSmsSheet(false);
    if (!isSmsReadingSupported()) return;
    const granted = await requestSmsPermissions();
    setSmsPermission(granted);
    if (!granted) {
      // OS denied (or "don't ask again"). Reopen with Open Settings CTA so the
      // user has a way forward instead of repeated silent prompts.
      setSmsPreviouslyDenied(true);
      setShowSmsSheet(true);
      return;
    }
    const historic = await readFinancialSms(30);
    addTransactions(historic);
  }, [setSmsPermission, addTransactions]);

  const weeklyData = useMemo(
    () => getDailySpendForChart(transactions, 7),
    [transactions]
  );

  // Surface up to two unread patterns on Home — gives the section enough
  // visual weight while leaving the rest for the Insights tab to expand on.
  const unreadInsights = useMemo(
    () => insights.filter((i) => !i.isRead).slice(0, 2),
    [insights]
  );

  const unusedSubscriptions = useMemo(
    () => subscriptions.filter((s) => !s.recentlyUsed),
    [subscriptions]
  );

  const topTransactions = useMemo(() => recent.slice(0, 5), [recent]);

  // date-fns doesn't ship Urdu/Hindi locales by default, so use the
  // platform Intl formatter to get a localised "Saturday, April 12" header.
  const today = new Date().toLocaleDateString(
    locale === 'ur' ? 'ur-PK' : locale === 'hi' ? 'hi-IN' : 'en-US',
    { weekday: 'long', month: 'long', day: 'numeric' }
  );

  const overBudget =
    summary != null && summary.today > summary.dailyAverageThisMonth * 1.3;

  // Subtle pulse only when over average. Runs purely on the UI thread.
  const pulseAnim = useSharedValue(1);
  useEffect(() => {
    if (overBudget) {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.015, { duration: 1400 }),
          withTiming(1, { duration: 1400 })
        ),
        -1,
        false
      );
    } else {
      pulseAnim.value = 1;
    }
  }, [overBudget, pulseAnim]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const handleAdd = useCallback(() => {
    light();
    router.push('/add-transaction');
  }, [light]);

  const handleAsk = useCallback(() => {
    light();
    router.push('/chat');
  }, [light]);

  const handleSeeFeed = useCallback(() => router.push('/(tabs)/feed'), []);
  const handleSeeInsights = useCallback(() => router.push('/(tabs)/insights'), []);

  // ── Loading state: store hasn't rehydrated yet — show skeletons. ──
  // Avoids the "flash of empty layout" while AsyncStorage reads.
  const showLoadingSkeleton = !hasHydrated;

  // ── Empty state: hydrated, no transactions, SMS not connected. ──
  // We show a single CTA that opens the explanatory sheet.
  const isFirstRunEmpty = hasHydrated && transactions.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Ambient top glow — informs the eye where to look first. */}
      <LinearGradient
        colors={
          isDark
            ? [`${colors.accent}20`, 'transparent']
            : [`${colors.accent}10`, 'transparent']
        }
        style={styles.ambientGlow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + SPACING.s,
            paddingBottom: insets.bottom + LAYOUT.scrollBottomInset + SPACING.l,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        removeClippedSubviews={false}
      >
        {/* ── Header ───────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.springify().damping(20)} style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.dateText, { color: colors.textTertiary }]}>{today}</Text>
            <Text style={[styles.greetingText, { color: colors.textPrimary }]}>
              {t(`greeting.${greetingKey()}`)}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              onPress={handleAdd}
              style={[
                styles.iconButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              accessibilityLabel={t('home.addAccessibility')}
              hitSlop={6}
            >
              <Feather name="plus" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        </Animated.View>

        {showLoadingSkeleton ? (
          <HomeLoadingSkeleton colors={colors} />
        ) : isFirstRunEmpty ? (
          <HomeEmptyState
            colors={colors}
            smsGranted={smsGranted}
            onConnectSms={handleConnectSms}
            onAddManual={handleAdd}
          />
        ) : (
          <>
        {/* ── Hero: Today ─────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(60).springify().damping(20)}
          style={styles.heroBlock}
        >
          <Text style={[styles.heroLabel, { color: colors.textTertiary }]}>
            {t('home.todayLabel')}
          </Text>
          <View style={styles.heroRow}>
            <Animated.Text
              style={[styles.heroAmount, { color: colors.textPrimary }, pulseStyle]}
              numberOfLines={1}
            >
              {formatCurrency(summary?.today ?? 0)}
            </Animated.Text>
            <SpendingRing
              spent={summary?.today ?? 0}
              limit={
                summary?.dailyAverageThisMonth
                  ? summary.dailyAverageThisMonth * 1.2
                  : 5000
              }
              color={colors.accent}
              size={64}
              strokeWidth={4}
            />
          </View>

          {/* Two metric pills */}
          <View
            style={[
              styles.pillsRow,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <MetricPill
              label={t('home.weekLabel')}
              value={formatCurrency(summary?.thisWeek ?? 0)}
              change={summary?.weeklyChange}
              colors={colors}
            />
            <View style={[styles.pillDivider, { backgroundColor: colors.divider }]} />
            <MetricPill
              label={t('home.monthLabel')}
              value={formatCurrency(summary?.thisMonth ?? 0)}
              change={summary?.monthlyChange}
              colors={colors}
            />
          </View>
        </Animated.View>

        {/* ── Weekly chart ────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(140).springify().damping(20)}>
          <SectionHeader title={t('home.sectionWeekly')} colors={colors} />
          <View
            style={[
              styles.chartCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <WeeklyBarChart
              data={weeklyData}
              accentColor={colors.accent}
              textColor={colors.textTertiary}
              barColor={colors.accentMuted}
              averageOverride={summary?.dailyAverageThisMonth}
            />
          </View>
        </Animated.View>

        {/* ── Patterns (up to 2) ───────────────────────────── */}
        {unreadInsights.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).springify().damping(20)}>
            <SectionHeader
              // Singular/plural — "Pattern" reads cleaner than "Pattern(s)"
              // when only one card is showing.
              title={t(
                unreadInsights.length === 1
                  ? 'home.sectionPattern'
                  : 'home.sectionPatterns'
              )}
              colors={colors}
              actionLabel={t('common.seeAll')}
              onAction={handleSeeInsights}
            />
            {unreadInsights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </Animated.View>
        )}

        {/* ── Subscriptions alert ─────────────────────────── */}
        {unusedSubscriptions.length > 0 && (
          <Animated.View entering={FadeInDown.delay(260).springify().damping(20)}>
            <SubscriptionAlert subscriptions={unusedSubscriptions} colors={colors} />
          </Animated.View>
        )}

        {/* ── Recent ──────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(320).springify().damping(20)}>
          <SectionHeader
            title={t('home.sectionRecent')}
            colors={colors}
            actionLabel={t('common.seeAll')}
            onAction={handleSeeFeed}
          />
          <View
            style={[
              styles.transactionList,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {topTransactions.map((tx, i) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                isLast={i === topTransactions.length - 1}
                onPress={() => router.push(`/transaction/${tx.id}`)}
              />
            ))}
          </View>
        </Animated.View>
          </>
        )}
      </ScrollView>

      {/* Floating Money Assistant — visible across the screen. */}
      {!showLoadingSkeleton && <AskFab onPress={handleAsk} />}

      <SmsPermissionSheet
        visible={showSmsSheet}
        previouslyDenied={smsPreviouslyDenied}
        onConfirm={handleConfirmSmsRequest}
        onDismiss={() => setShowSmsSheet(false)}
      />
    </View>
  );
}

// ─── Loading skeleton ──────────────────────────────────────────────────────
const HomeLoadingSkeleton = memo(function HomeLoadingSkeleton({ colors }: { colors: any }) {
  return (
    <View style={{ gap: SPACING.l }}>
      <DashboardHeroSkeleton />
      <View
        style={[
          styles.chartCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Skeleton height={120} />
      </View>
      <View
        style={[
          styles.transactionList,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {[0, 1, 2].map((i) => (
          <TransactionRowSkeleton key={i} />
        ))}
      </View>
    </View>
  );
});

// ─── Empty / first-run state ─────────────────────────────────────────────
const HomeEmptyState = memo(function HomeEmptyState({
  colors,
  smsGranted,
  onConnectSms,
  onAddManual,
}: {
  colors: any;
  smsGranted: boolean;
  onConnectSms: () => void;
  onAddManual: () => void;
}) {
  // Two paths depending on whether SMS is already permitted:
  //   - Not granted → primary CTA is "Connect SMS" (the magic moment).
  //   - Granted but inbox empty → encourage manual add.
  if (!smsGranted) {
    return (
      <EmptyState
        title="Let's see your money"
        description="Connect SMS so FlowMoney can read bank alerts and turn them into a clear picture of your spending."
        actionLabel="Connect SMS"
        onAction={onConnectSms}
      />
    );
  }
  return (
    <EmptyState
      title="No transactions yet"
      description="Once a bank alert arrives, it will show up here. You can also add one manually."
      actionLabel="Add manually"
      onAction={onAddManual}
    />
  );
});

// ─── Sub-components ──────────────────────────────────────────────────────────

const SectionHeader = memo(function SectionHeader({
  title,
  colors,
  actionLabel,
  onAction,
}: {
  title: string;
  colors: any;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.sectionAction, { color: colors.accent }]}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
});

const MetricPill = memo(function MetricPill({
  label,
  value,
  change,
  colors,
}: {
  label: string;
  value: string;
  change?: number;
  colors: any;
}) {
  const isPositive = (change ?? 0) <= 0;
  const changeColor = isPositive ? colors.positive : colors.warning;

  return (
    <View style={styles.metricPill}>
      <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: colors.textPrimary }]} numberOfLines={1}>
        {value}
      </Text>
      {change !== undefined && Math.abs(change) > 1 && (
        <Text style={[styles.metricChange, { color: changeColor }]}>
          {getTrendLabel(change)}
        </Text>
      )}
    </View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  ambientGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: LAYOUT.screenHorizontalPadding,
    gap: SPACING.s,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.l,
  },
  headerLeft: { flex: 1 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    ...TYPOGRAPHY.labelS,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  greetingText: { ...TYPOGRAPHY.h1 },
  heroBlock: {
    gap: SPACING.m,
    marginBottom: SPACING.s,
  },
  heroLabel: {
    ...TYPOGRAPHY.labelS,
    textTransform: 'uppercase',
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.m,
  },
  heroAmount: {
    // Fixed size hero — never auto-shrunk. Use displayXL so 6–8 digit
    // amounts (Rs. 999,999) fit without competing with the SpendingRing.
    ...TYPOGRAPHY.displayXL,
    flex: 1,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.m,
    gap: SPACING.l,
  },
  pillDivider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
  },
  metricPill: { flex: 1, gap: 2 },
  metricLabel: {
    ...TYPOGRAPHY.labelS,
    textTransform: 'uppercase',
  },
  metricValue: { ...TYPOGRAPHY.monoL },
  metricChange: { ...TYPOGRAPHY.labelS, marginTop: 2 },
  chartCard: {
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.m,
    paddingBottom: SPACING.s,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.l,
    paddingBottom: SPACING.s,
  },
  sectionTitle: { ...TYPOGRAPHY.h2 },
  sectionAction: { ...TYPOGRAPHY.labelL },
  transactionList: {
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
