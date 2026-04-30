// app/(tabs)/insights.tsx
// Insights — the "this app gets me" screen.
//
// Design philosophy:
//   - Hero metric: total this month with delta vs last month. One number, one truth.
//   - Category breakdown as visual bars, animated in on mount.
//   - Subscription tracker with status dots — calm, scannable.
//   - Pattern cards (insights) sit at the bottom — long-form reading material.

import { router } from 'expo-router';
import React, { memo, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InsightCard } from '../../components/cards/InsightCard';
import { AskFab } from '../../components/ui/AskFab';
import { CategoryBar } from '../../components/charts/CategoryBar';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  CATEGORY_META,
  LAYOUT,
  RADIUS,
  SPACING,
  TYPOGRAPHY,
} from '../../constants/design';
import { useColors } from '../../hooks/useTheme';
import { useTransactions } from '../../hooks/useTransactions';
import { useAppStore } from '../../store/useAppStore';
import { Subscription } from '../../types/subscription';
import { formatCurrency, getTrendLabel } from '../../utils/analytics';

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function InsightsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const insights = useAppStore((s) => s.insights);
  const subscriptions = useAppStore((s) => s.subscriptions);
  const transactions = useAppStore((s) => s.transactions);
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const { summary } = useTransactions();

  const totalSubscriptionCost = useMemo(
    () => subscriptions.filter((s) => s.isActive).reduce((t, s) => t + s.amount, 0),
    [subscriptions]
  );

  const unusedCount = useMemo(
    () => subscriptions.filter((s) => s.isActive && !s.recentlyUsed).length,
    [subscriptions]
  );

  const monthlyChange = summary?.monthlyChange ?? 0;
  const trendingDown = monthlyChange <= 0;

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
        {/* Header */}
        <Animated.View entering={FadeIn} style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Insights</Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
            What your spending reveals
          </Text>
        </Animated.View>

        {!hasHydrated ? (
          <View style={{ gap: SPACING.l }}>
            <Skeleton width={140} height={14} />
            <Skeleton height={56} borderRadius={RADIUS.l} />
            <View style={{ gap: SPACING.s, marginTop: SPACING.l }}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height={36} borderRadius={RADIUS.m} />
              ))}
            </View>
          </View>
        ) : transactions.length === 0 ? (
          <EmptyState
            title="No insights yet"
            description="As your transactions come in, FlowMoney will start surfacing patterns and unused subscriptions here."
          />
        ) : (
          <>
        {/* Hero — total this month */}
        <Animated.View entering={FadeInDown.delay(50).springify().damping(20)}>
          <Text style={[styles.heroLabel, { color: colors.textTertiary }]}>
            This month
          </Text>
          <Text
            style={[styles.heroAmount, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {formatCurrency(summary?.thisMonth ?? 0)}
          </Text>
          {Math.abs(monthlyChange) > 1 && (
            <Text
              style={[
                styles.heroChange,
                { color: trendingDown ? colors.positive : colors.warning },
              ]}
            >
              {getTrendLabel(monthlyChange)} vs last month
            </Text>
          )}
        </Animated.View>

        {/* Category breakdown */}
        {summary && summary.categoryBreakdown.length > 0 && (
          <Animated.View entering={FadeInDown.delay(120).springify().damping(20)}>
            <SectionLabel title="Where it goes" colors={colors} />
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.categoryList}>
                {summary.categoryBreakdown.slice(0, 6).map((cat, i) => {
                  const meta = CATEGORY_META[cat.category] ?? CATEGORY_META.other;
                  const catColor =
                    (colors as any)[`category${capitalize(cat.category)}`] ??
                    colors.accent;
                  return (
                    <CategoryBar
                      key={cat.category}
                      label={meta.label}
                      amount={cat.total}
                      percentage={cat.percentage}
                      color={catColor}
                      colors={colors}
                      delay={i * 60}
                    />
                  );
                })}
              </View>
            </View>
          </Animated.View>
        )}

        {/* Subscriptions */}
        <Animated.View entering={FadeInDown.delay(200).springify().damping(20)}>
          <SectionLabel title="Subscriptions" colors={colors} />
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.subSummaryRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.subTotal, { color: colors.textPrimary }]}>
                  {formatCurrency(totalSubscriptionCost)}
                  <Text style={[styles.subPeriod, { color: colors.textTertiary }]}>
                    {' '}
                    /month
                  </Text>
                </Text>
                {unusedCount > 0 && (
                  <Text style={[styles.subWarning, { color: colors.warning }]}>
                    {unusedCount} sitting unused
                  </Text>
                )}
              </View>
              <View style={[styles.subCountBadge, { backgroundColor: colors.accentSubtle }]}>
                <Text style={[styles.subCountText, { color: colors.accent }]}>
                  {subscriptions.filter((s) => s.isActive).length}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {subscriptions.map((sub, i) => (
              <SubscriptionRow
                key={sub.id}
                sub={sub}
                isLast={i === subscriptions.length - 1}
                colors={colors}
              />
            ))}
          </View>
        </Animated.View>

        {/* Pattern cards */}
        {insights.length > 0 && (
          <Animated.View entering={FadeInDown.delay(280).springify().damping(20)}>
            <SectionLabel title="Patterns" colors={colors} />
            {insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </Animated.View>
        )}

        {/* Quick stats */}
        {summary && (
          <Animated.View entering={FadeInDown.delay(340).springify().damping(20)}>
            <SectionLabel title="Quick stats" colors={colors} />
            <View style={styles.statsGrid}>
              <StatCard
                label="Daily average"
                value={formatCurrency(summary.dailyAverageThisMonth)}
                colors={colors}
              />
              <StatCard
                label="vs last month"
                value={`${monthlyChange > 0 ? '+' : ''}${monthlyChange.toFixed(0)}%`}
                valueColor={trendingDown ? colors.positive : colors.warning}
                colors={colors}
              />
            </View>
          </Animated.View>
        )}
          </>
        )}
      </ScrollView>
      {hasHydrated && transactions.length > 0 && (
        <AskFab onPress={() => router.push('/chat')} />
      )}
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const SectionLabel = memo(function SectionLabel({
  title,
  colors,
}: {
  title: string;
  colors: any;
}) {
  return (
    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{title}</Text>
  );
});

