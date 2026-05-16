// @ts-nocheck
import { useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { EmptyState } from '../components/common/EmptyState';
import NumberFlow from '../components/ui/NumberFlowSafe';
import { useInView as useIOInView } from 'react-intersection-observer';
import {
  AlertTriangle, Shield, ShieldAlert, ShieldCheck, ShieldX,
  Settings, X, ChevronRight, Eye, CheckCircle2, Clock, Wallet,
  Star, Calendar, Bell, Brain, Lightbulb, Sparkles,
  Mail, Smartphone, Monitor, Send, Plus, Trash2, Edit3,
  Target, Zap, BarChart3, ArrowUpRight, Info, Filter,
  ChevronDown, ChevronUp, Users, Flame, RefreshCw,
  FileSpreadsheet, FileText, Printer, HeartHandshake, Play, Moon,
  ThumbsUp, ThumbsDown, ClipboardList,
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  LineChart as RechartsLine, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip,
  BarChart, Bar,
} from 'recharts';
import { cn } from '../utils/cn.ts';
import { useTheme } from '../hooks/useTheme';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertService } from '../services/alertService';
import { projectService } from '../services/projectService';
import { aiAnalyticsService } from '../services/aiAnalyticsService';
import type { AiAnalysisResult, AiChart } from '../services/aiAnalyticsService';
import { exportToExcel, printTable, reportColumns } from '../utils/exportUtils';
import { generateEarlyWarningPDF } from '../utils/pdfReportGenerator';

// ─── Palette ────────────────────────────────────────────────────────────────


// ─── Risk Configuration ─────────────────────────────────────────────────────
const riskCfg = {
  low:      { color: '#2EBC85', bg: 'rgba(46,188,133,0.10)',  text: '#7AD9B3', label: 'Low',      icon: ShieldCheck },
  medium:   { color: '#E0A024', bg: 'rgba(224,160,36,0.10)',  text: '#F2D78A', label: 'Medium',   icon: Shield      },
  high:     { color: '#E07F33', bg: 'rgba(224,127,51,0.10)',  text: '#F1B788', label: 'High',     icon: ShieldAlert },
  critical: { color: '#DB5C5C', bg: 'rgba(219,92,92,0.10)',   text: '#ED9D9D', label: 'Critical', icon: ShieldX     },
} as const;

const alertTypeCfg = {
  budget:   { icon: Wallet,          color: '#E0A024', label: 'Budget Risk'  },
  timeline: { icon: Clock,           color: '#3B97D2', label: 'Time Risk'    },
  quality:  { icon: Star,            color: '#9079D8', label: 'Quality Risk' },
  impact:   { icon: HeartHandshake,  color: '#D86B95', label: 'Impact Risk'  },
} as const;

// ─── Desk / Agent Identity ──────────────────────────────────────────────────
// Each alert and scenario action is "filed by" one of three autonomous desks
type DeskKey = 'financial' | 'impact' | 'risk';
const deskCfg: Record<DeskKey, { name: string; nameAr: string; initials: string; color: string }> = {
  financial: { name: 'Financial Desk', nameAr: 'مكتب الشؤون المالية',  initials: 'FD', color: '#E0A024' },
  impact:    { name: 'Impact Desk',    nameAr: 'مكتب الأثر الاجتماعي', initials: 'ID', color: '#2EBC85' },
  risk:      { name: 'Risk Desk',      nameAr: 'مكتب المخاطر التشغيلية', initials: 'RD', color: '#3B97D2' },
};

function deskForAlertType(type: keyof typeof alertTypeCfg): DeskKey {
  if (type === 'budget') return 'financial';
  if (type === 'impact') return 'impact';
  return 'risk';
}

function deskForScenarioId(scenarioId: string): DeskKey {
  const s = (scenarioId || '').toLowerCase();
  if (s.includes('budget') || s.includes('realloc') || s.includes('underspend')) return 'financial';
  if (s.includes('impact') || s.includes('outreach') || s.includes('benef') || s.includes('rescue') || s.includes('community')) return 'impact';
  return 'risk';
}

// Ink-style stamp shown when a proposal is signed
function ApprovedStamp({ color }: { color: string }) {
  return (
    <div className="relative" style={{ width: 96, height: 96 }}>
      <svg viewBox="0 0 100 100" width={96} height={96} style={{ transform: 'rotate(-12deg)' }}>
        <circle cx="50" cy="50" r="44" fill="none" stroke={color} strokeWidth="2.2" opacity={0.55} />
        <circle cx="50" cy="50" r="37" fill="none" stroke={color} strokeWidth="0.8" opacity={0.4} />
        <text x="50" y="44" textAnchor="middle" style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontWeight: 800, fontSize: 11, letterSpacing: '0.2em', fill: color, opacity: 0.85 }}>APPROVED</text>
        <line x1="20" y1="56" x2="80" y2="56" stroke={color} strokeWidth="0.6" opacity={0.35} />
        <text x="50" y="68" textAnchor="middle" style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontWeight: 600, fontSize: 8, letterSpacing: '0.18em', fill: color, opacity: 0.7 }}>CSR · OMAN</text>
      </svg>
    </div>
  );
}

function RejectedStamp({ color }: { color: string }) {
  return (
    <div className="relative" style={{ width: 96, height: 96 }}>
      <svg viewBox="0 0 100 100" width={96} height={96} style={{ transform: 'rotate(8deg)' }}>
        <rect x="10" y="32" width="80" height="36" fill="none" stroke={color} strokeWidth="2.2" opacity={0.55} />
        <rect x="14" y="36" width="72" height="28" fill="none" stroke={color} strokeWidth="0.6" opacity={0.4} />
        <text x="50" y="55" textAnchor="middle" style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontWeight: 800, fontSize: 13, letterSpacing: '0.24em', fill: color, opacity: 0.85 }}>VETOED</text>
      </svg>
    </div>
  );
}

// Small SVG seal used to identify the desk that filed an alert / proposal
function DeskSeal({ desk, size = 32 }: { desk: DeskKey; size?: number }) {
  const cfg = deskCfg[desk];
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={`seal-${desk}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={cfg.color} stopOpacity={0.85} />
          <stop offset="100%" stopColor={cfg.color} stopOpacity={0.55} />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="18" fill="none" stroke={cfg.color} strokeWidth="0.6" strokeOpacity={0.45} />
      <circle cx="20" cy="20" r="15" fill={`url(#seal-${desk})`} />
      <circle cx="20" cy="20" r="14" fill="none" stroke="#000" strokeOpacity={0.18} strokeWidth="0.5" />
      {Array.from({ length: 18 }).map((_, i) => {
        const a = (i / 18) * Math.PI * 2;
        return (
          <circle key={i} cx={20 + Math.cos(a) * 17} cy={20 + Math.sin(a) * 17} r={0.6} fill={cfg.color} opacity={0.7} />
        );
      })}
      <text x="20" y="24" textAnchor="middle" style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontWeight: 700, fontSize: 11, fill: '#fff', letterSpacing: '0.06em' }}>
        {cfg.initials}
      </text>
    </svg>
  );
}

// ─── Framer Variants ────────────────────────────────────────────────────────
const EASE: any = [0.22, 1, 0.36, 1];
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};
const stagger = (delay = 0) => ({
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay } },
});
const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  show:   { opacity: 1, scale: 1, transition: { duration: 0.4, ease: EASE } },
};

// ─── Types ───────────────────────────────────────────────────────────────────

// Project risk data shape (fetched from API via useQuery inside the component)
type ProjectRiskItem = {
  id: string;
  name: string;
  category: string;
  status: string;
  budget: number;
  spent: number;
  startDate: string;
  endDate: string;
  progress: number;
  elapsed: number;
  avgRating: number;
  totalReviews: number;
  lastReview: string;
  minRating: number;
  beneficiaries: number;
  expectedBeneficiaries: number;
  risk: 'low' | 'medium' | 'high' | 'critical';
};

// ─── Simulation Types ─────────────────────────────────────────────────────────
interface SimulationScenario {
  id: string;
  title: string;
  description: string;
  impact: {
    before: { metric: string; value: number; unit: string; risk: string };
    after: { metric: string; value: number; unit: string; risk: string };
  };
  confidence: number;
  effort: string;
  timeframe: string;
}

interface SimulationResult {
  project: { id: string; name: string; category: string; budget: number; spent: number; progress: number; beneficiaries: number; avgRating: number };
  alert: { id: string; type: string; level: string; message: string } | null;
  scenarios: SimulationScenario[];
}

// ─── Helper Components ──────────────────────────────────────────────────────

function Card({ children, className, glow, accent }: { children: React.ReactNode; className?: string; glow?: string; accent?: string }) {
  const { colors: P } = useTheme();
  return (
    <div
      className={cn('relative rounded-[20px] group/card', className)}
      style={{
        background: `${P.card}`,
        border: `1px solid ${P.border}`,
        boxShadow: [
          `inset 0 1px 0 0 ${P.borderHi}40`,
          glow ? `0 0 60px ${glow}` : '',
          '0 12px 40px rgba(0,0,0,0.05)',
          '0 2px 8px rgba(0,0,0,0.03)',
        ].filter(Boolean).join(', '),
      }}
    >
      {accent && <div className="absolute top-3 right-3 w-2 h-2 rounded-full" style={{ background: accent, boxShadow: `0 0 12px ${accent}80` }} />}
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${P.borderHi}90, transparent)` }} />
      {children}
    </div>
  );
}

function SectionHeading({ icon: Icon, title, sub, action }: { icon: React.ElementType; title: string; sub?: string; action?: { label: string; onClick?: () => void } }) {
  const { colors: P } = useTheme();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <div ref={ref} className="mb-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={inView ? { scale: 1, opacity: 1 } : {}}
          transition={{ duration: 0.5, ease: EASE }}
          className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{ background: `linear-gradient(135deg, ${P.accent}20, ${P.accent}08)`, border: `1px solid ${P.accent}30` }}
        >
          <Icon size={14} style={{ color: P.accent }} />
        </motion.div>
        <div>
          <h2 className="text-[13px] font-bold tracking-wide uppercase" style={{ color: P.textHi, letterSpacing: '0.08em' }}>{title}</h2>
          {sub && <p className="text-[11px] mt-0.5" style={{ color: P.textLo }}>{sub}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {action && (
          <button onClick={action.onClick} className="text-xs font-medium px-3.5 py-1.5 rounded-full transition-all duration-200 flex items-center gap-1 active:scale-[0.97]" style={{ color: P.accent, background: `${P.accent}0a`, border: `1px solid ${P.accent}15` }} onMouseEnter={e => { e.currentTarget.style.background = `${P.accent}18`; }} onMouseLeave={e => { e.currentTarget.style.background = `${P.accent}0a`; }}>
            {action.label} <ArrowUpRight size={13} />
          </button>
        )}
        <motion.div
          className="h-px flex-shrink-0"
          style={{ width: 48, background: `linear-gradient(90deg, ${P.accent}40, transparent)` }}
          initial={{ scaleX: 0, originX: 0 }}
          animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
        />
      </div>
    </div>
  );
}

function Tip({ active, payload, label, suffix = '' }: { active?: boolean; payload?: { name?: string; value?: number; color?: string }[]; label?: string | number; suffix?: string }) {
  const { colors: P } = useTheme();
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 shadow-2xl backdrop-blur-md" style={{ background: 'rgba(255,255,255,0.95)', border: `1px solid ${P.borderHi}` }}>
      <p className="mb-2 text-[10px] font-semibold tracking-widest uppercase" style={{ color: P.textLo }}>{label}</p>
      {payload.map((e, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: e.color }} />
          <span style={{ color: P.textMd }}>{e.name}:</span>
          <span className="font-bold tabular-nums" style={{ color: P.textHi }}>{Number(e.value ?? 0).toLocaleString()}{suffix}</span>
        </div>
      ))}
    </div>
  );
}

function ProgressBar({ value, max, color, animate = true, delay = 0 }: { value: number; max: number; color: string; animate?: boolean; delay?: number }) {
  const { colors: P } = useTheme();
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="relative h-2 rounded-full overflow-hidden" style={{ background: P.border }}>
      <motion.div
        initial={animate ? { width: 0 } : false}
        whileInView={{ width: `${pct}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: EASE, delay }}
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}

