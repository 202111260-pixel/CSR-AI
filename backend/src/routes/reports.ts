import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { getLastNMonths } from '../utils/dateHelpers.js';

const router = Router();
router.use(authenticate);

// --- Helpers ---

function buildDateFilter(query: any) {
  const filter: any = {};
  if (query.startDate) filter.gte = new Date(query.startDate as string);
  if (query.endDate) filter.lte = new Date(query.endDate as string);
  return Object.keys(filter).length > 0 ? filter : undefined;
}

// --- GET /general - General report ---

router.get('/general', async (req: Request, res: Response) => {
  try {
    const dateFilter = buildDateFilter(req.query);
    const projectWhere: any = {};
    if (dateFilter) projectWhere.createdAt = dateFilter;

    const [
      projectsByStatus,
      projectsByCategory,
      projectsByRegion,
      totalProjects,
      completedCount,
      recentProjects,
      budgetAgg,
      beneficiaryAgg,
      allExpenses,
      allBeneficiaries,
      projectsWithDetails,
    ] = await Promise.all([
      prisma.project.groupBy({ by: ['status'], where: projectWhere, _count: { id: true } }),
      prisma.project.groupBy({
        by: ['categoryId'],
        where: projectWhere,
        _count: { id: true },
        _sum: { budget: true },
      }),
      prisma.project.groupBy({
        by: ['region'],
        where: { ...projectWhere, region: { not: null } },
        _count: { id: true },
      }),
      prisma.project.count({ where: projectWhere }),
      prisma.project.count({ where: { ...projectWhere, status: 'completed' } }),
      prisma.project.findMany({
        where: projectWhere,
        select: { createdAt: true, budget: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.project.aggregate({ where: projectWhere, _sum: { budget: true } }),
      prisma.beneficiary.aggregate({ _sum: { count: true } }),
      prisma.expense.findMany({
        where: { status: 'approved', date: { gte: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1) } },
        select: { amount: true, date: true },
      }),
      prisma.beneficiary.findMany({
        select: { count: true, project: { select: { createdAt: true } } },
      }),
      prisma.project.findMany({
        where: projectWhere,
        select: {
          id: true, categoryId: true, budget: true, progress: true, status: true,
          expenses: { where: { status: 'approved' }, select: { amount: true } },
          beneficiaries: { select: { count: true } },
        },
      }),
    ]);

    const totalBudget = budgetAgg._sum.budget || 0;
    const totalBeneficiaries = beneficiaryAgg._sum.count || 0;

    // Fetch category names
    const categoryIds = projectsByCategory.map((r) => r.categoryId);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    const statusDistribution = projectsByStatus.map((r) => ({
      status: r.status, count: r._count.id,
    }));

    const categoryDistribution = projectsByCategory.map((r) => ({
      categoryId: r.categoryId,
      category: catMap.get(r.categoryId) || 'Unknown',
      count: r._count.id,
      budget: r._sum.budget || 0,
    }));

    const regionalDistribution = projectsByRegion.map((r) => ({
      region: r.region || 'Unknown',
      count: r._count.id,
    }));

    const completionRate = totalProjects > 0 ? Math.round((completedCount / totalProjects) * 100) : 0;

    // Monthly project creation trend (enriched with budget, beneficiaries, expenses)
    const months = getLastNMonths(12);
    let cumProjects = 0;
    let cumBudget = 0;
    const creationTrend = months.map(({ start, end, label }) => {
      const monthProjects = recentProjects.filter((p) => p.createdAt >= start && p.createdAt <= end);
      const monthExpenses = allExpenses.filter((e) => e.date >= start && e.date <= end);
      const monthBenef = allBeneficiaries.filter((b) => b.project.createdAt >= start && b.project.createdAt <= end);
      const monthBudget = monthProjects.reduce((s, p) => s + p.budget, 0);
      cumProjects += monthProjects.length;
      cumBudget += monthBudget;
      return {
        month: label,
        count: monthProjects.length,
        budget: Math.round(monthBudget),
        cumBudget: Math.round(cumBudget),
        cumProjects,
        beneficiaries: monthBenef.reduce((s, b) => s + b.count, 0),
        expenses: Math.round(monthExpenses.reduce((s, e) => s + e.amount, 0)),
        completion: totalProjects > 0 ? Math.round((cumProjects / totalProjects) * 100) : 0,
      };
    });

    // Enrich categoryDistribution with spent, beneficiaries, completion
    const enrichedCategoryDistribution = categoryDistribution.map((cat) => {
      const catProjects = projectsWithDetails.filter((p) => p.categoryId === cat.categoryId);
      const spent = catProjects.reduce((s, p) => s + p.expenses.reduce((es, e) => es + e.amount, 0), 0);
      const benef = catProjects.reduce((s, p) => s + p.beneficiaries.reduce((bs, b) => bs + b.count, 0), 0);
      const completedCat = catProjects.filter((p) => p.status === 'completed').length;
      const completion = catProjects.length > 0 ? Math.round((completedCat / catProjects.length) * 100) : 0;
      return {
        ...cat,
        spent: Math.round(spent),
        beneficiaries: benef,
        completion,
      };
    });

    res.json({
      success: true,
      data: {
        totalProjects,
        completedCount,
        completionRate,
        totalBudget,
        totalBeneficiaries,
        statusDistribution,
        categoryDistribution: enrichedCategoryDistribution,
        regionalDistribution,
        creationTrend,
      },
    });
  } catch (error) {
    console.error('GET /reports/general error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch general report' } });
  }
});
// --- GET /impact - Impact report ---

