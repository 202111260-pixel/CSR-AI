import api from './api';
import type { ApiResponse } from '../types/api.types';

export interface AiChart {
  title: string;
  type: 'bar' | 'line' | 'area' | 'donut';
  xKey?: string;
  yKeys?: string[];
  data: Record<string, unknown>[];
}

export interface AiAnalysisResult {
  question: string;
  scope: string;
  analysis: string;
  keyFindings: string[];
  recommendations: string[];
  chartData: AiChart[];
  sdgConnections: string[];
  metadata: {
    model: string;
    dataScope: string;
    timestamp: string;
  };
}

export interface ModelInfo {
  id: string;
  label: string;
  tier: 'free' | 'paid';
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  { id: 'anthropic/claude-3.5-sonnet',                   label: 'Claude 3.5 Sonnet', tier: 'paid' },
  { id: 'google/gemini-2.0-flash',                       label: 'Gemini 2.0 Flash',  tier: 'paid' },
  { id: 'openai/gpt-4o',                                 label: 'GPT-4o',            tier: 'paid' },
  { id: 'google/gemma-3-27b-it:free',                    label: 'Gemma 3 27B',       tier: 'free' },
  { id: 'mistralai/mistral-small-3.1-24b-instruct:free', label: 'Mistral Small 3.1', tier: 'free' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free',        label: 'Llama 3.3 70B',     tier: 'free' },
];

export type AnalysisScope = 'projects' | 'financial' | 'impact' | 'partners' | 'overview';

export const aiAnalyticsService = {
  analyze: (question: string, scope: AnalysisScope = 'overview', model?: string) =>
    api.post<ApiResponse<AiAnalysisResult>>('/ai-analytics/analyze', {
      question,
      scope,
      ...(model ? { model } : {}),
    }).then(r => r.data),

  getContext: (scope: AnalysisScope = 'overview') =>
    api.get<ApiResponse<Record<string, unknown>>>('/ai-analytics/context', { params: { scope } }).then(r => r.data),

  getModels: () =>
    api.get<ApiResponse<ModelInfo[]>>('/ai-analytics/models').then(r => r.data),

  analyzeAlerts: (question: string, riskType?: string, alertIds?: string[]) =>
    api.post<ApiResponse<AiAnalysisResult>>('/ai-analytics/analyze-alerts', {
      question,
      riskType: riskType || 'all',
      ...(alertIds?.length ? { alertIds } : {}),
    }).then(r => r.data),
};
