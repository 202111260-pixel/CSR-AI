import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum(['admin', 'manager', 'employee', 'viewer']).default('employee'),
  department: z.string().max(100).optional(),
  jobTitle: z.string().max(120).optional(),
  employeeId: z.string().max(60).optional(),
  contractType: z.enum(['full_time', 'part_time', 'contractor']).optional(),
  bio: z.string().max(2000).optional(),
  phone: z.string().max(30).optional(),
  location: z.string().max(200).optional(),
  notifyEmail: z.boolean().optional(),
  notifySms: z.boolean().optional(),
  notifyPush: z.boolean().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'manager', 'employee', 'viewer']).optional(),
  department: z.string().max(100).nullable().optional(),
  jobTitle: z.string().max(120).nullable().optional(),
  employeeId: z.string().max(60).nullable().optional(),
  contractType: z.enum(['full_time', 'part_time', 'contractor']).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  notifyEmail: z.boolean().optional(),
  notifySms: z.boolean().optional(),
  notifyPush: z.boolean().optional(),
});

const userSelectFields = {
  id: true, name: true, email: true, role: true, department: true,
  jobTitle: true, employeeId: true, contractType: true, bio: true,
  phone: true, location: true, avatarUrl: true, status: true,
  notifyEmail: true, notifySms: true, notifyPush: true,
  loginCount: true, lastIP: true,
  is2FAEnabled: true, lastLoginAt: true, createdAt: true, updatedAt: true,
} as const;

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 8));
    const skip = (page - 1) * limit;
    const search = (req.query.search as string) || '';
    const role = req.query.role as string;
    const status = req.query.status as string;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role && ['admin', 'manager', 'employee', 'viewer'].includes(role)) {
      where.role = role;
    }
    if (status && ['active', 'inactive', 'suspended'].includes(status)) {
      where.status = status;
    }

    const allowedSortFields = ['name', 'email', 'role', 'status', 'createdAt', 'lastLoginAt'];
    const orderBy: any = {};
    orderBy[allowedSortFields.includes(sortBy) ? sortBy : 'createdAt'] = sortOrder;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          ...userSelectFields,
          teamMembers: { select: { projectId: true } },
          _count: {
            select: { activityLogs: true, managedProjects: true, reviews: true, ideas: true },
          },
        },
        orderBy, skip, take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const items = users.map((u) => {
      const { teamMembers, _count, ...userData } = u;
      return {
        ...userData,
        projectsCount: teamMembers.length,
        managedProjectsCount: _count.managedProjects,
        activityCount: _count.activityLogs,
        reviewsCount: _count.reviews,
        ideasCount: _count.ideas,
      };
    });

    const totalPages = Math.ceil(total / limit);
    res.json({ success: true, data: { items, page, total, totalPages } });
  } catch (err: any) {
    console.error('GET /users error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch users' },
    });
  }
});

