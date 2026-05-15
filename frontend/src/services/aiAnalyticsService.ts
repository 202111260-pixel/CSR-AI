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

// ── Agent Pipeline Types ────────────────────────────────────────────────────

export interface AgentResult {
  agentId: string;
  agentName: string;
  model: string;
  status: 'waiting' | 'analyzing' | 'complete' | 'error';
  analysis: string;
  keyFindings: string[];
  recommendations: string[];
  chartData: AiChart[];
  error?: string;
}

export interface AgentPipelineResult {
  question: string;
  scope: string;
  agents: AgentResult[];
  masterReport: {
    analysis: string;
    keyFindings: string[];
    recommendations: string[];
    sdgConnections: string[];
    modelUsed: string;
    chartData: AiChart[];
    metadata: {
      model: string;
      dataScope: string;
      agentCount: number;
      timestamp: string;
    };
  };
}

export interface AgentModelInfo {
  id: string;
  name: string;
  model: string;
  color: string;
}

// ── Model Definitions ───────────────────────────────────────────────────────

export interface ModelInfo {
  id: string;
  label: string;
  tier: 'free' | 'paid';
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  { id: 'openai/gpt-4o',                          label: 'GPT-4o',              tier: 'paid' },
  { id: 'openai/gpt-4o-mini',                     label: 'GPT-4o Mini',         tier: 'free' },
  { id: 'openai/gpt-4.1',                         label: 'GPT-4.1',             tier: 'paid' },
  { id: 'openai/gpt-4.1-mini',                    label: 'GPT-4.1 Mini',        tier: 'free' },
  { id: 'anthropic/claude-sonnet-4-20250514',      label: 'Claude Sonnet 4',     tier: 'paid' },
  { id: 'anthropic/claude-3-5-haiku-20241022',     label: 'Claude 3.5 Haiku',    tier: 'free' },
  { id: 'google/gemini-2.0-flash',                label: 'Gemini 2.0 Flash',    tier: 'free' },
  { id: 'google/gemini-2.5-flash-preview-05-20',  label: 'Gemini 2.5 Flash',    tier: 'paid' },
  { id: 'deepseek/deepseek-r1-0528',              label: 'DeepSeek R1',         tier: 'paid' },
  { id: 'deepseek/deepseek-chat',                 label: 'DeepSeek Chat',       tier: 'free' },
  { id: 'mistralai/mistral-small-latest',          label: 'Mistral Small',       tier: 'free' },
  { id: 'meta/llama-4-scout-17b-16e-instruct',    label: 'Llama 4 Scout',       tier: 'free' },
  { id: 'qwen/qwen-turbo',                        label: 'Qwen Turbo',          tier: 'free' },
];

export type AnalysisScope = 'projects' | 'financial' | 'impact' | 'partners' | 'overview';

export interface SdgSuggestionResult {
  suggestedSdgs: number[];
  reasoning: string;
  metadata: { model: string; timestamp: string };
}

export interface SdgSuggestionInput {
  projectName: string;
  category?: string;
  shortDescription?: string;
  fullDescription?: string;
  objectives?: string[];
  targetGroup?: string;
}

export const aiAnalyticsService = {
  analyze: (question: string, scope: AnalysisScope = 'overview', model?: string) =>
    api.post<ApiResponse<AiAnalysisResult>>('/ai-analytics/analyze', {
      question,
      scope,
      ...(model ? { model } : {}),
    }).then(r => r.data),

  agentAnalyze: (question: string, scope: AnalysisScope = 'overview') =>
    api.post<ApiResponse<AgentPipelineResult>>('/ai-analytics/agent-analyze', {
      question,
      scope,
    }).then(r => r.data),

  getAgentModels: () =>
    api.get<ApiResponse<{ agents: AgentModelInfo[]; master: AgentModelInfo }>>('/ai-analytics/agent-models').then(r => r.data),

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

  suggestSdgs: (input: SdgSuggestionInput) =>
    api.post<ApiResponse<SdgSuggestionResult>>('/ai-analytics/suggest-sdgs', input).then(r => r.data),
};
