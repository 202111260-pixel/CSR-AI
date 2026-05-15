import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import NumberFlow from '../../components/ui/NumberFlowSafe';
import {
  Wallet, TrendingUp, ArrowUpRight, ArrowDownRight,
  DollarSign, PieChart as PieIcon, BarChart3, Activity, AlertTriangle,
  CheckCircle2, Filter, Download, Calendar, ChevronDown,
  ChevronRight, Search, Eye, Layers,
  FileText, Printer, Target, FileSpreadsheet,
  Gauge, Shield, Users, Globe,
  AlertCircle, Check, Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, BarChart, Bar, Cell, PieChart, Pie,
  ComposedChart, Line, Sector,
} from 'recharts';
import { cn } from '../../utils/cn';
import { useTheme } from '../../hooks/useTheme';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '../../services/reportService';
import { printTable, generateFinancialReportExcel, type ExportColumn } from '../../utils/exportUtils';
import { generateFinancialReportPDF } from '../../utils/pdfReportGenerator';
import { Button } from '../../components/ui/Button';
import { ActionBar } from '../../components/common/ActionBar';

// ─── Palette ──────────────────────────────────────────────────────────────────


// ─── Animation ────────────────────────────────────────────────────────────────
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};
const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

// ─── Financial Data ───────────────────────────────────────────────────────────

