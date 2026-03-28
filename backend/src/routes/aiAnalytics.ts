import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { aiAnalyticsService, SELECTABLE_MODELS } from '../services/aiAnalyticsService.js';
import { emailService } from '../services/emailService.js';

const router = Router();
router.use(authenticate);

// ── Zod Schema ─────────────────────────────────────────────────────────────────

const analyzeSchema = z.object({
  question: z.string().min(3).max(1000),
  scope: z.enum(['projects', 'financial', 'impact', 'partners', 'overview'])
    .optional()
    .default('overview'),
  model: z.string().optional(), // client-selected model ID; undefined = auto (free models)
});

// ── Routes ─────────────────────────────────────────────────────────────────────

// GET /api/ai-analytics/models — return selectable model list for frontend dropdown
router.get('/models', (_req: Request, res: Response) => {
  res.json({ success: true, data: SELECTABLE_MODELS });
});

// POST /api/ai-analytics/analyze — main AI analysis endpoint
router.post('/analyze', validate(analyzeSchema), async (req: Request, res: Response) => {
  try {
    const { question, scope, model } = req.body;

    // 1. Fetch real data from PostgreSQL
    const contextData = await aiAnalyticsService.fetchContextData(scope);

    // 2. Build dynamic system prompt with raw DB data
    const systemPrompt = aiAnalyticsService.buildSystemPrompt(contextData);

    // 3. Call GitHub Models (auto retries free models; specific model = no retry)
    const { content: rawResponse, modelUsed } =
      await aiAnalyticsService.callGitHubModels(systemPrompt, question, model);

    // 4. Parse response — local fallback if all free models rate-limited
    const result = rawResponse === '__LOCAL__'
      ? aiAnalyticsService.generateLocalAnalysis(contextData, question)
      : aiAnalyticsService.parseAiResponse(rawResponse);

    // 5. Activity log
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'ai_analysis',
        entity: 'ai_analytics',
        entityId: 'system',
        details: `AI analysis (${modelUsed}): "${question.substring(0, 100)}"`,
        type: 'query',
      },
    });

    // 6. Respond
    res.json({
      success: true,
      data: {
        question,
        scope,
        ...result,
        metadata: {
          model: modelUsed,
          dataScope: scope,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      error: {
        code: 'AI_ANALYSIS_FAILED',
        message: 'An unexpected error occurred',
      },
    });
  }
});

// ── Analyze Alerts Schema ───────────────────────────────────────────────────

const analyzeAlertsSchema = z.object({
  question: z.string().min(3).max(1000),
  alertIds: z.array(z.string()).optional(),
  riskType: z.enum(['budget', 'timeline', 'quality', 'all']).optional().default('all'),
});

// POST /api/ai-analytics/analyze-alerts — AI-powered risk & alert analysis
router.post('/analyze-alerts', validate(analyzeAlertsSchema), async (req: Request, res: Response) => {
  try {
    const { question, alertIds, riskType } = req.body;

    // 1. Fetch alert-specific context from PostgreSQL
    const alertContext = await aiAnalyticsService.fetchAlertContext(alertIds);

    // 2. Filter by risk type if specified
    if (riskType !== 'all') {
      alertContext.activeAlerts = alertContext.activeAlerts.filter(a => a.type === riskType);
    }

    // 3. Build alert-specific system prompt
    const systemPrompt = aiAnalyticsService.buildAlertSystemPrompt(alertContext);

    // 4. Call GitHub Models
    const { content: rawResponse, modelUsed } =
      await aiAnalyticsService.callGitHubModels(systemPrompt, question);

    // 5. Parse response — local fallback if needed
    const result = rawResponse === '__LOCAL__'
      ? aiAnalyticsService.generateLocalAlertAnalysis(alertContext, question)
      : aiAnalyticsService.parseAiResponse(rawResponse);

    // 6. Activity log
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'ai_alert_analysis',
        entity: 'ai_analytics',
        entityId: 'alerts',
        details: `AI alert analysis (${modelUsed}): "${question.substring(0, 100)}"`,
        type: 'query',
      },
    });

    // 7. Respond
    res.json({
      success: true,
      data: {
        question,
        riskType,
        ...result,
        metadata: {
          model: modelUsed,
          alertsAnalyzed: alertContext.activeAlerts.length,
          riskProjectsFound: alertContext.riskProjects.length,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      error: {
        code: 'AI_ALERT_ANALYSIS_FAILED',
        message: 'An unexpected error occurred',
      },
    });
  }
});

