// services/insightEngine.ts
// Generates human-feeling, psychologically-aware spending insights.
//
// Every insight here must be data-grounded:
//   - The numbers in the description come from the user's actual transactions.
//   - No fabricated peer comparisons, no editorialised causes ("delivery fees"
//     when we only see a debit), no merchant-specific hardcoding.
//   - Patterns are gated on having enough data to be meaningful — a user
//     with five transactions should not see a "Spending up 80%" alert just
//     because last week happened to be one purchase.
//
// Why we emit kind+params instead of pre-formatted strings:
//   The previous version stored fully-rendered English titles/descriptions.
//   Switching the app to Urdu or Hindi would have left those frozen-in-time
//   strings unchanged. Now the engine emits structured payloads — the
//   InsightCard renders them via i18n keys (`insightEngine.<kind>.title` /
//   `.description`), so flipping language re-renders everything correctly.
//
// Adding a new pattern: add an InsightKind in types/insight.ts, define the
// corresponding `insightEngine.<kind>.title` / `.description` strings in
// every locale, then push a payload here.
//
// All currency formatting goes through formatCurrency so the global
// k/M/B scheme stays consistent.
//
// ─────────────────────────────────────────────────────────────────────────────

import { Insight, InsightKind, InsightSeverity } from '../types/insight';
import { SpendingSummary, Transaction, TransactionCategory } from '../types/transaction';
import { formatCurrency, getDailySpendForChart } from '../utils/analytics';

interface InsightTemplate {
  kind: InsightKind;
  params: Record<string, string | number>;
  severity: InsightSeverity;
  category?: string;
}

// Minimums below which we don't surface generated patterns.
const MIN_TRANSACTIONS_FOR_ANY_INSIGHT = 3;
const MIN_DAYS_OF_DATA_FOR_TRENDS = 10;
const DAY_MS = 86_400_000;

/**
 * Generate insights from current transaction data.
 * Returns a sorted list: highest severity first.
 */
