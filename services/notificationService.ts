// services/notificationService.ts
// Intelligent notification scheduling — the "addiction engine"
// Fires the right message at the right emotional moment

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
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
 * Request notification permissions.
 * Returns the granted Expo push token or null.
 */
export async function requestNotificationPermissions(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('flowmoney', {
      name: 'FlowMoney',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 150, 100, 150],
      lightColor: '#7B68EE',
    });
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
}

// ─── Notification Types ───────────────────────────────────────────────────────

/**
 * Fire immediately when a transaction is detected via SMS.
 * Creates real-time spending awareness.
 */
export async function notifyTransactionDetected(tx: Transaction): Promise<void> {
  if (tx.type === 'credit') return; // Don't notify on credits — no tension needed

  const params = { amount: formatCurrency(tx.amount), merchant: tx.merchant };
  // Cycle through a few phrasings so consecutive notifications don't read
  // identically. All three keys take the same params shape.
  const keys = [
    'notifications.spentShort',
    'notifications.spent',
    'notifications.spentDash',
  ];
  const body = t(keys[Math.floor(Math.random() * keys.length)], params);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: t('notifications.spentShort', params),
      body,
      data: { type: 'realtime', transactionId: tx.id },
    },
    trigger: null, // Immediate
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
