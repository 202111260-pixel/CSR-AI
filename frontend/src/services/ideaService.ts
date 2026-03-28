import api from './api';
import type { ApiResponse, Paginated } from '../types/api.types';

export interface Idea {
  id: string;
  userId: string;
  title: string;
  description: string;
  nlpCategory: string | null;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  votes: number;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; email: string; avatarUrl: string | null };
  hasVoted?: boolean;
}

export const ideaService = {
  getIdeas: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<Paginated<Idea>>>('/ideas', { params }).then(r => r.data),

  getIdea: (id: string) =>
    api.get<ApiResponse<Idea>>(`/ideas/${id}`).then(r => r.data),

  getIdeaStats: () =>
    api.get<ApiResponse<unknown>>('/ideas/stats').then(r => r.data),

  getLeaderboard: () =>
    api.get<ApiResponse<unknown>>('/ideas/leaderboard').then(r => r.data),

  createIdea: (data: { title: string; description: string }) =>
    api.post<ApiResponse<Idea>>('/ideas', data).then(r => r.data),

  updateIdea: (id: string, data: Partial<Idea>) =>
    api.patch<ApiResponse<Idea>>(`/ideas/${id}`, data).then(r => r.data),

  deleteIdea: (id: string) =>
    api.delete(`/ideas/${id}`).then(r => r.data),

  toggleVote: (id: string) =>
    api.post<ApiResponse<{ voted: boolean; votes: number }>>(`/ideas/${id}/vote`).then(r => r.data),
};
