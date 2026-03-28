import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { requireProjectAccess } from '../middleware/projectAccess.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

const projectSchema = z.object({
  name: z.string().min(3).max(200),
  categoryId: z.string().uuid(),
  budget: z.number().positive(),
  location: z.string().min(2),
  startDate: z.string(),
  endDate: z.string(),
  description: z.string().optional(),
  region: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  objectives: z.array(z.string()).optional(),
  expectedOutputs: z.array(z.string()).optional(),
  coverImage: z.string().optional(),
  tags: z.array(z.string()).optional(),
  sdgGoals: z.array(z.number()).optional(),
  progress: z.number().min(0).max(100).optional(),
  managerId: z.string().uuid().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']).optional(),
});

const milestoneSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  status: z.enum(['completed', 'in_progress', 'pending']).optional(),
  date: z.string(),
});

const expenseSchema = z.object({
  amount: z.number().positive(),
  category: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['approved', 'pending', 'rejected']).optional(),
  date: z.string().optional(),
});

const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

// Partial schemas for PATCH (update) routes — whitelists allowed fields
const updateProjectSchema = projectSchema.partial();

const updateMilestoneSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  status: z.enum(['completed', 'in_progress', 'pending']).optional(),
  date: z.string().optional(),
  attachments: z.any().optional(),
});

const updateExpenseSchema = z.object({
  amount: z.number().positive().optional(),
  category: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['approved', 'pending', 'rejected']).optional(),
  date: z.string().optional(),
  invoiceUrl: z.string().optional(),
});

const updateTeamMemberSchema = z.object({
  role: z.string().min(1),
});

const updateBeneficiarySchema = z.object({
  count: z.number().int().positive().optional(),
  male: z.number().int().min(0).optional(),
  female: z.number().int().min(0).optional(),
  children: z.number().int().min(0).optional(),
  elderly: z.number().int().min(0).optional(),
  disabled: z.number().int().min(0).optional(),
  ageGroup: z.string().optional(),
  gender: z.string().optional(),
  description: z.string().optional(),
  impact: z.string().optional(),
});

const updateSuccessStorySchema = z.object({
  title: z.string().min(3).optional(),
  content: z.string().min(10).optional(),
  beforeImage: z.string().optional(),
  afterImage: z.string().optional(),
});

// Helper: build project with computed fields
async function enrichProject(project: any) {
  const expenseAgg = await prisma.expense.aggregate({
    where: { projectId: project.id, status: 'approved' },
    _sum: { amount: true },
  });
  const reviewAgg = await prisma.review.aggregate({
    where: { projectId: project.id },
    _avg: { rating: true },
    _count: true,
  });
  const beneficiaryAgg = await prisma.beneficiary.aggregate({
    where: { projectId: project.id },
    _sum: { count: true },
  });

  return {
    ...project,
    spent: expenseAgg._sum.amount || 0,
    avgRating: reviewAgg._avg.rating ? Math.round(reviewAgg._avg.rating * 10) / 10 : 0,
    totalReviews: reviewAgg._count || 0,
    beneficiaryCount: beneficiaryAgg._sum.count || 0,
    categoryName: project.category?.name,
    managerName: project.manager?.name,
  };
}

