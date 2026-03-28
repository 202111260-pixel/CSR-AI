import api from './api';
import type { ApiResponse } from '../types/api.types';
import type { User } from '../types/user.types';

interface LoginResponse {
  user: User;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: string;
  department?: string;
}

export const authService = {
  login: (email: string, password: string) =>
    api.post<ApiResponse<LoginResponse>>('/auth/login', { email, password }).then(r => r.data),

  register: (data: RegisterData) =>
    api.post<ApiResponse<LoginResponse>>('/auth/register', data).then(r => r.data),

  logout: () =>
    api.post<ApiResponse<{ message: string }>>('/auth/logout').then(r => r.data),

  getMe: () =>
    api.get<ApiResponse<User>>('/auth/me').then(r => r.data),

  updateMe: (data: Partial<User>) =>
    api.patch<ApiResponse<User>>('/auth/me', data).then(r => r.data),

  refreshToken: () =>
    api.post<ApiResponse<{ message: string }>>('/auth/refresh').then(r => r.data),

  forgotPassword: (email: string) =>
    api.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email }).then(r => r.data),

  verifyResetCode: (email: string, code: string) =>
    api.post<ApiResponse<{ message: string }>>('/auth/verify-reset-code', { email, code }).then(r => r.data),

  resetPassword: (email: string, code: string, password: string) =>
    api.post<ApiResponse<{ message: string }>>('/auth/reset-password', { email, code, password }).then(r => r.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<ApiResponse<{ message: string }>>('/auth/change-password', { currentPassword, newPassword }).then(r => r.data),

  setup2FA: () =>
    api.post<ApiResponse<{ secret: string }>>('/auth/2fa/setup').then(r => r.data),

  verify2FA: (code: string) =>
    api.post<ApiResponse<{ message: string }>>('/auth/2fa/verify', { code }).then(r => r.data),

  disable2FA: () =>
    api.post<ApiResponse<{ message: string }>>('/auth/2fa/disable').then(r => r.data),

  exportMyData: () =>
    api.get<ApiResponse<unknown>>('/auth/me/export').then(r => r.data),

  deleteMyAccount: (password: string) =>
    api.delete<ApiResponse<{ message: string }>>('/auth/me', { data: { password } }).then(r => r.data),
};
