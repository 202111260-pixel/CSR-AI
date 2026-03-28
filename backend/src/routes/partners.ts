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

const createPartnerSchema = z.object({
  name: z.string().min(2).max(200),
  type: z.string().min(1),
  supportArea: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  totalContribution: z.number().min(0).default(0),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.string().default('active'),
  projectsCount: z.number().int().min(0).default(0),
});

const updatePartnerSchema = createPartnerSchema.partial();

const createDonationSchema = z.object({
  partnerId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  challengeId: z.string().uuid().optional().nullable(),
  amount: z.number().positive(),
  type: z.string().min(1),
});

const donationPreferencesSchema = z.object({
  salaryRoundingEnabled: z.boolean().optional(),
  monthlyDonationEnabled: z.boolean().optional(),
  companyMatchEnabled: z.boolean().optional(),
  monthlyDonationAmount: z.number().min(1).max(100000).nullable().optional(),
});

const createChallengeSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(3).max(2000),
  goal: z.number().positive(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime(),
  rewards: z.array(z.object({
    title: z.string().min(2).max(100),
    condition: z.string().min(2).max(200),
    icon: z.string().min(1).max(50).default('Award'),
    color: z.string().optional(),
  })).optional(),
});

const updateChallengeSchema = createChallengeSchema.partial().extend({
  status: z.enum(['active', 'completed', 'failed']).optional(),
  winner: z.string().max(200).nullable().optional(),
});

const finalizeChallengeSchema = z.object({
  result: z.enum(['completed', 'failed']),
  winner: z.string().max(200).nullable().optional(),
});

const challengeRewardSchema = z.object({
  title: z.string().min(2).max(100),
  condition: z.string().min(2).max(200),
  icon: z.string().min(1).max(50).default('Award'),
  color: z.string().optional(),
});

async function computeChallengeStats(challengeId: string) {
  const [sumAgg, topRows, participants] = await Promise.all([
    prisma.donation.aggregate({ where: { challengeId }, _sum: { amount: true } }),
    prisma.donation.groupBy({
      by: ['userId'],
      where: { challengeId, userId: { not: null } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5,
    }),
    prisma.donation.groupBy({ by: ['userId'], where: { challengeId, userId: { not: null } } }),
  ]);

  const userIds = topRows.map((row) => row.userId).filter(Boolean) as string[];
  const users = userIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const topDonors = topRows.map((row) => {
    const user = row.userId ? userMap.get(row.userId) : null;
    const name = user?.name || 'Anonymous';
    const avatar = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
    return {
      name,
      amount: Math.round((row._sum.amount || 0) * 100) / 100,
      avatar,
    };
  });

  return {
    collected: Math.round((sumAgg._sum.amount || 0) * 100) / 100,
    participants: participants.length,
    topDonors,
  };
}

// --- GET / - List partners (paginated, search, filter) ---

router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const search = req.query.search as string | undefined;
    const type = req.query.type as string | undefined;
    const status = req.query.status as string | undefined;
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { supportArea: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (type) where.type = type;
    if (status) where.status = status;
    const [items, total] = await Promise.all([
      prisma.partner.findMany({
        where,
        include: { donations: { select: { amount: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.partner.count({ where }),
    ]);
    const enriched = items.map((p) => {
      const donationTotal = p.donations.reduce((sum, d) => sum + d.amount, 0);
      const { donations, ...rest } = p;
      // Override stale projectsCount with live donation count from DB
      return { ...rest, donationTotal, donationCount: donations.length, projectsCount: donations.length };
    });
    const totalPages = Math.ceil(total / limit);
    res.json({ success: true, data: { items: enriched, page, total, totalPages } });
  } catch (error) {
    console.error('GET /partners error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch partners' } });
  }
});
// --- GET /stats - Partner KPIs ---

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [totalPartners, activePartners, contributionAgg, partnersByType, recentDonations] = await Promise.all([
      prisma.partner.count(),
      prisma.partner.count({ where: { status: 'active' } }),
      prisma.partner.aggregate({ _sum: { totalContribution: true } }),
      prisma.partner.groupBy({ by: ['type'], _count: { id: true }, _sum: { totalContribution: true } }),
      prisma.donation.findMany({
        where: { createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1) } },
        select: { amount: true, createdAt: true },
      }),
    ]);
    const totalSupport = contributionAgg._sum.totalContribution || 0;
    const jointProjects = await prisma.donation.count({
      where: { partner: { status: 'active' } },
    });
    const distributionByType = partnersByType.map((row) => ({
      type: row.type,
      count: row._count.id,
      contribution: row._sum.totalContribution || 0,
    }));
    const months = getLastNMonths(6);
    const contributionTrend = months.map(({ start, end, label }) => {
      const md = recentDonations.filter((d) => d.createdAt >= start && d.createdAt <= end);
      const amount = md.reduce((sum, d) => sum + d.amount, 0);
      return { month: label, amount: Math.round(amount * 100) / 100, count: md.length };
    });
    res.json({
      success: true,
      data: { totalPartners, activePartners, totalSupport, jointProjects, distributionByType, contributionTrend },
    });
  } catch (error) {
    console.error('GET /partners/stats error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch partner stats' } });
  }
});

