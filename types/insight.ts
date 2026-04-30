// types/insight.ts

export type InsightSeverity = 'neutral' | 'warning' | 'positive' | 'alert';

// Insight payload — pure data so the UI can translate at render time.
// `kind` keys into `insightEngine.*` translation strings; `params` is the
// interpolation payload. Pre-formatted `title`/`description` strings are
// gone: they baked English into persisted state, which made language
// switching impossible without regenerating insights.
export type InsightKind =
  | 'weeklyUp'
  | 'weeklyDown'
  | 'topCategory'
  | 'weekend'
  | 'lateNight'
  | 'frequentMerchant'
  | 'accelerating'
  | 'biggestThisWeek'
  | 'betterMonth';

export interface Insight {
  id: string;
  kind: InsightKind;
  // Pre-built interpolation values. Keys vary per `kind` — the
  // insightEngine and InsightCard agree on the shape implicitly.
  params: Record<string, string | number>;
  severity: InsightSeverity;
  category?: string;
  createdAt: number;
  isRead: boolean;
  actionable?: boolean;
}
