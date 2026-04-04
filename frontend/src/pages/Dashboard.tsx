
import { useRef, useCallback, useMemo, useState, useEffect, useLayoutEffect, lazy, Suspense, Component } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, useInView } from 'framer-motion';
const MetaBalls = lazy(() => import('../components/MetaBalls/MetaBalls'));
class MetaBallsGuard extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? null : this.props.children; }
}
import {
  ResponsiveContainer, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, PieChart, Pie, Cell, BarChart, Bar,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  AreaChart as RechartsAreaChart,
  ComposedChart,
  RadialBarChart, RadialBar,
  LineChart, Line, LabelList, ReferenceLine,
} from 'recharts';
import {
  TrendingUp, ArrowUpRight, ArrowDownRight,
  AlertTriangle,
  ChevronRight, ArrowRight,
} from 'lucide-react';
import {
  PiFoldersDuotone, PiLightningDuotone, PiWalletDuotone, PiCurrencyDollarDuotone,
  PiHeartDuotone, PiGaugeDuotone, PiChartBarDuotone,
  PiUsersThreeDuotone, PiCalendarCheckDuotone, PiTargetDuotone,
  PiTrendUpDuotone, PiTrendDownDuotone, PiEyeDuotone,
  PiGlobeDuotone,
  PiArrowSquareOutDuotone,
  PiSpinnerGapBold, PiExportDuotone, PiPrinterDuotone, PiArrowsClockwiseBold,
  PiWarningCircleDuotone, PiLightbulbDuotone, PiStackDuotone, PiRocketLaunchDuotone,
  PiBrainDuotone, PiPulseDuotone, PiSirenDuotone, PiClockCountdownDuotone,
  PiFireDuotone, PiStarDuotone, PiHouseLineDuotone, PiBriefcaseDuotone,
  PiHandshakeDuotone,
} from 'react-icons/pi';
import { cn } from '../utils/cn';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../stores/authStore';
import { dashboardService } from '../services/dashboardService';
import { futureService } from '../services/futureService';
import type { FutureData } from '../services/futureService';
import { aiAnalyticsService } from '../services/aiAnalyticsService';
import type { AiChart } from '../services/aiAnalyticsService';
import { exportToExcel, printTable, type ExportColumn } from '../utils/exportUtils';

// ═══════════════════════════════════════════════════════════════════════════════
// §1  ANIMATION PRESETS
// ═══════════════════════════════════════════════════════════════════════════════
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const fadeUp   = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } } };
const stagger  = (d = 0) => ({ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: d } } });
const scaleIn  = (d = 0) => ({ hidden: { opacity: 0, scale: 0.92 }, show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: EASE, delay: d } } });
const VP       = { once: true, margin: '-60px' as const };
const CHART_C  = ['#38bdf8', '#34d399', '#f87171', '#fbbf24', '#a78bfa', '#E91E63', '#22d3ee', '#60a5fa'];
const CORP = {
  brand: '#0B5CAB',
  brandSoft: 'rgba(11,92,171,0.12)',
};

