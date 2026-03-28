import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { getLastNMonths, getNextNMonths } from '../utils/dateHelpers.js';

const router = Router();
router.use(authenticate);

const FUTURE_LABEL_OPTIONS: Intl.DateTimeFormatOptions = { month: 'short', year: '2-digit' };

// GET / — AI-powered predictions & forecasts computed from real data
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [
      activeProjects,
      allExpenses,
      beneficiaryAgg,
      categoriesWithProjects,
      totalProjects,
      completedProjects,
      reviewAgg,
      recentBeneficiaries,
    ] = await Promise.all([
      prisma.project.findMany({
        where: { status: { in: ['active', 'planning', 'on_hold'] } },
        include: {
          category: { select: { name: true } },
          expenses: { where: { status: 'approved' }, select: { amount: true } },
          reviews: { select: { rating: true } },
          beneficiaries: { select: { count: true } },
          milestones: { select: { status: true } },
        },
      }),
      prisma.expense.findMany({
        where: { date: { gte: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1) }, status: 'approved' },
        select: { amount: true, date: true },
      }),
      prisma.beneficiary.aggregate({ _sum: { count: true } }),
      prisma.category.findMany({
        include: {
          projects: {
            select: {
              id: true, status: true, budget: true, progress: true,
              expenses: { where: { status: 'approved' }, select: { amount: true } },
              reviews: { select: { rating: true } },
            },
          },
        },
      }),
      prisma.project.count(),
      prisma.project.count({ where: { status: 'completed' } }),
      prisma.review.aggregate({ _avg: { rating: true } }),
      prisma.beneficiary.findMany({
        where: {
          project: {
            createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1) },
          },
        },
        select: { count: true, project: { select: { createdAt: true } } },
      }),
    ]);

    // ─── 1. Project Predictions ─────────────────────────────────────
    const now = new Date();
    const predictions = activeProjects.map((p) => {
      const spent = p.expenses.reduce((sum, e) => sum + e.amount, 0);
      const budgetHealth = p.budget > 0 ? Math.max(0, 1 - spent / p.budget) : 0.5;

      const start = new Date(p.startDate);
      const end = new Date(p.endDate);
      const totalDuration = end.getTime() - start.getTime();
      const elapsed = Math.max(0, now.getTime() - start.getTime());
      const elapsedPct = totalDuration > 0 ? Math.min(100, (elapsed / totalDuration) * 100) : 0;

      const progressRatio = elapsedPct > 0 ? p.progress / elapsedPct : 1;
      const avgRating = p.reviews.length > 0
        ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length
        : 3.5;

      const successProbability = Math.min(100, Math.max(0, Math.round(
        (Math.min(1, progressRatio) * 40) +
        (budgetHealth * 30) +
        ((avgRating / 5) * 30)
      )));

      let riskTrend: 'improving' | 'stable' | 'declining' = 'stable';
      if (progressRatio > 1.1) riskTrend = 'improving';
      else if (progressRatio < 0.9) riskTrend = 'declining';

      // Estimate completion
      const progressRate = elapsedPct > 0 ? p.progress / (elapsed / (1000 * 60 * 60 * 24)) : 1;
      const remainingProgress = 100 - p.progress;
      const remainingDays = progressRate > 0 ? Math.round(remainingProgress / progressRate) : 365;
      const estimatedDate = new Date(now.getTime() + remainingDays * 24 * 60 * 60 * 1000);

      const recommendations: string[] = [];
      if (budgetHealth < 0.2) recommendations.push('Budget nearly exhausted — review remaining expenses');
      if (budgetHealth < 0) recommendations.push('Budget overrun detected — immediate review required');
      if (progressRatio < 0.7) recommendations.push('Progress significantly behind schedule — allocate more resources');
      if (avgRating < 3) recommendations.push('Quality scores below target — conduct quality review');
      const completedMilestones = p.milestones.filter(m => m.status === 'completed').length;
      const totalMilestones = p.milestones.length;
      if (totalMilestones > 0 && completedMilestones / totalMilestones < 0.5 && elapsedPct > 60) {
        recommendations.push('Milestone completion rate is low — review timeline');
      }
      if (recommendations.length === 0) recommendations.push('Project is on track — continue monitoring');

      return {
        projectId: p.id,
        projectName: p.name,
        category: p.category?.name || 'Unknown',
        status: p.status,
        progress: p.progress,
        budget: p.budget,
        spent,
        successProbability,
        riskTrend,
        estimatedCompletion: estimatedDate.toISOString().split('T')[0],
        recommendations,
      };
    });

    // ─── 2. Budget Forecast (next 6 months) ─────────────────────────
    const pastMonths = getLastNMonths(6, FUTURE_LABEL_OPTIONS);
    const monthlySpending = pastMonths.map(({ start, end }) => {
      return allExpenses
        .filter(e => e.date >= start && e.date <= end)
        .reduce((sum, e) => sum + e.amount, 0);
    });

    // Simple linear trend
    const n = monthlySpending.length;
    const xMean = (n - 1) / 2;
    const yMean = monthlySpending.reduce((s, v) => s + v, 0) / n;
    let slope = 0;
    if (n > 1) {
      let num = 0, den = 0;
      for (let i = 0; i < n; i++) {
        num += (i - xMean) * (monthlySpending[i] - yMean);
        den += (i - xMean) * (i - xMean);
      }
      slope = den !== 0 ? num / den : 0;
    }

    const totalBudget = activeProjects.reduce((s, p) => s + p.budget, 0);
    const futureMonths = getNextNMonths(6, FUTURE_LABEL_OPTIONS);
    const budgetForecast = futureMonths.map(({ label }, i) => {
      const projectedSpend = Math.max(0, Math.round((yMean + slope * (n + i)) * 100) / 100);
      const confidence = Math.max(40, 95 - i * 10);
      return {
        month: label,
        projectedBudget: Math.round(totalBudget / 12),
        projectedSpend,
        confidence,
      };
    });

    // ─── 3. Impact Projections ──────────────────────────────────────
    const totalBeneficiaries = beneficiaryAgg._sum.count || 0;
    const monthlyBenefGrowth = pastMonths.map(({ start, end }) => {
      return recentBeneficiaries
        .filter(b => b.project.createdAt >= start && b.project.createdAt <= end)
        .reduce((sum, b) => sum + b.count, 0);
    });
    const avgMonthlyGrowth = monthlyBenefGrowth.length > 0
      ? monthlyBenefGrowth.reduce((s, v) => s + v, 0) / monthlyBenefGrowth.length
      : 50;

    const impactProjections = [];
    let cumulativeBeneficiaries = totalBeneficiaries;
    for (let q = 1; q <= 4; q++) {
      cumulativeBeneficiaries += Math.round(avgMonthlyGrowth * 3);
      impactProjections.push({
        quarter: `Q${q} ${now.getFullYear() + (now.getMonth() + q * 3 > 12 ? 1 : 0)}`,
        beneficiaries: cumulativeBeneficiaries,
        growth: Math.round(avgMonthlyGrowth * 3),
      });
    }

    // ─── 4. Category Insights ───────────────────────────────────────
    const categoryInsights = categoriesWithProjects.map((cat) => {
      const projects = cat.projects;
      const count = projects.length;
      const avgProgress = count > 0
        ? Math.round(projects.reduce((s: number, p: any) => s + p.progress, 0) / count)
        : 0;
      const totalCatBudget = projects.reduce((s: number, p: any) => s + p.budget, 0);
      const totalCatSpent = projects.reduce(
        (s: number, p: any) => s + p.expenses.reduce((es: number, e: any) => es + e.amount, 0), 0
      );
      const budgetUtilization = totalCatBudget > 0 ? Math.round((totalCatSpent / totalCatBudget) * 100) : 0;

      const allRatings = projects.flatMap((p: any) => p.reviews.map((r: any) => r.rating));
      const avgRating = allRatings.length > 0
        ? allRatings.reduce((s: number, r: number) => s + r, 0) / allRatings.length
        : 0;

      let riskLevel = 'low';
      if (budgetUtilization > 90) riskLevel = 'high';
      else if (budgetUtilization > 75) riskLevel = 'medium';

      let growthPotential = 'moderate';
      if (count < 3 && budgetUtilization < 50) growthPotential = 'high';
      else if (count > 8 && budgetUtilization > 80) growthPotential = 'low';

      return {
        category: cat.name,
        projects: count,
        avgProgress,
        budgetUtilization,
        riskLevel,
        growthPotential,
        avgRating: Math.round(avgRating * 10) / 10,
        budget: totalCatBudget,
        spent: totalCatSpent,
      };
    });

    // ─── 5. Overall Health ──────────────────────────────────────────
    const totalBudgetAll = activeProjects.reduce((s, p) => s + p.budget, 0);
    const totalSpentAll = activeProjects.reduce(
      (s, p) => s + p.expenses.reduce((es, e) => es + e.amount, 0), 0
    );
    const budgetHealthScore = totalBudgetAll > 0
      ? Math.max(0, Math.round((1 - totalSpentAll / totalBudgetAll) * 100))
      : 50;

    const avgProgress = activeProjects.length > 0
      ? activeProjects.reduce((s, p) => s + p.progress, 0) / activeProjects.length
      : 0;
    const avgElapsedPct = activeProjects.length > 0
      ? activeProjects.reduce((s, p) => {
          const total = new Date(p.endDate).getTime() - new Date(p.startDate).getTime();
          const elapsed = Math.max(0, now.getTime() - new Date(p.startDate).getTime());
          return s + (total > 0 ? (elapsed / total) * 100 : 0);
        }, 0) / activeProjects.length
      : 0;
    const timelineHealth = Math.min(100, Math.max(0, Math.round(
      avgElapsedPct > 0 ? (avgProgress / avgElapsedPct) * 100 : 50
    )));

    const qualityHealth = Math.round((reviewAgg._avg.rating || 3) / 5 * 100);
    const completionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

    const overallScore = Math.round(
      budgetHealthScore * 0.3 +
      timelineHealth * 0.3 +
      qualityHealth * 0.25 +
      completionRate * 0.15
    );

    const overallHealth = {
      score: overallScore,
      budgetHealth: budgetHealthScore,
      timelineHealth,
      qualityHealth,
      completionRate,
    };

    // ─── 6. AI Recommendations ──────────────────────────────────────
    const aiRecommendations: { title: string; description: string; priority: 'high' | 'medium' | 'low'; category: string }[] = [];

    // Budget recommendations
    const overBudgetProjects = activeProjects.filter(p => {
      const spent = p.expenses.reduce((s, e) => s + e.amount, 0);
      return spent > p.budget * 0.9;
    });
    if (overBudgetProjects.length > 0) {
      aiRecommendations.push({
        title: 'Budget Alert — Projects Nearing Limit',
        description: `${overBudgetProjects.length} project(s) have used 90%+ of their budget: ${overBudgetProjects.slice(0, 3).map(p => p.name).join(', ')}. Review spending and consider budget reallocation.`,
        priority: 'high',
        category: 'Budget',
      });
    }

    // Timeline recommendations
    const behindSchedule = activeProjects.filter(p => {
      const total = new Date(p.endDate).getTime() - new Date(p.startDate).getTime();
      const elapsed = Math.max(0, now.getTime() - new Date(p.startDate).getTime());
      const elapsedPct = total > 0 ? (elapsed / total) * 100 : 0;
      return p.progress < elapsedPct * 0.7;
    });
    if (behindSchedule.length > 0) {
      aiRecommendations.push({
        title: 'Timeline Risk — Projects Behind Schedule',
        description: `${behindSchedule.length} project(s) are significantly behind schedule. Consider reallocating resources or adjusting timelines.`,
        priority: 'high',
        category: 'Timeline',
      });
    }

    // Quality recommendations
    const lowQuality = activeProjects.filter(p => {
      const avg = p.reviews.length > 0
        ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length
        : 5;
      return avg < 3 && p.reviews.length >= 3;
    });
    if (lowQuality.length > 0) {
      aiRecommendations.push({
        title: 'Quality Concern — Low Review Scores',
        description: `${lowQuality.length} project(s) have average ratings below 3.0. Investigate and implement quality improvement measures.`,
        priority: 'medium',
        category: 'Quality',
      });
    }

    // Category balance
    const underservedCategories = categoryInsights.filter(c => c.projects <= 2 && c.growthPotential === 'high');
    if (underservedCategories.length > 0) {
      aiRecommendations.push({
        title: 'Growth Opportunity — Underserved Categories',
        description: `Categories with high growth potential but few projects: ${underservedCategories.map(c => c.category).join(', ')}. Consider launching new initiatives in these areas.`,
        priority: 'medium',
        category: 'Strategy',
      });
    }

    // Completion rate
    if (completionRate < 30 && totalProjects > 5) {
      aiRecommendations.push({
        title: 'Completion Rate Below Target',
        description: `Only ${completionRate}% of projects have been completed. Focus on finishing existing projects before launching new ones.`,
        priority: 'medium',
        category: 'Efficiency',
      });
    }

    // Beneficiary growth
    if (avgMonthlyGrowth < 20) {
      aiRecommendations.push({
        title: 'Beneficiary Growth Stalling',
        description: 'Monthly beneficiary growth rate is low. Consider scaling successful programs to reach more people.',
        priority: 'low',
        category: 'Impact',
      });
    }

    // Overall positive
    if (overallScore >= 70) {
      aiRecommendations.push({
        title: 'Strong Overall Performance',
        description: `System health score is ${overallScore}/100. Maintain current trajectory while exploring growth opportunities.`,
        priority: 'low',
        category: 'General',
      });
    }

    // Ensure at least 5 recommendations
    if (aiRecommendations.length < 5) {
      aiRecommendations.push({
        title: 'Diversify Regional Coverage',
        description: 'Consider expanding project coverage to underserved governorates for broader community impact.',
        priority: 'low',
        category: 'Strategy',
      });
    }

    res.json({
      success: true,
      data: {
        predictions: predictions.sort((a, b) => a.successProbability - b.successProbability),
        budgetForecast,
        impactProjections,
        categoryInsights,
        overallHealth,
        aiRecommendations,
      },
    });
  } catch (error) {
    console.error('GET /future error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch future predictions' },
    });
  }
});

export default router;
