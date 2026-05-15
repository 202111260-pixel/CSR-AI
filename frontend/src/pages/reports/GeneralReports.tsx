import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, BarChart, Bar, Cell, PieChart, Pie,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Line,
  ComposedChart,
} from 'recharts';
import {
  BarChart3, TrendingUp, Calendar, Printer,
  FileSpreadsheet, FileText, ChevronDown,
  AlertTriangle, AlertCircle, Shield, ShieldAlert,
  FolderKanban, Users, Wallet, Target, CheckCircle2,
  Clock, ArrowUpRight, ArrowDownRight, Flame, Eye, Layers,
  Star, Bell, Award, PieChart as PieChartIcon, type LucideIcon,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTheme } from '../../hooks/useTheme';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '../../services/reportService';
import { printTable, generateGeneralReportExcel, type ExportColumn } from '../../utils/exportUtils';
import { generateGeneralReportPDF } from '../../utils/pdfReportGenerator';
import { Button } from '../../components/ui/Button';
import { ActionBar } from '../../components/common/ActionBar';




const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } } };
const stagger = (d = 0) => ({ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: d } } });
const scaleIn = (d = 0) => ({ hidden: { opacity: 0, scale: 0.92 }, show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: EASE, delay: d } } });
const VP = { once: true, margin: '-60px' as any };


const periods = ['All Time', 'Today', 'This Week', 'This Month', 'This Quarter', 'This Year', 'Custom'] as const;


const riskProjects = [
  { name: 'Solar Power — Adam', category: 'Infrastructure', risk: 'critical' as const, budget: 320000, spent: 280000, progress: 45, daysLeft: -12 },
  { name: 'Community Health Center', category: 'Healthcare', risk: 'high' as const, budget: 280000, spent: 245000, progress: 85, daysLeft: 22 },
  { name: 'School Renovation', category: 'Education', risk: 'medium' as const, budget: 150000, spent: 95000, progress: 63, daysLeft: 67 },
  { name: 'Coastal Conservation', category: 'Environment', risk: 'medium' as const, budget: 210000, spent: 140000, progress: 67, daysLeft: 128 },
  { name: 'Heritage Restoration', category: 'Community', risk: 'medium' as const, budget: 450000, spent: 310000, progress: 72, daysLeft: 220 },
];

