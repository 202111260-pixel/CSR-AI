import api from './api';
import type { ApiResponse } from '../types/api.types';

export interface FutureData {
  predictions: {
    projectId: string;
    projectName: string;
    status: string;
    successProbability: number;
    riskTrend: 'improving' | 'stable' | 'declining';
    estimatedCompletion: string;
    recommendations: string[];
  }[];
  budgetForecast: { month: string; projectedBudget: number; projectedSpend: number; confidence: number }[];
  impactProjections: { quarter: string; beneficiaries: number }[];
  categoryInsights: { category: string; projects: number; avgProgress: number; budgetUtilization: number; riskLevel: string; growthPotential: string }[];
  overallHealth: { score: number; budgetHealth: number; timelineHealth: number; qualityHealth: number; completionRate: number };
  aiRecommendations: { title: string; description: string; priority: 'high' | 'medium' | 'low'; category: string }[];
}

export const futureService = {
  getFutureData: () =>
    api.get<ApiResponse<FutureData>>('/future').then(r => r.data),
};