// ── Simulate Solution Schema ────────────────────────────────────────────────

const simulateSchema = z.object({
  alertId: z.string().uuid(),
  projectId: z.string().uuid(),
});

// POST /api/ai-analytics/simulate-solution — Prescriptive Analytics
router.post('/simulate-solution', validate(simulateSchema), async (req: Request, res: Response) => {
  try {
    const { alertId, projectId } = req.body;

    // 1. Fetch the target project with full context
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        expenses: { where: { status: 'approved' }, select: { amount: true, category: true } },
        beneficiaries: { select: { count: true } },
        reviews: { select: { rating: true } },
        category: { select: { name: true } },
      },
    });

    if (!project) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }

    // 2. Fetch the alert
    const alert = await prisma.alert.findUnique({ where: { id: alertId } });

    // 3. Fetch related projects for reallocation scenarios
    const relatedProjects = await prisma.project.findMany({
      where: {
        status: { in: ['active', 'planning'] },
        id: { not: projectId },
      },
      include: {
        expenses: { where: { status: 'approved' }, select: { amount: true } },
        beneficiaries: { select: { count: true } },
        category: { select: { name: true } },
      },
      take: 10,
    });

    // 4. Calculate current metrics
    const spent = project.expenses.reduce((s, e) => s + Number(e.amount), 0);
    const budget = Number(project.budget);
    const progress = Number(project.progress);
    const beneficiaries = project.beneficiaries.reduce((s, b) => s + Number(b.count), 0);
    const avgRating = project.reviews.length > 0
      ? project.reviews.reduce((s, r) => s + Number(r.rating), 0) / project.reviews.length
      : 0;

    // 5. Parse expected beneficiaries from expectedOutputs
    let expectedBeneficiaries = 0;
    try {
      const outputs = project.expectedOutputs as any;
      if (outputs) {
        if (typeof outputs === 'object' && !Array.isArray(outputs) && outputs.targetBeneficiaries) {
          expectedBeneficiaries = Number(outputs.targetBeneficiaries) || 0;
        } else if (Array.isArray(outputs)) {
          for (const item of outputs) {
            const str = typeof item === 'string' ? item : String(item);
            const match = str.match(/(\d[\d,]*)\s*(beneficiar|مستفيد|people|person|شخص|family|أسرة)/i);
            if (match) { expectedBeneficiaries = Number(match[1].replace(/,/g, '')); break; }
          }
        }
      }
    } catch { /* ignore parse errors */ }
    if (expectedBeneficiaries === 0 && budget > 0) {
      expectedBeneficiaries = Math.round(budget / 50); // fallback: 1 beneficiary per 50 OMR
    }
    const impactPct = expectedBeneficiaries > 0 ? Math.round((beneficiaries / expectedBeneficiaries) * 100) : 100;

    // 6. Generate simulation scenarios
    const scenarios = [];

    // Find under-budget projects that could donate budget (shared across scenarios)
    const donors = relatedProjects
      .map(p => {
        const pSpent = p.expenses.reduce((s, e) => s + Number(e.amount), 0);
        const pBudget = Number(p.budget);
        const surplus = pBudget - pSpent;
        const pBenef = p.beneficiaries.reduce((s, b) => s + Number(b.count), 0);
        return { id: p.id, name: p.name, surplus, utilization: pBudget > 0 ? pSpent / pBudget : 0, beneficiaries: pBenef };
      })
      .filter(p => p.surplus > 0 && p.utilization < 0.5)
      .sort((a, b) => b.surplus - a.surplus);

    // Scenario 1: Budget Reallocation (if budget risk)
    if (alert?.type === 'budget' || spent / budget > 0.8) {
      if (donors.length > 0) {
        const donor = donors[0];
        const transferAmount = Math.round(Math.min(donor.surplus * 0.2, (spent - budget) > 0 ? spent - budget : budget * 0.15));
        const newBudget = budget + transferAmount;
        const newUtilization = Math.round((spent / newBudget) * 100);
        const oldUtilization = Math.round((spent / budget) * 100);

        scenarios.push({
          id: 'budget_reallocation',
          title: 'Budget Reallocation',
          description: `Transfer ${transferAmount.toLocaleString()} OMR from "${donor.name}" (${Math.round(donor.utilization * 100)}% utilized, surplus: ${donor.surplus.toLocaleString()} OMR) to "${project.name}" — frees budget headroom for operations and beneficiary outreach`,
          impact: {
            before: { metric: 'Budget Utilization', value: oldUtilization, unit: '%', risk: oldUtilization > 100 ? 'critical' : 'high' },
            after: { metric: 'Budget Utilization', value: newUtilization, unit: '%', risk: newUtilization > 100 ? 'critical' : newUtilization > 80 ? 'high' : newUtilization > 60 ? 'medium' : 'low' },
          },
          confidence: 85,
          effort: 'low',
          timeframe: '1-2 days',
        });
      }
    }

    // Scenario: Combined Budget + Impact rescue (the "magic" scenario)
    // When budget is high AND impact is low — reallocation directly boosts beneficiary reach
    if ((spent / budget > 0.8) && (impactPct < 60) && donors.length > 0) {
      const donor = donors[0];
      const transferAmount = Math.round(Math.min(donor.surplus * 0.25, budget * 0.2));
      const costPerBeneficiary = beneficiaries > 0 ? spent / beneficiaries : 50;
      const additionalBenef = Math.round(transferAmount / costPerBeneficiary);
      const newBeneficiaries = beneficiaries + additionalBenef;
      const newImpactPct = expectedBeneficiaries > 0 ? Math.round((newBeneficiaries / expectedBeneficiaries) * 100) : 100;

      scenarios.push({
        id: 'impact_rescue',
        title: 'Impact Rescue — Budget-to-Beneficiaries',
        description: `"${project.name}" is spending ${Math.round(spent / budget * 100)}% of budget but reaching only ${impactPct}% of target beneficiaries. Transfer ${transferAmount.toLocaleString()} OMR from "${donor.name}" to fund direct outreach — estimated to reach ${additionalBenef.toLocaleString()} additional beneficiaries`,
        impact: {
          before: { metric: 'Beneficiary Achievement', value: impactPct, unit: '%', risk: impactPct < 25 ? 'critical' : impactPct < 50 ? 'high' : 'medium' },
          after: { metric: 'Beneficiary Achievement', value: Math.min(newImpactPct, 100), unit: '%', risk: newImpactPct >= 75 ? 'low' : newImpactPct >= 50 ? 'medium' : 'high' },
        },
        confidence: 72,
        effort: 'medium',
        timeframe: '1-3 weeks',
      });
    }

    // Scenario 2: Timeline Recovery (if timeline risk)
    const start = new Date(project.startDate).getTime();
    const end = new Date(project.endDate).getTime();
    const now = Date.now();
    const elapsed = end > start ? Math.min(Math.max((now - start) / (end - start), 0), 1) : 0;
    const gap = Math.round((elapsed - progress / 100) * 100);

    if (alert?.type === 'timeline' || gap > 15) {
      const extensionDays = Math.round(gap * 3);
      const newEndDate = new Date(end + extensionDays * 24 * 60 * 60 * 1000);
      const newElapsed = Math.min(Math.max((now - start) / (newEndDate.getTime() - start), 0), 1);
      const newGap = Math.round((newElapsed - progress / 100) * 100);

      scenarios.push({
        id: 'timeline_extension',
        title: 'Timeline Extension',
        description: `Extend deadline by ${extensionDays} days (to ${newEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}) to allow current team to complete milestones`,
        impact: {
          before: { metric: 'Schedule Gap', value: gap, unit: '%', risk: gap > 30 ? 'critical' : 'high' },
          after: { metric: 'Schedule Gap', value: Math.max(newGap, 0), unit: '%', risk: newGap > 30 ? 'critical' : newGap > 20 ? 'high' : newGap > 10 ? 'medium' : 'low' },
        },
        confidence: 75,
        effort: 'low',
        timeframe: 'Immediate',
      });

      // Resource boost scenario
      const additionalResources = Math.ceil(gap / 15);
      scenarios.push({
        id: 'resource_boost',
        title: 'Resource Boost',
        description: `Add ${additionalResources} team member${additionalResources > 1 ? 's' : ''} to accelerate completion — expected to close ${Math.round(gap * 0.6)}% of the schedule gap within 2 weeks`,
        impact: {
          before: { metric: 'Schedule Gap', value: gap, unit: '%', risk: gap > 30 ? 'critical' : 'high' },
          after: { metric: 'Schedule Gap', value: Math.max(Math.round(gap * 0.4), 0), unit: '%', risk: Math.round(gap * 0.4) > 20 ? 'high' : Math.round(gap * 0.4) > 10 ? 'medium' : 'low' },
        },
        confidence: 70,
        effort: 'medium',
        timeframe: '2-3 weeks',
      });
    }

    // Scenario 3: Impact Boost (if impact risk)
    if (alert?.type === 'impact' || beneficiaries < 50) {
      const partnerCount = relatedProjects.length;
      const estimatedBoost = Math.round(beneficiaries * 0.5 + 100);

      scenarios.push({
        id: 'community_outreach',
        title: 'Community Outreach Partnership',
        description: `Partner with ${Math.min(partnerCount, 3)} existing CSR partners to expand beneficiary reach through joint community events and mobile outreach programs`,
        impact: {
          before: { metric: 'Beneficiaries', value: beneficiaries, unit: ' people', risk: beneficiaries < 50 ? 'critical' : 'high' },
          after: { metric: 'Beneficiaries', value: beneficiaries + estimatedBoost, unit: ' people', risk: 'medium' },
        },
        confidence: 65,
        effort: 'medium',
        timeframe: '3-4 weeks',
      });
    }

    // Scenario 4: Quality Improvement (if quality risk)
    if (alert?.type === 'quality' || (avgRating > 0 && avgRating < 3.0)) {
      scenarios.push({
        id: 'quality_review',
        title: 'Quality Improvement Workshop',
        description: `Conduct a 2-day quality audit workshop with the project team and external reviewers to identify improvement areas and establish quality checkpoints`,
        impact: {
          before: { metric: 'Average Rating', value: Math.round(avgRating * 10) / 10, unit: '/5.0', risk: avgRating < 2 ? 'critical' : 'high' },
          after: { metric: 'Average Rating', value: Math.round(Math.min(avgRating + 1.2, 4.5) * 10) / 10, unit: '/5.0', risk: 'medium' },
        },
        confidence: 60,
        effort: 'high',
        timeframe: '1-2 weeks',
      });
    }

    // If no specific scenarios, generate a general one
    if (scenarios.length === 0) {
      scenarios.push({
        id: 'general_review',
        title: 'Comprehensive Project Review',
        description: `Schedule a comprehensive project review meeting with all stakeholders to assess current status and define corrective actions`,
        impact: {
          before: { metric: 'Overall Risk', value: 0, unit: '', risk: 'high' },
          after: { metric: 'Overall Risk', value: 0, unit: '', risk: 'medium' },
        },
        confidence: 55,
        effort: 'low',
        timeframe: '1 week',
      });
    }

    // 6. Activity log
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'simulate_solution',
        entity: 'ai_analytics',
        entityId: projectId,
        details: `Simulated ${scenarios.length} solution(s) for project "${project.name}" (alert: ${alertId})`,
        type: 'query',
      },
    });

    res.json({
      success: true,
      data: {
        project: {
          id: project.id,
          name: project.name,
          category: project.category?.name,
          budget,
          spent,
          progress,
          beneficiaries,
          avgRating: Math.round(avgRating * 10) / 10,
        },
        alert: alert ? { id: alert.id, type: alert.type, level: alert.level, message: alert.message } : null,
        scenarios,
        metadata: {
          generatedAt: new Date().toISOString(),
          scenarioCount: scenarios.length,
        },
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      error: { code: 'SIMULATION_FAILED', message: 'Failed to generate solution scenarios' },
    });
  }
});

