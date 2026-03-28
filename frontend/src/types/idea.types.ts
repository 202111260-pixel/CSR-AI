export type IdeaStatus = 'pending' | 'under_review' | 'approved' | 'in_progress' | 'rejected';

export interface IdeaComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: string;
  parentId?: string;
  replies?: IdeaComment[];
}

export interface Idea {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  title: string;
  description: string;
  nlpCategory?: string;
  suggestedCategory: string;
  targetGroup: string;
  estimatedBudget: number;
  estimatedDuration: string;
  expectedBenefits: string;
  potentialRisks: string;
  status: IdeaStatus;
  votes: number;
  hasVoted?: boolean;
  commentsCount: number;
  comments?: IdeaComment[];
  createdAt: string;
}

export interface IdeaFormData {
  title: string;
  description: string;
  suggestedCategory: string;
  targetGroup: string;
  estimatedBudget: number;
  estimatedDuration: string;
  expectedBenefits: string;
  potentialRisks: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userAvatar: string;
  ideasCount: number;
  votesReceived: number;
  totalPoints: number;
  badges: string[];
}

export interface Contest {
  id: string;
  title: string;
  prize: string;
  endsAt: string;
  conditions: string[];
  participantsCount: number;
}
