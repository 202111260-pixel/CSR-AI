import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  ResponsiveContainer, Area, AreaChart, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, BarChart, Bar, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Line,
  ComposedChart,
} from 'recharts';
import {
  Heart, Users, Smile, Briefcase, Globe, Leaf, GraduationCap,
  Activity, Stethoscope, Building2, Cpu,
  TrendingUp, Calendar,
  FileText, FileSpreadsheet, Printer, Target,
  type LucideIcon, MapPin, Award, Sparkles, BarChart3,
  Shield, Globe2, DollarSign, Plus, TrendingUp as TrendUp, CheckCircle2,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTheme } from '../../hooks/useTheme';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '../../services/reportService';
import { socialMediaService } from '../../services/socialMediaService';
import type { ESGData } from '../../services/socialMediaService';
import { printTable, generateImpactReportExcel, type ExportColumn } from '../../utils/exportUtils';
import { generateImpactReportPDF } from '../../utils/pdfReportGenerator';
import { ActionBar } from '../../components/common/ActionBar';

/* ═══════════════════════════════════════════════════════════════════════
   ANIMATION CONSTANTS
═══════════════════════════════════════════════════════════════════════ */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } } };
const stagger = (d = 0) => ({ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: d } } });
const scaleIn = (d = 0) => ({ hidden: { opacity: 0, scale: 0.92 }, show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: EASE, delay: d } } });
const VP = { once: true, margin: '-60px' as const };

const IMPACT_C = ['#C8A44E', '#38bdf8', '#34d399', '#a78bfa', '#fbbf24', '#fb923c', '#4ade80', '#f472b6'];

const periods = ['This Quarter', 'This Year', '2025', '2024', 'All Time'] as const;

/* ═══════════════════════════════════════════════════════════════════════
   ESG CONFIGURATION
═══════════════════════════════════════════════════════════════════════ */

const ESG_COLORS = {
  environmental: '#34d399',
  social: '#38bdf8',
  governance: '#a78bfa',
  overall: '#C9C036',
};

const SDG_CONFIG: { id: number; name: string; color: string }[] = [
  { id: 1,  name: 'No Poverty',              color: '#E5243B' },
  { id: 2,  name: 'Zero Hunger',             color: '#DDA63A' },
  { id: 3,  name: 'Good Health',             color: '#4C9F38' },
  { id: 4,  name: 'Quality Education',       color: '#C5192D' },
  { id: 5,  name: 'Gender Equality',         color: '#FF3A21' },
  { id: 6,  name: 'Clean Water',             color: '#26BDE2' },
  { id: 7,  name: 'Clean Energy',            color: '#FCC30B' },
  { id: 8,  name: 'Decent Work',             color: '#A21942' },
  { id: 9,  name: 'Innovation',              color: '#FD6925' },
  { id: 10, name: 'Reduced Inequalities',    color: '#DD1367' },
  { id: 11, name: 'Sustainable Cities',      color: '#FD9D24' },
  { id: 12, name: 'Responsible Consumption', color: '#BF8B2E' },
  { id: 13, name: 'Climate Action',          color: '#3F7E44' },
  { id: 14, name: 'Life Below Water',        color: '#0A97D9' },
  { id: 15, name: 'Life on Land',            color: '#56C02B' },
  { id: 16, name: 'Peace & Justice',         color: '#00689D' },
  { id: 17, name: 'Partnerships',            color: '#19486A' },
];

const ESG_GRADE_CONFIG: Record<string, { color: string; bg: string; glow: string }> = {
  'A+': { color: '#34d399', bg: 'rgba(52,211,153,0.15)',  glow: '0 0 30px rgba(52,211,153,0.4)' },
  'A':  { color: '#4ade80', bg: 'rgba(74,222,128,0.15)',  glow: '0 0 30px rgba(74,222,128,0.4)' },
  'B+': { color: '#C9C036', bg: 'rgba(201,192,54,0.15)',  glow: '0 0 30px rgba(201,192,54,0.4)' },
  'B':  { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  glow: '0 0 30px rgba(251,191,36,0.4)' },
  'C+': { color: '#fb923c', bg: 'rgba(251,146,60,0.15)',  glow: '0 0 30px rgba(251,146,60,0.4)' },
  'C':  { color: '#f87171', bg: 'rgba(248,113,113,0.15)', glow: '0 0 30px rgba(248,113,113,0.4)' },
  'D':  { color: '#9ca3af', bg: 'rgba(156,163,175,0.15)', glow: '0 0 20px rgba(156,163,175,0.3)' },
};

const tooltipStyleESG = {
  backgroundColor: '#111827',
  border: '1px solid #374151',
  borderRadius: 12,
  boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
};

/* ═══════════════════════════════════════════════════════════════════════
   STATIC DATA
═══════════════════════════════════════════════════════════════════════ */

const categoryTabs = [
  { id: 'education', label: 'Education', icon: GraduationCap, color: '#38bdf8',
    stats: { projects: 12, beneficiaries: 4200, budget: 520000, satisfaction: 94 },
    metrics: [
      { label: 'Students Enrolled', value: 3200, icon: Users },
      { label: 'Schools Built', value: 4, icon: Building2 },
      { label: 'Scholarships', value: 180, icon: Award },
      { label: 'Literacy Rate ↑', value: 12, icon: TrendingUp },
    ],
    chartData: [
      { month: 'Jul', students: 2400, literacy: 68 },
      { month: 'Aug', students: 2600, literacy: 70 },
      { month: 'Sep', students: 2800, literacy: 72 },
      { month: 'Oct', students: 3000, literacy: 74 },
      { month: 'Nov', students: 3100, literacy: 76 },
      { month: 'Feb', students: 3200, literacy: 78 },
    ],
  },
  { id: 'healthcare', label: 'Healthcare', icon: Stethoscope, color: '#f87171',
    stats: { projects: 8, beneficiaries: 5800, budget: 680000, satisfaction: 91 },
    metrics: [
      { label: 'Patients Treated', value: 5200, icon: Users },
      { label: 'Health Centers', value: 3, icon: Building2 },
      { label: 'Vaccinations', value: 12500, icon: Activity },
      { label: 'Mortality ↓', value: 8, icon: TrendingUp },
    ],
    chartData: [
      { month: 'Jul', students: 3200, literacy: 82 },
      { month: 'Aug', students: 3600, literacy: 84 },
      { month: 'Sep', students: 4000, literacy: 85 },
      { month: 'Oct', students: 4500, literacy: 87 },
      { month: 'Nov', students: 5000, literacy: 89 },
      { month: 'Feb', students: 5200, literacy: 91 },
    ],
  },
  { id: 'environment', label: 'Environment', icon: Leaf, color: '#4ade80',
    stats: { projects: 7, beneficiaries: 2100, budget: 350000, satisfaction: 96 },
    metrics: [
      { label: 'Trees Planted', value: 45000, icon: Leaf },
      { label: 'CO₂ Reduced (t)', value: 320, icon: Globe },
      { label: 'Clean Water (km²)', value: 15, icon: Activity },
      { label: 'Species Protected', value: 24, icon: Heart },
    ],
    chartData: [
      { month: 'Jul', students: 1200, literacy: 72 },
      { month: 'Aug', students: 1400, literacy: 75 },
      { month: 'Sep', students: 1600, literacy: 78 },
      { month: 'Oct', students: 1750, literacy: 82 },
      { month: 'Nov', students: 1900, literacy: 85 },
      { month: 'Feb', students: 2100, literacy: 88 },
    ],
  },
  { id: 'economy', label: 'Economy', icon: Briefcase, color: '#fbbf24',
    stats: { projects: 6, beneficiaries: 1200, budget: 480000, satisfaction: 88 },
    metrics: [
      { label: 'SMEs Supported', value: 85, icon: Building2 },
      { label: 'Jobs Created', value: 342, icon: Briefcase },
      { label: 'Revenue Gen. (K)', value: 1200, icon: TrendingUp },
      { label: 'Training Hours', value: 8500, icon: GraduationCap },
    ],
    chartData: [
      { month: 'Jul', students: 600, literacy: 70 },
      { month: 'Aug', students: 720, literacy: 73 },
      { month: 'Sep', students: 850, literacy: 76 },
      { month: 'Oct', students: 950, literacy: 80 },
      { month: 'Nov', students: 1080, literacy: 84 },
      { month: 'Feb', students: 1200, literacy: 88 },
    ],
  },
  { id: 'infrastructure', label: 'Infrastructure', icon: Building2, color: '#fb923c',
    stats: { projects: 9, beneficiaries: 1500, budget: 280000, satisfaction: 85 },
    metrics: [
      { label: 'Roads Built (km)', value: 42, icon: MapPin },
      { label: 'Buildings', value: 7, icon: Building2 },
      { label: 'Solar Panels', value: 1200, icon: Cpu },
      { label: 'Water Wells', value: 15, icon: Activity },
    ],
    chartData: [
      { month: 'Jul', students: 800, literacy: 65 },
      { month: 'Aug', students: 900, literacy: 68 },
      { month: 'Sep', students: 1000, literacy: 72 },
      { month: 'Oct', students: 1100, literacy: 76 },
      { month: 'Nov', students: 1300, literacy: 80 },
      { month: 'Feb', students: 1500, literacy: 85 },
    ],
  },
  { id: 'technology', label: 'Technology', icon: Cpu, color: '#a78bfa',
    stats: { projects: 5, beneficiaries: 620, budget: 140000, satisfaction: 93 },
    metrics: [
      { label: 'People Trained', value: 420, icon: Users },
      { label: 'Labs Built', value: 3, icon: Building2 },
      { label: 'Devices Provided', value: 850, icon: Cpu },
      { label: 'Digital Literacy ↑', value: 22, icon: TrendingUp },
    ],
    chartData: [
      { month: 'Jul', students: 200, literacy: 78 },
      { month: 'Aug', students: 280, literacy: 80 },
      { month: 'Sep', students: 350, literacy: 83 },
      { month: 'Oct', students: 420, literacy: 86 },
      { month: 'Nov', students: 520, literacy: 90 },
      { month: 'Feb', students: 620, literacy: 93 },
    ],
  },
];