// --- GET /donations/leaderboard - Employee donation leaderboard ---

router.get('/donations/leaderboard', async (req: Request, res: Response) => {
  try {
    const limitParam = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const leaderboard = await prisma.donation.groupBy({
      by: ['userId'],
      where: { userId: { not: null } },
      _sum: { amount: true },
      _count: { id: true },
      _min: { createdAt: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: limitParam,
    });
    const userIds = leaderboard.map((row) => row.userId).filter(Boolean) as string[];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, department: true, avatarUrl: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    const now = new Date();
    const entries = leaderboard.map((row, index) => {
      const user = userMap.get(row.userId!);
      const firstDonation = row._min.createdAt;
      const monthsActive = firstDonation
        ? Math.max(1, Math.ceil((now.getTime() - firstDonation.getTime()) / (30.44 * 24 * 60 * 60 * 1000)))
        : 1;
      return {
        rank: index + 1,
        userId: row.userId,
        name: user?.name || 'Unknown',
        email: user?.email || '',
        department: user?.department || null,
        avatarUrl: user?.avatarUrl || null,
        totalDonated: Math.round((row._sum.amount || 0) * 100) / 100,
        donationCount: row._count.id,
        monthsActive,
      };
    });
    res.json({ success: true, data: entries });
  } catch (error) {
    console.error('GET /partners/donations/leaderboard error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch leaderboard' } });
  }
});
// --- GET /donations/stats - Donation KPIs ---

router.get('/donations/stats', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const [totalAgg, thisMonthAgg, thisYearAgg, byCategory, recentDonations] = await Promise.all([
      prisma.donation.aggregate({ _sum: { amount: true } }),
      prisma.donation.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: startOfMonth } } }),
      prisma.donation.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: startOfYear } } }),
      prisma.donation.groupBy({ by: ['type'], _sum: { amount: true }, _count: { id: true } }),
      prisma.donation.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { amount: true, createdAt: true },
      }),
    ]);
    const totalDonated = Math.round((totalAgg._sum.amount || 0) * 100) / 100;
    const thisMonth = Math.round((thisMonthAgg._sum.amount || 0) * 100) / 100;
    const thisYear = Math.round((thisYearAgg._sum.amount || 0) * 100) / 100;
    const byCategoryData = byCategory.map((row) => ({
      type: row.type,
      amount: Math.round((row._sum.amount || 0) * 100) / 100,
      count: row._count.id,
    }));
    const months = getLastNMonths(6);
    const trend = months.map(({ start, end, label }) => {
      const md = recentDonations.filter((d) => d.createdAt >= start && d.createdAt <= end);
      const amount = md.reduce((sum, d) => sum + d.amount, 0);
      return { month: label, amount: Math.round(amount * 100) / 100, count: md.length };
    });
    res.json({
      success: true,
      data: { totalDonated, thisMonth, thisYear, byCategory: byCategoryData, trend },
    });
  } catch (error) {
    console.error('GET /partners/donations/stats error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch donation stats' } });
  }
});

// --- GET /donations/preferences - Current user's micro-donation preferences ---

router.get('/donations/preferences', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        salaryRoundingEnabled: true,
        monthlyDonationEnabled: true,
        companyMatchEnabled: true,
        monthlyDonationAmount: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('GET /partners/donations/preferences error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch donation preferences' } });
  }
});

// --- PATCH /donations/preferences - Update current user's micro-donation preferences ---