router.get('/impact', async (req: Request, res: Response) => {
  try {
    const dateFilter = buildDateFilter(req.query);
    const projectWhere: any = {};
    if (dateFilter) projectWhere.createdAt = dateFilter;

    // Get project IDs matching the date filter
    const projectIds = dateFilter
      ? (await prisma.project.findMany({ where: projectWhere, select: { id: true } })).map((p) => p.id)
      : undefined;
    const beneficiaryWhere: any = projectIds ? { projectId: { in: projectIds } } : {};
    const reviewWhere: any = projectIds ? { projectId: { in: projectIds } } : {};

    const [beneficiaryAgg, beneficiaries, reviews, categoryReviews, sdgProjects, totalProjects, communitiesData, categoryStats] = await Promise.all([
      prisma.beneficiary.aggregate({
        where: beneficiaryWhere,
        _sum: { count: true, male: true, female: true, children: true, elderly: true, disabled: true },
      }),
      prisma.beneficiary.findMany({
        where: beneficiaryWhere,
        select: { projectId: true, count: true },
      }),
      prisma.review.aggregate({
        where: reviewWhere,
        _avg: { rating: true },
        _count: { id: true },
      }),
      // Average rating by category
      prisma.review.findMany({
        where: reviewWhere,
        select: { rating: true, project: { select: { categoryId: true } } },
      }),
      // SDG alignment
      prisma.project.findMany({
        where: { ...projectWhere, sdgGoals: { not: undefined } },
        select: { sdgGoals: true },
      }),
      // Total projects count
      prisma.project.count({ where: projectWhere }),
      // Communities reached (distinct regions)
      prisma.project.groupBy({
        by: ['region'],
        where: projectWhere,
        _count: { id: true },
      }),
      // Category breakdown with project counts, beneficiaries, and budgets
      prisma.category.findMany({
        select: {
          id: true,
          name: true,
          projects: {
            where: projectWhere,
            select: {
              id: true,
              budget: true,
              beneficiaries: { select: { count: true } },
              reviews: { select: { rating: true } },
            },
          },
        },
      }),
    ]);

    // Total beneficiaries by demographic
    const demographics = {
      total: beneficiaryAgg._sum.count || 0,
      male: beneficiaryAgg._sum.male || 0,
      female: beneficiaryAgg._sum.female || 0,
      children: beneficiaryAgg._sum.children || 0,
      elderly: beneficiaryAgg._sum.elderly || 0,
      disabled: beneficiaryAgg._sum.disabled || 0,
    };

    // Average rating by category
    const categoryIds = [...new Set(categoryReviews.map((r) => r.project.categoryId))];
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    const ratingByCategory: Record<string, { sum: number; count: number }> = {};
    for (const r of categoryReviews) {
      const catId = r.project.categoryId;
      if (!ratingByCategory[catId]) ratingByCategory[catId] = { sum: 0, count: 0 };
      ratingByCategory[catId].sum += r.rating;
      ratingByCategory[catId].count++;
    }
    const avgRatingByCategory = Object.entries(ratingByCategory).map(([catId, { sum, count }]) => ({
      categoryId: catId,
      category: catMap.get(catId) || 'Unknown',
      avgRating: Math.round((sum / count) * 100) / 100,
      reviewCount: count,
    }));

    // SDG alignment scores
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

    // Impact distribution (projects by number of beneficiaries)
    const projectBeneficiaryMap: Record<string, number> = {};
    for (const b of beneficiaries) {
      projectBeneficiaryMap[b.projectId] = (projectBeneficiaryMap[b.projectId] || 0) + b.count;
    }
    const impactBuckets = { low: 0, medium: 0, high: 0, veryHigh: 0 };
    for (const count of Object.values(projectBeneficiaryMap)) {
      if (count < 100) impactBuckets.low++;
      else if (count < 500) impactBuckets.medium++;
      else if (count < 2000) impactBuckets.high++;
      else impactBuckets.veryHigh++;
    }

    // Category breakdown with real data
    const categoryBreakdown = categoryStats.map((cat) => {
      const projectCount = cat.projects.length;
      const totalBudget = cat.projects.reduce((sum, p) => sum + p.budget, 0);
      const totalBeneficiaries = cat.projects.reduce(
        (sum, p) => sum + p.beneficiaries.reduce((s, b) => s + (b.count || 0), 0),
        0
      );
      const allRatings = cat.projects.flatMap((p) => p.reviews.map((r) => r.rating));
      const avgSatisfaction = allRatings.length > 0
        ? Math.round((allRatings.reduce((s, r) => s + r, 0) / allRatings.length) * 20)
        : 0;
      return {
        id: cat.id,
        name: cat.name,
        projects: projectCount,
        beneficiaries: totalBeneficiaries,
        budget: totalBudget,
        satisfaction: avgSatisfaction,
      };
    }).filter((c) => c.projects > 0);

    res.json({
      success: true,
      data: {
        demographics,
        avgRating: Math.round((reviews._avg.rating || 0) * 100) / 100,
        totalReviews: reviews._count.id,
        avgRatingByCategory,
        sdgAlignment,
        impactDistribution: impactBuckets,
        totalProjects,
        communitiesReached: communitiesData.length,
        categoryBreakdown,
      },
    });
  } catch (error) {
    console.error('GET /reports/impact error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch impact report' } });
  }
});
// --- GET /financial - Financial report ---

