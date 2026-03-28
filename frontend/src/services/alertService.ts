import api from './api';
import type { Alert } from '../types/alert.types';
import type { ApiResponse, Paginated } from '../types/api.types';

export const alertService = {
  getAlerts: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<Paginated<Alert>>>('/alerts', { params }).then(r => r.data),

  getAlertStats: () =>
    api.get<ApiResponse<unknown>>('/alerts/stats').then(r => r.data),

  resolveAlert: (id: string) =>
    api.patch(`/alerts/${id}/resolve`).then(r => r.data),

  simulateSolution: (alertId: string, projectId: string) =>
    api.post('/ai-analytics/simulate-solution', { alertId, projectId }).then(r => r.data),

  triggerAudit: () =>
    api.post('/ai-analytics/trigger-audit').then(r => r.data),

  // Scenario Actions
  submitScenario: (data: Record<string, unknown>) =>
    api.post('/ai-analytics/scenario-actions', data).then(r => r.data),

  getScenarioActions: (status?: string) =>
    api.get('/ai-analytics/scenario-actions', { params: status ? { status } : {} }).then(r => r.data),

  approveScenario: (id: string, executionNote?: string) =>
    api.patch(`/ai-analytics/scenario-actions/${id}/approve`, { executionNote }).then(r => r.data),

  rejectScenario: (id: string, rejectionReason?: string) =>
    api.patch(`/ai-analytics/scenario-actions/${id}/reject`, { rejectionReason }).then(r => r.data),
};