// GET /api/projects — List with pagination, filtering, search, sorting
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 12));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.categoryId) where.categoryId = req.query.categoryId;
    if (req.query.region) where.region = req.query.region;
    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search as string, mode: 'insensitive' } },
        { location: { contains: req.query.search as string, mode: 'insensitive' } },
        { description: { contains: req.query.search as string, mode: 'insensitive' } },
      ];
    }
    if (req.query.minBudget || req.query.maxBudget) {
      where.budget = {};
      if (req.query.minBudget) where.budget.gte = parseFloat(req.query.minBudget as string);
      if (req.query.maxBudget) where.budget.lte = parseFloat(req.query.maxBudget as string);
    }

    // Exclude archived by default unless specifically requested
    if (!req.query.status) {
      where.status = { not: 'archived' };
    }

    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';
    const orderBy: any = { [sortBy]: sortOrder };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: { select: { id: true, name: true, color: true, icon: true } },
          manager: { select: { id: true, name: true } },
          _count: { select: { reviews: true, milestones: true } },
        },
      }),
      prisma.project.count({ where }),
    ]);

    // Enrich with computed fields (batch for efficiency)
    const projectIds = projects.map(p => p.id);

    const [expenseSums, beneficiarySums, reviewAvgs] = await Promise.all([
      prisma.expense.groupBy({
        by: ['projectId'],
        where: { projectId: { in: projectIds }, status: 'approved' },
        _sum: { amount: true },
      }),
      prisma.beneficiary.groupBy({
        by: ['projectId'],
        where: { projectId: { in: projectIds } },
        _sum: { count: true },
      }),
      prisma.review.groupBy({
        by: ['projectId'],
        where: { projectId: { in: projectIds } },
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    const expenseMap = Object.fromEntries(expenseSums.map(e => [e.projectId, e._sum.amount || 0]));
    const beneficiaryMap = Object.fromEntries(beneficiarySums.map(b => [b.projectId, b._sum.count || 0]));
    const reviewMap = Object.fromEntries(reviewAvgs.map(r => [r.projectId, { avg: r._avg.rating || 0, count: r._count }]));

    const items = projects.map(p => ({
      ...p,
      spent: expenseMap[p.id] || 0,
      avgRating: reviewMap[p.id] ? Math.round((reviewMap[p.id].avg as number) * 10) / 10 : 0,
      totalReviews: reviewMap[p.id]?.count || 0,
      beneficiaryCount: beneficiaryMap[p.id] || 0,
      categoryName: p.category?.name,
      managerName: p.manager?.name,
    }));

    const totalPages = Math.ceil(total / limit);
    res.json({ success: true, data: { items, page, total, totalPages } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

// GET /api/projects/stats — Dashboard KPIs & aggregation
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const [
      totalProjects,
      statusCounts,
      categoryCounts,
      regionCounts,
      totalBudget,
      totalSpent,
      totalBeneficiaries,
      avgRating,
      recentProjects,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.project.groupBy({ by: ['status'], _count: true }),
      prisma.project.groupBy({ by: ['categoryId'], _count: true }),
      prisma.project.groupBy({ by: ['region'], _count: true, where: { region: { not: null } } }),
      prisma.project.aggregate({ _sum: { budget: true } }),
      prisma.expense.aggregate({ where: { status: 'approved' }, _sum: { amount: true } }),
      prisma.beneficiary.aggregate({ _sum: { count: true } }),
      prisma.review.aggregate({ _avg: { rating: true } }),
      prisma.project.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: { category: { select: { name: true, color: true } } },
      }),
    ]);

    // Get category names for categoryCounts
    const categoryIds = categoryCounts.map(c => c.categoryId);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, color: true },
    });
    const catMap = Object.fromEntries(categories.map(c => [c.id, c]));

    const statusMap = Object.fromEntries(statusCounts.map(s => [s.status, s._count]));

    res.json({
      success: true,
      data: {
        totalProjects,
        activeProjects: statusMap['active'] || 0,
        completedProjects: statusMap['completed'] || 0,
        planningProjects: statusMap['planning'] || 0,
        onHoldProjects: statusMap['on_hold'] || 0,
        totalBudget: totalBudget._sum.budget || 0,
        totalSpent: totalSpent._sum.amount || 0,
        totalBeneficiaries: totalBeneficiaries._sum.count || 0,
        avgRating: avgRating._avg.rating ? Math.round(avgRating._avg.rating * 10) / 10 : 0,
        projectsByStatus: statusCounts.map(s => ({ status: s.status, count: s._count })),
        projectsByCategory: categoryCounts.map(c => ({
          categoryId: c.categoryId,
          categoryName: catMap[c.categoryId]?.name || 'Unknown',
          color: catMap[c.categoryId]?.color || '#666',
          count: c._count,
        })),
        projectsByRegion: regionCounts.map(r => ({ region: r.region, count: r._count })),
        recentProjects,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

// GET /api/projects/map — Geographic data for map view
router.get('/map', authenticate, async (req: Request, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      where: { status: { not: 'archived' } },
      select: {
        id: true, name: true, status: true, budget: true, location: true,
        region: true, latitude: true, longitude: true, progress: true,
        description: true, endDate: true,
        category: { select: { name: true, color: true, icon: true } },
        _count: { select: { beneficiaries: true } },
      },
    });

    // Add spent for each
    const ids = projects.map(p => p.id);
    const expenseSums = await prisma.expense.groupBy({
      by: ['projectId'],
      where: { projectId: { in: ids }, status: 'approved' },
      _sum: { amount: true },
    });
    const expenseMap = Object.fromEntries(expenseSums.map(e => [e.projectId, e._sum.amount || 0]));

    const items = projects.map(p => {
      const spent = expenseMap[p.id] || 0;
      const budgetPct = p.budget > 0 ? (spent / p.budget) * 100 : 0;
      const risk = budgetPct > 90 ? 'critical' : budgetPct > 75 ? 'high' : budgetPct > 50 ? 'medium' : 'low';
      return {
        ...p,
        spent,
        categoryName: p.category?.name,
        beneficiaryCount: p._count?.beneficiaries || 0,
        risk,
        endDate: p.endDate?.toISOString().split('T')[0] || '',
      };
    });

    res.json({ success: true, data: items });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

// GET /api/projects/archived — Archived projects
router.get('/archived', authenticate, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 12);
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: { status: 'archived' },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: { category: { select: { name: true, color: true } } },
      }),
      prisma.project.count({ where: { status: 'archived' } }),
    ]);

    const totalPages = Math.ceil(total / limit);
    res.json({ success: true, data: { items: projects, page, total, totalPages } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

// GET /api/projects/:id — Full project detail
router.get('/:id', authenticate, requireProjectAccess, async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id as string },
      include: {
        category: true,
        manager: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
        milestones: { orderBy: { date: 'asc' } },
        expenses: { orderBy: { date: 'desc' } },
        beneficiaries: true,
        reviews: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
        },
        media: { orderBy: { createdAt: 'desc' } },
        documents: { orderBy: { createdAt: 'desc' } },
        successStories: true,
        team: {
          include: { user: { select: { id: true, name: true, avatarUrl: true, role: true } } },
        },
        activities: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, name: true } } },
        },
        alerts: { where: { resolvedAt: null }, orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    if (!project) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }

    const enriched = await enrichProject(project);

    // Related projects (same category, excluding self)
    const relatedProjects = await prisma.project.findMany({
      where: { categoryId: project.categoryId, id: { not: project.id }, status: { not: 'archived' } },
      take: 3,
      select: { id: true, name: true, status: true },
    });

    res.json({ success: true, data: { ...enriched, relatedProjects } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

// POST /api/projects — Create project
router.post('/', authenticate, requireRole(['admin', 'manager']), validate(projectSchema), async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.create({
      data: {
        ...req.body,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
        managerId: req.body.managerId || req.user!.id,
      },
      include: { category: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        projectId: project.id,
        action: 'create',
        entity: 'project',
        entityId: project.id,
        details: `Created project: ${project.name}`,
        type: 'create',
      },
    });

    res.status(201).json({ success: true, data: project });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

// PATCH /api/projects/:id — Update project
router.patch('/:id', authenticate, requireRole(['admin', 'manager']), validate(updateProjectSchema), async (req: Request, res: Response) => {
  try {
    const existing = await prisma.project.findUnique({ where: { id: req.params.id as string } });
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }

    // Status transition validation
    if (req.body.status && req.body.status !== existing.status) {
      const ALLOWED_TRANSITIONS: Record<string, string[]> = {
        planning:  ['active', 'archived'],
        active:    ['on_hold', 'completed', 'archived'],
        on_hold:   ['active', 'archived'],
        completed: ['archived'],
        archived:  [], // restore via dedicated endpoint only
      };
      const allowed = ALLOWED_TRANSITIONS[existing.status] || [];
      if (!allowed.includes(req.body.status)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TRANSITION',
            message: `Cannot transition from '${existing.status}' to '${req.body.status}'. Allowed: ${allowed.length ? allowed.join(', ') : 'none (use restore endpoint)'}`,
          },
        });
      }
    }

    const data: any = { ...req.body };
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    const project = await prisma.project.update({
      where: { id: req.params.id as string },
      data,
      include: { category: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        projectId: project.id,
        action: 'update',
        entity: 'project',
        entityId: project.id,
        details: `Updated project: ${project.name}`,
        type: 'update',
      },
    });

    res.json({ success: true, data: project });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

// DELETE /api/projects/:id — Soft delete (archive)
router.delete('/:id', authenticate, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.update({
      where: { id: req.params.id as string },
      data: { status: 'archived' },
    });
    res.json({ success: true, data: { message: 'Project archived' } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

// PATCH /api/projects/:id/restore — Restore from archive
router.patch('/:id/restore', authenticate, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.update({
      where: { id: req.params.id as string },
      data: { status: 'planning' },
    });
    res.json({ success: true, data: project });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

// ─── Milestones ──────────────────────────────────────
router.post('/:id/milestones', authenticate, requireRole(['admin', 'manager']), validate(milestoneSchema), async (req: Request, res: Response) => {
  try {
    const milestone = await prisma.milestone.create({
      data: { ...req.body, date: new Date(req.body.date), projectId: req.params.id as string },
    });
    res.status(201).json({ success: true, data: milestone });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

router.patch('/:id/milestones/:milestoneId', authenticate, requireRole(['admin', 'manager']), validate(updateMilestoneSchema), async (req: Request, res: Response) => {
  try {
    const data: any = { ...req.body };
    if (data.date) data.date = new Date(data.date);
    const milestone = await prisma.milestone.update({
      where: { id: req.params.milestoneId as string },
      data,
    });
    res.json({ success: true, data: milestone });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

router.delete('/:id/milestones/:milestoneId', authenticate, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    await prisma.milestone.delete({ where: { id: req.params.milestoneId as string } });
    res.json({ success: true, data: { message: 'Milestone deleted' } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

// ─── Expenses ────────────────────────────────────────
router.get('/:id/expenses', authenticate, async (req: Request, res: Response) => {
  try {
    const expenses = await prisma.expense.findMany({
      where: { projectId: req.params.id as string },
      orderBy: { date: 'desc' },
    });
    res.json({ success: true, data: { items: expenses, page: 1, total: expenses.length, totalPages: 1 } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

router.post('/:id/expenses', authenticate, requireRole(['admin', 'manager', 'employee']), validate(expenseSchema), async (req: Request, res: Response) => {
  try {
    const expense = await prisma.expense.create({
      data: {
        ...req.body,
        projectId: req.params.id as string,
        date: req.body.date ? new Date(req.body.date) : new Date(),
        approvedBy: req.user!.id,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        projectId: req.params.id as string,
        action: 'create',
        entity: 'expense',
        entityId: expense.id,
        details: `Added expense: ${expense.category} - ${expense.amount}`,
        type: 'expense',
      },
    });

    res.status(201).json({ success: true, data: expense });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

router.patch('/:id/expenses/:expenseId', authenticate, requireRole(['admin', 'manager']), validate(updateExpenseSchema), async (req: Request, res: Response) => {
  try {
    const data: any = { ...req.body };
    if (data.date) data.date = new Date(data.date);
    const expense = await prisma.expense.update({ where: { id: req.params.expenseId as string }, data });
    res.json({ success: true, data: expense });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

router.delete('/:id/expenses/:expenseId', authenticate, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    await prisma.expense.delete({ where: { id: req.params.expenseId as string } });
    res.json({ success: true, data: { message: 'Expense deleted' } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

// ─── Reviews ─────────────────────────────────────────
router.get('/:id/reviews', authenticate, async (req: Request, res: Response) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { projectId: req.params.id as string },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: { items: reviews, page: 1, total: reviews.length, totalPages: 1 } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

router.post('/:id/reviews', authenticate, validate(reviewSchema), async (req: Request, res: Response) => {
  try {
    const review = await prisma.review.create({
      data: { ...req.body, projectId: req.params.id as string, userId: req.user!.id },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        projectId: req.params.id as string,
        action: 'create',
        entity: 'review',
        entityId: review.id,
        details: `Added review: ${review.rating}/5`,
        type: 'review',
      },
    });

    res.status(201).json({ success: true, data: review });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

// ─── Team Members ─────────────────────────────────────────────────────

const teamMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.string().min(1),
});

router.get('/:id/team', authenticate, async (req: Request, res: Response) => {
  try {
    const team = await prisma.projectTeam.findMany({
      where: { projectId: req.params.id as string },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true, department: true } } },
    });
    res.json({ success: true, data: { items: team, page: 1, total: team.length, totalPages: 1 } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

router.post('/:id/team', authenticate, requireRole(['admin', 'manager']), validate(teamMemberSchema), async (req: Request, res: Response) => {
  try {
    const member = await prisma.projectTeam.create({
      data: { projectId: req.params.id as string, userId: req.body.userId, role: req.body.role },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } } },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        projectId: req.params.id as string,
        action: 'create',
        entity: 'team_member',
        entityId: member.id,
        details: `Added team member: ${member.user.name} as ${req.body.role}`,
        type: 'team',
      },
    });

    res.status(201).json({ success: true, data: member });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'User is already a team member' } });
    }
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

router.patch('/:id/team/:memberId', authenticate, requireRole(['admin', 'manager']), validate(updateTeamMemberSchema), async (req: Request, res: Response) => {
  try {
    const member = await prisma.projectTeam.update({
      where: { id: req.params.memberId as string },
      data: { role: req.body.role },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
    res.json({ success: true, data: member });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

router.delete('/:id/team/:memberId', authenticate, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    await prisma.projectTeam.delete({ where: { id: req.params.memberId as string } });
    res.json({ success: true, data: { message: 'Team member removed' } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

// ─── Beneficiaries ────────────────────────────────────────────────────

const beneficiarySchema = z.object({
  count: z.number().int().positive(),
  male: z.number().int().min(0).optional(),
  female: z.number().int().min(0).optional(),
  children: z.number().int().min(0).optional(),
  elderly: z.number().int().min(0).optional(),
  disabled: z.number().int().min(0).optional(),
  ageGroup: z.string().optional(),
  gender: z.string().optional(),
  description: z.string().optional(),
  impact: z.string().optional(),
});

router.get('/:id/beneficiaries', authenticate, async (req: Request, res: Response) => {
  try {
    const items = await prisma.beneficiary.findMany({ where: { projectId: req.params.id as string } });
    res.json({ success: true, data: { items, page: 1, total: items.length, totalPages: 1 } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

router.post('/:id/beneficiaries', authenticate, requireRole(['admin', 'manager', 'employee']), validate(beneficiarySchema), async (req: Request, res: Response) => {
  try {
    const item = await prisma.beneficiary.create({
      data: { ...req.body, projectId: req.params.id as string },
    });
    res.status(201).json({ success: true, data: item });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

router.patch('/:id/beneficiaries/:beneficiaryId', authenticate, requireRole(['admin', 'manager']), validate(updateBeneficiarySchema), async (req: Request, res: Response) => {
  try {
    const item = await prisma.beneficiary.update({
      where: { id: req.params.beneficiaryId as string },
      data: req.body,
    });
    res.json({ success: true, data: item });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

router.delete('/:id/beneficiaries/:beneficiaryId', authenticate, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    await prisma.beneficiary.delete({ where: { id: req.params.beneficiaryId as string } });
    res.json({ success: true, data: { message: 'Beneficiary record deleted' } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

// ─── Documents ────────────────────────────────────────────────────────

const documentSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  size: z.number().int().min(0).optional(),
  url: z.string().min(1),
  uploadedBy: z.string().optional(),
});

router.get('/:id/documents', authenticate, async (req: Request, res: Response) => {
  try {
    const items = await prisma.document.findMany({
      where: { projectId: req.params.id as string },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: { items, page: 1, total: items.length, totalPages: 1 } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

router.post('/:id/documents', authenticate, requireRole(['admin', 'manager', 'employee']), validate(documentSchema), async (req: Request, res: Response) => {
  try {
    const doc = await prisma.document.create({
      data: { ...req.body, projectId: req.params.id as string, uploadedBy: req.body.uploadedBy || req.user!.id },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        projectId: req.params.id as string,
        action: 'create',
        entity: 'document',
        entityId: doc.id,
        details: `Uploaded document: ${doc.name}`,
        type: 'document',
      },
    });

    res.status(201).json({ success: true, data: doc });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

router.delete('/:id/documents/:docId', authenticate, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    await prisma.document.delete({ where: { id: req.params.docId as string } });
    res.json({ success: true, data: { message: 'Document deleted' } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

// ─── Media ────────────────────────────────────────────────────────────

const mediaSchema = z.object({
  url: z.string().min(1),
  type: z.string().min(1),
  thumbnail: z.string().optional(),
  caption: z.string().optional(),
  category: z.string().optional(),
  phase: z.string().optional(),
});

router.get('/:id/media', authenticate, async (req: Request, res: Response) => {
  try {
    const items = await prisma.media.findMany({
      where: { projectId: req.params.id as string },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: { items, page: 1, total: items.length, totalPages: 1 } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

router.post('/:id/media', authenticate, requireRole(['admin', 'manager', 'employee']), validate(mediaSchema), async (req: Request, res: Response) => {
  try {
    const item = await prisma.media.create({
      data: { ...req.body, projectId: req.params.id as string },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        projectId: req.params.id as string,
        action: 'create',
        entity: 'media',
        entityId: item.id,
        details: `Added media: ${item.type}`,
        type: 'media',
      },
    });

    res.status(201).json({ success: true, data: item });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

router.delete('/:id/media/:mediaId', authenticate, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    await prisma.media.delete({ where: { id: req.params.mediaId as string } });
    res.json({ success: true, data: { message: 'Media deleted' } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

// ─── Success Stories ──────────────────────────────────────────────────

const successStorySchema = z.object({
  title: z.string().min(3),
  content: z.string().min(10),
  beforeImage: z.string().optional(),
  afterImage: z.string().optional(),
});

router.get('/:id/success-stories', authenticate, async (req: Request, res: Response) => {
  try {
    const items = await prisma.successStory.findMany({
      where: { projectId: req.params.id as string },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: { items, page: 1, total: items.length, totalPages: 1 } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

router.post('/:id/success-stories', authenticate, requireRole(['admin', 'manager']), validate(successStorySchema), async (req: Request, res: Response) => {
  try {
    const story = await prisma.successStory.create({
      data: { ...req.body, projectId: req.params.id as string },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        projectId: req.params.id as string,
        action: 'create',
        entity: 'success_story',
        entityId: story.id,
        details: `Created success story: ${story.title}`,
        type: 'story',
      },
    });

    res.status(201).json({ success: true, data: story });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

router.patch('/:id/success-stories/:storyId', authenticate, requireRole(['admin', 'manager']), validate(updateSuccessStorySchema), async (req: Request, res: Response) => {
  try {
    const story = await prisma.successStory.update({
      where: { id: req.params.storyId as string },
      data: req.body,
    });
    res.json({ success: true, data: story });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

router.delete('/:id/success-stories/:storyId', authenticate, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    await prisma.successStory.delete({ where: { id: req.params.storyId as string } });
    res.json({ success: true, data: { message: 'Success story deleted' } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

export default router;
