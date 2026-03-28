import api from './api';
import type { ApiResponse } from '../types/api.types';

export const reportService = {
  getGeneralReport: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<unknown>>('/reports/general', { params }).then(r => r.data),

  getImpactReport: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<unknown>>('/reports/impact', { params }).then(r => r.data),

  getFinancialReport: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<unknown>>('/reports/financial', { params }).then(r => r.data),
};