function RiskSummaryCard({ item, i, projects, onViewAll }: {
  item: { level: keyof typeof riskCfg; glow: string; pulse: boolean };
  i: number;
  projects: ProjectRiskItem[];
  onViewAll: () => void;
}) {
  const { colors: P } = useTheme();
  const cfg = riskCfg[item.level];
  const { ref, inView } = useIOInView({ triggerOnce: true, threshold: 0.2 });
  const Icon = cfg.icon;
  return (
    <motion.div
      ref={ref}
      variants={stagger(i * 0.08) as any}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.25, ease: EASE } }}
    >
      <div
        className="relative rounded-[20px] cursor-default group"
        style={{
          background: `linear-gradient(160deg, ${P.card} 0%, ${P.bg} 100%)`,
          border: `1px solid ${cfg.color}20`,
          boxShadow: `inset 0 1px 0 0 ${P.borderHi}40, 0 12px 40px rgba(0,0,0,0.05), 0 0 40px ${item.glow}`,
          padding: '22px 20px 18px',
        }}
      >
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none opacity-40" style={{ background: `radial-gradient(circle, ${cfg.color}12, transparent 70%)` }} />
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110" style={{ background: cfg.bg, border: `1px solid ${cfg.color}25` }}>
            <Icon size={19} style={{ color: cfg.color }} />
            {item.pulse && (
              <motion.div className="absolute inset-0 rounded-2xl" style={{ border: `2px solid ${cfg.color}` }} animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
            )}
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: P.textLo }}>{cfg.label} Risk</p>
            <p className="text-[10px]" style={{ color: P.textDim }}>{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-end justify-between mb-4">
          <span className="text-[2.5rem] font-black tabular-nums leading-none" style={{ color: cfg.color }}>
            <NumberFlow value={inView ? projects.length : 0} />
          </span>
          {item.level !== 'low' && projects.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 6 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.4 }}
              className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
              style={{ background: cfg.bg, color: cfg.text }}
            >
              {item.level === 'critical' ? 'URGENT' : item.level === 'high' ? 'ATTENTION' : 'MONITOR'}
            </motion.div>
          )}
        </div>
        {item.level !== 'low' && projects.length > 0 && (
          <div className="space-y-1.5">
            {projects.slice(0, 3).map(p => (
              <div key={p.id} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                <span className="text-[11px] truncate" style={{ color: P.textMd }}>{p.name}</span>
              </div>
            ))}
            {projects.length > 3 && (
              <button
                onClick={onViewAll}
                className="text-[10px] font-medium flex items-center gap-1 mt-1 transition-colors"
                style={{ color: cfg.color }}
              >
                View All ({projects.length}) <ChevronRight size={10} />
              </button>
            )}
          </div>
        )}
        {item.level === 'low' && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
            <ShieldCheck size={13} style={{ color: '#2EBC85' }} />
            <span className="text-xs font-medium" style={{ color: '#7AD9B3' }}>All within safe thresholds</span>
          </div>
        )}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 1, ease: EASE, delay: 0.4 + i * 0.1 }}
          className="absolute bottom-0 left-0 right-0 h-[2px] origin-left"
          style={{ background: `linear-gradient(90deg, ${cfg.color}80, ${cfg.color}10, transparent)` }}
        />
      </div>
    </motion.div>
  );
}

