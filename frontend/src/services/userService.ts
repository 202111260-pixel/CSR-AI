import api from './api';
import type { User } from '../types/user.types';
import type { ApiResponse, Paginated } from '../types/api.types';

export const userService = {
  getUsers: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<Paginated<User>>>('/users', { params }).then(r => r.data),

  getUser: (id: string) =>
    api.get<ApiResponse<User>>(`/users/${id}`).then(r => r.data),

  getUserStats: () =>
    api.get<ApiResponse<unknown>>('/users/stats').then(r => r.data),

  createUser: (data: Record<string, unknown>) =>
    api.post<ApiResponse<User>>('/users', data).then(r => r.data),

  updateUser: (id: string, data: Partial<User>) =>
    api.patch<ApiResponse<User>>(`/users/${id}`, data).then(r => r.data),

  deleteUser: (id: string) =>
    api.delete(`/users/${id}`).then(r => r.data),
};
