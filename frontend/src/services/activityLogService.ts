import api from './api';
import type { ApiResponse } from '../types/api.types';

interface ActivityLog {
  id: string;
  userId: string;
  projectId?: string;
  action: string;
  entity: string;
  entityId: string;
  details?: string;
  type?: string;
  ip?: string;
  createdAt: string;
  user: { id: string; name: string; email: string; role: string; avatarUrl?: string };
  project?: { id: string; name: string };
}

interface ActivityLogListResponse {
  items: ActivityLog[];
  page: number;
  total: number;
  totalPages: number;
}

interface ActivityLogStats {
  total: number;
  last24h: number;
  byEntity: { entity: string; count: number }[];
  byAction: { action: string; count: number }[];
}

export const activityLogService = {
  getAll: (params?: Record<string, string | number>) =>
    api.get<ApiResponse<ActivityLogListResponse>>('/activity-logs', { params }).then(r => r.data),

  getStats: () =>
    api.get<ApiResponse<ActivityLogStats>>('/activity-logs/stats').then(r => r.data),
};
