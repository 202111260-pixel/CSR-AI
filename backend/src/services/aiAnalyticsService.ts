import { prisma } from '../config/database.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AiChart {
  title: string;
  type: 'bar' | 'line' | 'area' | 'donut';
  xKey?: string;
  yKeys?: string[];
  data: Record<string, unknown>[];
}

export interface AiAnalysisResult {
  analysis: string;
  keyFindings: string[];
  recommendations: string[];
  chartData: AiChart[];
  sdgConnections: string[];
}

interface ProjectData {
  name: string;
  category: string;
  status: string;
  region: string;
  budget: number;
  spent: number;
  progress: number;
  startDate: Date;
  endDate: Date;
  sdgGoals: unknown;
  totalBeneficiaries: number;
  male: number;
  female: number;
  children: number;
  elderly: number;
  avgRating: number | null;
}

interface ContextData {
  projectsByStatus: { status: string; count: number; totalBudget: number }[];
  categories: string[];
  projectsByRegion: { region: string; count: number; totalBudget: number }[];
  projects?: ProjectData[];
  financials?: {
    totalBudget: number;
    totalSpent: number;
    expensesByCategory: { category: string; totalAmount: number; count: number }[];
  };
  impact?: {
    totalBeneficiaries: number;
    male: number;
    female: number;
    children: number;
    elderly: number;
    disabled: number;
  };
  partners?: {
    name: string;
    type: string;
    supportArea: string;
    status: string;
    totalDonated: number;
    donationCount: number;
  }[];
}

// ── Model Registry (GitHub Models — verified available) ──────────────────────

export const SELECTABLE_MODELS = [
  // OpenAI
  { id: 'gpt-4.1',                              label: 'GPT-4.1 (Latest)',     tier: 'pro' },
  { id: 'gpt-4.1-mini',                         label: 'GPT-4.1 Mini',        tier: 'pro' },
  { id: 'gpt-4.1-nano',                         label: 'GPT-4.1 Nano',        tier: 'pro' },
  { id: 'gpt-4o',                               label: 'GPT-4o',              tier: 'pro' },
  { id: 'gpt-4o-mini',                          label: 'GPT-4o Mini',         tier: 'pro' },
  // Meta Llama
  { id: 'Llama-4-Scout-17B-16E-Instruct',       label: 'Llama 4 Scout',       tier: 'pro' },
  { id: 'Meta-Llama-3.1-405B-Instruct',         label: 'Llama 3.1 405B',      tier: 'pro' },
  { id: 'Meta-Llama-3.1-70B-Instruct',          label: 'Llama 3.1 70B',       tier: 'pro' },
  // DeepSeek
  { id: 'DeepSeek-R1',                           label: 'DeepSeek R1',         tier: 'pro' },
  // Microsoft
  { id: 'MAI-DS-R1',                             label: 'MAI DS-R1',           tier: 'pro' },
  { id: 'Phi-4',                                 label: 'Phi-4',               tier: 'pro' },
  // Mistral
  { id: 'Mistral-large-2407',                    label: 'Mistral Large',       tier: 'pro' },
  { id: 'Codestral-2501',                        label: 'Codestral',           tier: 'pro' },
  // Cohere
  { id: 'Cohere-command-r-plus-08-2024',         label: 'Cohere Command R+',   tier: 'pro' },
] as const;

// Retry pool for auto mode — ordered by availability (verified working first)
const FREE_MODELS: string[] = [
  'gpt-4o-mini',          // verified 200 ✓
  'gpt-4o',               // verified 200 ✓
  'gpt-4.1-mini',
  'gpt-4.1',
  'Phi-4',
  'Llama-4-Scout-17B-16E-Instruct',
  'Meta-Llama-3.1-70B-Instruct',
  'Mistral-large-2407',
  'DeepSeek-R1',
];

// ── Data Fetcher ───────────────────────────────────────────────────────────────

