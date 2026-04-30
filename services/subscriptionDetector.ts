// services/subscriptionDetector.ts
// Detects recurring payment patterns from transaction history
// The "hidden power" feature that makes FlowMoney feel intelligent

import { Transaction } from '../types/transaction';
import { Subscription } from '../types/subscription';

const RECURRENCE_WINDOW_DAYS = 35; // Look for patterns within ~1 month
const MIN_OCCURRENCES = 2; // Need at least 2 to call it recurring

interface MerchantGroup {
  merchant: string;
  transactions: Transaction[];
  amounts: number[];
}

/**
 * Analyze transaction history and detect recurring subscriptions.
 * Groups by merchant + similar amounts, looks for monthly patterns.
 */
export function detectSubscriptions(transactions: Transaction[]): Subscription[] {
  const debits = transactions.filter((t) => t.type === 'debit');

  // Group transactions by normalized merchant name
  const groups = groupByMerchant(debits);
  const detected: Subscription[] = [];

  for (const group of groups) {
    if (group.transactions.length < MIN_OCCURRENCES) continue;

    // Check if amounts are consistent (within 5% variance)
    if (!hasConsistentAmount(group.amounts)) continue;

    // Check if timing is roughly periodic
    const intervalDays = detectInterval(group.transactions);
    if (!intervalDays) continue;

    const frequency = intervalToFrequency(intervalDays);
    if (!frequency) continue;

    const sorted = [...group.transactions].sort((a, b) => b.timestamp - a.timestamp);
    const lastTx = sorted[0];
    const avgAmount = average(group.amounts);

    // Determine if this subscription was used recently
    const recentlyUsed = isRecentlyActive(group.merchant, lastTx.timestamp);

    detected.push({
      id: `sub_detected_${group.merchant.replace(/\s+/g, '_').toLowerCase()}`,
      name: group.merchant,
      amount: Math.round(avgAmount),
      frequency,
      lastCharged: lastTx.timestamp,
      nextExpected: computeNextExpected(lastTx.timestamp, intervalDays),
      category: lastTx.category,
      isActive: true,
      recentlyUsed,
      transactionIds: group.transactions.map((t) => t.id),
    });
  }

  return detected;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function groupByMerchant(transactions: Transaction[]): MerchantGroup[] {
  const map: Map<string, Transaction[]> = new Map();

  transactions.forEach((tx) => {
    const key = normalizeMerchant(tx.merchant);
    const existing = map.get(key) ?? [];
    map.set(key, [...existing, tx]);
  });

  return Array.from(map.entries()).map(([merchant, txs]) => ({
    merchant: txs[0].merchant, // Use display name from first tx
    transactions: txs,
    amounts: txs.map((t) => t.amount),
  }));
}

function normalizeMerchant(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

function hasConsistentAmount(amounts: number[]): boolean {
  if (amounts.length < 2) return false;
  const avg = average(amounts);
  const maxDeviation = avg * 0.05; // 5% tolerance
  return amounts.every((a) => Math.abs(a - avg) <= maxDeviation);
}

/**
 * Returns the median interval in days between transactions,
 * or null if the pattern is not periodic enough.
 */
function detectInterval(transactions: Transaction[]): number | null {
  if (transactions.length < 2) return null;

  const sorted = [...transactions].sort((a, b) => a.timestamp - b.timestamp);
  const intervals: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const days = (sorted[i].timestamp - sorted[i - 1].timestamp) / 86400000;
    intervals.push(days);
  }

  const median = medianOf(intervals);

  // Acceptable ranges: weekly (5–9), biweekly (12–16), monthly (25–35)
  const isWeekly = median >= 5 && median <= 9;
  const isBiweekly = median >= 12 && median <= 16;
  const isMonthly = median >= 25 && median <= 35;
  const isYearly = median >= 340 && median <= 390;

  if (isWeekly) return 7;
  if (isBiweekly) return 14;
  if (isMonthly) return 30;
  if (isYearly) return 365;

  return null;
}

function intervalToFrequency(
  days: number
): Subscription['frequency'] | null {
  if (days === 7 || days === 14) return 'weekly';
  if (days === 30) return 'monthly';
  if (days === 365) return 'yearly';
  return null;
}

function computeNextExpected(lastTimestamp: number, intervalDays: number): number {
  return lastTimestamp + intervalDays * 86400000;
}

/**
 * A subscription is "recently active" if it was used
 * in a way that suggests the user is actually consuming the service.
 * For now: charged within the last 2 intervals.
 */
function isRecentlyActive(merchant: string, lastChargedTimestamp: number): boolean {
  const daysSinceCharge = (Date.now() - lastChargedTimestamp) / 86400000;
  // Heuristic: if charged within 15 days, assume active
  // In production: cross-reference app usage data
  return daysSinceCharge <= 15;
}

function average(nums: number[]): number {
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function medianOf(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}
