/**
 * Smart Notification Scanner — CSR Platform
 *
 * Scans active projects for real-time risk conditions (budget overruns,
 * timeline slippage, quality degradation) and generates actionable
 * notifications for admins & managers.
 *
 * Also generates AI-powered insight notifications by analysing portfolio
 * trends and producing recommendations.
 */

import { prisma } from '../config/database.js';
import { budgetRisk, timeRisk, qualityRisk, impactRisk } from './riskService.js';
import { notificationService } from './notificationService.js';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RiskFinding {
  projectId: string;
  projectName: string;
  type: 'budget' | 'timeline' | 'quality' | 'impact';
  level: 'medium' | 'high' | 'critical';
  message: string;
  value: number;       // relevant metric (e.g. budget ratio %, time gap %)
  threshold: number;   // what the safe limit was
}

interface InsightRecommendation {
  title: string;
  message: string;
  type: 'ai_insight';
  link?: string;
}

// ── Risk Scanner ──────────────────────────────────────────────────────────────

/**
 * Scans ALL active/planning projects for risk conditions.
 * Creates Alert records and Notification records for admin/manager users.
 * De-duplicates: won't create an identical unresolved alert for the same project+type.
 */
export async function scanProjectRisks(): Promise<{
  scanned: number;
  findings: RiskFinding[];
  alertsCreated: number;
  notificationsSent: number;
}> {
  // Fetch active projects with expenses + reviews
  const projects = await prisma.project.findMany({
    where: { status: { in: ['active', 'planning'] } },
    select: {
      id: true,
      name: true,
      budget: true,
      progress: true,
      startDate: true,
      endDate: true,
      status: true,
      expenses: {
        where: { status: 'approved' },
        select: { amount: true },
      },
      reviews: {
        select: { rating: true },
      },
      beneficiaries: {
        select: { count: true },
      },
      expectedOutputs: true,
    },
  });

  // Fetch existing unresolved alerts to avoid duplicates
  const existingAlerts = await prisma.alert.findMany({
    where: { resolvedAt: null },
    select: { projectId: true, type: true },
  });
  const alertKey = (pid: string, type: string) => `${pid}::${type}`;
  const existingSet = new Set(existingAlerts.map(a => alertKey(a.projectId, a.type)));

  const findings: RiskFinding[] = [];
  let alertsCreated = 0;

  const now = Date.now();

  for (const project of projects) {
    const budget = Number(project.budget) || 0;
    const spent = project.expenses.reduce((s, e) => s + Number(e.amount), 0);
    const progress = Number(project.progress) || 0;

    // Budget risk
    if (budget > 0) {
      const ratio = spent / budget;
      const level = budgetRisk(spent, budget);
      if (level === 'high' || level === 'critical') {
        const pct = Math.round(ratio * 100);
        findings.push({
          projectId: project.id,
          projectName: project.name,
          type: 'budget',
          level,
          message: level === 'critical'
            ? `Project "${project.name}" has exceeded its budget by ${pct - 100}% (${pct}% utilised).`
            : `Project "${project.name}" is approaching budget limit at ${pct}% utilisation.`,
          value: pct,
          threshold: level === 'critical' ? 100 : 80,
        });
      }
    }

    // Timeline risk
    if (project.startDate && project.endDate) {
      const start = new Date(project.startDate).getTime();
      const end = new Date(project.endDate).getTime();
      const totalDuration = end - start;
      if (totalDuration > 0) {
        const elapsedPct = Math.min(Math.max((now - start) / totalDuration, 0), 1);
        const completionPct = progress / 100;
        const level = timeRisk(elapsedPct, completionPct);
        if (level === 'high' || level === 'critical') {
          const gap = Math.round((elapsedPct - completionPct) * 100);
          findings.push({
            projectId: project.id,
            projectName: project.name,
            type: 'timeline',
            level,
            message: level === 'critical'
              ? `Project "${project.name}" has a critical schedule gap of ${gap}%. Time elapsed far exceeds completion progress.`
              : `Project "${project.name}" is falling behind schedule with a ${gap}% gap between elapsed time and completion.`,
            value: gap,
            threshold: level === 'critical' ? 30 : 20,
          });
        }
      }
    }

    // Quality risk
    if (project.reviews.length >= 2) {
      const avg = project.reviews.reduce((s, r) => s + Number(r.rating), 0) / project.reviews.length;
      const level = qualityRisk(avg);
      if (level === 'high' || level === 'critical') {
        findings.push({
          projectId: project.id,
          projectName: project.name,
          type: 'quality',
          level,
          message: level === 'critical'
            ? `Project "${project.name}" has critically low quality ratings (avg ${avg.toFixed(1)}/5.0). Urgent review needed.`
            : `Project "${project.name}" quality ratings are below threshold (avg ${avg.toFixed(1)}/5.0).`,
          value: Math.round(avg * 10) / 10,
          threshold: level === 'critical' ? 2.0 : 3.0,
        });
      }
    }

    // Impact risk — compare actual beneficiaries vs expected
    const actualBenef = project.beneficiaries.reduce((s, b) => s + Number(b.count), 0);
    // Parse expectedOutputs for target beneficiary count
    let expectedBenef = 0;
    if (project.expectedOutputs) {
      const outputs = typeof project.expectedOutputs === 'string'
        ? JSON.parse(project.expectedOutputs)
        : project.expectedOutputs;
      if (Array.isArray(outputs)) {
        for (const o of outputs) {
          const str = typeof o === 'string' ? o : String(o?.value || o?.text || '');
          const match = str.match(/(\d[\d,]*)\s*(?:beneficiar|مستفيد|people|person|individual|family|families)/i);
          if (match) { expectedBenef = parseInt(match[1].replace(/,/g, ''), 10); break; }
        }
      }
      if (!expectedBenef && typeof outputs === 'object' && !Array.isArray(outputs)) {
        expectedBenef = Number(outputs.targetBeneficiaries || outputs.expectedBeneficiaries || 0);
      }
    }
    // Fallback: use budget as proxy (1 beneficiary per 50 OMR spent)
    if (expectedBenef <= 0 && budget > 0 && progress > 50) {
      expectedBenef = Math.round(budget / 50);
    }
    if (expectedBenef > 0) {
      const level = impactRisk(actualBenef, expectedBenef);
      if (level === 'high' || level === 'critical') {
        const ratio = Math.round((actualBenef / expectedBenef) * 100);
        findings.push({
          projectId: project.id,
          projectName: project.name,
          type: 'impact',
          level,
          message: level === 'critical'
            ? `Project "${project.name}" has critically low social impact: only ${actualBenef.toLocaleString()} of ${expectedBenef.toLocaleString()} expected beneficiaries reached (${ratio}%). Intervention required.`
            : `Project "${project.name}" is underperforming on social impact: ${actualBenef.toLocaleString()} of ${expectedBenef.toLocaleString()} expected beneficiaries (${ratio}%).`,
          value: ratio,
          threshold: level === 'critical' ? 25 : 50,
        });
      }
    }
  }

  // Create alerts + notifications for new findings
  for (const f of findings) {
    const key = alertKey(f.projectId, f.type);
    if (existingSet.has(key)) continue; // already tracked

    const alertLevel = f.level === 'critical' ? 'critical' : 'warning';

    await prisma.alert.create({
      data: {
        projectId: f.projectId,
        type: f.type,
        level: alertLevel,
        message: f.message,
      },
    });
    alertsCreated++;

    // Notify admins & managers
    const notifType = f.level === 'critical' ? 'risk_critical' : 'risk_warning';
    const emoji = f.type === 'budget' ? '💰' : f.type === 'timeline' ? '⏱️' : f.type === 'impact' ? '👥' : '⭐';
    const title = `${emoji} ${f.type.charAt(0).toUpperCase() + f.type.slice(1)} Risk Alert`;

    await notificationService.createForRole('admin', title, f.message, notifType, `/early-warning`);
    await notificationService.createForRole('manager', title, f.message, notifType, `/early-warning`);
  }

  return {
    scanned: projects.length,
    findings,
    alertsCreated,
    notificationsSent: alertsCreated * 2, // admin + manager
  };
}

