// app/add-transaction.tsx
// Manual transaction entry — modal sheet for when SMS parsing misses one.
//
// Design philosophy:
//   - The amount is the headline. Everything else is a footnote.
//   - Type toggle reads as Spent vs Received in human terms — never debit/credit.
//   - Category grid uses category color hints for instant recognition.

import { router } from 'expo-router';
import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  RADIUS,
  SPACING,
  SPRING,
  TYPOGRAPHY,
} from '../constants/design';
import { useColors } from '../hooks/useTheme';
import { useHaptics } from '../hooks/useTransactions';
import { useT } from '../i18n';
import { useAppStore } from '../store/useAppStore';
import { TransactionCategory, TransactionType } from '../types/transaction';

const ALL_CATEGORIES: TransactionCategory[] = [
  'food',
  'transport',
  'bills',
  'shopping',
  'entertainment',
  'health',
  'subscriptions',
  'other',
];

// Allow digits with at most one decimal separator and 2 decimal places.
// Up to 9 integer digits caps out at Rs. 999,999,999 — far beyond realistic
// single-transaction sizes while preventing overflow into Number imprecision.
const AMOUNT_PATTERN = /^\d{0,9}(\.\d{0,2})?$/;
const MAX_AMOUNT = 1_000_000_000;
const MAX_MERCHANT_LEN = 60;

interface ValidationState {
  amountErrorKey: string | null;
  merchantErrorKey: string | null;
  isValid: boolean;
}

// Validation returns translation keys (not strings) so the displayed
// message stays in sync with the active locale even after the user
// switches language while the modal is open.
function validate(amount: string, merchant: string): ValidationState {
  const trimmedMerchant = merchant.trim();
  let amountErrorKey: string | null = null;
  let merchantErrorKey: string | null = null;

  if (amount.length > 0) {
    const parsed = parseFloat(amount);
    if (Number.isNaN(parsed)) {
      amountErrorKey = 'addTransaction.errorEnterNumber';
    } else if (parsed <= 0) {
      amountErrorKey = 'addTransaction.errorMustBePositive';
    } else if (parsed >= MAX_AMOUNT) {
      amountErrorKey = 'addTransaction.errorTooLarge';
    }
  }

  if (merchant.length > 0 && trimmedMerchant.length === 0) {
    merchantErrorKey = 'addTransaction.errorAddMerchant';
  }

  const isValid =
    amount.length > 0 &&
    trimmedMerchant.length > 0 &&
    !amountErrorKey &&
    !merchantErrorKey;

  return { amountErrorKey, merchantErrorKey, isValid };
}