const impactTimeline = [
  { year: '2021', beneficiaries: 3200, projects: 8, budget: 450, satisfaction: 72, milestone: 'CSR Program Launch' },
  { year: '2022', beneficiaries: 5800, projects: 15, budget: 780, satisfaction: 78, milestone: 'First Healthcare Center' },
  { year: '2023', beneficiaries: 8500, projects: 24, budget: 1200, satisfaction: 82, milestone: 'Expanded to 5 Governorates' },
  { year: '2024', beneficiaries: 11200, projects: 35, budget: 1800, satisfaction: 87, milestone: 'SDG Partnership Signed' },
  { year: '2025', beneficiaries: 13200, projects: 42, budget: 2180, satisfaction: 89, milestone: '10K Beneficiaries Milestone' },
  { year: '2026', beneficiaries: 15420, projects: 47, budget: 2450, satisfaction: 92, milestone: 'AI Integration & Predictions' },
];


const predictionData = [
  { year: '2024', actual: 11200, predicted: null },
  { year: '2025', actual: 13200, predicted: 13500 },
  { year: '2026', actual: 15420, predicted: 15800 },
  { year: '2027', actual: null, predicted: 19200 },
  { year: '2028', actual: null, predicted: 23500 },
  { year: '2029', actual: null, predicted: 28800 },
  { year: '2030', actual: null, predicted: 35000 },
];

/* ═══════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════════════════ */

