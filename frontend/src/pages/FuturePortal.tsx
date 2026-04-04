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
  MessageSquare,
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
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend,
} from 'recharts';
import { useTheme } from '../hooks/useTheme';
import { futureService } from '../services/futureService';
import type { FutureData } from '../services/futureService';
import { aiAnalyticsService, AVAILABLE_MODELS } from '../services/aiAnalyticsService';
import type { AiAnalysisResult, AiChart, AnalysisScope } from '../services/aiAnalyticsService';
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
const CHART_COLORS = ['#C9C036', '#38bdf8', '#34d399', '#fbbf24', '#a78bfa', '#f87171', '#fb923c', '#f472b6'];

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
        x={size / 2} y={size / 2 - 8}
        textAnchor="middle" dominantBaseline="central"
        fill={P.textHi} fontSize={size * 0.22} fontWeight="bold"
      >
        {value}
      </text>
      <text
        x={size / 2} y={size / 2 + 16}
        textAnchor="middle" dominantBaseline="central"
        fill={P.textLo} fontSize={size * 0.09}
      >
        / 100
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

// ═════════════════════════════════════════════════════════════════════════════
// AI TAB — Helper Components
// ═════════════════════════════════════════════════════════════════════════════

function AiChartRenderer({ chart, colors }: { chart: AiChart; colors: ReturnType<typeof useTheme>['colors'] }) {
  const data = chart.data;
  if (!data || data.length === 0) return null;

  const commonAxisProps = {
    tick: { fill: colors.textLo, fontSize: 11 },
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
      fontSize: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    },
    labelStyle: { color: colors.textMd, fontWeight: 600 },
  };

  if (chart.type === 'donut') {
    return (
      <div style={{ height: 280 }}>
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
              {data.map((_: any, i: number) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} />
            <Legend
              wrapperStyle={{ fontSize: 11, color: colors.textMd }}
              iconType="circle"
              iconSize={8}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const xKey = chart.xKey || Object.keys(data[0]).find(k => typeof data[0][k] === 'string') || 'label';
  const yKeys = chart.yKeys || Object.keys(data[0]).filter(k => typeof data[0][k] === 'number');

  if (chart.type === 'bar') {
    return (
      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey={xKey} {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            <Tooltip {...tooltipStyle} />
            {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />}
            {yKeys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chart.type === 'line') {
    return (
      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey={xKey} {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            <Tooltip {...tooltipStyle} />
            {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />}
            {yKeys.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // area (default)
  return (
    <div style={{ height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            {yKeys.map((key, i) => (
              <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.3} />
                <stop offset="100%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey={xKey} {...commonAxisProps} />
          <YAxis {...commonAxisProps} />
          <Tooltip {...tooltipStyle} />
          {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />}
          {yKeys.map((key, i) => (
            <Area key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} fill={`url(#grad-${key})`} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
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
// AI ANALYTICS TAB CONTENT
// ═════════════════════════════════════════════════════════════════════════════

interface HistoryEntry {
  question: string;
  scope: AnalysisScope;
  model: string | undefined;
  result: AiAnalysisResult;
}

function AiAnalyticsTab({ P }: { P: ReturnType<typeof useTheme>['colors'] }) {
  const [question, setQuestion] = useState('');
  const [scope, setScope] = useState<AnalysisScope>('overview');
  const [model, setModel] = useState<string | undefined>(undefined);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const mutation = useMutation({
    mutationFn: (params: { question: string; scope: AnalysisScope; model?: string }) =>
      aiAnalyticsService.analyze(params.question, params.scope, params.model),
    onSuccess: (response, variables) => {
      if (response.success && response.data) {
        setHistory(prev => [...prev, {
          question: variables.question,
          scope: variables.scope,
          model: variables.model,
          result: response.data,
        }]);
      }
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [history, mutation.isPending]);

  const handleSubmit = (q?: string) => {
    const text = q || question.trim();
    if (!text || mutation.isPending) return;
    setQuestion('');
    mutation.mutate({ question: text, scope, model });
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
      {/* Scope & Model Selectors */}
      <div className="shrink-0 pb-4" style={{ borderBottom: `1px solid ${P.border}` }}>
        {/* Scope */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-semibold mr-1" style={{ color: P.textLo }}>SCOPE:</span>
          {scopeOptions.map(opt => {
            const active = scope === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => setScope(opt.value)}
                className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all"
                style={{
                  background: active ? `${opt.color}15` : 'transparent',
                  color: active ? opt.color : P.textLo,
                  border: `1px solid ${active ? opt.color + '30' : 'transparent'}`,
                }}
              >
                <Icon size={12} />
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Model */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <span className="text-[10px] font-semibold mr-1 flex items-center gap-1" style={{ color: P.textLo }}>
            <PiRobotDuotone size={11} />
            MODEL:
          </span>
          <button
            onClick={() => setModel(undefined)}
            className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all"
            style={{
              background: model === undefined ? `${P.accent}15` : 'transparent',
              color: model === undefined ? P.accent : P.textLo,
              border: `1px solid ${model === undefined ? P.accent + '30' : 'transparent'}`,
            }}
          >
            Auto
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399' }}>FREE</span>
          </button>
          {AVAILABLE_MODELS.map(m => {
            const active = model === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all"
                style={{
                  background: active ? `${P.accent}15` : 'transparent',
                  color: active ? P.accent : P.textLo,
                  border: `1px solid ${active ? P.accent + '30' : 'transparent'}`,
                }}
              >
                {m.label}
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                  style={{
                    background: m.tier === 'free' ? 'rgba(52,211,153,0.15)' : 'rgba(251,191,36,0.15)',
                    color: m.tier === 'free' ? '#34d399' : '#fbbf24',
                  }}>
                  {m.tier === 'free' ? 'FREE' : 'PAID'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-6" style={{ scrollbarWidth: 'thin', scrollbarColor: `${P.border} transparent` }}>
        {history.length === 0 && !mutation.isPending && (
          <div className="flex flex-col items-center justify-center h-full text-center relative">
            {/* MetaBalls full */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0.72 }}>
              <div style={{ width: '100%', height: '100%' }}>
                <Suspense fallback={null}>
                  <MetaBalls
                    color="#6b0018"
                    cursorBallColor="#8b0020"
                    cursorBallSize={1}
                    ballCount={10}
                    animationSize={42}
                    enableMouseInteraction={false}
                    enableTransparency={true}
                    hoverSmoothness={0.15}
                    clumpFactor={0.7}
                    speed={0.25}
                  />
                </Suspense>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {history.map((entry, i) => (
            <div key={i} className="space-y-4">
              {/* User Question */}
              <div className="flex justify-end">
                <div className="max-w-lg px-4 py-2.5 rounded-2xl rounded-br-md text-sm" style={{ background: `${P.accent}15`, color: P.textHi, border: `1px solid ${P.accent}20` }}>
                  {entry.question}
                  <span className="block text-[9px] mt-1 text-right" style={{ color: P.textLo }}>
                    {entry.scope} scope · {entry.model ? entry.model.split('/').pop() : 'auto'}
                  </span>
                </div>
              </div>
              {/* AI Response */}
              <AnalysisResultCard result={entry.result} colors={P} />
            </div>
          ))}
        </AnimatePresence>

        {/* Loading */}
        {mutation.isPending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 py-6">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: `${P.accent}10` }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <PiSpinnerGapBold size={16} style={{ color: P.accent }} />
              </motion.div>
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: P.textMd }}>
                Analyzing your data{model ? ` with ${model.split('/').pop()}` : ' (auto model)'}...
              </p>
              <p className="text-[10px]" style={{ color: P.textLo }}>Querying PostgreSQL and generating insights</p>
            </div>
          </motion.div>
        )}

        {/* Error */}
        {mutation.isError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 rounded-xl p-4"
            style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}
          >
            <PiWarningCircleDuotone size={18} style={{ color: '#f87171', marginTop: 1 }} />
            <div>
              <p className="text-xs font-medium" style={{ color: '#f87171' }}>Analysis failed</p>
              <p className="text-[11px] mt-0.5" style={{ color: P.textMd }}>
                {(mutation.error as any)?.response?.data?.error?.message || 'An unexpected error occurred.'}
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="shrink-0 pt-4" style={{ borderTop: `1px solid ${P.border}` }}>
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button
              onClick={() => setHistory([])}
              className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors"
              style={{ color: P.textLo, background: P.surface, border: `1px solid ${P.border}` }}
              title="Clear history"
            >
              <PiArrowsClockwiseBold size={13} />
            </button>
          )}
          <div className="flex-1 flex items-center gap-2 rounded-xl px-4 py-2"
            style={{ background: P.surface, border: `1px solid ${P.borderHi}` }}>
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder="Ask about your CSR data... (e.g., 'Analyze budget utilization by category')"
              disabled={mutation.isPending}
              className="flex-1 bg-transparent text-sm outline-none placeholder-opacity-50"
              style={{ color: P.textHi }}
            />
            <button
              onClick={() => handleSubmit()}
              disabled={!question.trim() || mutation.isPending}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all shrink-0"
              style={{
                background: question.trim() ? P.accent : P.cardHi,
                color: question.trim() ? '#080805' : P.textLo,
                cursor: question.trim() && !mutation.isPending ? 'pointer' : 'default',
                opacity: question.trim() ? 1 : 0.5,
              }}
            >
              {mutation.isPending
                ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><PiSpinnerGapBold size={14} /></motion.div>
                : <PiPaperPlaneRightFill size={14} />
              }
            </button>
          </div>
        </div>
        <p className="text-[9px] text-center mt-2" style={{ color: P.textDim }}>
          Powered by GitHub Models · {model ? model.split('/').pop() : 'Auto (Free)'} · Real-time PostgreSQL data · Charts via Recharts
        </p>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function FuturePortal() {
  const P = useTheme().colors;
  const [activeTab, setActiveTab] = useState<'predictions' | 'ai'>('predictions');
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
      {/* ═══ PAGE HEADER ═══ */}
      <motion.div variants={fadeUp} style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: `rgba(201,192,54,0.1)`,
              border: `1px solid rgba(201,192,54,0.2)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Brain size={22} style={{ color: P.accent }} />
            </div>
            <div>
              <h1 style={{ color: P.textHi, fontSize: 24, fontWeight: 700, margin: 0 }}>
                Future Portal
                <Sparkles size={18} style={{ color: P.accent, marginLeft: 10, verticalAlign: 'middle' }} />
              </h1>
              <p style={{ color: P.textMd, fontSize: 13, marginTop: 2 }}>
                AI-powered predictions, forecasts, and real-time analytics via GitHub Models
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ActionBar
              onRefresh={refetch}
              onExcel={handleExportExcel}
              onPrint={handlePrint}
              isRefreshing={isRefetching}
            />
          </div>
        </div>

        {/* ═══ TAB SWITCHER ═══ */}
        <div style={{ display: 'flex', gap: 4, marginTop: 20 }}>
          <button
            onClick={() => setActiveTab('predictions')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 12,
              background: activeTab === 'predictions' ? `${P.accent}12` : 'transparent',
              border: `1px solid ${activeTab === 'predictions' ? P.accent + '30' : P.border}`,
              color: activeTab === 'predictions' ? P.accent : P.textLo,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Activity size={16} />
            Predictions Dashboard
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 12,
              background: activeTab === 'ai' ? `${P.accent}12` : 'transparent',
              border: `1px solid ${activeTab === 'ai' ? P.accent + '30' : P.border}`,
              color: activeTab === 'ai' ? P.accent : P.textLo,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <MessageSquare size={16} />
            AI Analytics
            <span style={{
              fontSize: 9, fontWeight: 700,
              padding: '2px 6px', borderRadius: 6,
              background: 'rgba(52,211,153,0.15)', color: '#34d399',
            }}>
              GitHub Models
            </span>
          </button>
        </div>
      </motion.div>

      {/* ═══ TAB CONTENT ═══ */}
      {activeTab === 'ai' ? (
        <AiAnalyticsTab P={P} />
      ) : (
        <>
          {/* ═══ SECTION 1: HEALTH SCORE + RECOMMENDATIONS ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ marginBottom: 28 }}>
            {/* Overall Health Score */}
            <motion.div variants={stagger(0)}>
              <GlassCard style={{ padding: 28, height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <Activity size={18} style={{ color: P.accent }} />
                  <h2 style={{ color: P.textHi, fontSize: 16, fontWeight: 600, margin: 0 }}>
                    Overall Health Score
                  </h2>
                </div>
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
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 20,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Lightbulb size={18} style={{ color: P.accent }} />
                    <h2 style={{ color: P.textHi, fontSize: 16, fontWeight: 600, margin: 0 }}>
                      AI Recommendations
                    </h2>
                    <span style={{
                      background: P.accentXLo, color: P.accent,
                      fontSize: 11, fontWeight: 600,
                      padding: '2px 8px', borderRadius: 8,
                      marginLeft: 4,
                    }}>
                      {data.aiRecommendations.length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['all', 'high', 'medium', 'low'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setPriorityFilter(f)}
                        style={{
                          padding: '4px 12px', borderRadius: 8,
                          border: priorityFilter === f ? `1px solid ${P.accent}` : `1px solid ${P.border}`,
                          background: priorityFilter === f ? P.accentXLo : 'transparent',
                          color: priorityFilter === f ? P.accent : P.textLo,
                          fontSize: 12, fontWeight: 500, cursor: 'pointer',
                          textTransform: 'capitalize',
                        }}
                      >
                        {f === 'all' ? 'All' : f}
                      </button>
                    ))}
                  </div>
                </div>

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
                            background: P.cardHi,
                            border: `1px solid ${P.border}`,
                            borderRadius: 14, padding: 16,
                            cursor: 'default',
                            borderLeft: `3px solid ${pri.color}`,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{
                              background: pri.bg, color: pri.text,
                              fontSize: 11, fontWeight: 600,
                              padding: '2px 8px', borderRadius: 6,
                              border: `1px solid ${pri.color}20`,
                            }}>
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
                          <h3 style={{ color: P.textHi, fontSize: 14, fontWeight: 600, marginBottom: 6, lineHeight: 1.4 }}>
                            {rec.title}
                          </h3>
                          <p style={{ color: P.textMd, fontSize: 12, lineHeight: 1.6, margin: 0 }}>
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
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Target size={18} style={{ color: P.accent }} />
                  <h2 style={{ color: P.textHi, fontSize: 16, fontWeight: 600, margin: 0 }}>
                    Project Predictions
                  </h2>
                  <span style={{
                    background: P.accentXLo, color: P.accent,
                    fontSize: 11, fontWeight: 600,
                    padding: '2px 8px', borderRadius: 8,
                  }}>
                    {data.predictions.length} projects
                  </span>
                </div>
                {data.predictions.length > 6 && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowAllPredictions(!showAllPredictions)}
                    style={{
                      background: 'transparent', border: `1px solid ${P.border}`,
                      borderRadius: 10, padding: '6px 14px',
                      color: P.textMd, fontSize: 12, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <Eye size={13} />
                    {showAllPredictions ? 'Show Less' : `Show All (${data.predictions.length})`}
                  </motion.button>
                )}
              </div>

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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <BarChart3 size={18} style={{ color: P.accent }} />
                  <h2 style={{ color: P.textHi, fontSize: 16, fontWeight: 600, margin: 0 }}>
                    Budget Forecast
                  </h2>
                  <span style={{ color: P.textLo, fontSize: 12, marginLeft: 'auto' }}>
                    Next 6 months
                  </span>
                </div>

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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <Users size={18} style={{ color: P.accent }} />
                  <h2 style={{ color: P.textHi, fontSize: 16, fontWeight: 600, margin: 0 }}>
                    Impact Projections
                  </h2>
                  <span style={{ color: P.textLo, fontSize: 12, marginLeft: 'auto' }}>
                    Beneficiary Growth
                  </span>
                </div>

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Shield size={18} style={{ color: P.accent }} />
              <h2 style={{ color: P.textHi, fontSize: 16, fontWeight: 600, margin: 0 }}>
                Category Insights
              </h2>
              <span style={{ color: P.textLo, fontSize: 12, marginLeft: 4 }}>
                Performance breakdown by sector
              </span>
            </div>

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
