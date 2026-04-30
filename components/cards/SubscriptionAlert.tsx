// components/cards/SubscriptionAlert.tsx
// Quiet warning card for unused subscriptions. Generates the right kind of
// gentle financial tension — never alarming, always actionable. Memoized.

import { router } from 'expo-router';
import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants/design';
import { useHaptics } from '../../hooks/useTransactions';
import { useT } from '../../i18n';
import { Subscription } from '../../types/subscription';
import { formatCurrency } from '../../utils/analytics';

interface SubscriptionAlertProps {
  subscriptions: Subscription[];
  colors: any;
}

export const SubscriptionAlert = memo(function SubscriptionAlert({
  subscriptions,
  colors,
}: SubscriptionAlertProps) {
  const { light } = useHaptics();
  const { t } = useT();

  const handlePress = useCallback(() => {
    light();
    router.push('/(tabs)/insights');
  }, [light]);

  if (!subscriptions.length) return null;

  const totalWasted = subscriptions.reduce((sum, s) => sum + s.amount, 0);
  const count = subscriptions.length;
  // Use distinct singular/plural keys instead of inline string concatenation
  // — Urdu and Hindi don't add an "s" for plurals, so a one-key-fits-all
  // approach would render incorrectly.
  const isOne = count === 1;
  const titleKey = isOne ? 'subscriptionAlert.title' : 'subscriptionAlert.titlePlural';
  const bodyKey = isOne ? 'subscriptionAlert.bodyOne' : 'subscriptionAlert.bodyMany';

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.warning + '30',
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={[styles.accentLine, { backgroundColor: colors.warning }]} />

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t(titleKey, { count })}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t(bodyKey, { amount: formatCurrency(totalWasted) })}
        </Text>
      </View>

      <View style={styles.chevron}>
        <View style={[styles.chevronLine, styles.chevronTop, { backgroundColor: colors.textTertiary }]} />
        <View style={[styles.chevronLine, styles.chevronBottom, { backgroundColor: colors.textTertiary }]} />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: SPACING.s,
  },
  accentLine: {
    width: 3,
    alignSelf: 'stretch',
  },
  content: {
    flex: 1,
    padding: SPACING.m,
    gap: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY.labelL,
  },
  subtitle: {
    ...TYPOGRAPHY.bodyS,
    lineHeight: 18,
  },
  chevron: {
    paddingRight: SPACING.m,
    gap: 4,
  },
  chevronLine: {
    width: 8,
    height: 1.5,
    borderRadius: 1,
  },
  chevronTop: {
    transform: [{ rotate: '45deg' }, { translateY: 2 }],
  },
  chevronBottom: {
    transform: [{ rotate: '-45deg' }, { translateY: -2 }],
  },
});
