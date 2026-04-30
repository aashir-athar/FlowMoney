// app/(tabs)/feed.tsx
// Transaction Feed — chronological history with category filters.
//
// Design philosophy:
//   - Horizontal pill rail for filters (Fitts: easy thumb targets).
//   - Sticky day headers with day-total in mono — "Saturday · Rs. 4,210".
//   - List rows live inside a single grouped card per day for visual rhythm.
//
// Performance:
//   - SectionList with stable keyExtractor and renderItem (useCallback).
//   - removeClippedSubviews on Android for off-screen views.
//   - All sub-components memoized.

import { format, isToday, isYesterday, startOfDay } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { AskFab } from '../../components/ui/AskFab';
import {
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TransactionRow } from '../../components/cards/TransactionRow';
import { EmptyState } from '../../components/ui/EmptyState';
import { TransactionRowSkeleton } from '../../components/ui/Skeleton';
import {
  CATEGORY_META,
  LAYOUT,
  RADIUS,
  SPACING,
  TYPOGRAPHY,
} from '../../constants/design';
import { useColors } from '../../hooks/useTheme';
import { useHaptics, useTransactions } from '../../hooks/useTransactions';
import { useAppStore } from '../../store/useAppStore';
import { Transaction, TransactionCategory } from '../../types/transaction';
import { formatCurrency } from '../../utils/analytics';

const CATEGORIES: (TransactionCategory | 'all')[] = [
  'all',
  'food',
  'transport',
  'shopping',
  'bills',
  'entertainment',
  'subscriptions',
  'other',
];

function formatSectionTitle(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMMM d');
}

interface Section {
  title: string;
  total: number;
  data: Transaction[];
}

export default function FeedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { light } = useHaptics();
  const { recent } = useTransactions();
  const hasHydrated = useAppStore((s) => s.hasHydrated);

  const [activeFilter, setActiveFilter] = useState<TransactionCategory | 'all'>('all');

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return recent;
    return recent.filter((t) => t.category === activeFilter);
  }, [recent, activeFilter]);

  const sections: Section[] = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};

    for (const tx of filtered) {
      const dayKey = startOfDay(new Date(tx.timestamp)).toISOString();
      if (!groups[dayKey]) groups[dayKey] = [];
      groups[dayKey].push(tx);
    }

    return Object.entries(groups)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .map(([dateKey, data]) => ({
        title: formatSectionTitle(new Date(dateKey)),
        total: data.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0),
        data,
      }));
  }, [filtered]);

  const handleFilterSelect = useCallback(
    (cat: TransactionCategory | 'all') => {
      light();
      setActiveFilter(cat);
    },
    [light]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: Section }) => (
      <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionDate, { color: colors.textSecondary }]}>
          {section.title}
        </Text>
        {section.total > 0 && (
          <Text style={[styles.sectionTotal, { color: colors.textTertiary }]}>
            {formatCurrency(section.total)}
          </Text>
        )}
      </View>
    ),
    [colors]
  );

  const renderItem = useCallback(
    ({ item, index, section }: any) => (
      <TransactionRow
        transaction={item}
        isLast={index === section.data.length - 1}
        onPress={() => router.push(`/transaction/${item.id}`)}
        containerStyle={{ backgroundColor: colors.surface }}
      />
    ),
    [colors.surface]
  );

  const keyExtractor = useCallback((item: Transaction) => item.id, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View
        entering={FadeIn}
        style={[styles.header, { paddingTop: insets.top + SPACING.s }]}
      >
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
          Transactions
        </Text>
        <Text style={[styles.countLabel, { color: colors.textTertiary }]}>
          {recent.length} this month
        </Text>
      </Animated.View>

      {/* Filter pill rail with fade-out edges to hint at horizontal overflow. */}
      <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.filterRail}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {CATEGORIES.map((cat) => (
            <FilterChip
              key={cat}
              cat={cat}
              active={cat === activeFilter}
              onPress={handleFilterSelect}
              colors={colors}
            />
          ))}
        </ScrollView>
        <LinearGradient
          colors={[colors.background, colors.background + '00']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.fadeLeft}
          pointerEvents="none"
        />
        <LinearGradient
          colors={[colors.background + '00', colors.background]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.fadeRight}
          pointerEvents="none"
        />
      </Animated.View>

      {!hasHydrated ? (
        <View
          style={[
            styles.skeletonList,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              marginHorizontal: LAYOUT.screenHorizontalPadding,
            },
          ]}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <TransactionRowSkeleton key={i} />
          ))}
        </View>
      ) : (
        <>
        <SectionList
          sections={sections}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + LAYOUT.scrollBottomInset + SPACING.l },
          ]}
          SectionSeparatorComponent={SectionGap}
          removeClippedSubviews
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={9}
          ListEmptyComponent={
            <EmptyState
              title={activeFilter === 'all' ? 'No transactions yet' : 'Nothing in this category'}
              description={
                activeFilter === 'all'
                  ? 'Once a bank alert arrives or you add one manually, it will appear here.'
                  : 'Try a different filter, or add a transaction in this category from Home.'
              }
            />
          }
        />
        <AskFab onPress={() => router.push('/chat')} />
        </>
      )}
    </View>
  );
}

const SectionGap = memo(function SectionGap() {
  return <View style={{ height: SPACING.s }} />;
});

const FilterChip = memo(function FilterChip({
  cat,
  active,
  onPress,
  colors,
}: {
  cat: TransactionCategory | 'all';
  active: boolean;
  onPress: (c: TransactionCategory | 'all') => void;
  colors: any;
}) {
  const handle = useCallback(() => onPress(cat), [cat, onPress]);
  const label = cat === 'all' ? 'All' : CATEGORY_META[cat]?.label ?? cat;

  return (
    <Pressable
      onPress={handle}
      style={[
        styles.filterChip,
        {
          backgroundColor: active ? colors.accent : colors.surface,
          borderColor: active ? colors.accent : colors.border,
        },
      ]}
      hitSlop={4}
    >
      <Text
        style={[
          styles.filterChipText,
          { color: active ? '#fff' : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: LAYOUT.screenHorizontalPadding,
    paddingBottom: SPACING.m,
  },
  screenTitle: { ...TYPOGRAPHY.h1 },
  countLabel: { ...TYPOGRAPHY.bodyS, marginTop: 4 },
  filterRail: {
    position: 'relative',
  },
  filterContent: {
    paddingHorizontal: LAYOUT.screenHorizontalPadding,
    paddingBottom: SPACING.m,
    gap: SPACING.s,
  },
  fadeLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: SPACING.m,
    width: SPACING.l,
  },
  fadeRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: SPACING.m,
    width: SPACING.xl,
  },
  filterChip: {
    paddingHorizontal: SPACING.m,
    height: 32,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipText: { ...TYPOGRAPHY.labelM },
  listContent: {
    paddingHorizontal: LAYOUT.screenHorizontalPadding,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.s,
  },
  sectionDate: { ...TYPOGRAPHY.labelL },
  sectionTotal: { ...TYPOGRAPHY.monoS },
  skeletonList: {
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginTop: SPACING.s,
  },
});
