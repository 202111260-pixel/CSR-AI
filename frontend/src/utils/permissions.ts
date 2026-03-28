import type { UserRole } from '../types/user.types';

type Action =
  | 'project:create' | 'project:edit' | 'project:delete'
  | 'expense:create' | 'expense:approve'
  | 'user:manage' | 'category:manage'
  | 'report:view' | 'settings:edit';

const PERMISSIONS: Record<UserRole, Action[]> = {
  admin: ['project:create','project:edit','project:delete','expense:create','expense:approve','user:manage','category:manage','report:view','settings:edit'],
  manager: ['project:create','project:edit','expense:create','expense:approve','report:view'],
  employee: ['project:create','expense:create','report:view'],
  viewer: ['report:view'],
};

export function hasPermission(role: UserRole, action: Action): boolean {
  return PERMISSIONS[role]?.includes(action) ?? false;
}
