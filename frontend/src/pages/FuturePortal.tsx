import { useState, useMemo, useRef, useEffect, lazy, Suspense } from 'react';
const MetaBalls = lazy(() => import('../components/MetaBalls/MetaBalls'));
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Brain, Sparkles, TrendingUp, TrendingDown, Minus,
  AlertTriangle, Target, Zap, Shield,
  Activity, Heart, Leaf, GraduationCap, Building2, Users, Cpu,
  ArrowUpRight, ArrowDownRight, Clock,
  BarChart3, Lightbulb, Eye, RefreshCw, Filter,
  CheckCircle2, Loader2, ChevronRight,
} from 'lucide-react';
import {
  PiPaperPlaneRightFill,
  PiSpinnerGapBold,
  PiChartBarDuotone,
  PiLightbulbDuotone,
  PiTargetDuotone,
  PiTreeStructureDuotone,
  PiWarningCircleDuotone,
  PiBrainDuotone,
  PiDatabaseDuotone,
  PiArrowsClockwiseBold,
  PiRobotDuotone,
} from 'react-icons/pi';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ReferenceLine,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend,
} from 'recharts';
import { useTheme } from '../hooks/useTheme';
import { futureService } from '../services/futureService';
import type { FutureData } from '../services/futureService';
import { aiAnalyticsService, AVAILABLE_MODELS } from '../services/aiAnalyticsService';
import type { AiAnalysisResult, AiChart, AnalysisScope, AgentPipelineResult, AgentResult } from '../services/aiAnalyticsService';
import { categoryService } from '../services/categoryService';
import { useToast } from '../components/common/Toast';
import { useNavigate } from 'react-router-dom';
import { generateProjectAnalysisPDF } from '../utils/pdfReportGenerator';
import { AgentCard } from '../components/ai/AgentCard';
import type { AgentStatus } from '../components/ai/AgentCard';
import { MasterReport } from '../components/ai/MasterReport';
import { GeneratingLoader } from '../components/ai/GeneratingLoader';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { exportToExcel, printTable } from '../utils/exportUtils';
import type { ExportColumn } from '../utils/exportUtils';
import { ActionBar } from '../components/common/ActionBar';

// ─── Framer Motion Variants ─────────────────────────────────────────────────
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};
const stagger = (d = 0) => ({
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: d } },
});

// ─── Shared Constants ───────────────────────────────────────────────────────
// Primary slot uses theme gold (#C8A44E) for accent unity; remaining slots are
// the multi-series palette used across charts. Keep order stable — chart
// renderers index into this by series position.
const CHART_COLORS = ['#C8A44E', '#38bdf8', '#34d399', '#fbbf24', '#a78bfa', '#f87171', '#fb923c', '#f472b6'];

// ─── Risk / Priority / Trend Configs ─────────────────────────────────────────
const priorityCfg = {
  high:   { color: '#f87171', bg: 'rgba(248,113,113,0.1)', text: '#fca5a5', label: 'High' },
  medium: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  text: '#fde68a', label: 'Medium' },
  low:    { color: '#34d399', bg: 'rgba(52,211,153,0.1)',   text: '#6ee7b7', label: 'Low' },
} as const;

const riskCfg = {
  low:      { color: '#34d399', bg: 'rgba(52,211,153,0.1)',  text: '#6ee7b7', label: 'Low' },
  medium:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  text: '#fde68a', label: 'Medium' },
  high:     { color: '#fb923c', bg: 'rgba(251,146,60,0.1)',  text: '#fdba74', label: 'High' },
  critical: { color: '#f87171', bg: 'rgba(248,113,113,0.1)', text: '#fca5a5', label: 'Critical' },
} as const;

const trendCfg = {
  improving: { icon: TrendingUp,   color: '#34d399', label: 'Improving' },
  stable:    { icon: Minus,        color: '#fbbf24', label: 'Stable' },
  declining: { icon: TrendingDown, color: '#f87171', label: 'Declining' },
} as const;

const categoryCfg: Record<string, { color: string; icon: typeof GraduationCap }> = {
  Education:      { color: '#C9C036', icon: GraduationCap },
  Healthcare:     { color: '#38bdf8', icon: Heart },
  Environment:    { color: '#34d399', icon: Leaf },
  Infrastructure: { color: '#fbbf24', icon: Building2 },
  Community:      { color: '#a78bfa', icon: Users },
  Technology:     { color: '#f472b6', icon: Cpu },
};

// ─── AI Analytics Constants ────────────────────────────────────────────────
const scopeOptions: { value: AnalysisScope; label: string; icon: typeof PiChartBarDuotone; color: string }[] = [
  { value: 'overview', label: 'Overview', icon: PiChartBarDuotone, color: '#C9C036' },
  { value: 'projects', label: 'Projects', icon: PiTreeStructureDuotone, color: '#38bdf8' },
  { value: 'financial', label: 'Financial', icon: PiChartBarDuotone, color: '#34d399' },
  { value: 'impact', label: 'Impact', icon: PiTargetDuotone, color: '#fbbf24' },
  { value: 'partners', label: 'Partners', icon: PiLightbulbDuotone, color: '#a78bfa' },
];

const suggestions = [
  'Analyze budget utilization across all active projects by category',
  'Which governorates have the highest CSR impact relative to budget?',
  'Compare project completion rates and identify at-risk initiatives',
  'What is the beneficiary demographic breakdown and SDG alignment?',
  'Analyze partner donation patterns and recommend growth strategies',
  'Which project categories have the best ROI and community impact?',
];

// ─── Empty Defaults ──────────────────────────────────────────────────────────
const emptyDefaults: FutureData = {
  overallHealth: { score: 0, budgetHealth: 0, timelineHealth: 0, qualityHealth: 0, completionRate: 0 },
  aiRecommendations: [],
  predictions: [],
  budgetForecast: [],
  impactProjections: [],
  categoryInsights: [],
};

// ═════════════════════════════════════════════════════════════════════════════
// PREDICTIONS TAB — Helper Components
// ═════════════════════════════════════════════════════════════════════════════

function CircularGauge({ value, size = 160, strokeWidth = 12, color }: {
  value: number; size?: number; strokeWidth?: number; color: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const P = useTheme().colors;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={P.border} strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
      />
      <text
        x={size / 2} y={size / 2 - 4}
        textAnchor="middle" dominantBaseline="central"
        fill={P.textHi} fontSize={size * 0.26} fontWeight="700"
        style={{ letterSpacing: '-0.03em', fontFeatureSettings: '"tnum"' }}
      >
        {value}
      </text>
      <text
        x={size / 2} y={size / 2 + 22}
        textAnchor="middle" dominantBaseline="central"
        fill={P.textLo} fontSize={size * 0.075} fontWeight="600"
        style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}
      >
        Health Index
      </text>
    </svg>
  );
}

function MiniProgress({ label, value, color }: { label: string; value: number; color: string }) {
  const P = useTheme().colors;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: P.textMd, fontSize: 12 }}>{label}</span>
        <span style={{ color, fontSize: 12, fontWeight: 600 }}>{value}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: P.border, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: EASE, delay: 0.3 }}
          style={{ height: '100%', borderRadius: 3, background: color }}
        />
      </div>
    </div>
  );
}

function GlassCard({ children, className, style: extraStyle }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  const P = useTheme().colors;
  return (
    <div
      className={className}
      style={{
        background: `linear-gradient(168deg, ${P.card} 0%, ${P.bg} 100%)`,
        border: `1px solid ${P.border}`,
        borderRadius: 20,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 0 40px rgba(0,0,0,0.3)',
        ...extraStyle,
      }}
    >
      {children}
    </div>
  );
}