function RiskBadge({ level }: { level: keyof typeof riskCfg }) {
  const { colors: P } = useTheme();
  const cfg = riskCfg[level];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.color}25` }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

function StarRating({ rating, size = 12 }: { rating: number; size?: number }) {
  const { colors: P } = useTheme();
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} size={size} style={{ color: s <= Math.round(rating) ? '#E0A024' : P.textDim }} fill={s <= Math.round(rating) ? '#E0A024' : 'none'} />
      ))}
    </div>
  );
}

// ─── Settings Modal ─────────────────────────────────────────────────────────

function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { colors: P } = useTheme();
  const [budgetThreshold, setBudgetThreshold] = useState(80);
  const [delayThreshold, setDelayThreshold] = useState(15);
  const [qualityThreshold, setQualityThreshold] = useState(3);
  const [notifications, setNotifications] = useState({ system: true, email: true, sms: false, push: false });
  const [frequency, setFrequency] = useState('immediate');
  const [recipients, setRecipients] = useState<{ id: string; name: string; role: string; alertLevel: 'all' | 'critical' }[]>([]);
  const [freqOpen, setFreqOpen] = useState(false);

  const freqOptions = [
    { value: 'immediate', label: 'Immediate (every change)' },
    { value: 'daily',     label: 'Daily (summary once/day)' },
    { value: 'weekly',    label: 'Weekly (summary once/week)' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100]"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
          />
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
          >
            <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-[24px]" style={{ background: P.card, border: `1px solid ${P.borderHi}`, boxShadow: '0 40px 100px rgba(0,0,0,0.6)' }}>
              {/* Header */}
              <div className="sticky top-0 flex items-center justify-between px-6 py-5 rounded-t-[24px]" style={{ background: P.card, borderBottom: `1px solid ${P.border}`, zIndex: 10 }}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 flex items-center justify-center rounded-xl" style={{ background: `${P.accent}15`, border: `1px solid ${P.accent}30` }}>
                    <Settings size={18} style={{ color: P.accent }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: P.textHi }}>Alert Settings</h2>
                    <p className="text-xs" style={{ color: P.textLo }}>Configure thresholds and notification preferences</p>
                  </div>
                </div>
                <button onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-full transition-all duration-200 active:scale-[0.95]" style={{ background: P.surface, border: `1px solid ${P.border}` }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#DB5C5C'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; }}>
                  <X size={16} style={{ color: P.textMd }} />
                </button>
              </div>

              <div className="px-6 py-5 space-y-8">
                {/* Section 1: Default Thresholds */}
                <div>
                  <div className="flex items-center gap-2 mb-5">
                    <Target size={14} style={{ color: P.accent }} />
                    <h3 className="text-sm font-bold" style={{ color: P.textHi }}>Default Thresholds</h3>
                  </div>
                  <div className="space-y-6">
                    {/* Budget Threshold */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Wallet size={13} style={{ color: '#E0A024' }} />
                          <span className="text-[13px] font-medium" style={{ color: P.textMd }}>Budget Threshold</span>
                        </div>
                        <span className="text-sm font-bold tabular-nums px-2.5 py-0.5 rounded-lg" style={{ color: '#E0A024', background: 'rgba(251,191,36,0.1)' }}>{budgetThreshold}%</span>
                      </div>
                      <input
                        type="range" min={60} max={100} value={budgetThreshold}
                        onChange={e => setBudgetThreshold(+e.target.value)}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                        style={{ background: `linear-gradient(to right, #E0A024 ${((budgetThreshold - 60) / 40) * 100}%, ${P.border} ${((budgetThreshold - 60) / 40) * 100}%)` }}
                      />
                      <div className="flex justify-between text-[10px] mt-1" style={{ color: P.textDim }}>
                        <span>60%</span><span>100%</span>
                      </div>
                      <p className="text-[11px] mt-1.5" style={{ color: P.textLo }}>Alert triggers when budget utilization exceeds this percentage relative to project completion.</p>
                    </div>
                    {/* Delay Threshold */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Clock size={13} style={{ color: '#3B97D2' }} />
                          <span className="text-[13px] font-medium" style={{ color: P.textMd }}>Delay Threshold</span>
                        </div>
                        <span className="text-sm font-bold tabular-nums px-2.5 py-0.5 rounded-lg" style={{ color: '#3B97D2', background: 'rgba(56,189,248,0.1)' }}>{delayThreshold} days</span>
                      </div>
                      <input
                        type="range" min={0} max={60} value={delayThreshold}
                        onChange={e => setDelayThreshold(+e.target.value)}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                        style={{ background: `linear-gradient(to right, #3B97D2 ${(delayThreshold / 60) * 100}%, ${P.border} ${(delayThreshold / 60) * 100}%)` }}
                      />
                      <div className="flex justify-between text-[10px] mt-1" style={{ color: P.textDim }}>
                        <span>0 days</span><span>60 days</span>
                      </div>
                      <p className="text-[11px] mt-1.5" style={{ color: P.textLo }}>Number of days a project can be behind schedule before an alert is triggered.</p>
                    </div>
                    {/* Quality Threshold */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Star size={13} style={{ color: '#9079D8' }} />
                          <span className="text-[13px] font-medium" style={{ color: P.textMd }}>Quality Threshold</span>
                        </div>
                        <span className="text-sm font-bold tabular-nums px-2.5 py-0.5 rounded-lg" style={{ color: '#9079D8', background: 'rgba(167,139,250,0.1)' }}>{qualityThreshold} stars</span>
                      </div>
                      <input
                        type="range" min={1} max={5} step={0.5} value={qualityThreshold}
                        onChange={e => setQualityThreshold(+e.target.value)}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                        style={{ background: `linear-gradient(to right, #9079D8 ${((qualityThreshold - 1) / 4) * 100}%, ${P.border} ${((qualityThreshold - 1) / 4) * 100}%)` }}
                      />
                      <div className="flex justify-between text-[10px] mt-1" style={{ color: P.textDim }}>
                        <span>1 star</span><span>5 stars</span>
                      </div>
                      <p className="text-[11px] mt-1.5" style={{ color: P.textLo }}>Minimum acceptable quality rating. Alerts trigger when project rating falls below this value.</p>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px" style={{ background: P.border }} />

                {/* Section 2: Notification Method */}
                <div>
                  <div className="flex items-center gap-2 mb-5">
                    <Bell size={14} style={{ color: P.accent }} />
                    <h3 className="text-sm font-bold" style={{ color: P.textHi }}>Notification Method</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'system' as const, icon: Monitor,     label: 'System Notification', desc: 'In-app alerts' },
                      { key: 'email'  as const, icon: Mail,        label: 'Email',               desc: 'Email notifications' },
                      { key: 'sms'    as const, icon: Smartphone,  label: 'SMS',                 desc: 'Text messages' },
                      { key: 'push'   as const, icon: Send,        label: 'Push Notification',   desc: 'Browser push' },
                    ].map(n => (
                      <button
                        key={n.key}
                        onClick={() => setNotifications(prev => ({ ...prev, [n.key]: !prev[n.key] }))}
                        className="flex items-center gap-3 px-4 py-3.5 rounded-full transition-all duration-200 text-left"
                        style={{
                          background: notifications[n.key] ? `${P.accent}08` : P.surface,
                          border: `1px solid ${notifications[n.key] ? `${P.accent}40` : P.border}`,
                        }}
                      >
                        <div className="h-8 w-8 flex items-center justify-center rounded-lg" style={{ background: notifications[n.key] ? `${P.accent}15` : P.border }}>
                          <n.icon size={14} style={{ color: notifications[n.key] ? P.accent : P.textLo }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium" style={{ color: notifications[n.key] ? P.textHi : P.textMd }}>{n.label}</p>
                          <p className="text-[10px]" style={{ color: P.textLo }}>{n.desc}</p>
                        </div>
                        <div className="h-5 w-9 rounded-full flex items-center px-0.5 transition-all duration-200" style={{ background: notifications[n.key] ? P.accent : P.border }}>
                          <motion.div className="h-4 w-4 rounded-full" style={{ background: notifications[n.key] ? '#fff' : P.textLo }} animate={{ x: notifications[n.key] ? 14 : 0 }} transition={{ duration: 0.2 }} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px" style={{ background: P.border }} />

                {/* Section 3: Frequency */}
                <div>
                  <div className="flex items-center gap-2 mb-5">
                    <RefreshCw size={14} style={{ color: P.accent }} />
                    <h3 className="text-sm font-bold" style={{ color: P.textHi }}>Frequency</h3>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setFreqOpen(!freqOpen)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-full transition-all duration-200"
                      style={{ background: P.surface, border: `1px solid ${freqOpen ? `${P.accent}40` : P.border}` }}
                    >
                      <span className="text-sm font-medium" style={{ color: P.textHi }}>{freqOptions.find(f => f.value === frequency)?.label}</span>
                      <motion.div animate={{ rotate: freqOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown size={16} style={{ color: P.textLo }} />
                      </motion.div>
                    </button>
                    <AnimatePresence>
                      {freqOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                          className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-20"
                          style={{ background: P.card, border: `1px solid ${P.borderHi}`, boxShadow: '0 20px 60px rgba(0,0,0,0.05)' }}
                        >
                          {freqOptions.map(f => (
                            <button
                              key={f.value}
                              onClick={() => { setFrequency(f.value); setFreqOpen(false); }}
                              className="w-full text-left px-4 py-3 text-sm transition-colors"
                              style={{ color: frequency === f.value ? P.accent : P.textMd, background: frequency === f.value ? `${P.accent}08` : 'transparent' }}
                              onMouseEnter={e => { if (frequency !== f.value) e.currentTarget.style.background = `${P.accent}05`; }}
                              onMouseLeave={e => { if (frequency !== f.value) e.currentTarget.style.background = 'transparent'; }}
                            >
                              {f.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px" style={{ background: P.border }} />

                {/* Section 4: Recipients */}
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <Users size={14} style={{ color: P.accent }} />
                      <h3 className="text-sm font-bold" style={{ color: P.textHi }}>Alert Recipients</h3>
                    </div>
                    <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors" style={{ color: P.accent, background: `${P.accent}10`, border: `1px solid ${P.accent}25` }}>
                      <Plus size={14} /> Add Person
                    </button>
                  </div>
                  <div className="rounded-xl overflow-x-auto" style={{ border: `1px solid ${P.border}` }}>
                    <table className="w-full min-w-[560px]">
                      <thead>
                        <tr style={{ background: P.surface, borderBottom: `1px solid ${P.border}` }}>
                          {['Name', 'Role', 'Alert Level', 'Actions'].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: P.textLo }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {recipients.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-[13px]" style={{ color: P.textLo }}>
                              No recipients configured. Use "Add Person" to add alert recipients.
                            </td>
                          </tr>
                        ) : recipients.map((r, i) => (
                          <tr key={r.id} style={{ borderBottom: i < recipients.length - 1 ? `1px solid ${P.border}80` : 'none' }}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-full flex items-center justify-center text-[12px] font-bold" style={{ background: `${P.accent}14`, color: P.accent, letterSpacing: '0.04em' }}>
                                  {r.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <span className="text-[13px] font-medium" style={{ color: P.textHi }}>{r.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-[13px]" style={{ color: P.textMd }}>{r.role}</td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{
                                background: r.alertLevel === 'all' ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                                color: r.alertLevel === 'all' ? '#7AD9B3' : '#fca5a5',
                              }}>
                                {r.alertLevel === 'all' ? 'All Levels' : 'Critical Only'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <button className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors" style={{ background: P.surface }} onMouseEnter={e => { e.currentTarget.style.background = `${P.accent}15`; }} onMouseLeave={e => { e.currentTarget.style.background = P.surface; }}>
                                  <Edit3 size={14} style={{ color: P.textMd }} />
                                </button>
                                <button
                                  className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors"
                                  style={{ background: P.surface }}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.15)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = P.surface; }}
                                  onClick={() => setRecipients(prev => prev.filter(x => x.id !== r.id))}
                                >
                                  <Trash2 size={14} style={{ color: '#DB5C5C' }} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 rounded-b-[24px]" style={{ background: P.card, borderTop: `1px solid ${P.border}` }}>
                <button onClick={onClose} className="px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-[0.97]" style={{ color: P.textMd, background: P.surface, border: `1px solid ${P.border}` }}>
                  Cancel
                </button>
                <button onClick={onClose} className="px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 active:scale-[0.97]" style={{ background: P.accent, color: P.bg, boxShadow: `0 2px 12px ${P.accent}30` }}>
                  Save Settings
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── AI Insight Banner ──────────────────────────────────────────────────────

function AiInsightBanner({ riskGroups, projectsRiskData, onAskAi }: {
  riskGroups: Record<string, ProjectRiskItem[]>;
  projectsRiskData: ProjectRiskItem[];
  onAskAi: () => void;
}) {
  const { colors: P } = useTheme();
  const [dismissed, setDismissed] = useState(false);

  const insight = useMemo(() => {
    const critical = riskGroups.critical || [];
    const high = riskGroups.high || [];
    if (critical.length === 0 && high.length === 0) return null;

    const parts: string[] = [];

    // Budget overruns
    const overBudget = projectsRiskData.filter(p => p.budget > 0 && p.spent / p.budget > 0.9);
    if (overBudget.length > 0) {
      const worst = overBudget.sort((a, b) => (b.spent / b.budget) - (a.spent / a.budget))[0];
      parts.push(`${overBudget.length} project${overBudget.length > 1 ? 's' : ''} exceed${overBudget.length === 1 ? 's' : ''} 90% budget — ${worst.name} needs immediate attention (${Math.round((worst.spent / worst.budget) * 100)}% used)`);
    }

    // Timeline delays
    const delayed = projectsRiskData.filter(p => p.elapsed > 0 && (p.elapsed - p.progress) > 15);
    if (delayed.length > 0) {
      parts.push(`${delayed.length} project${delayed.length > 1 ? 's have' : ' has'} significant timeline delays`);
    }

    // Quality concerns
    const lowQuality = projectsRiskData.filter(p => p.totalReviews > 0 && p.avgRating < 3.0);
    if (lowQuality.length > 0) {
      parts.push(`${lowQuality.length} project${lowQuality.length > 1 ? 's' : ''} below quality threshold`);
    }

    if (parts.length === 0) {
      parts.push(`${critical.length} critical and ${high.length} high-risk projects detected — review recommended`);
    }

    return parts.join('. ') + '.';
  }, [riskGroups, projectsRiskData]);

  if (!insight || dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -12, height: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="rounded-2xl"
      style={{
        background: `linear-gradient(135deg, ${P.accent}12 0%, rgba(248,113,113,0.08) 100%)`,
        border: `1px solid ${P.accent}25`,
      }}
    >
      <div className="flex items-center gap-4 px-5 py-4">
        <motion.div
          className="flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center"
          style={{ background: `${P.accent}18`, border: `1px solid ${P.accent}30` }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Brain size={18} style={{ color: P.accent }} />
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: P.accent }}>AI Insight</span>
            <Sparkles size={10} style={{ color: P.accent }} />
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: P.textHi }}>{insight}</p>
        </div>
        <button
          onClick={onAskAi}
          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 active:scale-[0.97]"
          style={{ background: P.accent, color: P.bg, boxShadow: `0 2px 10px ${P.accent}25` }}
        >
          Ask AI More <ArrowUpRight size={14} />
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 h-7 w-7 flex items-center justify-center rounded-full transition-all duration-200 active:scale-[0.95]"
          style={{ color: P.textLo }}
          onMouseEnter={e => { e.currentTarget.style.background = `${P.accent}15`; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <X size={13} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── AI Chart Renderer for Risk Advisor ─────────────────────────────────────

function AiAlertChartRenderer({ chart, P }: { chart: AiChart; P: ReturnType<typeof useTheme>['colors'] }) {
  const data = chart.data;
  if (!data || data.length === 0) return null;

  const CHART_COLORS = ['#C9C036', '#3B97D2', '#2EBC85', '#E0A024', '#9079D8', '#DB5C5C', '#E07F33', '#D86B95'];

  if (chart.type === 'donut') {
    return (
      <div className="rounded-xl p-4" style={{ background: `${P.bg}80`, border: `1px solid ${P.border}` }}>
        <p className="text-[11px] font-semibold mb-3" style={{ color: P.textHi }}>{chart.title}</p>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" nameKey="name">
                {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke={P.card} strokeWidth={2} />)}
              </Pie>
              <RechartsTooltip contentStyle={{ background: P.card, border: `1px solid ${P.borderHi}`, borderRadius: 10, fontSize: 13, color: P.textHi, padding: '10px 12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  const xKey = chart.xKey || Object.keys(data[0] || {}).find(k => typeof data[0][k] === 'string') || 'name';
  const yKeys = chart.yKeys || Object.keys(data[0] || {}).filter(k => typeof data[0][k] === 'number');

  if (chart.type === 'bar') {
    return (
      <div className="rounded-xl p-4" style={{ background: `${P.bg}80`, border: `1px solid ${P.border}` }}>
        <p className="text-[11px] font-semibold mb-3" style={{ color: P.textHi }}>{chart.title}</p>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data as any[]} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} vertical={false} />
              <XAxis dataKey={xKey} tick={{ fill: P.textMd, fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: P.textMd, fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={{ background: P.card, border: `1px solid ${P.borderHi}`, borderRadius: 10, fontSize: 13, color: P.textHi, padding: '10px 12px' }} />
              {yKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // line / area fallback
  return (
    <div className="rounded-xl p-4" style={{ background: `${P.bg}80`, border: `1px solid ${P.border}` }}>
      <p className="text-[11px] font-semibold mb-3" style={{ color: P.textHi }}>{chart.title}</p>
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLine data={data as any[]} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={P.border} vertical={false} />
            <XAxis dataKey={xKey} tick={{ fill: P.textMd, fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: P.textMd, fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
            <RechartsTooltip contentStyle={{ background: P.card, border: `1px solid ${P.borderHi}`, borderRadius: 10, fontSize: 13, color: P.textHi, padding: '10px 12px' }} />
            {yKeys.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} />
            ))}
          </RechartsLine>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── AI Risk Advisor Panel ──────────────────────────────────────────────────

function AiRiskAdvisor({ riskGroups, projectsRiskData, localAlerts }: {
  riskGroups: Record<string, ProjectRiskItem[]>;
  projectsRiskData: ProjectRiskItem[];
  localAlerts: { id: string; type: string; level: string; detail: string; project: string; resolved: boolean }[];
}) {
  const { colors: P } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<{ question: string; result: any }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quickActions = [
    { label: 'Analyze critical risks & suggest actions', icon: ShieldX, color: '#DB5C5C', q: 'Analyze all critical and high-risk projects. What are the root causes and what immediate actions should be taken to mitigate each risk?' },
    { label: 'Budget overrun predictions', icon: Wallet, color: '#E0A024', q: 'Which projects are most likely to exceed their budget based on current spending patterns? Provide specific budget reallocation recommendations.' },
    { label: 'Timeline recovery plans', icon: Clock, color: '#3B97D2', q: 'Identify all projects with timeline delays and recommend specific schedule recovery plans with milestones.' },
    { label: 'Quality improvement strategy', icon: Star, color: '#9079D8', q: 'Evaluate quality risks across all projects and suggest improvement strategies with measurable KPIs.' },
  ];

  const mutation = useMutation({
    mutationFn: (q: string) => aiAnalyticsService.analyzeAlerts(q, 'all'),
    onSuccess: (response, q) => {
      const result = response.data;
      setHistory(prev => [...prev, { question: q, result }]);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
    },
  });

  const handleSubmit = (q?: string) => {
    const text = q || question.trim();
    if (!text || mutation.isPending) return;
    setQuestion('');
    mutation.mutate(text);
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{ background: `linear-gradient(135deg, ${P.accent}20, ${P.accent}08)`, border: `1px solid ${P.accent}30` }}
          >
            <Brain size={14} style={{ color: P.accent }} />
          </motion.div>
          <div>
            <h2 className="text-[13px] font-bold tracking-wide uppercase" style={{ color: P.textHi, letterSpacing: '0.08em' }}>AI Risk Advisor</h2>
            <p className="text-[11px] mt-0.5" style={{ color: P.textLo }}>AI-powered risk analysis & mitigation strategies</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(52,211,153,0.12)', color: '#2EBC85' }}>
            GitHub Models
          </span>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: P.surface, border: `1px solid ${P.border}` }}
          >
            <motion.div animate={{ rotate: collapsed ? 0 : 180 }} transition={{ duration: 0.2 }}>
              <ChevronUp size={13} style={{ color: P.textLo }} />
            </motion.div>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <Card className="overflow-hidden">
              <div className="p-5 space-y-4">
                {/* Quick Actions */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {quickActions.map((action, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.3, ease: EASE }}
                      onClick={() => handleSubmit(action.q)}
                      disabled={mutation.isPending}
                      className="flex items-center gap-2.5 px-3 py-3 rounded-full text-left transition-all duration-200 group"
                      style={{ background: `${action.color}06`, border: `1px solid ${action.color}18` }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${action.color}12`; e.currentTarget.style.borderColor = `${action.color}35`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = `${action.color}06`; e.currentTarget.style.borderColor = `${action.color}18`; }}
                    >
                      <div className="h-7 w-7 flex-shrink-0 flex items-center justify-center rounded-lg" style={{ background: `${action.color}15` }}>
                        <action.icon size={13} style={{ color: action.color }} />
                      </div>
                      <span className="text-xs font-medium leading-tight" style={{ color: P.textMd }}>{action.label}</span>
                    </motion.button>
                  ))}
                </div>

                {/* Chat / Results Area */}
                <div
                  ref={scrollRef}
                  className="rounded-xl overflow-y-auto space-y-4"
                  style={{
                    maxHeight: history.length > 0 || mutation.isPending ? 520 : 0,
                    background: history.length > 0 || mutation.isPending ? `${P.bg}80` : 'transparent',
                    border: history.length > 0 || mutation.isPending ? `1px solid ${P.border}` : 'none',
                    padding: history.length > 0 || mutation.isPending ? 16 : 0,
                    transition: 'all 0.3s ease',
                    scrollbarWidth: 'thin',
                    scrollbarColor: `${P.border} transparent`,
                  }}
                >
                  {history.map((entry, i) => (
                    <div key={i} className="space-y-3">
                      {/* User Question */}
                      <div className="flex justify-end">
                        <div className="max-w-[70%] px-4 py-2.5 rounded-2xl rounded-br-md text-[12px]" style={{ background: `${P.accent}12`, color: P.textHi, border: `1px solid ${P.accent}20` }}>
                          {entry.question}
                        </div>
                      </div>
                      {/* AI Response */}
                      <div className="space-y-3">
                        {/* Analysis text */}
                        <div className="px-4 py-3 rounded-2xl rounded-bl-md" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                          <div className="flex items-center gap-2 mb-2">
                            <Brain size={14} style={{ color: P.accent }} />
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: P.accent }}>AI Analysis</span>
                            {entry.result?.metadata?.model && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: `${P.accent}10`, color: P.textLo }}>
                                {entry.result.metadata.model}
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] leading-relaxed whitespace-pre-line" style={{ color: P.textMd }}>
                            {entry.result?.analysis || 'No analysis generated.'}
                          </p>
                        </div>

                        {/* Key Findings */}
                        {entry.result?.keyFindings?.length > 0 && (
                          <div className="px-4 py-3 rounded-full" style={{ background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.12)' }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#3B97D2' }}>Key Findings</p>
                            <ul className="space-y-1.5">
                              {entry.result.keyFindings.map((f: string, j: number) => (
                                <li key={j} className="flex items-start gap-2 text-[11px]" style={{ color: P.textMd }}>
                                  <span className="h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#3B97D2' }} />
                                  {f}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Recommendations */}
                        {entry.result?.recommendations?.length > 0 && (
                          <div className="px-4 py-3 rounded-full" style={{ background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.12)' }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#2EBC85' }}>Recommendations</p>
                            <ol className="space-y-1.5">
                              {entry.result.recommendations.map((r: string, j: number) => (
                                <li key={j} className="flex items-start gap-2 text-[11px]" style={{ color: P.textMd }}>
                                  <span className="text-[10px] font-bold flex-shrink-0 h-4 w-4 flex items-center justify-center rounded-full" style={{ background: 'rgba(52,211,153,0.15)', color: '#2EBC85' }}>{j + 1}</span>
                                  {r}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {/* Charts */}
                        {entry.result?.chartData?.length > 0 && (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {entry.result.chartData.map((chart: AiChart, j: number) => (
                              <AiAlertChartRenderer key={j} chart={chart} P={P} />
                            ))}
                          </div>
                        )}

                        {/* SDG Connections */}
                        {entry.result?.sdgConnections?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {entry.result.sdgConnections.map((s: string, j: number) => (
                              <span key={j} className="text-[10px] px-2 py-1 rounded-full" style={{ background: `${P.accent}08`, color: P.textLo, border: `1px solid ${P.accent}15` }}>
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Loading */}
                  {mutation.isPending && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-3 py-4"
                    >
                      <motion.div
                        className="h-9 w-9 flex items-center justify-center rounded-xl"
                        style={{ background: `${P.accent}12` }}
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <Brain size={16} style={{ color: P.accent }} />
                      </motion.div>
                      <div>
                        <p className="text-[13px] font-medium" style={{ color: P.textMd }}>Analyzing risk data...</p>
                        <p className="text-[10px]" style={{ color: P.textLo }}>Querying alerts & project metrics via GitHub Models</p>
                      </div>
                    </motion.div>
                  )}

                  {/* Error */}
                  {mutation.isError && (
                    <div className="flex items-start gap-3 rounded-xl p-3" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)' }}>
                      <AlertTriangle size={14} style={{ color: '#DB5C5C', marginTop: 1 }} />
                      <div>
                        <p className="text-xs font-medium" style={{ color: '#DB5C5C' }}>Analysis failed</p>
                        <p className="text-[10px] mt-0.5" style={{ color: P.textMd }}>
                          {(mutation.error as any)?.response?.data?.error?.message || 'Unexpected error. Please try again.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="flex items-center gap-2">
                  {history.length > 0 && (
                    <button
                      onClick={() => { setHistory([]); mutation.reset(); }}
                      className="flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-full transition-all duration-200 active:scale-[0.95]"
                      style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textLo }}
                      title="Clear history"
                    >
                      <RefreshCw size={13} />
                    </button>
                  )}
                  <div className="flex-1 flex items-center gap-2 rounded-full px-4 py-2.5" style={{ background: P.surface, border: `1px solid ${P.borderHi}` }}>
                    <Brain size={14} style={{ color: P.textDim }} />
                    <input
                      type="text"
                      value={question}
                      onChange={e => setQuestion(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                      placeholder="Ask about risks, mitigations, or specific projects..."
                      disabled={mutation.isPending}
                      className="flex-1 bg-transparent text-[12px] outline-none"
                      style={{ color: P.textHi }}
                    />
                    <button
                      onClick={() => handleSubmit()}
                      disabled={!question.trim() || mutation.isPending}
                      className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full transition-all duration-200 active:scale-[0.95]"
                      style={{
                        background: question.trim() ? P.accent : P.cardHi,
                        color: question.trim() ? P.bg : P.textLo,
                        opacity: question.trim() ? 1 : 0.5,
                      }}
                    >
                      <Send size={13} />
                    </button>
                  </div>
                </div>

                <p className="text-[9px] text-center" style={{ color: P.textDim }}>
                  Powered by GitHub Models · Real-time PostgreSQL alert & risk data · Charts via Recharts
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ─── AI Alert Suggestion Helper ─────────────────────────────────────────────

function getAlertSuggestion(type: string, level: string, detail: string): string | null {
  const d = detail.toLowerCase();
  if (type === 'budget') {
    if (level === 'critical' || d.includes('exceed') || d.includes('100%'))
      return 'URGENT: Freeze non-essential expenses and request emergency budget review';
    if (level === 'high' || d.includes('90%'))
      return 'Consider budget reallocation or scope reduction for this project';
    return 'Monitor spending closely — consider preventive budget controls';
  }
  if (type === 'timeline') {
    if (level === 'critical')
      return 'Critical: Escalate to management and revise project timeline immediately';
    if (level === 'high')
      return 'Consider adding resources or adjusting milestone dates';
    return 'Track progress weekly and identify bottlenecks early';
  }
  if (type === 'quality') {
    if (level === 'critical')
      return 'Conduct immediate quality audit and stakeholder review session';
    if (level === 'high')
      return 'Schedule quality improvement workshop with the project team';
    return 'Review quality metrics and address minor issues proactively';
  }
  if (type === 'impact') {
    if (level === 'critical')
      return 'URGENT: Social impact critically low — expand beneficiary outreach and engage CSR partners';
    if (level === 'high')
      return 'Beneficiary count below target — consider community outreach programs or partner collaboration';
    return 'Monitor beneficiary engagement and track impact metrics weekly';
  }
  return null;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function EarlyWarning() {
  const P = useTheme().colors;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch alerts from API
  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts', { limit: 50 }],
    queryFn: () => alertService.getAlerts({ limit: 50 }),
    staleTime: 60 * 1000,
  });

  // Fetch alert stats (includes trend data)
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['alert-stats'],
    queryFn: () => alertService.getAlertStats(),
    staleTime: 60 * 1000,
  });

  // Resolve mutation — resolves one or more alerts then refreshes queries
  const resolveMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map(id => alertService.resolveAlert(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-stats'] });
    },
  });

  // Fetch scenario actions (approval workflow)
  const { data: scenarioActionsData } = useQuery({
    queryKey: ['scenario-actions'],
    queryFn: () => alertService.getScenarioActions(),
    staleTime: 30 * 1000,
  });

  const scenarioActions = useMemo(() => {
    return ((scenarioActionsData as any)?.data || []) as {
      id: string; scenarioId: string; title: string; description: string;
      status: string; impactBefore: any; impactAfter: any; confidence: number;
      effort: string; timeframe: string; executionNote?: string; rejectionReason?: string;
      approvedAt?: string; rejectedAt?: string; createdAt: string;
      project: { id: string; name: string; status?: string };
      createdBy: { id: string; name: string; role?: string };
      approvedBy?: { id: string; name: string; role?: string } | null;
    }[];
  }, [scenarioActionsData]);

  // Fetch projects for risk analysis (replaces former hardcoded projectsRiskData)
  const { data: projectsResponse, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects-risk'],
    queryFn: () => projectService.getProjects({ limit: 50 }),
    staleTime: 5 * 60 * 1000,
  });

  // Compute risk data from API projects — same shape the JSX expects
  const projectsRiskData: ProjectRiskItem[] = useMemo(() => {
    const items = (projectsResponse as any)?.data?.items || [];
    return items.map((p: any) => {
      const budget = Number(p.budget) || 0;
      const spent = Number(p.spent) || 0;
      const ratio = budget > 0 ? spent / budget : 0;
      const risk: ProjectRiskItem['risk'] =
        ratio > 1.0 ? 'critical' : ratio > 0.8 ? 'high' : ratio > 0.6 ? 'medium' : 'low';

      // Compute elapsed percentage from dates
      const start = new Date(p.startDate).getTime();
      const end = new Date(p.endDate).getTime();
      const now = Date.now();
      const totalDuration = end - start;
      const elapsed = totalDuration > 0
        ? Math.round(Math.min(Math.max(((now - start) / totalDuration) * 100, 0), 100))
        : 0;

      // Derive review stats from reviews array if available, else fall back to top-level fields
      const reviews: { rating: number; createdAt: string }[] = Array.isArray(p.reviews) ? p.reviews : [];
      const avgRating = reviews.length > 0
        ? reviews.reduce((sum: number, r: any) => sum + Number(r.rating), 0) / reviews.length
        : Number(p.avgRating) || 0;
      const totalReviews = reviews.length > 0 ? reviews.length : Number(p.totalReviews) || 0;
      const lastReview = reviews.length > 0
        ? new Date(Math.max(...reviews.map((r: any) => new Date(r.createdAt).getTime()))).toISOString().slice(0, 10)
        : '-';
      const minRating = reviews.length > 0
        ? Math.min(...reviews.map((r: any) => Number(r.rating)))
        : 0;

      // Beneficiary data
      const beneficiaries = Array.isArray(p.beneficiaries)
        ? p.beneficiaries.reduce((s: number, b: any) => s + Number(b.count || 0), 0)
        : Number(p.beneficiaryCount || 0);
      // Expected beneficiaries (from expectedOutputs or budget proxy)
      let expectedBeneficiaries = 0;
      if (p.expectedOutputs) {
        const outputs = Array.isArray(p.expectedOutputs) ? p.expectedOutputs : [];
        for (const o of outputs) {
          const str = typeof o === 'string' ? o : String(o?.value || o?.text || '');
          const match = str.match(/(\d[\d,]*)\s*(?:beneficiar|مستفيد|people|person)/i);
          if (match) { expectedBeneficiaries = parseInt(match[1].replace(/,/g, ''), 10); break; }
        }
      }
      if (expectedBeneficiaries <= 0 && budget > 0 && Number(p.progress) > 50) {
        expectedBeneficiaries = Math.round(budget / 50);
      }

      return {
        id: String(p.id),
        name: p.name || 'Unnamed Project',
        category: p.categoryName || p.category || 'Uncategorized',
        status: p.status || 'active',
        budget,
        spent,
        startDate: p.startDate || '',
        endDate: p.endDate || '',
        progress: Number(p.progress) || 0,
        elapsed,
        avgRating,
        totalReviews,
        lastReview,
        minRating,
        beneficiaries,
        expectedBeneficiaries,
        risk,
      };
    });
  }, [projectsResponse]);

  const loading = alertsLoading || statsLoading || projectsLoading;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'budget' | 'timeline' | 'quality' | 'impact'>('budget');
  const [simModal, setSimModal] = useState<{ alertId: string; projectId: string; projectName: string } | null>(null);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [showAllTimeline, setShowAllTimeline] = useState(false);
  const aiAdvisorRef = useRef<HTMLDivElement>(null);

  // Derive localAlerts from the API response so the timeline, donut chart and footer update reactively
  const localAlerts = useMemo(() => {
    const items = (alertsData as any)?.data?.items || [];
    const mapAlertLevel = (level: string) => {
      switch (level) {
        case 'info': return 'low';
        case 'warning': return 'medium';
        case 'critical': return 'critical';
        default: return level;
      }
    };
    return items.map((a: any) => ({
      id: a.id,
      projectId: a.projectId || a.project_id,
      project: a.project?.name || a.projectName || `Project ${a.projectId}`,
      type: a.type as 'budget' | 'timeline' | 'quality' | 'impact',
      level: mapAlertLevel(a.level) as 'critical' | 'high' | 'medium' | 'low',
      detail: a.message,
      time: new Date(a.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      resolved: !!a.resolvedAt,
    }));
  }, [alertsData]);

  // Derive alertTrendData from the stats API (30-day breakdown by severity)
  const alertTrendData = useMemo(() => {
    const trend = (statsData as any)?.data?.trend;
    if (Array.isArray(trend)) return trend as { day: string; critical: number; high: number; medium: number }[];
    return [] as { day: string; critical: number; high: number; medium: number }[];
  }, [statsData]);

  // Computed risk groups — reads from projectsRiskData (fetched from API) since risk levels come from
  // project data, not alert state. No gap here — RiskSummaryCards show project-level risk.
  const riskGroups = useMemo(() => {
    const groups = { critical: [] as ProjectRiskItem[], high: [] as ProjectRiskItem[], medium: [] as ProjectRiskItem[], low: [] as ProjectRiskItem[] };
    projectsRiskData.forEach(p => groups[p.risk].push(p));
    return groups;
  }, [projectsRiskData]);

  // Active (unresolved) alert counts per risk level — reactive to localAlerts
  const activeAlertCounts = useMemo(() => {
    const active = localAlerts.filter(a => !a.resolved);
    return {
      critical: active.filter(a => a.level === 'critical').length,
      high:     active.filter(a => a.level === 'high').length,
      medium:   active.filter(a => a.level === 'medium').length,
      low:      active.filter(a => a.level === 'low').length,
    };
  }, [localAlerts]);

  // Donut chart data — uses active alert counts so it updates when alerts are resolved
  const donutData = useMemo(() => [
    { name: 'Critical', value: activeAlertCounts.critical, color: '#DB5C5C' },
    { name: 'High',     value: activeAlertCounts.high,     color: '#E07F33' },
    { name: 'Medium',   value: activeAlertCounts.medium,   color: '#E0A024' },
    { name: 'Low',      value: activeAlertCounts.low,      color: '#2EBC85' },
  ], [activeAlertCounts]);

  // Sorted projects by risk for tabs
  const budgetRiskProjects = useMemo(() =>
    [...projectsRiskData]
      .filter(p => p.budget > 0)
      .sort((a, b) => (b.spent / b.budget) - (a.spent / a.budget)),
  [projectsRiskData]);

  const timeRiskProjects = useMemo(() =>
    [...projectsRiskData]
      .filter(p => p.elapsed > 0)
      .sort((a, b) => (b.elapsed - b.progress) - (a.elapsed - a.progress)),
  [projectsRiskData]);

  const qualityRiskProjects = useMemo(() =>
    [...projectsRiskData]
      .filter(p => p.totalReviews > 0)
      .sort((a, b) => a.avgRating - b.avgRating),
  [projectsRiskData]);

  const impactRiskProjects = useMemo(() =>
    [...projectsRiskData]
      .filter(p => p.expectedBeneficiaries > 0)
      .sort((a, b) => (a.beneficiaries / a.expectedBeneficiaries) - (b.beneficiaries / b.expectedBeneficiaries)),
  [projectsRiskData]);

  // Use localAlerts (not static const) so resolved state changes propagate to the timeline
  const visibleTimeline = showAllTimeline ? localAlerts : localAlerts.slice(0, 8);

  const tabs = [
    { key: 'budget'   as const, label: 'Budget Risk',  icon: Wallet,         color: '#E0A024' },
    { key: 'timeline' as const, label: 'Time Risk',    icon: Clock,          color: '#3B97D2' },
    { key: 'quality'  as const, label: 'Quality Risk', icon: Star,           color: '#9079D8' },
    { key: 'impact'   as const, label: 'Impact Risk',  icon: HeartHandshake, color: '#D86B95' },
  ];

  // Simulate Solution handler
  const handleSimulate = useCallback(async (alertId: string, projectId: string) => {
    setSimLoading(true);
    setSimResult(null);
    try {
      const res = await alertService.simulateSolution(alertId, projectId);
      setSimResult((res as any).data);
    } catch {
      // silent fail — modal will show error state
    } finally {
      setSimLoading(false);
    }
  }, []);

  // Midnight Auditor trigger handler
  const handleTriggerAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      await alertService.triggerAudit();
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-stats'] });
    } catch {
      // silent
    } finally {
      setAuditLoading(false);
    }
  }, [queryClient]);

  // Submit scenario for approval
  const handleSubmitScenario = useCallback(async (scenario: SimulationScenario, projectId: string, alertId?: string) => {
    try {
      await alertService.submitScenario({
        projectId,
        alertId: alertId || undefined,
        scenarioId: scenario.id,
        title: scenario.title,
        description: scenario.description,
        impactBefore: scenario.impact.before,
        impactAfter: scenario.impact.after,
        confidence: scenario.confidence,
        effort: scenario.effort,
        timeframe: scenario.timeframe,
      });
      queryClient.invalidateQueries({ queryKey: ['scenario-actions'] });
    } catch {
      // silent
    }
  }, [queryClient]);

  // Approve scenario action
  const handleApproveAction = useCallback(async (id: string, note?: string) => {
    try {
      await alertService.approveScenario(id, note);
      queryClient.invalidateQueries({ queryKey: ['scenario-actions'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-stats'] });
    } catch {
      // silent
    }
  }, [queryClient]);

  // Reject scenario action
  const handleRejectAction = useCallback(async (id: string, reason?: string) => {
    try {
      await alertService.rejectScenario(id, reason);
      queryClient.invalidateQueries({ queryKey: ['scenario-actions'] });
    } catch {
      // silent
    }
  }, [queryClient]);

  /* ── Export Handlers ── */
  const getExportData = useCallback(() => {
    return localAlerts.map(a => ({
      projectName: a.project,
      type: alertTypeCfg[a.type]?.label || a.type,
      level: riskCfg[a.level]?.label || a.level,
      message: a.detail,
      createdAt: a.time,
      resolved: a.resolved ? 'نعم' : 'لا',
    }));
  }, [localAlerts]);

  const handleExportExcel = useCallback(() => {
    exportToExcel(getExportData(), {
      filename: 'alerts_report',
      title: 'تقرير التنبيهات',
      subtitle: `${localAlerts.filter(a => !a.resolved).length} تنبيه نشط`,
      columns: reportColumns.alerts,
    });
  }, [getExportData, localAlerts]);

  const handleExportPDF = useCallback(() => {
    const active = localAlerts.filter(a => !a.resolved);
    const levelCounts = { critical: 0, high: 0, medium: 0, low: 0 } as Record<string, number>;
    active.forEach(a => { levelCounts[a.level] = (levelCounts[a.level] || 0) + 1; });
    generateEarlyWarningPDF({
      kpis: [
        { label: 'Total Alerts', value: localAlerts.length, format: 'number' },
        { label: 'Active', value: active.length, format: 'number' },
        { label: 'Critical', value: levelCounts.critical || 0, format: 'number' },
        { label: 'Resolved', value: localAlerts.filter(a => a.resolved).length, format: 'number' },
      ],
      alerts: localAlerts.map(a => ({
        projectName: a.project,
        type: alertTypeCfg[a.type]?.label || a.type,
        level: riskCfg[a.level]?.label || a.level,
        message: a.detail || '',
        createdAt: a.time || '',
        resolved: a.resolved,
      })),
      levelDistribution: [
        { name: 'Critical', value: levelCounts.critical || 0, color: '#DB5C5C' },
        { name: 'High', value: levelCounts.high || 0, color: '#E07F33' },
        { name: 'Medium', value: levelCounts.medium || 0, color: '#E0A024' },
        { name: 'Low', value: levelCounts.low || 0, color: '#2EBC85' },
      ].filter(d => d.value > 0),
    });
  }, [localAlerts]);

  const handlePrint = useCallback(() => {
    printTable(getExportData(), reportColumns.alerts, 'تقرير التنبيهات - Alerts Report');
  }, [getExportData]);

  return (
    <div className="min-h-full" style={{ background: P.bg, fontFamily: 'Inter, sans-serif' }}>
      {/* Subtle grid BG */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.015]" style={{ backgroundImage: `radial-gradient(${P.accent} 0.5px, transparent 0.5px)`, backgroundSize: '24px 24px' }} />

      <div className="relative px-6 py-5 space-y-6 max-w-[1600px] mx-auto">

        {/* ═══ Header ═══════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-4">
            <motion.div
              className="relative h-12 w-12 flex items-center justify-center rounded-2xl"
              style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)' }}
              animate={{ boxShadow: ['0 0 0px rgba(248,113,113,0)', '0 0 20px rgba(248,113,113,0.3)', '0 0 0px rgba(248,113,113,0)'] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <AlertTriangle size={22} style={{ color: '#DB5C5C' }} />
              {riskGroups.critical.length > 0 && (
                <motion.span
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full text-[10px] font-black"
                  style={{ background: '#DB5C5C', color: '#fff' }}
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {riskGroups.critical.length}
                </motion.span>
              )}
            </motion.div>
            <div>
              <h1 className="text-xl font-black leading-tight" style={{ color: P.textHi, fontFamily: 'Playfair Display, serif' }}>
                Early Warning Center
              </h1>
              <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: P.textLo }}>
                <span style={{ color: '#fca5a5', fontWeight: 600 }}>{riskGroups.critical.length} critical</span> &bull;{' '}
                <span style={{ color: '#fdba74', fontWeight: 600 }}>{riskGroups.high.length} high</span> &bull;{' '}
                <span style={{ color: '#fde68a', fontWeight: 600 }}>{riskGroups.medium.length} medium</span> risk projects require attention
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live pulse */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
              <motion.span className="h-2 w-2 rounded-full" style={{ background: '#DB5C5C' }} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
              <span className="text-xs font-medium" style={{ color: P.textMd }}>Monitoring Active</span>
            </div>
            {/* Export Buttons */}
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium transition-all duration-200 active:scale-[0.97]"
              style={{ background: '#2EBC8512', color: '#2EBC85', border: '1px solid #2EBC8520' }}>
              <FileSpreadsheet size={13} />Excel
            </button>
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium transition-all duration-200 active:scale-[0.97]"
              style={{ background: '#DB5C5C12', color: '#DB5C5C', border: '1px solid #DB5C5C20' }}>
              <FileText size={13} />PDF
            </button>
            <button 
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium transition-all duration-200 active:scale-[0.97]"
              style={{ background: P.surface, color: P.textMd, border: `1px solid ${P.border}` }}>
              <Printer size={13} />Print
            </button>
            {/* Midnight Auditor */}
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleTriggerAudit}
              disabled={auditLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200"
              style={{ background: 'rgba(139,92,246,0.12)', color: '#9079D8', border: '1px solid rgba(139,92,246,0.25)', opacity: auditLoading ? 0.6 : 1 }}
            >
              {auditLoading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <RefreshCw size={14} />
                </motion.div>
              ) : (
                <Moon size={14} />
              )}
              <span className="text-xs font-semibold">{auditLoading ? 'Scanning...' : 'Run Audit'}</span>
            </motion.button>
            {/* Settings */}
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: `0 0 16px ${P.accent}25` }} whileTap={{ scale: 0.97 }}
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200"
              style={{ background: P.accent, color: P.bg, boxShadow: `0 2px 10px ${P.accent}20` }}
            >
              <Settings size={14} />
              <span className="text-xs font-semibold">Settings</span>
            </motion.button>
          </div>
        </motion.div>

        {/* ═══ AI Insight Banner ═══════════════════════════════════════════ */}
        {!loading && (
          <AiInsightBanner
            riskGroups={riskGroups}
            projectsRiskData={projectsRiskData}
            onAskAi={() => {
              aiAdvisorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
          />
        )}

        {/* ═══ Summary KPI Cards ═════════════════════════════════════════════ */}
        <section>
          <SectionHeading icon={Zap} title="Risk Overview" sub="Current project risk distribution" />
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: '#1E1E16', borderTopColor: '#C9C036' }} />
              <p className="text-sm" style={{ color: '#6B6849' }}>Loading risk data...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {([
                { level: 'critical' as const, glow: 'rgba(248,113,113,0.15)', pulse: true },
                { level: 'high'     as const, glow: 'rgba(251,146,60,0.12)',  pulse: false },
                { level: 'medium'   as const, glow: 'rgba(251,191,36,0.10)',  pulse: false },
                { level: 'low'      as const, glow: 'rgba(52,211,153,0.10)',  pulse: false },
              ]).map((item, i) => (
                <RiskSummaryCard
                  key={item.level}
                  item={item}
                  i={i}
                  projects={riskGroups[item.level]}
                  onViewAll={() => setActiveTab(item.level === 'critical' || item.level === 'high' ? 'budget' : 'timeline')}
                />
              ))}
            </div>
          )}
        </section>

        {/* ═══ Charts Section ════════════════════════════════════════════════ */}
        <section>
          <SectionHeading icon={BarChart3} title="Risk Analytics" sub="Distribution and trend analysis" />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
            {/* Donut Chart */}
            <motion.div className="lg:col-span-2" variants={fadeUp as any} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
              <Card className="p-6 h-full" accent="#DB5C5C" glow="rgba(248,113,113,0.08)">
                <h3 className="text-sm font-bold mb-1" style={{ color: P.textHi, fontFamily: 'Playfair Display, serif' }}>Risk Level Distribution</h3>
                <p className="text-[13px] mb-5" style={{ color: P.textLo }}>Across {projectsRiskData.length} monitored projects</p>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%" cy="50%"
                        innerRadius={70} outerRadius={110}
                        paddingAngle={4}
                        dataKey="value"
                        startAngle={90} endAngle={-270}
                      >
                        {donutData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke={P.card} strokeWidth={3} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number; color?: string }[]; label?: string | number }) => <Tip active={active} payload={payload} label={label} suffix=" projects" />} />
                      {/* Center label */}
                      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central" style={{ fill: P.textHi, fontSize: '1.5rem', fontWeight: 900, fontFamily: 'Inter' }}>
                        {projectsRiskData.length}
                      </text>
                      <text x="50%" y="56%" textAnchor="middle" dominantBaseline="central" style={{ fill: P.textLo, fontSize: '0.6rem', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
                        Total Projects
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {donutData.map(d => (
                    <div key={d.name} className="flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: `${d.color}08`, border: `1px solid ${d.color}15` }}>
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-xs font-medium" style={{ color: P.textMd }}>{d.name}</span>
                      <span className="text-[11px] font-bold ml-auto tabular-nums" style={{ color: d.color }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            {/* Line Chart */}
            <motion.div className="lg:col-span-3" variants={stagger(0.15) as any} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
              <Card className="p-6 h-full" accent="#3B97D2">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: P.textHi, fontFamily: 'Playfair Display, serif' }}>Alert Trend (Last 30 Days)</h3>
                    <p className="text-[13px] mt-1.5" style={{ color: P.textLo }}>Daily alert count by severity level</p>
                  </div>
                  <div className="flex gap-3 text-[10px]" style={{ color: P.textLo }}>
                    <span className="flex items-center gap-1.5"><span className="h-1.5 w-5 rounded-full inline-block" style={{ background: '#DB5C5C' }} />Critical</span>
                    <span className="flex items-center gap-1.5"><span className="h-1.5 w-5 rounded-full inline-block" style={{ background: '#E07F33' }} />High</span>
                    <span className="flex items-center gap-1.5"><span className="h-1.5 w-5 rounded-full inline-block" style={{ background: '#E0A024' }} />Medium</span>
                  </div>
                </div>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLine data={alertTrendData} margin={{ top: 5, right: 10, left: -22, bottom: 0 }}>
                      <defs>
                        <linearGradient id="critGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#DB5C5C" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#DB5C5C" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={P.border} vertical={false} />
                      <XAxis dataKey="day" tick={{ fill: P.textMd, fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} interval={4} />
                      <YAxis tick={{ fill: P.textMd, fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip content={({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number; color?: string }[]; label?: string | number }) => <Tip active={active} payload={payload} label={label} />} cursor={{ stroke: P.borderHi, strokeWidth: 1 }} />
                      <Line type="monotone" dataKey="critical" name="Critical" stroke="#DB5C5C" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#DB5C5C', stroke: P.card, strokeWidth: 2 }} />
                      <Line type="monotone" dataKey="high"     name="High"     stroke="#E07F33" strokeWidth={2}   dot={false} activeDot={{ r: 4, fill: '#E07F33', stroke: P.card, strokeWidth: 2 }} />
                      <Line type="monotone" dataKey="medium"   name="Medium"   stroke="#E0A024" strokeWidth={2}   dot={false} activeDot={{ r: 4, fill: '#E0A024', stroke: P.card, strokeWidth: 2 }} />
                    </RechartsLine>
                  </ResponsiveContainer>
                </div>
                {/* Bottom stats */}
                {alertTrendData.length > 0 && (
                <div className="flex items-center gap-4 mt-3">
                  {[
                    { label: 'Avg/day (Critical)', val: (alertTrendData.reduce((a, d) => a + d.critical, 0) / alertTrendData.length).toFixed(1), color: '#DB5C5C' },
                    { label: 'Avg/day (High)',     val: (alertTrendData.reduce((a, d) => a + d.high, 0) / alertTrendData.length).toFixed(1),     color: '#E07F33' },
                    { label: 'Peak Day',           val: `${Math.max(...alertTrendData.map(d => d.critical + d.high + d.medium))} alerts`, color: P.accent },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                      <span className="text-[10px]" style={{ color: P.textLo }}>{s.label}:</span>
                      <span className="text-[11px] font-bold tabular-nums" style={{ color: s.color }}>{s.val}</span>
                    </div>
                  ))}
                </div>
                )}
              </Card>
            </motion.div>
          </div>
        </section>

        {/* ═══ Risk Detail Tabs ══════════════════════════════════════════════ */}
        <section>
          <SectionHeading icon={Filter} title="Risk Detail Analysis" sub="Budget, timeline, and quality risk breakdown by project" />

          {/* Tab bar */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl mb-5 w-fit" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
            {tabs.map(tab => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 flex items-center gap-2"
                  style={{
                    background: activeTab === tab.key ? `${tab.color}15` : 'transparent',
                    color: activeTab === tab.key ? tab.color : P.textMd,
                    border: activeTab === tab.key ? `1px solid ${tab.color}30` : '1px solid transparent',
                  }}
                >
                  <TabIcon size={14} /> {tab.label}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {/* ── Budget Risk Tab ── */}
            {activeTab === 'budget' && (
              <motion.div key="budget" initial="hidden" animate="show" exit="hidden" variants={scaleIn as any}>
                <Card>
                  {budgetRiskProjects.length === 0 ? (
                    <EmptyState
                      variant="filter"
                      title="No budget risk data"
                      message="No projects with budget data are currently being monitored."
                    />
                  ) : (
                  <div className="overflow-x-auto -mx-1 px-1" style={{ scrollbarColor: `${P.borderHi} transparent`, scrollbarWidth: 'thin' }}>
                    <table className="w-full min-w-[1100px]">
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${P.border}` }}>
                          {['Project', 'Allocated (OMR)', 'Spent (OMR)', 'Remaining (OMR)', 'Utilization', 'Risk Level', 'Actions'].map(h => (
                            <th key={h} className="px-4 py-3.5 text-left text-[11px] font-semibold tracking-[0.14em] uppercase whitespace-nowrap" style={{ color: P.textLo }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {budgetRiskProjects.map((proj, i) => {
                          const pct = Math.round((proj.spent / proj.budget) * 100);
                          const remaining = proj.budget - proj.spent;
                          const rLevel = pct > 100 ? 'critical' : pct > 85 ? 'high' : pct > 70 ? 'medium' : 'low';
                          const barColor = riskCfg[rLevel as keyof typeof riskCfg].color;
                          return (
                            <motion.tr
                              key={proj.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.05 + i * 0.04, duration: 0.35 }}
                              className="group transition-colors"
                              style={{ borderBottom: `1px solid ${P.border}80` }}
                              onMouseEnter={e => (e.currentTarget.style.background = `${barColor}06`)}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <button onClick={() => navigate(`/projects/${proj.id}`)} className="text-sm font-medium transition-colors text-left" style={{ color: P.textHi }} onMouseEnter={e => { e.currentTarget.style.color = P.accent; }} onMouseLeave={e => { e.currentTarget.style.color = P.textHi; }}>
                                  {proj.name}
                                </button>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap text-[13px] tabular-nums font-mono" style={{ color: P.textMd }}>{proj.budget.toLocaleString()}</td>
                              <td className="px-4 py-3.5 whitespace-nowrap text-[13px] tabular-nums font-mono" style={{ color: barColor }}>{proj.spent.toLocaleString()}</td>
                              <td className="px-4 py-3.5 whitespace-nowrap text-[13px] tabular-nums font-mono" style={{ color: remaining < 0 ? '#DB5C5C' : P.textLo }}>{remaining.toLocaleString()}</td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-24">
                                    <ProgressBar value={proj.spent} max={proj.budget} color={barColor} delay={i * 0.04} />
                                  </div>
                                  <span className="text-[11px] font-bold tabular-nums w-9 text-right" style={{ color: barColor }}>{pct}%</span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap"><RiskBadge level={rLevel as keyof typeof riskCfg} /></td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => navigate(`/projects/${proj.id}`)} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors" style={{ color: P.accent, background: `${P.accent}08` }} onMouseEnter={e => { e.currentTarget.style.background = `${P.accent}18`; }} onMouseLeave={e => { e.currentTarget.style.background = `${P.accent}08`; }}>
                                    <Eye size={13} /> View
                                  </button>
                                  {/* Resolve: marks all localAlerts for this project as resolved so KPI cards and donut chart update */}
                                  <button onClick={() => { const ids = localAlerts.filter(a => a.projectId === proj.id && !a.resolved).map(a => a.id); if (ids.length) resolveMutation.mutate(ids); }} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors" style={{ color: '#2EBC85', background: 'rgba(52,211,153,0.08)' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.18)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.08)'; }}>
                                    <CheckCircle2 size={13} /> Resolve
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  )}
                </Card>
              </motion.div>
            )}

            {/* ── Timeline Risk Tab ── */}
            {activeTab === 'timeline' && (
              <motion.div key="timeline" initial="hidden" animate="show" exit="hidden" variants={scaleIn as any}>
                <Card>
                  {timeRiskProjects.length === 0 ? (
                    <EmptyState
                      variant="filter"
                      title="No timeline risk data"
                      message="No projects with elapsed timeline data are currently being monitored."
                    />
                  ) : (
                  <div className="overflow-x-auto -mx-1 px-1" style={{ scrollbarColor: `${P.borderHi} transparent`, scrollbarWidth: 'thin' }}>
                    <table className="w-full min-w-[1100px]">
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${P.border}` }}>
                          {['Project', 'Start Date', 'End Date', 'Completion', 'Time Elapsed', 'Delay (days)', 'Risk Level', 'Actions'].map(h => (
                            <th key={h} className="px-4 py-3.5 text-left text-[11px] font-semibold tracking-[0.14em] uppercase whitespace-nowrap" style={{ color: P.textLo }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {timeRiskProjects.map((proj, i) => {
                          const gap = proj.elapsed - proj.progress;
                          const delayDays = Math.max(0, Math.round(gap * 3.65));
                          const rLevel = gap > 30 ? 'critical' : gap > 15 ? 'high' : gap > 5 ? 'medium' : 'low';
                          const barColor = riskCfg[rLevel as keyof typeof riskCfg].color;
                          return (
                            <motion.tr
                              key={proj.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.05 + i * 0.04, duration: 0.35 }}
                              className="group transition-colors"
                              style={{ borderBottom: `1px solid ${P.border}80` }}
                              onMouseEnter={e => (e.currentTarget.style.background = `${barColor}06`)}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <button onClick={() => navigate(`/projects/${proj.id}`)} className="text-sm font-medium transition-colors text-left" style={{ color: P.textHi }} onMouseEnter={e => { e.currentTarget.style.color = P.accent; }} onMouseLeave={e => { e.currentTarget.style.color = P.textHi; }}>
                                  {proj.name}
                                </button>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap text-[13px]" style={{ color: P.textLo }}>
                                <div className="flex items-center gap-1"><Calendar size={13} />{proj.startDate}</div>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap text-[13px]" style={{ color: P.textLo }}>
                                <div className="flex items-center gap-1"><Calendar size={13} />{proj.endDate}</div>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-20">
                                    <ProgressBar value={proj.progress} max={100} color="#2EBC85" delay={i * 0.04} />
                                  </div>
                                  <span className="text-[11px] font-bold tabular-nums w-9 text-right" style={{ color: '#7AD9B3' }}>{proj.progress}%</span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-20">
                                    <ProgressBar value={proj.elapsed} max={100} color={barColor} delay={i * 0.04} />
                                  </div>
                                  <span className="text-[11px] font-bold tabular-nums w-9 text-right" style={{ color: barColor }}>{proj.elapsed}%</span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap text-xs font-bold tabular-nums" style={{ color: delayDays > 0 ? barColor : '#2EBC85' }}>
                                {delayDays > 0 ? `+${delayDays}` : 'On track'}
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap"><RiskBadge level={rLevel as keyof typeof riskCfg} /></td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => navigate(`/projects/${proj.id}`)} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors" style={{ color: P.accent, background: `${P.accent}08` }} onMouseEnter={e => { e.currentTarget.style.background = `${P.accent}18`; }} onMouseLeave={e => { e.currentTarget.style.background = `${P.accent}08`; }}>
                                    <Eye size={13} /> View
                                  </button>
                                  {/* Resolve: marks all localAlerts for this project as resolved so KPI cards and donut chart update */}
                                  <button onClick={() => { const ids = localAlerts.filter(a => a.projectId === proj.id && !a.resolved).map(a => a.id); if (ids.length) resolveMutation.mutate(ids); }} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors" style={{ color: '#2EBC85', background: 'rgba(52,211,153,0.08)' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.18)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.08)'; }}>
                                    <CheckCircle2 size={13} /> Resolve
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  )}
                </Card>
              </motion.div>
            )}

            {/* ── Quality Risk Tab ── */}
            {activeTab === 'quality' && (
              <motion.div key="quality" initial="hidden" animate="show" exit="hidden" variants={scaleIn as any}>
                <Card>
                  {qualityRiskProjects.length === 0 ? (
                    <EmptyState
                      variant="filter"
                      title="No quality risk data"
                      message="No projects with quality review data are currently being monitored."
                    />
                  ) : (
                  <div className="overflow-x-auto -mx-1 px-1" style={{ scrollbarColor: `${P.borderHi} transparent`, scrollbarWidth: 'thin' }}>
                    <table className="w-full min-w-[1100px]">
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${P.border}` }}>
                          {['Project', 'Avg Rating', 'Reviews', 'Last Review', 'Min Rating', 'Risk Level', 'Actions'].map(h => (
                            <th key={h} className="px-4 py-3.5 text-left text-[11px] font-semibold tracking-[0.14em] uppercase whitespace-nowrap" style={{ color: P.textLo }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {qualityRiskProjects.map((proj, i) => {
                          const rLevel = proj.avgRating < 2.0 ? 'critical' : proj.avgRating < 3.0 ? 'high' : proj.avgRating < 3.5 ? 'medium' : 'low';
                          const barColor = riskCfg[rLevel as keyof typeof riskCfg].color;
                          return (
                            <motion.tr
                              key={proj.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.05 + i * 0.04, duration: 0.35 }}
                              className="group transition-colors"
                              style={{ borderBottom: `1px solid ${P.border}80` }}
                              onMouseEnter={e => (e.currentTarget.style.background = `${barColor}06`)}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <button onClick={() => navigate(`/projects/${proj.id}`)} className="text-sm font-medium transition-colors text-left" style={{ color: P.textHi }} onMouseEnter={e => { e.currentTarget.style.color = P.accent; }} onMouseLeave={e => { e.currentTarget.style.color = P.textHi; }}>
                                  {proj.name}
                                </button>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <StarRating rating={proj.avgRating} size={13} />
                                  <span className="text-xs font-bold tabular-nums" style={{ color: barColor }}>{proj.avgRating.toFixed(1)}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap text-xs tabular-nums" style={{ color: P.textMd }}>{proj.totalReviews}</td>
                              <td className="px-4 py-3.5 whitespace-nowrap text-[13px]" style={{ color: P.textLo }}>{proj.lastReview}</td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <span className="text-xs font-bold tabular-nums px-2 py-0.5 rounded-lg" style={{ color: proj.minRating < 2.0 ? '#DB5C5C' : proj.minRating < 3.0 ? '#E07F33' : '#E0A024', background: proj.minRating < 2.0 ? 'rgba(248,113,113,0.1)' : proj.minRating < 3.0 ? 'rgba(251,146,60,0.1)' : 'rgba(251,191,36,0.1)' }}>
                                  {proj.minRating.toFixed(1)}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap"><RiskBadge level={rLevel as keyof typeof riskCfg} /></td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => navigate(`/projects/${proj.id}`)} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors" style={{ color: P.accent, background: `${P.accent}08` }} onMouseEnter={e => { e.currentTarget.style.background = `${P.accent}18`; }} onMouseLeave={e => { e.currentTarget.style.background = `${P.accent}08`; }}>
                                    <Eye size={13} /> View
                                  </button>
                                  <button onClick={() => { const ids = localAlerts.filter(a => a.projectId === proj.id && !a.resolved).map(a => a.id); if (ids.length) resolveMutation.mutate(ids); }} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors" style={{ color: '#2EBC85', background: 'rgba(52,211,153,0.08)' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.18)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.08)'; }}>
                                    <CheckCircle2 size={13} /> Resolve
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  )}
                </Card>
              </motion.div>
            )}

            {/* ── Impact Risk Tab (Social Impact) ── */}
            {activeTab === 'impact' && (
              <motion.div key="impact" initial="hidden" animate="show" exit="hidden" variants={scaleIn as any}>
                <Card>
                  {impactRiskProjects.length === 0 ? (
                    <EmptyState
                      variant="filter"
                      title="No impact risk data"
                      message="No projects with beneficiary targets are currently being monitored."
                    />
                  ) : (
                  <div className="overflow-x-auto -mx-1 px-1" style={{ scrollbarColor: `${P.borderHi} transparent`, scrollbarWidth: 'thin' }}>
                    <table className="w-full min-w-[1100px]">
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${P.border}` }}>
                          {['Project', 'Actual Beneficiaries', 'Expected', 'Achievement', 'Gap', 'Risk Level', 'Actions'].map(h => (
                            <th key={h} className="px-4 py-3.5 text-left text-[11px] font-semibold tracking-[0.14em] uppercase whitespace-nowrap" style={{ color: P.textLo }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {impactRiskProjects.map((proj, i) => {
                          const ratio = proj.expectedBeneficiaries > 0 ? proj.beneficiaries / proj.expectedBeneficiaries : 1;
                          const pct = Math.round(ratio * 100);
                          const rLevel = ratio < 0.25 ? 'critical' : ratio < 0.50 ? 'high' : ratio < 0.75 ? 'medium' : 'low';
                          const barColor = riskCfg[rLevel as keyof typeof riskCfg].color;
                          const gap = proj.expectedBeneficiaries - proj.beneficiaries;
                          return (
                            <motion.tr
                              key={proj.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.05 + i * 0.04, duration: 0.35 }}
                              className="group transition-colors"
                              style={{ borderBottom: `1px solid ${P.border}80` }}
                              onMouseEnter={e => (e.currentTarget.style.background = `${barColor}06`)}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <button onClick={() => navigate(`/projects/${proj.id}`)} className="text-sm font-medium transition-colors text-left" style={{ color: P.textHi }} onMouseEnter={e => { e.currentTarget.style.color = P.accent; }} onMouseLeave={e => { e.currentTarget.style.color = P.textHi; }}>
                                  {proj.name}
                                </button>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap text-[13px] tabular-nums font-mono" style={{ color: barColor }}>{proj.beneficiaries.toLocaleString()}</td>
                              <td className="px-4 py-3.5 whitespace-nowrap text-[13px] tabular-nums font-mono" style={{ color: P.textMd }}>{proj.expectedBeneficiaries.toLocaleString()}</td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-24">
                                    <ProgressBar value={proj.beneficiaries} max={proj.expectedBeneficiaries} color={barColor} delay={i * 0.04} />
                                  </div>
                                  <span className="text-[11px] font-bold tabular-nums w-9 text-right" style={{ color: barColor }}>{pct}%</span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap text-xs font-bold tabular-nums" style={{ color: gap > 0 ? barColor : '#2EBC85' }}>
                                {gap > 0 ? `-${gap.toLocaleString()}` : 'On target'}
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap"><RiskBadge level={rLevel as keyof typeof riskCfg} /></td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => navigate(`/projects/${proj.id}`)} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors" style={{ color: P.accent, background: `${P.accent}08` }} onMouseEnter={e => { e.currentTarget.style.background = `${P.accent}18`; }} onMouseLeave={e => { e.currentTarget.style.background = `${P.accent}08`; }}>
                                    <Eye size={13} /> View
                                  </button>
                                  <button onClick={() => { const ids = localAlerts.filter(a => a.projectId === proj.id && !a.resolved).map(a => a.id); if (ids.length) resolveMutation.mutate(ids); }} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors" style={{ color: '#2EBC85', background: 'rgba(52,211,153,0.08)' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.18)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.08)'; }}>
                                    <CheckCircle2 size={13} /> Resolve
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  )}
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ═══ AI Risk Advisor ═══════════════════════════════════════════════ */}
        <div ref={aiAdvisorRef}>
          <AiRiskAdvisor
            riskGroups={riskGroups}
            projectsRiskData={projectsRiskData}
            localAlerts={localAlerts}
          />
        </div>

        {/* ═══ Alert Timeline ════════════════════════════════════════════════ */}
        <section>
          {/* localAlerts.length used so sub-text updates when alerts are resolved/added */}
          <SectionHeading icon={Flame} title="Recent Alert Log" sub={`Last ${localAlerts.length} alerts — activity timeline`} />
          <Card className="p-6">
            {visibleTimeline.length === 0 ? (
              <EmptyState
                variant="default"
                title="No alerts recorded"
                message="All projects are currently within safe thresholds. No alerts have been triggered."
              />
            ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {visibleTimeline.map((alert, i) => {
                  const typeCfg = alertTypeCfg[alert.type];
                  const levelCfg = riskCfg[alert.level === 'critical' ? 'critical' : alert.level === 'high' ? 'high' : alert.level === 'medium' ? 'medium' : 'low'];
                  const desk = deskForAlertType(alert.type);
                  const deskC = deskCfg[desk];
                  const TypeIcon = typeCfg.icon;
                  return (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.04 + i * 0.03, duration: 0.35, ease: EASE }}
                      className="group relative grid items-stretch transition-colors"
                      style={{
                        gridTemplateColumns: '208px 1fr auto',
                        background: alert.resolved ? 'transparent' : `${deskC.color}05`,
                        borderRadius: 16,
                        border: `1px solid ${alert.resolved ? P.border : deskC.color + '18'}`,
                        overflow: 'hidden',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = alert.resolved ? `${P.accent}05` : `${deskC.color}10`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = alert.resolved ? 'transparent' : `${deskC.color}05`; }}
                    >
                      {/* ── Desk column — agent identity ── */}
                      <div
                        className="flex items-center gap-3 px-4 py-4"
                        style={{ borderRight: `1px solid ${deskC.color}18`, background: `${deskC.color}07` }}
                      >
                        <DeskSeal desk={desk} size={36} />
                        <div className="min-w-0">
                          <div
                            style={{
                              fontFamily: "'Geist Mono', ui-monospace, monospace",
                              fontSize: 9.5,
                              fontWeight: 700,
                              letterSpacing: '0.22em',
                              textTransform: 'uppercase',
                              color: deskC.color,
                              lineHeight: 1.1,
                            }}
                          >
                            {deskC.name}
                          </div>
                          <div style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 10, color: P.textDim, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                            {alert.time}
                          </div>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <TypeIcon size={11} style={{ color: typeCfg.color }} />
                            <span style={{ fontSize: 10, color: typeCfg.color, fontWeight: 600, letterSpacing: '0.04em' }}>{typeCfg.label}</span>
                          </div>
                        </div>
                      </div>

                      {/* ── Body column ── */}
                      <div className="px-5 py-4 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <button
                            onClick={() => navigate(`/projects/${alert.projectId}`)}
                            className="text-[14px] font-semibold transition-colors text-left"
                            style={{ color: P.textHi }}
                            onMouseEnter={e => { e.currentTarget.style.color = P.accent; }}
                            onMouseLeave={e => { e.currentTarget.style.color = P.textHi; }}
                          >
                            {alert.project}
                          </button>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: levelCfg.bg, color: levelCfg.text, border: `1px solid ${levelCfg.color}30` }}>
                            {levelCfg.label}
                          </span>
                        </div>
                        <p className="text-[13px] leading-relaxed" style={{ color: P.textMd }}>{alert.detail}</p>

                        {/* AI Suggestion */}
                        {!alert.resolved && (() => {
                          const suggestion = getAlertSuggestion(alert.type, alert.level, alert.detail);
                          if (!suggestion) return null;
                          return (
                            <div className="flex items-center gap-2 mt-2.5 px-3 py-2 rounded-lg w-fit" style={{ background: `${P.accent}08`, border: `1px solid ${P.accent}18` }}>
                              <Lightbulb size={11} style={{ color: P.accent, flexShrink: 0 }} />
                              <span className="text-[11px] font-medium" style={{ color: P.accentLo }}>{suggestion}</span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* ── Status + Actions ── */}
                      <div className="flex flex-col items-end justify-center gap-2 px-5 py-4" style={{ borderLeft: `1px solid ${P.border}80` }}>
                        {alert.resolved ? (
                          <span className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full" style={{ background: 'rgba(46,188,133,0.10)', color: '#7AD9B3', border: '1px solid rgba(46,188,133,0.25)' }}>
                            <CheckCircle2 size={12} /> Resolved
                          </span>
                        ) : (
                          <>
                            <span className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full" style={{ background: 'rgba(219,92,92,0.10)', color: '#ED9D9D', border: '1px solid rgba(219,92,92,0.25)' }}>
                              <motion.span className="h-1.5 w-1.5 rounded-full inline-block" style={{ background: '#DB5C5C' }} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                              Active
                            </span>
                            {(alert.level === 'critical' || alert.level === 'high') && (
                              <button
                                onClick={() => {
                                  setSimModal({ alertId: alert.id, projectId: alert.projectId, projectName: alert.project });
                                  handleSimulate(alert.id, alert.projectId);
                                }}
                                className="flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-full transition-all duration-200 active:scale-[0.95]"
                                style={{ background: 'rgba(144,121,216,0.10)', color: '#9079D8', border: '1px solid rgba(144,121,216,0.25)' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(144,121,216,0.20)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(144,121,216,0.10)'; }}
                              >
                                <Play size={10} /> Simulate
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* View all button */}
              {!showAllTimeline && localAlerts.length > 8 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4 flex justify-center"
                >
                  <button
                    onClick={() => setShowAllTimeline(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-medium transition-all duration-200"
                    style={{ color: P.accent, background: `${P.accent}08`, border: `1px solid ${P.accent}20` }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${P.accent}18`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = `${P.accent}08`; }}
                  >
                    View All ({localAlerts.length}) <ChevronDown size={14} />
                  </button>
                </motion.div>
              )}

              {/* Summary footer */}
              <div className="mt-6 flex items-center gap-4 px-4 py-3 rounded-full" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                <Info size={13} style={{ color: P.accent, flexShrink: 0 }} />
                <div className="flex items-center gap-4 text-[11px]" style={{ color: P.textMd }}>
                  {/* Use localAlerts so these counts update reactively when alerts are resolved */}
                  <span>Total: <span className="font-bold" style={{ color: P.textHi }}>{localAlerts.length}</span></span>
                  <span className="h-3 w-px" style={{ background: P.border }} />
                  <span>Active: <span className="font-bold" style={{ color: '#fca5a5' }}>{localAlerts.filter(a => !a.resolved).length}</span></span>
                  <span className="h-3 w-px" style={{ background: P.border }} />
                  <span>Resolved: <span className="font-bold" style={{ color: '#7AD9B3' }}>{localAlerts.filter(a => a.resolved).length}</span></span>
                </div>
              </div>
            </div>
            )}
          </Card>
        </section>

        {/* ═══ Action Approval Log ═══════════════════════════════════════════ */}
        {scenarioActions.length > 0 && (
          <section>
            <SectionHeading
              icon={ClipboardList}
              title="Action Approval Log"
              sub={`${scenarioActions.filter(a => a.status === 'pending').length} pending · ${scenarioActions.filter(a => a.status === 'approved').length} approved · ${scenarioActions.filter(a => a.status === 'rejected').length} rejected`}
            />
            <div className="space-y-3">
              {scenarioActions.map((action, idx) => {
                const statusCfg = action.status === 'approved'
                  ? { color: '#2EBC85', bg: 'rgba(46,188,133,0.10)', label: 'Approved', icon: ThumbsUp }
                  : action.status === 'rejected'
                  ? { color: '#DB5C5C', bg: 'rgba(219,92,92,0.10)', label: 'Rejected', icon: ThumbsDown }
                  : { color: '#E0A024', bg: 'rgba(224,160,36,0.10)', label: 'Pending Approval', icon: Clock };
                const beforeRisk = riskCfg[(action.impactBefore?.risk as keyof typeof riskCfg) || 'medium'];
                const afterRisk = riskCfg[(action.impactAfter?.risk as keyof typeof riskCfg) || 'low'];
                const desk = deskForScenarioId(action.scenarioId);
                const deskC = deskCfg[desk];

                return (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04, duration: 0.35, ease: EASE }}
                    className="group relative overflow-hidden"
                    style={{
                      background: P.card,
                      border: `1px solid ${P.border}`,
                      borderRadius: 16,
                    }}
                  >
                    {/* Top status strip */}
                    <div
                      className="px-5 py-2 flex items-center justify-between"
                      style={{ background: `${statusCfg.color}08`, borderBottom: `1px solid ${statusCfg.color}1a` }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.color}30` }}>
                          {(() => { const SI = statusCfg.icon; return <SI size={11} />; })()}
                          {statusCfg.label}
                        </span>
                        <span style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: P.textLo }}>
                          Case #{String(idx + 1).padStart(3, '0')}
                        </span>
                      </div>
                      <span style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 10, color: P.textDim, fontVariantNumeric: 'tabular-nums' }}>
                        {new Date(action.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="grid items-stretch" style={{ gridTemplateColumns: '220px 1fr auto' }}>
                      {/* ── Desk column ── */}
                      <div
                        className="flex flex-col items-start gap-3 px-5 py-5"
                        style={{ borderRight: `1px solid ${deskC.color}18`, background: `${deskC.color}07` }}
                      >
                        <div className="flex items-center gap-3">
                          <DeskSeal desk={desk} size={40} />
                          <div className="min-w-0">
                            <div style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: deskC.color, lineHeight: 1.1 }}>
                              Filed by
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: P.textHi, marginTop: 3, letterSpacing: '-0.005em' }}>
                              {deskC.name}
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: P.textLo, lineHeight: 1.4 }}>
                          By <span style={{ color: P.textMd, fontWeight: 600 }}>{action.createdBy.name}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: P.textDim, padding: '3px 8px', border: `1px solid ${P.border}`, borderRadius: 999 }}>
                            {action.effort} effort
                          </span>
                          <span style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: P.textDim, padding: '3px 8px', border: `1px solid ${P.border}`, borderRadius: 999 }}>
                            {action.timeframe}
                          </span>
                        </div>
                      </div>

                      {/* ── Body column ── */}
                      <div className="px-5 py-5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span style={{ fontSize: 15, fontWeight: 700, color: P.textHi, letterSpacing: '-0.005em' }}>{action.title}</span>
                          <button
                            onClick={() => navigate(`/projects/${action.project.id}`)}
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors"
                            style={{ background: `${P.accent}10`, color: P.accent, border: `1px solid ${P.accent}25` }}
                          >
                            {action.project.name}
                          </button>
                        </div>
                        <p className="text-[13px] leading-relaxed mb-4" style={{ color: P.textMd }}>{action.description}</p>

                        {/* Before → After comparison block */}
                        <div className="grid grid-cols-2 gap-3" style={{ marginBottom: 12 }}>
                          <div className="rounded-xl px-3.5 py-3" style={{ background: `${beforeRisk.color}08`, border: `1px solid ${beforeRisk.color}25` }}>
                            <div style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 9, fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase', color: P.textLo }}>
                              Before
                            </div>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span style={{ fontSize: 22, fontWeight: 700, color: beforeRisk.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                                {action.impactBefore?.value}
                              </span>
                              <span style={{ fontSize: 12, color: beforeRisk.color, fontWeight: 600 }}>{action.impactBefore?.unit}</span>
                            </div>
                            <div style={{ fontSize: 11, color: P.textLo, marginTop: 3 }}>{action.impactBefore?.metric}</div>
                          </div>
                          <div className="rounded-xl px-3.5 py-3 relative" style={{ background: `${afterRisk.color}08`, border: `1px solid ${afterRisk.color}25` }}>
                            <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full flex items-center justify-center" style={{ background: P.card, border: `1px solid ${P.border}` }}>
                              <ChevronRight size={12} style={{ color: P.accent }} />
                            </div>
                            <div style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 9, fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase', color: P.textLo }}>
                              After
                            </div>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span style={{ fontSize: 22, fontWeight: 700, color: afterRisk.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                                {action.impactAfter?.value}
                              </span>
                              <span style={{ fontSize: 12, color: afterRisk.color, fontWeight: 600 }}>{action.impactAfter?.unit}</span>
                            </div>
                            <div style={{ fontSize: 11, color: P.textLo, marginTop: 3 }}>{action.impactAfter?.metric}</div>
                          </div>
                        </div>

                        {/* Approval / Rejection footnote */}
                        {action.approvedBy && action.approvedAt && (
                          <div className="flex items-center gap-2 text-[11px] mt-3 pt-3" style={{ color: '#2EBC85', borderTop: `1px solid ${P.border}` }}>
                            <CheckCircle2 size={12} />
                            <span>Approved by <span style={{ fontWeight: 700 }}>{action.approvedBy.name}</span> on {new Date(action.approvedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                        {action.executionNote && (
                          <div className="text-[11px] mt-1" style={{ color: P.textMd, fontStyle: 'italic', paddingLeft: 18 }}>
                            "{action.executionNote}"
                          </div>
                        )}
                        {action.rejectionReason && (
                          <div className="flex items-start gap-2 text-[11px] mt-3 pt-3" style={{ color: '#DB5C5C', borderTop: `1px solid ${P.border}` }}>
                            <X size={12} style={{ marginTop: 2 }} />
                            <span>Rejected: <span style={{ fontStyle: 'italic' }}>{action.rejectionReason}</span></span>
                          </div>
                        )}
                      </div>

                      {/* ── Status / Actions column ── */}
                      <div className="flex flex-col items-center justify-center gap-3 px-6 py-5" style={{ borderLeft: `1px solid ${P.border}80`, minWidth: 144 }}>
                        {action.status === 'approved' && (
                          <ApprovedStamp color="#2EBC85" />
                        )}
                        {action.status === 'rejected' && (
                          <RejectedStamp color="#DB5C5C" />
                        )}
                        {action.status === 'pending' && (
                          <div className="flex flex-col items-stretch gap-2 w-full">
                            <span style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#E0A024', textAlign: 'center', marginBottom: 4 }}>
                              Awaiting Signature
                            </span>
                            <button
                              onClick={() => {
                                const note = window.prompt('Execution note (optional):');
                                handleApproveAction(action.id, note || undefined);
                              }}
                              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-semibold transition-all duration-200 active:scale-[0.95]"
                              style={{ background: 'rgba(46,188,133,0.10)', color: '#2EBC85', border: '1px solid rgba(46,188,133,0.30)' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(46,188,133,0.22)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(46,188,133,0.10)'; }}
                            >
                              <ThumbsUp size={13} /> Approve
                            </button>
                            <button
                              onClick={() => {
                                const reason = window.prompt('Rejection reason (optional):');
                                handleRejectAction(action.id, reason || undefined);
                              }}
                              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-semibold transition-all duration-200 active:scale-[0.95]"
                              style={{ background: 'rgba(219,92,92,0.08)', color: '#DB5C5C', border: '1px solid rgba(219,92,92,0.25)' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(219,92,92,0.20)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(219,92,92,0.08)'; }}
                            >
                              <ThumbsDown size={13} /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* ═══ Footer ═══════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between pt-6 pb-4" style={{ borderTop: `1px solid ${P.border}` }}>
          <span className="text-xs font-medium" style={{ color: P.textDim }}>CSR Platform © 2026 — Ministry of Commerce & Industry, Oman</span>
          {/* activeAlertCounts.critical is reactive to localAlerts resolved state */}
          <span className="flex items-center gap-2 text-xs font-medium" style={{ color: P.textDim }}>
            <motion.span className="h-1.5 w-1.5 rounded-full" style={{ background: '#DB5C5C' }} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
            {activeAlertCounts.critical} critical alerts active
          </span>
        </div>
      </div>

      {/* Simulate Solution Modal */}
      <AnimatePresence>
        {simModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100]"
              style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
              onClick={() => { setSimModal(null); setSimResult(null); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-4"
            >
              <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-[24px]" style={{ background: P.card, border: `1px solid ${P.borderHi}`, boxShadow: '0 40px 100px rgba(0,0,0,0.6)' }}>
                {/* Header */}
                <div className="sticky top-0 flex items-center justify-between px-6 py-5 rounded-t-[24px]" style={{ background: P.card, borderBottom: `1px solid ${P.border}`, zIndex: 10 }}>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-xl" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
                      <Brain size={18} style={{ color: '#9079D8' }} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold" style={{ color: P.textHi }}>Prescriptive Analytics</h2>
                      <p className="text-xs" style={{ color: P.textLo }}>AI-simulated scenarios for <span className="font-semibold" style={{ color: P.accent }}>{simModal.projectName}</span></p>
                    </div>
                  </div>
                  <button onClick={() => { setSimModal(null); setSimResult(null); }} className="h-9 w-9 flex items-center justify-center rounded-full transition-all duration-200 active:scale-[0.95]" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                    <X size={16} style={{ color: P.textMd }} />
                  </button>
                </div>

                <div className="px-6 py-5">
                  {simLoading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="h-12 w-12 rounded-full border-2 border-t-transparent mb-4"
                        style={{ borderColor: '#9079D8', borderTopColor: 'transparent' }}
                      />
                      <p className="text-sm font-medium" style={{ color: P.textMd }}>Simulating solution scenarios...</p>
                      <p className="text-[13px] mt-1.5" style={{ color: P.textLo }}>Analyzing budget, timeline, and resource data</p>
                    </div>
                  ) : simResult ? (
                    <div className="space-y-5">
                      {/* Project Summary */}
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { label: 'Budget', value: `${((simResult.project.spent / simResult.project.budget) * 100).toFixed(0)}%`, sub: `${simResult.project.spent.toLocaleString()} / ${simResult.project.budget.toLocaleString()} OMR`, color: '#E0A024' },
                          { label: 'Progress', value: `${simResult.project.progress}%`, sub: 'completion', color: '#3B97D2' },
                          { label: 'Beneficiaries', value: simResult.project.beneficiaries.toLocaleString(), sub: 'reached', color: '#D86B95' },
                          { label: 'Quality', value: `${simResult.project.avgRating.toFixed(1)}`, sub: 'avg rating', color: '#9079D8' },
                        ].map((m, i) => (
                          <div key={i} className="px-3 py-3 rounded-xl text-center" style={{ background: `${m.color}08`, border: `1px solid ${m.color}20` }}>
                            <p className="text-lg font-black tabular-nums" style={{ color: m.color }}>{m.value}</p>
                            <p className="text-[10px] font-medium mt-0.5" style={{ color: P.textLo }}>{m.label}</p>
                            <p className="text-[9px]" style={{ color: P.textDim }}>{m.sub}</p>
                          </div>
                        ))}
                      </div>

                      {/* Scenarios */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Sparkles size={14} style={{ color: '#9079D8' }} />
                          <h3 className="text-sm font-bold" style={{ color: P.textHi }}>Solution Scenarios</h3>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.1)', color: '#9079D8' }}>{simResult.scenarios.length} scenarios</span>
                        </div>

                        {simResult.scenarios.map((scenario, idx) => {
                          const beforeRiskCfg = riskCfg[(scenario.impact.before.risk as keyof typeof riskCfg) || 'medium'];
                          const afterRiskCfg = riskCfg[(scenario.impact.after.risk as keyof typeof riskCfg) || 'low'];
                          return (
                            <motion.div
                              key={scenario.id}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.08, duration: 0.35, ease: EASE }}
                              className="rounded-2xl"
                              style={{ border: `1px solid ${P.border}`, background: P.surface }}
                            >
                              {/* Scenario Header */}
                              <div className="px-5 py-4" style={{ borderBottom: `1px solid ${P.border}` }}>
                                <div className="flex items-center justify-between mb-1.5">
                                  <h4 className="text-[13px] font-bold" style={{ color: P.textHi }}>{scenario.title}</h4>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: `${scenario.effort === 'low' ? '#2EBC85' : scenario.effort === 'medium' ? '#E0A024' : '#DB5C5C'}12`, color: scenario.effort === 'low' ? '#2EBC85' : scenario.effort === 'medium' ? '#E0A024' : '#DB5C5C' }}>
                                      {scenario.effort} effort
                                    </span>
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: `${P.accent}10`, color: P.accent }}>
                                      {scenario.timeframe}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-[11px] leading-relaxed" style={{ color: P.textMd }}>{scenario.description}</p>
                              </div>

                              {/* Before / After */}
                              <div className="grid grid-cols-2 divide-x" style={{ borderColor: P.border }}>
                                {/* Before */}
                                <div className="px-5 py-4">
                                  <p className="text-[10px] font-semibold tracking-wider uppercase mb-2" style={{ color: '#DB5C5C' }}>Before</p>
                                  <p className="text-xl font-black tabular-nums" style={{ color: beforeRiskCfg.color }}>
                                    {scenario.impact.before.value}{scenario.impact.before.unit}
                                  </p>
                                  <p className="text-[10px] mt-0.5" style={{ color: P.textLo }}>{scenario.impact.before.metric}</p>
                                  <span className="inline-flex items-center gap-1 mt-2 text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: beforeRiskCfg.bg, color: beforeRiskCfg.text }}>
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: beforeRiskCfg.color }} />
                                    {beforeRiskCfg.label} Risk
                                  </span>
                                </div>
                                {/* After */}
                                <div className="px-5 py-4">
                                  <p className="text-[10px] font-semibold tracking-wider uppercase mb-2" style={{ color: '#2EBC85' }}>After</p>
                                  <p className="text-xl font-black tabular-nums" style={{ color: afterRiskCfg.color }}>
                                    {scenario.impact.after.value}{scenario.impact.after.unit}
                                  </p>
                                  <p className="text-[10px] mt-0.5" style={{ color: P.textLo }}>{scenario.impact.after.metric}</p>
                                  <span className="inline-flex items-center gap-1 mt-2 text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: afterRiskCfg.bg, color: afterRiskCfg.text }}>
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: afterRiskCfg.color }} />
                                    {afterRiskCfg.label} Risk
                                  </span>
                                </div>
                              </div>

                              {/* Confidence Bar + Submit */}
                              <div className="px-5 py-3 flex items-center gap-4" style={{ borderTop: `1px solid ${P.border}` }}>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] font-medium" style={{ color: P.textLo }}>Confidence</span>
                                    <span className="text-[11px] font-bold tabular-nums" style={{ color: scenario.confidence >= 70 ? '#2EBC85' : scenario.confidence >= 50 ? '#E0A024' : '#DB5C5C' }}>
                                      {scenario.confidence}%
                                    </span>
                                  </div>
                                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: P.border }}>
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${scenario.confidence}%` }}
                                      transition={{ duration: 0.8, ease: EASE, delay: 0.2 + idx * 0.1 }}
                                      className="h-full rounded-full"
                                      style={{ background: scenario.confidence >= 70 ? '#2EBC85' : scenario.confidence >= 50 ? '#E0A024' : '#DB5C5C' }}
                                    />
                                  </div>
                                </div>
                                {(() => {
                                  const alreadySubmitted = scenarioActions.some(a => a.scenarioId === scenario.id && a.project.id === simModal?.projectId && a.status !== 'rejected');
                                  return (
                                    <button
                                      disabled={alreadySubmitted}
                                      onClick={() => {
                                        if (simModal) handleSubmitScenario(scenario, simModal.projectId, simModal.alertId);
                                      }}
                                      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-semibold transition-all duration-200 active:scale-[0.95] flex-shrink-0"
                                      style={{
                                        background: alreadySubmitted ? 'rgba(52,211,153,0.1)' : `${P.accent}12`,
                                        color: alreadySubmitted ? '#2EBC85' : P.accent,
                                        border: `1px solid ${alreadySubmitted ? 'rgba(52,211,153,0.25)' : `${P.accent}25`}`,
                                        opacity: alreadySubmitted ? 0.8 : 1,
                                        cursor: alreadySubmitted ? 'default' : 'pointer',
                                      }}
                                    >
                                      {alreadySubmitted ? (
                                        <><CheckCircle2 size={14} /> Submitted</>
                                      ) : (
                                        <><Send size={14} /> Submit for Approval</>
                                      )}
                                    </button>
                                  );
                                })()}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* Disclaimer */}
                      <div className="flex items-start gap-2 px-4 py-3 rounded-xl" style={{ background: `${P.accent}06`, border: `1px solid ${P.accent}12` }}>
                        <Info size={13} style={{ color: P.accent, flexShrink: 0, marginTop: 1 }} />
                        <p className="text-[10px] leading-relaxed" style={{ color: P.textLo }}>
                          These scenarios are AI-generated simulations based on current project data. Actual results may vary. Consult with project stakeholders before implementing any changes.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16">
                      <AlertTriangle size={32} style={{ color: '#DB5C5C' }} />
                      <p className="text-sm font-medium mt-3" style={{ color: P.textMd }}>Failed to generate scenarios</p>
                      <p className="text-[13px] mt-1.5" style={{ color: P.textLo }}>Please try again or check the project data</p>
                      <button
                        onClick={() => handleSimulate(simModal.alertId, simModal.projectId)}
                        className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-all"
                        style={{ background: 'rgba(139,92,246,0.1)', color: '#9079D8', border: '1px solid rgba(139,92,246,0.25)' }}
                      >
                        <RefreshCw size={14} /> Retry
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