// POST /api/ai-analytics/trigger-audit — Manual trigger for Midnight Auditor
router.post('/trigger-audit', async (req: Request, res: Response) => {
  try {
    // Only admin/manager can trigger
    if (!['admin', 'manager'].includes(req.user!.role)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only admin/manager can trigger audits' } });
    }

    const { runMidnightAudit } = await import('../jobs/midnightAuditor.js');
    // Run in background, don't block the response
    runMidnightAudit();

    res.json({
      success: true,
      data: { message: 'Midnight Auditor triggered. Results will be sent via email and notifications.' },
    });
  } catch {
    res.status(500).json({
      success: false,
      error: { code: 'AUDIT_TRIGGER_FAILED', message: 'Failed to trigger audit' },
    });
  }
});

// ── Scenario Actions ────────────────────────────────────────────────────────

const submitScenarioSchema = z.object({
  projectId: z.string().uuid(),
  alertId: z.string().uuid().optional(),
  scenarioId: z.string(),
  title: z.string(),
  description: z.string(),
  impactBefore: z.object({ metric: z.string(), value: z.number(), unit: z.string(), risk: z.string() }),
  impactAfter: z.object({ metric: z.string(), value: z.number(), unit: z.string(), risk: z.string() }),
  confidence: z.number(),
  effort: z.string(),
  timeframe: z.string(),
});