async function fetchContextData(scope: string): Promise<ContextData> {
  const [projectCount, categoryList, regionGroups] = await Promise.all([
    prisma.project.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { budget: true },
    }),
    prisma.category.findMany({ select: { name: true } }),
    prisma.project.groupBy({
      by: ['region'],
      _count: { id: true },
      _sum: { budget: true },
    }),
  ]);

  const contextData: ContextData = {
    projectsByStatus: projectCount.map(r => ({
      status: r.status,
      count: r._count.id,
      totalBudget: r._sum.budget || 0,
    })),
    categories: categoryList.map(c => c.name),
    projectsByRegion: regionGroups
      .filter(r => r.region)
      .map(r => ({
        region: r.region!,
        count: r._count.id,
        totalBudget: r._sum.budget || 0,
      })),
  };

  if (scope === 'projects' || scope === 'overview') {
    const projects = await prisma.project.findMany({
      where: { status: { not: 'archived' } },
      select: {
        id: true, name: true, status: true, budget: true, progress: true,
        region: true, startDate: true, endDate: true, sdgGoals: true,
        category: { select: { name: true } },
        expenses: { where: { status: 'approved' }, select: { amount: true } },
        beneficiaries: { select: { count: true, male: true, female: true, children: true, elderly: true } },
        reviews: { select: { rating: true } },
      },
    });

    contextData.projects = projects.map(p => ({
      name: p.name,
      category: p.category?.name || 'Uncategorized',
      status: p.status,
      region: p.region || 'Unknown',
      budget: p.budget,
      spent: p.expenses.reduce((s, e) => s + e.amount, 0),
      progress: p.progress,
      startDate: p.startDate,
      endDate: p.endDate,
      sdgGoals: p.sdgGoals,
      totalBeneficiaries: p.beneficiaries.reduce((s, b) => s + b.count, 0),
      male: p.beneficiaries.reduce((s, b) => s + b.male, 0),
      female: p.beneficiaries.reduce((s, b) => s + b.female, 0),
      children: p.beneficiaries.reduce((s, b) => s + b.children, 0),
      elderly: p.beneficiaries.reduce((s, b) => s + b.elderly, 0),
      avgRating: p.reviews.length > 0
        ? Math.round((p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length) * 10) / 10
        : null,
    }));
  }

  if (scope === 'financial' || scope === 'overview') {
    const [expensesByCategory, totalApproved, totalBudget] = await Promise.all([
      prisma.expense.groupBy({
        by: ['category'],
        where: { status: 'approved' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.expense.aggregate({ where: { status: 'approved' }, _sum: { amount: true } }),
      prisma.project.aggregate({ where: { status: { not: 'archived' } }, _sum: { budget: true } }),
    ]);

    contextData.financials = {
      totalBudget: totalBudget._sum.budget || 0,
      totalSpent: totalApproved._sum.amount || 0,
      expensesByCategory: expensesByCategory.map(e => ({
        category: e.category,
        totalAmount: e._sum.amount || 0,
        count: e._count.id,
      })),
    };
  }

  if (scope === 'impact' || scope === 'overview') {
    const agg = await prisma.beneficiary.aggregate({
      _sum: { count: true, male: true, female: true, children: true, elderly: true, disabled: true },
    });
    contextData.impact = {
      totalBeneficiaries: agg._sum.count || 0,
      male: agg._sum.male || 0,
      female: agg._sum.female || 0,
      children: agg._sum.children || 0,
      elderly: agg._sum.elderly || 0,
      disabled: agg._sum.disabled || 0,
    };
  }

  if (scope === 'partners' || scope === 'overview') {
    const partners = await prisma.partner.findMany({
      select: {
        name: true, type: true, supportArea: true, status: true,
        donations: { select: { amount: true } },
      },
    });
    contextData.partners = partners.map(p => ({
      name: p.name,
      type: p.type,
      supportArea: p.supportArea || '',
      status: p.status,
      totalDonated: p.donations.reduce((s, d) => s + d.amount, 0),
      donationCount: p.donations.length,
    }));
  }

  const totalProjects = contextData.projectsByStatus.reduce((s, p) => s + p.count, 0);
  console.log(
    `[AI] DB fetched: ${totalProjects} projects, ` +
    `${contextData.categories.length} categories, ` +
    `${contextData.projectsByRegion.length} regions (scope="${scope}")`
  );

  return contextData;
}

// ── System Prompt Builder — compact (<5000 tokens) ────────────────────────────

function buildSystemPrompt(contextData: ContextData): string {
  const totalProjects = contextData.projectsByStatus.reduce((s, p) => s + p.count, 0);
  const totalBudget   = contextData.projectsByStatus.reduce((s, p) => s + p.totalBudget, 0);

  // Pre-aggregate SDG distribution — normalize "3" / "SDG3" / "SDG 3" → "SDG3"
  const sdgMap: Record<string, { projects: number; budget: number; beneficiaries: number }> = {};
  for (const p of contextData.projects ?? []) {
    const rawGoals = Array.isArray(p.sdgGoals) ? p.sdgGoals as unknown[] : [];
    for (const g of rawGoals) {
      const raw = String(g).trim().replace(/["\s]/g, '');
      if (!raw) continue;
      // normalise to "SDGn" form
      const key = /^SDG/i.test(raw) ? raw.toUpperCase() : `SDG${raw}`;
      if (!sdgMap[key]) sdgMap[key] = { projects: 0, budget: 0, beneficiaries: 0 };
      sdgMap[key].projects++;
      sdgMap[key].budget += Math.round(p.budget);
      sdgMap[key].beneficiaries += p.totalBeneficiaries;
    }
  }
  const sdgDistribution = Object.entries(sdgMap)
    .map(([sdg, v]) => ({ sdg, projects: v.projects, budget: v.budget, beneficiaries: v.beneficiaries }))
    .sort((a, b) => b.projects - a.projects);

  // Category aggregation
  const catMap: Record<string, { projects: number; budget: number; spent: number; beneficiaries: number; progress: number }> = {};
  for (const p of contextData.projects ?? []) {
    if (!catMap[p.category]) catMap[p.category] = { projects: 0, budget: 0, spent: 0, beneficiaries: 0, progress: 0 };
    catMap[p.category].projects++;
    catMap[p.category].budget += Math.round(p.budget);
    catMap[p.category].spent  += Math.round(p.spent);
    catMap[p.category].beneficiaries += p.totalBeneficiaries;
    catMap[p.category].progress += p.progress;
  }
  const categoryStats = Object.entries(catMap).map(([category, v]) => ({
    category,
    projects: v.projects,
    budget: v.budget,
    spent: v.spent,
    beneficiaries: v.beneficiaries,
    avgProgress: Math.round(v.progress / v.projects),
  }));

  const compactData = {
    totals: { projects: totalProjects, budget: Math.round(totalBudget) },
    byStatus: contextData.projectsByStatus.map(s => ({ status: s.status, count: s.count, budget: Math.round(s.totalBudget) })),
    byRegion: contextData.projectsByRegion.map(r => ({ region: r.region, count: r.count })),
    sdgDistribution,   // pre-aggregated → ready for charts
    categoryStats,     // pre-aggregated → ready for charts
    ...(contextData.financials ? {
      financials: {
        totalBudget: Math.round(contextData.financials.totalBudget),
        totalSpent:  Math.round(contextData.financials.totalSpent),
        expensesByCategory: contextData.financials.expensesByCategory.map(e => ({ cat: e.category, amt: Math.round(e.totalAmount) })),
      }
    } : {}),
    ...(contextData.impact ? { impact: contextData.impact } : {}),
    ...(contextData.partners?.length ? {
      partners: contextData.partners.map(p => ({ n: p.name, type: p.type, donated: Math.round(p.totalDonated) }))
    } : {}),
  };

  const dataJson = JSON.stringify(compactData);

  return `You are CSR AI bilingual analyst for Oman CSR Platform. Always reply in the SAME language the user writes in.
Reply ONLY with ONE valid JSON object — no code fences, no text outside JSON.
Format: {"analysis":"2-3 paragraphs","keyFindings":["..."],"recommendations":["..."],"chartData":[{"title":"...","type":"bar","xKey":"sdg","yKeys":["projects","budget"],"data":[...]}],"sdgConnections":["SDG X: ..."]}
RULES:
- ALWAYS include 2-3 charts for every data/analytical question — NEVER return empty chartData[] for data questions
- bar/line/area: needs xKey(string field) + yKeys(numeric fields array) + data array
- donut: needs data array with {name,value} objects
- Use pre-aggregated arrays directly as chart data (they are already the right shape):
  SDG questions → sdgDistribution (xKey:"sdg", yKeys:["projects","beneficiaries"] or ["budget"])
  Category questions → categoryStats (xKey:"category", yKeys:["budget","spent"] or ["avgProgress"])
  Status questions → byStatus (xKey:"status", yKeys:["count"])
  Region questions → byRegion (xKey:"region", yKeys:["count"])
- Greetings only → warm reply in analysis, all arrays empty
LIVE DATA (PostgreSQL): ${dataJson}`;
}

// ── GitHub Models API Caller ──────────────────────────────────────────────────

const GITHUB_MODELS_URL = 'https://models.inference.ai.azure.com/chat/completions';

async function callGitHubModels(
  systemPrompt: string,
  userQuestion: string,
  model?: string
): Promise<{ content: string; modelUsed: string }> {
  const apiKey = process.env.GITHUB_MODELS_TOKEN || process.env.GITHUB_TOKEN!;

  // Single model mode — no retry
  if (model) {
    console.log(`[AI] → GitHub Models: model="${model}", promptLength=${systemPrompt.length}`);

    const response = await fetch(GITHUB_MODELS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuestion },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`GitHub Models "${model}" failed (${response.status}): ${errBody}`);
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error(`GitHub Models "${model}" returned empty response`);

    console.log(`[AI] ← Response from model="${model}", contentLength=${content.length}`);
    return { content, modelUsed: model };
  }

  // Auto mode — retry through free models in order
  let lastError = '';
  for (const freeModel of FREE_MODELS) {
    console.log(`[AI] → GitHub Models: model="${freeModel}", promptLength=${systemPrompt.length}`);
    try {
      const response = await fetch(GITHUB_MODELS_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: freeModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userQuestion },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        lastError = `${freeModel}: ${response.status} - ${errBody}`;
        console.warn(`[AI] Model "${freeModel}" failed (${response.status}), trying next...`);
        continue;
      }

      const data: any = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        lastError = `${freeModel}: empty response`;
        console.warn(`[AI] Model "${freeModel}" returned empty response, trying next...`);
        continue;
      }

      console.log(`[AI] ← Response from model="${freeModel}", contentLength=${content.length}`);
      return { content, modelUsed: freeModel };
    } catch (err: any) {
      lastError = `${freeModel}: ${err.message}`;
      console.warn(`[AI] Model "${freeModel}" error: ${err.message}, trying next...`);
    }
  }

  // All models failed — fall back to local analysis engine
  console.warn(`[AI] All GitHub Models failed. Falling back to local analysis engine.`);
  return { content: '__LOCAL__', modelUsed: 'local-analysis-engine' };
}

// ── Response Parser ────────────────────────────────────────────────────────────

function parseAiResponse(raw: string): AiAnalysisResult {
  console.log(`[AI] Raw response preview: ${raw.substring(0, 200)}...`);

  let cleaned = raw.trim();
  // Strip markdown code fences if model wrapped response despite instructions
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`AI returned invalid JSON. Response started with: "${raw.substring(0, 100)}"`);
  }

  return {
    analysis: typeof parsed.analysis === 'string' ? parsed.analysis : 'No analysis generated.',
    keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings : [],
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    chartData: Array.isArray(parsed.chartData) ? parsed.chartData : [],
    sdgConnections: Array.isArray(parsed.sdgConnections) ? parsed.sdgConnections : [],
  };
}

