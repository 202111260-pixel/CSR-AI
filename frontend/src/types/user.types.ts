export type UserRole = 'admin' | 'manager' | 'employee' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  avatarUrl?: string | null;
  jobTitle?: string | null;
  employeeId?: string | null;
  bio?: string | null;
  phone?: string | null;
  location?: string | null;
  status?: string;
  is2FAEnabled: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}
