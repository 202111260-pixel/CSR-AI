import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();
router.use(authenticate);

const ORG_ID = 'default';

function serializeSettingValue(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function deserializeSettingValue(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// ─── Schemas ────────────────────────────────────────────────────────────────
const upsertSettingSchema = z.object({
  key: z.string().min(1).max(200),
  value: z.any(),
});

const bulkUpsertSchema = z.object({
  settings: z.array(z.object({
    key: z.string().min(1).max(200),
    value: z.any(),
  })),
});

// ─── GET / — Fetch all settings ─────────────────────────────────────────────
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await prisma.settings.findMany({
      where: { orgId: ORG_ID },
      orderBy: { key: 'asc' },
    });

    const settingsMap: Record<string, any> = {};
    for (const row of rows) {
      settingsMap[row.key] = deserializeSettingValue(row.value);
    }

    res.json({ success: true, data: settingsMap });
  } catch (error) {
    console.error('GET /settings error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch settings' },
    });
  }
});

// ─── GET /:key — Fetch single setting ───────────────────────────────────────
router.get('/:key', async (req: Request, res: Response) => {
  try {
    const key = req.params.key as string;
    const row = await prisma.settings.findUnique({
      where: { orgId_key: { orgId: ORG_ID, key } },
    });

    if (!row) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Setting "${key}" not found` },
      });
    }

  res.json({ success: true, data: { key: row.key, value: deserializeSettingValue(row.value) } });
  } catch (error) {
    console.error('GET /settings/:key error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch setting' },
    });
  }
});

// ─── PUT / — Bulk upsert settings ───────────────────────────────────────────
router.put(
  '/',
  requireRole(['admin', 'manager']),
  validate(bulkUpsertSchema),
  async (req: Request, res: Response) => {
    try {
      const { settings } = req.body;

      const results = await Promise.all(
        settings.map((s: { key: string; value: any }) =>
          prisma.settings.upsert({
            where: { orgId_key: { orgId: ORG_ID, key: s.key } },
            update: { value: serializeSettingValue(s.value) },
            create: { orgId: ORG_ID, key: s.key, value: serializeSettingValue(s.value) },
          })
        )
      );

      if (req.user) {
        await prisma.activityLog.create({
          data: {
            userId: req.user.id,
            action: 'update',
            entity: 'Settings',
            entityId: ORG_ID,
            details: `Updated ${settings.length} setting(s): ${settings.map((s: any) => s.key).join(', ')}`,
          },
        });
      }

      const map: Record<string, any> = {};
      for (const row of results) {
        map[row.key] = deserializeSettingValue(row.value);
      }

      res.json({ success: true, data: map });
    } catch (error) {
      console.error('PUT /settings error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to update settings' },
      });
    }
  }
);

// ─── PUT /:key — Upsert single setting ──────────────────────────────────────
router.put(
  '/:key',
  requireRole(['admin', 'manager']),
  async (req: Request, res: Response) => {
    try {
      const key = req.params.key as string;
      const { value } = req.body;

      const row = await prisma.settings.upsert({
        where: { orgId_key: { orgId: ORG_ID, key } },
        update: { value: serializeSettingValue(value) },
        create: { orgId: ORG_ID, key, value: serializeSettingValue(value) },
      });

      if (req.user) {
        await prisma.activityLog.create({
          data: {
            userId: req.user.id,
            action: 'update',
            entity: 'Settings',
            entityId: key,
            details: `Updated setting "${key}"`,
          },
        });
      }

      res.json({ success: true, data: { key: row.key, value: deserializeSettingValue(row.value) } });
    } catch (error) {
      console.error('PUT /settings/:key error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to update setting' },
      });
    }
  }
);

// ─── DELETE /:key — Delete single setting ────────────────────────────────────
router.delete(
  '/:key',
  requireRole(['admin']),
  async (req: Request, res: Response) => {
    try {
      const key = req.params.key as string;
      const existing = await prisma.settings.findUnique({
        where: { orgId_key: { orgId: ORG_ID, key } },
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Setting "${key}" not found` },
        });
      }

      await prisma.settings.delete({
        where: { orgId_key: { orgId: ORG_ID, key } },
      });

      if (req.user) {
        await prisma.activityLog.create({
          data: {
            userId: req.user.id,
            action: 'delete',
            entity: 'Settings',
            entityId: key,
            details: `Deleted setting "${key}"`,
          },
        });
      }

      res.json({ success: true, data: { message: `Setting "${key}" deleted` } });
    } catch (error) {
      console.error('DELETE /settings/:key error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to delete setting' },
      });
    }
  }
);

export default router;
