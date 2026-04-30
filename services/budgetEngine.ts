// services/budgetEngine.ts
// Smart budget suggestion — suggests limits based on user's own baseline
// "Based on your habits" rather than arbitrary numbers

import { Transaction, SpendingSummary } from '../types/transaction';
import { Budget } from '../types/budget';

/**
 * Generate a smart budget suggestion based on the user's spending history.
 * Uses a 10% reduction from their recent average as the starting suggestion.
 * This feels achievable, not punishing.
 */
export function suggestBudget(
  transactions: Transaction[],
  summary: SpendingSummary
): Budget {
  const now = Date.now();

  // Use 3-month rolling average if possible, else current month
  const threeMonthsAgo = now - 90 * 86400000;
  const recentDebits = transactions.filter(
    (t) => t.type === 'debit' && t.timestamp >= threeMonthsAgo
  );

  // Weekly average from recent history
  const totalRecent = recentDebits.reduce((s, t) => s + t.amount, 0);
  const weeksInRange = Math.max((now - (recentDebits[recentDebits.length - 1]?.timestamp ?? now)) / (7 * 86400000), 1);
  const weeklyAverage = totalRecent / weeksInRange;

  // Suggest 10% below average — realistic improvement
  const suggestedWeekly = Math.round(weeklyAverage * 0.9 / 100) * 100;
  const suggestedMonthly = Math.round(suggestedWeekly * 4.33 / 100) * 100;

  // Per-category limits based on actual distribution
  const categoryLimits: Record<string, number> = {};
  summary.categoryBreakdown.forEach((cat) => {
    // Suggest 15% reduction per category
    const monthlyTotal = cat.total;
    categoryLimits[cat.category] = Math.round(monthlyTotal * 0.85 / 100) * 100;
  });

  return {
    id: `budget_${now}`,
    weeklyLimit: Math.max(suggestedWeekly, 5000), // Minimum Rs. 5,000/week
    monthlyLimit: Math.max(suggestedMonthly, 20000),
    categoryLimits,
    isSystemSuggested: true,
    createdAt: now,
  };
}

/**
 * Evaluate current spending against a budget.
 * Returns a 0–1 progress value per category and overall.
 */
export interface BudgetStatus {
  weeklyProgress: number; // 0–1
  monthlyProgress: number; // 0–1
  weeklyRemaining: number;
  monthlyRemaining: number;
  isOverWeekly: boolean;
  isOverMonthly: boolean;
  categoryProgress: Record<string, number>;
}

export function evaluateBudget(
  summary: SpendingSummary,
  budget: Budget
): BudgetStatus {
  const weeklyProgress = summary.thisWeek / budget.weeklyLimit;
  const monthlyProgress = summary.thisMonth / budget.monthlyLimit;

  const categoryProgress: Record<string, number> = {};
  summary.categoryBreakdown.forEach((cat) => {
    const limit = budget.categoryLimits[cat.category];
    if (limit) {
      categoryProgress[cat.category] = cat.total / limit;
    }
  });

  return {
    weeklyProgress: Math.min(weeklyProgress, 1),
    monthlyProgress: Math.min(monthlyProgress, 1),
    weeklyRemaining: Math.max(budget.weeklyLimit - summary.thisWeek, 0),
    monthlyRemaining: Math.max(budget.monthlyLimit - summary.thisMonth, 0),
    isOverWeekly: weeklyProgress > 1,
    isOverMonthly: monthlyProgress > 1,
    categoryProgress,
  };
}
