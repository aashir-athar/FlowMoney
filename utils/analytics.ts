// utils/analytics.ts
// Pure functions for spending analytics — no side effects, fully testable

import { format, startOfDay, startOfWeek, startOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { Transaction, CategoryBreakdown, SpendingSummary, TransactionCategory } from '../types/transaction';

/**
 * Compute the full spending summary from a transaction array.
 * This is the core analytics engine.
 */
export function computeSpendingSummary(transactions: Transaction[]): SpendingSummary {
  const now = new Date();
  const todayStart = startOfDay(now).getTime();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).getTime();
  const monthStart = startOfMonth(now).getTime();
  const lastMonthStart = startOfMonth(subMonths(now, 1)).getTime();
  const lastMonthEnd = monthStart - 1;

  const debits = transactions.filter((t) => t.type === 'debit');

  const today = sumTransactions(debits.filter((t) => t.timestamp >= todayStart));
  const thisWeek = sumTransactions(debits.filter((t) => t.timestamp >= weekStart));
  const thisMonth = sumTransactions(debits.filter((t) => t.timestamp >= monthStart));
  const lastMonth = sumTransactions(
    debits.filter((t) => t.timestamp >= lastMonthStart && t.timestamp <= lastMonthEnd)
  );

  // Last week for weekly change
  const lastWeekStart = weekStart - 7 * 86400000;
  const lastWeek = sumTransactions(
    debits.filter((t) => t.timestamp >= lastWeekStart && t.timestamp < weekStart)
  );

  const weeklyChange = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0;
  const monthlyChange = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

  // Category breakdown for this month
  const categoryBreakdown = computeCategoryBreakdown(
    debits.filter((t) => t.timestamp >= monthStart),
    thisMonth
  );

  // Daily average
  const daysIntoMonth = Math.max(1, now.getDate());
  const dailyAverageThisMonth = thisMonth / daysIntoMonth;

  return {
    today,
    thisWeek,
    thisMonth,
    lastMonth,
    weeklyChange,
    monthlyChange,
    categoryBreakdown,
    dailyAverageThisMonth,
  };
}

function sumTransactions(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

function computeCategoryBreakdown(
  transactions: Transaction[],
  total: number
): CategoryBreakdown[] {
  const categoryMap: Partial<Record<TransactionCategory, number>> = {};

  transactions.forEach((t) => {
    categoryMap[t.category] = (categoryMap[t.category] ?? 0) + t.amount;
  });

  return (Object.entries(categoryMap) as [TransactionCategory, number][])
    .map(([category, catTotal]) => ({
      category,
      total: catTotal,
      percentage: total > 0 ? (catTotal / total) * 100 : 0,
      count: transactions.filter((t) => t.category === category).length,
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Get last N days of daily spend for chart data
 */
export function getDailySpendForChart(
  transactions: Transaction[],
  days: number = 7
): { label: string; value: number }[] {
  const result: { label: string; value: number }[] = [];
  const now = Date.now();

  for (let i = days - 1; i >= 0; i--) {
    const dayStart = startOfDay(new Date(now - i * 86400000)).getTime();
    const dayEnd = dayStart + 86400000;
    const dayTotal = transactions
      .filter((t) => t.type === 'debit' && t.timestamp >= dayStart && t.timestamp < dayEnd)
      .reduce((sum, t) => sum + t.amount, 0);

    result.push({
      label: i === 0 ? 'Today' : format(new Date(dayStart), 'EEE'),
      value: dayTotal,
    });
  }

  return result;
}

/**
 * Compact, professional money/number scaling — used everywhere amounts
 * appear in the UI so the formatting stays consistent across screens.
 *
 *   1             → "1"
 *   100           → "100"
 *   999           → "999"
 *   1 000         → "1k"
 *   1 500         → "1.5k"
 *   10 000        → "10k"
 *   100 000       → "100k"
 *   1 000 000     → "1M"
 *   2 300 000     → "2.3M"
 *   1 000 000 000 → "1B"
 *
 * Each unit shows at most one decimal, with trailing ".0" dropped so whole
 * multiples render cleanly (10k, not 10.0k). Sub-thousand values keep up
 * to two decimals so derived figures like "thisMonth / daysIntoMonth"
 * don't leak float noise (16.6666 → 16.66, never 16.66666666666667).
 *
 * Negative values are formatted as the absolute magnitude prefixed with "−"
 * (a typographic minus, matching the TransactionRow convention) — callers
 * that need to add their own sign can pass Math.abs(...) and ignore the
 * prefix branch.
 */
function compactNumber(amount: number): string {
  if (amount < 0) return `−${compactNumber(-amount)}`;
  if (amount >= 1_000_000_000) return `${trimDecimals(amount / 1_000_000_000, 1)}B`;
  if (amount >= 1_000_000) return `${trimDecimals(amount / 1_000_000, 1)}M`;
  if (amount >= 1_000) return `${trimDecimals(amount / 1_000, 1)}k`;
  return trimDecimals(amount, 2);
}

/**
 * Money formatter — single source of truth for every "Rs. ___" string in
 * the app. Always emits the compact k/M/B scheme above; never falls back
 * to raw toLocaleString or the Pakistani lakh notation that we used in
 * earlier iterations.
 */
export function formatCurrency(amount: number, currency = 'Rs.'): string {
  return `${currency} ${compactNumber(amount)}`;
}

/** Same scheme as formatCurrency, without the currency prefix. */
export function formatCompact(amount: number): string {
  return compactNumber(amount);
}

// Round to `maxDecimals` then drop trailing zeros and any stray decimal point.
// e.g. 1.0 → "1", 1.50 → "1.5", 10.06 → "10.06".
function trimDecimals(n: number, maxDecimals: number): string {
  return Number(n.toFixed(maxDecimals)).toString();
}

/**
 * Get spending trend description
 */
export function getTrendLabel(change: number): string {
  if (Math.abs(change) < 2) return 'on track';
  if (change > 0) return `up ${Math.abs(change).toFixed(0)}%`;
  return `down ${Math.abs(change).toFixed(0)}%`;
}