router.patch('/donations/preferences', validate(donationPreferencesSchema), async (req: Request, res: Response) => {
  try {
    const payload = req.body as z.infer<typeof donationPreferencesSchema>;
    const data: Record<string, unknown> = {};

    if (payload.salaryRoundingEnabled !== undefined) data.salaryRoundingEnabled = payload.salaryRoundingEnabled;
    if (payload.monthlyDonationEnabled !== undefined) data.monthlyDonationEnabled = payload.monthlyDonationEnabled;
    if (payload.companyMatchEnabled !== undefined) data.companyMatchEnabled = payload.companyMatchEnabled;
    if (payload.monthlyDonationAmount !== undefined) data.monthlyDonationAmount = payload.monthlyDonationAmount;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data,
      select: {
        salaryRoundingEnabled: true,
        monthlyDonationEnabled: true,
        companyMatchEnabled: true,
        monthlyDonationAmount: true,
      },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('PATCH /partners/donations/preferences error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update donation preferences' } });
  }
});

// --- GET /donations/by-user - Current user's supported projects ---

router.get('/donations/by-user', async (req: Request, res: Response) => {
  try {
    const donations = await prisma.donation.findMany({
      where: { userId: req.user!.id, projectId: { not: null } },
      orderBy: { createdAt: 'desc' },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            progress: true,
            category: { select: { name: true } },
          },
        },
      },
    });

    const grouped = new Map<string, { id: string; name: string; category: string; progress: number; amount: number; date: string }>();

    for (const d of donations) {
      if (!d.project) continue;
      const key = d.project.id;
      const existing = grouped.get(key);
      if (existing) {
        existing.amount += d.amount;
        if (new Date(d.createdAt) > new Date(existing.date)) {
          existing.date = d.createdAt.toISOString().split('T')[0];
        }
      } else {
        grouped.set(key, {
          id: d.project.id,
          name: d.project.name,
          category: d.project.category?.name || 'Unknown',
          progress: Math.round(d.project.progress || 0),
          amount: d.amount,
          date: d.createdAt.toISOString().split('T')[0],
        });
      }
    }

    res.json({ success: true, data: Array.from(grouped.values()) });
  } catch (error) {
    console.error('GET /partners/donations/by-user error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch user donations' } });
  }
});

// --- GET /challenges/current - active challenge with computed stats ---

router.get('/challenges/current', async (_req: Request, res: Response) => {
  try {
    const challenge = await prisma.challenge.findFirst({
      where: { status: 'active' },
      include: { rewards: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      res.json({ success: true, data: null });
      return;
    }

    const stats = await computeChallengeStats(challenge.id);
    const updated = await prisma.challenge.update({
      where: { id: challenge.id },
      data: {
        collected: stats.collected,
        participants: stats.participants,
        topDonorsSnapshot: stats.topDonors,
      },
      include: { rewards: true },
    });

    res.json({
      success: true,
      data: {
        ...updated,
        topDonors: stats.topDonors,
      },
    });
  } catch (error) {
    console.error('GET /partners/challenges/current error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch current challenge' } });
  }
});

// --- GET /challenges/past - completed/failed challenge history ---

router.get('/challenges/past', async (_req: Request, res: Response) => {
  try {
    const challenges = await prisma.challenge.findMany({
      where: { status: { in: ['completed', 'failed'] } },
      orderBy: { endDate: 'desc' },
      include: { rewards: true },
    });

    const transformed = challenges.map((ch) => ({
      id: ch.id,
      title: ch.title,
      endDate: ch.endDate,
      goal: ch.goal,
      collected: ch.collected,
      result: ch.status === 'completed' ? 'success' : 'failed',
      winner: ch.winner || 'N/A',
      participants: ch.participants,
      rewards: ch.rewards,
    }));

    res.json({ success: true, data: transformed });
  } catch (error) {
    console.error('GET /partners/challenges/past error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch past challenges' } });
  }
});

// --- GET /challenges/:id/trend - monthly donation trend for a challenge ---

router.get('/challenges/:id/trend', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const challenge = await prisma.challenge.findUnique({ where: { id }, select: { id: true } });
    if (!challenge) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Challenge not found' } });
      return;
    }

    const donations = await prisma.donation.findMany({
      where: { challengeId: id },
      select: { amount: true, createdAt: true },
    });

    const months = getLastNMonths(6);
    const trend = months.map(({ start, end, label }) => {
      const monthDonations = donations.filter((d) => d.createdAt >= start && d.createdAt <= end);
      const amount = monthDonations.reduce((sum, d) => sum + d.amount, 0);
      return { month: label, amount: Math.round(amount * 100) / 100 };
    });

    res.json({ success: true, data: trend });
  } catch (error) {
    console.error('GET /partners/challenges/:id/trend error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch challenge trend' } });
  }
});