export function generateInsights(
  transactions: Transaction[],
  summary: SpendingSummary
): Insight[] {
  const now = Date.now();
  const debits = transactions.filter((t) => t.type === 'debit');

  if (debits.length < MIN_TRANSACTIONS_FOR_ANY_INSIGHT) {
    return [];
  }

  const earliest =
    debits.length > 0 ? Math.min(...debits.map((t) => t.timestamp)) : now;
  const daysOfData = Math.floor((now - earliest) / DAY_MS);
  const hasTrendHistory = daysOfData >= MIN_DAYS_OF_DATA_FOR_TRENDS;

  const insights: InsightTemplate[] = [];

  // ── 1. Weekly change ────────────────────────────────────────────────
  if (hasTrendHistory && summary.weeklyChange > 20) {
    insights.push({
      kind: 'weeklyUp',
      params: {
        change: summary.weeklyChange.toFixed(0),
        daily: formatCurrency(summary.thisWeek / 7),
      },
      severity: 'warning',
    });
  } else if (hasTrendHistory && summary.weeklyChange < -15) {
    insights.push({
      kind: 'weeklyDown',
      params: { change: Math.abs(summary.weeklyChange).toFixed(0) },
      severity: 'positive',
    });
  }

  // ── 2. Category dominance ──────────────────────────────────────────
  const top = summary.categoryBreakdown[0];
  const runnerUp = summary.categoryBreakdown[1];
  if (top && top.percentage > 35) {
    const ratio = runnerUp ? top.total / Math.max(runnerUp.total, 1) : null;
    insights.push({
      kind: 'topCategory',
      params: {
        category: top.category,
        percent: top.percentage.toFixed(0),
        total: formatCurrency(top.total),
        // The card concatenates `tail` after `description`. When there's
        // no runner-up, `tail` is empty so the rendered sentence ends
        // cleanly at the period.
        tail:
          runnerUp && ratio
            ? renderTailToken({
                kind: 'topCategory',
                ratio: ratio.toFixed(1),
                runnerUp: runnerUp.category,
                runnerUpTotal: formatCurrency(runnerUp.total),
              })
            : '',
        ratio: ratio ? ratio.toFixed(1) : '',
        runnerUp: runnerUp?.category ?? '',
        runnerUpTotal: runnerUp ? formatCurrency(runnerUp.total) : '',
      },
      severity: top.percentage > 50 ? 'alert' : 'warning',
      category: top.category,
    });
  }

  // ── 3. Weekend pattern ─────────────────────────────────────────────
  const weekend = summarizeRange(debits, now - 7 * DAY_MS, now, isWeekend);
  const weekday = summarizeRange(debits, now - 7 * DAY_MS, now, isWeekday);
  if (weekend.dayCount >= 1 && weekday.dayCount >= 3 && weekday.daily > 0) {
    const weekendDaily = weekend.total / Math.max(weekend.dayCount, 1);
    const ratio = weekendDaily / weekday.daily;
    if (ratio > 1.5) {
      insights.push({
        kind: 'weekend',
        params: {
          percent: ((ratio - 1) * 100).toFixed(0),
          total: formatCurrency(weekend.total),
        },
        severity: 'neutral',
      });
    }
  }

  // ── 4. Late-night spending ─────────────────────────────────────────
  const lateNight = summarizeLateNight(debits, now - 30 * DAY_MS, now);
  const lateNightThreshold = Math.max(summary.dailyAverageThisMonth * 7, 1000);
  if (
    lateNight.total > lateNightThreshold &&
    lateNight.total > summary.thisMonth * 0.1
  ) {
    insights.push({
      kind: 'lateNight',
      params: {
        total: formatCurrency(lateNight.total),
        tail: lateNight.topCategory
          ? renderTailToken({
              kind: 'lateNight',
              category: lateNight.topCategory.category,
              percent: lateNight.topCategory.percentage.toFixed(0),
            })
          : '',
        category: lateNight.topCategory?.category ?? '',
        percent: lateNight.topCategory?.percentage.toFixed(0) ?? '',
      },
      severity: 'neutral',
    });
  }

  // ── 5. Frequent merchant ───────────────────────────────────────────
  const frequent = findFrequentMerchant(debits, now - 7 * DAY_MS, now, 4);
  if (frequent) {
    insights.push({
      kind: 'frequentMerchant',
      params: {
        count: frequent.count,
        merchant: frequent.merchant,
        total: formatCurrency(frequent.total),
        average: formatCurrency(frequent.total / frequent.count),
      },
      severity: 'neutral',
      category: frequent.category,
    });
  }

  // ── 6. Acceleration vs. baseline ───────────────────────────────────
  if (hasTrendHistory) {
    const last3 = avgPerDay(debits, now - 3 * DAY_MS, now);
    const baseline = avgPerDay(debits, now - 17 * DAY_MS, now - 3 * DAY_MS);
    if (last3 > 0 && baseline > 0 && last3 / baseline > 1.5) {
      insights.push({
        kind: 'accelerating',
        params: {
          recent: formatCurrency(last3),
          baseline: formatCurrency(baseline),
        },
        severity: 'warning',
      });
    }
  }

  // ── 7. Largest single transaction this week ────────────────────────
  const biggest = biggestThisWeek(debits, now);
  if (biggest && biggest.amount >= summary.dailyAverageThisMonth * 2) {
    insights.push({
      kind: 'biggestThisWeek',
      params: {
        amount: formatCurrency(biggest.amount),
        merchant: biggest.merchant,
        // The localized weekday name is built at render time so language
        // switching renders it correctly. We pass the raw timestamp.
        day: biggest.timestamp,
      },
      severity: 'neutral',
      category: biggest.category,
    });
  }

  // ── 8. Better month ────────────────────────────────────────────────
  if (hasTrendHistory && summary.monthlyChange < -10) {
    insights.push({
      kind: 'betterMonth',
      params: {
        change: Math.abs(summary.monthlyChange).toFixed(0),
        thisMonth: formatCurrency(summary.thisMonth),
        lastMonth: formatCurrency(summary.lastMonth),
      },
      severity: 'positive',
    });
  }

  return insights.map((template, i) => ({
    id: `gen_${now}_${i}`,
    ...template,
    createdAt: now,
    isRead: false,
    actionable: template.severity === 'warning' || template.severity === 'alert',
  }));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Renders a tail-fragment that the InsightCard will paste after the main
// description. Returning a sentinel here lets us keep the engine free of
// any t() calls — a stable string token the card resolves later. The
// special prefix avoids accidental collisions with real translation keys.
function renderTailToken(payload: { kind: InsightKind } & Record<string, string>): string {
  return `__tail__:${JSON.stringify(payload)}`;
}

export function decodeTailToken(
  raw: string
): ({ kind: InsightKind } & Record<string, string>) | null {
  if (!raw.startsWith('__tail__:')) return null;
  try {
    return JSON.parse(raw.slice('__tail__:'.length));
  } catch {
    return null;
  }
}

function isWeekend(t: Transaction): boolean {
  const day = new Date(t.timestamp).getDay();
  return day === 0 || day === 6;
}

function isWeekday(t: Transaction): boolean {
  const day = new Date(t.timestamp).getDay();
  return day >= 1 && day <= 5;
}

interface RangeSummary {
  total: number;
  count: number;
  dayCount: number;
  daily: number;
}

function summarizeRange(
  debits: Transaction[],
  fromMs: number,
  toMs: number,
  predicate: (t: Transaction) => boolean
): RangeSummary {
  const matched = debits.filter(
    (t) => t.timestamp >= fromMs && t.timestamp < toMs && predicate(t)
  );
  const total = matched.reduce((s, t) => s + t.amount, 0);
  const days = new Set(
    matched.map((t) => {
      const d = new Date(t.timestamp);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );
  const dayCount = days.size;
  return {
    total,
    count: matched.length,
    dayCount,
    daily: dayCount > 0 ? total / dayCount : 0,
  };
}

interface LateNightSummary {
  total: number;
  topCategory: { category: TransactionCategory; percentage: number } | null;
}

function summarizeLateNight(
  debits: Transaction[],
  fromMs: number,
  toMs: number
): LateNightSummary {
  const lateNight = debits.filter((t) => {
    if (t.timestamp < fromMs || t.timestamp >= toMs) return false;
    const hour = new Date(t.timestamp).getHours();
    return hour >= 21 || hour < 1;
  });
  const total = lateNight.reduce((s, t) => s + t.amount, 0);
  if (total === 0) return { total: 0, topCategory: null };

  const byCategory = new Map<TransactionCategory, number>();
  for (const t of lateNight) {
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount);
  }
  let topCat: TransactionCategory | null = null;
  let topAmount = 0;
  for (const [cat, amt] of byCategory) {
    if (amt > topAmount) {
      topCat = cat;
      topAmount = amt;
    }
  }
  const topPct = (topAmount / total) * 100;
  return {
    total,
    topCategory:
      topCat && topPct >= 40 ? { category: topCat, percentage: topPct } : null,
  };
}

interface FrequentMerchant {
  merchant: string;
  category: TransactionCategory;
  count: number;
  total: number;
}

function findFrequentMerchant(
  debits: Transaction[],
  fromMs: number,
  toMs: number,
  minCount: number
): FrequentMerchant | null {
  const map = new Map<string, FrequentMerchant>();
  for (const t of debits) {
    if (t.timestamp < fromMs || t.timestamp >= toMs) continue;
    const key = t.merchant.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.total += t.amount;
    } else {
      map.set(key, {
        merchant: t.merchant,
        category: t.category,
        count: 1,
        total: t.amount,
      });
    }
  }
  let best: FrequentMerchant | null = null;
  for (const m of map.values()) {
    if (m.count < minCount) continue;
    if (!best || m.total > best.total) best = m;
  }
  return best;
}

function avgPerDay(debits: Transaction[], fromMs: number, toMs: number): number {
  const window = debits.filter((t) => t.timestamp >= fromMs && t.timestamp < toMs);
  const total = window.reduce((s, t) => s + t.amount, 0);
  const days = Math.max(1, Math.round((toMs - fromMs) / DAY_MS));
  return total / days;
}

function biggestThisWeek(
  debits: Transaction[],
  nowMs: number
): Transaction | null {
  const since = nowMs - 7 * DAY_MS;
  let best: Transaction | null = null;
  for (const t of debits) {
    if (t.timestamp < since) continue;
    if (!best || t.amount > best.amount) best = t;
  }
  return best;
}

export { getDailySpendForChart };
