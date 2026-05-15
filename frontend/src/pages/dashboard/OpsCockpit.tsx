/**
 * OpsCockpit — Band 3
 * Twin 7/5 pane: Budget burn (clean area chart) + Risk/status pane.
 */
import { useMemo, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip as RTooltip, ReferenceLine,
} from 'recharts';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { EASE, FADE_UP, VP, STATUS_COLORS, GOLD } from './tokens';

export interface BurnPoint { month: string; budget: number; spent: number }

interface OpsCockpitProps {
  budgetTrend: BurnPoint[];
  projectsByStatus: { status: string; count: number }[];
  unresolvedAlerts: number;
  criticalAlerts: number;
  totalBudget: number;
  totalSpent: number;
  utilization: number;
  satisfactionScore: number;
  avgDurationMonths: number;
}

export function OpsCockpit({
  budgetTrend,
  projectsByStatus,
  unresolvedAlerts,
  criticalAlerts,
  totalBudget,
  totalSpent,
  utilization,
  satisfactionScore,
  avgDurationMonths,
}: OpsCockpitProps) {
  const { colors: P, isDark } = useTheme();

  return (
    <motion.div
      variants={FADE_UP}
      initial="hidden"
      whileInView="show"
      viewport={VP}
      style={{
        display: 'grid',
        gridTemplateColumns: '7fr 5fr',
        gap: 16,
      }}
    >
      {/* ── Left: Budget burn chart ── */}
      <BurnChart
        data={budgetTrend}
        totalBudget={totalBudget}
        totalSpent={totalSpent}
        utilization={utilization}
        isDark={isDark}
        P={P}
      />

      {/* ── Right: Risk & status pane ── */}
      <RiskPane
        projectsByStatus={projectsByStatus}
        unresolvedAlerts={unresolvedAlerts}
        criticalAlerts={criticalAlerts}
        satisfactionScore={satisfactionScore}
        avgDurationMonths={avgDurationMonths}
        isDark={isDark}
        P={P}
      />
    </motion.div>
  );
}