// --- POST /challenges - create challenge (admin/manager) ---

router.post('/challenges', requireRole(['admin', 'manager']), validate(createChallengeSchema), async (req: Request, res: Response) => {
  try {
    const payload = req.body as z.infer<typeof createChallengeSchema>;
    const challenge = await prisma.challenge.create({
      data: {
        title: payload.title,
        description: payload.description,
        goal: payload.goal,
        startDate: payload.startDate ? new Date(payload.startDate) : new Date(),
        endDate: new Date(payload.endDate),
        rewards: payload.rewards && payload.rewards.length > 0
          ? {
            create: payload.rewards.map((reward) => ({
              title: reward.title,
              condition: reward.condition,
              icon: reward.icon,
              color: reward.color || '#fbbf24',
            })),
          }
          : undefined,
      },
      include: { rewards: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'created',
        entity: 'Challenge',
        entityId: challenge.id,
        details: `Created challenge: ${challenge.title}`,
        type: 'creation',
      },
    });

    res.status(201).json({ success: true, data: challenge });
  } catch (error) {
    console.error('POST /partners/challenges error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create challenge' } });
  }
});

// --- PATCH /challenges/:id - update challenge (admin/manager) ---

router.patch('/challenges/:id', requireRole(['admin', 'manager']), validate(updateChallengeSchema), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.challenge.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Challenge not found' } });
      return;
    }

    const payload = req.body as z.infer<typeof updateChallengeSchema>;
    const data: Record<string, unknown> = {};
    if (payload.title !== undefined) data.title = payload.title;
    if (payload.description !== undefined) data.description = payload.description;
    if (payload.goal !== undefined) data.goal = payload.goal;
    if (payload.status !== undefined) data.status = payload.status;
    if (payload.winner !== undefined) data.winner = payload.winner;
    if (payload.startDate !== undefined) data.startDate = new Date(payload.startDate);
    if (payload.endDate !== undefined) data.endDate = new Date(payload.endDate);

    const updated = await prisma.challenge.update({ where: { id }, data, include: { rewards: true } });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'updated',
        entity: 'Challenge',
        entityId: updated.id,
        details: `Updated challenge: ${updated.title}`,
        type: 'update',
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('PATCH /partners/challenges/:id error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update challenge' } });
  }
});

// --- PATCH /challenges/:id/finalize - close challenge as completed/failed ---

router.patch('/challenges/:id/finalize', requireRole(['admin', 'manager']), validate(finalizeChallengeSchema), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const payload = req.body as z.infer<typeof finalizeChallengeSchema>;
    const existing = await prisma.challenge.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Challenge not found' } });
      return;
    }

    const updated = await prisma.challenge.update({
      where: { id },
      data: { status: payload.result, winner: payload.winner ?? null },
      include: { rewards: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'finalized',
        entity: 'Challenge',
        entityId: updated.id,
        details: `Finalized challenge as ${payload.result}: ${updated.title}`,
        type: 'update',
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('PATCH /partners/challenges/:id/finalize error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to finalize challenge' } });
  }
});

// --- POST /challenges/:id/rewards - add challenge reward ---

router.post('/challenges/:id/rewards', requireRole(['admin', 'manager']), validate(challengeRewardSchema), async (req: Request, res: Response) => {
  try {
    const challengeId = req.params.id as string;
    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId }, select: { id: true } });
    if (!challenge) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Challenge not found' } });
      return;
    }

    const payload = req.body as z.infer<typeof challengeRewardSchema>;
    const reward = await prisma.challengeReward.create({
      data: {
        challengeId,
        title: payload.title,
        condition: payload.condition,
        icon: payload.icon,
        color: payload.color || '#fbbf24',
      },
    });

    res.status(201).json({ success: true, data: reward });
  } catch (error) {
    console.error('POST /partners/challenges/:id/rewards error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to add challenge reward' } });
  }
});

// --- DELETE /challenges/:id/rewards/:rid - remove challenge reward ---

