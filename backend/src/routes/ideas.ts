import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { getLastNMonths } from '../utils/dateHelpers.js';

const router = Router();
router.use(authenticate);

// --- Validation Schemas ---

const createIdeaSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20),
  nlpCategory: z.string().optional(),
});

const updateIdeaSchema = z.object({
  status: z.enum(['pending', 'under_review', 'approved', 'rejected']).optional(),
  nlpCategory: z.string().nullable().optional(),
});

// --- GET /stats - Idea KPIs (must be before /:id) ---

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const sixMonthsAgo = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1);

    const [totalIdeas, byStatus, topVoted, recentIdeas, recentForTrend] = await Promise.all([
      prisma.idea.count(),
      prisma.idea.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.idea.findMany({
        orderBy: { votes: 'desc' },
        take: 5,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.idea.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.idea.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {
      pending: 0,
      under_review: 0,
      approved: 0,
      rejected: 0,
    };
    for (const row of byStatus) {
      statusCounts[row.status] = row._count.id;
    }

    const months = getLastNMonths(6);
    const trend = months.map(({ start, end, label }) => {
      const count = recentForTrend.filter(
        (i) => i.createdAt >= start && i.createdAt <= end
      ).length;
      return { month: label, count };
    });

    res.json({
      success: true,
      data: {
        totalIdeas,
        byStatus: statusCounts,
        topVoted,
        recentIdeas,
        trend,
      },
    });
  } catch (error) {
    console.error('GET /ideas/stats error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch idea stats' } });
  }
});

// --- GET /leaderboard - Top idea contributors (must be before /:id) ---

router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const limitParam = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));

    const ideaGroups = await prisma.idea.groupBy({
      by: ['userId'],
      _count: { id: true },
      _sum: { votes: true },
      orderBy: { _sum: { votes: 'desc' } },
      take: limitParam,
    });

    const userIds = ideaGroups.map((row) => row.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, department: true, avatarUrl: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const entries = ideaGroups.map((row, index) => {
      const user = userMap.get(row.userId);
      return {
        rank: index + 1,
        userId: row.userId,
        name: user?.name || 'Unknown',
        email: user?.email || '',
        department: user?.department || null,
        avatarUrl: user?.avatarUrl || null,
        totalVotesReceived: row._sum.votes || 0,
        ideaCount: row._count.id,
      };
    });

    res.json({ success: true, data: entries });
  } catch (error) {
    console.error('GET /ideas/leaderboard error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch leaderboard' } });
  }
});
// --- GET / - List ideas (paginated, search, filter, sort) ---

router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const tab = req.query.tab as string | undefined;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

    const where: any = {};

    // Tab-based filtering
    if (tab === 'my_ideas' && req.user?.id) {
      where.userId = req.user.id;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { nlpCategory: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status && ['pending', 'under_review', 'approved', 'rejected'].includes(status)) {
      where.status = status;
    }

    let orderBy: any;
    // top_voted tab forces sort by votes descending
    if (tab === 'top_voted') {
      orderBy = { votes: 'desc' };
    } else {
      switch (sortBy) {
        case 'votes':
          orderBy = { votes: sortOrder };
          break;
        case 'createdAt':
          orderBy = { createdAt: sortOrder };
          break;
        case 'title':
          orderBy = { title: sortOrder };
          break;
        default:
          orderBy = { votes: 'desc' };
      }
    }

    const [items, total] = await Promise.all([
      prisma.idea.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          _count: { select: { ideaVotes: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.idea.count({ where }),
    ]);

    const currentUserId = req.user?.id;
    let userVoteSet = new Set<string>();

    if (currentUserId && items.length > 0) {
      const ideaIds = items.map((i) => i.id);
      const userVotes = await prisma.ideaVote.findMany({
        where: { ideaId: { in: ideaIds }, userId: currentUserId },
        select: { ideaId: true },
      });
      userVoteSet = new Set(userVotes.map((v) => v.ideaId));
    }

    const enriched = items.map((item) => {
      const { _count, ...rest } = item;
      return {
        ...rest,
        votes: _count.ideaVotes,
        hasVoted: userVoteSet.has(item.id),
      };
    });

    const totalPages = Math.ceil(total / limit);
    res.json({ success: true, data: { items: enriched, page, total, totalPages } });
  } catch (error) {
    console.error('GET /ideas error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch ideas' } });
  }
});

