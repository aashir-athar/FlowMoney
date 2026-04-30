// hooks/useTransactions.ts
import { useMemo } from 'react';
import { startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { useAppStore } from '../store/useAppStore';
import { Transaction } from '../types/transaction';

export function useTransactions() {
  const transactions = useAppStore((s) => s.transactions);
  const summary = useAppStore((s) => s.summary);

  const now = Date.now();
  const todayStart = startOfDay(new Date()).getTime();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).getTime();
  const monthStart = startOfMonth(new Date()).getTime();

  const todayTransactions = useMemo(
    () => transactions.filter((t) => t.timestamp >= todayStart),
    [transactions, todayStart]
  );

  const weekTransactions = useMemo(
    () => transactions.filter((t) => t.timestamp >= weekStart),
    [transactions, weekStart]
  );

  const monthTransactions = useMemo(
    () => transactions.filter((t) => t.timestamp >= monthStart),
    [transactions, monthStart]
  );

  const recentTransactions = useMemo(
    () => [...transactions].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50),
    [transactions]
  );

  return {
    all: transactions,
    today: todayTransactions,
    thisWeek: weekTransactions,
    thisMonth: monthTransactions,
    recent: recentTransactions,
    summary,
  };
}

// hooks/useHaptics.ts
import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Platform } from 'react-native';

export function useHaptics() {
  const light = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const medium = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, []);

  const heavy = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }, []);

  const success = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  const warning = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, []);

  const error = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, []);

  return { light, medium, heavy, success, warning, error };
}
