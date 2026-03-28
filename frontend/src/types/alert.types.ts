export type AlertLevel = 'info' | 'warning' | 'critical';
export type AlertType = 'budget' | 'timeline' | 'quality' | 'impact';

export interface Alert {
  id: string;
  projectId: string;
  type: AlertType;
  level: AlertLevel;
  message: string;
  resolvedAt?: string;
  createdAt: string;
}
