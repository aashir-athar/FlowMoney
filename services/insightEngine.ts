// services/insightEngine.ts
// Generates human-feeling, psychologically-aware spending insights.
//
// Every insight here must be data-grounded:
//   - The numbers in the description come from the user's actual transactions.
//   - No fabricated peer comparisons, no editorialized causes ("delivery fees"
//     when we only see a debit), no merchant-specific hardcoding.
//   - Patterns are gated on having enough data to be meaningful — a user
//     with five transactions should not see a "Spending up 80%" alert just
//     because last week happened to be one purchase.
//
// Adding a new pattern: write a small function that returns an
// InsightTemplate or null, then push the result into `insights` below.
// Keep the description literal — only state what the data shows.
//
// All currency formatting goes through formatCurrency so the global
// k/M/B scheme stays consistent.
//
// ─────────────────────────────────────────────────────────────────────────────

import { Transaction, SpendingSummary, TransactionCategory } from '../types/transaction';
import { Insight, InsightSeverity } from '../types/insight';
import { formatCurrency, getDailySpendForChart } from '../utils/analytics';

type InsightTemplate = {
  title: string;
  description: string;
  severity: InsightSeverity;
  category?: string;
};

// Floors that gate per-insight visibility, not the whole screen. The previous
// global gate at 8 transactions / 14 days was hiding everything for new users
// — better to show the patterns that ARE statistically grounded (frequent
// merchant, biggest spend, category dominance) and only hide the ones that
// genuinely need a longer history (week-over-week, month-over-month, baseline
// acceleration).
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

  // Don't surface anything until there are at least a few data points.
  // Below this, even "biggest spend this week" is just "the only spend".
  if (debits.length < MIN_TRANSACTIONS_FOR_ANY_INSIGHT) {
    return [];
  }

  const earliest = debits.length > 0 ? Math.min(...debits.map((t) => t.timestamp)) : now;
  const daysOfData = Math.floor((now - earliest) / DAY_MS);
  // Trend insights (week-over-week, month-over-month, acceleration) need a
  // genuine history baseline. Single-snapshot insights (top category, biggest
  // spend, frequent merchant) don't and should appear from day 1.
  const hasTrendHistory = daysOfData >= MIN_DAYS_OF_DATA_FOR_TRENDS;

  const insights: InsightTemplate[] = [];

  // ── 1. Weekly change ────────────────────────────────────────────────
  // Requires a real "last week" baseline (summary.weeklyChange is 0 when
  // lastWeek is empty, so the threshold checks already filter that out).
  if (hasTrendHistory && summary.weeklyChange > 20) {
    insights.push({
      title: `Spending up ${summary.weeklyChange.toFixed(0)}% this week`,
      description: `You're tracking at ${formatCurrency(
        summary.thisWeek / 7
      )} per day, ahead of last week's pace at the same point.`,
      severity: 'warning',
    });
  } else if (hasTrendHistory && summary.weeklyChange < -15) {
    insights.push({
      title: 'You are doing better this week',
      description: `Your spending is ${Math.abs(
        summary.weeklyChange
      ).toFixed(0)}% lower than last week so far. Keep this up.`,
      severity: 'positive',
    });
  }

  // ── 2. Category dominance ──────────────────────────────────────────
  // Drops the prior "higher than most people in your range" — that was a
  // fabricated peer comparison. Now grounds the description in the runner-up
  // category, which actually exists in the data.
  const top = summary.categoryBreakdown[0];
  const runnerUp = summary.categoryBreakdown[1];
  if (top && top.percentage > 35) {
    const ratio = runnerUp ? top.total / Math.max(runnerUp.total, 1) : null;
    const tail =
      runnerUp && ratio
        ? ` That's ${ratio.toFixed(1)}× your next category, ${runnerUp.category} (${formatCurrency(runnerUp.total)}).`
        : '';
    insights.push({
      title: `${capitalize(top.category)} is your biggest expense`,
      description: `${capitalize(top.category)} is ${top.percentage.toFixed(
        0
      )}% of this month — ${formatCurrency(top.total)}.${tail}`,
      severity: top.percentage > 50 ? 'alert' : 'warning',
      category: top.category,
    });
  }

  // ── 3. Weekend pattern ─────────────────────────────────────────────
  // Require at least one full weekend day AND meaningful weekday activity
  // before claiming a weekend pattern.
  const weekend = summarizeRange(debits, now - 7 * DAY_MS, now, isWeekend);
  const weekday = summarizeRange(debits, now - 7 * DAY_MS, now, isWeekday);
  if (weekend.dayCount >= 1 && weekday.dayCount >= 3 && weekday.daily > 0) {
    const weekendDaily = weekend.total / Math.max(weekend.dayCount, 1);
    const ratio = weekendDaily / weekday.daily;
    if (ratio > 1.5) {
      insights.push({
        title: 'Your weekends cost more',
        description: `Weekend days run ${((ratio - 1) * 100).toFixed(
          0
        )}% above weekdays. Last weekend totaled ${formatCurrency(weekend.total)}.`,
        severity: 'neutral',
      });
    }
  }

  // ── 4. Late-night spending ─────────────────────────────────────────
  // Threshold scales with the user's daily average — Rs. 2,000 is loud for
  // a low-spender and trivial for a high-spender. Also names the actual
  // top late-night category instead of guessing "food orders".
  const lateNight = summarizeLateNight(debits, now - 30 * DAY_MS, now);
  const lateNightThreshold = Math.max(
    summary.dailyAverageThisMonth * 7,
    1000 // floor so a very-low-spender still sees the pattern
  );
  if (
    lateNight.total > lateNightThreshold &&
    lateNight.total > summary.thisMonth * 0.1 // >10% of month
  ) {
    const tail = lateNight.topCategory
      ? ` Most of it lands in ${lateNight.topCategory.category} (${lateNight.topCategory.percentage.toFixed(
          0
        )}%).`
      : '';
    insights.push({
      title: 'Late-night spending stands out',
      description: `${formatCurrency(
        lateNight.total
      )} of your last 30 days happened between 9 PM and midnight.${tail}`,
      severity: 'neutral',
    });
  }

  // ── 5. Frequent merchant ───────────────────────────────────────────
  // Generalized from the previous Foodpanda-only check. Detects any
  // merchant transacted with 4+ times in the last week and reports the
  // user's *actual* total with that merchant — no fabricated averages.
  const frequent = findFrequentMerchant(debits, now - 7 * DAY_MS, now, 4);
  if (frequent) {
    insights.push({
      title: `${frequent.count} orders at ${frequent.merchant} this week`,
      description: `That's ${formatCurrency(
        frequent.total
      )} across ${frequent.count} transactions — ${formatCurrency(
        frequent.total / frequent.count
      )} on average.`,
      severity: 'neutral',
      category: frequent.category,
    });
  }

  // ── 6. Acceleration vs. baseline ───────────────────────────────────
  // Compare last 3 days' daily average to the prior 14-day baseline (same
  // unit on both sides). The previous version compared a 7-day projection
  // to a partial week-to-date, which fires inconsistently depending on
  // which day of the week the user opens the app.
  if (hasTrendHistory) {
    const last3 = avgPerDay(debits, now - 3 * DAY_MS, now);
    const baseline = avgPerDay(debits, now - 17 * DAY_MS, now - 3 * DAY_MS);
    if (last3 > 0 && baseline > 0 && last3 / baseline > 1.5) {
      insights.push({
        title: 'Spending pace is accelerating',
        description: `Your last 3 days average ${formatCurrency(
          last3
        )}/day — up from ${formatCurrency(baseline)}/day over the prior two weeks.`,
        severity: 'warning',
      });
    }
  }

  // ── 7. Largest single transaction this week ────────────────────────
  // A simple, always-truthful insight: "this is the biggest thing you spent
  // money on recently." No statistical claim, no comparison.
  const biggest = biggestThisWeek(debits, now);
  if (biggest && biggest.amount >= summary.dailyAverageThisMonth * 2) {
    insights.push({
      title: 'Biggest spend this week',
      description: `${formatCurrency(biggest.amount)} at ${biggest.merchant} on ${formatWeekday(
        biggest.timestamp
      )}.`,
      severity: 'neutral',
      category: biggest.category,
    });
  }

  // ── 8. Better month ────────────────────────────────────────────────
  // monthlyChange is 0 when lastMonth has no data, so the threshold check
  // already guards against a misleading "100% better" alert.
  if (hasTrendHistory && summary.monthlyChange < -10) {
    insights.push({
      title: 'On pace for a better month',
      description: `You're ${Math.abs(summary.monthlyChange).toFixed(
        0
      )}% below last month at this point — ${formatCurrency(summary.thisMonth)} vs ${formatCurrency(summary.lastMonth)}.`,
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
  /** Distinct calendar days in the window with at least one matching tx. */
  dayCount: number;
  /** Total / dayCount (0 if no days). */
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
  // Only surface the top category if it accounts for a clear plurality.
  // Otherwise the "most of it is X" framing would be misleading.
  const topPct = (topAmount / total) * 100;
  return {
    total,
    topCategory: topCat && topPct >= 40 ? { category: topCat, percentage: topPct } : null,
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

function formatWeekday(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { weekday: 'long' });
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Re-export to keep getDailySpendForChart importable from this module if any
// caller relied on it transitively.
export { getDailySpendForChart };