router.delete('/challenges/:id/rewards/:rid', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const challengeId = req.params.id as string;
    const rewardId = req.params.rid as string;
    const reward = await prisma.challengeReward.findFirst({ where: { id: rewardId, challengeId } });
    if (!reward) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reward not found' } });
      return;
    }

    await prisma.challengeReward.delete({ where: { id: rewardId } });
    res.json({ success: true, data: { message: 'Reward deleted' } });
  } catch (error) {
    console.error('DELETE /partners/challenges/:id/rewards/:rid error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete challenge reward' } });
  }
});

// --- GET /:id - Full partner detail with donation history ---

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const partner = await prisma.partner.findUnique({
      where: { id },
      include: {
        donations: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
    if (!partner) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Partner not found' } });
      return;
    }
    const donationTotal = partner.donations.reduce((sum: number, d: any) => sum + d.amount, 0);
    res.json({ success: true, data: { ...partner, donationTotal } });
  } catch (error) {
    console.error('GET /partners/:id error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch partner' } });
  }
});
// --- POST / - Create partner ---

router.post('/', requireRole(['admin', 'manager']), validate(createPartnerSchema), async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const partner = await prisma.partner.create({
      data: {
        name: data.name,
        type: data.type,
        supportArea: data.supportArea,
        logoUrl: data.logoUrl || null,
        totalContribution: data.totalContribution || 0,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: data.status || 'active',
        projectsCount: data.projectsCount || 0,
      },
    });
    res.status(201).json({ success: true, data: partner });
  } catch (error) {
    console.error('POST /partners error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create partner' } });
  }
});

// --- PATCH /:id - Update partner ---

router.patch('/:id', requireRole(['admin', 'manager']), validate(updatePartnerSchema), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.partner.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Partner not found' } });
      return;
    }
    const data = req.body;
    const updateData: any = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);
    if (data.logoUrl === '') updateData.logoUrl = null;
    if (data.email === '') updateData.email = null;
    const updated = await prisma.partner.update({ where: { id }, data: updateData });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('PATCH /partners/:id error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update partner' } });
  }
});

// --- DELETE /:id - Delete partner (admin only) ---

router.delete('/:id', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.partner.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Partner not found' } });
      return;
    }
    await prisma.donation.deleteMany({ where: { partnerId: id } });
    await prisma.partner.delete({ where: { id } });
    res.json({ success: true, data: { message: 'Partner deleted successfully' } });
  } catch (error) {
    console.error('DELETE /partners/:id error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete partner' } });
  }
});

// --- POST /donations - Create an employee micro-donation ---

router.post('/donations', validate(createDonationSchema), async (req: Request, res: Response) => {
  try {
    const { partnerId, projectId, challengeId, amount, type } = req.body;
    const userId = req.user!.id;
    if (partnerId) {
      const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
      if (!partner) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Partner not found' } });
        return;
      }
    }
    if (projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
        return;
      }
    }
    if (challengeId) {
      const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
      if (!challenge) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Challenge not found' } });
        return;
      }
      if (challenge.status !== 'active') {
        res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Challenge is not active' } });
        return;
      }
    }
    const donation = await prisma.donation.create({
      data: { userId, partnerId: partnerId || null, projectId: projectId || null, challengeId: challengeId || null, amount, type },
      include: {
        user: { select: { id: true, name: true, email: true } },
        partner: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        challenge: { select: { id: true, title: true, goal: true } },
      },
    });
    if (partnerId) {
      await prisma.partner.update({
        where: { id: partnerId },
        data: { totalContribution: { increment: amount } },
      });
    }

    if (challengeId) {
      const stats = await computeChallengeStats(challengeId);
      const updatedChallenge = await prisma.challenge.update({
        where: { id: challengeId },
        data: {
          collected: stats.collected,
          participants: stats.participants,
          topDonorsSnapshot: stats.topDonors,
          status: stats.collected >= (donation.challenge?.goal || Number.MAX_SAFE_INTEGER) ? 'completed' : undefined,
        },
      });

      await prisma.activityLog.create({
        data: {
          userId,
          action: 'donated',
          entity: 'Challenge',
          entityId: challengeId,
          details: `Donated OMR ${amount} to challenge: ${updatedChallenge.title}`,
          type: 'donation',
        },
      });
    }

    res.status(201).json({ success: true, data: donation });
  } catch (error) {
    console.error('POST /partners/donations error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create donation' } });
  }
});

export default router;