/* ── Budget Burn Chart ──────────────────────────────────────────────────────── */
function BurnChart({ data, totalBudget, totalSpent, utilization, isDark, P }: {
  data: BurnPoint[]; totalBudget: number; totalSpent: number; utilization: number;
  isDark: boolean; P: any;
}) {
  const card = isDark ? '#0a0a0a' : '#FFFFFF';
  const border = isDark ? '#1a1a1a' : '#E8E0CC';
  const budId = 'burn-bud';
  const spentId = 'burn-spent';

  const formatOMR = (v: number) =>
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: card, border: `1px solid ${border}`,
        borderRadius: 12, padding: '10px 14px',
        boxShadow: '0 12px 28px rgba(2,6,23,0.25)',
      }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: P.textMd, marginBottom: 6, fontFamily: "'Geist Mono', monospace" }}>{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, marginBottom: 2 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
            <span style={{ color: P.textLo }}>{p.name}:</span>
            <span style={{ fontWeight: 700, color: P.textHi, fontFamily: "'Geist Mono', monospace" }}>
              {formatOMR(p.value)} OMR
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{
      background: card, border: `1px solid ${border}`,
      borderRadius: 20, padding: '24px 24px 16px',
    }}>
      {/* Section header */}
      <SectionHead
        eyebrow="Budget Execution"
        title="Allocation vs. Expenditure"
        isDark={isDark}
        P={P}
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatPill label="Budget" value={`${formatOMR(totalBudget)} OMR`} color={GOLD} isDark={isDark} />
            <StatPill label="Spent" value={`${formatOMR(totalSpent)} OMR`} color={utilization > 85 ? '#f87171' : utilization > 65 ? '#f59e0b' : '#34d399'} isDark={isDark} />
          </div>
        }
      />

      {/* Area chart */}
      {data.length > 0 ? (
        <div style={{ height: 220, marginLeft: -8 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={budId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                </linearGradient>
                <linearGradient id={spentId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke={isDark ? '#1a1a1a' : '#E8E0CC'} vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false} tickLine={false}
                tick={{ fill: isDark ? 'rgba(255,255,255,0.3)' : '#9A9490', fontSize: 9, fontFamily: "'Geist Mono', monospace" }}
              />
              <YAxis
                axisLine={false} tickLine={false} width={44}
                tickFormatter={v => `${(v / 1000).toFixed(0)}K`}
                tick={{ fill: isDark ? 'rgba(255,255,255,0.3)' : '#9A9490', fontSize: 9, fontFamily: "'Geist Mono', monospace" }}
              />
              <RTooltip content={<CustomTooltip />} />
              <Area
                type="monotone" dataKey="budget" name="Budget"
                stroke={GOLD} strokeWidth={2} fill={`url(#${budId})`}
                dot={false} activeDot={{ r: 4, fill: GOLD, strokeWidth: 0 }}
              />
              <Area
                type="monotone" dataKey="spent" name="Spent"
                stroke="#60a5fa" strokeWidth={2} fill={`url(#${spentId})`}
                dot={false} activeDot={{ r: 4, fill: '#60a5fa', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyChart isDark={isDark} />
      )}

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
        {[{ label: 'Budget Allocated', color: GOLD }, { label: 'Amount Spent', color: '#60a5fa' }].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 16, height: 2, background: l.color, display: 'inline-block', borderRadius: 1 }} />
            <span style={{ fontSize: 9, color: isDark ? 'rgba(255,255,255,0.38)' : '#9A9490', fontFamily: "'Geist Mono', monospace" }}>
              {l.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Risk & Status pane ─────────────────────────────────────────────────────── */
function RiskPane({ projectsByStatus, unresolvedAlerts, criticalAlerts, satisfactionScore, avgDurationMonths, isDark, P }: {
  projectsByStatus: { status: string; count: number }[];
  unresolvedAlerts: number;
  criticalAlerts: number;
  satisfactionScore: number;
  avgDurationMonths: number;
  isDark: boolean; P: any;
}) {
  const card = isDark ? '#0a0a0a' : '#FFFFFF';
  const border = isDark ? '#1a1a1a' : '#E8E0CC';
  const total = projectsByStatus.reduce((s, v) => s + v.count, 0);

  return (
    <div style={{
      background: card, border: `1px solid ${border}`,
      borderRadius: 20, padding: '24px',
      display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      <SectionHead eyebrow="Portfolio Status" title="Project Distribution" isDark={isDark} P={P} />

      {/* Status bars */}
      {total > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {projectsByStatus
            .filter(s => s.status !== 'archived')
            .sort((a, b) => b.count - a.count)
            .map((s, i) => {
              const color = STATUS_COLORS[s.status] || '#71717a';
              const pct = total > 0 ? (s.count / total) * 100 : 0;
              return (
                <StatusRow
                  key={s.status} status={s.status}
                  count={s.count} pct={pct} color={color}
                  delay={i * 0.06} isDark={isDark} P={P}
                />
              );
            })}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 11, color: P.textLo }}>No project data yet</span>
        </div>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: isDark ? '#1a1a1a' : '#E8E0CC' }} />

      {/* KPI micro-row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <MicroStat
          label="Alerts"
          value={String(unresolvedAlerts)}
          color={unresolvedAlerts > 0 ? (criticalAlerts > 0 ? '#f87171' : '#f59e0b') : '#34d399'}
          isDark={isDark}
          icon={unresolvedAlerts > 0 ? <AlertTriangle size={10} /> : <TrendingUp size={10} />}
        />
        <MicroStat
          label="Satisfaction"
          value={`${satisfactionScore}%`}
          color={satisfactionScore >= 70 ? '#34d399' : satisfactionScore >= 50 ? '#f59e0b' : '#f87171'}
          isDark={isDark}
        />
        <MicroStat
          label="Avg Duration"
          value={`${avgDurationMonths}mo`}
          color="#60a5fa"
          isDark={isDark}
        />
      </div>

      {/* Critical alert banner */}
      {criticalAlerts > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 12,
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.25)',
          }}
        >
          <AlertTriangle size={13} color="#f87171" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#f87171', margin: 0 }}>
              {criticalAlerts} Critical Alert{criticalAlerts > 1 ? 's' : ''}
            </p>
            <p style={{ fontSize: 9, color: isDark ? 'rgba(255,255,255,0.38)' : '#9A9490', margin: 0, marginTop: 1 }}>
              Requires immediate review in Early Warning
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ── Status bar row ─────────────────────────────────────────────────────────── */
function StatusRow({ status, count, pct, color, delay, isDark, P }: {
  status: string; count: number; pct: number; color: string;
  delay: number; isDark: boolean; P: any;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, VP);
  return (
    <div ref={ref}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
          <span style={{
            fontSize: 10, fontWeight: 500,
            color: isDark ? 'rgba(255,255,255,0.65)' : '#6B6560',
            textTransform: 'capitalize', letterSpacing: '0.01em',
          }}>
            {status.replace('_', '\u00A0')}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: P.textHi, fontFamily: "'Geist Mono', monospace" }}>
            {count}
          </span>
          <span style={{ fontSize: 9, color: isDark ? 'rgba(255,255,255,0.3)' : '#9A9490', fontFamily: "'Geist Mono', monospace" }}>
            {Math.round(pct)}%
          </span>
        </div>
      </div>
      <div style={{ height: 4, borderRadius: 999, background: isDark ? '#1a1a1a' : '#E8E0CC', overflow: 'hidden' }}>
        <motion.div
          style={{ height: '100%', borderRadius: 999, background: color }}
          initial={{ width: 0 }}
          animate={inView ? { width: `${pct}%` } : { width: 0 }}
          transition={{ duration: 0.75, delay, ease: EASE }}
        />
      </div>
    </div>
  );
}

/* ── Micro stat ─────────────────────────────────────────────────────────────── */
function MicroStat({ label, value, color, isDark, icon }: {
  label: string; value: string; color: string; isDark: boolean; icon?: React.ReactNode;
}) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 12,
      background: isDark ? '#121212' : '#FAF7F0',
      border: `1px solid ${isDark ? '#1a1a1a' : '#E8E0CC'}`,
      textAlign: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color }}>
        {icon}
        <span style={{ fontSize: 14, fontWeight: 700, color, fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: 'italic' }}>
          {value}
        </span>
      </div>
      <span style={{ display: 'block', marginTop: 2, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: isDark ? 'rgba(255,255,255,0.3)' : '#9A9490', fontFamily: "'Geist Mono', monospace" }}>
        {label}
      </span>
    </div>
  );
}

