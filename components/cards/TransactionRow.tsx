// components/cards/TransactionRow.tsx
// Transaction row — the atom of the feed. Memoized, low-allocation, 60fps.

import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { RADIUS, SPACING, SPRING, TYPOGRAPHY } from '../../constants/design';
import { useColors } from '../../hooks/useTheme';
import { useT } from '../../i18n';
import { Transaction } from '../../types/transaction';
import { formatCurrency } from '../../utils/analytics';

interface TransactionRowProps {
  transaction: Transaction;
  isLast?: boolean;
  onPress?: () => void;
  containerStyle?: ViewStyle;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const TransactionRow = memo(function TransactionRow({
  transaction,
  isLast,
  onPress,
  containerStyle,
}: TransactionRowProps) {
  const colors = useColors();
  const { t } = useT();
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, SPRING.press);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING.press);
  }, [scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const categoryLabel = t(`categories.${transaction.category}`);
  const catColor =
    (colors as any)[`category${capitalize(transaction.category)}`] ?? colors.accent;

  const isCredit = transaction.type === 'credit';
  const amountColor = isCredit ? colors.positive : colors.textPrimary;
  const amountPrefix = isCredit ? '+' : '−';

  // Income rows get distinct treatment: a positive-tinted leaf badge with
  // an inbound arrow instead of the category dot, and a subtle accent on
  // the amount. Outflows stay quiet — color hierarchy mirrors the data.
  const iconBackground = isCredit ? colors.positiveSubtle : catColor + '14';

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.row,
          containerStyle,
          !isLast && {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.divider,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${transaction.merchant}, ${formatCurrency(transaction.amount)}`}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconBackground }]}>
          {isCredit ? (
            <Feather name="arrow-down-left" size={16} color={colors.positive} />
          ) : (
            <View style={[styles.iconDot, { backgroundColor: catColor }]} />
          )}
          {transaction.isImportant ? (
            <View style={[styles.importantBadge, { backgroundColor: colors.warning }]} />
          ) : null}
        </View>

        <View style={styles.details}>
          <Text style={[styles.merchant, { color: colors.textPrimary }]} numberOfLines={1}>
            {transaction.merchant}
          </Text>
          <Text
            style={[
              styles.meta,
              { color: isCredit ? colors.positive : colors.textTertiary },
            ]}
          >
            {isCredit ? t('common.income') : categoryLabel} · {format(new Date(transaction.timestamp), 'h:mm a')}
          </Text>
        </View>

        <Text style={[styles.amount, { color: amountColor }]}>
          {amountPrefix} {formatCurrency(transaction.amount)}
        </Text>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.sm + 2,
    gap: SPACING.m,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.m,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  importantBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  details: {
    flex: 1,
    gap: 2,
  },
  merchant: {
    ...TYPOGRAPHY.labelL,
  },
  meta: {
    ...TYPOGRAPHY.bodyS,
  },
  amount: {
    ...TYPOGRAPHY.monoM,
  },
});