export default function AddTransactionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { light, success, error } = useHaptics();
  const { t } = useT();
  const addTransaction = useAppStore((s) => s.addTransaction);

  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState<TransactionCategory>('food');
  const [type, setType] = useState<TransactionType>('debit');
  const [touched, setTouched] = useState(false);

  const handleAmountChange = useCallback((next: string) => {
    // Normalize comma → dot for users with locale keyboards.
    const normalized = next.replace(',', '.');
    if (normalized === '' || AMOUNT_PATTERN.test(normalized)) {
      setAmount(normalized);
    }
  }, []);

  const validation = useMemo(() => validate(amount, merchant), [amount, merchant]);
  const { amountErrorKey, merchantErrorKey, isValid } = validation;

  // Show field-level errors only after the user has interacted with the form.
  const showAmountError = touched && !!amountErrorKey;
  const showMerchantError = touched && !!merchantErrorKey;

  // Resolve error keys to localised text at render time.
  const amountError = amountErrorKey ? t(amountErrorKey) : null;
  const merchantError = merchantErrorKey ? t(merchantErrorKey) : null;

  // Contextual hint shown beneath a blocked Save button.
  const blockedHint = useMemo(() => {
    if (isValid) return null;
    if (!amount && !merchant.trim()) return t('addTransaction.hintEnterBoth');
    if (!amount) return t('addTransaction.hintEnterAmount');
    if (amountError) return amountError;
    if (!merchant.trim()) return t('addTransaction.errorAddMerchant');
    if (merchantError) return merchantError;
    return null;
  }, [isValid, amount, merchant, amountError, merchantError, t]);

  const handleSubmit = useCallback(() => {
    if (!isValid) {
      setTouched(true);
      error();
      return;
    }
    success();
    addTransaction({
      id: `manual_${Date.now()}`,
      amount: parseFloat(amount),
      merchant: merchant.trim(),
      category,
      type,
      timestamp: Date.now(),
      isManual: true,
      isImportant: false,
      source: 'manual',
    });
    router.back();
  }, [amount, merchant, category, type, isValid, addTransaction, success, error]);

  return (
    <KeyboardAvoidingView
      // iOS: 'padding' lifts the entire sheet by exactly the keyboard height.
      // Android: the system already handles soft input with adjustResize, but
      // 'height' here gives us a deterministic resize that the sheet animation
      // doesn't fight with. 'padding' is wrong on Android — it double-counts.
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.scrim, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} />

      <View style={styles.sheetWrap} pointerEvents="box-none">
        <Animated.View
          entering={SlideInDown.springify().damping(SPRING.settle.damping).stiffness(SPRING.settle.stiffness)}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.textTertiary }]} />

          {/* Scrollable form: when the keyboard pops up, the lower fields
              (merchant, category grid, save) stay reachable instead of
              clipping behind it. keyboardShouldPersistTaps="handled" lets a
              tap on a chip / button work in one go — without it, the first
              tap only dismisses the keyboard. */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.sheetScrollContent,
              { paddingBottom: insets.bottom + SPACING.m },
            ]}
            bounces={false}
          >
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('addTransaction.title')}
          </Text>

          {/* Type toggle */}
          <View style={[styles.typeToggle, { backgroundColor: colors.backgroundSecondary }]}>
            {(['debit', 'credit'] as TransactionType[]).map((txType) => {
              const active = type === txType;
              const activeColor = txType === 'debit' ? colors.danger : colors.positive;
              return (
                <Pressable
                  key={txType}
                  onPress={() => {
                    light();
                    setType(txType);
                  }}
                  style={[
                    styles.typeOption,
                    active && { backgroundColor: activeColor },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeText,
                      { color: active ? '#fff' : colors.textTertiary },
                    ]}
                  >
                    {t(txType === 'debit' ? 'addTransaction.typeSpent' : 'addTransaction.typeReceived')}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Amount */}
          <View>
            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor: showAmountError ? colors.danger : colors.border,
                  backgroundColor: colors.backgroundSecondary,
                },
              ]}
            >
              <Text style={[styles.currencyPrefix, { color: colors.textTertiary }]}>
                Rs.
              </Text>
              <TextInput
                value={amount}
                onChangeText={handleAmountChange}
                onBlur={() => setTouched(true)}
                placeholder={t('addTransaction.amountPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
                inputMode="decimal"
                style={[styles.amountInput, { color: colors.textPrimary }]}
                maxLength={12}
                autoFocus
              />
            </View>
            {showAmountError && (
              <Animated.Text
                entering={FadeIn}
                style={[styles.fieldError, { color: colors.danger }]}
              >
                {amountError}
              </Animated.Text>
            )}
          </View>

          {/* Merchant */}
          <View>
            <TextInput
              value={merchant}
              onChangeText={setMerchant}
              onBlur={() => setTouched(true)}
              placeholder={t('addTransaction.merchantPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              maxLength={MAX_MERCHANT_LEN}
              style={[
                styles.merchantInput,
                {
                  color: colors.textPrimary,
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: showMerchantError ? colors.danger : colors.border,
                },
              ]}
              returnKeyType="done"
            />
            {showMerchantError && (
              <Animated.Text
                entering={FadeIn}
                style={[styles.fieldError, { color: colors.danger }]}
              >
                {merchantError}
              </Animated.Text>
            )}
          </View>

          {/* Category grid */}
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
            {t('addTransaction.categoryLabel')}
          </Text>
          <View style={styles.categoryGrid}>
            {ALL_CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat}
                cat={cat}
                label={t(`categories.${cat}`)}
                active={cat === category}
                onPress={(c) => {
                  light();
                  setCategory(c);
                }}
                colors={colors}
              />
            ))}
          </View>

          {/* Submit */}
          <View>
            <Pressable
              onPress={handleSubmit}
              // Tappable even when invalid so the user gets a clear error
              // explanation; the handler short-circuits and surfaces hints.
              style={({ pressed }) => [
                styles.submitBtn,
                {
                  backgroundColor: isValid ? colors.accent : colors.backgroundSecondary,
                  borderColor: isValid ? 'transparent' : colors.border,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}
              accessibilityState={{ disabled: !isValid }}
            >
              <Text
                style={[
                  styles.submitText,
                  { color: isValid ? '#fff' : colors.textTertiary },
                ]}
              >
                {t('addTransaction.save')}
              </Text>
            </Pressable>
            {!isValid && blockedHint && (
              <Text style={[styles.submitHint, { color: colors.textTertiary }]}>
                {blockedHint}
              </Text>
            )}
          </View>
          </ScrollView>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const CategoryChip = memo(function CategoryChip({
  cat,
  label,
  active,
  onPress,
  colors,
}: {
  cat: TransactionCategory;
  label: string;
  active: boolean;
  onPress: (c: TransactionCategory) => void;
  colors: any;
}) {
  const catColor =
    (colors as any)[`category${cat.charAt(0).toUpperCase()}${cat.slice(1)}`] ?? colors.accent;

  return (
    <Pressable
      onPress={() => onPress(cat)}
      style={[
        styles.categoryChip,
        {
          backgroundColor: active ? catColor + '22' : colors.backgroundSecondary,
          borderColor: active ? catColor : 'transparent',
        },
      ]}
    >
      <Text
        style={[
          styles.categoryChipText,
          { color: active ? catColor : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  // KeyboardAvoidingView itself fills the screen; sheetWrap pins the form to
  // the bottom of the available space. When the keyboard opens, KAV shrinks
  // its inner area and the sheet rides up with it.
  scrim: { flex: 1 },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    // Cap at 92% of available height so the dim scrim is always visible at
    // top — preserves the "modal sheet" affordance even with a tall form
    // and a keyboard. ScrollView inside owns the overflow.
    maxHeight: '92%',
    borderTopLeftRadius: RADIUS.xxxl,
    borderTopRightRadius: RADIUS.xxxl,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING.l,
    paddingTop: SPACING.l,
  },
  sheetScrollContent: {
    gap: SPACING.m,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.s,
    opacity: 0.3,
  },
  title: { ...TYPOGRAPHY.h2 },
  typeToggle: {
    flexDirection: 'row',
    borderRadius: RADIUS.l,
    padding: 4,
    gap: 4,
  },
  typeOption: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.m,
    alignItems: 'center',
  },
  typeText: { ...TYPOGRAPHY.labelL },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.l,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING.m,
    gap: SPACING.xs,
  },
  currencyPrefix: { ...TYPOGRAPHY.h2 },
  amountInput: {
    flex: 1,
    ...TYPOGRAPHY.displayM,
    paddingVertical: SPACING.m,
  },
  merchantInput: {
    borderRadius: RADIUS.l,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.m,
    ...TYPOGRAPHY.bodyL,
  },
  sectionLabel: {
    ...TYPOGRAPHY.labelS,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.s,
  },
  categoryChip: {
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
  },
  categoryChipText: { ...TYPOGRAPHY.labelM },
  submitBtn: {
    height: 56,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.s,
    borderWidth: StyleSheet.hairlineWidth,
  },
  submitText: { ...TYPOGRAPHY.h3 },
  submitHint: {
    ...TYPOGRAPHY.bodyS,
    textAlign: 'center',
    marginTop: SPACING.s,
  },
  fieldError: {
    ...TYPOGRAPHY.labelM,
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.s,
  },
});
