import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { getLastNMonths } from '../utils/dateHelpers.js';

const router = Router();
router.use(authenticate);

// --- Helpers ---

function computeRiskLevel(spent: number, budget: number): string {
  if (budget <= 0) return 'low';
  const ratio = spent / budget;
  if (ratio <= 0.6) return 'low';
  if (ratio <= 0.8) return 'medium';
  if (ratio <= 1.0) return 'high';
  return 'critical';
}

// --- GET / - Full dashboard data ---

router.get('/', async (_req: Request, res: Response) => {
  try {
    // Run all independent queries in parallel
    const [
      totalProjects,
      activeProjects,
      completedProjects,
      beneficiaryAgg,
      budgetAgg,
      expenseAgg,
      reviewAgg,
      projectsByStatus,
      projectsByCategoryRaw,
      projectsByRegion,
      recentProjectsRaw,
      recentAlerts,
      recentActivities,
      topPartnersRaw,
      projectsForRisk,
      sdgProjects,
      allExpenses,
      allProjects,
      beneficiariesRaw,
      budgetByCategoryRaw,
      completedDurations,
      allReviewRatings,
      sankeyDonationsRaw,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { status: 'active' } }),
      prisma.project.count({ where: { status: 'completed' } }),
      prisma.beneficiary.aggregate({ _sum: { count: true } }),
      prisma.project.aggregate({ _sum: { budget: true } }),
      prisma.expense.aggregate({ where: { status: 'approved' }, _sum: { amount: true } }),
      prisma.review.aggregate({ _avg: { rating: true } }),
      prisma.project.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.project.groupBy({ by: ['categoryId'], _count: { id: true } }),
      prisma.project.groupBy({
        by: ['region'],
        _count: { id: true },
        where: { region: { not: null } },
      }),
      prisma.project.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true, name: true, status: true, budget: true,
          progress: true, region: true, createdAt: true,
          category: { select: { name: true } },
        },
      }),
      prisma.alert.findMany({
        where: { resolvedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { project: { select: { id: true, name: true } } },
      }),
      prisma.activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
          project: { select: { id: true, name: true } },
        },
      }),
      prisma.partner.findMany({
        where: { status: 'active' },
        orderBy: { totalContribution: 'desc' },
        take: 4,
        select: { id: true, name: true, type: true, logoUrl: true, totalContribution: true, _count: { select: { donations: true } } },
      }),
      // Projects with expenses for risk calculation
      prisma.project.findMany({
        where: { status: { in: ['active', 'planning'] } },
        select: {
          id: true, budget: true,
          expenses: { select: { amount: true }, where: { status: 'approved' } },
        },
      }),
      // SDG goals
      prisma.project.findMany({
        where: { sdgGoals: { not: undefined } },
        select: { sdgGoals: true },
      }),
      // Expenses for budget trend (last 12 months)
      prisma.expense.findMany({
        where: { date: { gte: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1) } },
        select: { amount: true, date: true },
      }),
      // Projects for budget trend
      prisma.project.findMany({
        where: { createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1) } },
        select: { budget: true, createdAt: true },
      }),
      // Beneficiaries by category with demographics
      prisma.beneficiary.findMany({
        select: {
          male: true, female: true, children: true, count: true,
          project: { select: { category: { select: { name: true } } } },
        },
      }),
      // Budget allocation by category
      prisma.project.groupBy({
        by: ['categoryId'],
        _sum: { budget: true },
      }),
      // Completed projects for avg duration
      prisma.project.findMany({
        where: { status: 'completed' },
        select: { startDate: true, endDate: true },
      }),
      // Review ratings for satisfaction
      prisma.review.findMany({
        select: { rating: true },
      }),
      // Sankey flow: donations with partner + project + category
      prisma.donation.findMany({
        select: {
          amount: true,
          partner: { select: { id: true, name: true } },
          project: {
            select: {
              id: true,
              category: { select: { name: true } },
              beneficiaries: { select: { count: true, male: true, female: true, children: true, elderly: true, disabled: true } },
            },
          },
        },
      }),
    ]);
    // --- KPIs ---
    const kpis = {
      totalProjects,
      activeProjects,
      completedProjects,
      totalBeneficiaries: beneficiaryAgg._sum.count || 0,
      totalBudget: budgetAgg._sum.budget || 0,
      totalSpent: Math.round((expenseAgg._sum.amount || 0) * 100) / 100,
      avgImpactScore: Math.round((reviewAgg._avg.rating || 0) * 100) / 100,
    };

    // --- Monthly Trends (current month vs previous month) ---
    const now = new Date();
    const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [projCur, projPrev, benCur, benPrev, expCur, expPrev, revCur, revPrev] = await Promise.all([
      prisma.project.count({ where: { createdAt: { gte: curMonthStart } } }),
      prisma.project.count({ where: { createdAt: { gte: prevMonthStart, lte: prevMonthEnd } } }),
      prisma.beneficiary.aggregate({ where: { project: { createdAt: { gte: curMonthStart } } }, _sum: { count: true } }),
      prisma.beneficiary.aggregate({ where: { project: { createdAt: { gte: prevMonthStart, lte: prevMonthEnd } } }, _sum: { count: true } }),
      prisma.expense.aggregate({ where: { status: 'approved', date: { gte: curMonthStart } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { status: 'approved', date: { gte: prevMonthStart, lte: prevMonthEnd } }, _sum: { amount: true } }),
      prisma.review.count({ where: { createdAt: { gte: curMonthStart } } }),
      prisma.review.count({ where: { createdAt: { gte: prevMonthStart, lte: prevMonthEnd } } }),
    ]);

    function calcTrend(cur: number, prev: number): number {
      if (prev === 0) return cur > 0 ? 100 : 0;
      return Math.round(((cur - prev) / prev) * 100);
    }

    const trends = {
      projects: calcTrend(projCur, projPrev),
      beneficiaries: calcTrend(benCur._sum.count || 0, benPrev._sum.count || 0),
      budget: calcTrend(expCur._sum.amount || 0, expPrev._sum.amount || 0),
      impact: calcTrend(revCur, revPrev),
    };

    // --- Budget Trend (last 12 months) ---
    const months = getLastNMonths(12);
    const budgetTrend = months.map(({ start, end, label }) => {
      const monthBudget = allProjects
        .filter((p) => p.createdAt >= start && p.createdAt <= end)
        .reduce((sum, p) => sum + p.budget, 0);
      const monthSpent = allExpenses
        .filter((e) => e.date >= start && e.date <= end)
        .reduce((sum, e) => sum + e.amount, 0);
      return {
        month: label,
        budget: Math.round(monthBudget * 100) / 100,
        spent: Math.round(monthSpent * 100) / 100,
      };
    });

    // --- Projects by Category ---
    const categoryIds = projectsByCategoryRaw.map((r) => r.categoryId);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
    const catMap = new Map(categories.map((c) => [c.id, c.name]));
    const projectsByCategory = projectsByCategoryRaw.map((r) => ({
      category: catMap.get(r.categoryId) || 'Unknown',
      count: r._count.id,
    }));

    // --- Projects by Region ---
    const projectsByRegionData = projectsByRegion.map((r) => ({
      region: r.region || 'Unknown',
      count: r._count.id,
    }));

    // --- Projects by Status ---
    const projectsByStatusData = projectsByStatus.map((r) => ({
      status: r.status,
      count: r._count.id,
    }));

    // --- Recent Projects ---
    const recentProjects = recentProjectsRaw.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      budget: p.budget,
      progress: p.progress,
      region: p.region,
      category: p.category.name,
      createdAt: p.createdAt,
    }));

    // --- Risk Distribution ---
    const riskDistribution: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const p of projectsForRisk) {
      const spent = p.expenses.reduce((sum, e) => sum + e.amount, 0);
      const level = computeRiskLevel(spent, p.budget);
      riskDistribution[level]++;
    }

    // --- SDG Alignment ---
    const sdgCounts: Record<string, number> = {};
    for (const p of sdgProjects) {
      const goals = (Array.isArray(p.sdgGoals) ? p.sdgGoals : []) as string[];
      for (const g of goals) {
        sdgCounts[String(g)] = (sdgCounts[String(g)] || 0) + 1;
      }
    }
    const sdgAlignment = Object.entries(sdgCounts)
      .map(([goal, count]) => ({ goal, count }))
      .sort((a, b) => b.count - a.count);

    // --- Assemble Response ---

    // --- Beneficiary Demographics by Category ---
    const benByCat: Record<string, { male: number; female: number; children: number; total: number }> = {};
    for (const b of beneficiariesRaw) {
      const cat = b.project?.category?.name || 'Unknown';
      if (!benByCat[cat]) benByCat[cat] = { male: 0, female: 0, children: 0, total: 0 };
      benByCat[cat].male += b.male || 0;
      benByCat[cat].female += b.female || 0;
      benByCat[cat].children += b.children || 0;
      benByCat[cat].total += b.count || 0;
    }
    const beneficiaryDemographics = Object.entries(benByCat).map(([cat, v]) => ({
      category: cat, male: v.male, female: v.female, children: v.children, total: v.total,
    }));

    // --- Budget Allocation by Category ---
    const budgetAllocation = budgetByCategoryRaw.map((r: any) => ({
      categoryId: r.categoryId,
      category: catMap.get(r.categoryId) || 'Unknown',
      value: Math.round((r._sum.budget || 0) / 1000),
    }));

    // --- Average Project Duration ---
    let avgDurationMonths = 0;
    if (completedDurations.length > 0) {
      const totalMs = completedDurations.reduce((sum: number, p: any) => {
        return sum + (new Date(p.endDate).getTime() - new Date(p.startDate).getTime());
      }, 0);
      avgDurationMonths = Math.round((totalMs / completedDurations.length / (1000 * 60 * 60 * 24 * 30)) * 10) / 10;
    }

    // --- Satisfaction Score ---
    let satisfactionScore = 0;
    if (allReviewRatings.length > 0) {
      const avgRating = allReviewRatings.reduce((sum: number, r: any) => sum + r.rating, 0) / allReviewRatings.length;
      satisfactionScore = Math.round((avgRating / 5) * 100);
    }

    // --- Sankey Flow Data (Partners → Categories → Beneficiary Types) ---
    const sankeyNodes: { id: string; label: string; type: 'partner' | 'category' | 'beneficiary' }[] = [];
    const sankeyLinksMap: Record<string, number> = {};
    const nodeSet = new Set<string>();

    for (const don of sankeyDonationsRaw) {
      const partnerName = don.partner?.name;
      const catName = don.project?.category?.name;
      if (!partnerName || !catName) continue;

      const pId = `p_${partnerName}`;
      const cId = `c_${catName}`;
      if (!nodeSet.has(pId)) { nodeSet.add(pId); sankeyNodes.push({ id: pId, label: partnerName, type: 'partner' }); }
      if (!nodeSet.has(cId)) { nodeSet.add(cId); sankeyNodes.push({ id: cId, label: catName, type: 'category' }); }

      const lk1 = `${pId}|${cId}`;
      sankeyLinksMap[lk1] = (sankeyLinksMap[lk1] || 0) + don.amount;

      // Category → Beneficiary types
      const bens = don.project?.beneficiaries ?? [];
      for (const b of bens) {
        const segments: [string, number][] = [
          ['Children', b.children || 0], ['Elderly', b.elderly || 0],
          ['Disabled', b.disabled || 0], ['Women', b.female || 0], ['Men', b.male || 0],
        ];
        const totalBen = segments.reduce((s, [, v]) => s + v, 0) || 1;
        for (const [segName, segVal] of segments) {
          if (segVal <= 0) continue;
          const bId = `b_${segName}`;
          if (!nodeSet.has(bId)) { nodeSet.add(bId); sankeyNodes.push({ id: bId, label: segName, type: 'beneficiary' }); }
          const lk2 = `${cId}|${bId}`;
          sankeyLinksMap[lk2] = (sankeyLinksMap[lk2] || 0) + Math.round(don.amount * (segVal / totalBen));
        }
      }
    }

    const sankeyLinks = Object.entries(sankeyLinksMap)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => {
        const [source, target] = key.split('|');
        return { source, target, value };
      });

    const sankeyFlow = { nodes: sankeyNodes, links: sankeyLinks };

    res.json({
      success: true,
      data: {
        kpis,
        trends,
        budgetTrend,
        projectsByCategory,
        projectsByRegion: projectsByRegionData,
        projectsByStatus: projectsByStatusData,
        recentProjects,
        recentAlerts,
        recentActivities,
        topPartners: topPartnersRaw.map((p: any) => ({
          id: p.id, name: p.name, type: p.type, logoUrl: p.logoUrl,
          totalContribution: p.totalContribution, projectsCount: p._count?.donations ?? 0,
        })),
        riskDistribution,
        sdgAlignment,
        beneficiaryDemographics,
        budgetAllocation,
        avgDurationMonths,
        satisfactionScore,
        sankeyFlow,
      },
    });
  } catch (error) {
    console.error('GET /dashboard error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch dashboard data' } });
  }
});

export default router;
