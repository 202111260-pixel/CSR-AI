import api from './api';
import type { ApiResponse } from '../types/api.types';

export interface ChallengeReward {
  id: string;
  title: string;
  condition: string;
  icon: string;
  color?: string | null;
}

export interface ChallengeTopDonor {
  name: string;
  amount: number;
  avatar: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  goal: number;
  collected: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'failed';
  winner?: string | null;
  participants: number;
  rewards: ChallengeReward[];
  topDonors?: ChallengeTopDonor[];
}

export const challengeService = {
  getCurrentChallenge: () =>
    api.get<ApiResponse<Challenge | null>>('/partners/challenges/current').then(r => r.data),

  getPastChallenges: () =>
    api.get<ApiResponse<Challenge[]>>('/partners/challenges/past').then(r => r.data),

  getChallengeDonationTrend: (id: string) =>
    api.get<ApiResponse<Array<{ month: string; amount: number }>>>(`/partners/challenges/${id}/trend`).then(r => r.data),

  createChallenge: (data: {
    title: string;
    description: string;
    goal: number;
    startDate?: string;
    endDate: string;
    rewards?: Array<{ title: string; condition: string; icon?: string; color?: string }>;
  }) =>
    api.post<ApiResponse<Challenge>>('/partners/challenges', data).then(r => r.data),

  updateChallenge: (id: string, data: Partial<{
    title: string;
    description: string;
    goal: number;
    startDate: string;
    endDate: string;
    status: 'active' | 'completed' | 'failed';
    winner: string | null;
  }>) =>
    api.patch<ApiResponse<Challenge>>(`/partners/challenges/${id}`, data).then(r => r.data),

  finalizeChallenge: (id: string, data: { result: 'completed' | 'failed'; winner?: string | null }) =>
    api.patch<ApiResponse<Challenge>>(`/partners/challenges/${id}/finalize`, data).then(r => r.data),
};