const SubscriptionRow = memo(function SubscriptionRow({
  sub,
  isLast,
  colors,
}: {
  sub: Subscription;
  isLast: boolean;
  colors: any;
}) {
  return (
    <View
      style={[
        styles.subRow,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.divider,
        },
      ]}
    >
      <View
        style={[
          styles.subIcon,
          {
            // "Unused" is a nudge, not an alarm — warning amber reads
            // calmer than danger red at this scale.
            backgroundColor: sub.recentlyUsed
              ? colors.positiveSubtle
              : colors.warningSubtle,
          },
        ]}
      >
        <View
          style={[
            styles.subIconDot,
            { backgroundColor: sub.recentlyUsed ? colors.positive : colors.warning },
          ]}
        />
      </View>
      <View style={styles.subInfo}>
        <Text style={[styles.subName, { color: colors.textPrimary }]}>{sub.name}</Text>
        <Text
          style={[
            styles.subStatus,
            { color: sub.recentlyUsed ? colors.textTertiary : colors.warning },
          ]}
        >
          {sub.recentlyUsed ? 'Active' : 'Not used recently'}
        </Text>
      </View>
      <Text style={[styles.subAmount, { color: colors.textPrimary }]}>
        {formatCurrency(sub.amount)}
      </Text>
    </View>
  );
});

const StatCard = memo(function StatCard({
  label,
  value,
  valueColor,
  colors,
}: {
  label: string;
  value: string;
  valueColor?: string;
  colors: any;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: valueColor ?? colors.textPrimary }]}>
        {value}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: LAYOUT.screenHorizontalPadding,
  },
  header: {
    marginBottom: SPACING.l,
  },
  title: { ...TYPOGRAPHY.h1 },
  subtitle: { ...TYPOGRAPHY.bodyS, marginTop: 4 },
  heroLabel: {
    ...TYPOGRAPHY.labelS,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroAmount: {
    ...TYPOGRAPHY.displayXL,
  },
  heroChange: {
    ...TYPOGRAPHY.labelL,
    marginTop: 6,
  },
  sectionLabel: {
    ...TYPOGRAPHY.labelS,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: SPACING.l,
    marginBottom: SPACING.s,
  },
  card: {
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.l,
    gap: SPACING.m,
  },
  categoryList: { gap: SPACING.sm },
  subSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subTotal: { ...TYPOGRAPHY.h2 },
  subPeriod: { ...TYPOGRAPHY.bodyM },
  subWarning: { ...TYPOGRAPHY.labelS, marginTop: 4 },
  subCountBadge: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subCountText: { ...TYPOGRAPHY.h2 },
  divider: { height: StyleSheet.hairlineWidth },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.m,
  },
  subIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subIconDot: { width: 8, height: 8, borderRadius: 4 },
  subInfo: { flex: 1, gap: 2 },
  subName: { ...TYPOGRAPHY.labelL },
  subStatus: { ...TYPOGRAPHY.bodyS },
  subAmount: { ...TYPOGRAPHY.monoM },
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.m,
  },
  statCard: {
    flex: 1,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.m,
    gap: SPACING.xs,
  },
  statLabel: {
    ...TYPOGRAPHY.labelS,
    textTransform: 'uppercase',
  },
  statValue: { ...TYPOGRAPHY.h2 },
});
