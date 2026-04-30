// types/transaction.ts

export type TransactionType = 'debit' | 'credit';

export type TransactionCategory =
  | 'food'
  | 'transport'
  | 'bills'
  | 'shopping'
  | 'entertainment'
  | 'health'
  | 'subscriptions'
  | 'transfer'
  | 'other';

export interface Transaction {
  id: string;
  amount: number;
  merchant: string;
  category: TransactionCategory;
  type: TransactionType;
  timestamp: number; // Unix ms
  rawSms?: string;
  isManual: boolean;
  isImportant: boolean;
  note?: string;
  source: 'sms' | 'manual';
}

export interface DailySpend {
  date: string; // ISO date string YYYY-MM-DD
  total: number;
  transactions: Transaction[];
}

export interface CategoryBreakdown {
  category: TransactionCategory;
  total: number;
  percentage: number;
  count: number;
}

export interface SpendingSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  lastMonth: number;
  weeklyChange: number; // percentage
  monthlyChange: number; // percentage
  categoryBreakdown: CategoryBreakdown[];
  dailyAverageThisMonth: number;
}