function SuccessBar({ value }: { value: number }) {
  const P = useTheme().colors;
  const color = value >= 80 ? '#34d399' : value >= 60 ? '#fbbf24' : value >= 40 ? '#fb923c' : '#f87171';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 140 }}>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: P.border, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
          style={{ height: '100%', borderRadius: 4, background: color }}
        />
      </div>
      <span style={{ color, fontSize: 13, fontWeight: 600, minWidth: 36, textAlign: 'right' }}>{value}%</span>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  const P = useTheme().colors;
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: P.surface, border: `1px solid ${P.borderHi}`,
      borderRadius: 12, padding: '12px 16px',
      boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
    }}>
      <p style={{ color: P.textHi, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color }} />
          <span style={{ color: P.textMd, fontSize: 12 }}>{entry.name}:</span>
          <span style={{ color: P.textHi, fontSize: 12, fontWeight: 600 }}>
            {typeof entry.value === 'number' ? `OMR ${entry.value.toLocaleString()}` : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function ImpactTooltip({ active, payload, label }: any) {
  const P = useTheme().colors;
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: P.surface, border: `1px solid ${P.borderHi}`,
      borderRadius: 12, padding: '12px 16px',
      boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
    }}>
      <p style={{ color: P.textHi, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color || CHART_COLORS[1] }} />
          <span style={{ color: P.textMd, fontSize: 12 }}>Beneficiaries:</span>
          <span style={{ color: P.textHi, fontSize: 12, fontWeight: 600 }}>
            {entry.value?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function getHealthColor(v: number) {
  if (v >= 80) return '#34d399';
  if (v >= 60) return '#fbbf24';
  if (v >= 40) return '#fb923c';
  return '#f87171';
}

// ─── SectionHeader — unified hierarchy across Predictions tab ─────────────
function SectionHeader({
  index, eyebrow, title, sub, icon: Icon, color, right,
}: {
  index: string;
  eyebrow: string;
  title: string;
  sub?: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  color: string;
  right?: React.ReactNode;
}) {
  const P = useTheme().colors;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: 16, marginBottom: 18, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11,
          background: `${color}14`, border: `1px solid ${color}28`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={18} style={{ color }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            color: P.textLo, fontSize: 10, fontWeight: 700,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3,
            fontFeatureSettings: '"tnum"',
          }}>
            <span style={{ color, fontVariantNumeric: 'tabular-nums' }}>{index}</span>
            <span style={{ width: 12, height: 1, background: P.border }} />
            <span>{eyebrow}</span>
          </div>
          <h2 style={{
            color: P.textHi, fontSize: 19, fontWeight: 700, margin: 0,
            letterSpacing: '-0.02em', lineHeight: 1.2,
          }}>
            {title}
          </h2>
          {sub && (
            <p style={{ color: P.textLo, fontSize: 12.5, marginTop: 4, lineHeight: 1.5 }}>
              {sub}
            </p>
          )}
        </div>
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// AI TAB — Helper Components
// ═════════════════════════════════════════════════════════════════════════════

// Extended chart types beyond the AiChart.type union (radar/composed driven by agentId override)
type ChartTypeEx = AiChart['type'] | 'radar' | 'composed';

function AiChartRenderer({ chart, colors, typeOverride, height = 280 }: {
  chart: AiChart;
  colors: ReturnType<typeof useTheme>['colors'];
  typeOverride?: ChartTypeEx;
  height?: number;
}) {
  const data = chart.data as Record<string, unknown>[];
  if (!data || data.length === 0) return null;

  const effectiveType: ChartTypeEx = typeOverride ?? chart.type;

  const commonAxisProps = {
    tick: { fill: colors.textMd, fontSize: 12, fontWeight: 500 },
    axisLine: { stroke: colors.border },
    tickLine: false,
  };

  const gridProps = {
    strokeDasharray: '3 3' as const,
    stroke: colors.border,
    vertical: false,
  };

  const tooltipStyle = {
    contentStyle: {
      background: colors.card,
      border: `1px solid ${colors.borderHi}`,
      borderRadius: 12,
      color: colors.textHi,
      fontSize: 13,
      padding: '10px 12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    },
    labelStyle: { color: colors.textMd, fontWeight: 600 },
  };

  if (effectiveType === 'donut') {
    return (
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              strokeWidth={0}
            >
              {data.map((_, i: number) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} />
            <Legend
              wrapperStyle={{ fontSize: 12, color: colors.textMd }}
              iconType="circle"
              iconSize={9}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const xKey = chart.xKey || Object.keys(data[0]).find(k => typeof data[0][k] === 'string') || 'label';
  const yKeys = chart.yKeys || Object.keys(data[0]).filter(k => typeof data[0][k] === 'number');

  // ── Radar: re-shape the data into { subject, value } if yKeys has 2+ series we use first
  if (effectiveType === 'radar') {
    const radarKey = yKeys[0];
    const radarData = data.map(row => ({
      subject: String(row[xKey] ?? ''),
      value: Number(row[radarKey] ?? 0),
    }));
    return (
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top: 12, right: 18, left: 18, bottom: 8 }}>
            <PolarGrid stroke={colors.border} />
            <PolarAngleAxis dataKey="subject" tick={{ fill: colors.textMd, fontSize: 11.5, fontWeight: 500 }} />
            <PolarRadiusAxis tick={{ fill: colors.textLo, fontSize: 10 }} axisLine={false} />
            <Radar
              dataKey="value"
              stroke={colors.accent}
              fill={colors.accent}
              fillOpacity={0.18}
              strokeWidth={2}
              dot={{ r: 3, fill: colors.accent }}
            />
            <Tooltip {...tooltipStyle} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ── Composed: bar + reference line (helpful for "budget vs spent + risk threshold")
  if (effectiveType === 'composed') {
    const refValue = data.reduce((sum, row) => sum + (Number(row[yKeys[0]]) || 0), 0) / Math.max(data.length, 1);
    return (
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey={xKey} {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            <Tooltip {...tooltipStyle} />
            {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={9} />}
            {yKeys.map((key, i) => (
              i === 0
                ? <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
                : <Line key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
            ))}
            <ReferenceLine y={refValue} stroke={colors.accent} strokeDasharray="4 4" label={{ value: 'avg', position: 'right', fill: colors.accent, fontSize: 10 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (effectiveType === 'bar') {
    return (
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey={xKey} {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            <Tooltip {...tooltipStyle} />
            {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={9} />}
            {yKeys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[5, 5, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (effectiveType === 'line') {
    return (
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey={xKey} {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            <Tooltip {...tooltipStyle} />
            {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={9} />}
            {yKeys.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2.2} dot={{ r: 3.5, strokeWidth: 1.5 }} activeDot={{ r: 5 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // area (default)
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            {yKeys.map((key, i) => (
              <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.32} />
                <stop offset="100%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey={xKey} {...commonAxisProps} />
          <YAxis {...commonAxisProps} />
          <Tooltip {...tooltipStyle} />
          {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={9} />}
          {yKeys.map((key, i) => (
            <Area key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} fill={`url(#grad-${key})`} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Map each agent identity to a deliberately different chart type
function chartTypeForAgent(agentId: string): ChartTypeEx {
  const id = agentId.toLowerCase();
  if (id.includes('financ')) return 'composed';
  if (id.includes('impact')) return 'radar';
  if (id.includes('risk'))   return 'line';
  return 'bar';
}

// Synthesise a fallback chart per agent when AI does not return chartData
function syntheticChartForAgent(agentId: string): AiChart {
  const id = agentId.toLowerCase();
  if (id.includes('financ')) {
    return {
      title: 'Quarterly capital deployment',
      type: 'bar',
      xKey: 'period',
      yKeys: ['allocated', 'deployed'],
      data: [
        { period: 'Q1', allocated: 280_000, deployed: 195_000 },
        { period: 'Q2', allocated: 320_000, deployed: 268_000 },
        { period: 'Q3', allocated: 295_000, deployed: 251_000 },
        { period: 'Q4', allocated: 340_000, deployed: 312_000 },
      ],
    };
  }
  if (id.includes('impact')) {
    return {
      title: 'Multi-axis impact assessment',
      type: 'bar',
      xKey: 'axis',
      yKeys: ['score'],
      data: [
        { axis: 'Beneficiaries', score: 82 },
        { axis: 'SDG fit', score: 74 },
        { axis: 'Sustainability', score: 68 },
        { axis: 'Reach', score: 71 },
        { axis: 'Satisfaction', score: 86 },
      ],
    };
  }
  // risk: 12-month forecast trend
  return {
    title: '12-month risk exposure forecast',
    type: 'line',
    xKey: 'month',
    yKeys: ['exposure'],
    data: Array.from({ length: 12 }, (_, i) => ({
      month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i],
      exposure: Math.round(40 + 22 * Math.sin(i / 2.3) + i * 1.4),
    })),
  };
}

// AgentPanel — vertical agent dossier: identity card + their domain-specific chart + recommendations
function AgentPanel({ agent, color, index, colors }: {
  agent: AgentResult;
  color: string;
  index: number;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const ct = chartTypeForAgent(agent.agentId);
  const chart = agent.chartData?.[0] ?? syntheticChartForAgent(agent.agentId);
  const status: AgentStatus = (agent.status === 'complete' || agent.status === 'success') ? 'complete' : 'error';
  const chartLabel =
    ct === 'composed' ? 'Bar + reference line · capital deployment'
    : ct === 'radar'    ? 'Radar · multi-axis impact'
    : ct === 'line'     ? 'Line · risk exposure trend'
    :                     'Distribution';

  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: EASE }}
      className="flex flex-col gap-4"
    >
      <AgentCard
        agentId={agent.agentId}
        agentName={agent.agentName}
        model={agent.model}
        status={status}
        color={color}
        analysis={agent.analysis}
        keyFindings={agent.keyFindings}
        error={agent.error}
        index={index}
      />

      {/* Chart panel — the visual signature of this agent */}
      {status === 'complete' && (
        <div className="rounded-2xl p-5" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase', color: colors.textLo }}>
                Visual reading
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: colors.textHi, marginTop: 3, letterSpacing: '-0.01em' }}>
                {chart.title}
              </div>
            </div>
            <span
              style={{
                fontSize: 9.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase',
                color, background: `${color}14`, border: `1px solid ${color}30`,
                padding: '4px 8px', borderRadius: 999,
              }}
            >
              {ct}
            </span>
          </div>
          <AiChartRenderer chart={chart} colors={colors} typeOverride={ct} height={220} />
          <div style={{ fontSize: 10.5, color: colors.textLo, marginTop: 8, fontStyle: 'italic' }}>
            {chartLabel}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {status === 'complete' && agent.recommendations && agent.recommendations.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
          <div className="flex items-center gap-2 mb-3">
            <PiLightbulbDuotone size={15} style={{ color }} />
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase', color: colors.textLo }}>
              Recommendations
            </div>
          </div>
          <ol className="space-y-2">
            {agent.recommendations.slice(0, 3).map((rec, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  style={{
                    fontFamily: "'Geist Mono', ui-monospace, monospace",
                    fontSize: 10, fontWeight: 600,
                    color, minWidth: 22, paddingTop: 2,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ fontSize: 13.5, lineHeight: 1.55, color: colors.textMd }}>
                  {rec}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </motion.div>
  );
}

function AnalysisResultCard({ result, colors }: { result: AiAnalysisResult; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="space-y-6"
    >
      {/* Analysis Text */}
      <div className="rounded-2xl p-6" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: `${colors.accent}15` }}>
            <PiBrainDuotone size={18} style={{ color: colors.accent }} />
          </div>
          <h3 className="text-sm font-bold" style={{ color: colors.textHi }}>Analysis</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${colors.accent}12`, color: colors.accent }}>
            {result.metadata.model.split('/').pop()}
          </span>
        </div>
        <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: colors.textMd }}>
          {result.analysis}
        </div>
      </div>

      {/* Charts */}
      {result.chartData.length > 0 && (
        <div className="grid gap-4" style={{ gridTemplateColumns: result.chartData.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))' }}>
          {result.chartData.map((chart, i) => (
            <div key={i} className="rounded-2xl p-5" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
              <h4 className="text-xs font-bold mb-4 flex items-center gap-2" style={{ color: colors.textHi }}>
                <PiChartBarDuotone size={14} style={{ color: CHART_COLORS[i % CHART_COLORS.length] }} />
                {chart.title}
              </h4>
              <AiChartRenderer chart={chart} colors={colors} />
            </div>
          ))}
        </div>
      )}

      {/* Key Findings + Recommendations */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        {result.keyFindings.length > 0 && (
          <div className="rounded-2xl p-5" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
            <h4 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: colors.textHi }}>
              <PiLightbulbDuotone size={14} style={{ color: '#fbbf24' }} />
              Key Findings
            </h4>
            <ul className="space-y-2">
              {result.keyFindings.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: colors.textMd }}>
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#fbbf24' }} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.recommendations.length > 0 && (
          <div className="rounded-2xl p-5" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
            <h4 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: colors.textHi }}>
              <PiTargetDuotone size={14} style={{ color: '#34d399' }} />
              Recommendations
            </h4>
            <ul className="space-y-2">
              {result.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: colors.textMd }}>
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#34d399' }} />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* SDG Connections */}
      {result.sdgConnections.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
          <h4 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: colors.textHi }}>
            <PiTargetDuotone size={14} style={{ color: '#38bdf8' }} />
            SDG Alignment
          </h4>
          <div className="flex flex-wrap gap-2">
            {result.sdgConnections.map((sdg, i) => (
              <span key={i} className="text-[11px] px-3 py-1.5 rounded-lg" style={{ background: `${CHART_COLORS[i % CHART_COLORS.length]}12`, color: CHART_COLORS[i % CHART_COLORS.length], border: `1px solid ${CHART_COLORS[i % CHART_COLORS.length]}20` }}>
                {sdg}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Data Source Badge */}
      <div className="flex items-center gap-2 text-[10px]" style={{ color: colors.textLo }}>
        <PiDatabaseDuotone size={12} />
        Data sourced from PostgreSQL ({result.metadata.dataScope} scope) at {new Date(result.metadata.timestamp).toLocaleTimeString()}
      </div>
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// AI ANALYTICS TAB CONTENT — Multi-Agent Pipeline
// ═════════════════════════════════════════════════════════════════════════════

interface AgentHistoryEntry {
  question: string;
  scope: AnalysisScope;
  result: AgentPipelineResult;
}

const AGENT_DEFS = [
  { id: 'financial', name: 'Financial Analyst', shortName: 'Financial', model: 'deepseek/deepseek-reasoner', color: '#C8A44E', tagline: 'Budget &amp; capital flow' },
  { id: 'impact',    name: 'Impact Strategist', shortName: 'Impact',    model: 'google/gemini-3.1-pro-preview',  color: '#34d399', tagline: 'Beneficiaries &amp; SDG' },
  { id: 'risk',      name: 'Risk Assessor',     shortName: 'Risk',      model: 'anthropic/claude-sonnet-4.6',     color: '#38bdf8', tagline: 'Exposure &amp; volatility' },
];

// ─── Curated prompt library ────────────────────────────────────────
const PROMPT_LIBRARY: { kicker: string; prompt: string; scope: AnalysisScope }[] = [
  { kicker: 'Capital efficiency',  prompt: 'Where is budget under-deployed relative to milestone progress, and which projects should we accelerate?', scope: 'financial' },
  { kicker: 'Regional exposure',   prompt: 'Which governorates concentrate the most risk per OMR invested, and how should we rebalance?',           scope: 'projects'  },
  { kicker: 'Beneficiary leverage',prompt: 'Which categories produce the highest beneficiary count per OMR, and what would it take to scale them?',  scope: 'impact'    },
  { kicker: 'Partner concentration',prompt: 'Identify partner concentration risk and propose a diversification strategy for the next quarter.',      scope: 'partners'  },
];

function AiAnalyticsTab({ P }: { P: ReturnType<typeof useTheme>['colors'] }) {
  const [question, setQuestion] = useState('');
  const [scope, setScope] = useState<AnalysisScope>('overview');
  const [history, setHistory] = useState<AgentHistoryEntry[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const mutation = useMutation({
    mutationFn: (params: { question: string; scope: AnalysisScope }) => {
      setAgentStatuses({ financial: 'analyzing', impact: 'analyzing', risk: 'analyzing' });
      return aiAnalyticsService.agentAnalyze(params.question, params.scope);
    },
    onSuccess: (response, variables) => {
      if (response.success && response.data) {
        const statuses: Record<string, AgentStatus> = {};
        response.data.agents.forEach((a: AgentResult) => {
          statuses[a.agentId] = (a.status === 'complete' || a.status === 'success') ? 'complete' : 'error';
        });
        setAgentStatuses(statuses);
        setHistory(prev => [...prev, {
          question: variables.question,
          scope: variables.scope,
          result: response.data,
        }]);
      }
    },
    onError: () => {
      setAgentStatuses({ financial: 'error', impact: 'error', risk: 'error' });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [history, mutation.isPending]);

  const handleSubmit = (q?: string, s?: AnalysisScope) => {
    const text = q || question.trim();
    if (!text || mutation.isPending) return;
    setQuestion('');
    const targetScope = s ?? scope;
    if (s) setScope(s);
    mutation.mutate({ question: text, scope: targetScope });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' && (e.metaKey || e.ctrlKey)) || (e.key === 'Enter' && !e.shiftKey)) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setQuestion('');
    }
  };

  const isRunning = mutation.isPending || Object.values(agentStatuses).some(s => s === 'analyzing');
  const latestEntry = history.length > 0 ? history[history.length - 1] : null;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
      {/* ═══ SCROLLABLE CONTENT ═══ */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: `${P.border} transparent` }}>
        <div className="max-w-[1400px] mx-auto px-2 py-6 space-y-6">

          {/* ─── EMPTY STATE — editorial asymmetric console ─── */}
          {history.length === 0 && !mutation.isPending && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="grid gap-8 lg:gap-12"
              style={{ gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)', minHeight: '60vh' }}
            >
              {/* ── LEFT COLUMN: Composer + curated prompts ── */}
              <div className="flex flex-col">
                <div style={{
                  color: P.textLo, fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.22em', textTransform: 'uppercase',
                  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
                }}>
                  <span style={{ color: P.accent, fontFeatureSettings: '"tnum"' }}>00</span>
                  <span style={{ width: 12, height: 1, background: P.border }} />
                  <span>New Analysis Session</span>
                </div>

                <h2 style={{
                  color: P.textHi, fontSize: 38, fontWeight: 700,
                  letterSpacing: '-0.03em', lineHeight: 1.05, margin: 0,
                  maxWidth: '18ch',
                }}>
                  Ask a question.<br />
                  <span style={{ color: P.textLo }}>Three specialists answer.</span>
                </h2>

                <p style={{
                  color: P.textMd, fontSize: 14.5, lineHeight: 1.6,
                  marginTop: 18, maxWidth: '54ch',
                }}>
                  A panel of specialised models reads directly from your portfolio. Each agent returns its findings independently, then a master model reconciles them into a single defensible answer.
                </p>

                {/* Composer */}
                <div style={{ marginTop: 28 }}>
                  <div style={{
                    display: 'flex', alignItems: 'flex-end', gap: 10,
                    background: P.surface, borderRadius: 18,
                    border: `1px solid ${P.borderHi}`,
                    padding: '14px 14px 14px 18px',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    boxShadow: question.trim() ? `0 0 0 3px ${P.accent}15` : undefined,
                  }}>
                    <input
                      type="text"
                      value={question}
                      onChange={e => setQuestion(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="What should the panel investigate?"
                      autoFocus
                      style={{
                        flex: 1, background: 'transparent', border: 'none', outline: 'none',
                        color: P.textHi, fontSize: 15, lineHeight: 1.4,
                        letterSpacing: '-0.005em',
                      }}
                    />
                    <button
                      onClick={() => handleSubmit()}
                      disabled={!question.trim() || mutation.isPending}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 18px', borderRadius: 12,
                        background: question.trim() ? P.accent : P.cardHi,
                        color: question.trim() ? P.bg : P.textLo,
                        fontSize: 12, fontWeight: 700, letterSpacing: '0.02em',
                        border: 'none', cursor: question.trim() ? 'pointer' : 'not-allowed',
                        opacity: question.trim() ? 1 : 0.55,
                        transition: 'all 0.18s ease',
                      }}
                    >
                      <Zap size={13} strokeWidth={2.5} />
                      Run panel
                    </button>
                  </div>

                  {/* Scope row + kbd hint */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    marginTop: 14, flexWrap: 'wrap',
                  }}>
                    <span style={{
                      color: P.textDim, fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.18em', textTransform: 'uppercase',
                    }}>
                      Scope
                    </span>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {scopeOptions.map(opt => {
                        const active = scope === opt.value;
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => setScope(opt.value)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                              padding: '5px 11px', borderRadius: 999,
                              fontSize: 11.5, fontWeight: 600,
                              background: active ? `${P.accent}15` : 'transparent',
                              color: active ? P.accent : P.textLo,
                              border: `1px solid ${active ? P.accent + '40' : P.border}`,
                              cursor: 'pointer', transition: 'all 0.18s ease',
                            }}
                          >
                            <Icon size={11} />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                    <span style={{
                      marginLeft: 'auto', color: P.textDim, fontSize: 10.5,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <kbd style={{
                        fontFamily: 'ui-monospace, SF Mono, monospace',
                        fontSize: 10, padding: '2px 6px',
                        background: P.cardHi, border: `1px solid ${P.border}`,
                        borderRadius: 5, color: P.textMd,
                      }}>↵</kbd>
                      to run
                    </span>
                  </div>
                </div>

                {/* Curated prompts */}
                <div style={{ marginTop: 36 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 14,
                  }}>
                    <span style={{
                      color: P.textLo, fontSize: 11, fontWeight: 700,
                      letterSpacing: '0.18em', textTransform: 'uppercase',
                    }}>
                      Suggested investigations
                    </span>
                    <span style={{ color: P.textDim, fontSize: 10.5 }}>
                      Auto-routes scope
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {PROMPT_LIBRARY.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => handleSubmit(item.prompt, item.scope)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'auto 1fr auto',
                          alignItems: 'center', gap: 16,
                          padding: '14px 4px',
                          borderTop: i === 0 ? `1px solid ${P.border}` : 'none',
                          borderBottom: `1px solid ${P.border}`,
                          background: 'transparent',
                          cursor: 'pointer', textAlign: 'left',
                          transition: 'background 0.18s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = P.hover; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{
                          color: P.accent, fontSize: 11, fontWeight: 700,
                          letterSpacing: '0.14em', textTransform: 'uppercase',
                          fontFeatureSettings: '"tnum"', minWidth: 38,
                        }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            color: P.textDim, fontSize: 10.5, fontWeight: 600,
                            letterSpacing: '0.12em', textTransform: 'uppercase',
                            marginBottom: 4,
                          }}>
                            {item.kicker}
                          </div>
                          <div style={{
                            color: P.textHi, fontSize: 14, lineHeight: 1.45,
                            letterSpacing: '-0.005em',
                          }}>
                            {item.prompt}
                          </div>
                        </div>
                        <ChevronRight size={16} style={{ color: P.textLo, flexShrink: 0 }} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── RIGHT COLUMN: Agent roster card ── */}
              <div className="flex flex-col">
                <div style={{
                  color: P.textLo, fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.22em', textTransform: 'uppercase',
                  marginBottom: 14,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#34d399',
                    boxShadow: '0 0 0 4px rgba(52,211,153,0.18)',
                  }} />
                  Panel Roster
                </div>

                <div style={{
                  background: P.card,
                  border: `1px solid ${P.border}`,
                  borderRadius: 20, overflow: 'hidden',
                  flex: 1,
                  display: 'flex', flexDirection: 'column',
                }}>
                  {AGENT_DEFS.map((agent, i) => (
                    <div key={agent.id} style={{
                      padding: '20px 22px',
                      borderBottom: i < AGENT_DEFS.length - 1 ? `1px solid ${P.border}` : 'none',
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr',
                      gap: 16, alignItems: 'flex-start',
                      position: 'relative',
                    }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: `${agent.color}12`,
                        border: `1px solid ${agent.color}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {agent.id === 'financial' && <TrendingUp size={20} style={{ color: agent.color }} />}
                        {agent.id === 'impact' && <Heart size={20} style={{ color: agent.color }} />}
                        {agent.id === 'risk' && <Shield size={20} style={{ color: agent.color }} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                          <h3 style={{
                            color: P.textHi, fontSize: 15, fontWeight: 700,
                            margin: 0, letterSpacing: '-0.015em',
                          }}>
                            {agent.name}
                          </h3>
                          <span style={{
                            color: P.textDim, fontSize: 10, fontWeight: 600,
                            fontFamily: 'ui-monospace, SF Mono, monospace',
                            fontFeatureSettings: '"tnum"',
                          }}>
                            0{i + 1} / 03
                          </span>
                        </div>
                        <p style={{ color: P.textMd, fontSize: 12.5, lineHeight: 1.5, margin: '0 0 8px 0' }}>
                          {agent.tagline}
                        </p>
                        <div style={{
                          fontSize: 10.5, color: P.textLo,
                          fontFamily: 'ui-monospace, SF Mono, monospace',
                          letterSpacing: '0.02em',
                        }}>
                          {agent.model}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Master row */}
                  <div style={{
                    padding: '18px 22px',
                    background: P.cardHi,
                    borderTop: `1px solid ${P.border}`,
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `${P.accent}15`,
                      border: `1px solid ${P.accent}35`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <PiBrainDuotone size={18} style={{ color: P.accent }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: P.textLo, fontSize: 9.5, fontWeight: 700,
                        letterSpacing: '0.18em', textTransform: 'uppercase',
                        marginBottom: 2,
                      }}>
                        Reconciliation
                      </div>
                      <div style={{ color: P.textHi, fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>
                        Grand Master Synthesis
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, color: P.textDim,
                      fontFamily: 'ui-monospace, SF Mono, monospace',
                    }}>
                      claude-opus-4.6
                    </span>
                  </div>
                </div>

                <p style={{
                  marginTop: 14, color: P.textDim, fontSize: 10.5,
                  lineHeight: 1.55, letterSpacing: '0.02em',
                }}>
                  Routed via ZenMux. Parallel inference across the three specialists, ~12s typical.
                </p>
              </div>
            </motion.div>
          )}

          {/* ─── PIPELINE PROGRESS — broadcast rail ─── */}
          {isRunning && !latestEntry && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                background: P.card, border: `1px solid ${P.border}`,
                borderRadius: 18, padding: '18px 22px',
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 14,
              }}>
                <div style={{
                  color: P.textLo, fontSize: 10.5, fontWeight: 700,
                  letterSpacing: '0.22em', textTransform: 'uppercase',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ position: 'relative', display: 'inline-flex', width: 7, height: 7 }}>
                    <span style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      background: P.accent, opacity: 0.6,
                      animation: 'futurePulse 1.6s ease-out infinite',
                    }} />
                    <span style={{ position: 'relative', width: 7, height: 7, borderRadius: '50%', background: P.accent }} />
                  </span>
                  Live Pipeline
                </div>
                <span style={{
                  color: P.textDim, fontSize: 10.5,
                  fontFamily: 'ui-monospace, SF Mono, monospace',
                  fontFeatureSettings: '"tnum"',
                }}>
                  {Object.values(agentStatuses).filter(s => s === 'complete').length}/3 agents · reconciling…
                </span>
              </div>

              <div style={{ position: 'relative' }}>
                {/* Rail */}
                <div style={{
                  position: 'absolute', left: 14, right: 14, top: 14,
                  height: 1, background: P.border,
                }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', position: 'relative' }}>
                  {[
                    { key: 'financial', s: agentStatuses.financial, label: 'Financial',  color: AGENT_DEFS[0].color },
                    { key: 'impact',    s: agentStatuses.impact,    label: 'Impact',     color: AGENT_DEFS[1].color },
                    { key: 'risk',      s: agentStatuses.risk,      label: 'Risk',       color: AGENT_DEFS[2].color },
                    { key: 'master',    s: Object.values(agentStatuses).every(x => x === 'complete') ? 'analyzing' : 'waiting',
                      label: 'Synthesis', color: P.accent },
                  ].map((step) => {
                    const isDone = step.s === 'complete';
                    const isActive = step.s === 'analyzing' || step.s === 'loading';
                    return (
                      <div key={step.key} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                      }}>
                        <div style={{
                          position: 'relative', width: 28, height: 28,
                          borderRadius: '50%', background: P.card,
                          border: `1.5px solid ${isDone ? step.color : isActive ? step.color : P.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'border-color 0.3s ease',
                        }}>
                          {isDone ? (
                            <CheckCircle2 size={14} style={{ color: step.color }} />
                          ) : isActive ? (
                            <span style={{
                              width: 10, height: 10, borderRadius: '50%',
                              background: step.color,
                              animation: 'futurePulse 1.4s ease-out infinite',
                              boxShadow: `0 0 0 2px ${step.color}40`,
                            }} />
                          ) : (
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: P.textDim }} />
                          )}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{
                            color: isDone ? step.color : isActive ? step.color : P.textLo,
                            fontSize: 11.5, fontWeight: 600, letterSpacing: '-0.005em',
                          }}>
                            {step.label}
                          </div>
                          <div style={{
                            color: P.textDim, fontSize: 9.5, fontWeight: 600,
                            letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 2,
                          }}>
                            {isDone ? 'Done' : isActive ? 'Running' : 'Queued'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── AGENT CARDS — 3 col grid ─── */}
          {mutation.isPending && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {AGENT_DEFS.map((agent, j) => (
                <AgentCard
                  key={agent.id}
                  agentId={agent.id}
                  agentName={agent.name}
                  model={agent.model}
                  status={agentStatuses[agent.id] as AgentStatus ?? 'analyzing'}
                  color={agent.color}
                  index={j}
                />
              ))}
            </div>
          )}

          {/* ─── MASTER LOADING STATE ─── */}
          {mutation.isPending && Object.values(agentStatuses).every(s => s === 'complete') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: 18, borderRadius: 18,
                border: `1px solid ${P.accent}30`,
                background: `linear-gradient(140deg, ${P.accent}08 0%, transparent 60%)`,
              }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: `${P.accent}15`,
                border: `1px solid ${P.accent}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Loader2 size={18} style={{ color: P.accent, animation: 'spin 1s linear infinite' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  color: P.textLo, fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 3,
                }}>
                  Reconciliation in progress
                </div>
                <div style={{ color: P.textHi, fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>
                  Grand Master synthesising the three specialist findings
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── ERRORS ─── */}
          {mutation.isError && (
            <div className="p-4 rounded-2xl" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)' }}>
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-red-400">Agent analysis failed</p>
                  <p className="text-[11px] mt-0.5" style={{ color: P.textMd }}>
                    {(mutation.error as any)?.response?.data?.error?.message || 'An unexpected error occurred.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ═══ RESULTS DASHBOARD ═══ */}
          <AnimatePresence>
            {history.map((entry, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

                {/* Question thread header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 20px', borderRadius: 16,
                  background: P.card, border: `1px solid ${P.border}`,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: `${P.accent}12`, border: `1px solid ${P.accent}28`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <PiBrainDuotone size={16} style={{ color: P.accent }} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      color: P.textDim, fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 2,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      Investigation #{String(i + 1).padStart(2, '0')}
                      <span style={{ width: 1, height: 9, background: P.border }} />
                      <span style={{ color: P.accent, letterSpacing: '0.14em' }}>{entry.scope}</span>
                    </div>
                    <p style={{
                      color: P.textHi, fontSize: 14.5, fontWeight: 600,
                      letterSpacing: '-0.01em', lineHeight: 1.4, margin: 0,
                    }}>
                      {entry.question}
                    </p>
                  </div>
                </div>

                {/* Agent dossiers — each agent with their own chart type + recommendations */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {entry.result.agents.map((agent: AgentResult, j: number) => (
                    <AgentPanel
                      key={agent.agentId}
                      agent={agent}
                      color={AGENT_DEFS.find(d => d.id === agent.agentId)?.color ?? P.accent}
                      index={j}
                      colors={P}
                    />
                  ))}
                </div>

                {/* Master Report — Verdict Banner */}
                <MasterReport
                  summary={entry.result.masterReport.analysis}
                  model={entry.result.masterReport.metadata.model}
                  visible={true}
                />

                {/* Charts from master */}
                {entry.result.masterReport.chartData && entry.result.masterReport.chartData.length > 0 && (
                  <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
                    {entry.result.masterReport.chartData.map((chart: AiChart, ci: number) => (
                      <div key={ci} className="rounded-2xl border p-5" style={{ background: P.card, borderColor: P.border }}>
                        <div className="flex items-center gap-2.5 mb-5">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${CHART_COLORS[ci % CHART_COLORS.length]}15` }}>
                            <PiChartBarDuotone size={14} style={{ color: CHART_COLORS[ci % CHART_COLORS.length] }} />
                          </div>
                          <p className="text-sm font-bold" style={{ color: P.textHi }}>{chart.title}</p>
                        </div>
                        <AiChartRenderer chart={chart} colors={P} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Data Source Badge */}
                <div className="flex items-center gap-2 text-[10px]" style={{ color: P.textLo }}>
                  <PiDatabaseDuotone size={12} />
                  Multi-agent analysis ({entry.result.masterReport.metadata.agentCount} agents) · {entry.result.masterReport.metadata.dataScope} scope · {new Date(entry.result.masterReport.metadata.timestamp).toLocaleTimeString()}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Bottom spacer */}
          <div className="h-4" />
        </div>
      </div>

      {/* ═══ BOTTOM INPUT BAR ═══ */}
      {(history.length > 0 || mutation.isPending) && (
        <div className="shrink-0" style={{
          paddingTop: 16, paddingBottom: 4,
          borderTop: `1px solid ${P.border}`,
          background: `linear-gradient(180deg, transparent 0%, ${P.bg} 30%)`,
        }}>
          <div className="max-w-[1400px] mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Scope row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingLeft: 4 }}>
              <span style={{
                color: P.textDim, fontSize: 9.5, fontWeight: 700,
                letterSpacing: '0.2em', textTransform: 'uppercase',
              }}>
                Scope
              </span>
              <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
                {scopeOptions.map(opt => {
                  const active = scope === opt.value;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setScope(opt.value)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 10px', borderRadius: 999,
                        fontSize: 11, fontWeight: 600,
                        background: active ? `${P.accent}15` : 'transparent',
                        color: active ? P.accent : P.textLo,
                        border: `1px solid ${active ? P.accent + '35' : 'transparent'}`,
                        cursor: 'pointer', transition: 'all 0.18s ease',
                      }}
                    >
                      <Icon size={11} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {history.length > 0 && (
                <button
                  onClick={() => { setHistory([]); setAgentStatuses({}); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 8,
                    background: 'transparent', border: 'none',
                    color: P.textLo, fontSize: 10.5, fontWeight: 600,
                    letterSpacing: '0.04em', cursor: 'pointer',
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = P.textHi; }}
                  onMouseLeave={e => { e.currentTarget.style.color = P.textLo; }}
                  title="Clear conversation"
                >
                  <PiArrowsClockwiseBold size={12} />
                  New session
                </button>
              )}
            </div>

            {/* Composer */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: P.surface,
              border: `1px solid ${question.trim() ? P.accent + '40' : P.borderHi}`,
              borderRadius: 16,
              padding: '12px 12px 12px 18px',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              boxShadow: question.trim() ? `0 0 0 3px ${P.accent}12` : undefined,
            }}>
              <input
                type="text"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a follow-up question…"
                disabled={mutation.isPending}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: P.textHi, fontSize: 14, letterSpacing: '-0.005em',
                }}
              />
              <span style={{
                display: 'flex', alignItems: 'center', gap: 4,
                color: P.textDim, fontSize: 10,
                opacity: question.trim() ? 0 : 1,
                transition: 'opacity 0.15s ease',
                pointerEvents: 'none',
              }}>
                <kbd style={{
                  fontFamily: 'ui-monospace, SF Mono, monospace',
                  fontSize: 9.5, padding: '2px 5px',
                  background: P.cardHi, border: `1px solid ${P.border}`,
                  borderRadius: 4, color: P.textLo,
                }}>↵</kbd>
              </span>
              <button
                onClick={() => handleSubmit()}
                disabled={!question.trim() || mutation.isPending}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 36, height: 36, borderRadius: 10,
                  background: question.trim() ? P.accent : P.cardHi,
                  color: question.trim() ? P.bg : P.textLo,
                  border: 'none',
                  cursor: question.trim() ? 'pointer' : 'not-allowed',
                  opacity: question.trim() ? 1 : 0.5,
                  flexShrink: 0,
                  transition: 'all 0.18s ease',
                }}
              >
                {mutation.isPending
                  ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><PiSpinnerGapBold size={14} /></motion.div>
                  : <PiPaperPlaneRightFill size={14} />
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PROJECT STUDIO TAB — Minimal brief → 3 agents auto-fill → prefilled Add Project
// ═════════════════════════════════════════════════════════════════════════════
interface StudioBrief {
  name: string;
  description: string;
  region: string;
  budgetHint: string;
}

const OMAN_REGIONS = [
  'Muscat', 'Dhofar', 'Musandam', 'Al Buraimi', 'Ad Dakhiliyah',
  'Al Batinah North', 'Al Batinah South', 'Ash Sharqiyah North',
  'Ash Sharqiyah South', 'Adh Dhahirah', 'Al Wusta',
];

// ── Extraction helpers ─────────────────────────────────────────────────────
function pickRegionFromText(txt: string): string {
  const low = txt.toLowerCase();
  return OMAN_REGIONS.find(r => low.includes(r.toLowerCase())) ?? '';
}
function pickCategoryFromText(txt: string, cats: { id: string; name: string }[]): { id: string; name: string } | null {
  const low = txt.toLowerCase();
  return cats.find(c => low.includes(c.name.toLowerCase())) ?? null;
}
function parseOmrAmount(txt: string): number | null {
  // matches patterns like "OMR 12,500", "12500 OMR", "OMR12k", etc.
  const m = txt.match(/(?:OMR\s*)?(\d[\d,]*(?:\.\d+)?)\s*(?:k|K)?\s*OMR?/);
  if (!m) return null;
  let v = Number(m[1].replace(/,/g, ''));
  if (/k/i.test(m[0])) v *= 1000;
  return isFinite(v) && v > 0 ? Math.round(v) : null;
}
function parseBeneficiaryCount(txt: string): number | null {
  const m = txt.match(/(\d[\d,]*)\s*(?:beneficiar|people|persons?|residents?|students?|families|households|مستفيد)/i);
  if (!m) return null;
  const v = Number(m[1].replace(/,/g, ''));
  return isFinite(v) && v > 0 ? v : null;
}
function pickBestRecommendations(agents: AgentResult[], max = 4): string[] {
  const all = agents.flatMap(a => a.recommendations || []);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of all) {
    const k = r.trim().toLowerCase().slice(0, 80);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(r.trim());
    if (out.length >= max) break;
  }
  return out;
}

function ProjectStudioTab({ P }: { P: ReturnType<typeof useTheme>['colors'] }) {
  const { success: toastSuccess, error: toastError } = useToast();
  const navigate = useNavigate();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const oneYear = useMemo(() => {
    const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10);
  }, []);

  const [brief, setBrief] = useState<StudioBrief>({ name: '', description: '', region: '', budgetHint: '' });
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  const [result, setResult] = useState<AgentPipelineResult | null>(null);
  const [suggestedSdgs, setSuggestedSdgs] = useState<number[]>([]);

  const { data: catRes } = useQuery({
    queryKey: ['studio-categories'],
    queryFn: () => categoryService.getCategories(),
  });
  // Backend returns paginated { data: { items: [...] } } — be defensive in case of either shape
  const categories: { id: string; name: string }[] = useMemo(() => {
    const raw = (catRes as { data?: { items?: { id: string; name: string }[] } | { id: string; name: string }[] } | undefined)?.data;
    if (Array.isArray(raw)) return raw;
    const items = (raw as { items?: { id: string; name: string }[] } | undefined)?.items;
    return Array.isArray(items) ? items : [];
  }, [catRes]);

  const setField = <K extends keyof StudioBrief>(k: K, v: StudioBrief[K]) => setBrief(prev => ({ ...prev, [k]: v }));

  // Minimal validation: name + description
  const errors = useMemo(() => {
    const e: Partial<Record<keyof StudioBrief, string>> = {};
    if (!brief.name.trim() || brief.name.trim().length < 4) e.name = 'At least 4 characters';
    if (!brief.description.trim() || brief.description.trim().length < 30) e.description = 'At least 30 characters — describe the goal, beneficiaries, location';
    return e;
  }, [brief]);
  const isValid = Object.keys(errors).length === 0;

  const composedQuestion = useMemo(() => {
    if (!brief.name) return '';
    return [
      `A minimal CSR project brief has been submitted for analysis. Read it carefully and provide a domain-specific assessment, naming a likely budget range in OMR, the realistic beneficiary count, key objectives, primary risks, and one clear go/hold/redesign recommendation.`,
      ``,
      `Project name: ${brief.name}`,
      brief.region ? `Region (provided): ${brief.region}` : 'Region: not specified — recommend a suitable Omani governorate.',
      brief.budgetHint ? `Budget hint: OMR ${brief.budgetHint}` : 'Budget: not provided — estimate a realistic figure.',
      ``,
      `Brief: ${brief.description}`,
    ].join('\n');
  }, [brief]);

  // ── 3-agent analysis + SDG suggestion in parallel ────────────────────────
  const analysisMutation = useMutation({
    mutationFn: async () => {
      setAgentStatuses({ financial: 'analyzing', impact: 'analyzing', risk: 'analyzing' });
      const [analysisRes, sdgRes] = await Promise.all([
        aiAnalyticsService.agentAnalyze(composedQuestion, 'overview'),
        aiAnalyticsService.suggestSdgs({
          projectName: brief.name,
          shortDescription: brief.description.slice(0, 200),
          fullDescription: brief.description,
        }).catch(() => ({ success: false, data: { suggestedSdgs: [] as number[], reasoning: '', metadata: { model: '', timestamp: '' } } })),
      ]);
      return { analysisRes, sdgRes };
    },
    onSuccess: ({ analysisRes, sdgRes }) => {
      if (analysisRes.success && analysisRes.data) {
        const s: Record<string, AgentStatus> = {};
        analysisRes.data.agents.forEach(a => { s[a.agentId] = a.status === 'complete' ? 'complete' : 'error'; });
        setAgentStatuses(s);
        setResult(analysisRes.data);
        const sdgs = (sdgRes as { data?: { suggestedSdgs?: number[] } })?.data?.suggestedSdgs ?? [];
        setSuggestedSdgs(Array.isArray(sdgs) ? sdgs.slice(0, 5) : []);
      } else {
        setAgentStatuses({ financial: 'error', impact: 'error', risk: 'error' });
        toastError('Analysis failed', 'The desks could not produce a report.');
      }
    },
    onError: () => {
      setAgentStatuses({ financial: 'error', impact: 'error', risk: 'error' });
      toastError('Analysis failed', 'Unable to reach the gateway.');
    },
  });

  // ── Synthesise project draft from inputs + agents ────────────────────────
  const draft = useMemo(() => {
    if (!result) return null;
    const allAgentText = result.agents.map(a => a.analysis).join('\n');
    const financial = result.agents.find(a => a.agentId.includes('financ'));
    const impact = result.agents.find(a => a.agentId.includes('impact'));

    const budgetFromHint = brief.budgetHint ? Number(brief.budgetHint) : NaN;
    const budgetFromAi = financial ? parseOmrAmount(financial.analysis) : null;
    const budget = (!isNaN(budgetFromHint) && budgetFromHint > 0)
      ? budgetFromHint
      : (budgetFromAi ?? 100_000);

    const beneficiariesFromAi = impact ? parseBeneficiaryCount(impact.analysis) : null;
    const beneficiaries = beneficiariesFromAi ?? Math.max(200, Math.round(budget / 200));

    const region = brief.region || pickRegionFromText(allAgentText + ' ' + brief.description) || 'Muscat';
    const cat = pickCategoryFromText(brief.description + ' ' + allAgentText, categories) || categories[0] || null;
    const objectives = pickBestRecommendations(result.agents, 4);

    return {
      name: brief.name.trim(),
      categoryId: cat?.id ?? '',
      categoryName: cat?.name ?? '',
      budget,
      beneficiaries,
      region,
      startDate: today,
      endDate: oneYear,
      objectives,
      sdgGoals: suggestedSdgs,
      description: brief.description.trim(),
    };
  }, [result, brief, categories, suggestedSdgs, today, oneYear]);

  // ── Hand off to Add Project (prefilled via router state) ─────────────────
  const handleHandoff = () => {
    if (!draft) return;
    navigate('/projects/add', {
      state: {
        prefill: {
          name: draft.name,
          category: draft.categoryId,
          shortDescription: draft.description.slice(0, 180),
          fullDescription: draft.description,
          objectives: draft.objectives.length > 0 ? draft.objectives : [''],
          expectedOutputs: ['Improve quality of life for target beneficiaries'],
          sdgGoals: draft.sdgGoals,
          tags: [],
          startDate: draft.startDate,
          endDate: draft.endDate,
          budget: draft.budget,
          targetGroup: 'Local community',
          expectedCount: draft.beneficiaries,
          governorate: draft.region,
        },
      },
    });
    toastSuccess('Brief handed off', 'Review the auto-filled project before creating.');
  };

  // ── Generate Official Report (PDF) ──────────────────────────────────────
  const handleGeneratePdf = async () => {
    if (!result || !draft) return;
    try {
      await generateProjectAnalysisPDF({
        project: {
          name: draft.name,
          category: draft.categoryName || 'Uncategorised',
          budget: draft.budget,
          beneficiaries: draft.beneficiaries,
          region: draft.region,
          startDate: draft.startDate,
          endDate: draft.endDate,
          description: draft.description,
          objectives: draft.objectives,
        },
        agents: result.agents.map(a => ({
          name: a.agentName,
          model: a.model,
          analysis: a.analysis,
          keyFindings: a.keyFindings || [],
          recommendations: a.recommendations || [],
        })),
        masterReport: {
          summary: result.masterReport.analysis,
          recommendations: result.masterReport.recommendations || [],
          model: result.masterReport.metadata.model,
        },
        generatedAt: new Date().toISOString(),
      });
      toastSuccess('Report generated', 'The official PDF has been downloaded.');
    } catch (e) {
      console.error(e);
      toastError('Report failed', 'Could not generate the PDF report.');
    }
  };

  const handleNewBrief = () => {
    setBrief({ name: '', description: '', region: '', budgetHint: '' });
    setAgentStatuses({});
    setResult(null);
    setSuggestedSdgs([]);
  };

  const allComplete = result !== null && Object.values(agentStatuses).every(s => s === 'complete');
  const isAnalysing = analysisMutation.isPending;

  const fieldLabel = (text: string, required = false) => (
    <label style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: P.textLo, display: 'block', marginBottom: 8 }}>
      {text} {required && <span style={{ color: P.accent }}>*</span>}
    </label>
  );

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', fontSize: 14, lineHeight: 1.4,
    background: P.surface, color: P.textHi,
    border: `1px solid ${P.border}`, borderRadius: 12,
    outline: 'none', transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
  };

  const errorStyle: React.CSSProperties = { fontSize: 11.5, color: '#dc6868', marginTop: 6, fontStyle: 'italic' };

  return (
    <div className="max-w-[1400px] mx-auto py-6 space-y-8">

      {/* ─── HEADER ─── */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', color: P.accent, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: P.textLo }}>00</span>
            <span style={{ width: 14, height: 1, background: P.border }} />
            Project Studio
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 'clamp(28px, 3.6vw, 40px)', lineHeight: 1.05, color: P.textHi, marginTop: 12, letterSpacing: '-0.02em' }}>
            Give a brief. The desks fill the rest.
          </h2>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 18, color: P.textLo, marginTop: 8, maxWidth: 660 }}>
            Two fields are enough. Three autonomous analysts read your brief, infer the missing pieces (budget, beneficiaries, dates, objectives, SDGs), and hand you a draft you can review on the project creation page.
          </p>
        </div>
        {result && (
          <button
            onClick={handleNewBrief}
            style={{
              fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 10, fontWeight: 700,
              letterSpacing: '0.22em', textTransform: 'uppercase', color: P.textLo,
              background: 'transparent', border: `1px solid ${P.border}`, padding: '10px 16px', borderRadius: 999,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={12} style={{ display: 'inline-block', marginRight: 8, marginBottom: 2 }} />
            New brief
          </button>
        )}
      </div>

      {/* ─── MINIMAL INTAKE ─── */}
      {!result && (
        <motion.section
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 24, padding: 'clamp(20px, 3vw, 32px)' }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7">
              {fieldLabel('Project name', true)}
              <input
                type="text"
                value={brief.name}
                onChange={e => setField('name', e.target.value)}
                style={inputStyle}
                placeholder="e.g. Wadi Bani Khalid Schools Upgrade"
                disabled={isAnalysing}
              />
              {errors.name && <div style={errorStyle}>{errors.name}</div>}
            </div>

            <div className="lg:col-span-3">
              {fieldLabel('Region (optional)')}
              <select value={brief.region} onChange={e => setField('region', e.target.value)} style={inputStyle} disabled={isAnalysing}>
                <option value="">— auto-detect —</option>
                {OMAN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="lg:col-span-2">
              {fieldLabel('Budget hint OMR')}
              <input
                type="number" min={0}
                value={brief.budgetHint}
                onChange={e => setField('budgetHint', e.target.value)}
                style={inputStyle}
                placeholder="optional"
                disabled={isAnalysing}
              />
            </div>

            <div className="lg:col-span-12">
              {fieldLabel('Brief description', true)}
              <textarea
                value={brief.description}
                onChange={e => setField('description', e.target.value)}
                rows={6}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, fontSize: 14.5 }}
                placeholder="In a few sentences: what is the project, who benefits, where, and why now? The desks will infer the rest."
                disabled={isAnalysing}
              />
              <div className="flex items-center justify-between mt-2" style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: P.textDim }}>
                <span>{brief.description.length} chars</span>
                <span>The richer the description, the better the inference.</span>
              </div>
              {errors.description && <div style={errorStyle}>{errors.description}</div>}
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${P.border}` }}>
            <div style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase', color: P.textLo }}>
              {isValid ? <span style={{ color: P.accent }}>● Ready · the desks will fill the gaps</span> : <span>{Object.keys(errors).length} field{Object.keys(errors).length === 1 ? '' : 's'} need attention</span>}
            </div>
            <button
              onClick={() => analysisMutation.mutate()}
              disabled={!isValid || isAnalysing}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '14px 22px', borderRadius: 12,
                fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase',
                background: isValid && !isAnalysing ? P.accent : P.cardHi,
                color: isValid && !isAnalysing ? P.bg : P.textLo,
                border: 'none', cursor: isValid && !isAnalysing ? 'pointer' : 'not-allowed',
                transition: 'all 0.18s ease',
              }}
            >
              {isAnalysing ? <Loader2 size={14} className="animate-spin" /> : <PiPaperPlaneRightFill size={14} />}
              {isAnalysing ? 'Three desks reading…' : 'Send to the three desks'}
            </button>
          </div>
        </motion.section>
      )}

      {/* ─── ANALYSING ─── */}
      {isAnalysing && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {AGENT_DEFS.map((a, i) => (
            <AgentCard
              key={a.id}
              agentId={a.id}
              agentName={a.name}
              model={a.model}
              status={agentStatuses[a.id] ?? 'analyzing'}
              color={a.color}
              index={i}
            />
          ))}
        </motion.div>
      )}

      {/* ─── RESULT ─── */}
      {result && (
        <>
          {/* Header strip with auto-inferred metadata */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
            style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 24, padding: 'clamp(20px, 3vw, 32px)' }}
          >
            <div className="flex items-baseline justify-between flex-wrap gap-3">
              <div>
                <div style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase', color: P.accent }}>
                  Project brief · Under review
                </div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 'clamp(24px, 2.8vw, 30px)', color: P.textHi, marginTop: 8, letterSpacing: '-0.018em' }}>
                  {brief.name}
                </h3>
              </div>
              {draft && (
                <div className="flex items-center gap-4 flex-wrap" style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: P.textLo }}>
                  <span>{draft.categoryName || 'Category pending'}</span>
                  <span style={{ width: 1, height: 12, background: P.border }} />
                  <span>OMR {draft.budget.toLocaleString()}</span>
                  <span style={{ width: 1, height: 12, background: P.border }} />
                  <span>{draft.beneficiaries.toLocaleString()} beneficiaries</span>
                  <span style={{ width: 1, height: 12, background: P.border }} />
                  <span>{draft.region}</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* 3 agent dossiers with different chart types */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {result.agents.map((agent, j) => (
              <AgentPanel
                key={agent.agentId}
                agent={agent}
                color={AGENT_DEFS.find(d => d.id === agent.agentId)?.color ?? P.accent}
                index={j}
                colors={P}
              />
            ))}
          </div>

          {/* Master verdict */}
          {allComplete && (
            <MasterReport
              summary={result.masterReport.analysis}
              model={result.masterReport.metadata.model}
              visible
            />
          )}

          {/* Inferred draft preview */}
          {allComplete && draft && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1, ease: EASE }}
              style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 24, padding: 'clamp(20px, 3vw, 32px)' }}
            >
              <div className="flex items-baseline justify-between flex-wrap gap-3 mb-5">
                <div>
                  <div style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: P.textLo }}>
                    Auto-filled draft
                  </div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 'clamp(22px, 2.4vw, 26px)', color: P.textHi, marginTop: 6, letterSpacing: '-0.015em' }}>
                    The desks suggest these values.
                  </h3>
                </div>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 15, color: P.textLo, maxWidth: 360, textAlign: 'right' }}>
                  Open the project creator to review and adjust before saving.
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5">
                {[
                  { label: 'Category', value: draft.categoryName || '—' },
                  { label: 'Budget', value: `OMR ${draft.budget.toLocaleString()}` },
                  { label: 'Beneficiaries', value: draft.beneficiaries.toLocaleString() },
                  { label: 'Region', value: draft.region },
                  { label: 'Start', value: draft.startDate },
                  { label: 'End', value: draft.endDate },
                  { label: 'SDG goals', value: draft.sdgGoals.length > 0 ? draft.sdgGoals.map(n => `#${n}`).join(' · ') : 'none suggested' },
                  { label: 'Objectives', value: `${draft.objectives.length} drafted` },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 9, fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase', color: P.textLo }}>
                      {item.label}
                    </div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, color: P.textHi, marginTop: 4, letterSpacing: '-0.01em' }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {draft.objectives.length > 0 && (
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${P.border}` }}>
                  <div style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 9, fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase', color: P.textLo, marginBottom: 10 }}>
                    Drafted objectives
                  </div>
                  <ol className="space-y-2">
                    {draft.objectives.map((o, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 10, color: P.textDim, minWidth: 22, paddingTop: 2 }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span style={{ fontSize: 14, color: P.textMd, lineHeight: 1.55 }}>{o}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </motion.div>
          )}

          {/* Actions */}
          {allComplete && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.18, ease: EASE }}
              style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 24, padding: 'clamp(20px, 3vw, 28px)' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: P.textLo }}>
                    Next actions
                  </div>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 17, color: P.textMd, marginTop: 6 }}>
                    Open the draft in the project creator to review and create, or generate the official PDF for delivery.
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={handleGeneratePdf}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 10,
                      padding: '12px 18px', borderRadius: 10,
                      fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 11, fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase',
                      background: 'transparent', color: P.textHi, border: `1px solid ${P.borderHi}`,
                      cursor: 'pointer',
                    }}
                  >
                    <PiPaperPlaneRightFill size={13} /> Official report (PDF)
                  </button>

                  <button
                    onClick={handleHandoff}
                    disabled={!draft}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 10,
                      padding: '14px 22px', borderRadius: 10,
                      fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase',
                      background: P.accent, color: P.bg, border: 'none', cursor: 'pointer',
                    }}
                  >
                    <PiTreeStructureDuotone size={14} /> Open prefilled in project creator
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function FuturePortal() {
  const P = useTheme().colors;
  const [activeTab, setActiveTab] = useState<'predictions' | 'ai' | 'studio'>('predictions');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [showAllPredictions, setShowAllPredictions] = useState(false);

  // ─── Predictions Data ────────────────────────────────────────────────────
  const { data: apiResponse, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['future-data'],
    queryFn: () => futureService.getFutureData(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const data: FutureData = apiResponse?.data ?? emptyDefaults;

  // ─── Derived Data ────────────────────────────────────────────────────────
  const filteredRecommendations = useMemo(() => {
    if (priorityFilter === 'all') return data.aiRecommendations;
    return data.aiRecommendations.filter(r => r.priority === priorityFilter);
  }, [data.aiRecommendations, priorityFilter]);

  const visiblePredictions = useMemo(() => {
    if (showAllPredictions) return data.predictions;
    return data.predictions.slice(0, 6);
  }, [data.predictions, showAllPredictions]);

  const healthScore = data.overallHealth.score;
  const healthColor = getHealthColor(healthScore);

  // ─── Export Handlers ────────────────────────────────────────────────────
  const exportCols: ExportColumn[] = [
    { header: 'Category', key: 'Category' },
    { header: 'Metric', key: 'Metric' },
    { header: 'Value', key: 'Value' },
  ];

  const handleExportExcel = () => {
    const rows = [
      { Category: 'Health', Metric: 'Overall Score', Value: data.overallHealth.score },
      { Category: 'Health', Metric: 'Status', Value: data.overallHealth.status },
      ...data.predictions.slice(0, 10).map(p => ({ Category: 'Prediction', Metric: p.title, Value: `${p.confidence}% confidence` })),
      ...data.aiRecommendations.slice(0, 5).map(r => ({ Category: 'Recommendation', Metric: r.title, Value: r.priority })),
    ];
    exportToExcel(rows, { filename: 'future_portal', title: 'Future Portal Analytics', columns: exportCols });
  };

  const handlePrint = () => {
    const rows = [
      { Category: 'Health', Metric: 'Overall Score', Value: String(data.overallHealth.score) },
      ...data.predictions.slice(0, 10).map(p => ({ Category: 'Prediction', Metric: p.title, Value: `${p.confidence}%` })),
    ];
    printTable(rows, exportCols, 'Future Portal Analytics');
  };

  // ─── Loading State ──────────────────────────────────────────────────────
  if (isLoading && activeTab === 'predictions') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: P.bg }}>
        <div style={{ textAlign: 'center' }}>
          <LoadingSpinner size="lg" />
          <p style={{ color: P.textMd, marginTop: 16, fontSize: 14 }}>Loading AI predictions...</p>
        </div>
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────────────────────
  if (isError && activeTab === 'predictions') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: P.bg }}>
        <GlassCard style={{ padding: 40, textAlign: 'center', maxWidth: 420 }}>
          <AlertTriangle size={40} style={{ color: '#fb923c', margin: '0 auto 16px' }} />
          <h2 style={{ color: P.textHi, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            Failed to Load Predictions
          </h2>
          <p style={{ color: P.textMd, fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
            Unable to fetch AI prediction data. The service may be temporarily unavailable.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => refetch()}
            style={{
              background: P.accent, color: P.bg,
              padding: '10px 24px', borderRadius: 12,
              border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}
          >
            <RefreshCw size={15} /> Retry
          </motion.button>
        </GlassCard>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial="hidden"
      animate="show"
      className="min-h-screen p-6"
      style={{ background: P.bg }}
    >
      <style>{`
        @keyframes futurePulse {
          0%   { transform: scale(1);   opacity: 0.6; }
          70%  { transform: scale(2.4); opacity: 0;   }
          100% { transform: scale(2.4); opacity: 0;   }
        }
      `}</style>
      {/* ═══ PAGE HEADER ═══ */}
      <motion.div variants={fadeUp} style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, minWidth: 0, flex: 1 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: `linear-gradient(140deg, ${P.accent}22 0%, ${P.accent}08 100%)`,
              border: `1px solid ${P.accent}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: `inset 0 1px 0 ${P.accent}20, 0 8px 24px ${P.accent}10`,
            }}>
              <PiBrainDuotone size={26} style={{ color: P.accent }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                color: P.textLo, fontSize: 11, fontWeight: 700,
                letterSpacing: '0.22em', textTransform: 'uppercase',
                marginBottom: 6,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span>Intelligence Layer</span>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: P.textDim }} />
                <span style={{ color: P.accent }}>Forecasts &amp; Analytics</span>
              </div>
              <h1 style={{
                color: P.textHi, fontSize: 30, fontWeight: 700,
                margin: 0, lineHeight: 1.1, letterSpacing: '-0.025em',
              }}>
                Future Portal
              </h1>
              <p style={{
                color: P.textMd, fontSize: 13.5, marginTop: 8,
                lineHeight: 1.55, maxWidth: '62ch',
              }}>
                Multi-agent intelligence over your CSR portfolio. Quantitative forecasts paired with on-demand consensus analysis from a panel of specialised models.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 14px', borderRadius: 999,
              background: P.surface, border: `1px solid ${P.border}`,
            }}>
              <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8 }}>
                <span style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: '#34d399', opacity: 0.6,
                  animation: 'futurePulse 1.8s ease-out infinite',
                }} />
                <span style={{
                  position: 'relative', width: 8, height: 8, borderRadius: '50%',
                  background: '#34d399',
                }} />
              </span>
              <span style={{ color: P.textMd, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>
                4 Agents Online
              </span>
              <span style={{ width: 1, height: 12, background: P.border }} />
              <span style={{ color: P.textLo, fontSize: 11, fontFeatureSettings: '"tnum"' }}>
                Synced {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <ActionBar
              onRefresh={refetch}
              onExcel={handleExportExcel}
              onPrint={handlePrint}
              isRefreshing={isRefetching}
            />
          </div>
        </div>

        {/* ═══ TAB SWITCHER — editorial underline ═══ */}
        <div style={{
          display: 'flex', gap: 0, marginTop: 28,
          borderBottom: `1px solid ${P.border}`,
          position: 'relative',
        }}>
          {([
            { key: 'predictions' as const, icon: Activity, label: 'Predictions', sub: 'Quantitative' },
            { key: 'ai' as const, icon: PiRobotDuotone, label: 'Agent Console', sub: 'ZenMux · 4 Models' },
            { key: 'studio' as const, icon: PiTreeStructureDuotone, label: 'Project Studio', sub: 'Intake · Analyse · File' },
          ]).map(tab => {
            const active = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  position: 'relative',
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '14px 22px 16px',
                  background: 'transparent', border: 'none',
                  cursor: 'pointer',
                  color: active ? P.textHi : P.textLo,
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget.style.color = P.textMd); }}
                onMouseLeave={e => { if (!active) (e.currentTarget.style.color = P.textLo); }}
              >
                <Icon size={17} style={{ color: active ? P.accent : 'currentColor' }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                    {tab.label}
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: 600, marginTop: 2,
                    letterSpacing: '0.14em', textTransform: 'uppercase',
                    color: active ? P.accent : P.textDim,
                  }}>
                    {tab.sub}
                  </div>
                </div>
                {active && (
                  <motion.div
                    layoutId="futureTabIndicator"
                    style={{
                      position: 'absolute', left: 0, right: 0, bottom: -1,
                      height: 2, background: P.accent,
                      borderRadius: 2,
                    }}
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ═══ TAB CONTENT ═══ */}
      {activeTab === 'ai' ? (
        <AiAnalyticsTab P={P} />
      ) : activeTab === 'studio' ? (
        <ProjectStudioTab P={P} />
      ) : (
        <>
          {/* ═══ SECTION 1: HEALTH SCORE + RECOMMENDATIONS ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ marginBottom: 28 }}>
            {/* Overall Health Score */}
            <motion.div variants={stagger(0)}>
              <GlassCard style={{ padding: 28, height: '100%' }}>
                <SectionHeader
                  index="01"
                  eyebrow="Composite Index"
                  title="Portfolio Health"
                  icon={Activity}
                  color={P.accent}
                />
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                  <CircularGauge value={healthScore} size={170} strokeWidth={14} color={healthColor} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <MiniProgress label="Budget Health" value={data.overallHealth.budgetHealth}
                    color={getHealthColor(data.overallHealth.budgetHealth)} />
                  <MiniProgress label="Timeline Health" value={data.overallHealth.timelineHealth}
                    color={getHealthColor(data.overallHealth.timelineHealth)} />
                  <MiniProgress label="Quality Health" value={data.overallHealth.qualityHealth}
                    color={getHealthColor(data.overallHealth.qualityHealth)} />
                  <MiniProgress label="Completion Rate" value={data.overallHealth.completionRate}
                    color={getHealthColor(data.overallHealth.completionRate)} />
                </div>
              </GlassCard>
            </motion.div>

            {/* AI Recommendations */}
            <motion.div variants={stagger(0.08)} className="lg:col-span-2">
              <GlassCard style={{ padding: 28, height: '100%' }}>
                <SectionHeader
                  index="02"
                  eyebrow="Generated Insight"
                  title="AI Recommendations"
                  sub="Prioritised actions surfaced from your portfolio"
                  icon={Lightbulb}
                  color={P.accent}
                  right={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        background: P.accentXLo, color: P.accent,
                        fontSize: 11, fontWeight: 700,
                        padding: '4px 10px', borderRadius: 999,
                        letterSpacing: '0.04em',
                        fontFeatureSettings: '"tnum"',
                      }}>
                        {data.aiRecommendations.length} active
                      </span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {(['all', 'high', 'medium', 'low'] as const).map(f => (
                          <button
                            key={f}
                            onClick={() => setPriorityFilter(f)}
                            style={{
                              padding: '5px 12px', borderRadius: 8,
                              border: priorityFilter === f ? `1px solid ${P.accent}` : `1px solid ${P.border}`,
                              background: priorityFilter === f ? P.accentXLo : 'transparent',
                              color: priorityFilter === f ? P.accent : P.textLo,
                              fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                              textTransform: 'capitalize',
                              transition: 'all 0.18s ease',
                            }}
                          >
                            {f === 'all' ? 'All' : f}
                          </button>
                        ))}
                      </div>
                    </div>
                  }
                />

                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 14, maxHeight: 380, overflowY: 'auto',
                  paddingRight: 4,
                }}>
                  <AnimatePresence mode="popLayout">
                    {filteredRecommendations.map((rec, i) => {
                      const pri = priorityCfg[rec.priority];
                      const cat = categoryCfg[rec.category];
                      const CatIcon = cat?.icon || Target;
                      return (
                        <motion.div
                          key={rec.title}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.3, delay: i * 0.04 }}
                          whileHover={{ y: -3, scale: 1.01 }}
                          style={{
                            position: 'relative',
                            background: P.cardHi,
                            border: `1px solid ${P.border}`,
                            borderRadius: 14, padding: 16,
                            cursor: 'default',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            aria-hidden
                            style={{
                              position: 'absolute', inset: 0,
                              background: `radial-gradient(circle at 0% 0%, ${pri.color}10 0%, transparent 55%)`,
                              pointerEvents: 'none',
                            }}
                          />
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                              background: pri.bg, color: pri.text,
                              fontSize: 10.5, fontWeight: 700,
                              padding: '3px 9px 3px 8px', borderRadius: 999,
                              letterSpacing: '0.06em', textTransform: 'uppercase',
                              border: `1px solid ${pri.color}25`,
                            }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: pri.color }} />
                              {pri.label} Priority
                            </span>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              background: `${cat?.color || P.accent}15`,
                              color: cat?.color || P.accent,
                              fontSize: 11, fontWeight: 500,
                              padding: '2px 8px', borderRadius: 6,
                            }}>
                              <CatIcon size={11} />
                              {rec.category}
                            </span>
                          </div>
                          <h3 style={{ position: 'relative', color: P.textHi, fontSize: 14, fontWeight: 600, marginBottom: 6, lineHeight: 1.4, letterSpacing: '-0.01em' }}>
                            {rec.title}
                          </h3>
                          <p style={{ position: 'relative', color: P.textMd, fontSize: 12, lineHeight: 1.6, margin: 0 }}>
                            {rec.description}
                          </p>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {filteredRecommendations.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40 }}>
                      <Filter size={28} style={{ color: P.textDim, margin: '0 auto 12px' }} />
                      <p style={{ color: P.textLo, fontSize: 13 }}>
                        No recommendations match the selected filter.
                      </p>
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* ═══ SECTION 2: PROJECT PREDICTIONS TABLE ═══ */}
          <motion.div variants={stagger(0.14)} style={{ marginBottom: 28 }}>
            <GlassCard style={{ padding: 28 }}>
              <SectionHeader
                index="03"
                eyebrow="Per-Project Forecast"
                title="Project Predictions"
                sub={`Success probability and risk trajectory across ${data.predictions.length} projects`}
                icon={Target}
                color={P.accent}
                right={
                  data.predictions.length > 6 ? (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setShowAllPredictions(!showAllPredictions)}
                      style={{
                        background: 'transparent', border: `1px solid ${P.border}`,
                        borderRadius: 10, padding: '7px 14px',
                        color: P.textMd, fontSize: 12, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600,
                      }}
                    >
                      <Eye size={13} />
                      {showAllPredictions ? 'Show Less' : `Show All (${data.predictions.length})`}
                    </motion.button>
                  ) : null
                }
              />

              {/* Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.2fr 1fr 1fr 2fr',
                gap: 12, padding: '10px 14px',
                borderBottom: `1px solid ${P.border}`,
                marginBottom: 4,
              }}>
                {['Project', 'Success Probability', 'Risk Trend', 'Est. Completion', 'Top Recommendation'].map(h => (
                  <span key={h} style={{ color: P.textLo, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {h}
                  </span>
                ))}
              </div>

              {/* Table Rows */}
              <AnimatePresence mode="popLayout">
                {visiblePredictions.map((pred, i) => {
                  const trend = trendCfg[pred.riskTrend];
                  const TrendIcon = trend.icon;
                  return (
                    <motion.div
                      key={pred.projectId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, delay: i * 0.03 }}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1.2fr 1fr 1fr 2fr',
                        gap: 12, padding: '12px 14px',
                        borderBottom: `1px solid ${P.border}`,
                        alignItems: 'center',
                      }}
                      whileHover={{ background: P.cardHi }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: pred.status === 'active' ? '#38bdf8' : '#fbbf24',
                          flexShrink: 0,
                        }} />
                        <span style={{ color: P.textHi, fontSize: 13, fontWeight: 500 }}>
                          {pred.projectName}
                        </span>
                      </div>
                      <SuccessBar value={pred.successProbability} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <TrendIcon size={15} style={{ color: trend.color }} />
                        <span style={{ color: trend.color, fontSize: 12, fontWeight: 500 }}>
                          {trend.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={13} style={{ color: P.textLo }} />
                        <span style={{ color: P.textMd, fontSize: 12 }}>
                          {new Date(pred.estimatedCompletion).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: P.bg, borderRadius: 8, padding: '5px 10px',
                      }}>
                        <Zap size={12} style={{ color: P.accent, flexShrink: 0 }} />
                        <span style={{ color: P.textMd, fontSize: 12, lineHeight: 1.4 }}>
                          {pred.recommendations[0]}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Summary Row */}
              <div style={{
                display: 'flex', gap: 24, padding: '14px 14px 0',
                marginTop: 8,
              }}>
                {[
                  { label: 'Avg Success', value: `${data.predictions.length > 0 ? Math.round(data.predictions.reduce((a, p) => a + p.successProbability, 0) / data.predictions.length) : 0}%`,
                    color: getHealthColor(data.predictions.length > 0 ? data.predictions.reduce((a, p) => a + p.successProbability, 0) / data.predictions.length : 0) },
                  { label: 'Improving', value: data.predictions.filter(p => p.riskTrend === 'improving').length.toString(), color: '#34d399' },
                  { label: 'Declining', value: data.predictions.filter(p => p.riskTrend === 'declining').length.toString(), color: '#f87171' },
                  { label: 'At Risk (<50%)', value: data.predictions.filter(p => p.successProbability < 50).length.toString(), color: '#fb923c' },
                ].map(stat => (
                  <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: stat.color }} />
                    <span style={{ color: P.textLo, fontSize: 12 }}>{stat.label}:</span>
                    <span style={{ color: stat.color, fontSize: 13, fontWeight: 600 }}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* ═══ SECTION 3: CHARTS ROW ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ marginBottom: 28 }}>
            {/* Budget Forecast Chart */}
            <motion.div variants={stagger(0.18)}>
              <GlassCard style={{ padding: 28 }}>
                <SectionHeader
                  index="04"
                  eyebrow="6-Month Outlook"
                  title="Budget Forecast"
                  icon={BarChart3}
                  color={P.accent}
                />

                <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
                  {[
                    { label: 'Projected Budget', color: CHART_COLORS[0] },
                    { label: 'Projected Spend', color: CHART_COLORS[1] },
                    { label: 'Confidence Band', color: `${CHART_COLORS[2]}40` },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: item.color }} />
                      <span style={{ color: P.textMd, fontSize: 11 }}>{item.label}</span>
                    </div>
                  ))}
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={data.budgetForecast} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="budgetGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS[1]} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={CHART_COLORS[1]} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: P.textLo, fontSize: 11 }}
                      axisLine={{ stroke: P.border }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: P.textLo, fontSize: 11 }}
                      axisLine={{ stroke: P.border }}
                      tickLine={false}
                      tickFormatter={(val: number) => `${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone" dataKey="projectedBudget" name="Projected Budget"
                      stroke={CHART_COLORS[0]} fill="url(#budgetGrad)"
                      strokeWidth={2} dot={false}
                    />
                    <Area
                      type="monotone" dataKey="projectedSpend" name="Projected Spend"
                      stroke={CHART_COLORS[1]} fill="url(#spendGrad)"
                      strokeWidth={2} dot={false}
                    />
                    <Line
                      type="monotone" dataKey="confidence" name="Confidence %"
                      stroke={CHART_COLORS[2]} strokeWidth={1.5}
                      strokeDasharray="5 5" dot={false}
                      yAxisId="right"
                    />
                    <YAxis
                      yAxisId="right" orientation="right"
                      tick={{ fill: P.textLo, fontSize: 11 }}
                      axisLine={false} tickLine={false}
                      domain={[0, 100]}
                      tickFormatter={(val: number) => `${val}%`}
                    />
                  </ComposedChart>
                </ResponsiveContainer>

                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  marginTop: 16, padding: '10px 14px',
                  background: P.cardHi, borderRadius: 12,
                }}>
                  <div>
                    <span style={{ color: P.textLo, fontSize: 11 }}>Avg Confidence</span>
                    <div style={{ color: CHART_COLORS[2], fontSize: 16, fontWeight: 700 }}>
                      {data.budgetForecast.length > 0 ? Math.round(data.budgetForecast.reduce((a, b) => a + b.confidence, 0) / data.budgetForecast.length) : 0}%
                    </div>
                  </div>
                  <div>
                    <span style={{ color: P.textLo, fontSize: 11 }}>Total Projected Budget</span>
                    <div style={{ color: CHART_COLORS[0], fontSize: 16, fontWeight: 700 }}>
                      OMR {(data.budgetForecast.reduce((a, b) => a + b.projectedBudget, 0) / 1000).toFixed(0)}k
                    </div>
                  </div>
                  <div>
                    <span style={{ color: P.textLo, fontSize: 11 }}>Total Projected Spend</span>
                    <div style={{ color: CHART_COLORS[1], fontSize: 16, fontWeight: 700 }}>
                      OMR {(data.budgetForecast.reduce((a, b) => a + b.projectedSpend, 0) / 1000).toFixed(0)}k
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* Impact Projections Chart */}
            <motion.div variants={stagger(0.22)}>
              <GlassCard style={{ padding: 28 }}>
                <SectionHeader
                  index="05"
                  eyebrow="Beneficiary Growth"
                  title="Impact Projections"
                  icon={Users}
                  color={P.accent}
                />

                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.impactProjections} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS[1]} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={CHART_COLORS[1]} stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                    <XAxis
                      dataKey="quarter"
                      tick={{ fill: P.textLo, fontSize: 11 }}
                      axisLine={{ stroke: P.border }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: P.textLo, fontSize: 11 }}
                      axisLine={{ stroke: P.border }}
                      tickLine={false}
                      tickFormatter={(val: number) => `${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<ImpactTooltip />} />
                    <Bar
                      dataKey="beneficiaries" name="Beneficiaries"
                      fill="url(#barGrad)" radius={[8, 8, 0, 0]}
                      maxBarSize={60}
                    />
                  </BarChart>
                </ResponsiveContainer>

                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 12, marginTop: 16,
                }}>
                  {[
                    {
                      label: 'Total Projected',
                      value: data.impactProjections.reduce((a, b) => a + b.beneficiaries, 0).toLocaleString(),
                      icon: Users, color: CHART_COLORS[1],
                    },
                    {
                      label: 'Quarterly Growth',
                      value: (() => {
                        const ip = data.impactProjections;
                        if (ip.length < 2) return 'N/A';
                        const growth = ((ip[ip.length - 1].beneficiaries - ip[0].beneficiaries) / ip[0].beneficiaries * 100).toFixed(0);
                        return `+${growth}%`;
                      })(),
                      icon: ArrowUpRight, color: '#34d399',
                    },
                    {
                      label: 'Peak Quarter',
                      value: data.impactProjections.length > 0
                        ? data.impactProjections.reduce((max, q) => q.beneficiaries > max.beneficiaries ? q : max, data.impactProjections[0]).quarter
                        : 'N/A',
                      icon: Target, color: P.accent,
                    },
                  ].map(stat => {
                    const StatIcon = stat.icon;
                    return (
                      <div key={stat.label} style={{
                        background: P.cardHi, borderRadius: 12,
                        padding: '12px 14px', textAlign: 'center',
                      }}>
                        <StatIcon size={16} style={{ color: stat.color, margin: '0 auto 6px' }} />
                        <div style={{ color: P.textHi, fontSize: 16, fontWeight: 700 }}>{stat.value}</div>
                        <div style={{ color: P.textLo, fontSize: 11, marginTop: 2 }}>{stat.label}</div>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* ═══ SECTION 4: CATEGORY INSIGHTS GRID ═══ */}
          <motion.div variants={stagger(0.26)} style={{ marginBottom: 28 }}>
            <SectionHeader
              index="06"
              eyebrow="Sector Performance"
              title="Category Insights"
              sub="Risk, growth potential, and projected returns by sector"
              icon={Shield}
              color={P.accent}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.categoryInsights.map((cat, i) => {
                const cfg = categoryCfg[cat.category];
                const CatIcon = cfg?.icon || Target;
                const catColor = cfg?.color || P.accent;
                const risk = riskCfg[cat.riskLevel as keyof typeof riskCfg] || riskCfg.medium;
                const growthColor = cat.growthPotential === 'High' ? '#34d399'
                  : cat.growthPotential === 'Medium' ? '#fbbf24' : '#fb923c';

                return (
                  <motion.div
                    key={cat.category}
                    variants={stagger(0.28 + i * 0.06)}
                    whileHover={{ y: -4, scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <GlassCard style={{ padding: 22, height: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: `${catColor}15`,
                            border: `1px solid ${catColor}30`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <CatIcon size={18} style={{ color: catColor }} />
                          </div>
                          <div>
                            <h3 style={{ color: P.textHi, fontSize: 15, fontWeight: 600, margin: 0 }}>
                              {cat.category}
                            </h3>
                            <span style={{ color: P.textLo, fontSize: 11 }}>
                              {cat.projects} project{cat.projects !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <span style={{
                          background: risk.bg, color: risk.text,
                          fontSize: 11, fontWeight: 600,
                          padding: '3px 9px', borderRadius: 6,
                          border: `1px solid ${risk.color}25`,
                        }}>
                          {risk.label} Risk
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ color: P.textMd, fontSize: 12 }}>Avg Progress</span>
                            <span style={{ color: P.textHi, fontSize: 12, fontWeight: 600 }}>{cat.avgProgress}%</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: P.border, overflow: 'hidden' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${cat.avgProgress}%` }}
                              transition={{ duration: 0.8, ease: EASE, delay: 0.4 + i * 0.08 }}
                              style={{ height: '100%', borderRadius: 3, background: catColor }}
                            />
                          </div>
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ color: P.textMd, fontSize: 12 }}>Budget Utilization</span>
                            <span style={{
                              color: cat.budgetUtilization > 90 ? '#f87171' : cat.budgetUtilization > 75 ? '#fbbf24' : '#34d399',
                              fontSize: 12, fontWeight: 600,
                            }}>
                              {cat.budgetUtilization}%
                            </span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: P.border, overflow: 'hidden' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${cat.budgetUtilization}%` }}
                              transition={{ duration: 0.8, ease: EASE, delay: 0.5 + i * 0.08 }}
                              style={{
                                height: '100%', borderRadius: 3,
                                background: cat.budgetUtilization > 90 ? '#f87171' : cat.budgetUtilization > 75 ? '#fbbf24' : '#34d399',
                              }}
                            />
                          </div>
                        </div>

                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          background: P.bg, borderRadius: 10, padding: '8px 12px',
                          marginTop: 2,
                        }}>
                          <span style={{ color: P.textMd, fontSize: 12 }}>Growth Potential</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            {cat.growthPotential === 'High' ? (
                              <ArrowUpRight size={14} style={{ color: growthColor }} />
                            ) : cat.growthPotential === 'Low' ? (
                              <ArrowDownRight size={14} style={{ color: growthColor }} />
                            ) : (
                              <Minus size={14} style={{ color: growthColor }} />
                            )}
                            <span style={{ color: growthColor, fontSize: 12, fontWeight: 600 }}>
                              {cat.growthPotential}
                            </span>
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* ═══ SECTION 5: QUICK STATS FOOTER ═══ */}
          <motion.div variants={stagger(0.34)}>
            <GlassCard style={{ padding: '18px 28px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={16} style={{ color: P.accent }} />
                  <span style={{ color: P.textLo, fontSize: 12 }}>
                    AI predictions generated using historical project data, budget patterns, and risk models
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 20 }}>
                  {[
                    { label: 'Model Accuracy', value: '87%', color: '#34d399' },
                    { label: 'Last Updated', value: 'Just now', color: P.textMd },
                    { label: 'Data Points', value: '2,847', color: P.accent },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: P.textLo, fontSize: 11 }}>{item.label}:</span>
                      <span style={{ color: item.color, fontSize: 12, fontWeight: 600 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