/* ── Shared header subcomponent ─────────────────────────────────────────────── */
function SectionHead({ eyebrow, title, isDark, P, right }: {
  eyebrow: string; title: string; isDark: boolean; P: any; right?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <span style={{
          display: 'block', marginBottom: 4,
          fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: isDark ? 'rgba(255,255,255,0.32)' : '#9A9490',
          fontFamily: "'Geist Mono', ui-monospace, monospace",
        }}>
          {eyebrow}
        </span>
        <h3 style={{
          margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2,
          color: isDark ? 'rgba(255,255,255,0.95)' : '#1A1A1A',
        }}>
          {title}
        </h3>
      </div>
      {right}
    </div>
  );
}

/* ── Stat pill ──────────────────────────────────────────────────────────────── */
function StatPill({ label, value, color, isDark }: {
  label: string; value: string; color: string; isDark: boolean;
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
      padding: '4px 10px', borderRadius: 8,
      background: `${color}0D`, border: `1px solid ${color}20`,
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: "'Geist Mono', monospace" }}>{value}</span>
      <span style={{ fontSize: 8, color: isDark ? 'rgba(255,255,255,0.35)' : '#9A9490', letterSpacing: '0.08em' }}>{label}</span>
    </div>
  );
}

/* ── Empty state for chart ──────────────────────────────────────────────────── */
function EmptyChart({ isDark }: { isDark: boolean }) {
  return (
    <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.25)' : '#9A9490' }}>
        No budget data yet
      </span>
    </div>
  );
}