const riskCfg = {
  critical: { color: '#f87171', bg: 'rgba(248,113,113,0.08)', icon: ShieldAlert, count: 1 },
  high: { color: '#fb923c', bg: 'rgba(251,146,60,0.08)', icon: AlertTriangle, count: 1 },
  medium: { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', icon: AlertCircle, count: 3 },
  low: { color: '#34d399', bg: 'rgba(52,211,153,0.08)', icon: Shield, count: 42 },
};


const radarData = [
  { metric: 'Budget Mgmt', value: 85 },
  { metric: 'Timeliness', value: 72 },
  { metric: 'Quality', value: 88 },
  { metric: 'Impact', value: 91 },
  { metric: 'Stakeholder', value: 78 },
  { metric: 'Innovation', value: 82 },
];

const budgetEvolution = [
  { month: 'Jul', allocated: 1800, spent: 1200 },
  { month: 'Aug', allocated: 1900, spent: 1350 },
  { month: 'Sep', allocated: 2000, spent: 1500 },
  { month: 'Oct', allocated: 2100, spent: 1650 },
  { month: 'Nov', allocated: 2200, spent: 1800 },
  { month: 'Dec', allocated: 2300, spent: 1950 },
  { month: 'Jan', allocated: 2350, spent: 2050 },
  { month: 'Feb', allocated: 2450, spent: 2200 },
];

const topProjects = [
  { rank: 1, name: 'Heritage Restoration — Bahla Fort', category: 'Community', budget: 450000, progress: 72, rating: 4.3, beneficiaries: 5000, status: 'active' },
  { rank: 2, name: 'Solar Power Installation', category: 'Infrastructure', budget: 320000, progress: 45, rating: 3.2, beneficiaries: 4200, status: 'on_hold' },
  { rank: 3, name: 'Community Health Center', category: 'Healthcare', budget: 280000, progress: 85, rating: 3.8, beneficiaries: 3500, status: 'active' },
  { rank: 4, name: 'Coastal Conservation Project', category: 'Environment', budget: 210000, progress: 67, rating: 4.1, beneficiaries: 600, status: 'active' },
  { rank: 5, name: 'Mobile Health Clinics', category: 'Healthcare', budget: 195000, progress: 60, rating: 4.0, beneficiaries: 2200, status: 'active' },
  { rank: 6, name: 'Women Empowerment Hub', category: 'Community', budget: 180000, progress: 40, rating: 4.5, beneficiaries: 950, status: 'active' },
  { rank: 7, name: 'Smart Agriculture Initiative', category: 'Agriculture', budget: 175000, progress: 5, rating: 0, beneficiaries: 350, status: 'planning' },
  { rank: 8, name: 'School Renovation — Muscat', category: 'Education', budget: 150000, progress: 63, rating: 4.2, beneficiaries: 1200, status: 'active' },
  { rank: 9, name: 'Clean Water Initiative', category: 'Environment', budget: 120000, progress: 100, rating: 4.8, beneficiaries: 2800, status: 'completed' },
  { rank: 10, name: 'Youth Training Program', category: 'Education', budget: 95000, progress: 10, rating: 0, beneficiaries: 500, status: 'planning' },
];

const delayedProjects = [
  { name: 'Solar Power Installation', daysLate: 12, originalEnd: '2026-02-10', progress: 45, risk: 'critical' as const },
  { name: 'Barka Road Infrastructure', daysLate: 23, originalEnd: '2026-01-31', progress: 80, risk: 'high' as const },
  { name: 'Community Health Center', daysLate: 0, originalEnd: '2026-03-15', progress: 85, risk: 'high' as const },
];

const overBudgetProjects = [
  { name: 'Solar Power Installation', budget: 320000, spent: 280000, overBy: 87.5, progress: 45 },
  { name: 'Community Health Center', budget: 280000, spent: 245000, overBy: 87.5, progress: 85 },
  { name: 'Clean Water Initiative', budget: 120000, spent: 115000, overBy: 95.8, progress: 100 },
];

const comparisons = [
  { label: 'vs Last Month', projectsDelta: 12, budgetDelta: 8.5, benefDelta: 15.2, completionDelta: 3.1 },
  { label: 'vs Last Quarter', projectsDelta: 28, budgetDelta: 22.3, benefDelta: 35.0, completionDelta: 7.8 },
  { label: 'vs Last Year', projectsDelta: 45, budgetDelta: 38.7, benefDelta: 62.5, completionDelta: 12.4 },
];

const getDelta = (curr: number, prev: number) => prev === 0 ? '0.0' : ((curr - prev) / prev * 100).toFixed(1);



function AnimatedCounter({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);
  React.useEffect(() => {
    if (!isInView) return;
    const end = value;
    const duration = 1200;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(0 + (end - 0) * eased);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, value]);
  return <span ref={ref}>{decimals ? display.toFixed(decimals) : Math.round(display).toLocaleString()}</span>;
}

function MiniSparkline({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ');
  const uid = `spark-${color.replace('#', '')}`;
  return (
    <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={color} strokeWidth={1.5} points={points} strokeLinecap="round" strokeLinejoin="round" />
      <polygon fill={`url(#${uid})`} points={`0,${height} ${points} ${w},${height}`} />
    </svg>
  );
}

function GlassCard({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const { colors: P } = useTheme();
  return (
    <div
      className={cn('relative rounded-[20px]', className)}
      style={{
        background: `${P.card}`,
        border: `1px solid ${P.border}`,
        boxShadow: `inset 0 1px 0 ${P.borderHi}40, 0 12px 40px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.03)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, action }: { icon: LucideIcon; title: string; subtitle?: string; action?: React.ReactNode }) {
  const { colors: P } = useTheme();
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: `${P.accent}12`, border: `1px solid ${P.accent}20` }}>
          <Icon size={16} style={{ color: P.accent }} />
        </div>
        <div>
          <h3 className="text-sm font-bold" style={{ color: P.textHi }}>{title}</h3>
          {subtitle && <p className="text-[10px] mt-0.5" style={{ color: P.textLo }}>{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

const ChartTooltip = ({ active, payload, label }: any) => {
  const { colors: P } = useTheme();
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3.5 py-2.5" style={{ background: P.card, border: `1px solid ${P.borderHi}`, boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }}>
      <p className="text-[10px] font-bold mb-1.5" style={{ color: P.textMd }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-[10px]">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: P.textLo }}>{p.name}:</span>
          <span className="font-bold" style={{ color: P.textHi }}>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  );
};


function RiskDonut({ data }: { data: typeof riskCfg }) {
  const { colors: P } = useTheme();
  const entries = Object.entries(data) as [keyof typeof riskCfg, (typeof riskCfg)[keyof typeof riskCfg]][];
  const total = entries.reduce((s, [, v]) => s + v.count, 0);
  let cumulative = 0;
  const size = 120;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        {entries.map(([key, val]) => {
          const pct = val.count / total;
          const dashArray = `${pct * circumference} ${circumference}`;
          const dashOffset = -cumulative * circumference;
          cumulative += pct;
          return (
            <circle key={key} cx={size / 2} cy={size / 2} r={radius} fill="none"
              stroke={val.color} strokeWidth={strokeWidth} strokeDasharray={dashArray}
              strokeDashoffset={dashOffset} strokeLinecap="round" opacity={0.85} />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black" style={{ color: P.textHi }}>{total}</span>
        <span className="text-[9px]" style={{ color: P.textLo }}>Total</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════════════════ */
export default function GeneralReports() {
  const navigate = useNavigate();
  const P = useTheme().colors;
  const [period, setPeriod] = useState<(typeof periods)[number]>('All Time');
  const [periodOpen, setPeriodOpen] = useState(false);

  /* ── API wiring ── */
  const periodParams = useMemo(() => {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    switch (period) {
      case 'Today': return { startDate: fmt(now), endDate: fmt(now) };
      case 'This Week': { const s = new Date(now); s.setDate(now.getDate() - now.getDay()); return { startDate: fmt(s), endDate: fmt(now) }; }
      case 'This Month': return { startDate: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: fmt(now) };
      case 'This Quarter': return { startDate: fmt(new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)), endDate: fmt(now) };
      case 'This Year': return { startDate: fmt(new Date(now.getFullYear(), 0, 1)), endDate: fmt(now) };
      default: return {};
    }
  }, [period]);

  const { data: reportRes, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['report-general', periodParams],
    queryFn: () => reportService.getGeneralReport(periodParams),
    staleTime: 5 * 60 * 1000,
  });
  const report = (reportRes as any)?.data;

  /* ── Derived data from API ── */
  const kpis = useMemo(() => [
    { label: 'Total Projects', value: report?.totalProjects ?? 0, prev: 0, icon: FolderKanban, color: '#C8A44E', format: 'number', href: '/projects' },
    { label: 'Completion Rate', value: report?.completionRate ?? 0, prev: 0, icon: CheckCircle2, color: '#34d399', format: '%', href: '/projects?status=completed' },
    { label: 'Total Budget', value: report?.totalBudget ?? 0, prev: 0, icon: Wallet, color: '#38bdf8', format: 'omr', href: '/reports/financial' },
    { label: 'Beneficiaries', value: report?.totalBeneficiaries ?? 0, prev: 0, icon: Users, color: '#a78bfa', format: 'number', href: '/reports/impact' },
  ], [report]);

  const trendData = useMemo(() => {
    if (!report?.creationTrend?.length) return [];
    return report.creationTrend.map((t: any) => ({
      month: t.month,
      projects: t.count ?? 0,
      budget: t.budget ?? 0,
      beneficiaries: t.beneficiaries ?? 0,
      completion: t.completion ?? 0,
      expenses: t.expenses ?? 0,
    }));
  }, [report]);

  const categoryData = useMemo(() => {
    if (!report?.categoryDistribution?.length) return [];
    return report.categoryDistribution.map((c: any) => ({
      name: c.category,
      projects: c.count ?? 0,
      budget: Math.round((c.budget ?? 0) / 1000),
      spent: Math.round((c.spent ?? 0) / 1000),
      beneficiaries: c.beneficiaries ?? 0,
      completion: c.completion ?? 0,
    }));
  }, [report]);

  const statusColorMap: Record<string, string> = { active: '#38bdf8', completed: '#34d399', planning: '#C8A44E', on_hold: '#fbbf24' };
  const statusLabelMap: Record<string, string> = { active: 'Active', completed: 'Completed', planning: 'Planning', on_hold: 'On Hold' };
  const statusDist = useMemo(() => {
    if (!report?.statusDistribution?.length) return [];
    return report.statusDistribution.map((s: any) => ({
      name: statusLabelMap[s.status] || s.status,
      value: s.count,
      color: statusColorMap[s.status] || '#6B6849',
    }));
  }, [report]);

  /* ── Export Handlers ── */
  const exportColumns: ExportColumn[] = [
    { key: 'metric', header: 'المؤشر', width: 25 },
    { key: 'value', header: 'القيمة', width: 20 },
    { key: 'trend', header: 'الاتجاه', width: 15 },
  ];

  const getExportData = useCallback(() => {
    const data = [
      { metric: 'إجمالي المشاريع', value: report?.totalProjects ?? 0, trend: 'Active' },
      { metric: 'نسبة الإنجاز', value: `${(report?.completionRate ?? 0).toFixed(1)}%`, trend: 'Up' },
      { metric: 'إجمالي الميزانية', value: `${((report?.totalBudget ?? 0) / 1000).toFixed(0)}K OMR`, trend: 'Stable' },
      { metric: 'المستفيدون', value: report?.totalBeneficiaries ?? 0, trend: 'Up' },
    ];
    // Add category distribution
    if (categoryData?.length) {
      data.push({ metric: '--- توزيع الفئات ---', value: '', trend: '' });
      categoryData.forEach((c: any) => {
        data.push({ metric: c.name, value: `${c.projects} مشروع`, trend: `${c.budget}K OMR` });
      });
    }
    // Add status distribution
    if (statusDist?.length) {
      data.push({ metric: '--- توزيع الحالات ---', value: '', trend: '' });
      statusDist.forEach((s: any) => {
        data.push({ metric: s.name, value: s.value, trend: '' });
      });
    }
    return data;
  }, [report, categoryData, statusDist]);

  const handleExportExcel = useCallback(() => {
    generateGeneralReportExcel({
      kpis: [
        { label: 'Total Projects',  value: report?.totalProjects ?? 0 },
        { label: 'Completion Rate', value: report?.completionRate ?? 0 },
        { label: 'Total Budget',    value: report?.totalBudget ?? 0 },
        { label: 'Beneficiaries',   value: report?.totalBeneficiaries ?? 0 },
      ],
      statusDistribution: statusDist,
      categoryDistribution: categoryData.map((c: any) => ({ name: c.name, projects: c.projects, budget: c.budget * 1000, spent: c.spent * 1000 })),
      dateRange: periodParams.startDate ? { from: periodParams.startDate, to: periodParams.endDate } : undefined,
      trendData: trendData.map((t: any) => ({ month: t.month, projects: t.projects, budget: t.budget, expenses: t.expenses, beneficiaries: t.beneficiaries })),
      riskProjects: riskProjects.map(p => ({ name: p.name, category: p.category, risk: p.risk, budget: p.budget, spent: p.spent, progress: p.progress, daysLeft: p.daysLeft })),
      radarData: radarData.map(r => ({ metric: r.metric, value: r.value })),
      topProjects: topProjects.map(p => ({ rank: p.rank, name: p.name, category: p.category, budget: p.budget, progress: p.progress, rating: p.rating, beneficiaries: p.beneficiaries, status: p.status })),
      delayedProjects: delayedProjects.map(p => ({ name: p.name, originalEnd: p.originalEnd, daysLate: p.daysLate, progress: p.progress, risk: p.risk })),
      overBudgetProjects: overBudgetProjects.map(p => ({ name: p.name, budget: p.budget, spent: p.spent, overBy: p.overBy, progress: p.progress })),
      comparisons: comparisons.map(c => ({ label: c.label, projectsDelta: c.projectsDelta, budgetDelta: c.budgetDelta, benefDelta: c.benefDelta, completionDelta: c.completionDelta })),
    });
  }, [report, statusDist, categoryData, trendData, periodParams]);

  const handleExportPDF = useCallback(() => {
    generateGeneralReportPDF({
      kpis: [
        { label: 'Total Projects',   value: report?.totalProjects ?? 0,    format: 'number',     color: '#C8A44E' },
        { label: 'Completion Rate',  value: report?.completionRate ?? 0,   format: 'percentage', color: '#34d399' },
        { label: 'Total Budget',     value: report?.totalBudget ?? 0,      format: 'currency',   color: '#38bdf8' },
        { label: 'Beneficiaries',    value: report?.totalBeneficiaries ?? 0, format: 'number',   color: '#a78bfa' },
      ],
      statusDistribution: statusDist,
      categoryDistribution: categoryData.map(c => ({ name: c.name, projects: c.projects, budget: c.budget * 1000, spent: c.spent * 1000 })),
      dateRange: periodParams.startDate ? { from: periodParams.startDate, to: periodParams.endDate } : undefined,
      // Extended data — all sections visible on page
      trendData: trendData.map(t => ({
        month: t.month, projects: t.projects, budget: t.budget, expenses: t.expenses, beneficiaries: t.beneficiaries,
      })),
      riskProjects: riskProjects.map(p => ({
        name: p.name, category: p.category, risk: p.risk,
        budget: p.budget, spent: p.spent, progress: p.progress, daysLeft: p.daysLeft,
      })),
      radarData: radarData.map(r => ({ metric: r.metric, value: r.value })),
      topProjects: topProjects.map(p => ({
        rank: p.rank, name: p.name, category: p.category, budget: p.budget,
        progress: p.progress, rating: p.rating, beneficiaries: p.beneficiaries, status: p.status,
      })),
      delayedProjects: delayedProjects.map(p => ({
        name: p.name, originalEnd: p.originalEnd, daysLate: p.daysLate, progress: p.progress, risk: p.risk,
      })),
      overBudgetProjects: overBudgetProjects.map(p => ({
        name: p.name, budget: p.budget, spent: p.spent, overBy: p.overBy, progress: p.progress,
      })),
      comparisons: comparisons.map(c => ({
        label: c.label, projectsDelta: c.projectsDelta, budgetDelta: c.budgetDelta,
        benefDelta: c.benefDelta, completionDelta: c.completionDelta,
      })),
    });
  }, [report, statusDist, categoryData, trendData, periodParams]);

  const handlePrint = useCallback(() => {
    printTable(getExportData(), exportColumns, 'التقرير العام - General Report');
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
    <div style={{ background: P.bg, fontFamily: 'Inter, sans-serif' }} className="min-h-full">
      <div className="relative px-6 py-5 space-y-6 max-w-[1600px] mx-auto">

        {/* ═══════════════════ HEADER ═══════════════════ */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" key="header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="h-10 w-10 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${P.accent}, ${P.accentLo})`, boxShadow: `0 4px 20px ${P.accent}40` }}>
                  <BarChart3 size={20} style={{ color: P.bg }} />
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight" style={{ color: P.textHi }}>General Reports</h1>
                  <p className="text-[11px]" style={{ color: P.textLo }}>Comprehensive overview of all CSR operations • Last updated: Feb 23, 2026</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Period Selector */}
              <div className="relative">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setPeriodOpen(!periodOpen)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium"
                  style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textMd }}>
                  <Calendar size={13} style={{ color: P.accent }} />
                  {period}
                  <ChevronDown size={11} style={{ color: P.textLo }} />
                </motion.button>
                <AnimatePresence>
                  {periodOpen && (
                    <motion.div initial={{ opacity: 0, y: -6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 z-50 mt-2 w-44 rounded-xl overflow-hidden"
                      style={{ background: P.card, border: `1px solid ${P.borderHi}`, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
                      {periods.map(p => (
                        <button key={p} onClick={() => { setPeriod(p); setPeriodOpen(false); }}
                          className="w-full px-3.5 py-2 text-left text-xs transition-colors"
                          style={{ color: p === period ? P.accent : P.textMd, background: p === period ? `${P.accent}08` : 'transparent' }}>
                          {p}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Export Buttons */}
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

        {/* ═══════════════════ KPI SUMMARY CARDS ═══════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, i) => {
            const delta = Number(getDelta(kpi.value, kpi.prev));
            const isPos = delta > 0;
            const sparkData = trendData.map(d =>
              kpi.label === 'Total Projects' ? d.projects :
              kpi.label === 'Completion Rate' ? d.completion :
              kpi.label === 'Total Budget' ? d.budget :
              d.beneficiaries
            );
            return (
              <motion.div key={`${period}-${kpi.label}`} variants={stagger(i * 0.08)} initial="hidden" whileInView="show" viewport={VP} onClick={() => navigate(kpi.href)} className="cursor-pointer" whileHover={{ y: -4, scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}>
                <GlassCard className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${kpi.color}12`, border: `1px solid ${kpi.color}20` }}>
                        <kpi.icon size={18} style={{ color: kpi.color }} />
                      </div>
                      <span className="text-[11px] font-medium" style={{ color: P.textLo }}>{kpi.label}</span>
                    </div>
                    <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: isPos ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)', color: isPos ? '#34d399' : '#f87171' }}>
                      {isPos ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                      {Math.abs(delta)}%
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-black tabular-nums" style={{ color: P.textHi }}>
                        {kpi.format === 'omr' ? <><span className="text-sm font-bold" style={{ color: P.textLo }}>OMR </span><AnimatedCounter value={kpi.value / 1000} decimals={0} />K</> :
                         kpi.format === '%' ? <><AnimatedCounter value={kpi.value} decimals={1} /><span className="text-sm" style={{ color: P.textLo }}>%</span></> :
                         <AnimatedCounter value={kpi.value} />}
                      </p>
                      <p className="text-[10px] mt-1" style={{ color: P.textDim }}>
                        Previous: {kpi.format === 'omr' ? `${(kpi.prev / 1000).toFixed(0)}K OMR` : kpi.format === '%' ? `${kpi.prev}%` : kpi.prev.toLocaleString()}
                      </p>
                    </div>
                    <MiniSparkline data={sparkData} color={kpi.color} />
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>

        {/* ═══════════════════ EARLY WARNING PANEL ═══════════════════ */}
        <motion.div variants={scaleIn(0.1)} initial="hidden" whileInView="show" viewport={VP}>
          <GlassCard className="p-6" style={{ border: '1px solid rgba(248,113,113,0.15)' }}>
            <SectionHeader icon={ShieldAlert} title="Early Warning Center" subtitle="Real-time project risk assessment" action={
              <motion.button whileHover={{ scale: 1.03 }} onClick={() => navigate('/early-warning')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold cursor-pointer"
                style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                <Eye size={11} /> View All Alerts
              </motion.button>
            } />

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Risk Breakdown Columns */}
              <div className="flex-1">
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {(Object.entries(riskCfg) as [string, (typeof riskCfg)[keyof typeof riskCfg]][]).map(([key, val], i) => (
                    <motion.div key={key} variants={stagger(i * 0.06)} initial="hidden" whileInView="show" viewport={VP}
                      className="rounded-2xl p-4 text-center" style={{ background: val.bg, border: `1px solid ${val.color}15` }}>
                      <val.icon size={18} style={{ color: val.color }} className="mx-auto mb-2" />
                      <p className="text-2xl font-black tabular-nums" style={{ color: val.color }}>{val.count}</p>
                      <p className="text-[9px] uppercase tracking-wider font-bold mt-1" style={{ color: `${val.color}90` }}>{key}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Risk Table */}
                <div className="rounded-xl" style={{ border: `1px solid ${P.border}` }}>
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr style={{ background: P.surface }}>
                        {['Project', 'Category', 'Risk', 'Budget Usage', 'Progress', 'Days Left'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left font-semibold tracking-wider uppercase text-[9px]" style={{ color: P.textLo }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {riskProjects.map((p, i) => {
                        const rc = riskCfg[p.risk];
                        const budgetPct = Math.round(p.spent / p.budget * 100);
                        return (
                          <tr key={i} onClick={() => navigate(`/projects/${i + 1}`)} className="cursor-pointer transition-colors" style={{ borderTop: `1px solid ${P.border}` }}
                            onMouseEnter={e => (e.currentTarget.style.background = `${rc.color}08`)}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <td className="px-3 py-2.5 font-medium" style={{ color: P.textHi }}>{p.name}</td>
                            <td className="px-3 py-2.5" style={{ color: P.textMd }}>{p.category}</td>
                            <td className="px-3 py-2.5">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase" style={{ background: rc.bg, color: rc.color }}>{p.risk}</span>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full" style={{ background: P.border }}>
                                  <div className="h-full rounded-full" style={{ width: `${budgetPct}%`, background: budgetPct > 85 ? '#f87171' : budgetPct > 70 ? '#fbbf24' : '#34d399' }} />
                                </div>
                                <span className="tabular-nums" style={{ color: P.textLo }}>{budgetPct}%</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 tabular-nums" style={{ color: P.textMd }}>{p.progress}%</td>
                            <td className="px-3 py-2.5">
                              <span className="tabular-nums font-bold" style={{ color: p.daysLeft < 0 ? '#f87171' : p.daysLeft < 30 ? '#fbbf24' : '#34d399' }}>
                                {p.daysLeft < 0 ? `${Math.abs(p.daysLeft)}d overdue` : `${p.daysLeft}d`}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Donut */}
              <div className="flex flex-col items-center justify-center lg:w-48">
                <RiskDonut data={riskCfg} />
                <p className="text-[10px] mt-3 font-bold" style={{ color: P.textLo }}>Risk Distribution</p>
                <div className="mt-3 space-y-1.5 w-full">
                  {(Object.entries(riskCfg) as [string, (typeof riskCfg)[keyof typeof riskCfg]][]).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: val.color }} />
                        <span className="capitalize" style={{ color: P.textMd }}>{key}</span>
                      </div>
                      <span className="font-bold tabular-nums" style={{ color: P.textHi }}>{val.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* ═══════════════════ CHARTS — ROW 1 ═══════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Trend Line Chart */}
          <motion.div key={`trend-${period}`} variants={stagger(0)} initial="hidden" whileInView="show" viewport={VP}>
            <GlassCard className="p-5">
              <SectionHeader icon={TrendingUp} title="Project & Budget Trends" subtitle="8-month progression overview" />
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData}>
                    <defs>
                      <linearGradient id="gradProjects" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C8A44E" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#C8A44E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: P.textLo, fontSize: 10 }} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: P.textLo, fontSize: 10 }} />
                    {trendData.some(d => d.budget > 0) && (
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: P.textLo, fontSize: 10 }} />
                    )}
                    <RTooltip content={<ChartTooltip />} />
                    <Area yAxisId="left" type="monotone" dataKey="projects" name="Projects" stroke="#C8A44E" fill="url(#gradProjects)" strokeWidth={2.5} dot={{ r: 3, fill: '#C8A44E' }} />
                    {trendData.some(d => d.budget > 0) && (
                      <Line yAxisId="right" type="monotone" dataKey="budget" name="Budget (M)" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3, fill: '#38bdf8' }} />
                    )}
                    {trendData.some(d => d.expenses > 0) && (
                      <Line yAxisId="right" type="monotone" dataKey="expenses" name="Expenses (M)" stroke="#f87171" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, fill: '#f87171' }} />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </motion.div>

          {/* Category Comparison Bar */}
          <motion.div key={`category-${period}`} variants={stagger(0.06)} initial="hidden" whileInView="show" viewport={VP}>
            <GlassCard className="p-5">
              <SectionHeader icon={Layers} title="Category Comparison" subtitle="Budget allocated vs spent by category" />
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} barGap={2} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: P.textLo, fontSize: 9 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: P.textLo, fontSize: 10 }} />
                    <RTooltip content={<ChartTooltip />} />
                    <Bar dataKey="budget" name="Budget (K)" fill="#38bdf8" radius={[4, 4, 0, 0]} opacity={0.6} />
                    <Bar dataKey="spent" name="Spent (K)" fill="#C8A44E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* ═══════════════════ CHARTS — ROW 2 ═══════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Status Distribution Pie */}
          <motion.div key={`status-${period}`} variants={stagger(0)} initial="hidden" whileInView="show" viewport={VP}>
            <GlassCard className="p-5">
              <SectionHeader icon={PieChartIcon} title="Status Distribution" />
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusDist} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value"
                      stroke="none" paddingAngle={3} cornerRadius={4}>
                      {statusDist.map((d, i) => <Cell key={i} fill={d.color} opacity={0.85} style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects?status=${d.name.toLowerCase()}`)} />)}
                    </Pie>
                    <RTooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-3 mt-2 flex-wrap">
                {statusDist.map(s => (
                  <div key={s.name} onClick={() => navigate(`/projects?status=${s.name.toLowerCase()}`)} className="flex items-center gap-1.5 text-[10px] cursor-pointer px-2 py-1 rounded-lg transition-colors"
                    onMouseEnter={e => (e.currentTarget.style.background = `${s.color}15`)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                    <span style={{ color: P.textMd }}>{s.name}</span>
                    <span className="font-bold" style={{ color: P.textHi }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Performance Radar */}
          <motion.div variants={stagger(0.06)} initial="hidden" whileInView="show" viewport={VP}>
            <GlassCard className="p-5">
              <SectionHeader icon={Target} title="Performance Radar" />
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={75}>
                    <PolarGrid stroke={P.border} />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: P.textLo, fontSize: 9 }} />
                    <Radar name="Score" dataKey="value" stroke={P.accent} fill={P.accent} fillOpacity={0.15} strokeWidth={2} dot={{ r: 3, fill: P.accent }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-center mt-2" style={{ color: P.textDim }}>
                Overall Score: <span className="font-black" style={{ color: P.accent }}>82.7</span>/100
              </p>
            </GlassCard>
          </motion.div>

          {/* Budget Evolution Area */}
          <motion.div variants={stagger(0.12)} initial="hidden" whileInView="show" viewport={VP}>
            <GlassCard className="p-5">
              <SectionHeader icon={Wallet} title="Budget Evolution" />
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={budgetEvolution}>
                    <defs>
                      <linearGradient id="gradAlloc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradSpent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C8A44E" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#C8A44E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: P.textLo, fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: P.textLo, fontSize: 10 }} />
                    <RTooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="allocated" name="Allocated (K)" stroke="#38bdf8" fill="url(#gradAlloc)" strokeWidth={2} />
                    <Area type="monotone" dataKey="spent" name="Spent (K)" stroke="#C8A44E" fill="url(#gradSpent)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* ═══════════════════ DELAYED + OVER-BUDGET ═══════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Delayed Projects */}
          <motion.div variants={stagger(0)} initial="hidden" whileInView="show" viewport={VP}>
            <GlassCard className="p-5">
              <SectionHeader icon={Clock} title="Delayed Projects" subtitle="Projects past their original deadline" />
              <div className="space-y-3">
                {delayedProjects.map((p, i) => {
                  const rc = riskCfg[p.risk];
                  return (
                    <div key={i} onClick={() => navigate(`/projects/${i + 1}`)} className="flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all" style={{ background: P.surface, border: `1px solid ${P.border}` }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${rc.color}08`; e.currentTarget.style.borderColor = `${rc.color}30`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = P.surface; e.currentTarget.style.borderColor = P.border; }}>
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: rc.bg, border: `1px solid ${rc.color}20` }}>
                        <rc.icon size={16} style={{ color: rc.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold truncate" style={{ color: P.textHi }}>{p.name}</p>
                        <div className="flex items-center gap-3 mt-1 text-[10px]">
                          <span style={{ color: P.textLo }}>Due: {p.originalEnd}</span>
                          <span className="font-bold" style={{ color: rc.color }}>
                            {p.daysLate > 0 ? `${p.daysLate}d overdue` : 'At risk'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black tabular-nums" style={{ color: P.textHi }}>{p.progress}%</p>
                        <div className="w-16 h-1.5 rounded-full mt-1" style={{ background: P.border }}>
                          <div className="h-full rounded-full" style={{ width: `${p.progress}%`, background: rc.color }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>

          {/* Over-Budget Projects */}
          <motion.div variants={stagger(0.06)} initial="hidden" whileInView="show" viewport={VP}>
            <GlassCard className="p-5">
              <SectionHeader icon={Flame} title="Budget Alert" subtitle="Projects exceeding 85% of allocated budget" />
              <div className="space-y-3">
                {overBudgetProjects.map((p, i) => (
                  <div key={i} onClick={() => navigate(`/projects/${i + 1}`)} className="flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all" style={{ background: P.surface, border: `1px solid ${P.border}` }}
                    onMouseEnter={e => { e.currentTarget.style.background = `rgba(248,113,113,0.06)`; e.currentTarget.style.borderColor = `rgba(248,113,113,0.25)`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = P.surface; e.currentTarget.style.borderColor = P.border; }}>
                    <div className="relative h-12 w-12 shrink-0">
                      <svg width={48} height={48} viewBox="0 0 48 48">
                        <circle cx={24} cy={24} r={19} fill="none" stroke={P.border} strokeWidth={4} />
                        <circle cx={24} cy={24} r={19} fill="none" stroke={p.overBy > 90 ? '#f87171' : '#fbbf24'} strokeWidth={4}
                          strokeDasharray={`${(p.overBy / 100) * 119.38} 119.38`} strokeLinecap="round"
                          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black" style={{ color: p.overBy > 90 ? '#f87171' : '#fbbf24' }}>
                        {p.overBy.toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold truncate" style={{ color: P.textHi }}>{p.name}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px]">
                        <span style={{ color: P.textLo }}>Budget: {(p.budget / 1000).toFixed(0)}K</span>
                        <span style={{ color: P.textLo }}>Spent: {(p.spent / 1000).toFixed(0)}K</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold" style={{ color: P.textMd }}>Progress</p>
                      <p className="text-sm font-black tabular-nums" style={{ color: P.textHi }}>{p.progress}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* ═══════════════════ TOP 10 PROJECTS TABLE ═══════════════════ */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={VP}>
          <GlassCard className="p-5">
            <SectionHeader icon={Award} title="Top 10 Projects by Budget" subtitle="Ranked by total budget allocation" />
            <div className="rounded-xl overflow-x-auto" style={{ border: `1px solid ${P.border}` }}>
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ background: P.surface }}>
                    {['#', 'Project', 'Category', 'Status', 'Budget (OMR)', 'Progress', 'Rating', 'Beneficiaries'].map(h => (
                      <th key={h} className="px-3 py-3 text-left font-semibold tracking-wider uppercase text-[9px]" style={{ color: P.textLo }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topProjects.map((p, i) => {
                    const statusColors: Record<string, string> = { active: '#38bdf8', completed: '#34d399', planning: '#C8A44E', on_hold: '#fbbf24' };
                    const sc = statusColors[p.status] || P.textLo;
                    return (
                      <tr key={i} onClick={() => navigate(`/projects/${p.rank}`)} className="transition-colors cursor-pointer" style={{ borderTop: `1px solid ${P.border}` }}
                        onMouseEnter={e => (e.currentTarget.style.background = `${P.accent}08`)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td className="px-3 py-2.5">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black"
                            style={{ background: i < 3 ? `${P.accent}15` : P.surface, color: i < 3 ? P.accent : P.textLo, border: `1px solid ${i < 3 ? P.accent + '25' : P.border}` }}>
                            {p.rank}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-medium" style={{ color: P.textHi }}>{p.name}</td>
                        <td className="px-3 py-2.5" style={{ color: P.textMd }}>{p.category}</td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold capitalize" style={{ background: `${sc}10`, color: sc }}>{p.status.replace('_', ' ')}</span>
                        </td>
                        <td className="px-3 py-2.5 tabular-nums font-bold" style={{ color: P.textHi }}>{(p.budget / 1000).toFixed(0)}K</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full max-w-[60px]" style={{ background: P.border }}>
                              <div className="h-full rounded-full" style={{ width: `${p.progress}%`, background: p.progress >= 80 ? '#34d399' : p.progress >= 50 ? '#fbbf24' : '#f87171' }} />
                            </div>
                            <span className="tabular-nums" style={{ color: P.textMd }}>{p.progress}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          {p.rating > 0 ? (
                            <div className="flex items-center gap-1">
                              <Star size={10} style={{ color: '#fbbf24' }} />
                              <span className="tabular-nums font-bold" style={{ color: P.textHi }}>{p.rating.toFixed(1)}</span>
                            </div>
                          ) : <span style={{ color: P.textDim }}>—</span>}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums" style={{ color: P.textMd }}>{p.beneficiaries.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </motion.div>

        {/* ═══════════════════ COMPARISONS ═══════════════════ */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={VP}>
          <SectionHeader icon={BarChart3} title="Period Comparisons" subtitle="Performance benchmarks over time" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {comparisons.map((c, ci) => (
              <motion.div key={ci} variants={stagger(ci * 0.08)} initial="hidden" whileInView="show" viewport={VP}>
                <GlassCard className="p-5">
                  <p className="text-xs font-bold mb-4" style={{ color: P.accent }}>{c.label}</p>
                  <div className="space-y-3">
                    {[
                      { label: 'Projects', value: c.projectsDelta },
                      { label: 'Budget', value: c.budgetDelta },
                      { label: 'Beneficiaries', value: c.benefDelta },
                      { label: 'Completion', value: c.completionDelta },
                    ].map(m => {
                      const pos = m.value > 0;
                      return (
                        <div key={m.label} className="flex items-center justify-between">
                          <span className="text-[11px]" style={{ color: P.textMd }}>{m.label}</span>
                          <div className="flex items-center gap-1">
                            {pos ? <ArrowUpRight size={11} style={{ color: '#34d399' }} /> : <ArrowDownRight size={11} style={{ color: '#f87171' }} />}
                            <span className="text-xs font-black tabular-nums" style={{ color: pos ? '#34d399' : '#f87171' }}>
                              {pos ? '+' : ''}{m.value}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ═══════════════════ PRINT & SCHEDULE ═══════════════════ */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={VP} className="flex items-center justify-center gap-4 py-4">
          <Button
            size="md"
            leftIcon={<Printer size={16} />}
            onClick={handlePrint}
          >
            Print Report
          </Button>
          <Button
            variant="outline"
            scheme="neutral"
            size="md"
            leftIcon={<Bell size={16} />}
          >
            Schedule Periodic Report
          </Button>
        </motion.div>

      </div>
    </div>
  );
}