router.get('/financial', async (req: Request, res: Response) => {
  try {
    const dateFilter = buildDateFilter(req.query);
    const projectWhere: any = {};
    if (dateFilter) projectWhere.createdAt = dateFilter;

    const expenseWhere: any = { status: 'approved' };
    if (dateFilter) expenseWhere.date = dateFilter;

    const [
      budgetAgg,
      expenseAgg,
      expensesByCategory,
      expenses,
      projects,
      allProjects,
      categories,
    ] = await Promise.all([
      prisma.project.aggregate({ where: projectWhere, _sum: { budget: true } }),
      prisma.expense.aggregate({ where: expenseWhere, _sum: { amount: true } }),
      prisma.expense.groupBy({
        by: ['category'],
        where: expenseWhere,
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.expense.findMany({
        where: expenseWhere,
        select: { amount: true, date: true },
        orderBy: { date: 'asc' },
      }),
      prisma.project.findMany({
        where: projectWhere,
        select: {
          id: true, name: true, budget: true,
          expenses: { select: { amount: true }, where: { status: 'approved' } },
        },
      }),
      // All projects with category and region for comparison data
      prisma.project.findMany({
        select: {
          id: true, budget: true, region: true, categoryId: true, createdAt: true,
          expenses: { select: { amount: true }, where: { status: 'approved' } },
        },
      }),
      // Categories for name mapping
      prisma.category.findMany({
        select: { id: true, name: true },
      }),
    ]);

    const totalBudget = budgetAgg._sum.budget || 0;
    const totalSpent = expenseAgg._sum.amount || 0;
    const budgetUtilization = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

    // Category name map
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    // Expense breakdown by category
    const expenseBreakdown = expensesByCategory.map((r) => ({
      category: r.category,
      amount: Math.round((r._sum.amount || 0) * 100) / 100,
      count: r._count.id,
      percentage: totalSpent > 0 ? Math.round(((r._sum.amount || 0) / totalSpent) * 100) : 0,
    }));

    // Monthly cash flow
    const months = getLastNMonths(12);
    const monthlyCashFlow = months.map(({ start, end, label }) => {
      const monthExpenses = expenses.filter((e) => e.date >= start && e.date <= end);
      const amount = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
      return { month: label, amount: Math.round(amount * 100) / 100, count: monthExpenses.length };
    });

    // Budget utilization by project
    const budgetByProject = projects
      .map((p) => {
        const spent = p.expenses.reduce((sum, e) => sum + e.amount, 0);
        return {
          projectId: p.id,
          projectName: p.name,
          budget: p.budget,
          spent: Math.round(spent * 100) / 100,
          utilization: p.budget > 0 ? Math.round((spent / p.budget) * 100) : 0,
          remaining: Math.round((p.budget - spent) * 100) / 100,
        };
      })
      .sort((a, b) => b.utilization - a.utilization);

    // Top expenses
    const topExpenses = await prisma.expense.findMany({
      where: expenseWhere,
      include: { project: { select: { id: true, name: true } } },
      orderBy: { amount: 'desc' },
      take: 10,
    });

    // ─── Comparative Analysis Data ────────────────────────────────────────────

    // Yearly Comparison (group by year)
    const yearlyMap: Record<string, { budget: number; spent: number; projects: number }> = {};
    for (const p of allProjects) {
      const year = p.createdAt.getFullYear().toString();
      if (!yearlyMap[year]) yearlyMap[year] = { budget: 0, spent: 0, projects: 0 };
      yearlyMap[year].budget += p.budget;
      yearlyMap[year].spent += p.expenses.reduce((s, e) => s + e.amount, 0);
      yearlyMap[year].projects++;
    }
    const yearlyComparison = Object.entries(yearlyMap)
      .map(([year, data]) => ({
        year,
        budget: Math.round(data.budget * 100) / 100,
        spent: Math.round(data.spent * 100) / 100,
        projects: data.projects,
      }))
      .sort((a, b) => a.year.localeCompare(b.year));

    // Category Breakdown (by project category, not expense category)
    const categoryMap: Record<string, { name: string; budget: number; spent: number; projects: number }> = {};
    const categoryColors = ['#E91E63', '#38bdf8', '#fb923c', '#34d399', '#a78bfa', '#fbbf24', '#f87171'];
    for (const p of allProjects) {
      const catId = p.categoryId;
      if (!categoryMap[catId]) {
        categoryMap[catId] = { name: catMap.get(catId) || 'Unknown', budget: 0, spent: 0, projects: 0 };
      }
      categoryMap[catId].budget += p.budget;
      categoryMap[catId].spent += p.expenses.reduce((s, e) => s + e.amount, 0);
      categoryMap[catId].projects++;
    }
    const categoryBreakdown = Object.entries(categoryMap)
      .map(([id, data], i) => ({
        id,
        name: data.name,
        budget: Math.round(data.budget * 100) / 100,
        spent: Math.round(data.spent * 100) / 100,
        projects: data.projects,
        color: categoryColors[i % categoryColors.length],
      }))
      .sort((a, b) => b.budget - a.budget);

    // Region Comparison
    const regionMap: Record<string, { budget: number; spent: number; projects: number }> = {};
    for (const p of allProjects) {
      const region = p.region || 'Unknown';
      if (!regionMap[region]) regionMap[region] = { budget: 0, spent: 0, projects: 0 };
      regionMap[region].budget += p.budget;
      regionMap[region].spent += p.expenses.reduce((s, e) => s + e.amount, 0);
      regionMap[region].projects++;
    }
    const regionComparison = Object.entries(regionMap)
      .map(([region, data]) => ({
        region,
        budget: Math.round(data.budget * 100) / 100,
        spent: Math.round(data.spent * 100) / 100,
        projects: data.projects,
      }))
      .sort((a, b) => b.budget - a.budget);

    // ─── Budget Alerts (computed from project utilization) ────────────────────
    let criticalCount = 0, warningCount = 0, healthyCount = 0;
    for (const p of budgetByProject) {
      if (p.utilization > 100) criticalCount++;
      else if (p.utilization > 85) criticalCount++;
      else if (p.utilization > 70) warningCount++;
      else healthyCount++;
    }
    const budgetAlerts = [
      { level: 'critical', title: 'Budget Exceeded', count: criticalCount, desc: 'Projects exceeding 85% of allocated budget' },
      { level: 'warning', title: 'Near Threshold', count: warningCount, desc: 'Projects between 70-85% budget utilization' },
      { level: 'healthy', title: 'Within Budget', count: healthyCount, desc: 'Projects with healthy budget utilization' },
    ];

    // ─── Efficiency Metrics (computed from real data) ─────────────────────────
    // Get total beneficiaries for cost per beneficiary calculation
    const beneficiaryAgg = await prisma.beneficiary.aggregate({ _sum: { count: true } });
    const totalBeneficiaries = beneficiaryAgg._sum.count || 1;
    const costPerBeneficiary = Math.round((totalSpent / totalBeneficiaries) * 100) / 100;

    // Calculate overrun frequency (projects over budget / total projects)
    const overBudgetCount = budgetByProject.filter(p => p.utilization > 100).length;
    const overrunFrequency = budgetByProject.length > 0 
      ? Math.round((overBudgetCount / budgetByProject.length) * 1000) / 10 
      : 0;

    // Calculate burn rate accuracy (how close actual spend is to expected based on time)
    // For simplicity, using overall utilization as a proxy
    const burnRateAccuracy = budgetUtilization > 0 ? Math.min(100, Math.round(100 - Math.abs(75 - budgetUtilization))) : 0;

    const efficiencyMetrics = {
      costPerBeneficiary,
      budgetUtilization,
      burnRateAccuracy,
      overrunFrequency,
      totalBeneficiaries,
    };

    // ─── Forecast Data (simple projection based on trends) ────────────────────
    const avgMonthlySpend = monthlyCashFlow.length > 0 
      ? monthlyCashFlow.reduce((sum, m) => sum + m.amount, 0) / monthlyCashFlow.length 
      : 0;
    const avgMonthlyBudget = totalBudget / 12;
    
    const forecastData = [
      { 
        quarter: 'Q2 2026', 
        projectedBudget: Math.round(avgMonthlyBudget * 3), 
        projectedSpend: Math.round(avgMonthlySpend * 3 * 1.05), // 5% growth
        confidence: 89 
      },
      { 
        quarter: 'Q3 2026', 
        projectedBudget: Math.round(avgMonthlyBudget * 3 * 1.05), 
        projectedSpend: Math.round(avgMonthlySpend * 3 * 1.10), 
        confidence: 82 
      },
      { 
        quarter: 'Q4 2026', 
        projectedBudget: Math.round(avgMonthlyBudget * 3 * 1.10), 
        projectedSpend: Math.round(avgMonthlySpend * 3 * 1.15), 
        confidence: 75 
      },
    ];

    res.json({
      success: true,
      data: {
        totalBudget,
        totalSpent: Math.round(totalSpent * 100) / 100,
        budgetUtilization,
        remaining: Math.round((totalBudget - totalSpent) * 100) / 100,
        expenseBreakdown,
        monthlyCashFlow,
        budgetByProject,
        topExpenses,
        // Comparative Analysis
        yearlyComparison,
        categoryBreakdown,
        regionComparison,
        // Budget Alerts
        budgetAlerts,
        // Efficiency Metrics
        efficiencyMetrics,
        // Forecast
        forecastData,
      },
    });
  } catch (error) {
    console.error('GET /reports/financial error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch financial report' } });
  }
});

