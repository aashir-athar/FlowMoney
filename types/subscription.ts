// types/subscription.ts

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'yearly';
  lastCharged: number; // Unix ms
  nextExpected: number; // Unix ms
  category: string;
  isActive: boolean;
  recentlyUsed: boolean;
  transactionIds: string[];
}
