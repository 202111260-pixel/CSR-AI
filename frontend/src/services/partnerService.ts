import api from './api';
import type { Partner } from '../types/partner.types';
import type { ApiResponse, Paginated } from '../types/api.types';

export const partnerService = {
  getPartners: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<Paginated<Partner>>>('/partners', { params }).then(r => r.data),

  getPartner: (id: string) =>
    api.get<ApiResponse<Partner>>(`/partners/${id}`).then(r => r.data),

  getPartnerStats: () =>
    api.get<ApiResponse<unknown>>('/partners/stats').then(r => r.data),

  createPartner: (data: Partial<Partner>) =>
    api.post<ApiResponse<Partner>>('/partners', data).then(r => r.data),

  updatePartner: (id: string, data: Partial<Partner>) =>
    api.patch<ApiResponse<Partner>>(`/partners/${id}`, data).then(r => r.data),

  deletePartner: (id: string) =>
    api.delete(`/partners/${id}`).then(r => r.data),
};
