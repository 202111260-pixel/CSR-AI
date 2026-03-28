export type UserRole = 'admin' | 'manager' | 'employee' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  is2FAEnabled: boolean;
  createdAt: string;
}