// --- GET /:id - Full idea detail ---

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const idea = await prisma.idea.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, department: true } },
        ideaVotes: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
          orderBy: { user: { name: 'asc' } },
        },
      },
    });

    if (!idea) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Idea not found' } });
      return;
    }

    const currentUserId = req.user?.id;
    const hasVoted = currentUserId
      ? idea.ideaVotes.some((v) => v.userId === currentUserId)
      : false;

    res.json({
      success: true,
      data: {
        ...idea,
        votes: idea.ideaVotes.length,
        hasVoted,
      },
    });
  } catch (error) {
    console.error('GET /ideas/:id error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch idea' } });
  }
});
// --- POST / - Create idea (any authenticated user) ---

router.post('/', validate(createIdeaSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    const { title, description, nlpCategory } = req.body;

    const idea = await prisma.idea.create({
      data: {
        userId: req.user.id,
        title,
        description,
        nlpCategory: nlpCategory || null,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'create',
        entity: 'Idea',
        entityId: idea.id,
        details: `Created idea "${idea.title}"`,
      },
    });

    res.status(201).json({ success: true, data: { ...idea, votes: 0, hasVoted: false } });
  } catch (error) {
    console.error('POST /ideas error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create idea' } });
  }
});

// --- PATCH /:id - Update idea status/nlpCategory (admin/manager only) ---

router.patch('/:id', requireRole(['admin', 'manager']), validate(updateIdeaSchema), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.idea.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Idea not found' } });
      return;
    }

    const updateData: Record<string, any> = {};
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.nlpCategory !== undefined) updateData.nlpCategory = req.body.nlpCategory;

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ success: false, error: { code: 'NO_CHANGES', message: 'No valid fields to update' } });
      return;
    }

    const updated = await prisma.idea.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    const changedFields = Object.keys(updateData).join(', ');
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'update',
        entity: 'Idea',
        entityId: id,
        details: `Updated idea "${updated.title}" fields: ${changedFields}`,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('PATCH /ideas/:id error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update idea' } });
  }
});
// --- DELETE /:id - Delete idea (admin only, or idea owner) ---

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    const id = req.params.id as string;

    const existing = await prisma.idea.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Idea not found' } });
      return;
    }

    const isOwner = existing.userId === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only delete your own ideas' } });
      return;
    }

    // Prisma onDelete: Cascade handles IdeaVote deletion automatically
    await prisma.idea.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'delete',
        entity: 'Idea',
        entityId: id,
        details: `Deleted idea "${existing.title}"`,
      },
    });

    res.json({ success: true, data: { message: 'Idea deleted successfully' } });
  } catch (error) {
    console.error('DELETE /ideas/:id error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete idea' } });
  }
});

// --- POST /:id/vote - Toggle vote (any authenticated user) ---

router.post('/:id/vote', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    const ideaId = req.params.id as string;
    const userId = req.user.id;

    const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
    if (!idea) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Idea not found' } });
      return;
    }

    const existingVote = await prisma.ideaVote.findUnique({
      where: { ideaId_userId: { ideaId, userId } },
    });

    let voted: boolean;

    if (existingVote) {
      // Remove vote
      await prisma.ideaVote.delete({
        where: { ideaId_userId: { ideaId, userId } },
      });
      await prisma.idea.update({
        where: { id: ideaId },
        data: { votes: { decrement: 1 } },
      });
      voted = false;
    } else {
      // Add vote
      await prisma.ideaVote.create({
        data: { ideaId, userId },
      });
      await prisma.idea.update({
        where: { id: ideaId },
        data: { votes: { increment: 1 } },
      });
      voted = true;
    }

    const updated = await prisma.idea.findUnique({
      where: { id: ideaId },
      select: { id: true, votes: true },
    });

    res.json({
      success: true,
      data: {
        ideaId,
        voted,
        votes: updated?.votes ?? 0,
      },
    });
  } catch (error) {
    console.error('POST /ideas/:id/vote error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to toggle vote' } });
  }
});

export default router;
