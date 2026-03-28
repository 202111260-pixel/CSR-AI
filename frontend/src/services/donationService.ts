import api from './api';
import type { ApiResponse } from '../types/api.types';

export const donationService = {
  getLeaderboard: () =>
    api.get<ApiResponse<unknown>>('/partners/donations/leaderboard').then(r => r.data),

  getDonationStats: () =>
    api.get<ApiResponse<unknown>>('/partners/donations/stats').then(r => r.data),

  getDonationPreferences: () =>
    api.get<ApiResponse<unknown>>('/partners/donations/preferences').then(r => r.data),

  saveDonationPreferences: (data: {
    salaryRoundingEnabled?: boolean;
    monthlyDonationEnabled?: boolean;
    companyMatchEnabled?: boolean;
    monthlyDonationAmount?: number | null;
  }) =>
    api.patch<ApiResponse<unknown>>('/partners/donations/preferences', data).then(r => r.data),

  getDonationsByUser: () =>
    api.get<ApiResponse<unknown>>('/partners/donations/by-user').then(r => r.data),

  createDonation: (data: { amount: number; type: string; partnerId?: string | null; projectId?: string | null; challengeId?: string | null }) =>
    api.post<ApiResponse<unknown>>('/partners/donations', data).then(r => r.data),
};
