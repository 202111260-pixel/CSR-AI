/**
 * RegionalRail — Band 5
 * 6/6 grid: Left = Oman governorate map + regional bar chart.
 *           Right = Activity timeline + top contributor.
 * Ministry footer with last-updated timestamp.
 */
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Activity, MapPin } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { EASE, FADE_UP, VP, GOLD } from './tokens';

/* ── Oman governorate SVG dots (approx. Mercator positions) ──────────────────── */
const GOVERNORATES: { id: string; name: string; nameAr: string; cx: number; cy: number }[] = [
  { id: 'muscat',           name: 'Muscat',          nameAr: 'مسقط',            cx: 74, cy: 51 },
  { id: 'dhofar',           name: 'Dhofar',          nameAr: 'ظفار',            cx: 38, cy: 88 },
  { id: 'musandam',         name: 'Musandam',        nameAr: 'مسندم',           cx: 72, cy: 8  },
  { id: 'al_buraymi',       name: 'Al Buraymi',      nameAr: 'البريمي',          cx: 55, cy: 28 },
  { id: 'north_al_batinah', name: 'N. Al Batinah',   nameAr: 'شمال الباطنة',    cx: 63, cy: 32 },
  { id: 'south_al_batinah', name: 'S. Al Batinah',   nameAr: 'جنوب الباطنة',   cx: 68, cy: 42 },
  { id: 'north_al_sharqiyah', name: 'N. Al Sharqiyah', nameAr: 'شمال الشرقية', cx: 82, cy: 45 },
  { id: 'south_al_sharqiyah', name: 'S. Al Sharqiyah', nameAr: 'جنوب الشرقية', cx: 80, cy: 58 },
  { id: 'al_wusta',         name: 'Al Wusta',        nameAr: 'الوسطى',          cx: 68, cy: 68 },
  { id: 'ad_dakhiliyah',    name: 'Ad Dakhiliyah',   nameAr: 'الداخلية',        cx: 65, cy: 55 },
  { id: 'adh_dhahirah',     name: 'Adh Dhahirah',    nameAr: 'الظاهرة',         cx: 52, cy: 44 },
];

/* ── Activity type colors ─────────────────────────────────────────────────────── */
const ACT_COLORS: Record<string, string> = {
  project: GOLD,
  expense: '#60a5fa',
  alert:   '#f87171',
  user:    '#34d399',
  default: '#a3a3a3',
};

/* ── Props ────────────────────────────────────────────────────────────────────── */
export interface RegionalRailProps {
  projectsByRegion: { region: string; count: number }[];
  recentActivities: {
    id: string;
    action: string;
    entity: string;
    details?: string;
    createdAt: string;
    user?: { name: string };
  }[];
  totalProjects: number;
  totalBudget: number;
  lastUpdated?: string;
}