function GlassCard({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const { colors: P } = useTheme();
  return (
    <div className={cn('relative rounded-[20px]', className)}
      style={{ background: `${P.card}`, border: `1px solid ${P.border}`,
        boxShadow: `inset 0 1px 0 ${P.borderHi}40, 0 12px 40px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.03)`, ...style }}>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, action }: {
  icon: typeof Target; title: string; subtitle?: string; action?: React.ReactNode;
}) {
  const P = useTheme().colors;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(201,192,54,0.1)',
          border: '1px solid rgba(201,192,54,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={17} style={{ color: P.accent }} />
        </div>
        <div>
          <h2 style={{ color: P.textHi, fontSize: 15, fontWeight: 600, margin: 0 }}>{title}</h2>
          {subtitle && <p style={{ color: P.textLo, fontSize: 11, margin: 0, marginTop: 2 }}>{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
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
      setDisplay(end * eased);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, value]);
  return <span ref={ref}>{decimals ? display.toFixed(decimals) : Math.round(display).toLocaleString()}</span>;
}


function CircularProgress({ value, size = 48, stroke = 4, color }: { value: number; size?: number; stroke?: number; color: string }) {
  const { colors: P } = useTheme();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={P.border} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${(value / 100) * circ} ${circ}`} strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dasharray 0.8s ease' }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black" style={{ color }}>{value}%</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ESG: Score Ring SVG Component
═══════════════════════════════════════════════════════════════════════ */

function ESGScoreRing({ score, color, size = 120, strokeWidth = 10, label }: {
  score: number; color: string; size?: number; strokeWidth?: number; label?: string;
}) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const cx = size / 2;
  return (
    <div className="flex flex-col items-center gap-2">
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
          <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${color}80)`, transition: 'stroke-dashoffset 1.2s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color, fontSize: size > 100 ? 22 : 16, fontWeight: 700, lineHeight: 1 }}>{Math.round(score)}</span>
        </div>
      </div>
      {label && <span style={{ color, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>{label}</span>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ESG SECTION COMPONENT
═══════════════════════════════════════════════════════════════════════ */

function ESGSection({ data }: { data: ESGData }) {
  const { colors: P } = useTheme();
  const navigate = useNavigate();

  const gradeCfg = ESG_GRADE_CONFIG[data.grade] ?? ESG_GRADE_CONFIG['B'];

  /* ── Radar data ─────────────────────────────────────────────────── */
  const radarData = [
    { dimension: 'Environmental', score: data.scores.environmental, fullMark: 100 },
    { dimension: 'Social',        score: data.scores.social,        fullMark: 100 },
    { dimension: 'Governance',    score: data.scores.governance,    fullMark: 100 },
  ];

  /* ── SDG Coverage ───────────────────────────────────────────────── */
  const sdgMap = useMemo(() => {
    const m: Record<number, number> = {};
    data.sdgCoverage.forEach(s => { m[s.id] = s.projectCount; });
    return m;
  }, [data.sdgCoverage]);

  const coveredCount = data.sdgCoverage.filter(s => s.projectCount > 0).length;

  /* ── ENV SDG IDs ────────────────────────────────────────────────── */
  const ENV_SDG_IDS = [6, 7, 13, 14, 15];

  /* ── Quick stats ────────────────────────────────────────────────── */
  const quickStats = [
    {
      label: 'Total Beneficiaries',
      value: data.social.totalBeneficiaries,
      icon: Users,
      color: ESG_COLORS.social,
      format: 'number',
    },
    {
      label: 'Donations (OMR)',
      value: data.social.donationsTotal,
      icon: DollarSign,
      color: ESG_COLORS.environmental,
      format: 'currency',
    },
    {
      label: 'Env. Projects',
      value: data.environmental.projectCount,
      icon: Leaf,
      color: ESG_COLORS.environmental,
      format: 'number',
    },
    {
      label: 'Governance Score',
      value: data.scores.governance,
      icon: Shield,
      color: ESG_COLORS.governance,
      format: 'score',
    },
  ];

  return (
    <div>
      {/* ── Section Header ───────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase"
            style={{
              background: 'rgba(201,192,54,0.15)',
              color: '#C9C036',
              border: '1px solid rgba(201,192,54,0.3)',
            }}
          >
            <Shield size={12} /> ESG
          </div>
          <div>
            <h2 className="text-2xl font-bold" style={{ color: P.textHi }}>
              ESG Performance Dashboard
            </h2>
            <p className="text-sm mt-0.5" style={{ color: P.textLo }}>
              Omani CSR Disclosure — Environmental · Social · Governance
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/projects/add')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all hover:scale-105"
            style={{
              background: 'rgba(52,211,153,0.1)',
              color: '#34d399',
              border: '1px solid rgba(52,211,153,0.2)',
            }}
          >
            <Plus size={14} /> Add ESG Project
          </button>
          <button
            onClick={() => navigate('/reports/financial')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all hover:scale-105"
            style={{
              background: 'rgba(56,189,248,0.1)',
              color: '#38bdf8',
              border: '1px solid rgba(56,189,248,0.2)',
            }}
          >
            <FileText size={14} /> Financial Report
          </button>
        </div>
      </div>

      {/* ── Hero ESG Score Card ───────────────────────────────────── */}
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={VP}
        variants={scaleIn(0)}
        className="mb-6"
      >
        <GlassCard className="p-8">
          {/* Ambient glow */}
          <div
            className="pointer-events-none absolute inset-0 rounded-[20px]"
            style={{
              background: `radial-gradient(ellipse at 20% 50%, ${ESG_COLORS.overall}08 0%, transparent 60%),
                           radial-gradient(ellipse at 80% 50%, ${ESG_COLORS.environmental}06 0%, transparent 60%)`,
            }}
          />

          <div className="relative flex flex-col lg:flex-row items-center gap-8">
            {/* Overall Score Ring */}
            <div className="flex flex-col items-center gap-4 shrink-0">
              <ESGScoreRing
                score={data.overallScore}
                color={ESG_COLORS.overall}
                size={160}
                strokeWidth={12}
              />
              {/* Grade Badge */}
              <div
                className="px-5 py-2 rounded-full text-2xl font-black tracking-widest"
                style={{
                  background: gradeCfg.bg,
                  color: gradeCfg.color,
                  border: `2px solid ${gradeCfg.color}40`,
                  boxShadow: gradeCfg.glow,
                }}
              >
                {data.grade}
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: P.textLo }}>
                Overall ESG Grade
              </p>
            </div>

            {/* Vertical Divider */}
            <div
              className="hidden lg:block w-px self-stretch"
              style={{ background: `linear-gradient(180deg, transparent, ${P.border}, transparent)` }}
            />

            {/* E · S · G Score Rings */}
            <div className="flex-1 flex flex-col gap-6">
              <div className="flex items-center justify-center gap-10 flex-wrap">
                <motion.div variants={scaleIn(0.1)} className="flex flex-col items-center gap-3">
                  <div
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-1"
                    style={{ color: ESG_COLORS.environmental }}
                  >
                    <Leaf size={12} /> Environmental
                  </div>
                  <ESGScoreRing score={data.scores.environmental} color={ESG_COLORS.environmental} size={100} strokeWidth={9} />
                </motion.div>

                <motion.div variants={scaleIn(0.18)} className="flex flex-col items-center gap-3">
                  <div
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-1"
                    style={{ color: ESG_COLORS.social }}
                  >
                    <Globe2 size={12} /> Social
                  </div>
                  <ESGScoreRing score={data.scores.social} color={ESG_COLORS.social} size={100} strokeWidth={9} />
                </motion.div>

                <motion.div variants={scaleIn(0.26)} className="flex flex-col items-center gap-3">
                  <div
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-1"
                    style={{ color: ESG_COLORS.governance }}
                  >
                    <Shield size={12} /> Governance
                  </div>
                  <ESGScoreRing score={data.scores.governance} color={ESG_COLORS.governance} size={100} strokeWidth={9} />
                </motion.div>
              </div>

              {/* Quick Stats Strip */}
              <div
                className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6"
                style={{ borderTop: `1px solid ${P.border}` }}
              >
                {quickStats.map((stat, i) => {
                  const StatIcon = stat.icon;
                  const displayValue =
                    stat.format === 'currency'
                      ? `${(stat.value / 1000).toFixed(1)}k`
                      : stat.format === 'score'
                      ? stat.value.toFixed(0)
                      : stat.value.toLocaleString();

                  return (
                    <motion.div
                      key={stat.label}
                      variants={stagger(i * 0.07)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{ background: `${stat.color}08`, border: `1px solid ${stat.color}20` }}
                    >
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
                        style={{ background: `${stat.color}15` }}
                      >
                        <StatIcon size={16} style={{ color: stat.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs truncate" style={{ color: P.textLo }}>{stat.label}</p>
                        <p className="text-lg font-bold" style={{ color: stat.color }}>{displayValue}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ── Second Row: Radar + Trend + SDG Grid ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Col 1: ESG Radar Chart */}
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger(0)}>
          <GlassCard className="p-6 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: 'rgba(201,192,54,0.1)', border: '1px solid rgba(201,192,54,0.15)' }}
              >
                <BarChart3 size={16} style={{ color: P.accent }} />
              </div>
              <div>
                <h3 className="text-base font-semibold" style={{ color: P.textHi }}>ESG Radar</h3>
                <p className="text-xs mt-0.5" style={{ color: P.textLo }}>Pillar comparison view</p>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                    <PolarGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis
                      dataKey="dimension"
                      tick={({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => {
                        const colorMap: Record<string, string> = {
                          Environmental: ESG_COLORS.environmental,
                          Social: ESG_COLORS.social,
                          Governance: ESG_COLORS.governance,
                        };
                        return (
                          <text
                            x={x} y={y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={12}
                            fontWeight={600}
                            fill={colorMap[payload.value] || P.textMd}
                          >
                            {payload.value}
                          </text>
                        );
                      }}
                    />
                    <Radar
                      name="ESG Score"
                      dataKey="score"
                      stroke={ESG_COLORS.overall}
                      fill={ESG_COLORS.overall}
                      fillOpacity={0.2}
                      strokeWidth={2}
                      dot={{ fill: ESG_COLORS.overall, r: 4 }}
                    />
                    <RTooltip
                      contentStyle={tooltipStyleESG}
                      labelStyle={{ color: '#F0EFE2', fontWeight: 600 }}
                      formatter={(value: number) => [`${value}/100`, 'Score']}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Pillar Legend */}
            <div className="flex justify-center gap-4 mt-2">
              {[
                { label: 'Environmental', color: ESG_COLORS.environmental },
                { label: 'Social',        color: ESG_COLORS.social },
                { label: 'Governance',    color: ESG_COLORS.governance },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                  <span className="text-[11px] font-medium" style={{ color: P.textLo }}>{l.label}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Col 2: ESG Trend Chart */}
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger(0.1)}>
          <GlassCard className="p-6 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: 'rgba(201,192,54,0.1)', border: '1px solid rgba(201,192,54,0.15)' }}
              >
                <TrendUp size={16} style={{ color: P.accent }} />
              </div>
              <div>
                <h3 className="text-base font-semibold" style={{ color: P.textHi }}>ESG Trend</h3>
                <p className="text-xs mt-0.5" style={{ color: P.textLo }}>Monthly score trajectory</p>
              </div>
            </div>
            <div className="flex-1">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.esgTrend} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <defs>
                      <linearGradient id="esgGradE" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={ESG_COLORS.environmental} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={ESG_COLORS.environmental} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="esgGradS" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={ESG_COLORS.social} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={ESG_COLORS.social} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="esgGradG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={ESG_COLORS.governance} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={ESG_COLORS.governance} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                    <XAxis dataKey="month" tick={{ fill: P.textLo, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: P.textLo, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <RTooltip
                      contentStyle={tooltipStyleESG}
                      labelStyle={{ color: '#F0EFE2', fontWeight: 600, marginBottom: 4 }}
                      itemStyle={{ color: '#A8A48A', fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="environmental" name="Environmental" stroke={ESG_COLORS.environmental} strokeWidth={2} fill="url(#esgGradE)" dot={false} activeDot={{ r: 4 }} />
                    <Area type="monotone" dataKey="social"        name="Social"        stroke={ESG_COLORS.social}        strokeWidth={2} fill="url(#esgGradS)" dot={false} activeDot={{ r: 4 }} />
                    <Area type="monotone" dataKey="governance"    name="Governance"    stroke={ESG_COLORS.governance}    strokeWidth={2} fill="url(#esgGradG)" dot={false} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex justify-center gap-4 mt-3">
              {[
                { label: 'Env.',  color: ESG_COLORS.environmental },
                { label: 'Soc.',  color: ESG_COLORS.social },
                { label: 'Gov.',  color: ESG_COLORS.governance },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                  <span className="text-[11px] font-medium" style={{ color: P.textLo }}>{l.label}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Col 3: SDG Coverage Grid */}
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger(0.2)}>
          <GlassCard className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(201,192,54,0.1)', border: '1px solid rgba(201,192,54,0.15)' }}
                >
                  <Award size={16} style={{ color: P.accent }} />
                </div>
                <div>
                  <h3 className="text-base font-semibold" style={{ color: P.textHi }}>SDG Coverage</h3>
                  <p className="text-xs mt-0.5" style={{ color: P.textLo }}>
                    <span className="font-bold" style={{ color: ESG_COLORS.overall }}>{coveredCount}</span>/17 SDGs Covered
                  </p>
                </div>
              </div>
            </div>

            {/* SDG Tiles Grid */}
            <div className="flex-1 grid grid-cols-4 gap-2 content-start">
              {SDG_CONFIG.map((sdg) => {
                const count = sdgMap[sdg.id] ?? 0;
                const active = count > 0;
                return (
                  <motion.div
                    key={sdg.id}
                    whileHover={active ? { scale: 1.08 } : {}}
                    className="flex flex-col items-center justify-center gap-0.5 rounded-xl p-2 text-center cursor-default transition-all"
                    style={{
                      background: active ? `${sdg.color}18` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${active ? sdg.color + '40' : 'rgba(255,255,255,0.06)'}`,
                      opacity: active ? 1 : 0.35,
                      boxShadow: active ? `0 0 12px ${sdg.color}20` : 'none',
                    }}
                    title={`SDG ${sdg.id}: ${sdg.name}${active ? ` (${count} project${count > 1 ? 's' : ''})` : ' — Not covered'}`}
                  >
                    <span
                      className="text-xs font-black leading-none"
                      style={{ color: active ? sdg.color : P.textLo }}
                    >
                      {sdg.id}
                    </span>
                    {active && (
                      <div
                        className="w-1 h-1 rounded-full mt-0.5"
                        style={{ background: sdg.color }}
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* SDG Legend hint */}
            <div
              className="mt-4 pt-3 flex items-center gap-3"
              style={{ borderTop: `1px solid ${P.border}` }}
            >
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-md" style={{ background: 'rgba(201,192,54,0.3)', border: '1px solid rgba(201,192,54,0.5)' }} />
                <span className="text-[11px]" style={{ color: P.textLo }}>Active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-md" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', opacity: 0.4 }} />
                <span className="text-[11px]" style={{ color: P.textLo }}>Not covered</span>
              </div>
              <span className="text-[11px] ml-auto" style={{ color: P.textLo }}>
                Hover for details
              </span>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* ── Third Row: E · S · G Detail Cards ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Environmental Card */}
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger(0)}>
          <GlassCard className="p-6 h-full flex flex-col" style={{ borderColor: `${ESG_COLORS.environmental}30` }}>
            <div
              className="pointer-events-none absolute inset-0 rounded-[20px]"
              style={{ background: `radial-gradient(ellipse at top left, ${ESG_COLORS.environmental}06, transparent 60%)` }}
            />
            <div className="relative flex-1 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: `${ESG_COLORS.environmental}15`, border: `1px solid ${ESG_COLORS.environmental}30` }}
                  >
                    <Leaf size={18} style={{ color: ESG_COLORS.environmental }} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold" style={{ color: P.textHi }}>Environmental</h3>
                    <p className="text-xs" style={{ color: P.textLo }}>Planet impact & sustainability</p>
                  </div>
                </div>
                <div
                  className="px-3 py-1 rounded-full text-sm font-bold"
                  style={{
                    background: `${ESG_COLORS.environmental}18`,
                    color: ESG_COLORS.environmental,
                    border: `1px solid ${ESG_COLORS.environmental}30`,
                    boxShadow: `0 0 16px ${ESG_COLORS.environmental}30`,
                  }}
                >
                  {Math.round(data.scores.environmental)}
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-col gap-4 flex-1">
                {/* Project Count */}
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: P.textMd }}>Env. Projects</span>
                  <span className="text-lg font-bold" style={{ color: ESG_COLORS.environmental }}>
                    {data.environmental.projectCount}
                  </span>
                </div>

                {/* Budget Share */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm" style={{ color: P.textMd }}>Budget Allocation</span>
                    <span className="text-sm font-bold" style={{ color: ESG_COLORS.environmental }}>
                      {data.environmental.budgetShare.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: P.border }}>
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${data.environmental.budgetShare}%` }}
                      viewport={VP}
                      transition={{ duration: 1.2, ease: EASE }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${ESG_COLORS.environmental}, ${ESG_COLORS.environmental}80)`, boxShadow: `0 0 8px ${ESG_COLORS.environmental}60` }}
                    />
                  </div>
                </div>

                {/* Environmental SDG IDs */}
                <div>
                  <p className="text-xs mb-2" style={{ color: P.textLo }}>Environmental SDGs</p>
                  <div className="flex flex-wrap gap-2">
                    {ENV_SDG_IDS.map(id => {
                      const sdg = SDG_CONFIG.find(s => s.id === id)!;
                      const active = data.environmental.sdgsCovered.includes(id);
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all"
                          style={{
                            background: active ? `${sdg.color}20` : 'rgba(255,255,255,0.04)',
                            color: active ? sdg.color : P.textLo,
                            border: `1px solid ${active ? sdg.color + '40' : 'rgba(255,255,255,0.08)'}`,
                            opacity: active ? 1 : 0.4,
                          }}
                          title={sdg.name}
                        >
                          SDG {id}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Total Budget */}
                <div
                  className="mt-auto flex items-center justify-between pt-3"
                  style={{ borderTop: `1px solid ${P.border}` }}
                >
                  <span className="text-xs" style={{ color: P.textLo }}>Total Env. Budget</span>
                  <span className="text-sm font-bold" style={{ color: ESG_COLORS.environmental }}>
                    OMR {(data.environmental.totalBudget / 1000).toFixed(1)}k
                  </span>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Social Card */}
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger(0.1)}>
          <GlassCard className="p-6 h-full flex flex-col" style={{ borderColor: `${ESG_COLORS.social}30` }}>
            <div
              className="pointer-events-none absolute inset-0 rounded-[20px]"
              style={{ background: `radial-gradient(ellipse at top left, ${ESG_COLORS.social}06, transparent 60%)` }}
            />
            <div className="relative flex-1 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: `${ESG_COLORS.social}15`, border: `1px solid ${ESG_COLORS.social}30` }}
                  >
                    <Globe2 size={18} style={{ color: ESG_COLORS.social }} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold" style={{ color: P.textHi }}>Social</h3>
                    <p className="text-xs" style={{ color: P.textLo }}>People, communities & impact</p>
                  </div>
                </div>
                <div
                  className="px-3 py-1 rounded-full text-sm font-bold"
                  style={{
                    background: `${ESG_COLORS.social}18`,
                    color: ESG_COLORS.social,
                    border: `1px solid ${ESG_COLORS.social}30`,
                    boxShadow: `0 0 16px ${ESG_COLORS.social}30`,
                  }}
                >
                  {Math.round(data.scores.social)}
                </div>
              </div>

              {/* Stats with progress bars */}
              <div className="flex flex-col gap-3.5 flex-1">
                {[
                  {
                    label: 'Total Beneficiaries',
                    value: data.social.totalBeneficiaries,
                    target: Math.max(data.social.totalBeneficiaries * 1.2, 1),
                    display: data.social.totalBeneficiaries.toLocaleString(),
                    isCount: true,
                  },
                  {
                    label: 'Donations (OMR)',
                    value: data.social.donationsTotal,
                    target: Math.max(data.social.donationsTotal * 1.2, 1),
                    display: `OMR ${(data.social.donationsTotal / 1000).toFixed(1)}k`,
                    isCount: false,
                  },
                  {
                    label: 'Community Ideas',
                    value: data.social.communityIdeas,
                    target: Math.max(data.social.communityIdeas * 1.3, 1),
                    display: data.social.communityIdeas.toString(),
                    isCount: true,
                  },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs" style={{ color: P.textMd }}>{stat.label}</span>
                      <span className="text-sm font-bold" style={{ color: ESG_COLORS.social }}>{stat.display}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: P.border }}>
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${Math.min((stat.value / stat.target) * 100, 100)}%` }}
                        viewport={VP}
                        transition={{ duration: 1, ease: EASE, delay: 0.1 }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${ESG_COLORS.social}, ${ESG_COLORS.social}70)` }}
                      />
                    </div>
                  </div>
                ))}

                {/* Active Employees */}
                <div
                  className="mt-auto pt-3 flex items-center justify-between"
                  style={{ borderTop: `1px solid ${P.border}` }}
                >
                  <div className="flex items-center gap-2">
                    <Users size={14} style={{ color: ESG_COLORS.social }} />
                    <span className="text-xs" style={{ color: P.textLo }}>Active Employees</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: ESG_COLORS.social }}>
                    {data.social.activeEmployees}/{data.social.totalEmployees}
                  </span>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Governance Card */}
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger(0.2)}>
          <GlassCard className="p-6 h-full flex flex-col" style={{ borderColor: `${ESG_COLORS.governance}30` }}>
            <div
              className="pointer-events-none absolute inset-0 rounded-[20px]"
              style={{ background: `radial-gradient(ellipse at top left, ${ESG_COLORS.governance}06, transparent 60%)` }}
            />
            <div className="relative flex-1 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: `${ESG_COLORS.governance}15`, border: `1px solid ${ESG_COLORS.governance}30` }}
                  >
                    <Shield size={18} style={{ color: ESG_COLORS.governance }} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold" style={{ color: P.textHi }}>Governance</h3>
                    <p className="text-xs" style={{ color: P.textLo }}>Accountability & transparency</p>
                  </div>
                </div>
                <div
                  className="px-3 py-1 rounded-full text-sm font-bold"
                  style={{
                    background: `${ESG_COLORS.governance}18`,
                    color: ESG_COLORS.governance,
                    border: `1px solid ${ESG_COLORS.governance}30`,
                    boxShadow: `0 0 16px ${ESG_COLORS.governance}30`,
                  }}
                >
                  {Math.round(data.scores.governance)}
                </div>
              </div>

              {/* Governance Metrics */}
              <div className="flex flex-col gap-4 flex-1">
                {[
                  {
                    label: 'Alert Resolution Rate',
                    value: data.governance.alertResolutionRate,
                    icon: CheckCircle2,
                    color: data.governance.alertResolutionRate >= 80 ? '#34d399' : data.governance.alertResolutionRate >= 50 ? '#fbbf24' : '#f87171',
                  },
                  {
                    label: 'Project Completion',
                    value: data.governance.projectCompletionRate,
                    icon: Target,
                    color: data.governance.projectCompletionRate >= 70 ? '#34d399' : data.governance.projectCompletionRate >= 40 ? '#fbbf24' : '#f87171',
                  },
                  {
                    label: 'Review Coverage',
                    value: data.governance.reviewCoverage,
                    icon: Award,
                    color: ESG_COLORS.governance,
                  },
                  {
                    label: 'Transparency Score',
                    value: data.governance.transparencyScore,
                    icon: BarChart3,
                    color: ESG_COLORS.governance,
                  },
                ].map((metric) => {
                  const MetricIcon = metric.icon;
                  return (
                    <div key={metric.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <MetricIcon size={12} style={{ color: metric.color }} />
                          <span className="text-xs" style={{ color: P.textMd }}>{metric.label}</span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: metric.color }}>
                          {metric.value.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: P.border }}>
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${Math.min(metric.value, 100)}%` }}
                          viewport={VP}
                          transition={{ duration: 1, ease: EASE, delay: 0.15 }}
                          className="h-full rounded-full"
                          style={{
                            background: `linear-gradient(90deg, ${metric.color}, ${metric.color}70)`,
                            boxShadow: `0 0 6px ${metric.color}40`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* ── Disclosure Frameworks Card ────────────────────────────── */}
      <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp}>
        <GlassCard className="p-6">
          <div
            className="pointer-events-none absolute inset-0 rounded-[20px]"
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, rgba(201,192,54,0.05), transparent 60%)',
            }}
          />
          <div className="relative flex flex-col lg:flex-row items-start lg:items-center gap-6">
            {/* Title */}
            <div className="shrink-0">
              <div className="flex items-center gap-3 mb-1">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(201,192,54,0.1)', border: '1px solid rgba(201,192,54,0.15)' }}
                >
                  <Building2 size={16} style={{ color: P.accent }} />
                </div>
                <h3 className="text-base font-bold" style={{ color: P.textHi }}>
                  Reporting Frameworks & Standards
                </h3>
              </div>
              <p className="text-xs ml-12" style={{ color: P.textLo }}>
                Aligned with international ESG disclosure standards
              </p>
            </div>

            {/* Divider */}
            <div className="hidden lg:block w-px self-stretch mx-2" style={{ background: P.border }} />

            {/* Framework Badges */}
            <div className="flex flex-wrap gap-4 flex-1">
              {[
                {
                  name: 'GRI',
                  full: 'Global Reporting Initiative',
                  description: 'Comprehensive sustainability reporting standard',
                  color: '#34d399',
                  icon: Leaf,
                },
                {
                  name: 'SASB',
                  full: 'Sustainability Accounting Standards Board',
                  description: 'Industry-specific sustainability disclosure',
                  color: '#38bdf8',
                  icon: BarChart3,
                },
                {
                  name: 'UN SDGs',
                  full: 'United Nations SDGs',
                  description: '17 Sustainable Development Goals framework',
                  color: '#a78bfa',
                  icon: Globe2,
                },
              ].map((fw) => {
                const FwIcon = fw.icon;
                return (
                  <motion.div
                    key={fw.name}
                    whileHover={{ y: -3, scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl flex-1 min-w-[200px]"
                    style={{
                      background: `${fw.color}08`,
                      border: `1px solid ${fw.color}25`,
                    }}
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
                      style={{ background: `${fw.color}15`, border: `1px solid ${fw.color}30` }}
                    >
                      <FwIcon size={18} style={{ color: fw.color }} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black" style={{ color: fw.color }}>{fw.name}</span>
                        <span className="text-xs truncate hidden xl:block" style={{ color: P.textLo }}>{fw.full}</span>
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: P.textLo }}>{fw.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Divider */}
            <div className="hidden lg:block w-px self-stretch mx-2" style={{ background: P.border }} />

            {/* Link to Financial Report */}
            <button
              onClick={() => navigate('/reports/financial')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shrink-0 cursor-pointer transition-all hover:scale-105"
              style={{
                background: 'rgba(201,192,54,0.1)',
                color: '#C9C036',
                border: '1px solid rgba(201,192,54,0.25)',
              }}
            >
              <FileText size={14} />
              View Detailed Compliance
            </button>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════ */
export default function ImpactReports() {
  const navigate = useNavigate();
  const P = useTheme().colors;
  const [period, setPeriod] = useState<(typeof periods)[number]>('All Time');
  const [activeTab, setActiveTab] = useState('education');

  /* ── API wiring ── */
  const periodParams = useMemo(() => {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    switch (period) {
      case 'This Quarter': return { startDate: fmt(new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)), endDate: fmt(now) };
      case 'This Year': return { startDate: fmt(new Date(now.getFullYear(), 0, 1)), endDate: fmt(now) };
      case '2025': return { startDate: '2025-01-01', endDate: '2025-12-31' };
      case '2024': return { startDate: '2024-01-01', endDate: '2024-12-31' };
      default: return {};
    }
  }, [period]);

  const { data: reportRes, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['report-impact', periodParams],
    queryFn: () => reportService.getImpactReport(periodParams),
    staleTime: 5 * 60 * 1000,
  });
  const report = (reportRes as any)?.data;

  const { data: socialRes } = useQuery({
    queryKey: ['social-media-esg'],
    queryFn: () => socialMediaService.getAnalytics(),
    staleTime: 5 * 60 * 1000,
  });
  const esgData: ESGData | null = (socialRes as any)?.data?.esgData ?? null;

  /* ── Derived data from API ── */
  const sdgConfig: { id: number; name: string; color: string }[] = [
    { id: 1,  name: 'No Poverty',          color: '#E5243B' },
    { id: 2,  name: 'Zero Hunger',         color: '#DDA63A' },
    { id: 3,  name: 'Good Health',          color: '#4C9F38' },
    { id: 4,  name: 'Quality Education',    color: '#C5192D' },
    { id: 5,  name: 'Gender Equality',      color: '#FF3A21' },
    { id: 6,  name: 'Clean Water',          color: '#26BDE2' },
    { id: 7,  name: 'Clean Energy',         color: '#FCC30B' },
    { id: 8,  name: 'Decent Work',          color: '#A21942' },
    { id: 9,  name: 'Industry & Innovation', color: '#FD6925' },
    { id: 10, name: 'Reduced Inequalities', color: '#DD1367' },
    { id: 11, name: 'Sustainable Cities',   color: '#FD9D24' },
    { id: 12, name: 'Responsible Consumption', color: '#BF8B2E' },
    { id: 13, name: 'Climate Action',       color: '#3F7E44' },
    { id: 14, name: 'Life Below Water',     color: '#0A97D9' },
    { id: 15, name: 'Life on Land',         color: '#56C02B' },
    { id: 16, name: 'Peace & Justice',      color: '#00689D' },
    { id: 17, name: 'Partnerships',         color: '#19486A' },
  ];


  const sdgGoals = useMemo(() => {
    const dist = report?.impactDistribution;
    const totalProjects = dist ? (dist.low + dist.medium + dist.high + dist.veryHigh) : 0;
    return sdgConfig.map(goal => {
      if (!report?.sdgAlignment?.length || !totalProjects) return { ...goal, progress: 0 };
      const match = report.sdgAlignment.find((s: any) => String(s.goal) === String(goal.id));
      if (match) {
        return { ...goal, progress: Math.min(Math.round((match.count / totalProjects) * 100), 100) };
      }
      return { ...goal, progress: 0 };
    });
  }, [report]);

  /* Dynamic category tabs from API */
  const dynamicCategoryTabs = useMemo(() => {
    if (!report?.categoryBreakdown?.length) return categoryTabs;
    const colorPalette = ['#38bdf8', '#f87171', '#4ade80', '#fbbf24', '#fb923c', '#a78bfa', '#C8A44E', '#34d399', '#6366f1', '#ec4899', '#14b8a6', '#8b5cf6'];
    const iconMap: Record<string, LucideIcon> = {
      'Education': GraduationCap, 'Healthcare': Stethoscope, 'Environment': Leaf, 'Environmental': Leaf,
      'Economy': Briefcase, 'Infrastructure': Building2, 'Technology': Cpu, 'Heritage': Building2,
      'Innovation': Cpu, 'Training': GraduationCap, 'Sports': Activity, 'Energy': Activity,
      'Food': Heart, 'Tourism': Globe, 'Disability': Heart, 'Family': Users, 'Aflaj': Activity,
    };
    return report.categoryBreakdown.map((cat: any, i: number) => {
      const firstWord = cat.name.split(' ')[0];
      const icon = iconMap[firstWord] || Target;
      return {
        id: cat.id,
        label: cat.name,
        icon,
        color: colorPalette[i % colorPalette.length],
        stats: {
          projects: cat.projects || 0,
          beneficiaries: cat.beneficiaries || 0,
          budget: cat.budget || 0,
          satisfaction: cat.satisfaction || 0,
        },
        metrics: [
          { label: 'Projects', value: cat.projects || 0, icon: Briefcase },
          { label: 'Beneficiaries', value: cat.beneficiaries || 0, icon: Users },
          { label: 'Budget (OMR)', value: cat.budget || 0, icon: TrendingUp },
          { label: 'Satisfaction', value: `${cat.satisfaction || 0}%`, icon: Smile },
        ],
        chartData: [
          { month: 'Jul', students: Math.round((cat.beneficiaries || 100) * 0.5), literacy: 65 + Math.round(Math.random() * 10) },
          { month: 'Aug', students: Math.round((cat.beneficiaries || 100) * 0.6), literacy: 68 + Math.round(Math.random() * 10) },
          { month: 'Sep', students: Math.round((cat.beneficiaries || 100) * 0.7), literacy: 72 + Math.round(Math.random() * 10) },
          { month: 'Oct', students: Math.round((cat.beneficiaries || 100) * 0.8), literacy: 76 + Math.round(Math.random() * 10) },
          { month: 'Nov', students: Math.round((cat.beneficiaries || 100) * 0.9), literacy: 80 + Math.round(Math.random() * 10) },
          { month: 'Dec', students: cat.beneficiaries || 100, literacy: cat.satisfaction || 85 },
        ],
      };
    });
  }, [report]);

  const currentCat = useMemo(() => {
    const tabs = dynamicCategoryTabs.length > 0 ? dynamicCategoryTabs : categoryTabs;
    const base = tabs.find(c => c.id === activeTab) || tabs[0];
    if (!base) return categoryTabs[0];
    return base;
  }, [activeTab, dynamicCategoryTabs]);



  /* Category beneficiaries chart for demographics section */
  const categoryBeneficiariesData = useMemo(() => {
    return dynamicCategoryTabs.slice(0, 8).map((cat: any, i: number) => ({
      name: cat.label.slice(0, 10),
      beneficiaries: cat.stats?.beneficiaries ?? 0,
      color: cat.color ?? IMPACT_C[i % IMPACT_C.length],
    }));
  }, [dynamicCategoryTabs]);

  /* SDG radar data (top 8) */
  const sdgRadarData = useMemo(() => {
    return sdgGoals.slice(0, 8).map(g => ({
      subject: `SDG ${g.id}`,
      progress: g.progress,
      fullMark: 100,
    }));
  }, [sdgGoals]);

  /* ── Export Handlers ── */
  const exportColumns: ExportColumn[] = [
    { key: 'category', header: 'الفئة', width: 20 },
    { key: 'metric', header: 'المؤشر', width: 25 },
    { key: 'value', header: 'القيمة', width: 15 },
  ];

  const getExportData = useCallback(() => {
    const data: Record<string, unknown>[] = [
      { category: 'المستفيدون', metric: 'الإجمالي', value: report?.demographics?.total ?? 0 },
      { category: 'المستفيدون', metric: 'ذكور', value: report?.demographics?.male ?? 0 },
      { category: 'المستفيدون', metric: 'إناث', value: report?.demographics?.female ?? 0 },
      { category: 'المستفيدون', metric: 'أطفال', value: report?.demographics?.children ?? 0 },
      { category: 'المستفيدون', metric: 'كبار السن', value: report?.demographics?.elderly ?? 0 },
      { category: 'المستفيدون', metric: 'ذوي الإعاقة', value: report?.demographics?.disabled ?? 0 },
    ];
    if (sdgGoals?.length) {
      data.push({ category: '--- أهداف التنمية المستدامة ---', metric: '', value: '' });
      sdgGoals.filter(g => g.progress > 0).forEach(goal => {
        data.push({ category: 'SDG', metric: goal.name, value: `${goal.progress}%` });
      });
    }
    if (dynamicCategoryTabs?.length) {
      data.push({ category: '--- توزيع الفئات ---', metric: '', value: '' });
      dynamicCategoryTabs.forEach((cat: any) => {
        data.push({ category: cat.label, metric: 'مشاريع', value: cat.stats?.projects ?? 0 });
        data.push({ category: cat.label, metric: 'مستفيدون', value: cat.stats?.beneficiaries ?? 0 });
      });
    }
    return data;
  }, [report, sdgGoals, dynamicCategoryTabs]);

  const handleExcelExport = useCallback(() => {
    generateImpactReportExcel({
      kpis: [
        { label: 'Total Beneficiaries', value: report?.demographics?.total ?? 0 },
        { label: 'Communities Reached', value: report?.communitiesReached ?? 0 },
        { label: 'Projects', value: report?.totalProjects ?? 0 },
        { label: 'SDG Goals', value: report?.sdgAlignment?.length ?? 0 },
        { label: 'Satisfaction (%)', value: report?.avgRating != null ? Math.round(report.avgRating * 20 * 10) / 10 : 0 },
      ],
      demographics: [
        { label: 'Total', value: report?.demographics?.total ?? 0 },
        { label: 'Male', value: report?.demographics?.male ?? 0 },
        { label: 'Female', value: report?.demographics?.female ?? 0 },
        { label: 'Children', value: report?.demographics?.children ?? 0 },
        { label: 'Elderly', value: report?.demographics?.elderly ?? 0 },
        { label: 'Disabled', value: report?.demographics?.disabled ?? 0 },
      ],
      sdgGoals,
      categoryImpact: dynamicCategoryTabs.map((c: any) => ({
        label: c.label, projects: c.stats?.projects ?? 0,
        beneficiaries: c.stats?.beneficiaries ?? 0,
        budget: c.stats?.budget ?? 0, satisfaction: c.stats?.satisfaction ?? 0,
      })),
      dateRange: periodParams.startDate ? { from: periodParams.startDate, to: (periodParams as any).endDate } : undefined,
      esgScore: esgData ? {
        grade: esgData.grade, environmental: esgData.scores.environmental,
        social: esgData.scores.social, governance: esgData.scores.governance, overall: esgData.overallScore,
      } : undefined,
      categoryDetails: (dynamicCategoryTabs.length > 0 ? dynamicCategoryTabs : categoryTabs).map((cat: any) => ({
        label: cat.label,
        metrics: (cat.metrics ?? []).map((m: any) => ({ label: m.label, value: m.value })),
      })),
      impactHistory: impactTimeline.map(h => ({
        year: h.year, beneficiaries: h.beneficiaries, projects: h.projects,
        budget: h.budget, satisfaction: h.satisfaction, milestone: h.milestone,
      })),
      predictionData: predictionData.map(p => ({
        year: p.year, actual: p.actual ?? undefined, predicted: p.predicted ?? undefined,
      })),
    });
  }, [report, sdgGoals, dynamicCategoryTabs, periodParams, esgData]);

  const handlePdfExport = useCallback(() => {
    generateImpactReportPDF({
      kpis: [
        { label: 'Total Beneficiaries', value: report?.demographics?.total ?? 0, format: 'number', color: '#C8A44E' },
        { label: 'Communities', value: report?.communitiesReached ?? 0, format: 'number', color: '#38bdf8' },
        { label: 'Projects', value: report?.totalProjects ?? 0, format: 'number', color: '#34d399' },
        { label: 'SDG Goals', value: report?.sdgAlignment?.length ?? 0, format: 'number', color: '#fbbf24' },
        { label: 'Satisfaction', value: report?.avgRating != null ? Math.round(report.avgRating * 20 * 10) / 10 : 0, format: 'percentage', color: '#fb923c' },
      ],
      demographics: [
        { label: 'Total', value: report?.demographics?.total ?? 0 },
        { label: 'Male', value: report?.demographics?.male ?? 0 },
        { label: 'Female', value: report?.demographics?.female ?? 0 },
        { label: 'Children', value: report?.demographics?.children ?? 0 },
        { label: 'Elderly', value: report?.demographics?.elderly ?? 0 },
        { label: 'Disabled', value: report?.demographics?.disabled ?? 0 },
      ],
      sdgGoals,
      categoryImpact: dynamicCategoryTabs.map((c: any) => ({
        label: c.label, projects: c.stats?.projects ?? 0,
        beneficiaries: c.stats?.beneficiaries ?? 0,
        budget: c.stats?.budget ?? 0, satisfaction: c.stats?.satisfaction ?? 0,
      })),
      dateRange: periodParams.startDate ? { from: periodParams.startDate, to: (periodParams as any).endDate } : undefined,
      esgScore: esgData ? {
        grade: esgData.grade,
        environmental: esgData.scores.environmental,
        social: esgData.scores.social,
        governance: esgData.scores.governance,
        overall: esgData.overallScore,
      } : undefined,
      categoryDetails: (dynamicCategoryTabs.length > 0 ? dynamicCategoryTabs : categoryTabs).map((cat: any) => ({
        label: cat.label,
        metrics: (cat.metrics ?? []).map((m: any) => ({ label: m.label, value: m.value })),
      })),
      beneficiaryTrend: impactTimeline.map(h => ({ month: h.year, value: h.beneficiaries })),
      impactHistory: impactTimeline.map(h => ({
        year: h.year, beneficiaries: h.beneficiaries, projects: h.projects,
        budget: h.budget, satisfaction: h.satisfaction, milestone: h.milestone,
      })),
      predictionData: predictionData.map(p => ({
        year: p.year,
        actual: p.actual ?? undefined,
        predicted: p.predicted ?? undefined,
      })),
    });
  }, [report, sdgGoals, dynamicCategoryTabs, periodParams, esgData]);

  const handlePrint = useCallback(() => {
    printTable(getExportData(), exportColumns, 'تقرير الأثر - Impact Report');
  }, [getExportData]);

  /* ── Loading State ── */
  if (isLoading) {
    return (
      <div style={{ background: P.bg }} className="min-h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: P.accent, borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: P.textMd }}>Loading impact data...</p>
        </div>
      </div>
    );
  }

  /* ── Derived totals for demographics section ── */
  const totalBenef = report?.demographics?.total || 1;
  const malePct   = Math.round((report?.demographics?.male ?? 0) / totalBenef * 100);
  const femalePct = Math.round((report?.demographics?.female ?? 0) / totalBenef * 100);

  /* ─────────────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────────────── */
  return (
    <div style={{ background: P.bg, fontFamily: 'Inter, sans-serif' }} className="min-h-full">
      <div className="relative px-6 py-5 space-y-6 max-w-[1600px] mx-auto">

        {/* ═══════════════════════════════════════════════════════════════
            PAGE HEADER — FuturePortal style
        ═══════════════════════════════════════════════════════════════ */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: 'rgba(201,192,54,0.1)',
                border: '1px solid rgba(201,192,54,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Target size={22} style={{ color: P.accent }} />
              </div>
              <div>
                <h1 style={{ color: P.textHi, fontSize: 24, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  Impact Reports
                  <Sparkles size={18} style={{ color: P.accent }} />
                </h1>
                <p style={{ color: P.textMd, fontSize: 13, marginTop: 2 }}>
                  Beneficiary demographics, SDG alignment & community impact analysis
                </p>
              </div>
            </div>

            {/* Export buttons */}
            <ActionBar
              onRefresh={refetch}
              onExcel={handleExcelExport}
              onPdf={handlePdfExport}
              onPrint={handlePrint}
              isRefreshing={isRefetching}
            />
          </div>

          {/* Period tab switcher - FuturePortal style */}
          <div style={{ display: 'flex', gap: 4 }}>
            {periods.map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 18px', borderRadius: 12,
                  background: period === p ? `${P.accent}12` : 'transparent',
                  border: `1px solid ${period === p ? P.accent + '30' : P.border}`,
                  color: period === p ? P.accent : P.textLo,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}>
                <Calendar size={14} /> {p}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════
            CATEGORY TABS — full-featured breakdown
        ═══════════════════════════════════════════════════════════════ */}
        <motion.div variants={scaleIn(0.1)} initial="hidden" whileInView="show" viewport={VP}>
          <GlassCard className="p-6">
            <SectionHeader icon={Target} title="Impact by Category" subtitle="Detailed breakdown across all CSR verticals" />

            {/* Tab Bar */}
            <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {dynamicCategoryTabs.map(tab => (
                <motion.button key={tab.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold whitespace-nowrap transition-all"
                  style={{
                    background: activeTab === tab.id ? `${tab.color}15` : 'transparent',
                    color: activeTab === tab.id ? tab.color : P.textLo,
                    border: `1px solid ${activeTab === tab.id ? `${tab.color}30` : P.border}`,
                  }}>
                  <tab.icon size={13} /> {tab.label}
                  <span className="px-1.5 py-0.5 rounded-md text-[9px]" style={{ background: `${tab.color}20` }}>{tab.stats.projects}</span>
                </motion.button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3, ease: EASE }}>
                {/* Category Stats Row */}
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {[
                    { label: 'Projects', value: currentCat.stats.projects, color: currentCat.color },
                    { label: 'Beneficiaries', value: currentCat.stats.beneficiaries, color: '#C8A44E' },
                    { label: 'Budget (OMR)', value: `${(currentCat.stats.budget / 1000).toFixed(0)}K`, color: '#38bdf8' },
                    { label: 'Satisfaction', value: `${currentCat.stats.satisfaction}%`, color: '#34d399' },
                  ].map((s, i) => (
                    <div key={i} className="rounded-xl p-3 text-center" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                      <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-[9px] font-medium mt-0.5" style={{ color: P.textLo }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Category Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    {currentCat.metrics.map((m, i) => (
                      <motion.div key={i} variants={stagger(i * 0.05)} initial="hidden" animate="show"
                        className="flex items-center gap-3 p-3 rounded-xl" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                        <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: `${currentCat.color}12`, border: `1px solid ${currentCat.color}20` }}>
                          <m.icon size={14} style={{ color: currentCat.color }} />
                        </div>
                        <div>
                          <p className="text-sm font-black tabular-nums" style={{ color: P.textHi }}>
                            {typeof m.value === 'number' ? m.value.toLocaleString() : m.value}
                          </p>
                          <p className="text-[9px]" style={{ color: P.textLo }}>{m.label}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Category Chart */}
                  <div style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={currentCat.chartData}>
                        <defs>
                          <linearGradient id="gradCat" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={currentCat.color} stopOpacity={0.2} />
                            <stop offset="100%" stopColor={currentCat.color} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: P.textLo, fontSize: 10 }} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: P.textLo, fontSize: 10 }} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: P.textLo, fontSize: 10 }} />
                        <RTooltip content={<ChartTooltip />} />
                        <Area yAxisId="left" type="monotone" dataKey="students" name="Reach" stroke={currentCat.color} fill="url(#gradCat)" strokeWidth={2} />
                        <Line yAxisId="right" type="monotone" dataKey="literacy" name="Score" stroke="#C8A44E" strokeWidth={2} dot={{ r: 3, fill: '#C8A44E' }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </GlassCard>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════
            BENEFICIARY DEMOGRAPHICS — full-width detailed section
        ═══════════════════════════════════════════════════════════════ */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={VP}>
          <GlassCard className="p-6">
            <SectionHeader icon={Users} title="Beneficiary Demographics" subtitle="Complete breakdown of all reached populations" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* Left: Gender + Special Populations */}
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-bold mb-3" style={{ color: P.textMd }}>Gender Distribution</p>
                  <div className="space-y-3">
                    {[
                      { label: 'Male', pct: malePct, value: report?.demographics?.male ?? 0, color: '#38bdf8' },
                      { label: 'Female', pct: femalePct, value: report?.demographics?.female ?? 0, color: '#C8A44E' },
                    ].map(g => (
                      <div key={g.label}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ background: g.color }} />
                            <span className="text-[10px] font-medium" style={{ color: P.textMd }}>{g.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black tabular-nums" style={{ color: g.color }}>{g.pct}%</span>
                            <span className="text-[9px]" style={{ color: P.textLo }}>{g.value.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: P.border }}>
                          <motion.div className="h-full rounded-full"
                            initial={{ width: 0 }} whileInView={{ width: `${g.pct}%` }} viewport={VP}
                            transition={{ duration: 1, ease: EASE }}
                            style={{ background: `linear-gradient(90deg, ${g.color}, ${g.color}88)` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold mb-3" style={{ color: P.textMd }}>Special Populations</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Children', value: report?.demographics?.children ?? 0, icon: Users, color: '#a78bfa' },
                      { label: 'Elderly', value: report?.demographics?.elderly ?? 0, icon: Heart, color: '#fbbf24' },
                      { label: 'Disabled', value: report?.demographics?.disabled ?? 0, icon: Shield, color: '#34d399' },
                    ].map(sp => (
                      <div key={sp.label} className="rounded-xl p-3 text-center" style={{ background: P.surface, border: `1px solid ${sp.color}20` }}>
                        <div className="h-8 w-8 rounded-full flex items-center justify-center mx-auto mb-2"
                          style={{ background: `${sp.color}15` }}>
                          <sp.icon size={14} style={{ color: sp.color }} />
                        </div>
                        <p className="text-base font-black tabular-nums" style={{ color: P.textHi }}>
                          <AnimatedCounter value={sp.value} />
                        </p>
                        <p className="text-[9px] mt-0.5" style={{ color: P.textLo }}>{sp.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Category beneficiaries bar chart */}
              <div>
                <p className="text-xs font-bold mb-3" style={{ color: P.textMd }}>Beneficiaries by Category</p>
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryBeneficiariesData} barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" stroke={P.border} vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: P.textLo, fontSize: 9 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: P.textLo, fontSize: 9 }} />
                      <RTooltip content={<ChartTooltip />} />
                      <Bar dataKey="beneficiaries" name="Beneficiaries" radius={[6, 6, 0, 0]}>
                        {categoryBeneficiariesData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════
            IMPACT EVOLUTION TIMELINE
        ═══════════════════════════════════════════════════════════════ */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={VP}>
          <GlassCard className="p-6">
            <SectionHeader icon={Activity} title="Impact Evolution Timeline" subtitle="Year-over-year growth and key milestones" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart with gradient background */}
              <div className="lg:col-span-2 relative">
                <div className="absolute inset-0 rounded-xl opacity-30"
                  style={{ background: `radial-gradient(ellipse at 50% 100%, ${P.accent}10 0%, transparent 70%)` }} />
                <div style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={impactTimeline}>
                      <defs>
                        <linearGradient id="gradBenef" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#C8A44E" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#C8A44E" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                      <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: P.textLo, fontSize: 10 }} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: P.textLo, fontSize: 10 }} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: P.textLo, fontSize: 10 }} />
                      <RTooltip content={<ChartTooltip />} />
                      <Area yAxisId="left" type="monotone" dataKey="beneficiaries" name="Beneficiaries" stroke="#C8A44E" fill="url(#gradBenef)" strokeWidth={2.5} />
                      <Line yAxisId="right" type="monotone" dataKey="satisfaction" name="Satisfaction %" stroke="#34d399" strokeWidth={2} dot={{ r: 3, fill: '#34d399' }} />
                      <Bar yAxisId="left" dataKey="projects" name="Projects" fill="#38bdf8" opacity={0.4} radius={[3, 3, 0, 0]} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Milestone Timeline — larger items */}
              <div className="space-y-0">
                {impactTimeline.map((item, i) => (
                  <div key={i} className="flex gap-3 relative">
                    <div className="flex flex-col items-center">
                      <div className="w-4 h-4 rounded-full shrink-0 z-10 flex items-center justify-center"
                        style={{
                          background: i === impactTimeline.length - 1 ? P.accent : P.surface,
                          border: `2px solid ${i === impactTimeline.length - 1 ? P.accent : P.borderHi}`,
                          boxShadow: i === impactTimeline.length - 1 ? `0 0 12px ${P.accent}60` : 'none',
                        }}>
                        {i === impactTimeline.length - 1 && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      {i < impactTimeline.length - 1 && <div className="w-px flex-1 my-1" style={{ background: P.border }} />}
                    </div>
                    <div className="pb-5">
                      <p className="text-[11px] font-black" style={{ color: i === impactTimeline.length - 1 ? P.accent : P.textMd }}>{item.year}</p>
                      <p className="text-[10px] mt-0.5 font-medium" style={{ color: P.textLo }}>{item.milestone}</p>
                      <p className="text-[9px] mt-0.5" style={{ color: P.textLo }}>{item.beneficiaries.toLocaleString()} beneficiaries</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════
            SDG ALIGNMENT — upgraded with Radar chart above grid
        ═══════════════════════════════════════════════════════════════ */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={VP}>
          <GlassCard className="p-6">
            <SectionHeader icon={Globe} title="SDG Alignment" subtitle="Progress towards the 17 Sustainable Development Goals" />

            {/* Radar + Stats row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2" style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={sdgRadarData}>
                    <PolarGrid stroke={P.border} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: P.textLo, fontSize: 9 }} />
                    <Radar name="SDG Progress" dataKey="progress" stroke={P.accent} fill={P.accent} fillOpacity={0.2} strokeWidth={1.5} />
                    <RTooltip content={<ChartTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col justify-center gap-4">
                {[
                  { label: 'Average SDG Alignment', value: '67.4%', color: P.accent },
                  { label: 'Goals Above 80%', value: '4', color: '#34d399' },
                  { label: 'Goals Addressed', value: '17/17', color: '#38bdf8' },
                ].map(stat => (
                  <div key={stat.label} className="rounded-xl p-4" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                    <p className="text-xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                    <p className="text-[9px] mt-0.5" style={{ color: P.textLo }}>{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* SDG grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-9 gap-3">
              {sdgGoals.map((sdg, i) => (
                <motion.div key={sdg.id} variants={stagger(i * 0.02)} initial="hidden" whileInView="show" viewport={VP}
                  className="rounded-xl p-3 text-center group cursor-default transition-all"
                  style={{ background: P.surface, border: `1px solid ${P.border}` }}
                  onMouseEnter={e => { e.currentTarget.style.border = `1px solid ${sdg.color}40`; e.currentTarget.style.boxShadow = `0 0 20px ${sdg.color}10`; }}
                  onMouseLeave={e => { e.currentTarget.style.border = `1px solid ${P.border}`; e.currentTarget.style.boxShadow = 'none'; }}>
                  <CircularProgress value={sdg.progress} size={40} stroke={3} color={sdg.color} />
                  <p className="text-[8px] font-bold mt-2 leading-tight" style={{ color: P.textMd }}>{sdg.name}</p>
                  <p className="text-[8px] mt-0.5" style={{ color: sdg.color }}>Goal {sdg.id}</p>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════
            PREDICTIVE ANALYTICS — upgraded with 4th stat card
        ═══════════════════════════════════════════════════════════════ */}
        <motion.div variants={scaleIn(0.1)} initial="hidden" whileInView="show" viewport={VP}>
          <GlassCard className="p-6" style={{ border: `1px solid ${P.accent}15` }}>
            <SectionHeader icon={Sparkles} title="Predictive Impact Analysis" subtitle="AI-powered beneficiary growth forecast through 2030"
              action={<span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: `${P.accent}15`, color: P.accent, border: `1px solid ${P.accent}25` }}>AI Powered</span>} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2" style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={predictionData}>
                    <defs>
                      <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C8A44E" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#C8A44E" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradPred" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: P.textLo, fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: P.textLo, fontSize: 10 }} />
                    <RTooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="actual" name="Actual" stroke="#C8A44E" fill="url(#gradActual)" strokeWidth={2.5} connectNulls={false} dot={{ r: 4, fill: '#C8A44E' }} />
                    <Area type="monotone" dataKey="predicted" name="Predicted" stroke="#a78bfa" fill="url(#gradPred)" strokeWidth={2} strokeDasharray="6 3" connectNulls={false} dot={{ r: 3, fill: '#a78bfa', strokeDasharray: '' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Stat cards — 4 total including Peak Year */}
              <div className="space-y-3">
                <div className="rounded-xl p-4" style={{ background: P.surface, border: `1px solid ${P.accent}15` }}>
                  <p className="text-[10px] font-bold mb-1" style={{ color: P.accent }}>2030 Forecast</p>
                  <p className="text-2xl font-black tabular-nums" style={{ color: P.textHi }}>35,000</p>
                  <p className="text-[9px]" style={{ color: P.textLo }}>Estimated beneficiaries</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                  <p className="text-[10px] font-bold mb-1" style={{ color: '#34d399' }}>Growth Rate</p>
                  <p className="text-2xl font-black tabular-nums" style={{ color: P.textHi }}>+127%</p>
                  <p className="text-[9px]" style={{ color: P.textLo }}>Projected 4-year growth</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                  <p className="text-[10px] font-bold mb-1" style={{ color: '#38bdf8' }}>Confidence</p>
                  <p className="text-2xl font-black tabular-nums" style={{ color: P.textHi }}>94.2%</p>
                  <p className="text-[9px]" style={{ color: P.textLo }}>Model accuracy</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                  <p className="text-[10px] font-bold mb-1" style={{ color: '#fbbf24' }}>Peak Year</p>
                  <p className="text-2xl font-black tabular-nums" style={{ color: P.textHi }}>2030</p>
                  <p className="text-[9px]" style={{ color: P.textLo }}>Max predicted growth</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════
            ESG PERFORMANCE — Moved from Social Media Analytics
        ═══════════════════════════════════════════════════════════════ */}
        {esgData && (
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={VP}
            style={{ marginTop: 28 }}>
            <ESGSection data={esgData} />
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            FOOTER CTA — Print + View Dashboard
        ═══════════════════════════════════════════════════════════════ */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={VP}
          className="flex items-center justify-center gap-4 py-4 flex-wrap">
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, #f472b6, #ec4899)', color: '#fff', boxShadow: '0 4px 24px rgba(244,114,182,0.4)' }}>
            <Printer size={16} /> Print Impact Report
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold"
            style={{ background: P.surface, color: P.textMd, border: `1px solid ${P.border}` }}>
            <BarChart3 size={16} /> View Full Dashboard
          </motion.button>
        </motion.div>

      </div>
    </div>
  );
}
