// components/cards/SubscriptionAlert.tsx
// Quiet warning card for unused subscriptions. Generates the right kind of
// gentle financial tension — never alarming, always actionable. Memoized.

import { router } from 'expo-router';
import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants/design';
import { useHaptics } from '../../hooks/useTransactions';
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

  const handlePress = useCallback(() => {
    light();
    router.push('/(tabs)/insights');
  }, [light]);

  if (!subscriptions.length) return null;

  const totalWasted = subscriptions.reduce((t, s) => t + s.amount, 0);
  const count = subscriptions.length;

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
          {count} subscription{count > 1 ? 's' : ''} sitting unused
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {formatCurrency(totalWasted)}/month for {count === 1 ? 'a service' : 'services'} you have not opened recently.
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