/* ── Main component ───────────────────────────────────────────────────────────── */
export function RegionalRail({
  projectsByRegion,
  recentActivities,
  totalProjects,
  totalBudget,
  lastUpdated,
}: RegionalRailProps) {
  const { isDark } = useTheme();
  const card   = isDark ? '#0a0a0a' : '#FFFFFF';
  const border = isDark ? '#1a1a1a' : '#E8E0CC';

  /* Build a quick lookup: region id → count */
  const regionMap = new Map(
    projectsByRegion.map(r => [normalizeRegion(r.region), r.count])
  );

  const maxCount = Math.max(...projectsByRegion.map(r => r.count), 1);

  return (
    <motion.div
      variants={FADE_UP}
      initial="hidden"
      whileInView="show"
      viewport={VP}
      style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
      }}
    >
      {/* ── Left: Map + regional chart ── */}
      <div style={{
        background: card, border: `1px solid ${border}`,
        borderRadius: 20, padding: '24px', display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        <SectionEyebrow label="Regional Distribution" />

        {/* Oman SVG map */}
        <OmanMap
          regionMap={regionMap}
          isDark={isDark}
          border={border}
        />

        {/* Horizontal bar chart for top 5 regions */}
        {projectsByRegion.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {projectsByRegion.slice(0, 5).map((r, i) => (
              <RegionBar
                key={r.region}
                region={r.region}
                count={r.count}
                pct={(r.count / maxCount) * 100}
                delay={i * 0.07}
                isDark={isDark}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Right: Activity timeline ── */}
      <div style={{
        background: card, border: `1px solid ${border}`,
        borderRadius: 20, padding: '24px', display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={13} color={isDark ? 'rgba(255,255,255,0.4)' : '#9A9490'} />
          <SectionEyebrow label="Recent Activity" />
        </div>

        {recentActivities.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {recentActivities.slice(0, 7).map((act, i) => (
              <ActivityRow key={act.id} activity={act} delay={i * 0.06} isDark={isDark} isLast={i === Math.min(recentActivities.length, 7) - 1} />
            ))}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.25)' : '#9A9490' }}>No recent activity</span>
          </div>
        )}
      </div>

      {/* ── Ministry footer (full width) ── */}
      <MinistryFooter
        totalProjects={totalProjects}
        totalBudget={totalBudget}
        lastUpdated={lastUpdated}
        isDark={isDark}
        border={border}
        card={card}
      />
    </motion.div>
  );
}

/* ── Oman SVG map ─────────────────────────────────────────────────────────────── */
function OmanMap({ regionMap, isDark, border }: {
  regionMap: Map<string, number>; isDark: boolean; border: string;
}) {
  return (
    <div style={{
      position: 'relative', width: '100%', aspectRatio: '1 / 0.85',
      borderRadius: 12, border: `1px solid ${border}`,
      background: isDark ? '#060E1C' : '#F5F1E8',
      overflow: 'hidden',
    }}>
      <svg
        viewBox="0 0 100 100"
        style={{ width: '100%', height: '100%', display: 'block' }}
        aria-label="Oman governorate map"
      >
        {/* Faint grid lines */}
        {[20, 40, 60, 80].map(v => (
          <g key={v}>
            <line x1={v} y1={0} x2={v} y2={100} stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'} strokeWidth={0.4} />
            <line x1={0} y1={v} x2={100} y2={v} stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'} strokeWidth={0.4} />
          </g>
        ))}

        {/* Oman rough coastline polyline */}
        <polyline
          points="72,8 74,15 76,22 78,32 76,40 78,50 80,58 76,68 68,68 65,76 55,82 48,88 42,92 38,88 36,80 40,72 50,68 58,62 62,55 65,47 62,40 58,36 55,28 60,22 65,15 72,8"
          fill="none"
          stroke={isDark ? 'rgba(200,164,78,0.15)' : 'rgba(200,164,78,0.25)'}
          strokeWidth={0.8}
          strokeLinejoin="round"
        />

        {/* Governorate dots */}
        {GOVERNORATES.map((gov, i) => {
          const count = regionMap.get(gov.id) ?? regionMap.get(gov.name) ?? 0;
          const isActive = count > 0;
          const dotColor = isActive ? GOLD : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)');
          return (
            <g key={gov.id}>
              {isActive && (
                <motion.circle
                  cx={gov.cx} cy={gov.cy}
                  r={4}
                  fill={`${GOLD}20`}
                  stroke={GOLD}
                  strokeWidth={0.3}
                  initial={{ r: 2, opacity: 0 }}
                  animate={{ r: [4, 6, 4], opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.2 }}
                />
              )}
              <motion.circle
                cx={gov.cx} cy={gov.cy}
                r={isActive ? 2.5 : 1.8}
                fill={dotColor}
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={VP}
                transition={{ delay: i * 0.05, duration: 0.4, ease: EASE }}
              />
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 8, right: 10,
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        {[
          { color: GOLD, label: 'Active region' },
          { color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)', label: 'No projects' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: l.color, display: 'inline-block' }} />
            <span style={{ fontSize: 7.5, color: isDark ? 'rgba(255,255,255,0.3)' : '#9A9490' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Region bar ─────────────────────────────────────────────────────────────── */
function RegionBar({ region, count, pct, delay, isDark }: {
  region: string; count: number; pct: number; delay: number; isDark: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, VP);
  return (
    <div ref={ref}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MapPin size={8} color={GOLD} />
          <span style={{ fontSize: 9.5, color: isDark ? 'rgba(255,255,255,0.65)' : '#6B6560' }}>
            {region}
          </span>
        </div>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.8)' : '#1A1A1A', fontFamily: "'Geist Mono', monospace" }}>
          {count}
        </span>
      </div>
      <div style={{ height: 3, borderRadius: 999, background: isDark ? '#1a1a1a' : '#E8E0CC', overflow: 'hidden' }}>
        <motion.div
          style={{ height: '100%', background: GOLD, borderRadius: 999 }}
          initial={{ width: 0 }}
          animate={inView ? { width: `${pct}%` } : { width: 0 }}
          transition={{ duration: 0.7, delay, ease: EASE }}
        />
      </div>
    </div>
  );
}

/* ── Activity row ───────────────────────────────────────────────────────────── */
function ActivityRow({ activity, delay, isDark, isLast }: {
  activity: { id: string; action: string; entity: string; details?: string; createdAt: string; user?: { name: string } };
  delay: number; isDark: boolean; isLast: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, VP);
  const color = ACT_COLORS[activity.entity?.toLowerCase()] ?? ACT_COLORS.default;
  const time = formatRelTime(activity.createdAt);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -8 }}
      animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
      transition={{ delay, duration: 0.35, ease: EASE }}
      style={{ display: 'flex', gap: 12, paddingBottom: isLast ? 0 : 14, position: 'relative' }}
    >
      {/* Timeline line */}
      {!isLast && (
        <div style={{
          position: 'absolute', left: 6, top: 16, bottom: 0, width: 1,
          background: isDark ? '#1a1a1a' : '#E8E0CC',
        }} />
      )}
      {/* Dot */}
      <div style={{
        width: 13, height: 13, borderRadius: '50%', flexShrink: 0, marginTop: 1,
        background: `${color}18`, border: `1px solid ${color}45`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: color, display: 'inline-block' }} />
      </div>
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 10.5, fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.8)' : '#3D3A34', lineHeight: 1.3, textTransform: 'capitalize' }}>
            {activity.action.replace(/_/g, ' ')}
          </p>
          <span style={{ fontSize: 8.5, color: isDark ? 'rgba(255,255,255,0.25)' : '#9A9490', fontFamily: "'Geist Mono', monospace", flexShrink: 0 }}>
            {time}
          </span>
        </div>
        {(activity.details || activity.user?.name) && (
          <p style={{ margin: '2px 0 0', fontSize: 9.5, color: isDark ? 'rgba(255,255,255,0.38)' : '#9A9490', lineHeight: 1.4 }}>
            {activity.details
              ? activity.details.slice(0, 60) + (activity.details.length > 60 ? '…' : '')
              : activity.user?.name}
          </p>
        )}
      </div>
    </motion.div>
  );
}

/* ── Ministry footer ────────────────────────────────────────────────────────── */
function MinistryFooter({ totalProjects, totalBudget, lastUpdated, isDark, border, card }: {
  totalProjects: number; totalBudget: number; lastUpdated?: string; isDark: boolean; border: string; card: string;
}) {
  const fmtBudget = totalBudget >= 1_000_000
    ? `${(totalBudget / 1_000_000).toFixed(1)}M OMR`
    : `${(totalBudget / 1000).toFixed(0)}K OMR`;

  return (
    <div style={{
      gridColumn: '1 / -1',
      background: card, border: `1px solid ${border}`,
      borderRadius: 16, padding: '16px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      {/* Ministry attribution */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: `${GOLD}10`, border: `1px solid ${GOLD}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 14 }}>🇴🇲</span>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.8)' : '#1A1A1A', letterSpacing: '-0.01em' }}>
            Ministry of Commerce & Industry
          </p>
          <p style={{ margin: 0, fontSize: 9, color: isDark ? 'rgba(255,255,255,0.3)' : '#9A9490', letterSpacing: '0.02em' }}>
            Sultanate of Oman · CSR Platform
          </p>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        {[
          { label: 'TOTAL PROJECTS', value: String(totalProjects) },
          { label: 'TOTAL BUDGET', value: fmtBudget },
          { label: 'LAST SYNC', value: lastUpdated ? formatRelTime(lastUpdated) : 'Live' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: isDark ? 'rgba(255,255,255,0.28)' : '#9A9490', fontFamily: "'Geist Mono', monospace" }}>
              {s.label}
            </p>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: GOLD, fontFamily: "'Geist Mono', monospace" }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Section eyebrow ────────────────────────────────────────────────────────── */
function SectionEyebrow({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
      color: 'rgba(200,164,78,0.7)',
      fontFamily: "'Geist Mono', ui-monospace, monospace",
    }}>
      {label}
    </span>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function normalizeRegion(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z_]/g, '');
}

function formatRelTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  } catch { return '' }
}
