import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';

/**
 * Object-Level Authorization: ensures the user has access to the specific project.
 * - admin and manager roles have unrestricted access.
 * - employee and viewer must be the project manager or a team member.
 */
export async function requireProjectAccess(req: Request, res: Response, next: NextFunction) {
  const projectId = req.params.id as string;
  const user = req.user!;

  // Admin & Manager bypass — they manage all projects
  if (user.role === 'admin' || user.role === 'manager') {
    return next();
  }

  // Check if user is project manager or team member
  const [isManager, isTeamMember] = await Promise.all([
    prisma.project.count({ where: { id: projectId, managerId: user.id } }),
    prisma.projectTeam.count({ where: { projectId, userId: user.id } }),
  ]);

  if (isManager > 0 || isTeamMember > 0) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: { code: 'FORBIDDEN', message: 'You do not have access to this project' },
  });
}
