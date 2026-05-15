/**
 * PosturePanel — Band 2
 * Replaces the 4 identical KPI cards.
 * One large health score (Cormorant italic) + 4 inline deltas.
 * Asymmetric 8/4 split: health left, deltas right.
 */
import { useMemo, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { EASE, FADE_UP, VP, GOLD } from './tokens';

export interface PostureData {
  overallScore: number;       // 0–100
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalBudget: number;
  totalSpent: number;
  totalBeneficiaries: number;
  unresolvedAlerts: number;
  trends: {
    projects:      number;
    budget:        number;
    beneficiaries: number;
    alerts:        number;
  };
  scoreSparkline: number[];   // 6 data points for the 90-day health trend
}

interface PosturePanelProps {
  data: PostureData;
}

export function PosturePanel({ data }: PosturePanelProps) {
  const { colors: P, isDark } = useTheme();

  const scoreColor =
    data.overallScore >= 75 ? '#34d399' :
    data.overallScore >= 50 ? '#f59e0b' : '#f87171';

  const deltas = useMemo(() => [
    {
      label: 'Total Projects',
      value: data.totalProjects,
      sub: `${data.activeProjects} active · ${data.completedProjects} completed`,
      trend: data.trends.projects,
      format: 'num' as const,
      color: GOLD,
    },
    {
      label: 'Budget Allocated',
      value: data.totalBudget,
      sub: `${data.totalBudget > 0 ? Math.round((data.totalSpent / data.totalBudget) * 100) : 0}% consumed`,
      trend: data.trends.budget,
      format: 'omr' as const,
      color: '#34d399',
    },
    {
      label: 'Beneficiaries Reached',
      value: data.totalBeneficiaries,
      sub: 'across all active projects',
      trend: data.trends.beneficiaries,
      format: 'num' as const,
      color: '#60a5fa',
    },
    {
      label: 'Open Alerts',
      value: data.unresolvedAlerts,
      sub: data.unresolvedAlerts === 0 ? 'Portfolio is clean' : 'Need attention',
      trend: data.trends.alerts,
      format: 'num' as const,
      color: data.unresolvedAlerts > 0 ? '#f87171' : '#34d399',
      invertTrend: true,
    },
  ], [data]);

  return (
    <motion.div
      variants={FADE_UP}
      initial="hidden"
      animate="show"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 1,
        borderRadius: 20,
        overflow: 'hidden',
        border: `1px solid ${isDark ? '#1a1a1a' : '#E8E0CC'}`,
        background: isDark ? '#1a1a1a' : '#E8E0CC',
      }}
    >
      {/* ── Left: Big health number ── */}
      <HealthScore
        score={data.overallScore}
        color={scoreColor}
        sparkline={data.scoreSparkline}
        isDark={isDark}
        P={P}
      />

      {/* ── Right: 4 delta metrics (2×2 grid) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 1,
        background: isDark ? '#1a1a1a' : '#E8E0CC',
      }}>
        {deltas.map((d, i) => (
          <DeltaCell key={d.label} delta={d} delay={i * 0.07} isDark={isDark} P={P} />
        ))}
      </div>
    </motion.div>
  );
}

/* ── Health score cell ─────────────────────────────────────────────────────── */
function HealthScore({ score, color, sparkline, isDark, P }: {
  score: number; color: string; sparkline: number[];
  isDark: boolean; P: any;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, VP);

  const label = score >= 75 ? 'Portfolio healthy' : score >= 50 ? 'Needs attention' : 'At risk';

  return (
    <div
      ref={ref}
      style={{
        background: isDark ? '#0a0a0a' : '#FFFFFF',
        padding: '32px 32px 28px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        minHeight: 200,
      }}
    >
      {/* Eyebrow */}
      <span style={{
        display: 'block',
        fontSize: 9.5, fontWeight: 700, letterSpacing: '0.2em',
        textTransform: 'uppercase', color: isDark ? 'rgba(255,255,255,0.35)' : '#9A9490',
        fontFamily: "'Geist Mono', ui-monospace, monospace",
        marginBottom: 16,
      }}>
        Portfolio Health
      </span>

      {/* Big number */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <motion.span
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
          style={{
            fontSize: 'clamp(3.5rem, 6vw, 5rem)',
            fontWeight: 700, lineHeight: 0.9, letterSpacing: '-0.03em',
            color, fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
            fontStyle: 'italic',
          }}
        >
          <CountUp to={score} inView={inView} color={color} />
        </motion.span>
        <span style={{
          fontSize: 16, fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.3)' : '#9A9490',
          marginTop: 8, lineHeight: 1,
        }}>/ 100</span>
      </div>

      {/* Label + sparkline row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, gap: 12 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 10px', borderRadius: 999,
          fontSize: 10, fontWeight: 700,
          background: `${color}14`, color,
          border: `1px solid ${color}28`,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block' }} />
          {label}
        </span>
        {sparkline.length >= 2 && (
          <Sparkline data={sparkline} color={color} />
        )}
      </div>
    </div>
  );
}

/* ── Individual delta cell ─────────────────────────────────────────────────── */
function DeltaCell({ delta, delay, isDark, P }: {
  delta: { label: string; value: number; sub: string; trend: number; format: 'num' | 'omr'; color: string; invertTrend?: boolean };
  delay: number; isDark: boolean; P: any;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, VP);

  const trendUp = delta.invertTrend ? delta.trend < 0 : delta.trend > 0;
  const trendColor = trendUp ? '#34d399' : delta.trend !== 0 ? '#f87171' : (isDark ? 'rgba(255,255,255,0.25)' : '#9A9490');
  const trendBg = trendUp ? 'rgba(52,211,153,0.1)' : delta.trend !== 0 ? 'rgba(248,113,113,0.1)' : 'transparent';

  const fmt = (v: number) => {
    if (delta.format === 'omr') {
      return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`;
    }
    return v.toLocaleString();
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ delay, duration: 0.45, ease: EASE }}
      style={{
        background: isDark ? '#0a0a0a' : '#FFFFFF',
        padding: '24px 24px 20px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        minHeight: 100,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase',
          color: isDark ? 'rgba(255,255,255,0.35)' : '#9A9490',
          fontFamily: "'Geist Mono', ui-monospace, monospace",
        }}>
          {delta.label}
        </span>
        {delta.trend !== 0 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 2,
            fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999,
            background: trendBg, color: trendColor,
          }}>
            {trendUp ? <ArrowUpRight size={8} /> : <ArrowDownRight size={8} />}
            {Math.abs(delta.trend)}%
          </span>
        )}
      </div>

      <div>
        <span style={{
          display: 'block', lineHeight: 1,
          fontSize: 'clamp(1.4rem, 2.5vw, 1.75rem)',
          fontWeight: 700, letterSpacing: '-0.02em',
          color: delta.color,
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: 'italic',
        }}>
          <CountUp to={delta.value} inView={inView} color={delta.color} />
          {delta.format === 'omr' && (
            <span style={{ fontSize: '0.45em', fontStyle: 'normal', fontWeight: 600, marginLeft: 4, color: isDark ? 'rgba(255,255,255,0.4)' : '#9A9490' }}>OMR</span>
          )}
        </span>
        <span style={{
          display: 'block', marginTop: 4, fontSize: 10,
          color: isDark ? 'rgba(255,255,255,0.38)' : '#9A9490',
        }}>
          {delta.sub}
        </span>
      </div>
    </motion.div>
  );
}

/* ── Micro sparkline ─────────────────────────────────────────────────────── */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const mn = Math.min(...data), mx = Math.max(...data), r = mx - mn || 1;
  const W = 72, H = 28;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - mn) / r) * (H - 4) - 2}`).join(' ');
  const uid = `spk-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={color} strokeWidth={1.5} points={pts} strokeLinecap="round" strokeLinejoin="round" />
      <polygon fill={`url(#${uid})`} points={`0,${H} ${pts} ${W},${H}`} />
    </svg>
  );
}

/* ── Animated counter ────────────────────────────────────────────────────── */
function CountUp({ to, inView, color }: { to: number; inView: boolean; color: string }) {
  // Using a CSS animation approach via transform - simple and efficient
  const display = inView ? to : 0;
  const fmt = to >= 1_000_000
    ? `${(display / 1_000_000).toFixed(1)}M`
    : to >= 100_000
    ? `${(display / 1000).toFixed(0)}K`
    : Math.round(display).toLocaleString();
  return <>{fmt}</>;
}
