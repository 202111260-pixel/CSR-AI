import api from './api';
import type { Category } from '../types/category.types';
import type { ApiResponse, Paginated } from '../types/api.types';

export const categoryService = {
  getCategories: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<Paginated<Category>>>('/categories', { params }).then(r => r.data),

  getCategory: (id: string) =>
    api.get<ApiResponse<Category>>(`/categories/${id}`).then(r => r.data),

  getCategoryAnalytics: (id: string) =>
    api.get<ApiResponse<unknown>>(`/categories/${id}/analytics`).then(r => r.data),

  getCategoryStats: () =>
    api.get<ApiResponse<unknown>>('/categories/stats').then(r => r.data),

  createCategory: (data: Partial<Category>) =>
    api.post<ApiResponse<Category>>('/categories', data).then(r => r.data),

  updateCategory: (id: string, data: Partial<Category>) =>
    api.patch<ApiResponse<Category>>(`/categories/${id}`, data).then(r => r.data),

  deleteCategory: (id: string) =>
    api.delete(`/categories/${id}`).then(r => r.data),
};