// POST /api/ai-analytics/scenario-actions — Submit scenario for approval
router.post('/scenario-actions', validate(submitScenarioSchema), async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const action = await prisma.scenarioAction.create({
      data: {
        projectId: data.projectId,
        alertId: data.alertId || null,
        scenarioId: data.scenarioId,
        title: data.title,
        description: data.description,
        impactBefore: data.impactBefore,
        impactAfter: data.impactAfter,
        confidence: data.confidence,
        effort: data.effort,
        timeframe: data.timeframe,
        createdById: req.user!.id,
      },
      include: {
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'submit_scenario',
        entity: 'scenario_action',
        entityId: action.id,
        details: `Submitted scenario "${data.title}" for project "${action.project.name}" — awaiting approval`,
        type: 'create',
      },
    });

    res.json({ success: true, data: action });
  } catch (error) {
    console.error('POST /scenario-actions error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to submit scenario' } });
  }
});

// GET /api/ai-analytics/scenario-actions — List all scenario actions
router.get('/scenario-actions', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const where: any = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status)) where.status = status;

    const actions = await prisma.scenarioAction.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, status: true } },
        createdBy: { select: { id: true, name: true, role: true } },
        approvedBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ success: true, data: actions });
  } catch (error) {
    console.error('GET /scenario-actions error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch scenario actions' } });
  }
});

