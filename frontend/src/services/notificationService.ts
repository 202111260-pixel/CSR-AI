import api from './api';
import type { ApiResponse } from '../types/api.types';

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

interface NotificationListResponse {
  items: Notification[];
  page: number;
  total: number;
  totalPages: number;
  unreadCount: number;
}

export const notificationService = {
  getAll: (params?: { page?: number; limit?: number; read?: boolean }) =>
    api.get<ApiResponse<NotificationListResponse>>('/notifications', { params }).then(r => r.data),

  markAsRead: (id: string) =>
    api.patch<ApiResponse<Notification>>(`/notifications/${id}/read`).then(r => r.data),

  markAllAsRead: () =>
    api.post<ApiResponse<{ message: string }>>('/notifications/read-all').then(r => r.data),

  delete: (id: string) =>
    api.delete(`/notifications/${id}`).then(r => r.data),

  scan: () =>
    api.post<ApiResponse<any>>('/notifications/scan').then(r => r.data),
};