// ─── Export Endpoints ─────────────────────────────────────────────────

function toCsvRow(obj: Record<string, any>): string {
  return Object.values(obj).map(v => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',');
}

function toCsv(data: Record<string, any>[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(toCsvRow);
  return [headers, ...rows].join('\n');
}

// GET /reports/general/export
router.get('/general/export', async (req: Request, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      include: { category: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const rows = projects.map(p => ({
      Name: p.name,
      Status: p.status,
      Category: p.category?.name || 'N/A',
      Region: p.region || 'N/A',
      Budget: p.budget,
      Location: p.location,
      Progress: `${p.progress}%`,
      StartDate: p.startDate.toISOString().split('T')[0],
      EndDate: p.endDate.toISOString().split('T')[0],
      CreatedAt: p.createdAt.toISOString().split('T')[0],
    }));

    const format = req.query.format || 'csv';
    if (format === 'json') {
      res.setHeader('Content-Disposition', 'attachment; filename="general-report.json"');
      res.setHeader('Content-Type', 'application/json');
      return res.send(JSON.stringify(rows, null, 2));
    }

    res.setHeader('Content-Disposition', 'attachment; filename="general-report.csv"');
    res.setHeader('Content-Type', 'text/csv');
    res.send(toCsv(rows));
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Export failed' } });
  }
});

// GET /reports/impact/export
router.get('/impact/export', async (req: Request, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        category: { select: { name: true } },
        beneficiaries: true,
        reviews: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = projects.map(p => {
      const totalBeneficiaries = p.beneficiaries.reduce((sum, b) => sum + b.count, 0);
      const avgRating = p.reviews.length > 0
        ? (p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length).toFixed(1)
        : 'N/A';
      return {
        Project: p.name,
        Category: p.category?.name || 'N/A',
        TotalBeneficiaries: totalBeneficiaries,
        Male: p.beneficiaries.reduce((s, b) => s + b.male, 0),
        Female: p.beneficiaries.reduce((s, b) => s + b.female, 0),
        Children: p.beneficiaries.reduce((s, b) => s + b.children, 0),
        Elderly: p.beneficiaries.reduce((s, b) => s + b.elderly, 0),
        AvgRating: avgRating,
        Reviews: p.reviews.length,
      };
    });

    const format = req.query.format || 'csv';
    if (format === 'json') {
      res.setHeader('Content-Disposition', 'attachment; filename="impact-report.json"');
      res.setHeader('Content-Type', 'application/json');
      return res.send(JSON.stringify(rows, null, 2));
    }

    res.setHeader('Content-Disposition', 'attachment; filename="impact-report.csv"');
    res.setHeader('Content-Type', 'text/csv');
    res.send(toCsv(rows));
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Export failed' } });
  }
});

// GET /reports/financial/export
router.get('/financial/export', async (req: Request, res: Response) => {
  try {
    const expenses = await prisma.expense.findMany({
      include: { project: { select: { name: true } } },
      orderBy: { date: 'desc' },
    });

    const rows = expenses.map(e => ({
      Project: e.project?.name || 'N/A',
      Amount: e.amount,
      Category: e.category,
      Description: e.description || '',
      Status: e.status,
      Date: e.date.toISOString().split('T')[0],
    }));

    const format = req.query.format || 'csv';
    if (format === 'json') {
      res.setHeader('Content-Disposition', 'attachment; filename="financial-report.json"');
      res.setHeader('Content-Type', 'application/json');
      return res.send(JSON.stringify(rows, null, 2));
    }

    res.setHeader('Content-Disposition', 'attachment; filename="financial-report.csv"');
    res.setHeader('Content-Type', 'text/csv');
    res.send(toCsv(rows));
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Export failed' } });
  }
});

export default router;