const approveRejectSchema = z.object({
  executionNote: z.string().max(500).optional(),
  rejectionReason: z.string().max(500).optional(),
});

// PATCH /api/ai-analytics/scenario-actions/:id/approve — Approve a scenario
router.patch('/scenario-actions/:id/approve', requireRole(['admin', 'manager']), validate(approveRejectSchema), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const note = (req.body.executionNote as string) || '';
    const existing = await prisma.scenarioAction.findUnique({
      where: { id },
      include: {
        project: { select: { name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Scenario action not found' } });
    }
    if (existing.status !== 'pending') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `Cannot approve a scenario that is already ${existing.status}` } });
    }

    const action = await prisma.scenarioAction.update({
      where: { id },
      data: {
        status: 'approved',
        approvedById: req.user!.id,
        approvedAt: new Date(),
        executionNote: note || null,
      },
      include: {
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });

    // Resolve the linked alert if exists
    if (existing.alertId) {
      await prisma.alert.updateMany({
        where: { id: existing.alertId, resolvedAt: null },
        data: { resolvedAt: new Date() },
      });
    }

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        projectId: existing.projectId,
        action: 'approve_scenario',
        entity: 'scenario_action',
        entityId: id,
        details: `Approved scenario "${existing.title}" for project "${existing.project.name}"${note ? ` — Note: ${note}` : ''}`,
        type: 'update',
      },
    });

    // Notify the creator (in-app notification only if different user)
    if (existing.createdById !== req.user!.id) {
      await prisma.notification.create({
        data: {
          userId: existing.createdById,
          title: 'Scenario Approved',
          message: `Your scenario "${existing.title}" for "${existing.project.name}" has been approved by ${action.approvedBy?.name}`,
          type: 'success',
          link: '/early-warning',
        },
      });
    }

    // Always send email (even if same user — for audit trail)
    const before = existing.impactBefore as { metric: string; value: number; unit: string; risk: string };
    const after = existing.impactAfter as { metric: string; value: number; unit: string; risk: string };
    emailService.sendScenarioApproved(existing.createdBy.email, {
      recipientName: existing.createdBy.name,
      scenarioTitle: existing.title,
      projectName: existing.project.name,
      approverName: action.approvedBy?.name || req.user!.email,
      description: existing.description,
      before,
      after,
      executionNote: note || undefined,
    }).catch(err => console.error('Email send error:', err));

    res.json({ success: true, data: action });
  } catch (error) {
    console.error('PATCH /scenario-actions/:id/approve error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to approve scenario' } });
  }
});

