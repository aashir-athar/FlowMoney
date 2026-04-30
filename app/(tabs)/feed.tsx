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
  LAYOUT,
  RADIUS,
  SPACING,
  TYPOGRAPHY,
} from '../../constants/design';
import { useColors } from '../../hooks/useTheme';
import { useHaptics, useTransactions } from '../../hooks/useTransactions';
import { useT } from '../../i18n';
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

// Section header for the per-day group. Uses translation keys for the
// special-case "Today" / "Yesterday" labels and falls back to the active
// locale's date formatter for everything else, so Urdu/Hindi headers
// don't render in English.
function formatSectionTitle(
  date: Date,
  t: (key: string) => string,
  locale: 'en' | 'ur' | 'hi'
): string {
  if (isToday(date)) return t('common.today');
  if (isYesterday(date)) return t('common.yesterday');
  const tag = locale === 'ur' ? 'ur-PK' : locale === 'hi' ? 'hi-IN' : 'en-US';
  return date.toLocaleDateString(tag, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
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
  const { t, locale } = useT();

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
        title: formatSectionTitle(new Date(dateKey), t, locale),
        total: data.filter((tx) => tx.type === 'debit').reduce((s, tx) => s + tx.amount, 0),
        data,
      }));
  }, [filtered, t, locale]);

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
    ({ item, index, section }: any) => {
      // Each section renders as a rounded card matching the Home recent-list
      // (`RADIUS.xl` + hairline border on `colors.border`). The first row
      // gets the rounded top corners + top border, the last row gets the
      // rounded bottom corners + bottom border. Middle rows just carry the
      // left/right hairlines — `TransactionRow` already draws its own
      // divider on the bottom for non-last rows.
      const isFirst = index === 0;
      const isLast = index === section.data.length - 1;
      return (
        <TransactionRow
          transaction={item}
          isLast={isLast}
          onPress={() => router.push(`/transaction/${item.id}`)}
          containerStyle={{
            backgroundColor: colors.surface,
            borderLeftWidth: StyleSheet.hairlineWidth,
            borderRightWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
            ...(isFirst && {
              borderTopLeftRadius: RADIUS.xl,
              borderTopRightRadius: RADIUS.xl,
              borderTopWidth: StyleSheet.hairlineWidth,
            }),
            ...(isLast && {
              borderBottomLeftRadius: RADIUS.xl,
              borderBottomRightRadius: RADIUS.xl,
              borderBottomWidth: StyleSheet.hairlineWidth,
            }),
          }}
        />
      );
    },
    [colors.surface, colors.border]
  );

  const keyExtractor = useCallback((item: Transaction) => item.id, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View
        entering={FadeIn}
        style={[styles.header, { paddingTop: insets.top + SPACING.s }]}
      >
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
          {t('feed.title')}
        </Text>
        <Text style={[styles.countLabel, { color: colors.textTertiary }]}>
          {t('feed.countThisMonth', { count: recent.length })}
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
              label={cat === 'all' ? t('feed.filters.all') : t(`categories.${cat}`)}
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
              title={t(
                activeFilter === 'all' ? 'feed.emptyAll.title' : 'feed.emptyFiltered.title'
              )}
              description={t(
                activeFilter === 'all'
                  ? 'feed.emptyAll.description'
                  : 'feed.emptyFiltered.description'
              )}
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
  label,
  active,
  onPress,
  colors,
}: {
  cat: TransactionCategory | 'all';
  label: string;
  active: boolean;
  onPress: (c: TransactionCategory | 'all') => void;
  colors: any;
}) {
  const handle = useCallback(() => onPress(cat), [cat, onPress]);

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
