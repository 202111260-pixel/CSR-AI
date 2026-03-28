import api from './api';
import type { Expense } from '../types/expense.types';
import type { ApiResponse, Paginated } from '../types/api.types';

export const expenseService = {
  getExpenses: (projectId: string) =>
    api.get<ApiResponse<Paginated<Expense>>>(`/projects/${projectId}/expenses`).then(r => r.data),
  createExpense: (projectId: string, data: Partial<Expense>) =>
    api.post<ApiResponse<Expense>>(`/projects/${projectId}/expenses`, data).then(r => r.data),
  updateExpense: (projectId: string, expenseId: string, data: Partial<Expense>) =>
    api.patch<ApiResponse<Expense>>(`/projects/${projectId}/expenses/${expenseId}`, data).then(r => r.data),
  deleteExpense: (projectId: string, expenseId: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/projects/${projectId}/expenses/${expenseId}`).then(r => r.data),
};