// PATCH /api/ai-analytics/scenario-actions/:id/reject — Reject a scenario
router.patch('/scenario-actions/:id/reject', requireRole(['admin', 'manager']), validate(approveRejectSchema), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const reason = (req.body.rejectionReason as string) || '';
    const existing = await prisma.scenarioAction.findUnique({
      where: { id },
      include: {
        project: { select: { name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Scenario action not found' } });
    }
    if (existing.status !== 'pending') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `Cannot reject a scenario that is already ${existing.status}` } });
    }

    const action = await prisma.scenarioAction.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectedById: req.user!.id,
        rejectedAt: new Date(),
        rejectionReason: reason || null,
      },
      include: {
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        projectId: existing.projectId,
        action: 'reject_scenario',
        entity: 'scenario_action',
        entityId: id,
        details: `Rejected scenario "${existing.title}" for project "${existing.project.name}"${reason ? ` — Reason: ${reason}` : ''}`,
        type: 'update',
      },
    });

    // Notify the creator (in-app notification only if different user)
    if (existing.createdById !== req.user!.id) {
      await prisma.notification.create({
        data: {
          userId: existing.createdById,
          title: 'Scenario Rejected',
          message: `Your scenario "${existing.title}" for "${existing.project.name}" was rejected${reason ? `: ${reason}` : ''}`,
          type: 'warning',
          link: '/early-warning',
        },
      });
    }

    // Always send email
    emailService.sendScenarioRejected(existing.createdBy.email, {
      recipientName: existing.createdBy.name,
      scenarioTitle: existing.title,
      projectName: existing.project.name,
      rejectorName: req.user!.email,
      description: existing.description,
      rejectionReason: reason || undefined,
    }).catch(err => console.error('Email send error:', err));

    res.json({ success: true, data: action });
  } catch (error) {
    console.error('PATCH /scenario-actions/:id/reject error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to reject scenario' } });
  }
});

// GET /api/ai-analytics/context — raw DB context (debug/testing)
router.get('/context', async (req: Request, res: Response) => {
  try {
    const scope = (req.query.scope as string) || 'overview';
    const contextData = await aiAnalyticsService.fetchContextData(scope);
    res.json({ success: true, data: contextData });
  } catch {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch context data' },
    });
  }
});

export default router;
