import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

const router = Router();

// GET /api/activity-logs — Query activity logs (admin/manager)
router.get('/', authenticate, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 25);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (req.query.userId) where.userId = req.query.userId;
    if (req.query.projectId) where.projectId = req.query.projectId;
    if (req.query.entity) where.entity = req.query.entity;
    if (req.query.action) where.action = req.query.action;
    if (req.query.type) where.type = req.query.type;
    if (req.query.search) {
      where.details = { contains: req.query.search as string, mode: 'insensitive' };
    }
    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) where.createdAt.gte = new Date(req.query.from as string);
      if (req.query.to) where.createdAt.lte = new Date(req.query.to as string);
    }

    const [items, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
          project: { select: { id: true, name: true } },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    res.json({ success: true, data: { items, page, total, totalPages } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

// GET /api/activity-logs/stats — Activity statistics
router.get('/stats', authenticate, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const [total, byEntity, byAction, recentCount] = await Promise.all([
      prisma.activityLog.count(),
      prisma.activityLog.groupBy({ by: ['entity'], _count: true, orderBy: { _count: { entity: 'desc' } } }),
      prisma.activityLog.groupBy({ by: ['action'], _count: true }),
      prisma.activityLog.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        last24h: recentCount,
        byEntity: byEntity.map(e => ({ entity: e.entity, count: e._count })),
        byAction: byAction.map(a => ({ action: a.action, count: a._count })),
      },
    });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

export default router;
