import api from './api';
import type { ApiResponse } from '../types/api.types';

export const settingsService = {
  getAll: () =>
    api.get<ApiResponse<Record<string, unknown>>>('/settings').then(r => r.data),

  get: (key: string) =>
    api.get<ApiResponse<{ key: string; value: unknown }>>(`/settings/${key}`).then(r => r.data),

  bulkUpdate: (settings: { key: string; value: unknown }[]) =>
    api.put<ApiResponse<Record<string, unknown>>>('/settings', { settings }).then(r => r.data),

  update: (key: string, value: unknown) =>
    api.put<ApiResponse<{ key: string; value: unknown }>>(`/settings/${key}`, { value }).then(r => r.data),

  delete: (key: string) =>
    api.delete(`/settings/${key}`).then(r => r.data),
};
