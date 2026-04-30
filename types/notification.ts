// types/notification.ts

export type NotificationType =
  | 'realtime'
  | 'behavior_alert'
  | 'pattern_insight'
  | 'gentle_nudge'
  | 'weekly_report';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: number;
  isRead: boolean;
  data?: Record<string, unknown>;
}
