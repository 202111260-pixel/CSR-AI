import api from './api';
import type { ApiResponse } from '../types/api.types';

export const dashboardService = {
  getDashboard: () =>
    api.get<ApiResponse<unknown>>('/dashboard').then(r => r.data),
};
