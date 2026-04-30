// app/transaction/[id].tsx
// Transaction detail — bottom sheet with amount as hero, category edit, source.

import { router, useLocalSearchParams } from 'expo-router';
import React, { memo, useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  RADIUS,
  SPACING,
  SPRING,
  TYPOGRAPHY,
} from '../../constants/design';
import { useColors } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useTransactions';
import { useT } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';
import { TransactionCategory } from '../../types/transaction';
import { formatCurrency } from '../../utils/analytics';

const ALL_CATEGORIES: TransactionCategory[] = [
  'food',
  'transport',
  'bills',
  'shopping',
  'entertainment',
  'health',
  'subscriptions',
  'transfer',
  'other',
];

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function TransactionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { light, success } = useHaptics();
  const { t, locale } = useT();

  const transaction = useAppStore((s) => s.transactions.find((t) => t.id === id));
  const setCategoryForTransaction = useAppStore((s) => s.setCategoryForTransaction);
  const toggleImportant = useAppStore((s) => s.toggleImportant);
  const deleteTransaction = useAppStore((s) => s.deleteTransaction);

  const [editingCategory, setEditingCategory] = useState(false);

  const handleClose = useCallback(() => router.back(), []);

  // Delete is gated on isManual: SMS transactions reflect a real bank
  // alert and would just reappear on the next backfill if deleted.
  const handleDelete = useCallback(() => {
    if (!transaction || !transaction.isManual) return;
    Alert.alert(
      t('transactionDetail.deleteTitle'),
      t('transactionDetail.deleteMessage', {
        amount: formatCurrency(transaction.amount),
        merchant: transaction.merchant,
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            success();
            deleteTransaction(transaction.id);
            router.back();
          },
        },
      ]
    );
  }, [transaction, deleteTransaction, success, t]);

  const handleCategorySelect = useCallback(
    (cat: TransactionCategory) => {
      if (!transaction) return;
      light();
      setCategoryForTransaction(transaction.id, cat);
      setEditingCategory(false);
    },
    [light, setCategoryForTransaction, transaction]
  );

  const handleToggleImportant = useCallback(() => {
    if (!transaction) return;
    success();
    toggleImportant(transaction.id);
  }, [success, toggleImportant, transaction]);

  if (!transaction) {
    return (
      <View style={[styles.scrim, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[styles.notFound, { color: colors.textSecondary }]}>
            {t('transactionDetail.notFound')}
          </Text>
        </View>
      </View>
    );
  }

  const catColor =
    (colors as any)[`category${capitalize(transaction.category)}`] ?? colors.accent;

  return (
    <View style={[styles.scrim, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

      <Animated.View
        entering={SlideInDown.springify()
          .damping(SPRING.settle.damping)
          .stiffness(SPRING.settle.stiffness)}
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            paddingBottom: insets.bottom + SPACING.m,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.textTertiary }]} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetContent}
        >
          {/* Hero amount */}
          <View style={styles.amountSection}>
            <View style={[styles.categoryBadge, { backgroundColor: catColor + '22' }]}>
              <Text style={[styles.categoryLabel, { color: catColor }]}>
                {t(`categories.${transaction.category}`)}
              </Text>
            </View>
            <Text
              style={[
                styles.amount,
                {
                  color:
                    transaction.type === 'credit'
                      ? colors.positive
                      : colors.textPrimary,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {transaction.type === 'credit' ? '+ ' : '− '}
              {formatCurrency(transaction.amount)}
            </Text>
            <Text style={[styles.merchant, { color: colors.textSecondary }]}>
              {transaction.merchant}
            </Text>
            <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
              {new Date(transaction.timestamp).toLocaleDateString(
                locale === 'ur' ? 'ur-PK' : locale === 'hi' ? 'hi-IN' : 'en-US',
                {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                }
              )}
            </Text>
          </View>

          {/* Source */}
          <View style={[styles.sourceRow, { borderTopColor: colors.divider }]}>
            <Text style={[styles.sourceLabel, { color: colors.textTertiary }]}>
              {t('transactionDetail.source')}
            </Text>
            <View
              style={[
                styles.sourceBadge,
                { backgroundColor: colors.backgroundSecondary },
              ]}
            >
              <Text style={[styles.sourceText, { color: colors.textSecondary }]}>
                {t(transaction.source === 'sms'
                  ? 'transactionDetail.sourceSms'
                  : 'transactionDetail.sourceManual')}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <ActionButton
              label={t(transaction.isImportant
                ? 'transactionDetail.removeBookmark'
                : 'transactionDetail.bookmark')}
              active={transaction.isImportant}
              colors={colors}
              onPress={handleToggleImportant}
            />
            <ActionButton
              label={t('transactionDetail.changeCategory')}
              active={editingCategory}
              colors={colors}
              onPress={() => {
                light();
                setEditingCategory((v) => !v);
              }}
            />
          </View>

          {editingCategory && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.categoryPicker}>
              {ALL_CATEGORIES.map((cat) => {
                const isSelected = cat === transaction.category;
                const cc =
                  (colors as any)[`category${capitalize(cat)}`] ?? colors.accent;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => handleCategorySelect(cat)}
                    style={[
                      styles.categoryOption,
                      {
                        backgroundColor: isSelected
                          ? cc + '22'
                          : colors.backgroundSecondary,
                        borderColor: isSelected ? cc : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        { color: isSelected ? cc : colors.textSecondary },
                      ]}
                    >
                      {t(`categories.${cat}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </Animated.View>
          )}

          {transaction.rawSms && (
            <View
              style={[
                styles.rawSms,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.rawSmsLabel, { color: colors.textTertiary }]}>
                {t('transactionDetail.originalAlert')}
              </Text>
              <Text style={[styles.rawSmsText, { color: colors.textSecondary }]}>
                {transaction.rawSms}
              </Text>
            </View>
          )}

          {/* Destructive actions live below the rest, separated by spacing
              and tinted with the danger color so they're clearly distinct
              from the routine edits above. Only manual entries — SMS-sourced
              transactions can't be deleted (they'd come back on next sync). */}
          {transaction.isManual && (
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [
                styles.deleteBtn,
                {
                  backgroundColor: colors.dangerSubtle,
                  borderColor: colors.danger + '40',
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('transactionDetail.deleteAccessibility')}
            >
              <Text style={[styles.deleteBtnText, { color: colors.danger }]}>
                {t('transactionDetail.deleteButton')}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const ActionButton = memo(function ActionButton({
  label,
  active,
  colors,
  onPress,
}: {
  label: string;
  active: boolean;
  colors: any;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        {
          backgroundColor: active ? colors.accentSubtle : colors.backgroundSecondary,
          borderColor: active ? colors.accent : colors.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.actionBtnText,
          { color: active ? colors.accent : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: RADIUS.xxxl,
    borderTopRightRadius: RADIUS.xxxl,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: SPACING.s,
    maxHeight: '90%',
  },
  sheetContent: {
    padding: SPACING.l,
    gap: SPACING.m,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    opacity: 0.3,
    marginVertical: SPACING.s,
  },
  amountSection: { alignItems: 'center', gap: SPACING.s },
  categoryBadge: {
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
  },
  categoryLabel: { ...TYPOGRAPHY.labelM },
  amount: { ...TYPOGRAPHY.displayL },
  merchant: { ...TYPOGRAPHY.h3 },
  timestamp: { ...TYPOGRAPHY.bodyS },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: SPACING.m,
  },
  sourceLabel: { ...TYPOGRAPHY.labelM },
  sourceBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.s,
  },
  sourceText: { ...TYPOGRAPHY.labelS },
  actions: { flexDirection: 'row', gap: SPACING.s },
  actionBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.m,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  actionBtnText: { ...TYPOGRAPHY.labelM },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.s,
  },
  categoryOption: {
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
  },
  categoryOptionText: { ...TYPOGRAPHY.labelM },
  rawSms: {
    borderRadius: RADIUS.m,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.m,
    gap: SPACING.xs,
  },
  rawSmsLabel: {
    ...TYPOGRAPHY.labelS,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  rawSmsText: { ...TYPOGRAPHY.bodyS, lineHeight: 18 },
  deleteBtn: {
    paddingVertical: SPACING.m,
    borderRadius: RADIUS.m,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    marginTop: SPACING.s,
  },
  deleteBtnText: { ...TYPOGRAPHY.labelL },
  notFound: {
    ...TYPOGRAPHY.bodyM,
    textAlign: 'center',
    padding: SPACING.xl,
  },
});
