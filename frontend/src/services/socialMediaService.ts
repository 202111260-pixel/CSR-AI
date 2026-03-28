import api from './api';
import type { ApiResponse } from '../types/api.types';

export interface RecentActivityItem {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  type: string;
  createdAt: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null } | null;
  project: { id: string; name: string } | null;
}

export interface ESGEnvironmentalData {
  projectCount: number;
  budgetShare: number;       // percentage 0-100
  sdgsCovered: number[];     // array of SDG IDs: subset of [6,7,13,14,15]
  totalBudget: number;
}

export interface ESGSocialData {
  totalBeneficiaries: number;
  donationsTotal: number;
  communityIdeas: number;
  activeEmployees: number;
  totalEmployees: number;
}

export interface ESGGovernanceData {
  alertResolutionRate: number;
  projectCompletionRate: number;
  reviewCoverage: number;
  transparencyScore: number;
}

export interface ESGSDGCoverage {
  id: number;
  name: string;
  projectCount: number;
  budget: number;
}

export interface ESGTrendPoint {
  month: string;
  environmental: number;
  social: number;
  governance: number;
  overall: number;
}

export interface ESGData {
  overallScore: number;
  grade: string;               // "A+" | "A" | "B+" | "B" | "C+" | "C" | "D"
  scores: {
    environmental: number;
    social: number;
    governance: number;
  };
  environmental: ESGEnvironmentalData;
  social: ESGSocialData;
  governance: ESGGovernanceData;
  sdgCoverage: ESGSDGCoverage[];
  esgTrend: ESGTrendPoint[];
}

export interface SocialMediaEngagementMetrics {
  // totalEngagements is the count of all recent-6-month events combined
  totalEngagements: number;
  // per-type counts for recent 6 months
  activities: number;
  reviews: number;
  ideas: number;
  donations: number;
  engagementRate: number;
  projectsEngaged: number;
  totalProjects: number;
}

export interface SocialMediaSentimentAnalysis {
  positive: { count: number; percentage: number };
  neutral:  { count: number; percentage: number };
  negative: { count: number; percentage: number };
  totalReviews: number;
  averageRating: number;
  overallScore: number;
}

export interface SocialMediaData {
  engagementMetrics: SocialMediaEngagementMetrics;
  platformBreakdown: { platform: string; count: number; percentage: number }[];
  sentimentAnalysis: SocialMediaSentimentAnalysis;
  engagementTrend: {
    month: string;
    activities: number;
    reviews: number;
    ideas: number;
    donations: number;
    total: number;
  }[];
  topHashtags: { tag: string; count: number }[];
  campaignPerformance: {
    name: string;
    categoryId: string;
    projects: number;
    budget: number;
    engagement: number;
    sentiment: number;
    reviewCount: number;
  }[];
  recentActivity: RecentActivityItem[];
  esgData: ESGData;
}

export const socialMediaService = {
  getAnalytics: () =>
    api.get<ApiResponse<SocialMediaData>>('/social-media').then(r => r.data),
};