router.get('/stats', authenticate, async (_req: Request, res: Response) => {
  try {
    const [totalUsers, activeUsers, twoFAEnabledCount, roleGroups, departmentGroups] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: 'active' } }),
        prisma.user.count({ where: { is2FAEnabled: true } }),
        prisma.user.groupBy({
          by: ['role'],
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
        }),
        prisma.user.groupBy({
          by: ['department'],
          _count: { id: true },
          where: { department: { not: null } },
          orderBy: { _count: { id: 'desc' } },
        }),
      ]);

    const totalLoggedIn = await prisma.user.count({
      where: { lastLoginAt: { not: null } },
    });

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const totalActionsLast6 = await prisma.activityLog.count({
      where: { createdAt: { gte: sixMonthsAgo } },
    });
    const avgActionsPerMonth =
      totalUsers > 0 ? Math.round(totalActionsLast6 / 6 / totalUsers) : 0;

    const fullTimeCount = await prisma.user.count({
      where: { status: 'active', role: { in: ['admin', 'manager', 'employee'] } },
    });

    const roleDistribution = roleGroups.map((g) => ({
      role: g.role, count: g._count.id,
    }));

    const departmentDistribution = departmentGroups.map((g) => ({
      department: g.department || 'Unassigned', count: g._count.id,
    }));

    const activityTrend: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date();
      start.setMonth(start.getMonth() - i, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      const count = await prisma.activityLog.count({
        where: { createdAt: { gte: start, lt: end } },
      });
      const monthLabel = start.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      activityTrend.push({ month: monthLabel, count });
    }

    const newUsersTrend: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date();
      start.setMonth(start.getMonth() - i, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      const count = await prisma.user.count({
        where: { createdAt: { gte: start, lt: end } },
      });
      const monthLabel = start.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      newUsersTrend.push({ month: monthLabel, count });
    }

    res.json({
      success: true,
      data: {
        totalUsers, activeUsers, twoFAEnabled: twoFAEnabledCount,
        avgActionsPerMonth, fullTimeCount, totalLoggedIn,
        roleDistribution, departmentDistribution, activityTrend, newUsersTrend,
      },
    });
  } catch (err: any) {
    console.error('GET /users/stats error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch user stats' },
    });
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        ...userSelectFields,
        managedProjects: {
          select: {
            id: true, name: true, status: true, budget: true, progress: true,
            startDate: true, endDate: true,
            category: { select: { id: true, name: true, color: true, icon: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: 20,
        },
        teamMembers: {
          select: {
            id: true, role: true,
            project: {
              select: { id: true, name: true, status: true, budget: true, progress: true },
            },
          },
          orderBy: { project: { updatedAt: 'desc' } },
          take: 20,
        },
        activityLogs: {
          select: {
            id: true, action: true, entity: true, entityId: true,
            details: true, type: true, createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
        _count: {
          select: {
            managedProjects: true, reviews: true, ideas: true,
            donations: true, activityLogs: true, teamMembers: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }
    res.json({ success: true, data: user });
  } catch (err: any) {
    console.error('GET /users/:id error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch user' },
    });
  }
});

router.post(
  '/',
  authenticate,
  requireRole(['admin']),
  validate(createUserSchema),
  async (req: Request, res: Response) => {
    try {
      const {
        name, email, password, role, department, jobTitle, employeeId,
        contractType, bio, phone, location, notifyEmail, notifySms, notifyPush,
      } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: { code: 'CONFLICT', message: 'A user with this email already exists' },
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          name, email, password: hashedPassword, role,
          department: department || null,
          jobTitle: jobTitle || null,
          employeeId: employeeId || null,
          contractType: contractType || null,
          bio: bio || null,
          phone: phone || null,
          location: location || null,
          notifyEmail: notifyEmail ?? true,
          notifySms: notifySms ?? false,
          notifyPush: notifyPush ?? true,
        },
        select: userSelectFields,
      });

      if (req.user) {
        await prisma.activityLog.create({
          data: {
            userId: req.user.id, action: 'create', entity: 'User', entityId: user.id,
            details: `Created user "${user.name}" with role ${user.role}`,
          },
        });
      }

      res.status(201).json({ success: true, data: user });
    } catch (err: any) {
      console.error('POST /users error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create user' },
      });
    }
  },
);

router.patch(
  '/:id',
  authenticate,
  requireRole(['admin']),
  validate(updateUserSchema),
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

      const existing = await prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true },
      });
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }

      if (req.body.email && req.body.email !== existing.email) {
        const emailTaken = await prisma.user.findUnique({ where: { email: req.body.email } });
        if (emailTaken) {
          return res.status(409).json({
            success: false,
            error: { code: 'CONFLICT', message: 'A user with this email already exists' },
          });
        }
      }

      const updateData: Record<string, any> = {};
      const allowedFields = [
        'name', 'email', 'role', 'department', 'jobTitle', 'employeeId', 'contractType', 'bio',
        'phone', 'location', 'status', 'notifyEmail', 'notifySms', 'notifyPush',
      ];
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: userSelectFields,
      });

      if (req.user) {
        const changedFields = Object.keys(updateData).join(', ');
        await prisma.activityLog.create({
          data: {
            userId: req.user.id, action: 'update', entity: 'User', entityId: id,
            details: `Updated user "${user.name}" fields: ${changedFields}`,
            diffJson: updateData,
          },
        });
      }

      res.json({ success: true, data: user });
    } catch (err: any) {
      console.error('PATCH /users/:id error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update user' },
      });
    }
  },
);

router.delete(
  '/:id',
  authenticate,
  requireRole(['admin']),
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

      if (req.user && req.user.id === id) {
        return res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'You cannot delete your own account' },
        });
      }

      const existing = await prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true },
      });
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }

      const managedCount = await prisma.project.count({ where: { managerId: id } });
      if (managedCount > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'HAS_DEPENDENCIES',
            message: `Cannot delete user "${existing.name}" — they manage ${managedCount} project(s). Reassign projects first.`,
          },
        });
      }

      await prisma.$transaction(async (tx) => {
        await tx.projectTeam.deleteMany({ where: { userId: id } });
        await tx.review.deleteMany({ where: { userId: id } });
        await tx.ideaVote.deleteMany({ where: { userId: id } });
        await tx.idea.deleteMany({ where: { userId: id } });
        await tx.donation.deleteMany({ where: { userId: id } });
        await tx.activityLog.deleteMany({ where: { userId: id } });
        await tx.user.delete({ where: { id } });
      });

      if (req.user) {
        await prisma.activityLog.create({
          data: {
            userId: req.user.id, action: 'delete', entity: 'User', entityId: id,
            details: `Deleted user "${existing.name}"`,
          },
        });
      }

      res.json({
        success: true,
        data: { message: `User "${existing.name}" has been deleted` },
      });
    } catch (err: any) {
      console.error('DELETE /users/:id error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete user' },
      });
    }
  },
);

export default router;
