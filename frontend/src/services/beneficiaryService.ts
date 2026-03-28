import api from './api';
import type { ApiResponse } from '../types/api.types';

export const beneficiaryService = {
  getProjectBeneficiaries: (projectId: string) =>
    api.get<ApiResponse<unknown>>(`/projects/${projectId}/beneficiaries`).then(r => r.data),
  createProjectBeneficiary: (projectId: string, data: Record<string, unknown>) =>
    api.post<ApiResponse<unknown>>(`/projects/${projectId}/beneficiaries`, data).then(r => r.data),
  updateProjectBeneficiary: (projectId: string, beneficiaryId: string, data: Record<string, unknown>) =>
    api.patch<ApiResponse<unknown>>(`/projects/${projectId}/beneficiaries/${beneficiaryId}`, data).then(r => r.data),
  deleteProjectBeneficiary: (projectId: string, beneficiaryId: string) =>
    api.delete<ApiResponse<unknown>>(`/projects/${projectId}/beneficiaries/${beneficiaryId}`).then(r => r.data),
};