// ── AI Insight Generator ──────────────────────────────────────────────────────

/**
 * Analyses portfolio-wide trends and generates smart recommendations
 * as notifications for admin/manager users.
 */
export async function generateAIInsights(): Promise<{
  insights: InsightRecommendation[];
  notificationsSent: number;
}> {
  const insights: InsightRecommendation[] = [];

  // Fetch aggregated data
  const [
    projectsByStatus,
    categoryPerformance,
    recentExpenses,
    totalBeneficiaries,
    partnerStats,
  ] = await Promise.all([
    prisma.project.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { budget: true },
    }),
    prisma.project.groupBy({
      by: ['categoryId'],
      _count: { id: true },
      _sum: { budget: true },
      _avg: { progress: true },
      where: { status: { in: ['active', 'completed'] } },
    }),
    prisma.expense.findMany({
      where: {
        status: 'approved',
        date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { amount: true, category: true },
    }),
    prisma.beneficiary.aggregate({ _sum: { count: true } }),
    prisma.partner.findMany({
      select: {
        id: true,
        name: true,
        donations: { select: { amount: true } },
      },
    }),
  ]);

  // Fetch category names for IDs
  const categoryIds = categoryPerformance.map(c => c.categoryId);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });
  const catMap = new Map(categories.map(c => [c.id, c.name]));

  // ── Insight 1: Category with highest average progress → recommend more investment
  const topCategory = categoryPerformance
    .filter(c => (c._count?.id || 0) >= 2)
    .sort((a, b) => (b._avg?.progress || 0) - (a._avg?.progress || 0))[0];

  if (topCategory) {
    const catName = catMap.get(topCategory.categoryId) || 'Unknown';
    const avgProg = Math.round(topCategory._avg?.progress || 0);
    insights.push({
      title: '🧠 AI Recommendation',
      message: `Based on portfolio analysis, the "${catName}" sector shows the highest performance (${avgProg}% avg completion). Consider increasing investment allocation to maximise impact.`,
      type: 'ai_insight',
      link: '/admin/categories',
    });
  }

  // ── Insight 2: Budget utilisation trend
  const totalBudget = projectsByStatus.reduce((s, p) => s + (Number(p._sum?.budget) || 0), 0);
  const recentSpend = recentExpenses.reduce((s, e) => s + Number(e.amount), 0);
  if (totalBudget > 0 && recentSpend > 0) {
    const monthlyRate = recentSpend;
    const active = projectsByStatus.find(s => s.status === 'active');
    const activeBudget = Number(active?._sum?.budget) || 0;
    if (activeBudget > 0) {
      const burnMonths = Math.round(activeBudget / monthlyRate);
      if (burnMonths <= 3) {
        insights.push({
          title: '📊 Spending Rate Alert',
          message: `At the current monthly spending rate of ${Math.round(monthlyRate).toLocaleString()} OMR, active project budgets will be depleted in approximately ${burnMonths} month${burnMonths !== 1 ? 's' : ''}. Review spending priorities.`,
          type: 'ai_insight',
          link: '/reports/financial',
        });
      }
    }
  }

  // ── Insight 3: Partner engagement opportunity
  const idlePartners = partnerStats.filter(p => p.donations.length === 0);
  if (idlePartners.length > 0) {
    insights.push({
      title: '🤝 Partnership Opportunity',
      message: `${idlePartners.length} registered partner${idlePartners.length > 1 ? 's have' : ' has'} no recorded donations. Engaging them could unlock additional CSR funding.`,
      type: 'ai_insight',
      link: '/partners',
    });
  }

  // ── Insight 4: Stalled projects detection
  const stalledProjects = await prisma.project.findMany({
    where: {
      status: 'active',
      progress: { lte: 20 },
      startDate: { lte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
    },
    select: { name: true },
    take: 5,
  });
  if (stalledProjects.length > 0) {
    const names = stalledProjects.map(p => p.name).join(', ');
    insights.push({
      title: '⚠️ Stalled Projects Detected',
      message: `${stalledProjects.length} project${stalledProjects.length > 1 ? 's are' : ' is'} active for 60+ days with less than 20% progress: ${names}. Consider intervention.`,
      type: 'ai_insight',
      link: '/projects',
    });
  }

  // ── Insight 5: SDG coverage gap
  const activeProjects = await prisma.project.findMany({
    where: { status: { in: ['active', 'planning'] } },
    select: { sdgGoals: true },
  });
  const sdgSet = new Set<number>();
  for (const p of activeProjects) {
    const goals = Array.isArray(p.sdgGoals) ? p.sdgGoals : [];
    goals.forEach((g: any) => sdgSet.add(typeof g === 'number' ? g : parseInt(g)));
  }
  const coveredGoals = sdgSet.size;
  if (coveredGoals < 10 && coveredGoals > 0) {
    insights.push({
      title: '🌍 SDG Coverage Analysis',
      message: `Current projects address ${coveredGoals} of 17 SDG goals. Expanding into uncovered goal areas would strengthen the organisation's sustainability profile.`,
      type: 'ai_insight',
      link: '/reports/impact',
    });
  }

  // ── Insight 6: Beneficiary milestone
  const totalBenef = Number(totalBeneficiaries._sum?.count) || 0;
  if (totalBenef > 0) {
    const milestone = [100000, 50000, 25000, 10000, 5000, 1000].find(m => totalBenef >= m);
    if (milestone) {
      insights.push({
        title: '🎯 Impact Milestone',
        message: `The CSR portfolio has reached ${totalBenef.toLocaleString()} total beneficiaries — surpassing the ${milestone.toLocaleString()} milestone. This achievement reflects strong community engagement.`,
        type: 'ai_insight',
        link: '/reports/impact',
      });
    }
  }

  // Send top 3 most relevant insights as notifications  
  const toSend = insights.slice(0, 3);
  for (const ins of toSend) {
    await notificationService.createForRole('admin', ins.title, ins.message, ins.type, ins.link);
    await notificationService.createForRole('manager', ins.title, ins.message, ins.type, ins.link);
  }

  return {
    insights,
    notificationsSent: toSend.length * 2,
  };
}