// ═══════════════════════════════════════════════════════════════════════════════
// §2  SHARED PRIMITIVES  (GlassCard, SectionHeader, ChartTooltip, AnimatedCounter)
// ═══════════════════════════════════════════════════════════════════════════════
function GlassCard({ children, className, style, onClick }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void }) {
  const { colors: P, isDark } = useTheme();
  return (
    <div onClick={onClick} className={cn('relative rounded-xl', className)}
      style={{
        background: isDark
          ? 'linear-gradient(160deg, #111111 0%, #0a0a0a 100%)'
          : `linear-gradient(168deg, ${P.card} 0%, ${P.bg} 100%)`,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : P.border}`,
        borderRadius: 20,
        boxShadow: isDark
          ? 'inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 32px rgba(0,0,0,0.35)'
          : 'inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 20px rgba(0,0,0,0.06)',
        ...style,
      }}>
      {children}
    </div>
  );
}
function SectionHeader({ icon: Icon, title, subtitle, action }: { icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; title: string; subtitle?: string; action?: React.ReactNode }) {
  const { colors: P, isDark } = useTheme();
  const accentColor = isDark ? '#4ade80' : CORP.brand;
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div style={{ width: 32, height: 32, borderRadius: 9, background: `${accentColor}12`, border: `1px solid ${accentColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={14} style={{ color: accentColor }} />
        </div>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#ffffff' : P.textHi, fontFamily: "'Caveat', cursive", letterSpacing: '-0.01em', lineHeight: 1.2 }}>{title}</h3>
          {subtitle && <p className="text-[9.5px] mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : P.textLo }}>{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
  const { colors: P } = useTheme();
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3.5 py-2.5 z-[999]" style={{ background: P.card, border: `1px solid ${P.borderHi}`, boxShadow: '0 12px 24px rgba(2,6,23,0.25)' }}>
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

const BeneficiaryAdvancedTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
  if (!active || !payload?.length) return null;

  const formatCount = (value: unknown) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : String(value ?? '0');
  };

  const rows = payload
    .filter((p: any) => p?.value != null)
    .map((p: any) => ({
      name: p.name,
      value: Number(p.value) || 0,
      formatted: formatCount(p.value),
    }));

  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <div
      className="rounded-xl px-3.5 py-2.5 z-[999] min-w-[220px]"
      style={{
        background: '#0f172a',
        border: '1px solid rgba(148,163,184,0.32)',
        boxShadow: '0 12px 28px rgba(2,6,23,0.45)',
      }}
    >
      <p className="text-[11px] font-bold" style={{ color: '#e2e8f0' }}>Tooltip - No Indicator</p>
      <p className="text-[10px] mb-2" style={{ color: '#94a3b8' }}>Tooltip with custom formatter and total</p>

      <div className="mb-2 pt-1 border-t" style={{ borderColor: 'rgba(148,163,184,0.24)' }}>
        <p className="text-[10px] font-bold" style={{ color: '#cbd5e1' }}>{label}</p>
      </div>

      {rows.map((row, i) => (
        <div key={`${row.name}-${i}`} className="flex items-center justify-between gap-3 text-[10px] py-0.5">
          <span style={{ color: '#cbd5e1' }}>{row.name}</span>
          <span className="font-bold tabular-nums" style={{ color: '#f8fafc' }}>{row.formatted}</span>
        </div>
      ))}

      <div className="mt-2 pt-1.5 border-t flex items-center justify-between text-[10px]" style={{ borderColor: 'rgba(148,163,184,0.24)' }}>
        <span className="font-semibold" style={{ color: '#a5b4fc' }}>Total</span>
        <span className="font-extrabold tabular-nums" style={{ color: '#f8fafc' }}>{formatCount(total)}</span>
      </div>
    </div>
  );
};
// ─── Radial Chart — Text (center label, single arc) ────────────────────────────
function RadialText({ value, max, label, trend, trendLabel, color }: {
  value: number; max: number; label: string; trend: number; trendLabel: string; color: string;
}) {
  const { colors: P } = useTheme();
  const pct = Math.min(100, Math.round((value / max) * 100));
  const data = [{ value: pct, fill: color }];
  return (
    <div className="relative flex flex-col items-center">
      <div style={{ position: 'relative', width: '100%', height: 130 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius={42} outerRadius={58} data={data} startAngle={90} endAngle={-270} barSize={10}>
            <RadialBar dataKey="value" cornerRadius={6} background={{ fill: P.border }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: P.textHi, lineHeight: 1 }}>
            {value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value}
          </span>
          <span style={{ fontSize: 9, color: P.textMd, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 -mt-1">
        {trend > 0 ? <ArrowUpRight size={10} color="#22c55e" /> : <ArrowDownRight size={10} color="#ef4444" />}
        <span style={{ fontSize: 9, color: trend > 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{Math.abs(trend)}%</span>
        <span style={{ fontSize: 9, color: P.textLo }}>{trendLabel}</span>
      </div>
    </div>
  );
}

// ─── Radial Chart — Stacked (milestone rings) ──────────────────────────────────
function RadialStacked({ items }: { items: { label: string; pct: number; color: string; achieved: boolean }[] }) {
  const { colors: P } = useTheme();
  const data = items.map(it => ({ ...it, value: it.pct }));
  return (
    <div style={{ position: 'relative', width: '100%', height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius={22} outerRadius={88} data={data} startAngle={90} endAngle={-270} barSize={8} barGap={3}>
          <RadialBar dataKey="value" cornerRadius={4} background={{ fill: P.border }} />
          <RTooltip
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              return (
                <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, padding: '6px 10px' }}>
                  <p style={{ fontSize: 10, color: P.textHi, fontWeight: 700 }}>{d?.label}</p>
                  <p style={{ fontSize: 9, color: d?.achieved ? '#22c55e' : P.textMd }}>{d?.achieved ? '✓ Achieved' : `${d?.pct}%`}</p>
                </div>
              );
            }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Radial Chart — Shape (single bold arc, utilization) ───────────────────────
function RadialShape({ value, label, sublabel, color }: { value: number; label: string; sublabel: string; color: string }) {
  const { colors: P } = useTheme();
  const data = [{ value: Math.min(100, value), fill: color }];
  return (
    <div style={{ position: 'relative', width: '100%', height: 120 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius={35} outerRadius={52} data={data} startAngle={180} endAngle={0} barSize={14}>
          <RadialBar dataKey="value" cornerRadius={7} background={{ fill: P.border }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, textAlign: 'center' }}>
        <span style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{value}%</span>
        <p style={{ fontSize: 9, color: P.textMd, marginTop: 2 }}>{label}</p>
        <p style={{ fontSize: 8, color: P.textLo }}>{sublabel}</p>
      </div>
    </div>
  );
}

function AnimatedCounter({ value, decimals = 0, prefix = '', suffix = '' }: { value: number; decimals?: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!isInView) return;
    const dur = 1400, t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      setDisplay(value * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [isInView, value]);
  return <span ref={ref} style={{ fontFamily: 'var(--font-mono)' }}>{prefix}{decimals ? display.toFixed(decimals) : Math.round(display).toLocaleString()}{suffix}</span>;
}
// ─── Peak Label — shows floating badge only on the max value point ──────────────
function makePeakLabel(data: number[], color: string, card: string) {
  const max = Math.max(...data.filter(v => v != null));
  return (props: any) => {
    const { x, y, width = 0, value } = props;
    if (value == null || value !== max) return null;
    const cx = x + width / 2;
    const fmt = value >= 1000 ? `${(value / 1000).toFixed(1)}K` : String(value);
    const bw = fmt.length * 6.5 + 14;
    return (
      <g>
        {/* connector dot glow */}
        <circle cx={cx} cy={y} r={5} fill={color} opacity={0.25} />
        <circle cx={cx} cy={y} r={3} fill={color} />
        {/* badge */}
        <rect x={cx - bw / 2} y={y - 28} width={bw} height={18} rx={5}
          fill={card} stroke={color} strokeWidth={1.2} />
        {/* triangle pointer */}
        <polygon
          points={`${cx - 4},${y - 11} ${cx + 4},${y - 11} ${cx},${y - 6}`}
          fill={card} stroke={color} strokeWidth={1.2} strokeLinejoin="round" />
        <text x={cx} y={y - 16} textAnchor="middle"
          style={{ fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)', fill: color }}>
          {fmt}
        </text>
      </g>
    );
  };
}

function MiniSparkline({ data, color, h = 28 }: { data: number[]; color: string; h?: number }) {
  if (!data.length || data.every(v => v === 0)) return null;
  const mx = Math.max(...data), mn = Math.min(...data), r = mx - mn || 1, w = 72;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - mn) / r) * (h - 4) - 2}`).join(' ');
  const uid = `s-${color.replace('#', '')}-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs><linearGradient id={uid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.3} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
      <polyline fill="none" stroke={color} strokeWidth={1.5} points={pts} strokeLinecap="round" strokeLinejoin="round" />
      <polygon fill={`url(#${uid})`} points={`0,${h} ${pts} ${w},${h}`} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// §3  DASHBOARD-EXCLUSIVE VISUALIZATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/* ── 3A  ORBIT HEALTH GAUGE — semicircle SVG score ── */
function OrbitGauge({ score, label, size = 160 }: { score: number; label: string; size?: number }) {
  const { colors: P } = useTheme();
  const r = (size - 20) / 2;
  const circ = Math.PI * r;
  const offset = circ - (Math.min(score, 100) / 100) * circ;
  const trackColor = P.border;
  const needleAngle = -180 + (Math.min(score, 100) / 100) * 180;
  const col = score >= 75 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626';
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 16} viewBox={`0 0 ${size} ${size / 2 + 16}`}>
        {/* Track */}
        <path d={`M 10,${size / 2 + 6} A ${r},${r} 0 0,1 ${size - 10},${size / 2 + 6}`}
          fill="none" stroke={trackColor} strokeWidth={10} strokeLinecap="round" />
        <path d={`M 10,${size / 2 + 6} A ${r},${r} 0 0,1 ${size - 10},${size / 2 + 6}`}
          fill="none" stroke={col} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s ease-out' }} />
        {/* Needle */}
        <g transform={`translate(${size / 2}, ${size / 2 + 6})`}>
          <line x1="0" y1="0" x2={r - 16} y2="0"
            stroke={P.textHi} strokeWidth={2} strokeLinecap="round"
            transform={`rotate(${needleAngle})`}
            style={{ transition: 'transform 1.5s cubic-bezier(.22,1,.36,1)' }} />
          <circle r={4} fill={P.textHi} />
        </g>
        {/* Score text */}
        <text x={size / 2} y={size / 2 - 6} textAnchor="middle" fontWeight={700} fontSize={28}
          fill={col}>{Math.round(score)}</text>
        <text x={size / 2} y={size / 2 + 6} textAnchor="middle" fontSize={9}
          fill={P.textLo} fontWeight={600}>/ 100</text>
      </svg>
      <p className="text-[10px] font-bold -mt-1" style={{ color: P.textMd }}>{label}</p>
    </div>
  );
}

/* ── 3B  BURN RATE SPEEDOMETER — spending velocity ── */
function BurnRateGauge({ rate, size = 130 }: { rate: number; size?: number }) {
  const { colors: P } = useTheme();
  const r = (size - 16) / 2;
  const fullArc = Math.PI * 1.5;  // 270° arc
  const offset = fullArc * r - (Math.min(Math.abs(rate), 200) / 200) * fullArc * r;
  const col = rate > 120 ? '#dc2626' : rate > 80 ? '#d97706' : '#059669';
  const lbl = rate > 120 ? 'Over-burning' : rate > 80 ? 'On-track' : 'Under-budget';
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={P.border} strokeWidth={8}
          strokeDasharray={`${fullArc * r} ${2 * Math.PI * r}`} strokeLinecap="round"
          transform={`rotate(135, ${size / 2}, ${size / 2})`} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={8}
          strokeDasharray={`${fullArc * r} ${2 * Math.PI * r}`}
          strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(135, ${size / 2}, ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1.3s ease-out' }} />
        <text x={size / 2} y={size / 2 - 4} textAnchor="middle" fontWeight={700} fontSize={22} fill={col}>
          {Math.round(rate)}%
        </text>
        <text x={size / 2} y={size / 2 + 12} textAnchor="middle" fontSize={8} fill={P.textLo} fontWeight={700}>
          BURN RATE
        </text>
      </svg>
      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${col}15`, color: col }}>
        {lbl}
      </span>
    </div>
  );
}

/* ── 3C  PORTFOLIO PULSE — animated status strip ── */
function PortfolioPulse({ statuses }: { statuses: { status: string; count: number; color: string }[] }) {
  const { colors: P } = useTheme();
  const total = statuses.reduce((s, v) => s + v.count, 0);
  if (total === 0) return null;
  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden" style={{ background: P.border }}>
        {statuses.map((s, i) => (
          <motion.div key={s.status} className="h-full" initial={{ width: 0 }}
            animate={{ width: `${(s.count / total) * 100}%` }}
            transition={{ duration: 0.8, delay: i * 0.1, ease: EASE }}
            style={{ background: s.color }} title={`${s.status}: ${s.count}`} />
        ))}
      </div>
      <div className="flex items-center gap-4 mt-2.5 flex-wrap">
        {statuses.map(s => (
          <div key={s.status} className="flex items-center gap-1.5 text-[10px]">
            <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            <span className="capitalize" style={{ color: P.textMd }}>{s.status.replace('_', ' ')}</span>
            <span className="font-bold" style={{ color: P.textHi }}>{s.count}</span>
            <span style={{ color: P.textDim }}>({Math.round((s.count / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 3D  (removed — replaced by Calendar in render) ── */

/* ── 3E  PROJECT TIMELINE — horizontal schedule view ── */
function ProjectTimeline({ projects }: { projects: { name: string; budget: number; progress: number; status: string; startDate?: string; endDate?: string }[] }) {
  const { colors: P } = useTheme();
  if (!projects.length) return <p className="text-[11px]" style={{ color: P.textLo }}>No project data</p>;

  const now = new Date();
  // Build a 12-month window centered around now ( -2 to +9 )
  const months: { date: Date; label: string }[] = [];
  for (let m = -2; m <= 9; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() + m, 1);
    months.push({ date: d, label: d.toLocaleDateString('en-US', { month: 'short' }) });
  }
  const windowStart = months[0].date.getTime();
  const windowEnd = new Date(now.getFullYear(), now.getMonth() + 10, 0).getTime();
  const spanMs = windowEnd - windowStart;

  const toPercent = (ts: number) => Math.max(0, Math.min(100, ((ts - windowStart) / spanMs) * 100));
  const todayPct = toPercent(now.getTime());

  return (
    <div className="space-y-0">
      {/* Month header */}
      <div className="flex items-end mb-1.5 pl-[140px]">
        {months.map((m, i) => (
          <div key={i} className="flex-1 text-center text-[8px] font-semibold pb-1"
            style={{ color: m.date.getMonth() === now.getMonth() ? P.accent : P.textDim }}>{m.label}</div>
        ))}
      </div>

      {/* Grid area */}
      <div className="relative">
        {/* Vertical grid lines */}
        <div className="absolute inset-0 flex pointer-events-none" style={{ marginLeft: '140px' }}>
          {months.map((m, i) => (
            <div key={i} className="flex-1" style={{ borderLeft: `1px ${m.date.getMonth() === now.getMonth() ? 'solid' : 'dashed'} ${m.date.getMonth() === now.getMonth() ? P.accent + '30' : P.border + '60'}` }} />
          ))}
        </div>

        {/* Today marker */}
        <div className="absolute top-0 bottom-0 z-10 pointer-events-none" style={{ left: `calc(140px + ${todayPct}% * (1 - 140 / 100))` }}>
          <div className="w-px h-full" style={{ background: P.accent, opacity: 0.4 }} />
        </div>

        {/* Project rows */}
        {projects.slice(0, 10).map((proj, pi) => {
          const sc = statusColorMap[proj.status] || P.textLo;
          // Derive start/end from data or synthesize from index
          const sDate = proj.startDate ? new Date(proj.startDate) : new Date(now.getFullYear(), now.getMonth() - 1 + pi * 0.5, 1);
          const eDate = proj.endDate ? new Date(proj.endDate) : new Date(sDate.getTime() + 120 * 86400000 + pi * 15 * 86400000);
          const barLeft = toPercent(sDate.getTime());
          const barRight = toPercent(eDate.getTime());
          const barWidth = Math.max(3, barRight - barLeft);
          const isOverdue = eDate < now && proj.progress < 100;

          return (
            <div key={pi} className="flex items-center py-[5px] group" style={{ borderTop: pi > 0 ? `1px solid ${P.border}30` : 'none' }}>
              {/* Name + status dot */}
              <div className="w-[140px] shrink-0 pr-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sc }} />
                <span className="truncate text-[10px] font-medium" style={{ color: P.textMd }}>{proj.name}</span>
              </div>
              {/* Bar area */}
              <div className="flex-1 h-6 relative">
                {/* Track */}
                <motion.div className="absolute h-[14px] top-1/2 -translate-y-1/2 rounded-md"
                  initial={{ width: 0, opacity: 0 }}
                  whileInView={{ width: `${barWidth}%`, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: pi * 0.04, ease: EASE }}
                  style={{ left: `${barLeft}%`, background: `${sc}12`, border: `1px solid ${sc}25` }}>
                  {/* Filled progress */}
                  <motion.div className="absolute inset-y-0 left-0 rounded-md"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(proj.progress / 100) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, delay: pi * 0.04 + 0.3, ease: EASE }}
                    style={{ background: `${sc}50` }} />
                  {/* Progress label */}
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[7px] font-bold tabular-nums"
                    style={{ color: sc }}>{proj.progress}%</span>
                </motion.div>
                {/* Overdue indicator */}
                {isOverdue && (
                  <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full flex items-center justify-center"
                    style={{ left: `${barLeft + barWidth + 0.5}%`, background: '#dc262618' }}>
                    <AlertTriangle size={7} style={{ color: '#dc2626' }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}



/* ── 3H  TREND DELTA CARDS — This Month vs Last Month ── */
function TrendDelta({ label, current, previous, format, icon: Icon, color }: {
  label: string; current: number; previous: number; format: 'number' | 'omr'; icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; color: string;
}) {
  const { colors: P } = useTheme();
  const delta = previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0;
  const trendState = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const trendColor = trendState === 'up' ? '#22c55e' : trendState === 'down' ? '#ef4444' : P.textDim;
  const trendBg = trendState === 'up' ? 'rgba(34,197,94,0.12)' : trendState === 'down' ? 'rgba(239,68,68,0.12)' : `${P.border}`;
  const fmt = (v: number) => format === 'omr' ? `${(v / 1000).toFixed(0)}K` : v.toLocaleString();
  return (
    <div className="p-3.5 rounded-xl" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
      <div className="flex items-center justify-between mb-3">
        <div className="h-8 w-8 flex items-center justify-center">
          <Icon size={14} style={{ color }} />
        </div>
        <span className={cn('px-1.5 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-0.5')}
          style={{ background: trendBg, color: trendColor }}>
          {trendState === 'up' ? <ArrowUpRight size={8} /> : trendState === 'down' ? <ArrowDownRight size={8} /> : <ArrowRight size={8} />}
          {Math.abs(delta)}%
        </span>
      </div>
      <p className="text-[10px] mb-1" style={{ color: P.textLo }}>{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold tabular-nums" style={{ color: P.textHi }}>{fmt(current)}</span>
        <span className="text-[10px]" style={{ color: P.textDim }}>vs {fmt(previous)}</span>
      </div>
    </div>
  );
}

/* ── 3I  GANTT STRIP — project timeline view ── */
function GanttStrip({ projects }: { projects: { name: string; status: string; progress: number; createdAt?: string }[] }) {
  const { colors: P } = useTheme();
  if (!projects.length) return <p className="text-[11px]" style={{ color: P.textLo }}>No project data</p>;

  const now = new Date();
  const monthLabels: string[] = [];
  for (let m = -3; m <= 8; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() + m, 1);
    monthLabels.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
  }
  const totalMonths = monthLabels.length;

  return (
    <div className="space-y-0">
      {/* Header row */}
      <div className="flex items-center mb-2">
        <div className="w-[140px] shrink-0" />
        <div className="flex-1 flex">
          {monthLabels.map((lbl, i) => (
            <div key={i} className="flex-1 text-center text-[7px] font-bold" style={{ color: P.textDim }}>{lbl}</div>
          ))}
        </div>
      </div>
      {/* Grid lines */}
      <div className="relative">
        <div className="absolute inset-0 flex pointer-events-none" style={{ marginLeft: '140px' }}>
          {monthLabels.map((_, i) => (
            <div key={i} className="flex-1" style={{ borderLeft: `1px ${i === 3 ? 'solid' : 'dashed'} ${i === 3 ? P.accent + '40' : P.border}` }} />
          ))}
        </div>
        {/* Project rows */}
        {projects.slice(0, 8).map((proj, pi) => {
          const sc = statusColorMap[proj.status] || P.textLo;
          const startOffset = pi * 0.7 + 2;                          // simulate start months offset
          const barWidth = Math.max(2, proj.progress / 100 * (totalMonths - startOffset - 1));
          const barLeft = (startOffset / totalMonths) * 100;
          const barW = (barWidth / totalMonths) * 100;
          return (
            <div key={pi} className="flex items-center py-1.5 group" style={{ borderTop: `1px solid ${P.border}20` }}>
              <div className="w-[140px] shrink-0 pr-3 truncate text-[10px] font-medium" style={{ color: P.textMd }}>
                {proj.name}
              </div>
              <div className="flex-1 h-5 relative">
                <motion.div className="absolute h-full rounded-md"
                  initial={{ width: 0 }} whileInView={{ width: `${barW}%` }}
                  viewport={{ once: true }} transition={{ duration: 0.8, delay: pi * 0.06, ease: EASE }}
                  style={{ left: `${barLeft}%`, background: sc, opacity: 0.7 }}>
                  {/* Progress marker */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full" style={{ background: sc, boxShadow: `0 0 6px ${sc}` }} />
                </motion.div>
              </div>
              <div className="w-12 text-right text-[9px] font-bold tabular-nums pl-2" style={{ color: sc }}>{proj.progress}%</div>
            </div>
          );
        })}
      </div>
      {/* "Now" label */}
      <div className="flex items-center mt-1">
        <div className="w-[140px] shrink-0" />
        <div className="flex-1 relative">
          <div className="absolute" style={{ left: `${(3 / totalMonths) * 100}%`, top: -4 }}>
            <div className="text-[7px] font-bold px-1 py-0.5 rounded-full" style={{ background: `${P.accent}20`, color: P.accent }}>NOW</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 3J  ENGAGEMENT MATRIX — dimensional scoring ── */
function EngagementMatrix({ data }: { data: { dimension: string; score: number; trend: number }[] }) {
  const { colors: P } = useTheme();
  return (
    <div className="space-y-3">
      {data.map((d, i) => {
        const col = d.score >= 75 ? '#059669' : d.score >= 50 ? '#d97706' : '#dc2626';
        return (
          <motion.div key={d.dimension} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.06, ease: EASE }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium" style={{ color: P.textMd }}>{d.dimension}</span>
              <div className="flex items-center gap-2">
                {d.trend !== 0 && (
                  <span className="text-[8px] flex items-center gap-0.5" style={{ color: d.trend > 0 ? '#059669' : '#dc2626' }}>
                    {d.trend > 0 ? <ArrowUpRight size={8} /> : <ArrowDownRight size={8} />}
                    {Math.abs(d.trend)}%
                  </span>
                )}
                <span className="text-[10px] font-bold tabular-nums" style={{ color: col }}>{d.score}</span>
              </div>
            </div>
            <div className="h-2 rounded-full" style={{ background: P.border }}>
              <motion.div className="h-full rounded-full" style={{ background: col }}
                initial={{ width: 0 }} whileInView={{ width: `${d.score}%` }}
                viewport={{ once: true }} transition={{ duration: 0.8, delay: i * 0.06 + 0.2, ease: EASE }} />
            </div>
          </motion.div>
        );
      })}
      <div className="flex items-center justify-center gap-4 mt-3 pt-3" style={{ borderTop: `1px solid ${P.border}` }}>
        {[{ l: 'Excellent (75+)', c: '#059669' }, { l: 'Moderate (50-74)', c: '#d97706' }, { l: 'Needs Work (<50)', c: '#dc2626' }].map(lg => (
          <div key={lg.l} className="flex items-center gap-1.5 text-[8px]">
            <div className="w-2 h-2 rounded-full" style={{ background: lg.c }} />
            <span style={{ color: P.textDim }}>{lg.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 3K  PARTNER TIERS — visual breakdown ── */
function PartnerTiers({ partners }: { partners: any[] }) {
  const { colors: P } = useTheme();
  const tierColors = {
    platinum:  { bg: '#7c3aed', label: 'Platinum', threshold: 50000 },
    gold:      { bg: '#d97706', label: 'Gold',     threshold: 20000 },
    silver:    { bg: '#94a3b8', label: 'Silver',    threshold: 5000 },
    bronze:    { bg: '#cd7f32', label: 'Bronze',    threshold: 0 },
  };

  const categorized = partners.map(p => {
    const tier =
      p.totalContribution >= tierColors.platinum.threshold ? 'platinum' :
      p.totalContribution >= tierColors.gold.threshold ? 'gold' :
      p.totalContribution >= tierColors.silver.threshold ? 'silver' : 'bronze';
    return { ...p, tier };
  });

  const tierCounts = Object.keys(tierColors).map(t => ({
    tier: t,
    ...tierColors[t as keyof typeof tierColors],
    count: categorized.filter(p => p.tier === t).length,
    total: categorized.filter(p => p.tier === t).reduce((s: number, p: any) => s + (p.totalContribution || 0), 0),
  }));

  if (!partners.length) return <div className="text-center py-8"><p className="text-[11px]" style={{ color: P.textLo }}>No partner data</p></div>;

  return (
    <div className="space-y-3">
      {/* Tier summary */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {tierCounts.map(tc => (
          <div key={tc.tier} className="text-center p-2.5 rounded-xl" style={{ background: `${tc.bg}08`, border: `1px solid ${tc.bg}15` }}>
            <p className="text-base font-bold" style={{ color: tc.bg }}>{tc.count}</p>
            <p className="text-[8px] font-bold uppercase tracking-wider" style={{ color: `${tc.bg}90` }}>{tc.label}</p>
            <p className="text-[7px] mt-1" style={{ color: P.textDim }}>{(tc.total / 1000).toFixed(0)}K OMR</p>
          </div>
        ))}
      </div>
      {/* Partner list */}
      {categorized.slice(0, 5).map((p, i) => {
        const tc = tierColors[p.tier as keyof typeof tierColors];
        return (
          <motion.div key={p.id || i} initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.06, ease: EASE }}
            className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
            <div className="h-3 w-3 rounded-full shrink-0" style={{ background: tc.bg }} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold truncate" style={{ color: P.textHi }}>{p.name}</p>
              <p className="text-[8px]" style={{ color: P.textDim }}>{p.type} · {tc.label} tier</p>
            </div>
            <span className="text-[10px] font-bold tabular-nums" style={{ color: P.textHi }}>
              {(p.totalContribution / 1000).toFixed(0)}K
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── 3L  PROJECT HEALTH MATRIX ── */
function ProjectHealthMatrix({ projects }: { projects: any[] }) {
  const { colors: P } = useTheme();
  const navigate = useNavigate();
  if (!projects.length) return <p className="text-[11px] text-center py-6" style={{ color: P.textLo }}>No project data available</p>;

  return (
    <div className="rounded-xl overflow-x-auto" style={{ border: `1px solid ${P.border}` }}>
      <table className="w-full text-[11px]">
        <thead>
          <tr style={{ background: P.surface }}>
            {['Project', 'Status', 'Progress', 'Budget', 'Health', 'Risk'].map(h => (
              <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold uppercase tracking-wider" style={{ color: P.textLo }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {projects.map((p: any, i: number) => {
            const sc = statusColorMap[p.status] || P.textLo;
            const healthScore = Math.round(
              (p.progress || 0) * 0.4 +
              (p.budget > 0 ? Math.min(100, (1 - Math.abs(p.progress - 50) / 50) * 100) : 50) * 0.3 +
              (p.status === 'active' ? 80 : p.status === 'completed' ? 100 : 40) * 0.3
            );
            const healthColor = healthScore >= 70 ? '#059669' : healthScore >= 45 ? '#d97706' : '#dc2626';
            const riskLevel = p.progress < 30 && p.status === 'active' ? 'High' : p.progress < 60 ? 'Medium' : 'Low';
            const riskColor = riskLevel === 'High' ? '#dc2626' : riskLevel === 'Medium' ? '#d97706' : '#059669';
            return (
              <motion.tr key={p.id || i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
                viewport={{ once: true }} transition={{ delay: i * 0.03 }}
                className="cursor-pointer transition-colors" onClick={() => navigate(`/projects/${p.id}`)}
                style={{ borderTop: `1px solid ${P.border}` }}
                onMouseEnter={e => (e.currentTarget.style.background = `${P.accent}06`)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td className="px-3 py-2.5 font-medium" style={{ color: P.textHi }}>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: sc }} />
                    {p.name}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span className="px-2 py-0.5 rounded-full text-[8px] font-bold capitalize" style={{ background: `${sc}10`, color: sc }}>
                    {(p.status || '').replace('_', ' ')}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full" style={{ background: P.border }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${p.progress}%`, background: sc }} />
                    </div>
                    <span className="text-[9px] tabular-nums font-bold" style={{ color: P.textMd }}>{p.progress}%</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 tabular-nums font-bold" style={{ color: P.textHi }}>{(p.budget / 1000).toFixed(0)}K</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-1.5 rounded-full" style={{ background: P.border }}>
                      <div className="h-full rounded-full" style={{ width: `${healthScore}%`, background: healthColor }} />
                    </div>
                    <span className="text-[9px] font-bold" style={{ color: healthColor }}>{healthScore}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span className="px-2 py-0.5 rounded-full text-[8px] font-bold" style={{ background: `${riskColor}10`, color: riskColor }}>
                    {riskLevel}
                  </span>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── 3M  REGIONAL FOOTPRINT ── */


/* ── 3O  DAILY ACTIVITY HEATMAP — week×hour grid ── */
function ActivityHeatmap({ activities }: { activities: any[] }) {
  const { colors: P } = useTheme();
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Build heatmap grid 7 days × 4 time slots
  const grid = Array.from({ length: 7 }, () => Array(4).fill(0));
  activities.forEach(a => {
    const d = new Date(a.createdAt);
    const day = d.getDay();
    const hour = d.getHours();
    const slot = hour < 6 ? 0 : hour < 12 ? 1 : hour < 18 ? 2 : 3;
    grid[day][slot]++;
  });
  const maxCell = Math.max(...grid.flat(), 1);
  const slotLabels = ['Night', 'Morning', 'Afternoon', 'Evening'];

  return (
    <div>
      <div className="flex items-center gap-1 mb-2">
        <div className="w-12" />
        {slotLabels.map(s => (
          <div key={s} className="flex-1 text-center text-[7px] font-bold" style={{ color: P.textDim }}>{s}</div>
        ))}
      </div>
      {dayLabels.map((day, di) => (
        <div key={day} className="flex items-center gap-1 mb-1">
          <span className="w-12 text-[8px] font-bold text-right pr-2" style={{ color: P.textLo }}>{day}</span>
          {grid[di].map((count, si) => {
            const intensity = count / maxCell;
            const bg = intensity > 0.7 ? P.accent : intensity > 0.4 ? '#d97706' : intensity > 0.1 ? `${P.accent}30` : P.border;
            return (
              <motion.div key={si} className="flex-1 h-6 rounded-md relative group cursor-default"
                initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }} transition={{ delay: (di * 4 + si) * 0.015, ease: EASE }}
                style={{ background: bg, opacity: Math.max(intensity, 0.2) }}>
                {count > 0 && (
                  <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold"
                    style={{ color: intensity > 0.5 ? '#fff' : P.textMd }}>
                    {count}
                  </span>
                )}
                {/* Tooltip */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg text-[8px] font-bold opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-opacity"
                  style={{ background: P.card, border: `1px solid ${P.borderHi}`, color: P.textHi, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                  {day} {slotLabels[si]}: {count} actions
                </div>
              </motion.div>
            );
          })}
        </div>
      ))}
      <div className="flex items-center justify-center gap-2 mt-3">
        <span className="text-[7px]" style={{ color: P.textDim }}>Less</span>
        {[0.15, 0.35, 0.55, 0.75, 1].map((op, i) => (
          <div key={i} className="w-3 h-3 rounded" style={{ background: P.accent, opacity: op }} />
        ))}
        <span className="text-[7px]" style={{ color: P.textDim }}>More</span>
      </div>
    </div>
  );
}

/* ── 3P  BUDGET EFFICIENCY INDICATOR ── */
function BudgetEfficiencyRing({ spent, budget }: { spent: number; budget: number }) {
  const { colors: P } = useTheme();
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const remaining = budget - spent;
  const col = pct > 90 ? '#dc2626' : pct > 70 ? '#d97706' : '#059669';
  const r = 50, cx = 65, cy = 65, circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="flex items-center gap-5">
      <svg width={130} height={130} viewBox="0 0 130 130">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={P.border} strokeWidth={10} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={10}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90, ${cx}, ${cy})`}
          style={{ transition: 'stroke-dashoffset 1.2s ease-out' }} />
        <text x={cx} y={cy - 6} textAnchor="middle" fontWeight={700} fontSize={22} fill={col}>{pct}%</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize={8} fill={P.textLo}>consumed</text>
      </svg>
      <div className="space-y-3 flex-1">
        <div>
          <p className="text-[9px] uppercase tracking-wider font-bold" style={{ color: P.textDim }}>Total Budget</p>
          <p className="text-base font-bold tabular-nums" style={{ color: P.textHi }}>{(budget / 1000).toFixed(0)}K OMR</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider font-bold" style={{ color: P.textDim }}>Spent</p>
          <p className="text-base font-bold tabular-nums" style={{ color: col }}>{(spent / 1000).toFixed(0)}K OMR</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider font-bold" style={{ color: P.textDim }}>Remaining</p>
          <p className="text-base font-bold tabular-nums" style={{ color: remaining >= 0 ? '#059669' : '#dc2626' }}>
            {remaining >= 0 ? '' : '-'}{(Math.abs(remaining) / 1000).toFixed(0)}K OMR
          </p>
        </div>
      </div>
    </div>
  );
}

function RegionalFootprint({ regions, totalProjects, totalBudget }: { regions: any[]; totalProjects: number; totalBudget: number }) {
  const { colors: P } = useTheme();
  if (!regions.length) return <p className="text-[11px] text-center py-6" style={{ color: P.textLo }}>No regional data</p>;

  const maxCount = regions[0]?.count || 1;

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-xl text-center" style={{ background: `${P.accent}06`, border: `1px solid ${P.accent}10` }}>
          <p className="text-lg font-bold" style={{ color: P.accent }}>{regions.length}</p>
          <p className="text-[8px] font-bold uppercase tracking-wider" style={{ color: P.textDim }}>Active Regions</p>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ background: '#2563eb06', border: '1px solid #2563eb10' }}>
          <p className="text-lg font-bold" style={{ color: '#2563eb' }}>{totalProjects}</p>
          <p className="text-[8px] font-bold uppercase tracking-wider" style={{ color: P.textDim }}>Total Projects</p>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ background: '#0d948806', border: '1px solid #0d948810' }}>
          <p className="text-lg font-bold" style={{ color: '#0d9488' }}>{(totalBudget / 1000).toFixed(0)}K</p>
          <p className="text-[8px] font-bold uppercase tracking-wider" style={{ color: P.textDim }}>Budget (OMR)</p>
        </div>
      </div>
      {/* Region bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
        {regions.map((r: any, i: number) => {
          const pct = Math.round((r.count / maxCount) * 100);
          const share = totalProjects > 0 ? Math.round((r.count / totalProjects) * 100) : 0;
          return (
            <motion.div key={r.region} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
              viewport={{ once: true }} transition={{ delay: i * 0.04, ease: EASE }}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <PiGlobeDuotone size={10} style={{ color: CHART_C[i % CHART_C.length] }} />
                  <span className="text-[10px] font-medium" style={{ color: P.textMd }}>{r.region}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tabular-nums" style={{ color: P.textHi }}>{r.count}</span>
                  <span className="text-[8px] px-1 py-0.5 rounded" style={{ background: P.surface, color: P.textDim }}>{share}%</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: P.border }}>
                <motion.div className="h-full rounded-full"
                  initial={{ width: 0 }} whileInView={{ width: `${pct}%` }}
                  viewport={{ once: true }} transition={{ duration: 0.7, delay: i * 0.04 + 0.15, ease: EASE }}
                  style={{ background: CHART_C[i % CHART_C.length] }} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// §3.5  SIDEBAR AI CHAT
// ═══════════════════════════════════════════════════════════════════════════════
type AiChatMsg = { role: 'user' | 'ai'; text: string; charts?: AiChart[]; findings?: string[] };

function SidebarMiniChart({ chart, idx }: { chart: AiChart; idx: number }) {
  const { colors: P } = useTheme();
  const COLORS = ['#4F8EF7','#34d399','#f59e0b','#a78bfa','#f472b6','#38bdf8','#C9C036','#f87171'];
  const col = COLORS[idx % COLORS.length];

  if (!chart.data?.length) return null;

  const firstRow = chart.data[0] ?? {};
  const xKey = chart.xKey ?? Object.keys(firstRow)[0] ?? 'x';
  const yKeys = chart.yKeys?.length
    ? chart.yKeys
    : Object.keys(firstRow).filter(k => k !== xKey && !isNaN(Number(firstRow[k])));
  const yKey = yKeys[0] ?? Object.keys(firstRow).find(k => k !== xKey) ?? 'value';

  const axisProps = { axisLine: false as const, tickLine: false as const, tick: { fill: P.textDim, fontSize: 7 } };

  // ── pie / donut ──────────────────────────────────────────────────────────────
  if (chart.type === 'donut' || chart.type === 'pie') {
    const pieData = chart.data.map((d, i) => ({
      name: String(d[xKey]),
      value: Number(d[yKey]) || 0,
      fill: COLORS[i % COLORS.length],
    }));
    const inner = chart.type === 'pie' ? 0 : 22;
    return (
      <div style={{ height: 110 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} dataKey="value" cx="50%" cy="50%"
              innerRadius={inner} outerRadius={42} paddingAngle={2}>
              {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
            </Pie>
            <RTooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ── bar ──────────────────────────────────────────────────────────────────────
  if (chart.type === 'bar') {
    return (
      <div style={{ height: 110 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart.data} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke={P.border} vertical={false} />
            <XAxis dataKey={xKey} {...axisProps} />
            <YAxis hide />
            <RTooltip content={<ChartTooltip />} />
            {yKeys.map((k, i) => (
              <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} maxBarSize={18}>
                <LabelList content={makePeakLabel(chart.data.map(r => Number(r[k]) || 0), COLORS[i % COLORS.length], P.card)} />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ── area ─────────────────────────────────────────────────────────────────────
  if (chart.type === 'area') {
    return (
      <div style={{ height: 110 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsAreaChart data={chart.data} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
            <defs>
              {yKeys.map((k, i) => (
                <linearGradient key={k} id={`sg-${idx}-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="2 2" stroke={P.border} vertical={false} />
            <XAxis dataKey={xKey} {...axisProps} />
            <YAxis hide />
            <RTooltip content={<ChartTooltip />} />
            {yKeys.map((k, i) => (
              <Area key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]}
                fill={`url(#sg-${idx}-${i})`} strokeWidth={1.5} dot={false} />
            ))}
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ── radar ────────────────────────────────────────────────────────────────────
  if (chart.type === 'radar') {
    const radarData = chart.data.map(r => ({ axis: String(r[xKey]), value: Number(r[yKey]) || 0 }));
    return (
      <div style={{ height: 130 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top: 6, right: 14, left: 14, bottom: 6 }}>
            <PolarGrid stroke={P.border} />
            <PolarAngleAxis dataKey="axis" tick={{ fill: P.textLo, fontSize: 7 }} />
            <PolarRadiusAxis tick={false} axisLine={false} />
            <Radar dataKey="value" stroke={col} fill={col} fillOpacity={0.15} strokeWidth={1.5}
              dot={(p: any) => <circle key={`${p.cx}-${p.cy}`} cx={p.cx} cy={p.cy} r={2.5} fill={col} stroke={P.card} strokeWidth={1} />} />
            <RTooltip content={<ChartTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ── line (default) ───────────────────────────────────────────────────────────
  const vals = chart.data.map(r => Number(r[yKey]) || 0);
  return (
    <div style={{ height: 110 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chart.data} margin={{ top: 20, right: 6, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 2" stroke={P.border} vertical={false} />
          <XAxis dataKey={xKey} {...axisProps} />
          <YAxis hide />
          <RTooltip content={<ChartTooltip />} />
          <Line type="monotone" dataKey={yKey} stroke={col} strokeWidth={2}
            dot={{ r: 3, fill: col, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: col }}>
            <LabelList content={makePeakLabel(vals, col, P.card)} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function SidebarAiChat() {
  const { colors: P } = useTheme();
  const [msgs, setMsgs] = useState<AiChatMsg[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: (q: string) => aiAnalyticsService.analyze(q, 'overview'),
    onSuccess: (res: any, q: string) => {
      const r = res?.data ?? res;
      setMsgs(prev => [
        ...prev,
        { role: 'user', text: q },
        {
          role: 'ai',
          text: r?.analysis ?? r?.summary ?? 'No response.',
          charts: r?.chartData ?? [],
          findings: r?.keyFindings ?? [],
        },
      ]);
    },
  });

  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs]);

  const send = () => {
    const q = input.trim();
    if (!q || ask.isPending) return;
    ask.mutate(q);
    setInput('');
  };

  const suggestions = [
    'Budget overview',
    'Top categories by progress',
    'Beneficiary impact this year',
    'Which projects are at risk?',
  ];

  return (
    <div className="flex flex-col" style={{ gap: 0 }}>
      {/* header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 flex items-center justify-center">
          <PiBrainDuotone size={13} style={{ color: P.accent }} />
        </div>
        <div>
          <p className="text-xs font-bold" style={{ color: P.textHi, fontFamily: 'var(--font-serif)' }}>AI Insight</p>
          <p className="text-[9px]" style={{ color: P.textLo }}>Ask about your dashboard data</p>
        </div>
      </div>

      {/* suggestion chips — only when no messages */}
      {msgs.length === 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {suggestions.map(s => (
            <button key={s} onClick={() => { setInput(s); }}
              className="text-[8px] px-2 py-1 rounded-full cursor-pointer transition-colors"
              style={{ background: `${P.accent}10`, color: P.accent, border: `1px solid ${P.accent}20` }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* chat scroll area */}
      {msgs.length > 0 && (
        <div ref={scrollRef} className="rounded-xl mb-3 space-y-3 overflow-y-auto"
          style={{ maxHeight: 420, padding: '10px 8px', background: P.surface, border: `1px solid ${P.border}` }}>
          {msgs.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              {m.role === 'user' ? (
                <div className="max-w-[85%] rounded-xl px-3 py-2 text-[10px]"
                  style={{ background: `${P.accent}18`, color: P.textHi, border: `1px solid ${P.accent}25` }}>
                  {m.text}
                </div>
              ) : (
                <div className="w-full space-y-2">
                  {/* AI icon row */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="h-5 w-5 flex items-center justify-center">
                      <PiBrainDuotone size={10} style={{ color: P.accent }} />
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: P.accent }}>AI</span>
                  </div>
                  {/* analysis text — truncated with expand */}
                  <p className="text-[10px] leading-[1.55]" style={{ color: P.textMd }}>{m.text}</p>
                  {/* key findings */}
                  {m.findings && m.findings.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {m.findings.slice(0, 3).map((f, fi) => (
                        <div key={fi} className="flex items-start gap-1.5">
                          <div className="mt-[3px] h-1.5 w-1.5 rounded-full shrink-0" style={{ background: P.accent }} />
                          <p className="text-[9px]" style={{ color: P.textLo }}>{f}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* charts */}
                  {m.charts && m.charts.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {m.charts.map((c, ci) => (
                        <div key={ci} className="rounded-lg p-2.5" style={{ background: P.card, border: `1px solid ${P.border}` }}>
                          <p className="text-[8px] font-bold uppercase tracking-wider mb-2" style={{ color: P.textLo }}>{c.title}</p>
                          <SidebarMiniChart chart={c} idx={ci} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {ask.isPending && (
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 flex items-center justify-center">
                <PiBrainDuotone size={10} style={{ color: P.accent }} />
              </div>
              <div className="flex gap-1">
                {[0, 1, 2].map(d => (
                  <motion.div key={d} className="h-1.5 w-1.5 rounded-full"
                    style={{ background: P.accent }}
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: d * 0.2 }} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* input */}
      <div className="flex items-center gap-2 rounded-xl px-3 py-2"
        style={{ background: P.card, border: `1px solid ${P.border}` }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask about your data…"
          className="flex-1 bg-transparent text-[10px] outline-none placeholder:opacity-40"
          style={{ color: P.textHi, fontFamily: 'var(--font-sans)' }}
        />
        <button onClick={send} disabled={!input.trim() || ask.isPending}
          className="h-6 w-6 flex items-center justify-center transition-all disabled:opacity-30 cursor-pointer"
          style={{ color: P.accent }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// §4  STATUS / RISK MAPS
// ═══════════════════════════════════════════════════════════════════════════════
const statusColorMap: Record<string, string> = { active: '#38bdf8', completed: '#34d399', planning: '#E91E63', on_hold: '#fbbf24', archived: '#f87171' };

// ═══════════════════════════════════════════════════════════════════════════════
// §4.4  BENTO CHAT CELL  (real AI chat inside the dark bento grid)
// ═══════════════════════════════════════════════════════════════════════════════

type BentoChatMsg = { from: 'user' | 'ai'; text: string; charts?: AiChart[]; findings?: string[] };

function BentoChatCell() {
  const { colors: P } = useTheme();
  const B_CARD    = P.card;
  const B_BORDER  = P.border;
  const B_TXT_XLO = P.textDim;

  const [msgs, setMsgs] = useState<BentoChatMsg[]>([
    { from: 'ai', text: 'Hi, how can I help you today?' },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: (q: string) => aiAnalyticsService.analyze(q, 'overview'),
    onSuccess: (res: any, q: string) => {
      const r = res?.data ?? res;
      setMsgs(prev => [
        ...prev,
        { from: 'user', text: q },
        {
          from: 'ai',
          text: r?.analysis ?? r?.summary ?? 'No response.',
          charts: r?.chartData ?? [],
          findings: r?.keyFindings ?? [],
        },
      ]);
    },
    onError: () => {
      setMsgs(prev => [...prev, { from: 'ai', text: "Sorry, I couldn't connect to the AI service right now." }]);
    },
  });

  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs]);

  const send = () => {
    const q = input.trim();
    if (!q || ask.isPending) return;
    ask.mutate(q);
    setInput('');
  };

  return (
    <div style={{ background: B_CARD, border: `1px solid ${B_BORDER}`, borderRadius: 12, padding: 16, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 260, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, marginBottom: 10, borderBottom: `1px solid ${B_BORDER}`, flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${P.accent}12`, border: `1px solid ${P.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={P.accent} strokeWidth="1.5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, color: P.textHi, fontWeight: 600, margin: 0 }}>CSR Assistant</p>
          <p style={{ fontSize: 10, color: B_TXT_XLO, margin: 0 }}>ai@csrplatform.om</p>
        </div>
        {ask.isPending && (
          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
            {[0, 1, 2].map(d => (
              <motion.div key={d} style={{ width: 4, height: 4, borderRadius: '50%', background: P.textDim }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: d * 0.2 }} />
            ))}
          </div>
        )}
      </div>

      {/* Scrollable messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10, paddingRight: 2, position: 'relative' }}>
        {/* MetaBalls — empty state only, burgundy like FuturePortal */}
        {msgs.length === 1 && !ask.isPending && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.72 }}>
            <MetaBallsGuard>
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
            </MetaBallsGuard>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start' }}>
            {m.from === 'user' ? (
              <p style={{
                fontSize: 11, lineHeight: 1.55, padding: '7px 12px', borderRadius: 16, maxWidth: '90%', margin: 0,
                background: `${P.accent}12`, color: P.textHi,
                border: `1px solid ${P.accent}20`,
              }}>
                {m.text}
              </p>
            ) : (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <p style={{
                  fontSize: 11, lineHeight: 1.55, padding: '7px 12px', borderRadius: 16, margin: 0,
                  border: `1px solid ${B_BORDER}`, color: P.textMd,
                }}>
                  {m.text}
                </p>
                {/* key findings */}
                {m.findings && m.findings.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '2px 4px' }}>
                    {m.findings.slice(0, 3).map((f, fi) => (
                      <div key={fi} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: P.textDim, flexShrink: 0, marginTop: 4 }} />
                        <p style={{ fontSize: 9, color: P.textLo, margin: 0, lineHeight: 1.5 }}>{f}</p>
                      </div>
                    ))}
                  </div>
                )}
                {/* charts */}
                {m.charts && m.charts.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {m.charts.map((c, ci) => (
                      <div key={ci} style={{ borderRadius: 8, padding: 10, background: P.surface, border: `1px solid ${B_BORDER}` }}>
                        <p style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: P.textDim, marginBottom: 6 }}>{c.title}</p>
                        <SidebarMiniChart chart={c} idx={ci} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 20, border: `1px solid ${B_BORDER}`, flexShrink: 0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Type your message..."
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 11, color: P.textHi, fontFamily: 'inherit' }}
        />
        <button onClick={send} disabled={!input.trim() || ask.isPending}
          style={{
            width: 24, height: 24, borderRadius: 8, border: 'none', cursor: input.trim() && !ask.isPending ? 'pointer' : 'default',
            background: input.trim() && !ask.isPending ? `${P.accent}20` : P.surface,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s',
          }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={input.trim() && !ask.isPending ? P.accent : P.textDim} strokeWidth="2.5">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// §4.5  BENTO PLATFORM SNAPSHOT  (mirrors Landing Page Section 2 — dark bento)
// ═══════════════════════════════════════════════════════════════════════════════
interface BentoPlatformSnapshotProps {
  kpis: any;
  totalBudget: number;
  utilization: number;
  budgetTrend: { month: string; budget: number; spent: number }[];
  topPartners: any[];
}
function BentoPlatformSnapshot({ kpis, totalBudget, utilization, budgetTrend, topPartners }: BentoPlatformSnapshotProps) {
  /* ── always dark — same exact tokens as BentoShowcase on the landing page ── */
  const BG      = '#060606';
  const CARD    = '#111111';
  const BORDER  = 'rgba(255,255,255,0.06)';
  const TXT_HI  = '#ffffff';
  const TXT_LO  = 'rgba(255,255,255,0.4)';
  const TXT_XLO = 'rgba(255,255,255,0.25)';

  /* ── bar heights from real budget trend ── */
  const maxSpent = Math.max(...budgetTrend.map(t => t.spent), 1);
  const BARS = budgetTrend.length >= 4
    ? budgetTrend.slice(-8).map(t => Math.max(8, Math.round((t.spent / maxSpent) * 100)))
    : [65, 45, 55, 70, 40, 60, 75, 50];
  const GOAL_BARS = [40, 55, 35, 60, 45, 70, 50, 65, 55, 40, 60, 45, 50, 55];

  /* ── current-month calendar ── */
  const now       = new Date();
  const yr        = now.getFullYear();
  const mo        = now.getMonth();
  const today     = now.getDate();
  const monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const firstDay  = new Date(yr, mo, 1).getDay();
  const daysInMo  = new Date(yr, mo + 1, 0).getDate();

  /* ── budget sparkline from real data ── */
  const spkData = budgetTrend.slice(-6);

  const cardStyle: React.CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, overflow: 'hidden' };

  return (
    <div style={{ background: BG, borderRadius: 16, padding: 20, border: `1px solid ${BORDER}` }}>
      {/* ── section header ── */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.5)' }} />
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: TXT_XLO }}>Platform Snapshot</span>
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: TXT_HI, margin: 0 }}>Everything You Need, Beautifully Organized</h3>
        <p style={{ fontSize: 12, color: TXT_LO, marginTop: 2 }}>
          A unified workspace to manage CSR projects, track impact, and make data-driven decisions — all in one elegant interface.
        </p>
      </div>

      {/* ── 4-column bento grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">

        {/* ═══ COLUMN 1 ═══ */}
        <div className="flex flex-col gap-3">

          {/* Total Budget */}
          <div style={cardStyle}>
            <p style={{ fontSize: 13, color: TXT_LO, fontWeight: 500 }}>Total Budget</p>
            <p style={{ fontSize: 26, fontWeight: 800, color: TXT_HI, marginTop: 6, letterSpacing: '-0.02em', fontFamily: "'DM Sans', sans-serif" }}>
              OMR {totalBudget >= 1_000_000 ? `${(totalBudget / 1_000_000).toFixed(2)}M` : `${(totalBudget / 1000).toFixed(0)}K`}
            </p>
            <p style={{ fontSize: 11, color: '#34d399', marginTop: 2 }}>{utilization}% utilised · {budgetTrend.length} month trend</p>
            {spkData.length >= 2 && (() => {
              const mv = Math.max(...spkData.map(t => t.spent), 1);
              const pts = spkData.map((t, i) => [
                (i / (spkData.length - 1)) * 200,
                50 - (t.spent / mv) * 40,
              ] as [number, number]);
              const dPath = `M${pts.map(([x, y]) => `${x},${y}`).join(' L')}`;
              return (
                <svg viewBox="0 0 200 50" className="w-full mt-4 h-12" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="bSpkDB" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
                      <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                    </linearGradient>
                  </defs>
                  <path d={dPath} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="none" />
                  <path d={`${dPath} L200,50 L0,50 Z`} fill="url(#bSpkDB)" />
                  {pts.map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r="2.5" fill="rgba(255,255,255,0.35)" />
                  ))}
                </svg>
              );
            })()}
          </div>

          {/* Top Partners */}
          <div style={cardStyle}>
            <p style={{ fontSize: 14, fontWeight: 600, color: TXT_HI }}>Top Partners</p>
            <p style={{ fontSize: 12, color: TXT_XLO, marginTop: 2, marginBottom: 14 }}>Active contributors to CSR goals.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topPartners.slice(0, 3).map((p: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>{p.name?.charAt(0) ?? '?'}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                    <p style={{ fontSize: 10, color: TXT_XLO }}>OMR {(+(p.totalContribution ?? 0) / 1000).toFixed(1)}K</p>
                  </div>
                  <span style={{ fontSize: 10, color: TXT_XLO, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                    {p.type ?? 'Corp'}
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
                  </span>
                </div>
              ))}
              {topPartners.length === 0 && <p style={{ fontSize: 11, color: TXT_XLO }}>No partners yet</p>}
            </div>
          </div>

          {/* Alert Settings */}
          <div style={cardStyle}>
            <p style={{ fontSize: 14, fontWeight: 600, color: TXT_HI }}>Alert Settings</p>
            <p style={{ fontSize: 12, color: TXT_XLO, marginTop: 2, marginBottom: 14 }}>Manage your alert preferences.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Budget Alerts',  desc: 'Track spending vs. allocated amounts', on: utilization > 70 },
                { label: 'Timeline Risks', desc: 'Deadline approaching warnings',         on: (kpis?.activeProjects ?? 0) > 0 },
              ].map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{t.label}</p>
                    <p style={{ fontSize: 10, color: TXT_XLO, marginTop: 2 }}>{t.desc}</p>
                  </div>
                  <div style={{ width: 36, height: 20, borderRadius: 10, position: 'relative', flexShrink: 0, marginLeft: 12, background: t.on ? '#ffffff' : 'rgba(255,255,255,0.08)' }}>
                    <div style={{ position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%', left: t.on ? 18 : 2, background: t.on ? '#111111' : 'rgba(255,255,255,0.25)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ═══ COLUMN 2 ═══ */}
        <div className="flex flex-col gap-3">

          {/* Active Projects counter + bars */}
          <div style={cardStyle}>
            <p style={{ fontSize: 13, color: TXT_LO, fontWeight: 500 }}>Active Projects</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: TXT_HI, marginTop: 6, letterSpacing: '-0.02em', fontFamily: "'DM Sans', sans-serif" }}>
              +{kpis?.activeProjects ?? 0}
            </p>
            <p style={{ fontSize: 11, color: '#34d399', marginTop: 2 }}>of {kpis?.totalProjects ?? 0} total projects</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginTop: 16, height: 40 }}>
              {BARS.map((h, i) => (
                <div key={i} style={{ flex: 1, borderRadius: 3, background: 'rgba(255,255,255,0.07)', height: `${h}%` }} />
              ))}
            </div>
          </div>

          {/* AI Chat — functional */}
          <BentoChatCell />

        </div>

        {/* ═══ COLUMN 3 — Calendar ═══ */}
        <div className="flex flex-col gap-3">
          <div style={{ ...cardStyle, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" style={{ cursor: 'pointer' }}>
                <path d="M15 18l-6-6 6-6" />
              </svg>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{monthLabel}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" style={{ cursor: 'pointer' }}>
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px 0', textAlign: 'center' }}>
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                <span key={d} style={{ fontSize: 10, color: TXT_XLO, fontWeight: 500, paddingBottom: 8, display: 'block' }}>{d}</span>
              ))}
              {Array.from({ length: firstDay }, (_, i) => <span key={`pad${i}`} />)}
              {Array.from({ length: daysInMo }, (_, i) => {
                const day = i + 1;
                const isToday = day === today;
                return (
                  <span key={day} style={{
                    fontSize: 12, padding: '6px 0', borderRadius: 6, cursor: 'pointer', display: 'block',
                    background: isToday ? '#ffffff' : 'transparent',
                    color: isToday ? '#060606' : 'rgba(255,255,255,0.3)',
                    fontWeight: isToday ? 700 : 400,
                  }}>
                    {day}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══ COLUMN 4 ═══ */}
        <div className="flex flex-col gap-3">

          {/* Impact Goal */}
          <div style={cardStyle}>
            <p style={{ fontSize: 14, fontWeight: 600, color: TXT_HI }}>Impact Goal</p>
            <p style={{ fontSize: 12, color: TXT_XLO, marginTop: 2 }}>Set your quarterly impact target.</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, margin: '16px 0' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TXT_XLO} strokeWidth="2"><path d="M5 12h14" /></svg>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 34, fontWeight: 800, color: TXT_HI, lineHeight: 1, letterSpacing: '-0.02em', fontFamily: "'DM Sans', sans-serif" }}>
                  {(kpis?.totalBeneficiaries ?? 0).toLocaleString()}
                </p>
                <p style={{ fontSize: 9, color: TXT_XLO, letterSpacing: '0.18em', fontWeight: 600, marginTop: 4 }}>BENEFICIARIES</p>
              </div>
              <div style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TXT_XLO} strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 32, marginBottom: 14 }}>
              {GOAL_BARS.map((h, i) => (
                <div key={i} style={{ flex: 1, borderRadius: 2, background: 'rgba(255,255,255,0.06)', height: `${h}%` }} />
              ))}
            </div>
            <button style={{ width: '100%', padding: '10px 0', borderRadius: 20, border: `1px solid ${BORDER}`, fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 500, cursor: 'pointer', background: 'transparent' }}
              onClick={() => window.location.assign('/reports/impact')}>
              View Impact Report
            </button>
          </div>

          {/* Beneficiary Reach sparkline */}
          <div style={{ ...cardStyle, flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: TXT_HI }}>Beneficiary Reach</p>
            <p style={{ fontSize: 12, color: TXT_XLO, marginTop: 2, marginBottom: 16 }}>Your reach is ahead of where you normally are.</p>
            <svg viewBox="0 0 200 80" style={{ width: '100%', height: 120 }} preserveAspectRatio="none">
              <defs>
                <linearGradient id="gGradDB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.04)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </linearGradient>
              </defs>
              <path d="M0,65 C15,60 30,52 55,48 S85,55 105,42 S135,30 160,28 S185,20 200,15"
                stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" fill="none" />
              <path d="M0,65 C15,60 30,52 55,48 S85,55 105,42 S135,30 160,28 S185,20 200,15 L200,80 L0,80 Z"
                fill="url(#gGradDB)" />
              {([[0,65],[55,48],[105,42],[160,28],[200,15]] as [number,number][]).map(([x,y],i) => (
                <circle key={i} cx={x} cy={y} r="3" fill="rgba(255,255,255,0.3)" />
              ))}
            </svg>
          </div>

        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// §5  MAIN DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const navigate = useNavigate();
  const { colors: P, isDark } = useTheme();
  const user = useAuthStore(s => s.user);
  const [refreshKey, setRefreshKey] = useState(0);
  const [budgetTimeRange, setBudgetTimeRange] = useState<'90d' | '30d' | '7d'>('90d');

  /* ── API ── */
  const { data: dashRes, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['dashboard', refreshKey],
    queryFn: () => dashboardService.getDashboard(),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const d = (dashRes as any)?.data;

  /* ── Future/Forecast data ── */
  const { data: futureRes } = useQuery({
    queryKey: ['future-data'],
    queryFn: () => futureService.getFutureData(),
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
  const futureData: FutureData | null = (futureRes as any)?.data ?? null;

  /* ─── DERIVED DATA ─── */
  const kpis = d?.kpis;
  const trends = d?.trends;
  const budgetTrend = useMemo<{ month: string; budget: number; spent: number }[]>(() => d?.budgetTrend ?? [], [d]);

  const statusDist = useMemo(() => (d?.projectsByStatus ?? []).map((s: any) => ({
    status: s.status, count: s.count, color: statusColorMap[s.status] || '#71717a',
  })), [d]);
  const recentProjects: any[] = d?.recentProjects ?? [];
  const recentAlerts: any[] = d?.recentAlerts ?? [];
  const recentActivities: any[] = d?.recentActivities ?? [];
  const topPartners: any[] = d?.topPartners ?? [];
  const sdgAlignment: any[] = d?.sdgAlignment?.slice(0, 8) ?? [];
  const beneficiaryDemo: any[] = d?.beneficiaryDemographics ?? [];
  const budgetAllocation: any[] = d?.budgetAllocation ?? [];
  const satisfactionScore = d?.satisfactionScore ?? 0;
  const avgDuration = d?.avgDurationMonths ?? 0;
  const categoryData = useMemo(() => (d?.projectsByCategory ?? []).map((c: any) => ({ name: c.category, count: c.count })), [d]);
  const regionData = useMemo(() => [...(d?.projectsByRegion ?? [])].sort((a: any, b: any) => b.count - a.count), [d]);

  // Computed metrics
  const totalBudget = kpis?.totalBudget ?? 0;
  const totalSpent = kpis?.totalSpent ?? 0;
  const utilization = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const burnRate = useMemo(() => {
    if (budgetTrend.length < 2 || totalBudget === 0) return 0;
    const last3 = budgetTrend.slice(-3);
    const avgMonthlySpend = last3.reduce((s, m) => s + m.spent, 0) / last3.length;
    const expectedMonthly = totalBudget / 12;
    return expectedMonthly > 0 ? Math.round((avgMonthlySpend / expectedMonthly) * 100) : 0;
  }, [budgetTrend, totalBudget]);

  const budgetAreaData = useMemo(() => {
    if (!budgetTrend.length) return [] as Array<{ date: string; budget: number; spent: number }>;

    const referenceDate = new Date();
    referenceDate.setDate(1);

    const normalized = budgetTrend.map((item, idx) => {
      const date = new Date(referenceDate);
      date.setMonth(referenceDate.getMonth() - (budgetTrend.length - 1 - idx));
      return {
        date: date.toISOString().slice(0, 10),
        budget: item.budget,
        spent: item.spent,
      };
    });

    // Densify monthly points into a smoother daily-like flow.
    const dense: Array<{ date: string; budget: number; spent: number }> = [];
    if (normalized.length === 1) {
      dense.push(normalized[0]);
    } else {
      for (let i = 0; i < normalized.length - 1; i++) {
        const curr = normalized[i];
        const next = normalized[i + 1];
        const currDate = new Date(curr.date);
        const nextDate = new Date(next.date);
        const gapDays = Math.max(1, Math.round((nextDate.getTime() - currDate.getTime()) / 86400000));
        const steps = Math.min(40, Math.max(14, gapDays));

        for (let s = 0; s < steps; s++) {
          const t = s / steps;
          const eased = t * t * (3 - 2 * t); // smoothstep for natural transition
          const pointDate = new Date(currDate);
          pointDate.setDate(currDate.getDate() + Math.round(t * gapDays));

          const baseBudget = curr.budget + (next.budget - curr.budget) * eased;
          const baseSpent = curr.spent + (next.spent - curr.spent) * eased;
          const phase = i * 37 + s;
          const waveBudget = 0.62 * Math.sin(phase * 0.72) + 0.38 * Math.sin(phase * 1.86 + 1.15);
          const waveSpent = 0.58 * Math.sin(phase * 0.8 + 0.9) + 0.42 * Math.sin(phase * 2.1 + 0.35);
          const oscillation = budgetTimeRange === '7d' ? 0.18 : budgetTimeRange === '30d' ? 0.145 : 0.11;

          dense.push({
            date: pointDate.toISOString().slice(0, 10),
            budget: Math.max(0, baseBudget + baseBudget * oscillation * waveBudget),
            spent: Math.max(0, baseSpent + baseSpent * (oscillation + 0.018) * waveSpent),
          });
        }
      }

      dense.push(normalized[normalized.length - 1]);
    }

    const daysToSubtract = budgetTimeRange === '30d' ? 30 : budgetTimeRange === '7d' ? 7 : 90;
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);

    return dense.filter(item => new Date(item.date) >= startDate);
  }, [budgetTrend, budgetTimeRange]);

  // Performance radar
  const radarData = useMemo(() => {
    if (!kpis) return [];
    const completionRate = kpis.totalProjects > 0 ? (kpis.completedProjects / kpis.totalProjects) * 100 : 0;
    const budgetScore = totalBudget > 0 ? Math.min(100, Math.round((1 - Math.abs(totalSpent / totalBudget - 0.7)) * 100)) : 50;
    return [
      { metric: 'Budget', value: budgetScore },
      { metric: 'Timeline', value: Math.min(100, Math.round(completionRate + 20)) },
      { metric: 'Quality', value: satisfactionScore },
      { metric: 'Impact', value: Math.min(100, (kpis.totalBeneficiaries > 0 ? 85 : 40)) },
      { metric: 'Partners', value: Math.min(100, topPartners.length * 20 + 30) },
      { metric: 'Innovation', value: Math.min(100, sdgAlignment.length * 10 + 20) },
    ];
  }, [kpis, totalBudget, totalSpent, satisfactionScore, topPartners.length, sdgAlignment.length]);
  const overallScore = radarData.length ? Math.round(radarData.reduce((s, r) => s + r.value, 0) / radarData.length) : 0;

  /* ── KPI cards config ── */
  const kpiCards = useMemo(() => {
    if (!kpis) return [];
    return [
      { label: 'Total Projects',  value: kpis.totalProjects,       trend: trends?.projects ?? 0,       icon: PiFoldersDuotone,       color: '#E91E63', format: 'num'  as const },
      { label: 'Active',          value: kpis.activeProjects,       trend: 0,                           icon: PiLightningDuotone,     color: '#38bdf8', format: 'num'  as const },
      { label: 'Total Budget',    value: totalBudget,               trend: trends?.budget ?? 0,         icon: PiWalletDuotone,        color: '#34d399', format: 'omr'  as const },
      { label: 'Total Spent',     value: totalSpent,                trend: 0,                           icon: PiCurrencyDollarDuotone, color: '#f87171', format: 'omr'  as const },
      { label: 'Beneficiaries',   value: kpis.totalBeneficiaries,   trend: trends?.beneficiaries ?? 0,  icon: PiHeartDuotone,         color: '#a78bfa', format: 'num'  as const },
      { label: 'Utilization',     value: utilization,               trend: 0,                           icon: PiGaugeDuotone,         color: utilization > 85 ? '#dc2626' : utilization > 60 ? '#b45309' : '#0f766e', format: 'pct' as const },
    ];
  }, [kpis, trends, totalBudget, totalSpent, utilization]);

  /* ── Export ── */
  const exportCols: ExportColumn[] = useMemo(() => [
    { key: 'metric', header: 'Metric', width: 25 },
    { key: 'value', header: 'Value', width: 20 },
    { key: 'trend', header: 'Trend', width: 15 },
  ], []);
  const getExportData = useCallback(() => kpiCards.map(k => ({
    metric: k.label,
    value: k.format === 'omr' ? `${(k.value / 1000).toFixed(0)}K OMR` : k.format === 'pct' ? `${k.value}%` : k.value,
    trend: k.trend > 0 ? `+${k.trend}%` : `${k.trend}%`,
  })), [kpiCards]);
  const handleExportExcel = useCallback(() => {
    exportToExcel(getExportData(), { filename: 'dashboard_export', title: 'Dashboard Overview', columns: exportCols });
  }, [getExportData, exportCols]);
  const handlePrint = useCallback(() => {
    printTable(getExportData(), exportCols, 'Dashboard Overview');
  }, [getExportData, exportCols]);

  /* ── Greeting ── */
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
  }, []);

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div style={{ background: P.bg }} className="min-h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-14 w-14 rounded-full border-[3px] border-t-transparent animate-spin" style={{ borderColor: P.accent, borderTopColor: 'transparent' }} />
            <div className="absolute inset-0 h-14 w-14 rounded-full border-[3px] border-t-transparent animate-spin"
              style={{ borderColor: `${P.accent}30`, borderTopColor: 'transparent', animationDirection: 'reverse', animationDuration: '1.5s' }} />
            <PiBrainDuotone size={18} className="absolute inset-0 m-auto" style={{ color: P.accent }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: P.textMd }}>Loading Command Center…</p>
          <p className="text-[10px]" style={{ color: P.textDim }}>Aggregating portfolio data</p>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ background: P.bg }} className="min-h-full relative overflow-x-hidden">
      <div className="flex items-start max-w-[1800px] mx-auto relative" style={{ zIndex: 1 }}>
      {/* ── Main scrollable content ── */}
      <div className="flex-1 min-w-0 px-6 py-5 space-y-6">

        {/* ═══════════════ ROW 0 : CINEMATIC HEADER ═══════════════ */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="-mx-6 -mt-5 mb-2">
          <div style={{ background: '#080808', position: 'relative', overflow: 'hidden', padding: '36px 28px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {/* Noise grain */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`, backgroundSize: '128px 128px', opacity: 0.04, pointerEvents: 'none' }} />
            {/* Glow blobs */}
            <div style={{ position: 'absolute', left: '5%', top: '-10%', width: 380, height: 380, borderRadius: '50%', background: 'rgba(74,222,128,0.06)', filter: 'blur(120px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', right: '10%', bottom: '-30%', width: 300, height: 300, borderRadius: '50%', background: 'rgba(37,99,235,0.07)', filter: 'blur(100px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', right: '35%', top: '10%', width: 200, height: 200, borderRadius: '50%', background: 'rgba(168,85,247,0.04)', filter: 'blur(80px)', pointerEvents: 'none' }} />

            {/* ── Main row ── */}
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
              <div>
                {/* Badge row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.22)', borderRadius: 999, padding: '3px 12px', fontSize: 10, fontWeight: 700, color: '#4ade80', letterSpacing: '0.08em' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 0 3px rgba(74,222,128,0.2)', display: 'inline-block' }} />
                    LIVE
                  </span>
                  <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.22)', fontWeight: 500 }}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                {/* Greeting */}
                <h1 style={{ fontFamily: "'Caveat', cursive", fontSize: 'clamp(2rem, 3.8vw, 3.2rem)', fontWeight: 700, color: '#ffffff', lineHeight: 1.1, margin: '0 0 10px', letterSpacing: '-0.01em' }}>
                  {greeting}, {user?.name?.split(' ')[0] || 'there'}
                </h1>
                <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.32)', margin: 0, lineHeight: 1.7, maxWidth: 520 }}>
                  CSR Operations Dashboard — Portfolio intelligence &amp; execution status across Oman's 11 governorates
                </p>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
                <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { setRefreshKey(k => k + 1); refetch(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
                  <PiArrowsClockwiseBold size={12} className={isRefetching ? 'animate-spin' : ''} style={{ color: '#4ade80' }} />
                  Refresh
                </motion.button>
                <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} onClick={handleExportExcel}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 11, fontWeight: 600, background: 'rgba(13,148,136,0.12)', color: '#2dd4bf', border: '1px solid rgba(13,148,136,0.28)', borderRadius: 10, cursor: 'pointer' }}>
                  <PiExportDuotone size={12} />
                  Excel
                </motion.button>
                <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} onClick={handlePrint}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 11, fontWeight: 600, background: 'rgba(37,99,235,0.12)', color: '#93c5fd', border: '1px solid rgba(37,99,235,0.28)', borderRadius: 10, cursor: 'pointer' }}>
                  <PiPrinterDuotone size={12} />
                  Print
                </motion.button>
              </div>
            </div>

          </div>
        </motion.div>

        {/* ═══════════════ ROW 2 : PORTFOLIO PULSE ═══════════════ */}
        <motion.div variants={scaleIn(0.05)} initial="hidden" whileInView="show" viewport={VP}>
          <GlassCard className="p-5">
            <SectionHeader icon={PiPulseDuotone} title="Portfolio Pulse" subtitle="Live status distribution across all projects" />
            <PortfolioPulse statuses={statusDist} />
          </GlassCard>
        </motion.div>

        {/* ═══════════════ ROW 3 : GAUGES + EFFICIENCY RATIOS + BENEFICIARY DEMOGRAPHICS ═══════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Health Gauges — vertical */}
          <motion.div variants={scaleIn(0)} initial="hidden" whileInView="show" viewport={VP}>
            <GlassCard className="p-5 h-full flex flex-col">
              <SectionHeader icon={PiGaugeDuotone} title="Health Gauges" subtitle="Portfolio score & spending velocity" />
              <div className="flex flex-col items-center gap-3 flex-1 justify-center">
                <OrbitGauge score={overallScore} label="Portfolio Health" />
                <BurnRateGauge rate={burnRate} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Satisfaction', value: `${satisfactionScore}%`, color: satisfactionScore > 70 ? '#059669' : '#d97706' },
                  { label: 'Avg Duration', value: `${avgDuration}mo`, color: '#2563eb' },
                  { label: 'Impact Score', value: `${(kpis?.avgImpactScore ?? 0).toFixed(1)}`, color: '#8b5cf6' },
                ].map(m => (
                  <div key={m.label} className="p-2 rounded-xl" style={{ background: `${m.color}08`, border: `1px solid ${m.color}15` }}>
                    <p className="text-sm font-bold" style={{ color: m.color }}>{m.value}</p>
                    <p className="text-[8px] font-bold uppercase tracking-wider mt-0.5" style={{ color: P.textDim }}>{m.label}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Efficiency Ratios — Radial Stacked */}
          <motion.div variants={scaleIn(0.06)} initial="hidden" whileInView="show" viewport={VP}>
            <GlassCard className="p-5 h-full flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-bold" style={{ color: P.textHi }}>March 2026</p>
                  <p className="text-[9px]" style={{ color: P.textLo }}>Efficiency ratios — last 6 months</p>
                </div>
                <div className="h-7 w-7 flex items-center justify-center">
                  <PiGaugeDuotone size={13} style={{ color: P.accent }} />
                </div>
              </div>
              <div className="flex flex-col items-center gap-4 flex-1">
                {/* radial chart */}
                <div style={{ width: 200, height: 200, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      innerRadius={22} outerRadius={90}
                      data={[
                        { name: 'Completion',  value: (kpis?.totalProjects ?? 0) > 0 ? Math.round(((kpis?.completedProjects ?? 0) / (kpis?.totalProjects ?? 1)) * 100) : 0,  fill: '#059669' },
                        { name: 'Active',      value: (kpis?.totalProjects ?? 0) > 0 ? Math.round(((kpis?.activeProjects ?? 0) / (kpis?.totalProjects ?? 1)) * 100) : 0,     fill: '#2563eb' },
                        { name: 'Utilization', value: utilization,  fill: '#7c3aed' },
                        { name: 'On Hold',     value: (kpis?.totalProjects ?? 0) > 0 ? Math.round(((kpis?.onHoldProjects ?? 0) / (kpis?.totalProjects ?? 1)) * 100) : 0,     fill: '#d97706' },
                        { name: 'Impact',      value: Math.min(100, Math.round((kpis?.avgImpactScore ?? 0) * 10)), fill: '#ec4899' },
                      ]}
                      startAngle={90} endAngle={-270} barSize={11} barGap={3}
                    >
                      <RadialBar dataKey="value" cornerRadius={5} background={{ fill: P.border }} />
                      <RTooltip
                        content={({ active, payload }: any) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0]?.payload;
                          return (
                            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, padding: '6px 10px' }}>
                              <p style={{ fontSize: 11, fontWeight: 700, color: d?.fill }}>{d?.name}</p>
                              <p style={{ fontSize: 13, fontWeight: 800, color: P.textHi }}>{d?.value}%</p>
                            </div>
                          );
                        }}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
                {/* legend + trend */}
                <div className="w-full space-y-2">
                  {(() => {
                    const projectTrend = trends?.projects ?? 0;
                    const projectTrendState = projectTrend > 0 ? 'up' : projectTrend < 0 ? 'down' : 'flat';
                    const projectTrendColor = projectTrendState === 'up' ? '#22c55e' : projectTrendState === 'down' ? '#ef4444' : P.textDim;
                    const projectTrendLabel = projectTrendState === 'up' ? 'trending up this month' : projectTrendState === 'down' ? 'trending down this month' : 'stable this month';
                    return (
                  <div className="flex items-center gap-1 mb-1">
                    {projectTrendState === 'up' ? <ArrowUpRight size={11} color={projectTrendColor} /> : projectTrendState === 'down' ? <ArrowDownRight size={11} color={projectTrendColor} /> : <ArrowRight size={11} color={projectTrendColor} />}
                    <span className="text-[10px] font-bold" style={{ color: projectTrendColor }}>
                      {Math.abs(projectTrend)}%
                    </span>
                    <span className="text-[9px]" style={{ color: P.textMd }}>{projectTrendLabel}</span>
                  </div>
                    );
                  })()}
                  {[
                    { name: 'Completion Rate', value: (kpis?.totalProjects ?? 0) > 0 ? Math.round(((kpis?.completedProjects ?? 0) / (kpis?.totalProjects ?? 1)) * 100) : 0, color: '#059669' },
                    { name: 'Active Ratio',    value: (kpis?.totalProjects ?? 0) > 0 ? Math.round(((kpis?.activeProjects ?? 0) / (kpis?.totalProjects ?? 1)) * 100) : 0,    color: '#2563eb' },
                    { name: 'Budget Utilized', value: utilization, color: '#7c3aed' },
                    { name: 'On Hold',         value: (kpis?.totalProjects ?? 0) > 0 ? Math.round(((kpis?.onHoldProjects ?? 0) / (kpis?.totalProjects ?? 1)) * 100) : 0,    color: '#d97706' },
                    { name: 'Impact Score',    value: Math.min(100, Math.round((kpis?.avgImpactScore ?? 0) * 10)), color: '#ec4899' },
                  ].map(item => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                      <span className="text-[10px] flex-1" style={{ color: P.textMd }}>{item.name}</span>
                      <span className="text-[10px] font-bold tabular-nums" style={{ color: P.textHi }}>{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Beneficiary Demographics */}
          <motion.div className="lg:col-span-2" variants={scaleIn(0.08)} initial="hidden" whileInView="show" viewport={VP}>
            <GlassCard className="p-5 h-full">
              <SectionHeader icon={PiUsersThreeDuotone} title="Beneficiary Demographics" />
              {beneficiaryDemo.length > 0 ? (
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={beneficiaryDemo} margin={{ top: 14, right: 10, left: 0, bottom: 0 }} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke={P.border} vertical={false} />
                      <XAxis
                        dataKey="category"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: P.textLo, fontSize: 9 }}
                        minTickGap={20}
                        tickFormatter={(value: string) => {
                          const short = String(value ?? '').trim();
                          return short.length > 10 ? `${short.slice(0, 10)}...` : short;
                        }}
                      />
                      <YAxis hide />
                      <RTooltip
                        cursor={false}
                        wrapperStyle={{ outline: 'none', pointerEvents: 'none' }}
                        content={<BeneficiaryAdvancedTooltip />}
                      />
                      <Bar dataKey="male" name="Male" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                      <Bar dataKey="female" name="Female" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="children" name="Children" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[260px] flex items-center justify-center"><p className="text-[11px]" style={{ color: P.textLo }}>No demographic data</p></div>
              )}
              <div className="flex items-center justify-center gap-5 mt-2">
                {[{ l: 'Male', c: '#3b82f6' }, { l: 'Female', c: '#6366f1' }, { l: 'Children', c: '#8b5cf6' }].map(v => (
                  <div key={v.l} className="flex items-center gap-1.5 text-[10px]">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: v.c }} />
                    <span style={{ color: P.textLo }}>{v.l}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* ═══════════════ ROW 4 : BUDGET TREND + HEAT STRIP ═══════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <motion.div className="lg:col-span-2" variants={scaleIn(0)} initial="hidden" whileInView="show" viewport={VP}>
            <GlassCard className="p-5">
              <div className="border-b pb-4 mb-4" style={{ borderColor: P.border }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: P.textHi }}>Budget & Expenditure Flow</h3>
                    <p className="text-[10px] mt-1" style={{ color: P.textLo }}>Interactive area view with selectable time ranges</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={budgetTimeRange}
                      onChange={(e) => setBudgetTimeRange(e.target.value as '90d' | '30d' | '7d')}
                      className="rounded-lg text-[10px] px-2.5 py-1.5 outline-none"
                      style={{
                        background: P.surface,
                        color: P.textHi,
                        border: `1px solid ${P.border}`,
                      }}
                      aria-label="Select budget time range"
                    >
                      <option value="90d">Last 3 months</option>
                      <option value="30d">Last 30 days</option>
                      <option value="7d">Last 7 days</option>
                    </select>
                    <motion.button whileHover={{ scale: 1.03 }} onClick={() => navigate('/reports/financial')}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer"
                      style={{ background: isDark ? '#1e3a8a2a' : '#0B5CAB14', color: isDark ? '#93c5fd' : CORP.brand, border: `1px solid ${isDark ? '#3b82f660' : '#0B5CAB3d'}` }}>
                      Financial Report <ChevronRight size={10} />
                    </motion.button>
                  </div>
                </div>
              </div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsAreaChart data={budgetAreaData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                    <defs>
                      <linearGradient id="fillBudgetInteractive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8fb3ff" stopOpacity={0.72} />
                        <stop offset="95%" stopColor="#8fb3ff" stopOpacity={0.08} />
                      </linearGradient>
                      <linearGradient id="fillSpentInteractive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f63ff" stopOpacity={0.66} />
                        <stop offset="95%" stopColor="#4f63ff" stopOpacity={0.07} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={P.border} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={34}
                      tick={{ fill: P.textLo, fontSize: 10 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: P.textLo, fontSize: 10 }}
                      width={44}
                      domain={[(min: number) => Math.max(0, min * 0.82), (max: number) => max * 1.18]}
                      tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}K` : `${Math.round(v)}`}
                    />
                    <RTooltip
                      cursor={false}
                      content={({ active, payload, label }: any) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="rounded-lg px-3 py-2" style={{ background: P.card, border: `1px solid ${P.borderHi}`, boxShadow: '0 10px 20px rgba(2,6,23,0.25)' }}>
                            <p className="text-[10px] font-bold mb-1" style={{ color: P.textMd }}>
                              {new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                            {payload.map((entry: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-[10px]">
                                <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
                                <span style={{ color: P.textLo }}>{entry.name}:</span>
                                <span className="font-bold" style={{ color: P.textHi }}>{Math.round(Number(entry.value)).toLocaleString()} OMR</span>
                              </div>
                            ))}
                          </div>
                        );
                      }}
                    />
                    <Area
                      dataKey="spent"
                      name="Spent"
                      type="natural"
                      fill="url(#fillSpentInteractive)"
                      stroke="#4f63ff"
                      strokeWidth={1.7}
                      dot={false}
                      isAnimationActive
                      animationDuration={1400}
                      animationEasing="ease-out"
                      activeDot={{ r: 3, fill: '#4f63ff' }}
                    />
                    <Area
                      dataKey="budget"
                      name="Budget"
                      type="natural"
                      fill="url(#fillBudgetInteractive)"
                      stroke="#8fb3ff"
                      strokeWidth={1.55}
                      dot={false}
                      isAnimationActive
                      animationDuration={1600}
                      animationEasing="ease-out"
                      activeDot={{ r: 3, fill: '#8fb3ff' }}
                    />
                  </RechartsAreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-2">
                {[{ l: 'Budget', c: '#8fb3ff' }, { l: 'Spent', c: '#4f63ff' }].map(v => (
                  <div key={v.l} className="flex items-center gap-2 text-[10px]"><div className="w-3 h-[3px] rounded-full" style={{ background: v.c }} /><span style={{ color: P.textLo }}>{v.l}</span></div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Monthly Spending Line — Label */}
          <motion.div variants={scaleIn(0.08)} initial="hidden" whileInView="show" viewport={VP}>
            <GlassCard className="p-5 h-full flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${P.accent}22, ${P.accent}08)`, border: `1px solid ${P.accent}30` }}>
                    <TrendingUp size={15} style={{ color: P.accent }} />
                  </div>
                  <div>
                    <p className="text-xs font-black tracking-tight" style={{ color: P.textHi }}>Monthly Spend</p>
                    <p className="text-[9px]" style={{ color: P.textDim }}>
                      {budgetTrend.length >= 2 ? `${budgetTrend[0]?.month} → ${budgetTrend[budgetTrend.length - 1]?.month}` : 'Last 12 months'}
                    </p>
                  </div>
                </div>
                {(() => {
                  const pct = trends?.budget ?? 0;
                  const isUp = pct > 0; const isDown = pct < 0;
                  const clr = isUp ? '#22c55e' : isDown ? '#ef4444' : P.textDim;
                  const bg  = isUp ? '#22c55e18' : isDown ? '#ef444418' : `${P.border}`;
                  return (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: bg, border: `1px solid ${clr}30` }}>
                      {isUp ? <ArrowUpRight size={11} color={clr} /> : isDown ? <ArrowDownRight size={11} color={clr} /> : <ArrowRight size={11} color={clr} />}
                      <span className="text-[11px] font-black tabular-nums" style={{ color: clr }}>{Math.abs(pct)}%</span>
                    </div>
                  );
                })()}
              </div>

              {/* KPI row */}
              {(() => {
                const activeMonths = budgetTrend.filter(m => (m.spent ?? 0) > 0);
                const lastActive   = activeMonths.length > 0 ? activeMonths[activeMonths.length - 1] : null;
                const totalSpend   = budgetTrend.reduce((s, m) => s + (m.spent   ?? 0), 0);
                const totalBudget  = budgetTrend.reduce((s, m) => s + (m.budget  ?? 0), 0);
                const peakMonth    = budgetTrend.reduce((best, m) => (m.spent ?? 0) > (best.spent ?? 0) ? m : best, budgetTrend[0] ?? {});
                const avgSpend     = activeMonths.length > 0 ? totalSpend / activeMonths.length : 0;
                const utilPct      = totalBudget > 0 ? Math.min(100, Math.round((totalSpend / totalBudget) * 100)) : 0;
                const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toFixed(0);
                return (
                  <>
                    {/* Top 3 stats */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { label: 'Last Active', value: lastActive ? fmt(lastActive.spent ?? 0) : '—', sub: lastActive?.month ?? '—', color: P.textHi },
                        { label: 'Peak Month',  value: peakMonth  ? fmt(peakMonth.spent  ?? 0) : '—', sub: peakMonth?.month  ?? '—', color: '#fbbf24' },
                        { label: 'Avg / Month', value: fmt(avgSpend), sub: `${activeMonths.length} months`, color: '#34d399' },
                      ].map(s => (
                        <div key={s.label} className="rounded-lg px-2.5 py-2" style={{ background: P.surface ?? P.bg, border: `1px solid ${P.border}` }}>
                          <p className="text-[8px] font-bold uppercase tracking-wider truncate" style={{ color: P.textDim }}>{s.label}</p>
                          <p className="text-sm font-black tabular-nums leading-tight mt-0.5" style={{ color: s.color }}>{s.value}</p>
                          <p className="text-[8px] truncate" style={{ color: P.textDim }}>{s.sub}</p>
                        </div>
                      ))}
                    </div>

                    {/* Budget utilisation bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-bold" style={{ color: P.textDim }}>Budget Utilisation</span>
                        <span className="text-[9px] font-black tabular-nums" style={{ color: utilPct > 85 ? '#f87171' : utilPct > 60 ? '#fbbf24' : '#34d399' }}>{utilPct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: P.border }}>
                        <motion.div className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${utilPct}%` }}
                          transition={{ duration: 1, ease: EASE }}
                          style={{ background: utilPct > 85 ? 'linear-gradient(90deg,#f87171,#ef4444)' : utilPct > 60 ? 'linear-gradient(90deg,#fbbf24,#f59e0b)' : `linear-gradient(90deg,${P.accent},#34d399)` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[8px]" style={{ color: P.textDim }}>Spent: <span className="font-bold" style={{ color: P.textMd }}>{totalSpend.toLocaleString('en-US', { maximumFractionDigits: 0 })} OMR</span></span>
                        <span className="text-[8px]" style={{ color: P.textDim }}>Budget: <span className="font-bold" style={{ color: P.textMd }}>{totalBudget.toLocaleString('en-US', { maximumFractionDigits: 0 })} OMR</span></span>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Chart */}
              <div className="flex-1" style={{ minHeight: 130 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsAreaChart
                    data={budgetTrend.map(m => ({ month: m.month, spent: m.spent, budget: m.budget }))}
                    margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={P.accent} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={P.accent} stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="budgetGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8fb3ff" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#8fb3ff" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={P.border} vertical={false} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: P.textDim, fontSize: 9 }} />
                    <YAxis hide />
                    <RTooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="budget" name="Budget (OMR)"
                      stroke="#8fb3ff" strokeWidth={1.5} strokeDasharray="4 3"
                      fill="url(#budgetGrad)" dot={false} activeDot={false} />
                    <Area type="monotone" dataKey="spent" name="Spent (OMR)"
                      stroke={P.accent} strokeWidth={2.5} fill="url(#spendGrad)"
                      dot={false} activeDot={{ r: 4, fill: P.accent, strokeWidth: 0 }} />
                  </RechartsAreaChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="flex items-center justify-center gap-5 mt-2">
                {[{ l: 'Budget', c: '#8fb3ff', dash: true }, { l: 'Spent', c: P.accent, dash: false }].map(v => (
                  <div key={v.l} className="flex items-center gap-1.5">
                    {v.dash
                      ? <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke={v.c} strokeWidth="2" strokeDasharray="4 2" /></svg>
                      : <div className="w-4 h-[3px] rounded-full" style={{ background: v.c }} />}
                    <span className="text-[9px] font-medium" style={{ color: P.textDim }}>{v.l}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* ═══════════════ ROW 4.5 : FORECAST — Budget & Impact Projections ═══════════════ */}
        {futureData && (futureData.budgetForecast.length > 0 || futureData.impactProjections.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Budget Forecast */}
            {futureData.budgetForecast.length > 0 && (
              <motion.div variants={scaleIn(0)} initial="hidden" whileInView="show" viewport={VP}>
                <GlassCard className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${CHART_C[0]}12`, border: `1px solid ${CHART_C[0]}20` }}>
                        <PiTrendUpDuotone size={16} style={{ color: CHART_C[0] }} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold" style={{ color: P.textHi }}>Budget Forecast</h3>
                        <p className="text-[10px]" style={{ color: P.textLo }}>Next 6 months projected</p>
                      </div>
                    </div>
                    <motion.button whileHover={{ scale: 1.03 }} onClick={() => navigate('/future')}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer"
                      style={{ background: isDark ? '#1e3a8a2a' : '#0B5CAB14', color: isDark ? '#93c5fd' : CORP.brand, border: `1px solid ${isDark ? '#3b82f660' : '#0B5CAB3d'}` }}>
                      Full Forecast <ChevronRight size={10} />
                    </motion.button>
                  </div>

                  <div className="flex gap-4 mb-3">
                    {[
                      { label: 'Projected Budget', color: CHART_C[0] },
                      { label: 'Projected Spend', color: CHART_C[1] },
                      { label: 'Confidence', color: `${CHART_C[4]}` },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded" style={{ background: item.color }} />
                        <span className="text-[10px]" style={{ color: P.textLo }}>{item.label}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={futureData.budgetForecast} margin={{ top: 8, right: 10, left: 0, bottom: 4 }}>
                        <defs>
                          <linearGradient id="dFcBudget" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART_C[0]} stopOpacity={0.25} />
                            <stop offset="100%" stopColor={CHART_C[0]} stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="dFcSpend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART_C[1]} stopOpacity={0.2} />
                            <stop offset="100%" stopColor={CHART_C[1]} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={P.border} vertical={false} />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: P.textLo, fontSize: 10 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: P.textLo, fontSize: 10 }}
                          tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false}
                          tick={{ fill: P.textLo, fontSize: 10 }} domain={[0, 100]}
                          tickFormatter={(v: number) => `${v}%`} />
                        <RTooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="projectedBudget" name="Budget" stroke={CHART_C[0]} fill="url(#dFcBudget)" strokeWidth={2} dot={false} />
                        <Area type="monotone" dataKey="projectedSpend" name="Spend" stroke={CHART_C[1]} fill="url(#dFcSpend)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="confidence" name="Confidence %" stroke={CHART_C[4]} strokeWidth={1.5} strokeDasharray="5 5" dot={false} yAxisId="right" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex justify-between mt-3 p-3 rounded-xl" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                    <div className="text-center">
                      <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: P.textDim }}>Avg Confidence</p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: CHART_C[4] }}>
                        {Math.round(futureData.budgetForecast.reduce((a, b) => a + b.confidence, 0) / futureData.budgetForecast.length)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: P.textDim }}>Projected Budget</p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: CHART_C[0] }}>
                        OMR {(futureData.budgetForecast.reduce((a, b) => a + b.projectedBudget, 0) / 1000).toFixed(0)}k
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: P.textDim }}>Projected Spend</p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: CHART_C[1] }}>
                        OMR {(futureData.budgetForecast.reduce((a, b) => a + b.projectedSpend, 0) / 1000).toFixed(0)}k
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {/* Impact Projections */}
            {futureData.impactProjections.length > 0 && (
              <motion.div variants={scaleIn(0.08)} initial="hidden" whileInView="show" viewport={VP}>
                <GlassCard className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${CHART_C[1]}12`, border: `1px solid ${CHART_C[1]}20` }}>
                        <PiUsersThreeDuotone size={16} style={{ color: CHART_C[1] }} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold" style={{ color: P.textHi }}>Impact Projections</h3>
                        <p className="text-[10px]" style={{ color: P.textLo }}>Beneficiary growth forecast</p>
                      </div>
                    </div>
                    <motion.button whileHover={{ scale: 1.03 }} onClick={() => navigate('/future')}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer"
                      style={{ background: isDark ? '#1e3a8a2a' : '#0B5CAB14', color: isDark ? '#93c5fd' : CORP.brand, border: `1px solid ${isDark ? '#3b82f660' : '#0B5CAB3d'}` }}>
                      Full Analysis <ChevronRight size={10} />
                    </motion.button>
                  </div>

                  <div style={{ height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={futureData.impactProjections} margin={{ top: 8, right: 10, left: 0, bottom: 4 }}>
                        <defs>
                          <linearGradient id="dImpactBar" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART_C[1]} stopOpacity={0.9} />
                            <stop offset="100%" stopColor={CHART_C[1]} stopOpacity={0.4} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={P.border} vertical={false} />
                        <XAxis dataKey="quarter" axisLine={false} tickLine={false} tick={{ fill: P.textLo, fontSize: 10 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: P.textLo, fontSize: 10 }}
                          tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                        <RTooltip content={({ active, payload, label }: any) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="rounded-lg px-3.5 py-2.5 z-[999]" style={{ background: P.card, border: `1px solid ${P.borderHi}`, boxShadow: '0 12px 24px rgba(2,6,23,0.25)' }}>
                              <p className="text-[10px] font-bold mb-1" style={{ color: P.textMd }}>{label}</p>
                              <div className="flex items-center gap-2 text-[10px]">
                                <div className="w-2 h-2 rounded-full" style={{ background: CHART_C[1] }} />
                                <span style={{ color: P.textLo }}>Beneficiaries:</span>
                                <span className="font-bold" style={{ color: P.textHi }}>{payload[0]?.value?.toLocaleString()}</span>
                              </div>
                            </div>
                          );
                        }} />
                        <Bar dataKey="beneficiaries" name="Beneficiaries" fill="url(#dImpactBar)" radius={[6, 6, 0, 0]} maxBarSize={50} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {[
                      {
                        label: 'Total Projected',
                        value: futureData.impactProjections.reduce((a, b) => a + b.beneficiaries, 0).toLocaleString(),
                        icon: PiUsersThreeDuotone, color: CHART_C[1],
                      },
                      {
                        label: 'Growth Rate',
                        value: (() => {
                          const ip = futureData.impactProjections;
                          if (ip.length < 2) return 'N/A';
                          return `+${((ip[ip.length - 1].beneficiaries - ip[0].beneficiaries) / ip[0].beneficiaries * 100).toFixed(0)}%`;
                        })(),
                        icon: PiTrendUpDuotone, color: '#34d399',
                      },
                      {
                        label: 'Peak Quarter',
                        value: futureData.impactProjections.length > 0
                          ? futureData.impactProjections.reduce((max, q) => q.beneficiaries > max.beneficiaries ? q : max, futureData.impactProjections[0]).quarter
                          : 'N/A',
                        icon: PiTargetDuotone, color: P.accent,
                      },
                    ].map(stat => {
                      const StatIcon = stat.icon;
                      return (
                        <div key={stat.label} className="text-center p-3 rounded-xl" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                          <StatIcon size={14} style={{ color: stat.color, margin: '0 auto 4px' }} />
                          <p className="text-sm font-bold" style={{ color: P.textHi }}>{stat.value}</p>
                          <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color: P.textDim }}>{stat.label}</p>
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </div>
        )}

        {/* ═══════════════ ROW 5 : PROJECT TIMELINE ═══════════════ */}
        <motion.div variants={scaleIn(0.05)} initial="hidden" whileInView="show" viewport={VP}>
          <GlassCard className="p-5">
            <SectionHeader icon={PiCalendarCheckDuotone} title="Project Timeline" subtitle="Gantt-style view of active & planning projects" action={
              <motion.button whileHover={{ scale: 1.03 }} onClick={() => navigate('/projects')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer"
                style={{ background: isDark ? '#1e3a8a2a' : '#0B5CAB14', color: isDark ? '#93c5fd' : CORP.brand, border: `1px solid ${isDark ? '#3b82f660' : '#0B5CAB3d'}` }}>
                All Projects <ChevronRight size={10} />
              </motion.button>
            } />
            <GanttStrip projects={recentProjects} />
          </GlassCard>
        </motion.div>


        {/* ═══════════════ ROW 7 : RADAR + BUDGET ALLOCATION + BY CATEGORY ═══════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Radar */}
          <motion.div variants={stagger(0)} initial="hidden" whileInView="show" viewport={VP}>
            <GlassCard className="p-5">
              <SectionHeader icon={PiTargetDuotone} title="Performance Radar" subtitle="Organizational health" />
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={75}>
                    <PolarGrid stroke={P.border} />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: P.textLo, fontSize: 9 }} />
                    <Radar name="Score" dataKey="value" stroke={P.accent} fill={P.accent} fillOpacity={0.15} strokeWidth={2}
                      dot={{ r: 3, fill: P.accent }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-center" style={{ color: P.textDim }}>
                Score: <span className="font-bold" style={{ color: P.accent }}>{overallScore}</span>/100
              </p>
            </GlassCard>
          </motion.div>

          {/* Budget Allocation */}
          <motion.div variants={stagger(0.12)} initial="hidden" whileInView="show" viewport={VP}>
            <GlassCard className="p-5">
              <SectionHeader icon={PiWalletDuotone} title="Budget Allocation" subtitle="Distribution by category (K OMR)" />
              <div style={{ height: 220 }}>
                {budgetAllocation.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={budgetAllocation.map((b: any) => ({ name: b.category, value: b.value }))} cx="50%" cy="50%"
                        innerRadius={45} outerRadius={80} dataKey="value" stroke="none" paddingAngle={2} cornerRadius={4}>
                        {budgetAllocation.map((_: any, i: number) => <Cell key={i} fill={CHART_C[i % CHART_C.length]} opacity={0.8} />)}
                      </Pie>
                      <RTooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center"><p className="text-[11px]" style={{ color: P.textLo }}>No allocation data</p></div>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
                {budgetAllocation.slice(0, 6).map((b: any, i: number) => (
                  <div key={b.category} className="flex items-center gap-1.5 text-[9px]">
                    <div className="w-2 h-2 rounded-full" style={{ background: CHART_C[i % CHART_C.length] }} />
                    <span style={{ color: P.textLo }}>{b.category}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* By Category */}
          <motion.div variants={stagger(0.18)} initial="hidden" whileInView="show" viewport={VP}>
            <GlassCard className="p-5">
              <SectionHeader icon={PiStackDuotone} title="By Category" action={
                <motion.button whileHover={{ scale: 1.03 }} onClick={() => navigate('/admin/categories')}
                  className="text-[10px] font-semibold px-2.5 py-1.5 rounded-lg cursor-pointer"
                  style={{ color: isDark ? '#93c5fd' : CORP.brand, background: isDark ? '#1e3a8a2a' : '#0B5CAB14', border: `1px solid ${isDark ? '#3b82f660' : '#0B5CAB3d'}` }}>Details</motion.button>
              } />
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke={P.border} horizontal={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: P.textLo, fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: P.textMd, fontSize: 10 }} width={90} />
                    <RTooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="Projects" radius={[0, 6, 6, 0]} opacity={0.8}>
                      {categoryData.map((_: any, i: number) => <Cell key={i} fill={CHART_C[i % CHART_C.length]} />)}
                      <LabelList content={(() => {
                        const mx = Math.max(...(categoryData as any[]).map(c => c.count), 0);
                        return (props: any) => {
                          const { x, y, width, height = 0, value } = props;
                          if (value !== mx) return null;
                          const rx = (x ?? 0) + (width ?? 0) + 6;
                          const ry = (y ?? 0) + (height ?? 0) / 2 + 4;
                          return (
                            <text x={rx} y={ry} textAnchor="start"
                              style={{ fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)', fill: P.accent }}>
                              {value}★
                            </text>
                          );
                        };
                      })()} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* ═══════════════ ROW 8 : RECENT PROJECTS TABLE ═══════════════ */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={VP}>
          <GlassCard className="p-5">
            <SectionHeader icon={PiFoldersDuotone} title="Recent Projects" subtitle="Latest portfolio activity" action={
              <motion.button whileHover={{ scale: 1.03 }} onClick={() => navigate('/projects')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer"
                style={{ background: isDark ? '#1e3a8a2a' : '#0B5CAB14', color: isDark ? '#93c5fd' : CORP.brand, border: `1px solid ${isDark ? '#3b82f660' : '#0B5CAB3d'}` }}>
                All Projects <ChevronRight size={10} />
              </motion.button>
            } />
            <div className="rounded-xl overflow-x-auto" style={{ border: `1px solid ${P.border}` }}>
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ background: P.surface }}>
                    {['Project', 'Category', 'Status', 'Budget', 'Progress', 'Region'].map(h => (
                      <th key={h} className="px-3 py-3 text-left font-semibold tracking-wider uppercase text-[9px]" style={{ color: P.textLo }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentProjects.map((p: any) => {
                    const sc = statusColorMap[p.status] || P.textLo;
                    return (
                      <tr key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="transition-colors cursor-pointer"
                        style={{ borderTop: `1px solid ${P.border}` }}
                        onMouseEnter={e => (e.currentTarget.style.background = `${P.accent}06`)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td className="px-3 py-2.5 font-medium" style={{ color: P.textHi }}>{p.name}</td>
                        <td className="px-3 py-2.5" style={{ color: P.textMd }}>{p.category}</td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold capitalize" style={{ background: `${sc}10`, color: sc }}>
                            {(p.status || '').replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 tabular-nums font-bold" style={{ color: P.textHi }}>{(p.budget / 1000).toFixed(0)}K</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full max-w-[60px]" style={{ background: P.border }}>
                              <div className="h-full rounded-full" style={{ width: `${p.progress}%`, background: p.progress >= 80 ? '#059669' : p.progress >= 50 ? '#d97706' : '#dc2626' }} />
                            </div>
                            <span className="tabular-nums text-[10px]" style={{ color: P.textMd }}>{p.progress}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5" style={{ color: P.textLo }}>{p.region || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </motion.div>

        {/* ═══════════════ ROW 9 : (removed — By Region & SDG moved to sidebar) ═══════════════ */}

        {/* ═══════════════ ROW 14 : PROJECT HEALTH MATRIX ═══════════════ */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={VP}>
          <GlassCard className="p-5">
            <SectionHeader icon={PiEyeDuotone} title="Project Health Matrix" subtitle="Detailed status of each tracked project" action={
              <div className="flex items-center gap-2">
                {['Healthy', 'At Risk', 'Critical'].map((lbl, i) => {
                  const c = ['#059669', '#d97706', '#dc2626'][i];
                  return (
                    <div key={lbl} className="flex items-center gap-1 text-[9px]">
                      <div className="w-2 h-2 rounded-full" style={{ background: c }} />
                      <span style={{ color: P.textLo }}>{lbl}</span>
                    </div>
                  );
                })}
              </div>
            } />
            <ProjectHealthMatrix projects={recentProjects} />
          </GlassCard>
        </motion.div>

        <div className="h-6" />
      </div>{/* ── end main content ── */}

      {/* ══════════════════════════════════════════════════
          RIGHT SIDEBAR — Year-to-Date + Milestone Tracker
      ══════════════════════════════════════════════════ */}
      <div className="hidden lg:flex flex-col w-72 shrink-0 py-5 px-4 space-y-5"
        style={{ borderLeft: `1px solid ${P.border}`, background: P.surface }}>

        {/* ── Budget Efficiency ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 flex items-center justify-center">
              <PiCurrencyDollarDuotone size={13} style={{ color: P.accent }} />
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: P.textHi }}>Budget Efficiency</p>
              <p className="text-[9px]" style={{ color: P.textLo }}>Overall consumption rate</p>
            </div>
          </div>
          <div className="rounded-xl p-3" style={{ background: P.card, border: `1px solid ${P.border}` }}>
            <BudgetEfficiencyRing spent={totalSpent} budget={totalBudget} />
          </div>
        </div>

        {/* ── Year-to-Date Summary ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 flex items-center justify-center">
              <PiChartBarDuotone size={13} style={{ color: P.accent }} />
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: P.textHi }}>Year-to-Date Summary</p>
              <p className="text-[9px]" style={{ color: P.textLo }}>Showing totals for last 6 months</p>
            </div>
          </div>

          {/* Radial Shape — Budget Utilization */}
          <div className="rounded-xl p-3 mb-3" style={{ background: P.card, border: `1px solid ${P.border}` }}>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: P.textLo }}>Budget Utilization</p>
            <RadialShape
              value={utilization}
              label="of budget consumed"
              sublabel="Showing total spend for last 6 months"
              color={utilization > 85 ? '#ef4444' : utilization > 60 ? '#f59e0b' : '#4F8EF7'}
            />
          </div>

          {/* Radial Text — 3 key metrics stacked vertically */}
          <div className="flex flex-col gap-2">
            <div className="rounded-xl p-3" style={{ background: P.card, border: `1px solid ${P.border}` }}>
              <RadialText
                value={kpis?.totalProjects ?? 0}
                max={Math.max(20, (kpis?.totalProjects ?? 0) * 1.5)}
                label="Projects"
                trend={trends?.projects ?? 0}
                trendLabel="this month"
                color="#7c3aed"
              />
            </div>
            <div className="rounded-xl p-3" style={{ background: P.card, border: `1px solid ${P.border}` }}>
              <RadialText
                value={kpis?.activeProjects ?? 0}
                max={Math.max(10, (kpis?.totalProjects ?? 1))}
                label="Active"
                trend={0}
                trendLabel="running now"
                color="#4F8EF7"
              />
            </div>
            <div className="rounded-xl p-3" style={{ background: P.card, border: `1px solid ${P.border}` }}>
              <RadialText
                value={kpis?.totalBeneficiaries ?? 0}
                max={Math.max(500, (kpis?.totalBeneficiaries ?? 0) * 1.4)}
                label="People"
                trend={trends?.beneficiaries ?? 0}
                trendLabel="this month"
                color="#ec4899"
              />
            </div>
          </div>

          {/* satisfaction mini stat */}
          <div className="mt-2 rounded-xl p-3 flex items-center justify-between" style={{ background: P.card, border: `1px solid ${P.border}` }}>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: P.textLo }}>Avg Impact Score</p>
              <p className="text-lg font-bold mt-0.5" style={{ color: '#22c55e' }}>{(kpis?.avgImpactScore ?? 0).toFixed(1)}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: P.textLo }}>Satisfaction</p>
              <p className="text-lg font-bold mt-0.5" style={{ color: '#f59e0b' }}>{satisfactionScore}%</p>
            </div>
          </div>
        </div>

        {/* ── Impact Goal ── */}
        <div className="rounded-xl p-4" style={{ background: P.card, border: `1px solid ${P.border}` }}>
          <p className="text-sm font-semibold" style={{ color: P.textHi }}>Impact Goal</p>
          <p className="text-[11px] mt-0.5" style={{ color: P.textDim }}>Set your quarterly impact target.</p>

          {/* counter row */}
          <div className="flex items-center justify-center gap-4 my-4">
            {/* minus */}
            <div className="h-8 w-8 flex items-center justify-center cursor-pointer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 12h14" style={{ stroke: P.textMd }} />
              </svg>
            </div>
            {/* number */}
            <div className="text-center">
              <p className="text-3xl font-extrabold leading-none" style={{ color: P.textHi }}>
                {(kpis?.totalBeneficiaries ?? 0).toLocaleString()}
              </p>
              <p className="text-[9px] font-bold tracking-widest mt-1" style={{ color: P.textDim }}>BENEFICIARIES</p>
            </div>
            {/* plus */}
            <div className="h-8 w-8 flex items-center justify-center cursor-pointer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" style={{ stroke: P.textMd }} />
              </svg>
            </div>
          </div>

          {/* goal bars */}
          <div className="flex items-end gap-0.5 h-8 mb-3.5">
            {[40, 55, 35, 70, 50, 85, 60, 45, 75, 90, 65, 80].map((h, i) => (
              <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: P.border }} />
            ))}
          </div>

          {/* link */}
          <button onClick={() => navigate('/reports/impact')}
            className="w-full text-[11px] font-semibold py-1.5 rounded-lg cursor-pointer transition-opacity hover:opacity-80"
            style={{ color: P.textHi, background: P.border }}>
            View Impact Report
          </button>
        </div>

        {/* ── By Region ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 flex items-center justify-center">
              <PiGlobeDuotone size={13} style={{ color: P.accent }} />
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: P.textHi }}>By Region</p>
              <p className="text-[9px]" style={{ color: P.textLo }}>{regionData.length} active regions</p>
            </div>
            <motion.button whileHover={{ scale: 1.05 }} onClick={() => navigate('/map')}
              className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full cursor-pointer"
              style={{ color: P.accent, background: `${P.accent}10` }}>Map</motion.button>
          </div>
          <div className="rounded-xl p-3" style={{ background: P.card, border: `1px solid ${P.border}` }}>
            {regionData.length > 0 ? (
              <>
                <div style={{ height: 130 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={regionData.slice(0, 8).map((r: any, i: number) => ({
                        name: String(r.region).length > 6 ? `${String(r.region).slice(0, 6)}.` : r.region,
                        fullName: r.region,
                        value: Number(r.count) || 0,
                        color: CHART_C[i % CHART_C.length],
                      }))}
                      margin={{ top: 4, right: 6, left: -8, bottom: 0 }}
                    >
                      <defs>
                        {CHART_C.map((c, i) => (
                          <linearGradient key={i} id={`rg${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={c} stopOpacity={0.95} />
                            <stop offset="100%" stopColor={c} stopOpacity={0.45} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={P.border} vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: P.textDim, fontSize: 8 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: P.textDim, fontSize: 8 }} width={20} />
                      <RTooltip
                        content={({ active, payload }: any) => {
                          if (!active || !payload?.length) return null;
                          const point = payload[0]?.payload;
                          return (
                            <div className="rounded-lg px-2.5 py-1.5" style={{ background: P.card, border: `1px solid ${point?.color}40`, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                              <p className="text-[9px] font-semibold" style={{ color: P.textHi }}>{point?.fullName}</p>
                              <p className="text-[9px]" style={{ color: P.textMd }}>Projects: <span className="font-black" style={{ color: point?.color }}>{payload[0]?.value}</span></p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {regionData.slice(0, 8).map((_: any, i: number) => (
                          <Cell key={i} fill={`url(#rg${i % CHART_C.length})`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[9px] mt-2" style={{ color: P.textLo }}>Regional distribution (top regions)</p>
              </>
            ) : (
              <p className="text-[9px] text-center py-3" style={{ color: P.textLo }}>No region data</p>
            )}
          </div>
        </div>

        {/* ── SDG Alignment ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 flex items-center justify-center">
              <PiTargetDuotone size={13} style={{ color: P.accent }} />
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: P.textHi }}>SDG Alignment</p>
              <p className="text-[9px]" style={{ color: P.textLo }}>Sustainable Development Goals</p>
            </div>
          </div>
          <div className="rounded-xl p-3" style={{ background: P.card, border: `1px solid ${P.border}` }}>
            {sdgAlignment.length > 0 ? (() => {
              const SDG_C: Record<number,string> = {
                1:'#E5243B',2:'#DDA63A',3:'#4C9F38',4:'#C5192D',5:'#FF3A21',
                6:'#26BDE2',7:'#FCC30B',8:'#A21942',9:'#FD6925',10:'#DD1367',
                11:'#FD9D24',12:'#BF8B2E',13:'#3F7E44',14:'#0A97D9',15:'#56C02B',
                16:'#00689D',17:'#19486A',
              };
              const chartData = sdgAlignment.slice(0, 10).map((s: any) => {
                const g = Number(s.goal);
                return { goal: `G${g}`, fullGoal: `SDG ${g}`, value: Number(s.count) || 0, color: SDG_C[g] ?? P.accent };
              });
              return (
                <>
                  <div style={{ height: 130 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 4, right: 6, left: -8, bottom: 0 }}>
                        <defs>
                          {Object.entries(SDG_C).map(([k, c]) => (
                            <linearGradient key={k} id={`sdg${k}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={c} stopOpacity={0.95} />
                              <stop offset="100%" stopColor={c} stopOpacity={0.45} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={P.border} vertical={false} />
                        <XAxis dataKey="goal" axisLine={false} tickLine={false} tick={{ fill: P.textDim, fontSize: 8 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: P.textDim, fontSize: 8 }} width={20} />
                        <RTooltip
                          content={({ active, payload }: any) => {
                            if (!active || !payload?.length) return null;
                            const point = payload[0]?.payload;
                            return (
                              <div className="rounded-lg px-2.5 py-1.5" style={{ background: P.card, border: `1px solid ${point?.color}50`, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                                <p className="text-[9px] font-semibold" style={{ color: P.textHi }}>{point?.fullGoal}</p>
                                <p className="text-[9px]" style={{ color: P.textMd }}>Projects: <span className="font-black" style={{ color: point?.color }}>{payload[0]?.value}</span></p>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {chartData.map((d, i) => (
                            <Cell key={i} fill={`url(#sdg${d.goal.replace('G','')})`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[9px] mt-2" style={{ color: P.textLo }}>Projects aligned to top SDGs</p>
                </>
              );
            })() : (
              <p className="text-[9px] text-center py-3" style={{ color: P.textLo }}>No SDG data</p>
            )}
          </div>
        </div>

        {/* ── AI Chat ── */}
        <BentoChatCell />

      </div>
      </div>
    </div>
  );
}
