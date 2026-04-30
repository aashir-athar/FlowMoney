// types/insight.ts

export type InsightSeverity = 'neutral' | 'warning' | 'positive' | 'alert';

export interface Insight {
  id: string;
  title: string;
  description: string;
  severity: InsightSeverity;
  category?: string;
  createdAt: number;
  isRead: boolean;
  actionable?: boolean;
}
