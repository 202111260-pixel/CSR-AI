import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { scanProjectRisks, generateAIInsights } from '../services/smartNotificationService.js';

const router = Router();

// POST /api/notifications/scan — Trigger smart risk scan + AI insights (admin/manager only)
// Must be before /:id routes to avoid param matching
router.post('/scan', authenticate, requireRole(['admin', 'manager']), async (_req: Request, res: Response) => {
  try {
    const [riskResult, insightResult] = await Promise.all([
      scanProjectRisks(),
      generateAIInsights(),
    ]);

    res.json({
      success: true,
      data: {
        riskScan: {
          projectsScanned: riskResult.scanned,
          findingsCount: riskResult.findings.length,
          alertsCreated: riskResult.alertsCreated,
          findings: riskResult.findings,
        },
        aiInsights: {
          insightsGenerated: insightResult.insights.length,
          insights: insightResult.insights,
        },
        totalNotificationsSent: riskResult.notificationsSent + insightResult.notificationsSent,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: { code: 'SCAN_ERROR', message: 'An unexpected error occurred' } });
  }
});

// GET /api/notifications — List user notifications
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const where: any = { userId: req.user!.id };
    if (req.query.read === 'true') where.read = true;
    if (req.query.read === 'false') where.read = false;

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user!.id, read: false } }),
    ]);

    const totalPages = Math.ceil(total / limit);
    res.json({ success: true, data: { items, page, total, totalPages, unreadCount } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

// PATCH /api/notifications/:id/read — Mark one as read
router.patch('/:id/read', authenticate, async (req: Request, res: Response) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id as string },
      data: { read: true },
    });
    res.json({ success: true, data: notification });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

// POST /api/notifications/read-all — Mark all as read
router.post('/read-all', authenticate, async (req: Request, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true },
    });
    res.json({ success: true, data: { message: 'All notifications marked as read' } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

// DELETE /api/notifications/:id — Delete a notification
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    await prisma.notification.delete({ where: { id: req.params.id as string } });
    res.json({ success: true, data: { message: 'Notification deleted' } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

export default router;