// Colors for alerts
const alertColors = {
  critical: { color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
  warning: { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)' },
  healthy: { color: '#34d399', bg: 'rgba(52,211,153,0.08)' },
};

// ─── Helper Components ────────────────────────────────────────────────────────

function GlassCard({ children, className, glow, style: extra }: {
  children: React.ReactNode; className?: string; glow?: string; style?: React.CSSProperties;
}) {
  const { colors: P } = useTheme();
  return (
    <div className={cn('relative rounded-2xl', className)} style={{
      background: `${P.card}`,
      border: `1px solid ${P.border}`,
      boxShadow: [
        `inset 0 1px 0 0 ${P.borderHi}40`,
        glow ? `0 0 60px ${glow}` : '',
        '0 12px 40px rgba(0,0,0,0.05)',
        '0 2px 8px rgba(0,0,0,0.03)',
      ].filter(Boolean).join(', '),
      ...extra,
    }}>
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${P.borderHi}90, transparent)` }} />
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, color, action }: {
  icon: React.FC<{ size?: number; style?: React.CSSProperties }>; title: string; subtitle: string; color: string;
  action?: React.ReactNode;
}) {
  const { colors: P } = useTheme();
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <div>
          <h3 className="text-sm font-bold" style={{ color: P.textHi }}>{title}</h3>
          <p className="text-[10px]" style={{ color: P.textLo }}>{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function MiniTrend({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const pos = value >= 0;
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold" style={{ color: pos ? '#34d399' : '#f87171' }}>
      {pos ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {Math.abs(value)}{suffix}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { colors: P } = useTheme();
  const map: Record<string, { color: string; bg: string; label: string }> = {
    'on-track':    { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  label: 'On Track' },
    'at-risk':     { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  label: 'At Risk' },
    'over-budget': { color: '#f87171', bg: 'rgba(248,113,113,0.12)', label: 'Over Budget' },
    'completed':   { color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  label: 'Completed' },
    'paid':        { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  label: 'Paid' },
    'pending':     { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  label: 'Pending' },
    'overdue':     { color: '#f87171', bg: 'rgba(248,113,113,0.12)', label: 'Overdue' },
    'draft':       { color: P.textLo,  bg: `${P.border}`,            label: 'Draft' },
  };
  const s = map[status] || map['draft'];
  return (
    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold" style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

function RiskDot({ risk }: { risk: string }) {
  const { colors: P } = useTheme();
  const colors: Record<string, string> = { low: '#34d399', medium: '#fbbf24', high: '#fb923c', critical: '#f87171' };
  return <span className="h-2 w-2 rounded-full inline-block" style={{ background: colors[risk] || P.textDim }} />;
}

const fmtOMR = (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(2)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toString();
const fmtFull = (v: number) => v.toLocaleString('en-US');

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  const { colors: P } = useTheme();
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: P.card, border: `1px solid ${P.borderHi}`, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
      <p className="text-[10px] font-bold mb-1" style={{ color: P.textMd }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-[10px]" style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{fmtFull(p.value)} OMR</span>
        </p>
      ))}
    </div>
  );
};

// ─── Period Filter ────────────────────────────────────────────────────────────
const periods = [
  { value: 'ytd',   label: 'Year to Date' },
  { value: 'q1',    label: 'Q1 2026' },
  { value: 'q4-25', label: 'Q4 2025' },
  { value: '2025',  label: 'Full Year 2025' },
  { value: 'all',   label: 'All Time' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function FinancialReports() {
  const navigate = useNavigate();
  const P = useTheme().colors;
  const [period, setPeriod] = useState('all');
  const [showPeriodDrop, setShowPeriodDrop] = useState(false);
  const [compareTab, setCompareTab] = useState<'yearly' | 'category' | 'region'>('yearly');
  const [invoiceFilter, setInvoiceFilter] = useState('all');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'amount' | 'date'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [activePieIndex, setActivePieIndex] = useState(0);
  const periodRef = useRef<HTMLDivElement>(null);

  /* ── API wiring ── */
  const periodParams = useMemo(() => {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    switch (period) {
      case 'ytd': return { startDate: fmt(new Date(now.getFullYear(), 0, 1)), endDate: fmt(now) };
      case 'q1': return { startDate: '2026-01-01', endDate: '2026-03-31' };
      case 'q4-25': return { startDate: '2025-10-01', endDate: '2025-12-31' };
      case '2025': return { startDate: '2025-01-01', endDate: '2025-12-31' };
      default: return {};
    }
  }, [period]);

  const { data: reportRes, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['report-financial', periodParams],
    queryFn: () => reportService.getFinancialReport(periodParams),
    staleTime: 5 * 60 * 1000,
  });
  const report = (reportRes as any)?.data;

  /* ── Derived data from API ── */
  const expenseColorPalette = ['#C8A44E', '#38bdf8', '#fb923c', '#a78bfa', '#34d399', '#fbbf24', '#f87171'];

  const financialSummary = useMemo(() => {
    const count = report?.budgetByProject?.length || 1;
    return [
      { title: 'Total Budget', value: report?.totalBudget ?? 0,  prev: 0, icon: Wallet,      color: '#C8A44E', glow: 'rgba(200,164,78,0.10)', href: '/reports/financial' },
      { title: 'Total Spent',  value: report?.totalSpent ?? 0,   prev: 0, icon: TrendingUp,   color: '#38bdf8', glow: 'rgba(56,189,248,0.10)', href: '/reports/financial' },
      { title: 'Remaining',    value: report?.remaining ?? 0,    prev: 0, icon: PieIcon,      color: '#34d399', glow: 'rgba(52,211,153,0.10)', href: '/reports/financial' },
      { title: 'Avg/Project',  value: report?.totalSpent != null ? Math.round(report.totalSpent / count) : 0, prev: 0, icon: Activity, color: '#a78bfa', glow: 'rgba(167,139,250,0.10)', href: '/reports/financial' },
    ];
  }, [report]);

  const monthlyExpenses = useMemo(() => {
    if (!report?.monthlyCashFlow?.length) return [];
    return report.monthlyCashFlow.map((m: any) => ({
      month: m.month,
      budget: 0,
      spent: m.amount ?? 0,
      forecast: 0,
    }));
  }, [report]);

  const expenseItems = useMemo(() => {
    if (!report?.expenseBreakdown?.length) return [];
    return report.expenseBreakdown.map((e: any, i: number) => ({
      name: e.category,
      value: e.amount ?? 0,
      pct: Math.round(e.percentage ?? 0),
      color: expenseColorPalette[i % expenseColorPalette.length],
    }));
  }, [report]);

  const projectFinancials = useMemo(() => {
    if (!report?.budgetByProject?.length) return [];
    return report.budgetByProject.map((p: any) => ({
      id: p.projectId,
      name: p.projectName ?? 'Unknown',
      category: '',
      budget: p.budget ?? 0,
      spent: p.spent ?? 0,
      remaining: p.remaining ?? 0,
      pct: Math.round(p.utilization ?? 0),
      status: (p.utilization ?? 0) > 100 ? 'over-budget' as const : (p.utilization ?? 0) > 85 ? 'at-risk' as const : 'on-track' as const,
      risk: (p.utilization ?? 0) > 100 ? 'critical' as const : (p.utilization ?? 0) > 85 ? 'high' as const : (p.utilization ?? 0) > 70 ? 'medium' as const : 'low' as const,
    }));
  }, [report]);

  const cashFlowData = useMemo(() => {
    if (!report?.monthlyCashFlow?.length) return [];
    return report.monthlyCashFlow.map((m: any) => ({
      month: m.month,
      inflow: 0,
      outflow: m.amount ?? 0,
      net: -(m.amount ?? 0),
    }));
  }, [report]);

  // ─── Comparative Analysis Data (from API) ─────────────────────────────────────
  const yearlyComparison = useMemo(() => {
    if (!report?.yearlyComparison?.length) return [];
    return report.yearlyComparison.map((y: any) => ({
      year: y.year,
      budget: y.budget ?? 0,
      spent: y.spent ?? 0,
      projects: y.projects ?? 0,
    }));
  }, [report]);

  const categoryBreakdown = useMemo(() => {
    if (!report?.categoryBreakdown?.length) return [];
    return report.categoryBreakdown.map((c: any) => ({
      name: c.name,
      budget: c.budget ?? 0,
      spent: c.spent ?? 0,
      projects: c.projects ?? 0,
      color: c.color ?? '#C8A44E',
    }));
  }, [report]);

  const regionComparison = useMemo(() => {
    if (!report?.regionComparison?.length) return [];
    return report.regionComparison.map((r: any) => ({
      region: r.region,
      budget: r.budget ?? 0,
      spent: r.spent ?? 0,
      projects: r.projects ?? 0,
    }));
  }, [report]);

  // ─── Budget Alerts (from API) ─────────────────────────────────────────────────
  const budgetAlerts = useMemo(() => {
    if (!report?.budgetAlerts?.length) return [];
    return report.budgetAlerts.map((a: any) => ({
      level: a.level as 'critical' | 'warning' | 'healthy',
      title: a.title,
      count: a.count ?? 0,
      desc: a.desc,
      color: alertColors[a.level as keyof typeof alertColors]?.color ?? '#34d399',
      bg: alertColors[a.level as keyof typeof alertColors]?.bg ?? 'rgba(52,211,153,0.08)',
    }));
  }, [report]);

  // ─── Efficiency Metrics (from API) ─────────────────────────────────────────────
  const efficiencyMetrics = useMemo(() => {
    if (!report?.efficiencyMetrics) return [];
    const m = report.efficiencyMetrics;
    return [
      { label: 'Cost per Beneficiary', value: String(m.costPerBeneficiary ?? 0), unit: 'OMR', trend: 0, good: true, icon: Users, color: '#38bdf8' },
      { label: 'Budget Utilization', value: String(m.budgetUtilization ?? 0), unit: '%', trend: 0, good: true, icon: Gauge, color: '#34d399' },
      { label: 'Burn Rate Accuracy', value: String(m.burnRateAccuracy ?? 0), unit: '%', trend: 0, good: true, icon: Target, color: '#a78bfa' },
      { label: 'Overrun Frequency', value: String(m.overrunFrequency ?? 0), unit: '%', trend: 0, good: (m.overrunFrequency ?? 0) < 10, icon: Shield, color: '#C8A44E' },
    ];
  }, [report]);

  // ─── Top Expenses / Invoices (from API) ────────────────────────────────────────
  const invoices = useMemo(() => {
    if (!report?.topExpenses?.length) return [];
    return report.topExpenses.map((e: any, i: number) => ({
      id: `EXP-${String(i + 1).padStart(3, '0')}`,
      project: e.project?.name ?? 'Unknown',
      vendor: e.description ?? e.category ?? 'N/A',
      amount: e.amount ?? 0,
      date: e.date ? new Date(e.date).toISOString().split('T')[0] : '',
      status: (e.status === 'approved' ? 'paid' : e.status === 'pending' ? 'pending' : 'draft') as 'paid' | 'pending' | 'draft' | 'overdue',
      category: e.category ?? 'Other',
    }));
  }, [report]);

  // ─── Forecast Data (from API) ──────────────────────────────────────────────────
  const forecastData = useMemo(() => {
    if (!report?.forecastData?.length) return [];
    return report.forecastData.map((f: any) => ({
      quarter: f.quarter,
      projectedBudget: f.projectedBudget ?? 0,
      projectedSpend: f.projectedSpend ?? 0,
      confidence: f.confidence ?? 75,
    }));
  }, [report]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    let list = [...invoices];
    if (invoiceFilter !== 'all') list = list.filter(i => i.status === invoiceFilter);
    if (invoiceSearch) list = list.filter(i =>
      i.project.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      i.vendor.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      i.id.toLowerCase().includes(invoiceSearch.toLowerCase())
    );
    list.sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'amount') return (a.amount - b.amount) * mul;
      return (new Date(a.date).getTime() - new Date(b.date).getTime()) * mul;
    });
    return list;
  }, [invoices, invoiceFilter, invoiceSearch, sortField, sortDir]);

  const toggleInvoice = (id: string) => {
    setSelectedInvoices(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAllInvoices = () => {
    if (selectedInvoices.size === filteredInvoices.length) setSelectedInvoices(new Set());
    else setSelectedInvoices(new Set(filteredInvoices.map(i => i.id)));
  };

  // Top 10 / Bottom 10
  const sortedBySpent = [...projectFinancials].sort((a, b) => b.spent - a.spent);
  const top5 = sortedBySpent.slice(0, 5);
  const bottom5 = sortedBySpent.slice(-5).reverse();

  // Active pie sector rendering
  const renderActiveShape = (props: unknown) => {
  const { colors: P } = useTheme();
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props as {
      cx: number; cy: number; innerRadius: number; outerRadius: number; startAngle: number; endAngle: number;
      fill: string; payload: { name: string }; value: number;
    };
    return (
      <g>
        <text x={cx} y={cy - 8} textAnchor="middle" fill={P.textHi} fontSize={13} fontWeight={700}>{payload.name}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill={P.textMd} fontSize={10}>{fmtFull(value)} OMR</text>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={(outerRadius as number) + 6} startAngle={startAngle} endAngle={endAngle} fill={fill} />
        <Sector cx={cx} cy={cy} innerRadius={(outerRadius as number) + 8} outerRadius={(outerRadius as number) + 12} startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.3} />
      </g>
    );
  };

  /* ── Export Handlers ── */
  const exportColumns: ExportColumn[] = [
    { key: 'category', header: 'الفئة', width: 20 },
    { key: 'budget', header: 'الميزانية', width: 15, format: 'currency' },
    { key: 'spent', header: 'المصروف', width: 15, format: 'currency' },
    { key: 'remaining', header: 'المتبقي', width: 15, format: 'currency' },
    { key: 'utilization', header: 'نسبة الاستخدام', width: 12, format: 'percentage' },
  ];

  const getExportData = useCallback(() => {
    const data: Record<string, unknown>[] = [];
    // Add summary KPIs
    if (financialSummary?.length) {
      data.push({ category: '--- الملخص المالي ---', budget: '', spent: '', remaining: '', utilization: '' });
      financialSummary.forEach(kpi => {
        data.push({ category: kpi.title, budget: kpi.value, spent: '', remaining: '', utilization: '' });
      });
    }
    // Add category breakdown
    if (categoryBreakdown?.length) {
      data.push({ category: '--- توزيع الميزانية ---', budget: '', spent: '', remaining: '', utilization: '' });
      categoryBreakdown.forEach((cat: any) => {
        data.push({ category: cat.name, budget: cat.value, spent: '', remaining: '', utilization: '' });
      });
    }
    // Add project financials
    if (projectFinancials?.length) {
      data.push({ category: '--- المشاريع ---', budget: '', spent: '', remaining: '', utilization: '' });
      projectFinancials.forEach((proj: any) => {
        const remaining = proj.budget - proj.spent;
        const utilization = proj.budget > 0 ? (proj.spent / proj.budget) * 100 : 0;
        data.push({
          category: proj.project,
          budget: proj.budget,
          spent: proj.spent,
          remaining,
          utilization,
        });
      });
    }
    return data;
  }, [financialSummary, categoryBreakdown, projectFinancials]);

  const handleExportExcel = useCallback(() => {
    const sortedBySpent = [...projectFinancials].sort((a, b) => b.spent - a.spent);
    generateFinancialReportExcel({
      kpis: financialSummary.map(k => ({ label: k.title, value: k.value })),
      expenseBreakdown: expenseItems.map(e => ({ name: e.name, value: e.value, pct: e.pct })),
      projectFinancials: projectFinancials.map(p => ({ name: p.name, budget: p.budget, spent: p.spent, remaining: p.remaining, pct: p.pct, status: p.status })),
      categoryBreakdown: categoryBreakdown.map(c => ({ name: c.name, budget: c.budget, spent: c.spent, projects: c.projects })),
      efficiencyMetrics: efficiencyMetrics.map(m => ({ label: m.label, value: m.value, unit: m.unit })),
      dateRange: periodParams.startDate ? { from: periodParams.startDate, to: periodParams.endDate } : undefined,
      cashFlowData: cashFlowData.map(c => ({ month: c.month, inflow: c.inflow, outflow: c.outflow, net: c.net })),
      yearlyComparison: yearlyComparison.map(y => ({ year: y.year, budget: y.budget, spent: y.spent, projects: y.projects })),
      regionComparison: regionComparison.map(r => ({ region: r.region, budget: r.budget, spent: r.spent, projects: r.projects })),
      budgetAlerts: budgetAlerts.map(a => ({ level: a.level, title: a.title, count: a.count, desc: a.desc })),
      invoices: invoices.map(i => ({ id: i.id, project: i.project, vendor: i.vendor, amount: i.amount, date: i.date, status: i.status, category: i.category })),
      top5Projects: sortedBySpent.slice(0, 5).map(p => ({ name: p.name, budget: p.budget, spent: p.spent, remaining: p.remaining, pct: p.pct, status: p.status })),
      bottom5Projects: sortedBySpent.slice(-5).reverse().map(p => ({ name: p.name, budget: p.budget, spent: p.spent, remaining: p.remaining, pct: p.pct, status: p.status })),
      forecastData: forecastData.map(f => ({ quarter: f.quarter, projectedBudget: f.projectedBudget, projectedSpend: f.projectedSpend, confidence: f.confidence })),
    });
  }, [financialSummary, expenseItems, projectFinancials, categoryBreakdown, efficiencyMetrics,
      cashFlowData, yearlyComparison, regionComparison, budgetAlerts, invoices, forecastData, periodParams]);

  const handleExportPDF = useCallback(() => {
    const sortedBySpentLocal = [...projectFinancials].sort((a, b) => b.spent - a.spent);
    generateFinancialReportPDF({
      kpis: financialSummary.map(k => ({ label: k.title, value: k.value, format: 'currency' as const, color: k.color })),
      expenseBreakdown: expenseItems,
      projectFinancials: projectFinancials.map(p => ({
        name: p.name, budget: p.budget, spent: p.spent,
        remaining: p.remaining, pct: p.pct, status: p.status,
      })),
      categoryBreakdown: categoryBreakdown.map(c => ({
        name: c.name, budget: c.budget, spent: c.spent, projects: c.projects,
      })),
      efficiencyMetrics: efficiencyMetrics.map(m => ({
        label: m.label, value: m.value, unit: m.unit,
      })),
      dateRange: periodParams.startDate ? { from: periodParams.startDate, to: periodParams.endDate } : undefined,
      // Extended data — all sections visible on page
      cashFlowData: cashFlowData.map(c => ({
        month: c.month, inflow: c.inflow, outflow: c.outflow, net: c.net,
      })),
      yearlyComparison: yearlyComparison.map(y => ({
        year: y.year, budget: y.budget, spent: y.spent, projects: y.projects,
      })),
      regionComparison: regionComparison.map(r => ({
        region: r.region, budget: r.budget, spent: r.spent, projects: r.projects,
      })),
      budgetAlerts: budgetAlerts.map(a => ({
        level: a.level, title: a.title, count: a.count, desc: a.desc,
      })),
      invoices: invoices.map(inv => ({
        id: inv.id, project: inv.project, vendor: inv.vendor,
        amount: inv.amount, date: inv.date, status: inv.status, category: inv.category,
      })),
      top5Projects: sortedBySpentLocal.slice(0, 5).map(p => ({
        name: p.name, budget: p.budget, spent: p.spent,
        remaining: p.remaining, pct: p.pct, status: p.status,
      })),
      bottom5Projects: sortedBySpentLocal.slice(-5).reverse().map(p => ({
        name: p.name, budget: p.budget, spent: p.spent,
        remaining: p.remaining, pct: p.pct, status: p.status,
      })),
      forecastData: forecastData.map(f => ({
        quarter: f.quarter, projectedBudget: f.projectedBudget,
        projectedSpend: f.projectedSpend, confidence: f.confidence,
      })),
    });
  }, [financialSummary, expenseItems, projectFinancials, categoryBreakdown, efficiencyMetrics,
      cashFlowData, yearlyComparison, regionComparison, budgetAlerts, invoices, forecastData, periodParams]);

  const handlePrint = useCallback(() => {
    printTable(getExportData(), exportColumns, 'التقرير المالي - Financial Report');
  }, [getExportData]);

  if (isLoading) {
    return (
      <div style={{ background: P.bg }} className="min-h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: P.accent, borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: P.textMd }}>Loading report data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ background: P.bg, fontFamily: 'Inter, sans-serif' }}>
      {/* Background pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.012]" style={{ backgroundImage: `radial-gradient(${P.accent} 0.5px, transparent 0.5px)`, backgroundSize: '24px 24px' }} />

      <div className="relative max-w-[1440px] mx-auto px-6 py-6">
        {/* ═══ Header ═══ */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[11px] mb-4" style={{ color: P.textLo }}>
            <span>Dashboard</span>
            <ChevronRight size={10} />
            <span>Reports</span>
            <ChevronRight size={10} />
            <span style={{ color: P.accent }}>Financial</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ background: `${P.accent}15`, border: `1px solid ${P.accent}30`, boxShadow: `0 0 40px ${P.accent}15` }}>
                <DollarSign size={22} style={{ color: P.accent }} />
              </div>
              <div>
                <h1 className="text-xl font-black" style={{ color: P.textHi }}>Financial Analytics</h1>
                <p className="text-[11px]" style={{ color: P.textLo }}>Comprehensive financial overview across all CSR projects</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Period Selector */}
              <div className="relative" ref={periodRef}>
                <button
                  onClick={() => setShowPeriodDrop(!showPeriodDrop)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium transition-all"
                  style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textMd }}
                >
                  <Calendar size={13} style={{ color: P.accent }} />
                  {periods.find(p => p.value === period)?.label}
                  <ChevronDown size={12} />
                </button>
                <AnimatePresence>
                  {showPeriodDrop && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      className="absolute right-0 z-50 mt-2 w-48 rounded-xl overflow-hidden"
                      style={{ background: P.card, border: `1px solid ${P.borderHi}`, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
                    >
                      {periods.map(p => (
                        <button
                          key={p.value}
                          onClick={() => { setPeriod(p.value); setShowPeriodDrop(false); }}
                          className="w-full px-4 py-2.5 text-[12px] text-left transition-colors flex items-center justify-between"
                          style={{ color: p.value === period ? P.accent : P.textMd }}
                          onMouseEnter={e => { e.currentTarget.style.background = `${P.accent}08`; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          {p.label}
                          {p.value === period && <Check size={12} style={{ color: P.accent }} />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Actions */}
              <ActionBar
                onRefresh={refetch}
                onExcel={handleExportExcel}
                onPdf={handleExportPDF}
                onPrint={handlePrint}
                isRefreshing={isRefetching}
              />
            </div>
          </div>
        </motion.div>

        {/* ═══ Section 1: Financial Summary KPIs ═══ */}
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {financialSummary.map((kpi) => {
            const Icon = kpi.icon;
            const diff = kpi.prev === 0 ? 0 : ((kpi.value - kpi.prev) / kpi.prev * 100);
            return (
              <motion.div key={kpi.title} variants={staggerItem} onClick={() => navigate(kpi.href)} className="cursor-pointer" whileHover={{ y: -4, scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}>
                <GlassCard className="p-5" glow={kpi.glow}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${kpi.color}12`, border: `1px solid ${kpi.color}25` }}>
                      <Icon size={18} style={{ color: kpi.color }} />
                    </div>
                    <MiniTrend value={Math.round(diff * 10) / 10} />
                  </div>
                  <p className="text-[10px] font-semibold mb-1" style={{ color: P.textLo }}>{kpi.title}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black tabular-nums" style={{ color: P.textHi }}>
                      <NumberFlow value={kpi.value} format={{ notation: 'compact', maximumFractionDigits: 1 }} />
                    </span>
                    <span className="text-[10px] font-medium" style={{ color: P.textDim }}>OMR</span>
                  </div>
                  <p className="text-[9px] mt-1" style={{ color: P.textDim }}>
                    vs prev: {fmtOMR(kpi.prev)} OMR
                  </p>
                </GlassCard>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ═══ Section 2: Charts Row — Pie + Area ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8">
          {/* Pie Chart — Category Distribution */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="lg:col-span-2">
            <GlassCard className="p-5 h-full">
              <SectionHeader icon={PieIcon} title="Budget by Category" subtitle="Distribution across project categories" color="#a78bfa" />
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      activeIndex={activePieIndex}
                      activeShape={renderActiveShape}
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      dataKey="budget"
                      onMouseEnter={(_, index) => setActivePieIndex(index)}
                      stroke="none"
                    >
                      {categoryBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.color} style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects?category=${entry.name.toLowerCase()}`)} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {categoryBreakdown.map(c => (
                  <div key={c.name} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                    <span className="text-[9px] font-medium" style={{ color: P.textLo }}>{c.name}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Area Chart — Monthly Expenses */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="lg:col-span-3">
            <GlassCard className="p-5 h-full">
              <SectionHeader icon={Activity} title="Monthly Budget vs Spending" subtitle="Budget allocation versus actual expenditure with forecast" color="#38bdf8" />
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyExpenses}>
                    <defs>
                      <linearGradient id="budgetGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C8A44E" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#C8A44E" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="spentGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                    <XAxis dataKey="month" tick={{ fill: P.textDim, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: P.textDim, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtOMR(v)} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="budget" stroke="#C8A44E" fill="url(#budgetGrad)" strokeWidth={2} name="Budget" />
                    <Area type="monotone" dataKey="spent" stroke="#38bdf8" fill="url(#spentGrad)" strokeWidth={2} name="Spent" />
                    <Line type="monotone" dataKey="forecast" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="6 3" dot={false} name="Forecast" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* ═══ Section 3: Detailed Projects Table ═══ */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="mb-8">
          <GlassCard className="p-5">
            <SectionHeader icon={Layers} title="Project Financial Details" subtitle="Complete financial breakdown for all active projects" color="#C8A44E"
              action={
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-1 rounded-lg font-medium" style={{ background: `${P.accent}10`, color: P.accent }}>
                    {projectFinancials.length} projects
                  </span>
                </div>
              }
            />
            <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: `${P.border} transparent` }}>
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${P.border}` }}>
                    {['Project', 'Category', 'Budget', 'Spent', 'Remaining', 'Used %', 'Status', 'Risk'].map(h => (
                      <th key={h} className="text-left py-3 px-3 font-semibold" style={{ color: P.textLo }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projectFinancials.map((p, i) => {
                    const overBudget = p.pct > 85;
                    const nearBudget = p.pct > 70;
                    return (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => navigate(`/projects/${p.id}`)}
                        className="transition-colors cursor-pointer"
                        style={{ borderBottom: `1px solid ${P.border}08` }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${P.accent}08`; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <td className="py-3 px-3 font-medium" style={{ color: P.textHi }}>{p.name}</td>
                        <td className="py-3 px-3" style={{ color: P.textMd }}>{p.category}</td>
                        <td className="py-3 px-3 font-mono tabular-nums" style={{ color: P.textMd }}>{fmtFull(p.budget)}</td>
                        <td className="py-3 px-3 font-mono tabular-nums" style={{ color: P.textHi }}>{fmtFull(p.spent)}</td>
                        <td className="py-3 px-3 font-mono tabular-nums" style={{ color: overBudget ? '#f87171' : '#34d399' }}>{fmtFull(p.remaining)}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full overflow-hidden" style={{ background: P.border }}>
                              <div className="h-full rounded-full transition-all" style={{
                                width: `${Math.min(p.pct, 100)}%`,
                                background: overBudget ? '#f87171' : nearBudget ? '#fbbf24' : '#34d399',
                              }} />
                            </div>
                            <span className="font-bold tabular-nums" style={{ color: overBudget ? '#f87171' : nearBudget ? '#fbbf24' : '#34d399' }}>
                              {p.pct}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3"><StatusBadge status={p.status} /></td>
                        <td className="py-3 px-3"><RiskDot risk={p.risk} /></td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </motion.div>

        {/* ═══ Section 4: Expense Breakdown (Stacked Bar) ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="lg:col-span-2">
            <GlassCard className="p-5 h-full">
              <SectionHeader icon={BarChart3} title="Expense by Category" subtitle="Spending distribution across expense categories" color="#fb923c" />
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseItems} layout="vertical" barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" stroke={P.border} horizontal={false} />
                    <XAxis type="number" tick={{ fill: P.textDim, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtOMR(v)} />
                    <YAxis type="category" dataKey="name" tick={{ fill: P.textMd, fontSize: 10 }} axisLine={false} tickLine={false} width={120} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} name="Amount">
                      {expenseItems.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Percentage breakdown */}
              <div className="flex gap-2 mt-4">
                {expenseItems.map(e => (
                  <div key={e.name} className="flex-1 text-center">
                    <div className="h-1.5 rounded-full mb-1.5" style={{ background: e.color }} />
                    <p className="text-[9px] font-bold" style={{ color: e.color }}>{e.pct}%</p>
                    <p className="text-[8px]" style={{ color: P.textDim }}>{e.name.split(' ')[0]}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Top / Bottom projects */}
          <motion.div variants={fadeUp} initial="hidden" animate="show">
            <GlassCard className="p-5 h-full">
              <SectionHeader icon={TrendingUp} title="Highest & Lowest Spend" subtitle="Top 5 and bottom 5 by expenditure" color="#f472b6" />
              <div className="space-y-1 mb-4">
                <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: '#f87171' }}>Highest Spend</p>
                {top5.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors"
                    onMouseEnter={e => { e.currentTarget.style.background = `${P.accent}06`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold h-5 w-5 rounded-md flex items-center justify-center" style={{ background: '#f8717115', color: '#f87171' }}>{i + 1}</span>
                      <span className="text-[10px] font-medium truncate" style={{ color: P.textHi, maxWidth: 140 }}>{p.name}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold tabular-nums" style={{ color: P.textMd }}>{fmtOMR(p.spent)}</span>
                  </div>
                ))}
              </div>
              <div className="h-px my-3" style={{ background: P.border }} />
              <div className="space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: '#34d399' }}>Lowest Spend</p>
                {bottom5.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors"
                    onMouseEnter={e => { e.currentTarget.style.background = `${P.accent}06`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold h-5 w-5 rounded-md flex items-center justify-center" style={{ background: '#34d39915', color: '#34d399' }}>{i + 1}</span>
                      <span className="text-[10px] font-medium truncate" style={{ color: P.textHi, maxWidth: 140 }}>{p.name}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold tabular-nums" style={{ color: P.textMd }}>{fmtOMR(p.spent)}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* ═══ Section 5: Budget Alerts ═══ */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {budgetAlerts.map((alert) => (
              <GlassCard key={alert.level} className="p-5 cursor-pointer transition-all" onClick={() => navigate(`/early-warning?level=${alert.level}`)}
                style={{ }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = alert.color + '40'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = P.border; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: alert.bg, border: `1px solid ${alert.color}25` }}>
                    {alert.level === 'critical' ? <AlertTriangle size={18} style={{ color: alert.color }} /> :
                     alert.level === 'warning' ? <AlertCircle size={18} style={{ color: alert.color }} /> :
                     <CheckCircle2 size={18} style={{ color: alert.color }} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-[12px] font-bold" style={{ color: P.textHi }}>{alert.title}</h4>
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.2 }}
                        className="text-lg font-black tabular-nums"
                        style={{ color: alert.color }}
                      >
                        {alert.count}
                      </motion.span>
                    </div>
                    <p className="text-[10px]" style={{ color: P.textLo }}>{alert.desc}</p>
                    {alert.level === 'critical' && (
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="mt-2 h-1 rounded-full"
                        style={{ background: `linear-gradient(90deg, ${alert.color}00, ${alert.color}, ${alert.color}00)` }}
                      />
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </motion.div>

        {/* ═══ Section 6: Efficiency Metrics ═══ */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="mb-8">
          <GlassCard className="p-5">
            <SectionHeader icon={Gauge} title="Financial Efficiency" subtitle="Key performance indicators for financial health" color="#34d399" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {efficiencyMetrics.map((m) => {
                const Icon = m.icon;
                return (
                  <div key={m.label} className="p-4 rounded-xl transition-colors" style={{ background: P.surface, border: `1px solid ${P.border}` }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = `${m.color}30`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon size={14} style={{ color: m.color }} />
                      <span className="text-[10px] font-semibold" style={{ color: P.textLo }}>{m.label}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="text-2xl font-black tabular-nums" style={{ color: P.textHi }}>{m.value}</span>
                      <span className="text-[10px] font-medium" style={{ color: P.textDim }}>{m.unit}</span>
                    </div>
                    <MiniTrend value={m.trend} />
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>

        {/* ═══ Section 7: Comparison Tabs ═══ */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="mb-8">
          <GlassCard className="p-5">
            <SectionHeader icon={BarChart3} title="Comparative Analysis" subtitle="Budget vs spending across different dimensions" color="#a78bfa" />

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
              {([
                { key: 'yearly', label: 'Year over Year', icon: Calendar },
                { key: 'category', label: 'By Category', icon: Layers },
                { key: 'region', label: 'By Region', icon: Globe },
              ] as const).map(tab => {
                const active = compareTab === tab.key;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setCompareTab(tab.key)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-[11px] font-semibold transition-all"
                    style={{
                      background: active ? `${P.accent}15` : 'transparent',
                      color: active ? P.accent : P.textLo,
                      border: active ? `1px solid ${P.accent}30` : '1px solid transparent',
                    }}
                  >
                    <TabIcon size={12} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {compareTab === 'yearly' && (
                <motion.div key="yearly" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={yearlyComparison} barGap={8}>
                        <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                        <XAxis dataKey="year" tick={{ fill: P.textMd, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: P.textDim, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtOMR(v)} />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Bar dataKey="budget" name="Budget" fill="#C8A44E" radius={[6, 6, 0, 0]} barSize={40} />
                        <Bar dataKey="spent" name="Spent" fill="#38bdf8" radius={[6, 6, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    {yearlyComparison.map(y => {
                      const util = Math.round(y.spent / y.budget * 100);
                      return (
                        <div key={y.year} className="p-3 rounded-full text-center" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                          <p className="text-[10px] font-bold mb-1" style={{ color: P.accent }}>{y.year}</p>
                          <p className="text-lg font-black" style={{ color: P.textHi }}>{util}%</p>
                          <p className="text-[9px]" style={{ color: P.textLo }}>utilization • {y.projects} projects</p>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {compareTab === 'category' && (
                <motion.div key="category" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryBreakdown} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                        <XAxis dataKey="name" tick={{ fill: P.textMd, fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: P.textDim, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtOMR(v)} />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Bar dataKey="budget" name="Budget" radius={[6, 6, 0, 0]} barSize={28}>
                          {categoryBreakdown.map((c, i) => <Cell key={i} fill={c.color} opacity={0.4} />)}
                        </Bar>
                        <Bar dataKey="spent" name="Spent" radius={[6, 6, 0, 0]} barSize={28}>
                          {categoryBreakdown.map((c, i) => <Cell key={i} fill={c.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}

              {compareTab === 'region' && (
                <motion.div key="region" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={regionComparison} layout="vertical" barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke={P.border} vertical={false} />
                        <XAxis type="number" tick={{ fill: P.textDim, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtOMR(v)} />
                        <YAxis type="category" dataKey="region" tick={{ fill: P.textMd, fontSize: 10 }} axisLine={false} tickLine={false} width={90} />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Bar dataKey="budget" name="Budget" fill="#C8A44E" radius={[0, 6, 6, 0]} barSize={14} opacity={0.4} />
                        <Bar dataKey="spent" name="Spent" fill="#38bdf8" radius={[0, 6, 6, 0]} barSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </motion.div>

        {/* ═══ Section 8: Top Expenses Table ═══ */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="mb-8">
          <GlassCard className="p-5">
            <SectionHeader icon={FileText} title="Top Expenses" subtitle="Highest approved expenses from database" color="#38bdf8"
              action={
                selectedInvoices.size > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: `${P.accent}15`, color: P.accent }}>
                      {selectedInvoices.size} selected
                    </span>
                    <button className="text-[10px] font-medium px-3 py-1.5 rounded-lg transition-colors" style={{ background: `${P.accent}10`, color: P.accent, border: `1px solid ${P.accent}30` }}>
                      Export
                    </button>
                  </div>
                ) : undefined
              }
            />

            {/* Filters */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-xs">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: P.textDim }} />
                <input
                  type="text"
                  value={invoiceSearch}
                  onChange={e => setInvoiceSearch(e.target.value)}
                  placeholder="Search invoices..."
                  className="w-full pl-9 pr-3 py-2 rounded-full text-[11px] outline-none transition-all"
                  style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi }}
                  onFocus={e => { e.currentTarget.style.borderColor = `${P.accent}60`; }}
                  onBlur={e => { e.currentTarget.style.borderColor = P.border; }}
                />
              </div>
              <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                {['all', 'paid', 'pending', 'overdue', 'draft'].map(f => (
                  <button
                    key={f}
                    onClick={() => setInvoiceFilter(f)}
                    className="px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all capitalize"
                    style={{
                      background: invoiceFilter === f ? `${P.accent}15` : 'transparent',
                      color: invoiceFilter === f ? P.accent : P.textLo,
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-medium transition-colors"
                style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textMd }}
              >
                <Filter size={10} />
                {sortField === 'amount' ? 'Amount' : 'Date'} {sortDir === 'asc' ? '↑' : '↓'}
              </button>
            </div>

            {/* Invoice Table */}
            <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: `${P.border} transparent` }}>
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${P.border}` }}>
                    <th className="text-left py-2.5 px-2 w-8">
                      <input type="checkbox" checked={selectedInvoices.size === filteredInvoices.length && filteredInvoices.length > 0} onChange={toggleAllInvoices}
                        className="h-3.5 w-3.5 rounded cursor-pointer accent-[#C8A44E]" />
                    </th>
                    {['Invoice', 'Project', 'Vendor', 'Category',
                      <button key="amt" onClick={() => setSortField('amount')} className="cursor-pointer flex items-center gap-1">Amount {sortField === 'amount' && (sortDir === 'asc' ? '↑' : '↓')}</button>,
                      <button key="dt" onClick={() => setSortField('date')} className="cursor-pointer flex items-center gap-1">Date {sortField === 'date' && (sortDir === 'asc' ? '↑' : '↓')}</button>,
                      'Status', 'Actions',
                    ].map((h, i) => (
                      <th key={i} className="text-left py-2.5 px-3 font-semibold" style={{ color: P.textLo }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filteredInvoices.map((inv, i) => (
                      <motion.tr
                        key={inv.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="transition-colors"
                        style={{ borderBottom: `1px solid ${P.border}08` }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${P.accent}04`; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <td className="py-2.5 px-2">
                          <input type="checkbox" checked={selectedInvoices.has(inv.id)} onChange={() => toggleInvoice(inv.id)}
                            className="h-3.5 w-3.5 rounded cursor-pointer accent-[#C8A44E]" />
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold" style={{ color: P.accent }}>{inv.id}</td>
                        <td className="py-2.5 px-3 font-medium" style={{ color: P.textHi }}>{inv.project}</td>
                        <td className="py-2.5 px-3" style={{ color: P.textMd }}>{inv.vendor}</td>
                        <td className="py-2.5 px-3" style={{ color: P.textLo }}>{inv.category}</td>
                        <td className="py-2.5 px-3 font-mono font-bold tabular-nums" style={{ color: P.textHi }}>{fmtFull(inv.amount)}</td>
                        <td className="py-2.5 px-3 tabular-nums" style={{ color: P.textMd }}>{inv.date}</td>
                        <td className="py-2.5 px-3"><StatusBadge status={inv.status} /></td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            <button className="p-1 rounded-md transition-colors" style={{ color: P.textDim }}
                              onMouseEnter={e => { e.currentTarget.style.color = P.accent; e.currentTarget.style.background = `${P.accent}10`; }}
                              onMouseLeave={e => { e.currentTarget.style.color = P.textDim; e.currentTarget.style.background = 'transparent'; }}>
                              <Eye size={11} />
                            </button>
                            <button className="p-1 rounded-md transition-colors" style={{ color: P.textDim }}
                              onMouseEnter={e => { e.currentTarget.style.color = '#38bdf8'; e.currentTarget.style.background = 'rgba(56,189,248,0.1)'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = P.textDim; e.currentTarget.style.background = 'transparent'; }}>
                              <Download size={11} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </GlassCard>
        </motion.div>

        {/* ═══ Section 9: Cash Flow ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="lg:col-span-2">
            <GlassCard className="p-5 h-full">
              <SectionHeader icon={Activity} title="Cash Flow Analysis" subtitle="Monthly inflows, outflows, and net position" color="#34d399" />
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={cashFlowData}>
                    <defs>
                      <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                    <XAxis dataKey="month" tick={{ fill: P.textDim, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: P.textDim, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtOMR(v)} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="inflow" stroke="#34d399" fill="url(#inflowGrad)" strokeWidth={2} name="Inflow" />
                    <Bar dataKey="outflow" fill="#f87171" opacity={0.5} radius={[4, 4, 0, 0]} barSize={16} name="Outflow" />
                    <Line type="monotone" dataKey="net" stroke="#C8A44E" strokeWidth={2} dot={{ r: 3, fill: '#C8A44E' }} name="Net" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </motion.div>

          {/* Monthly Cash Flow Table */}
          <motion.div variants={fadeUp} initial="hidden" animate="show">
            <GlassCard className="p-5 h-full">
              <SectionHeader icon={Wallet} title="Monthly Summary" subtitle="Cash position per month" color="#fbbf24" />
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: `${P.border} transparent` }}>
                {cashFlowData.map(m => (
                  <div key={m.month} className="flex items-center justify-between p-2 rounded-full" style={{ background: P.surface }}>
                    <span className="text-[10px] font-bold w-8" style={{ color: P.textMd }}>{m.month}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-mono" style={{ color: '#34d399' }}>+{fmtOMR(m.inflow)}</span>
                      <span className="text-[9px] font-mono" style={{ color: '#f87171' }}>-{fmtOMR(m.outflow)}</span>
                      <span className="text-[9px] font-mono font-bold min-w-[45px] text-right" style={{ color: m.net >= 0 ? '#34d399' : '#f87171' }}>
                        {m.net >= 0 ? '+' : ''}{fmtOMR(m.net)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* ═══ Section 10: Forecast ═══ */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="mb-8">
          <GlassCard className="p-5">
            <SectionHeader icon={Sparkles} title="Financial Forecast" subtitle="AI-powered projections for upcoming quarters" color="#a78bfa"
              action={
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}>
                  <Sparkles size={10} style={{ color: '#a78bfa' }} />
                  <span className="text-[9px] font-bold" style={{ color: '#a78bfa' }}>AI Powered</span>
                </div>
              }
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {forecastData.map((f, i) => (
                <motion.div
                  key={f.quarter}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-5 rounded-xl relative"
                  style={{ background: P.surface, border: `1px solid ${P.border}` }}
                >
                  {/* Confidence ring */}
                  <div className="absolute top-4 right-4">
                    <svg width={44} height={44} viewBox="0 0 44 44">
                      <circle cx={22} cy={22} r={18} stroke={P.border} strokeWidth={3} fill="none" />
                      <motion.circle
                        cx={22} cy={22} r={18}
                        stroke="#a78bfa"
                        strokeWidth={3}
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={113}
                        initial={{ strokeDashoffset: 113 }}
                        animate={{ strokeDashoffset: 113 - (113 * f.confidence / 100) }}
                        transition={{ duration: 1.2, delay: i * 0.2, ease: EASE }}
                        transform="rotate(-90 22 22)"
                      />
                      <text x={22} y={24} textAnchor="middle" fill="#a78bfa" fontSize={10} fontWeight={800}>{f.confidence}%</text>
                    </svg>
                  </div>

                  <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: '#a78bfa' }}>{f.quarter}</p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[9px] mb-0.5" style={{ color: P.textDim }}>Projected Budget</p>
                      <p className="text-base font-black tabular-nums" style={{ color: P.textHi }}>{fmtFull(f.projectedBudget)} <span className="text-[9px] font-medium" style={{ color: P.textDim }}>OMR</span></p>
                    </div>
                    <div>
                      <p className="text-[9px] mb-0.5" style={{ color: P.textDim }}>Projected Spend</p>
                      <p className="text-base font-black tabular-nums" style={{ color: '#38bdf8' }}>{fmtFull(f.projectedSpend)} <span className="text-[9px] font-medium" style={{ color: P.textDim }}>OMR</span></p>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: P.border }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.round(f.projectedSpend / f.projectedBudget * 100)}%` }}
                        transition={{ duration: 1, delay: i * 0.2, ease: EASE }}
                        className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg, #34d399, #38bdf8)' }}
                      />
                    </div>
                    <p className="text-[9px]" style={{ color: P.textLo }}>
                      Est. utilization: <span className="font-bold" style={{ color: '#34d399' }}>{Math.round(f.projectedSpend / f.projectedBudget * 100)}%</span>
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Footer spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
}
