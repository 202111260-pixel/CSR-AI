export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type MilestoneStatus = 'completed' | 'in_progress' | 'pending';

export interface ProjectMilestone {
  id: string;
  title: string;
  description: string;
  status: MilestoneStatus;
  date: string;
  attachments?: string[];
}

export interface ProjectExpense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  approvedBy?: string;
  invoiceUrl?: string;
  status: 'approved' | 'pending' | 'rejected';
}

export interface ProjectBeneficiary {
  total: number;
  male: number;
  female: number;
  children: number;
  elderly: number;
  disabled: number;
  ageGroups: { group: string; count: number }[];
  description: string;
  impact: string;
  successStories: { title: string; story: string; image?: string }[];
}

export interface ProjectMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  caption?: string;
  uploadedAt: string;
  category: 'before' | 'during' | 'after' | 'event';
}

export interface ProjectDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
  category: 'contract' | 'report' | 'invoice' | 'plan' | 'other';
}

export interface ProjectReview {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ProjectActivity {
  id: string;
  action: string;
  description: string;
  userId: string;
  userName: string;
  createdAt: string;
  type: 'update' | 'create' | 'delete' | 'review' | 'expense' | 'milestone' | 'media';
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

export interface Project {
  id: string;
  name: string;
  categoryId: string;
  categoryName?: string;
  status: ProjectStatus;
  budget: number;
  spent: number;
  location: string;
  latitude?: number;
  longitude?: number;
  region?: string;
  startDate: string;
  endDate: string;
  description?: string;
  objectives?: string[];
  expectedOutputs?: string[];
  coverImage?: string;
  progress?: number;
  risk?: RiskLevel;
  avgRating?: number;
  totalReviews?: number;
  beneficiaryCount?: number;
  sdgGoals?: number[];
  tags?: string[];
  managerId?: string;
  managerName?: string;
  team?: TeamMember[];
  milestones?: ProjectMilestone[];
  expenses?: ProjectExpense[];
  beneficiaries?: ProjectBeneficiary;
  media?: ProjectMedia[];
  documents?: ProjectDocument[];
  reviews?: ProjectReview[];
  activities?: ProjectActivity[];
  relatedProjects?: { id: string; name: string; status: ProjectStatus }[];
  createdAt: string;
  updatedAt: string;
}
