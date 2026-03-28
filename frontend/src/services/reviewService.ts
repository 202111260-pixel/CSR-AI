import api from './api';
import type { ApiResponse } from '../types/api.types';

export const reviewService = {
  getProjectReviews: (projectId: string) =>
    api.get<ApiResponse<unknown>>(`/projects/${projectId}/reviews`).then(r => r.data),

  createReview: (projectId: string, data: { rating: number; comment?: string }) =>
    api.post<ApiResponse<unknown>>(`/projects/${projectId}/reviews`, data).then(r => r.data),
};
