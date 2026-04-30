// types/budget.ts

export interface Budget {
  id: string;
  weeklyLimit: number;
  monthlyLimit: number;
  categoryLimits: Record<string, number>;
  isSystemSuggested: boolean;
  createdAt: number;
}
