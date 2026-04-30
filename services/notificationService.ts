// services/notificationService.ts
// Intelligent notification scheduling — the "addiction engine"
// Fires the right message at the right emotional moment

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { t } from '../i18n';
import { Transaction, SpendingSummary } from '../types/transaction';
import { formatCurrency } from '../utils/analytics';

// ─── Setup ───────────────────────────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Request OS permission to show local notifications. Returns `true` iff the
 * user granted (or had already granted) permission.
 *
 * This intentionally does NOT fetch an Expo push token — the app schedules
 * every notification locally via `scheduleNotificationAsync`, so a remote
 * push token is never used. Coupling permission grant to token retrieval
 * caused the Profile toggle to silently flip off on builds without FCM
 * credentials configured server-side (the token call would throw, the
 * function would return null, and the caller would interpret that as denial).
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return false;

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('flowmoney', {
        name: 'FlowMoney',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 150, 100, 150],
        lightColor: '#7B68EE',
      });
    } catch (err) {
      // Channel creation almost never fails in practice, but if it does
      // (e.g., OEM-modified Android), local notifications still work — they
      // just land on the OS-default channel. Log and carry on.
      console.warn('[Notifications] Failed to create notification channel:', err);
    }
  }

  return true;
}

// ─── Notification Types ───────────────────────────────────────────────────────

/**
 * Fire a local notification for a newly-ingested transaction. Both debits
 * and credits are surfaced — every transaction is a moment of awareness.
 *
 * Callers are responsible for gating on `notificationsEnabled` and on the
 * store's dedup signal (`addTransaction` / `addTransactions` return what
 * was actually added). This function trusts that and does not re-check.
 */
export async function notifyTransactionDetected(tx: Transaction): Promise<void> {
  const isCredit = tx.type === 'credit';
  const params = { amount: formatCurrency(tx.amount), merchant: tx.merchant };

  // Title is the short variant so the lock-screen line stays scannable.
  // Body cycles between three phrasings so consecutive notifications don't
  // read identically. Credits and debits share the same shape, just
  // different copy keys.
  const titleKey = isCredit
    ? 'notifications.receivedShort'
    : 'notifications.spentShort';
  const bodyKeys = isCredit
    ? [
        'notifications.receivedShort',
        'notifications.received',
        'notifications.receivedDash',
      ]
    : [
        'notifications.spentShort',
        'notifications.spent',
        'notifications.spentDash',
      ];
  const body = t(bodyKeys[Math.floor(Math.random() * bodyKeys.length)], params);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: t(titleKey, params),
      body,
      data: { type: 'realtime', transactionId: tx.id, txType: tx.type },
    },
    trigger: null,
  });
}

/**
 * Warn when daily spend is tracking above usual.
 */
export async function notifyHighDailySpend(
  todaySpend: number,
  dailyAverage: number
): Promise<void> {
  const overage = ((todaySpend - dailyAverage) / dailyAverage) * 100;
  if (overage < 30) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: t('notifications.overAverageTitle'),
      body: t('notifications.overAverageBody', {
        percent: overage.toFixed(0),
        amount: formatCurrency(todaySpend),
      }),
      data: { type: 'behavior_alert' },
    },
    trigger: null,
  });
}

/**
 * Weekly Sunday evening digest — creates the weekly review habit loop.
 */
export async function scheduleWeeklyReport(thisWeekTotal: number): Promise<void> {
  // Cancel previous weekly notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  const nextSunday = getNextSunday(20, 0); // 8:00 PM Sunday

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Your week in review',
      body: `You spent ${formatCurrency(thisWeekTotal)} this week. Tap to see the full breakdown.`,
      data: { type: 'weekly_report' },
    },
    trigger: {
      date: nextSunday,
      channelId: 'flowmoney',
    },
  });
}

/**
 * Gentle nudge when approaching the weekly spending limit.
 */
export async function notifyApproachingLimit(
  currentSpend: number,
  weeklyLimit: number
): Promise<void> {
  const remaining = weeklyLimit - currentSpend;
  const percentage = (currentSpend / weeklyLimit) * 100;

  if (percentage < 75 || percentage >= 100) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Getting close',
      body: `${formatCurrency(remaining)} left in your weekly range. Slow down and you will stay on track.`,
      data: { type: 'gentle_nudge' },
    },
    trigger: null,
  });
}

/**
 * Pattern insight — fire once per week based on detected habit.
 * These are the "this app knows me" moments.
 */
export async function notifyPatternInsight(
  title: string,
  body: string
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { type: 'pattern_insight' },
    },
    trigger: null,
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getNextSunday(hour: number, minute: number): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilSunday = (7 - dayOfWeek) % 7 || 7;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + daysUntilSunday);
  sunday.setHours(hour, minute, 0, 0);
  return sunday;
}