// ── Local Analysis Engine (Rate-limit Fallback) ────────────────────────────────

function generateLocalAnalysis(contextData: ContextData, question: string): AiAnalysisResult {
  const q = question.toLowerCase().trim();

  // ── Greeting / conversational detection ─────────────────────────────────────
  const isGreeting = /^(هلا|هلو|مرحبا|مرحبا|السلام عليكم|صباح الخير|مساء الخير|اهلا|أهلا|كيف حالك|شلونك|ايش اخبارك|hello|hi |hey |good morning|good evening|howdy|what's up|sup\b|greetings|كيف|ممتاز|شكرا|thank|thanks|cheers|bye|مع السلامة|وداعا)/i.test(q)
    || q.length < 12 && !/\d/.test(q) && !/budget|project|region|categ|spend|impact|ميزانية|مشروع/i.test(q);

  if (isGreeting) {
    const isArabic = /[\u0600-\u06FF]/.test(question);
    if (isArabic) {
      return {
        analysis: `أهلاً وسهلاً! 👋 أنا مساعد CSR الذكاء الاصطناعي — هنا لمساعدتك في تحليل بيانات منصة المسؤولية الاجتماعية لعُمان.\n\nيمكنك سؤالي عن:\n• تحليل الميزانية والإنفاق\n• أداء المشاريع حسب المنطقة أو الفئة\n• المستفيدين والأثر الاجتماعي\n• توافق الأهداف مع خطط التنمية المستدامة\n\nكيف يمكنني مساعدتك اليوم؟`,
        keyFindings: [],
        recommendations: [],
        chartData: [],
        sdgConnections: [],
      };
    }
    return {
      analysis: `Hello! 👋 I'm the CSR AI Assistant for Oman's CSR Platform.\n\nI can help you analyze:\n• Budget utilization & spending trends\n• Project performance by region or category\n• Beneficiary reach & social impact\n• SDG alignment across your portfolio\n\nWhat would you like to explore today?`,
      keyFindings: [],
      recommendations: [],
      chartData: [],
      sdgConnections: [],
    };
  }

  const chartData: AiChart[] = [];
  const keyFindings: string[] = [];
  const recommendations: string[] = [];
  const sdgConnections: string[] = [];

  const totalProjects = contextData.projectsByStatus.reduce((s, p) => s + p.count, 0);
  const totalBudget = contextData.projectsByStatus.reduce((s, p) => s + p.totalBudget, 0);

  // Status donut (always)
  chartData.push({
    title: 'Projects by Status',
    type: 'donut',
    data: contextData.projectsByStatus.map(s => ({
      name: s.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value: s.count,
    })),
  });

  // Category / ROI analysis
  if ((q.includes('categor') || q.includes('roi') || q.includes('impact') || q.includes('best') ||
       q.includes('قطاع') || q.includes('فئة') || q.includes('تأثير')) && contextData.projects?.length) {
    const catMap: Record<string, { budget: number; spent: number; count: number; beneficiaries: number }> = {};
    for (const p of contextData.projects) {
      if (!catMap[p.category]) catMap[p.category] = { budget: 0, spent: 0, count: 0, beneficiaries: 0 };
      catMap[p.category].budget += p.budget;
      catMap[p.category].spent += p.spent;
      catMap[p.category].count++;
      catMap[p.category].beneficiaries += p.totalBeneficiaries;
    }
    const catData = Object.entries(catMap)
      .map(([cat, d]) => ({
        category: cat,
        budget: Math.round(d.budget),
        spent: Math.round(d.spent),
        beneficiaries: d.beneficiaries,
        roi: d.budget > 0 ? Math.round((d.beneficiaries / (d.budget / 1000)) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.roi - a.roi);

    chartData.push({ title: 'Beneficiaries per 1,000 OMR (ROI)', type: 'bar', xKey: 'category', yKeys: ['roi'], data: catData });
    chartData.push({ title: 'Budget vs Spent by Category (OMR)', type: 'bar', xKey: 'category', yKeys: ['budget', 'spent'], data: catData });

    const top = catData[0];
    keyFindings.push(`Best ROI category: ${top?.category} (${top?.roi} beneficiaries per 1,000 OMR)`);
    keyFindings.push(`Total beneficiaries across all categories: ${catData.reduce((s, c) => s + c.beneficiaries, 0).toLocaleString()}`);
    keyFindings.push(`Highest budget: ${catData.sort((a, b) => b.budget - a.budget)[0]?.category}`);
    recommendations.push(`Increase investment in ${top?.category} to maximize community impact per riyal spent`);
    recommendations.push('Develop cross-category impact measurement framework for consistent ROI tracking');
    sdgConnections.push('SDG 1 (No Poverty): Higher beneficiary counts directly reduce community poverty');
    sdgConnections.push('SDG 17 (Partnerships): Multi-category CSR reflects broad stakeholder engagement');

    return {
      analysis: `Based on real PostgreSQL data, **${top?.category}** delivers the highest ROI at ${top?.roi} beneficiaries per 1,000 OMR invested across ${catData.find(c => c.category === top?.category)?.beneficiaries?.toLocaleString()} total beneficiaries.\n\nThe platform manages ${totalProjects} projects with a combined budget of OMR ${totalBudget.toLocaleString()}. Category performance varies significantly — ${catData[0]?.category} leads in community impact efficiency, while ${catData.sort((a, b) => b.budget - a.budget)[0]?.category} holds the largest budget allocation.\n\nNote: Analysis generated by local engine. For AI-powered insights, retry or select a different model.`,
      keyFindings, recommendations, chartData, sdgConnections,
    };
  }

  // Financial / Budget analysis
  if ((q.includes('budget') || q.includes('financial') || q.includes('spend') ||
       q.includes('ميزانية') || q.includes('مالي')) && contextData.projects?.length) {
    const totalSpent = contextData.projects.reduce((s, p) => s + p.spent, 0);
    const utilPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
    const overBudget = contextData.projects.filter(p => p.budget > 0 && p.spent > p.budget * 0.9);

    chartData.push({
      title: 'Budget vs Spent by Category (OMR)',
      type: 'bar', xKey: 'category', yKeys: ['budget', 'spent'],
      data: (() => {
        const m: Record<string, { budget: number; spent: number }> = {};
        for (const p of contextData.projects!) {
          if (!m[p.category]) m[p.category] = { budget: 0, spent: 0 };
          m[p.category].budget += p.budget; m[p.category].spent += p.spent;
        }
        return Object.entries(m).map(([category, d]) => ({ category, budget: Math.round(d.budget), spent: Math.round(d.spent) }));
      })(),
    });

    keyFindings.push(`Total budget: OMR ${totalBudget.toLocaleString()} — ${utilPct}% utilized`);
    keyFindings.push(`${overBudget.length} project(s) consumed >90% of budget`);
    recommendations.push('Review near-limit projects for budget reallocation');
    sdgConnections.push('SDG 17 (Partnerships): Financial transparency builds donor trust');

    return {
      analysis: `Financial analysis from PostgreSQL: ${totalProjects} projects, OMR ${totalBudget.toLocaleString()} total budget, OMR ${totalSpent.toLocaleString()} spent (${utilPct}% utilization). ${overBudget.length} project(s) near budget limit.\n\nNote: Local engine active. Retry or select a different model for AI insights.`,
      keyFindings, recommendations, chartData, sdgConnections,
    };
  }

  // Default overview
  const statusSummary = contextData.projectsByStatus.map(s => `${s.count} ${s.status}`).join(', ');
  keyFindings.push(`${totalProjects} total projects: ${statusSummary}`);
  keyFindings.push(`Coverage: ${contextData.projectsByRegion.length} of 11 governorates`);
  keyFindings.push(`Budget: OMR ${totalBudget.toLocaleString()} across ${contextData.categories.length} categories`);
  recommendations.push('Retry with a specific model selected (GPT-4o Mini recommended) for AI-generated insights');
  recommendations.push('Check your GitHub token permissions if models are not responding');
  sdgConnections.push('SDG 11 (Sustainable Cities): Multi-governorate CSR coverage');
  sdgConnections.push('SDG 17 (Partnerships): Cross-sector engagement');

  return {
    analysis: `Platform overview (local engine):\n\n${totalProjects} projects across ${contextData.projectsByRegion.length} governorates. Status: ${statusSummary}. Categories: ${contextData.categories.join(', ')}. Total budget: OMR ${totalBudget.toLocaleString()}.\n\nThe analysis above is generated directly from your PostgreSQL data. For full AI-powered insights, select a model and retry.`,
    keyFindings, recommendations, chartData, sdgConnections,
  };
}

// ── Alert-Specific Context Fetcher ──────────────────────────────────────────

interface AlertContextData {
  activeAlerts: {
    id: string;
    type: string;
    level: string;
    message: string;
    createdAt: Date;
    project: { id: string; name: string; status: string } | null;
  }[];
  alertStats: {
    total: number;
    unresolved: number;
    byLevel: Record<string, number>;
    byType: Record<string, number>;
    resolutionRate: number;
  };
  riskProjects: {
    name: string;
    status: string;
    budget: number;
    spent: number;
    progress: number;
    budgetUtilization: number;
    elapsed: number;
    avgRating: number | null;
    alertCount: number;
  }[];
}

async function fetchAlertContext(alertIds?: string[]): Promise<AlertContextData> {
  const alertWhere: any = { resolvedAt: null };
  if (alertIds?.length) alertWhere.id = { in: alertIds };

  const [activeAlerts, totalAlerts, unresolvedCount, byLevel, byType, projects] = await Promise.all([
    prisma.alert.findMany({
      where: alertWhere,
      include: { project: { select: { id: true, name: true, status: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.alert.count(),
    prisma.alert.count({ where: { resolvedAt: null } }),
    prisma.alert.groupBy({ by: ['level'], _count: { id: true } }),
    prisma.alert.groupBy({ by: ['type'], _count: { id: true } }),
    prisma.project.findMany({
      where: { status: { not: 'archived' } },
      select: {
        id: true, name: true, status: true, budget: true, progress: true,
        startDate: true, endDate: true,
        expenses: { where: { status: 'approved' }, select: { amount: true } },
        reviews: { select: { rating: true } },
        alerts: { where: { resolvedAt: null }, select: { id: true } },
      },
    }),
  ]);

  const levelCounts: Record<string, number> = { info: 0, warning: 0, critical: 0 };
  for (const row of byLevel) levelCounts[row.level] = row._count.id;

  const typeCounts: Record<string, number> = { budget: 0, timeline: 0, quality: 0 };
  for (const row of byType) typeCounts[row.type] = row._count.id;

  const resolved = totalAlerts - unresolvedCount;
  const resolutionRate = totalAlerts > 0 ? Math.round((resolved / totalAlerts) * 100) : 0;

  const riskProjects = projects.map(p => {
    const spent = p.expenses.reduce((s, e) => s + e.amount, 0);
    const budgetUtil = p.budget > 0 ? Math.round((spent / p.budget) * 100) : 0;
    const start = new Date(p.startDate).getTime();
    const end = new Date(p.endDate).getTime();
    const now = Date.now();
    const totalDuration = end - start;
    const elapsed = totalDuration > 0 ? Math.round(Math.min(Math.max(((now - start) / totalDuration) * 100, 0), 100)) : 0;
    const avgRating = p.reviews.length > 0
      ? Math.round((p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length) * 10) / 10
      : null;

    return {
      name: p.name,
      status: p.status,
      budget: p.budget,
      spent,
      progress: p.progress,
      budgetUtilization: budgetUtil,
      elapsed,
      avgRating,
      alertCount: p.alerts.length,
    };
  }).filter(p => p.alertCount > 0 || p.budgetUtilization > 70 || (p.elapsed - p.progress) > 10 || (p.avgRating !== null && p.avgRating < 3.5))
    .sort((a, b) => b.alertCount - a.alertCount);

  console.log(`[AI] Alert context fetched: ${activeAlerts.length} active alerts, ${riskProjects.length} risk projects`);

  return {
    activeAlerts: activeAlerts.map(a => ({
      id: a.id,
      type: a.type,
      level: a.level,
      message: a.message,
      createdAt: a.createdAt,
      project: a.project,
    })),
    alertStats: {
      total: totalAlerts,
      unresolved: unresolvedCount,
      byLevel: levelCounts,
      byType: typeCounts,
      resolutionRate,
    },
    riskProjects,
  };
}

// ── Alert-Specific System Prompt ────────────────────────────────────────────

function buildAlertSystemPrompt(alertContext: AlertContextData): string {
  return `You are "CSR Risk Advisor" — a bilingual (Arabic & English) AI specialist in risk management for the Oman CSR Platform.
You analyze early warning alerts, project risks, and provide actionable mitigation strategies.

PERSONALITY & STYLE:
- Expert risk analyst, decisive and action-oriented
- Respond in the SAME LANGUAGE the user writes in (Arabic or English)
- Prioritize critical risks first, then high, medium, low
- Provide specific, measurable action items (not vague advice)
- Reference project names and numbers from the data

RESPONSE FORMAT — STRICT JSON:
{
  "analysis": "Detailed risk analysis (2-4 paragraphs)",
  "keyFindings": ["finding 1", "finding 2", "finding 3"],
  "recommendations": ["specific action 1", "specific action 2", "specific action 3"],
  "chartData": [
    {
      "title": "Chart title",
      "type": "bar",
      "xKey": "fieldName",
      "yKeys": ["numericField"],
      "data": [{"fieldName": "Label", "numericField": 123}]
    }
  ],
  "sdgConnections": ["SDG X: connection to risk management"]
}

RISK ANALYSIS RULES:
1. Base analysis ONLY on the real alert and project data below
2. For budget risks: calculate exact remaining budget, burn rate, and projected overrun date
3. For timeline risks: calculate delay in days and suggest specific milestone adjustments
4. For quality risks: identify patterns in low ratings and suggest targeted interventions
5. Always prioritize: What needs action TODAY vs this week vs this month
6. Include a risk severity chart when analyzing multiple projects

CHART RULES:
- Include 1-3 charts visualizing risk patterns
- For "bar"/"line"/"area": data items need one string (xKey) + numeric fields (yKeys)
- For "donut": data items need "name" (string) and "value" (number)

STRICT: Entire response must be valid JSON. No text outside JSON. No code fences.

CURRENT ALERT DATA (real PostgreSQL data):
${JSON.stringify(alertContext, null, 2)}`;
}

// ── Local Alert Analysis Fallback ──────────────────────────────────────────

function generateLocalAlertAnalysis(alertContext: AlertContextData, question: string): AiAnalysisResult {
  const { activeAlerts, alertStats, riskProjects } = alertContext;
  const chartData: AiChart[] = [];
  const keyFindings: string[] = [];
  const recommendations: string[] = [];
  const sdgConnections: string[] = [];

  // Alert distribution donut
  chartData.push({
    title: 'Alerts by Type',
    type: 'donut',
    data: Object.entries(alertStats.byType).map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
    })),
  });

  // Risk projects bar chart
  if (riskProjects.length > 0) {
    chartData.push({
      title: 'Budget Utilization by Project (%)',
      type: 'bar',
      xKey: 'project',
      yKeys: ['utilization', 'progress'],
      data: riskProjects.slice(0, 8).map(p => ({
        project: p.name.length > 20 ? p.name.slice(0, 18) + '…' : p.name,
        utilization: p.budgetUtilization,
        progress: p.progress,
      })),
    });
  }

  const criticalProjects = riskProjects.filter(p => p.budgetUtilization > 90 || (p.elapsed - p.progress) > 20);
  const overBudget = riskProjects.filter(p => p.budgetUtilization > 100);
  const delayed = riskProjects.filter(p => p.elapsed - p.progress > 15);

  keyFindings.push(`${alertStats.unresolved} active alerts out of ${alertStats.total} total (${alertStats.resolutionRate}% resolution rate)`);
  keyFindings.push(`${criticalProjects.length} project(s) require immediate intervention`);
  if (overBudget.length > 0) keyFindings.push(`${overBudget.length} project(s) have exceeded their allocated budget`);
  if (delayed.length > 0) keyFindings.push(`${delayed.length} project(s) have significant timeline delays`);

  if (overBudget.length > 0) {
    recommendations.push(`Freeze non-essential expenses for: ${overBudget.map(p => p.name).join(', ')}`);
  }
  if (delayed.length > 0) {
    recommendations.push(`Review and adjust milestones for: ${delayed.map(p => p.name).join(', ')}`);
  }
  recommendations.push('Schedule risk review meeting with project managers for all high-risk projects');
  recommendations.push('Implement weekly budget tracking reports for projects above 80% utilization');

  sdgConnections.push('SDG 16 (Strong Institutions): Proactive risk management strengthens organizational governance');
  sdgConnections.push('SDG 17 (Partnerships): Transparent risk reporting builds stakeholder trust');

  return {
    analysis: `Risk analysis from PostgreSQL data (local engine):\n\n${alertStats.unresolved} unresolved alerts across ${riskProjects.length} at-risk projects. Alert resolution rate: ${alertStats.resolutionRate}%. Budget alerts: ${alertStats.byType.budget}, timeline alerts: ${alertStats.byType.timeline}, quality alerts: ${alertStats.byType.quality}.\n\n${criticalProjects.length > 0 ? `CRITICAL: ${criticalProjects.map(p => `${p.name} (${p.budgetUtilization}% budget, ${p.progress}% progress)`).join('; ')} need immediate attention.` : 'No projects are at critical risk level.'}\n\nNote: Analysis generated by local engine. For AI-powered insights, retry or select a different model.`,
    keyFindings,
    recommendations,
    chartData,
    sdgConnections,
  };
}

// ── Export ─────────────────────────────────────────────────────────────────────

export const aiAnalyticsService = {
  fetchContextData,
  buildSystemPrompt,
  callGitHubModels,
  parseAiResponse,
  generateLocalAnalysis,
  fetchAlertContext,
  buildAlertSystemPrompt,
  generateLocalAlertAnalysis,
};
