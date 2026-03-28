import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../services/projectService';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  Search, SlidersHorizontal, LayoutGrid, Table2, ChevronDown, ChevronLeft, ChevronRight,
  X, Filter, RotateCcw, Calendar, Wallet, Users,
  FolderKanban, Activity, CheckCircle2, Clock, Pause, Archive,
  ArrowLeft, Trash2, MoreHorizontal, Star, MapPinned, MapPin,
  AlertTriangle, FileSpreadsheet, FileText, Printer,
  ChevronUp, Undo2,
} from 'lucide-react';
import { cn } from '../utils/cn';
import type { Project, ProjectStatus, RiskLevel } from '../types/project.types';
import { useTheme } from '../hooks/useTheme';
import { exportToExcel, printTable, type ExportColumn } from '../utils/exportUtils';
import { generateArchivedProjectsPDF } from '../utils/pdfReportGenerator';
import { useToast } from '../components/common/Toast';

// ─── Palette ──────────────────────────────────────────────────────────────────


// ─── Config ─────────────────────────────────────────────────────────────────
const statusCfg: Record<ProjectStatus, { label: string; icon: React.ElementType; dot: string; bg: string; text: string }> = {
  planning:  { label: 'Planning',  icon: Clock,        dot: '#E91E63', bg: 'rgba(233,30,99,0.1)',   text: '#F48FB1' },
  active:    { label: 'Active',    icon: Activity,     dot: '#38bdf8', bg: 'rgba(56,189,248,0.1)',   text: '#7dd3fc' },
  on_hold:   { label: 'On Hold',   icon: Pause,        dot: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   text: '#fde68a' },
  completed: { label: 'Completed', icon: CheckCircle2, dot: '#34d399', bg: 'rgba(52,211,153,0.1)',   text: '#6ee7b7' },
  archived:  { label: 'Archived',  icon: Archive,      dot: '#9CA3AF', bg: 'rgba(156,163,175,0.1)',   text: '#4B5563' },
};

const riskCfg: Record<RiskLevel, { color: string; bg: string; text: string }> = {
  low:      { color: '#34d399', bg: 'rgba(52,211,153,0.1)',   text: '#6ee7b7' },
  medium:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   text: '#fde68a' },
  high:     { color: '#fb923c', bg: 'rgba(251,146,60,0.1)',   text: '#fdba74' },
  critical: { color: '#f87171', bg: 'rgba(248,113,113,0.1)',  text: '#fca5a5' },
};

const categories = ['Education', 'Healthcare', 'Environment', 'Infrastructure', 'Community', 'Technology', 'Agriculture'];
const regions = ['Muscat', 'Dhofar', 'Al Batinah North', 'Al Batinah South', 'Al Dakhiliyah', 'Al Sharqiyah North', 'Al Sharqiyah South', 'Al Dhahirah', 'Musandam', 'Al Wusta', 'Al Buraimi'];

// ─── Animation ──────────────────────────────────────────────────────────────
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};
const stagger = (delay = 0) => ({
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay } },
});

// ─── Extended Type ──────────────────────────────────────────────────────────
interface ArchivedProject extends Project {
  archivedAt: string;
  archivedBy: string;
  archiveReason: string;
  lastStatus: ProjectStatus;
}

// ─── Reusable Components ────────────────────────────────────────────────────

function GlassCard({ children, className, glow, style: extra }: { children: React.ReactNode; className?: string; glow?: string; style?: React.CSSProperties }) {
  const { colors: P } = useTheme();
  return (
    <div className={cn('relative rounded-[20px] overflow-hidden', className)} style={{
      background: `${P.card}`, border: `1px solid ${P.border}`,
      boxShadow: [`inset 0 1px 0 0 ${P.borderHi}40`, glow ? `0 0 60px ${glow}` : '', '0 12px 40px rgba(0,0,0,0.05)', '0 2px 8px rgba(0,0,0,0.03)'].filter(Boolean).join(', '), ...extra,
    }}>
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${P.borderHi}90, transparent)` }} />
      {children}
    </div>
  );
}

// ─── KPI Summary ────────────────────────────────────────────────────────────
function KpiBar({ projects }: { projects: ArchivedProject[] }) {
  const { colors: P } = useTheme();
  const total = projects.length;
  const completedArchived = projects.filter(p => p.lastStatus === 'completed').length;
  const cancelledArchived = projects.filter(p => p.lastStatus !== 'completed').length;
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalBeneficiaries = projects.reduce((s, p) => s + (p.beneficiaryCount || 0), 0);

  const kpis = [
    { label: 'Total Archived', value: total, icon: Archive, color: P.accentLo, glow: `${P.accent}15` },
    { label: 'Completed', value: completedArchived, icon: CheckCircle2, color: '#34d399', glow: 'rgba(52,211,153,0.12)' },
    { label: 'Cancelled', value: cancelledArchived, icon: AlertTriangle, color: '#fb923c', glow: 'rgba(251,146,60,0.12)' },
    { label: 'Total Budget', value: totalBudget, icon: Wallet, color: '#fbbf24', glow: 'rgba(251,191,36,0.12)', isOMR: true },
    { label: 'Total Beneficiaries', value: totalBeneficiaries, icon: Users, color: '#a78bfa', glow: 'rgba(167,139,250,0.12)' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {kpis.map((k, i) => {
        const Icon = k.icon;
        return (
          <motion.div key={k.label} variants={stagger(i * 0.06)} initial="hidden" animate="show" whileHover={{ y: -3, transition: { duration: 0.2 } }}>
            <GlassCard className="px-4 py-3.5 flex items-center gap-3 cursor-default" glow={k.glow}>
              <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${k.color}12`, border: `1px solid ${k.color}25` }}>
                <Icon size={15} style={{ color: k.color }} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>{k.label}</p>
                <p className="text-lg font-black tabular-nums leading-tight" style={{ color: P.textHi }}>
                  {(k as { isOMR?: boolean }).isOMR ? `${(k.value / 1000000).toFixed(2)}M` : k.value.toLocaleString()}
                </p>
              </div>
            </GlassCard>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Filter Sidebar ─────────────────────────────────────────────────────────
interface Filters {
  category: string[];
  region: string[];
  lastStatus: ProjectStatus[];
  archiveDateRange: [string, string];
}
const defaultFilters: Filters = {
  category: [], region: [], lastStatus: [], archiveDateRange: ['', ''],
};

function ArchiveFilterPanel({ filters, onChange, onReset, onClose, isOpen }: {
  filters: Filters; onChange: (f: Filters) => void; onReset: () => void; onClose: () => void; isOpen: boolean;
}) {
  const { colors: P } = useTheme();
  const toggleArray = <K extends keyof Filters>(key: K, value: string) => {
    const arr = filters[key] as string[];
    onChange({ ...filters, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] });
  };

  const activeCount = filters.category.length + filters.region.length + filters.lastStatus.length
    + (filters.archiveDateRange[0] || filters.archiveDateRange[1] ? 1 : 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }} animate={{ width: 300, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="flex-shrink-0 overflow-hidden"
        >
          <GlassCard className="h-full p-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Filter size={14} style={{ color: P.accent }} />
                <h3 className="text-sm font-bold" style={{ color: P.textHi }}>Filters</h3>
                {activeCount > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${P.accent}20`, color: P.accent }}>{activeCount}</span>}
              </div>
              <button onClick={onClose} className="p-1 rounded-full transition-colors" style={{ color: P.textLo }}><X size={14} /></button>
            </div>

            <div className="space-y-6">
              {/* Last Status before archiving */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2.5" style={{ color: P.textLo }}>Status Before Archive</label>
                <div className="flex flex-wrap gap-2">
                  {(['completed', 'active', 'on_hold', 'planning'] as ProjectStatus[]).map(s => {
                    const cfg = statusCfg[s];
                    const active = filters.lastStatus.includes(s);
                    return (
                      <button key={s} onClick={() => toggleArray('lastStatus', s)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all"
                        style={{ background: active ? cfg.bg : 'transparent', color: active ? cfg.text : P.textLo, border: `1px solid ${active ? cfg.dot + '40' : P.border}` }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.dot }} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2.5" style={{ color: P.textLo }}>Category</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(c => {
                    const active = filters.category.includes(c);
                    return (
                      <button key={c} onClick={() => toggleArray('category', c)}
                        className="px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all"
                        style={{ background: active ? `${P.accent}15` : 'transparent', color: active ? P.accent : P.textLo, border: `1px solid ${active ? P.accent + '40' : P.border}` }}>
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Region */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2.5" style={{ color: P.textLo }}>Region</label>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: `${P.border} transparent` }}>
                  {regions.map(r => {
                    const active = filters.region.includes(r);
                    return (
                      <button key={r} onClick={() => toggleArray('region', r)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-full text-[11px] font-medium transition-all text-left"
                        style={{ background: active ? `${P.accent}12` : 'transparent', color: active ? P.accent : P.textMd }}>
                        <MapPinned size={11} style={{ color: active ? P.accent : P.textLo }} />{r}
                        {active && <CheckCircle2 size={11} className="ml-auto" style={{ color: P.accent }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Archive Date Range */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2.5" style={{ color: P.textLo }}>Archive Date</label>
                <div className="flex items-center gap-2">
                  <input type="date" value={filters.archiveDateRange[0]} onChange={e => onChange({ ...filters, archiveDateRange: [e.target.value, filters.archiveDateRange[1]] })}
                    className="w-full px-3 py-2 rounded-full text-xs outline-none" style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi }}
                    onFocus={e => { e.currentTarget.style.borderColor = `${P.accent}60`; }} onBlur={e => { e.currentTarget.style.borderColor = P.border; }} />
                  <span className="text-xs" style={{ color: P.textDim }}>—</span>
                  <input type="date" value={filters.archiveDateRange[1]} onChange={e => onChange({ ...filters, archiveDateRange: [filters.archiveDateRange[0], e.target.value] })}
                    className="w-full px-3 py-2 rounded-full text-xs outline-none" style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi }}
                    onFocus={e => { e.currentTarget.style.borderColor = `${P.accent}60`; }} onBlur={e => { e.currentTarget.style.borderColor = P.border; }} />
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button onClick={onReset} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-medium" style={{ background: 'transparent', color: P.textLo, border: `1px solid ${P.border}` }}>
                <RotateCcw size={11} /> Reset
              </button>
              <button onClick={onClose} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-bold" style={{ background: `${P.accent}20`, color: P.accent, border: `1px solid ${P.accent}40` }}>
                <CheckCircle2 size={11} /> Apply
              </button>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Archived Project Card ──────────────────────────────────────────────────
function ArchivedCard({ project, index, onRestore, onDelete, onView }: {
  project: ArchivedProject; index: number; onRestore: (id: string) => void; onDelete: (id: string) => void; onView?: (id: string) => void;
}) {
  const { colors: P } = useTheme();
  const lastSc = statusCfg[project.lastStatus];
  const rc = project.risk ? riskCfg[project.risk] : riskCfg.low;
  const budgetPct = project.budget > 0 ? Math.round((project.spent / project.budget) * 100) : 0;
  const archiveDate = new Date(project.archivedAt);
  const isCompleted = project.lastStatus === 'completed';

  return (
    <motion.div variants={stagger(index * 0.05)} initial="hidden" animate="show"
      whileHover={{ y: -4, transition: { duration: 0.25, ease: EASE } }}
      className="group cursor-pointer"
      onClick={() => onView?.(project.id)}>
      <GlassCard className="p-0 h-full flex flex-col">
        {/* Header */}
        <div className="relative h-28 overflow-hidden rounded-t-[20px]" style={{ background: `linear-gradient(135deg, ${P.textDim}15, ${P.card} 60%, ${rc.color}08)` }}>
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 30% 20%, ${P.textDim}15, transparent 60%)` }} />

          {/* Archive badge */}
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md" style={{ background: 'rgba(156,163,175,0.2)', color: P.textMd, border: `1px solid ${P.textDim}40` }}>
              <Archive size={10} /> Archived
            </span>
          </div>

          {/* Previous status */}
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-medium backdrop-blur-sm" style={{ background: lastSc.bg, color: lastSc.text, border: `1px solid ${lastSc.dot}25` }}>
              Was: {lastSc.label}
            </span>
          </div>

          {/* Progress ring */}
          <div className="absolute bottom-3 right-3">
            <div className="relative h-9 w-9">
              <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke={P.border} strokeWidth="2" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke={isCompleted ? '#34d399' : '#fb923c'} strokeWidth="2" strokeLinecap="round"
                  strokeDasharray={`${(project.progress || 0) * 0.975} 100`} opacity={0.7} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black tabular-nums" style={{ color: P.textMd }}>{project.progress}%</span>
            </div>
          </div>

          {/* Archive date */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
            <Calendar size={10} style={{ color: P.textLo }} />
            <span className="text-[10px]" style={{ color: P.textLo }}>Archived: {archiveDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-4 flex flex-col">
          <h3 className="text-sm font-bold mb-1 line-clamp-1 transition-colors" style={{ color: P.textHi }}>{project.name}</h3>
          <div className="flex items-center gap-1.5 mb-2">
            <MapPin size={10} style={{ color: P.textDim }} />
            <span className="text-[11px]" style={{ color: P.textDim }}>{project.location}, {project.region}</span>
          </div>

          {/* Category + Risk */}
          <div className="flex items-center gap-1.5 mb-3">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: P.surface, color: P.textLo, border: `1px solid ${P.border}` }}>{project.categoryName}</span>
            {project.risk && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium capitalize" style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.color}20` }}>{project.risk}</span>
            )}
          </div>

          {/* Archive Reason */}
          <div className="mb-3 p-2.5 rounded-xl" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
            <p className="text-[10px] font-semibold mb-0.5" style={{ color: P.textLo }}>Reason:</p>
            <p className="text-[11px] line-clamp-2" style={{ color: P.textMd }}>{project.archiveReason}</p>
          </div>

          {/* Archived By */}
          <div className="flex items-center gap-2 mb-3">
            <span className="h-5 w-5 rounded-md flex items-center justify-center text-[9px] font-bold" style={{ background: `${P.accent}10`, color: P.accent }}>
              {(project.archivedBy || 'A').charAt(0)}
            </span>
            <span className="text-[10px]" style={{ color: P.textDim }}>by {project.archivedBy || 'Admin'}</span>
          </div>

          {/* Budget */}
          <div className="mb-3">
            <div className="flex justify-between text-[10px] mb-1">
              <span style={{ color: P.textDim }}>Budget</span>
              <span className="font-bold tabular-nums" style={{ color: P.textLo }}>{(project.spent / 1000).toFixed(0)}k / {(project.budget / 1000).toFixed(0)}k OMR</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: P.border }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(budgetPct, 100)}%`, background: P.textDim, opacity: 0.5 }} />
            </div>
          </div>

          {/* Stats */}
          <div className="mt-auto flex items-center justify-between pt-3" style={{ borderTop: `1px solid ${P.border}` }}>
            <div className="flex items-center gap-1">
              <Users size={10} style={{ color: P.textDim }} />
              <span className="text-[10px] tabular-nums" style={{ color: P.textLo }}>{(project.beneficiaryCount || 0).toLocaleString()}</span>
            </div>
            {(project.avgRating ?? 0) > 0 && (
              <div className="flex items-center gap-1">
                <Star size={10} style={{ color: '#fbbf2470' }} />
                <span className="text-[10px] font-bold tabular-nums" style={{ color: P.textLo }}>{(project.avgRating ?? 0).toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={(e) => { e.stopPropagation(); onRestore(project.id); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-[11px] font-bold transition-all"
              style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.1)'; }}>
              <Undo2 size={12} /> Restore
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-[11px] font-bold transition-all"
              style={{ background: '#f8717110', color: '#f87171', border: '1px solid #f8717125' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f8717118'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f8717110'; }}>
              <Trash2 size={12} /> Delete
            </motion.button>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ─── Table Row ──────────────────────────────────────────────────────────────
function ArchivedTableRow({ project, index, selected, onToggle, onRestore, onDelete, onView }: {
  project: ArchivedProject; index: number; selected: boolean; onToggle: () => void; onRestore: (id: string) => void; onDelete: (id: string) => void; onView?: (id: string) => void;
}) {
  const { colors: P } = useTheme();
  const lastSc = statusCfg[project.lastStatus];
  const archiveDate = new Date(project.archivedAt);
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => { if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setActionsOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <motion.tr
      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.03 + index * 0.04, duration: 0.35 }}
      className="group transition-colors cursor-pointer"
      style={{ borderBottom: `1px solid ${P.border}80` }}
      onClick={() => onView?.(project.id)}
      onMouseEnter={e => (e.currentTarget.style.background = `${P.accent}04`)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      <td className="px-4 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={selected} onChange={onToggle} className="h-3.5 w-3.5 rounded cursor-pointer" style={{ accentColor: P.accent }} />
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap">
        <div>
          <p className="text-[13px] font-semibold" style={{ color: P.textHi }}>{project.name}</p>
          <p className="text-[10px]" style={{ color: P.textDim }}>{project.location}, {project.region}</p>
        </div>
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap"><span className="text-[11px]" style={{ color: P.textLo }}>{project.categoryName}</span></td>
      <td className="px-4 py-3.5 whitespace-nowrap">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: lastSc.bg, color: lastSc.text }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: lastSc.dot }} />{lastSc.label}
        </span>
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap">
        <span className="text-xs tabular-nums font-mono" style={{ color: P.textLo }}>{(project.budget / 1000).toFixed(0)}k OMR</span>
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap">
        <span className="text-[11px] tabular-nums" style={{ color: P.textLo }}>{archiveDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap">
        <span className="text-[11px]" style={{ color: P.textLo }}>{project.archivedBy}</span>
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap max-w-[200px]">
        <p className="text-[11px] truncate" style={{ color: P.textDim }}>{project.archiveReason}</p>
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
        <div ref={actionsRef} className="relative">
          <button onClick={() => setActionsOpen(!actionsOpen)} className="p-1.5 rounded-full transition-colors" style={{ color: P.textLo }}
            onMouseEnter={e => { e.currentTarget.style.background = `${P.accent}15`; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            <MoreHorizontal size={14} />
          </button>
          <AnimatePresence>
            {actionsOpen && (
              <motion.div initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.95 }}
                className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden w-40"
                style={{ background: P.card, border: `1px solid ${P.borderHi}`, boxShadow: '0 15px 50px rgba(0,0,0,0.6)' }}>
                <button onClick={() => { onRestore(project.id); setActionsOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-left transition-colors"
                  style={{ color: '#34d399' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                  <Undo2 size={12} /> Restore Project
                </button>
                <button onClick={() => { onDelete(project.id); setActionsOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-left transition-colors"
                  style={{ color: '#f87171' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f8717110'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                  <Trash2 size={12} /> Delete Permanently
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </td>
    </motion.tr>
  );
}

// ─── Pagination ─────────────────────────────────────────────────────────────
function PaginationBar({ page, totalPages, perPage, total, onPageChange, onPerPageChange }: {
  page: number; totalPages: number; perPage: number; total: number; onPageChange: (p: number) => void; onPerPageChange: (n: number) => void;
}) {
  const { colors: P } = useTheme();
  const pages = useMemo(() => {
    const arr: (number | '...')[] = [];
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) arr.push(i); }
    else {
      arr.push(1);
      if (page > 3) arr.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) arr.push(i);
      if (page < totalPages - 2) arr.push('...');
      arr.push(totalPages);
    }
    return arr;
  }, [page, totalPages]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 px-1">
      <div className="flex items-center gap-2">
        <span className="text-[11px]" style={{ color: P.textLo }}>Showing</span>
        <select value={perPage} onChange={e => onPerPageChange(Number(e.target.value))} className="px-2 py-1 rounded-full text-[11px] outline-none cursor-pointer" style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textMd }}>
          {[6, 9, 12, 24].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <span className="text-[11px]" style={{ color: P.textLo }}>of <strong style={{ color: P.textMd }}>{total}</strong></span>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="p-1.5 rounded-full transition-colors disabled:opacity-30" style={{ color: P.textLo }}><ChevronLeft size={14} /></button>
        {pages.map((p, i) => (
          <button key={i} onClick={() => typeof p === 'number' ? onPageChange(p) : undefined} disabled={p === '...'} className="h-7 min-w-[28px] px-1.5 rounded-full text-[11px] font-medium transition-all"
            style={{ background: p === page ? `${P.accent}20` : 'transparent', color: p === page ? P.accent : P.textLo, border: p === page ? `1px solid ${P.accent}40` : '1px solid transparent', cursor: p === '...' ? 'default' : 'pointer' }}>
            {p}
          </button>
        ))}
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="p-1.5 rounded-full transition-colors disabled:opacity-30" style={{ color: P.textLo }}><ChevronRight size={14} /></button>
      </div>
    </div>
  );
}

// ─── Bulk Actions ───────────────────────────────────────────────────────────
function BulkActionsBar({ count, onClear, onRestoreAll, onDeleteAll }: { count: number; onClear: () => void; onRestoreAll: () => void; onDeleteAll: () => void }) {
  const { colors: P } = useTheme();
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div initial={{ opacity: 0, y: 10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: 10, height: 0 }} className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 rounded-full mb-3" style={{ background: `${P.accent}10`, border: `1px solid ${P.accent}25` }}>
            <span className="text-xs font-bold" style={{ color: P.accent }}>{count} selected</span>
            <div className="flex items-center gap-2">
              <button onClick={onRestoreAll} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-colors" style={{ color: '#34d399', background: 'rgba(52,211,153,0.1)' }}>
                <Undo2 size={11} /> Restore All
              </button>
              <button onClick={onDeleteAll} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-colors" style={{ color: '#f87171', background: '#f8717110' }}>
                <Trash2 size={11} /> Delete All
              </button>
              <button onClick={onClear} className="p-1.5 rounded-full" style={{ color: P.textLo }}><X size={12} /></button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
type ViewMode = 'grid' | 'table';
type SortKey = 'name' | 'budget' | 'archivedAt' | 'progress';
type SortDir = 'asc' | 'desc';

export default function ArchivedProjects() {
  const P = useTheme().colors;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(6);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('archivedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'single' | 'bulk'; id?: string } | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState<{ type: 'single' | 'bulk'; id?: string } | null>(null);

  // ─── Restore Mutation ──────────────────────────────────────────────────────
  const restoreMutation = useMutation({
    mutationFn: (id: string) => projectService.restoreProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project restored successfully');
    },
    onError: () => {
      toast.error('Failed to restore project');
    },
  });

  // ─── Delete Mutation ───────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectService.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted permanently');
    },
    onError: () => {
      toast.error('Failed to delete project');
    },
  });

  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });

  // ─── Fetch archived projects from API ─────────────────────────────────────
  const queryFilters = useMemo(() => {
    const params: Record<string, unknown> = {
      page,
      limit: perPage,
      sortBy: sortKey,
      sortOrder: sortDir,
    };
    if (search.trim()) params.search = search.trim();
    if (filters.category.length === 1) params.categoryName = filters.category[0];
    if (filters.region.length === 1) params.region = filters.region[0];
    return params;
  }, [page, perPage, sortKey, sortDir, search, filters]);

  const { data: archivedData, isLoading } = useQuery({
    queryKey: ['projects', 'archived', queryFilters],
    queryFn: () => projectService.getArchivedProjects(queryFilters),
    staleTime: 5 * 60 * 1000,
  });

  const allArchivedProjects = useMemo(() => {
    const items = archivedData?.data?.items || [];
    // Map API projects to ArchivedProject interface with fallback defaults
    return items.map(p => ({
      ...p,
      archivedAt: (p as any).archivedAt || p.updatedAt || p.createdAt,
      archivedBy: (p as any).archivedBy || 'System',
      archiveReason: (p as any).archiveReason || 'Archived',
      lastStatus: ((p as any).lastStatus || 'completed') as ProjectStatus,
    })) as ArchivedProject[];
  }, [archivedData]);

  // Client-side filtering for multi-select filters
  const filtered = useMemo(() => {
    let result = [...allArchivedProjects];

    if (filters.category.length > 1) result = result.filter(p => filters.category.includes(p.categoryName || ''));
    if (filters.region.length > 1) result = result.filter(p => filters.region.includes(p.region || ''));
    if (filters.lastStatus.length > 0) result = result.filter(p => filters.lastStatus.includes(p.lastStatus));
    if (filters.archiveDateRange[0]) result = result.filter(p => p.archivedAt >= filters.archiveDateRange[0]);
    if (filters.archiveDateRange[1]) result = result.filter(p => p.archivedAt <= filters.archiveDateRange[1]);

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'budget': cmp = a.budget - b.budget; break;
        case 'archivedAt': cmp = new Date(a.archivedAt).getTime() - new Date(b.archivedAt).getTime(); break;
        case 'progress': cmp = (a.progress || 0) - (b.progress || 0); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [allArchivedProjects, filters, sortKey, sortDir]);

  const totalPages = archivedData?.data?.totalPages || Math.ceil(filtered.length / perPage) || 1;
  const totalCount = archivedData?.data?.total || filtered.length;
  const paginated = filtered;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginated.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginated.map(p => p.id)));
  }, [paginated, selectedIds.size]);

  const handleRestore = useCallback((id: string) => setRestoreConfirm({ type: 'single', id }), []);
  const handleDelete = useCallback((id: string) => setDeleteConfirm({ type: 'single', id }), []);
  const handleView = useCallback((id: string) => navigate(`/projects/${id}`), [navigate]);

  // ─── Export Configuration ──────────────────────────────────────────────────
  const archivedExportColumns: ExportColumn[] = useMemo(() => [
    { key: 'name', header: 'Project Name' },
    { key: 'categoryName', header: 'Category' },
    { key: 'region', header: 'Region' },
    { key: 'budget', header: 'Budget (OMR)', format: 'number' },
    { key: 'progress', header: 'Progress (%)' },
    { key: 'lastStatus', header: 'Last Status' },
    { key: 'archivedAt', header: 'Archived Date', format: 'date' },
    { key: 'archivedBy', header: 'Archived By' },
    { key: 'archiveReason', header: 'Archive Reason' },
  ], []);

  const getExportData = useCallback(() => {
    return filtered.map(p => ({
      name: p.name,
      categoryName: p.categoryName || 'N/A',
      region: p.region || 'N/A',
      budget: p.budget,
      progress: Math.round(p.progress || 0),
      lastStatus: statusCfg[p.lastStatus]?.label || p.lastStatus,
      archivedAt: p.archivedAt,
      archivedBy: p.archivedBy,
      archiveReason: p.archiveReason,
    }));
  }, [filtered]);

  const handleExportExcel = useCallback(() => {
    const data = getExportData();
    exportToExcel(data, {
      filename: `Archived_Projects_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Archived Projects',
      columns: archivedExportColumns,
      title: 'Archived Projects Report',
    });
  }, [getExportData, archivedExportColumns]);

  const handleExportPDF = useCallback(() => {
    const totalBudget = filtered.reduce((s, p) => s + p.budget, 0);
    generateArchivedProjectsPDF({
      kpis: [
        { label: 'Total Archived', value: totalCount, format: 'number' },
        { label: 'Total Budget', value: totalBudget, format: 'currency' },
      ],
      projects: filtered.map(p => ({
        name: p.name,
        categoryName: p.categoryName || 'N/A',
        region: p.region || 'N/A',
        budget: p.budget,
        progress: Math.round(p.progress || 0),
        lastStatus: statusCfg[p.lastStatus]?.label || p.lastStatus,
        archivedAt: p.archivedAt || '',
        archiveReason: p.archiveReason || '',
      })),
    });
  }, [filtered, totalCount]);

  const handlePrint = useCallback(() => {
    const data = getExportData();
    printTable(data, archivedExportColumns.slice(0, 7), 'Archived Projects Report');
  }, [getExportData, archivedExportColumns]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#080805' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ background: P.bg, fontFamily: 'Inter, sans-serif' }}>
      <div className="fixed inset-0 pointer-events-none opacity-[0.015]" style={{ backgroundImage: `radial-gradient(${P.accent} 0.5px, transparent 0.5px)`, backgroundSize: '24px 24px' }} />

      <div className="relative px-6 py-5 space-y-5 max-w-[1600px] mx-auto">
        {/* Header */}
        <motion.div ref={heroRef} initial={{ opacity: 0, y: 10 }} animate={heroInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/projects')} className="h-9 w-9 rounded-xl flex items-center justify-center transition-colors" style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textMd }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${P.accent}40`; e.currentTarget.style.color = P.accent; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.color = P.textMd; }}>
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl font-black leading-tight flex items-center gap-3" style={{ color: P.textHi }}>
                <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: `${P.accentLo}18`, border: `1px solid ${P.accentLo}35` }}>
                  <Archive size={17} style={{ color: P.accentLo }} />
                </div>
                Archived Projects
              </h1>
              <p className="mt-1 text-xs" style={{ color: P.textLo }}>
                {totalCount} archived project{totalCount !== 1 ? 's' : ''} — Restore or permanently delete
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium"
              style={{ background: P.surface, color: P.textMd, border: `1px solid ${P.border}` }}>
              <FileSpreadsheet size={13} />Excel
            </motion.button>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium"
              style={{ background: P.surface, color: P.textMd, border: `1px solid ${P.border}` }}>
              <FileText size={13} />PDF
            </motion.button>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium"
              style={{ background: P.surface, color: P.textMd, border: `1px solid ${P.border}` }}>
              <Printer size={13} />Print
            </motion.button>
            <button onClick={() => navigate('/projects')} className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-medium transition-all" style={{ background: `${P.accent}15`, color: P.accent, border: `1px solid ${P.accent}30` }}>
              <FolderKanban size={13} /> Back to Projects
            </button>
          </div>
        </motion.div>

        {/* KPI Bar */}
        <KpiBar projects={allArchivedProjects} />

        {/* Search + Controls */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 flex items-center gap-2 max-w-xl">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: P.textLo }} />
              <input type="text" placeholder="Search archived projects, reasons, people..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 rounded-full text-xs outline-none transition-all"
                style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi }}
                onFocus={e => { e.currentTarget.style.borderColor = `${P.accent}60`; }}
                onBlur={e => { e.currentTarget.style.borderColor = P.border; }} />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: P.textLo }}><X size={12} /></button>}
            </div>
            <button onClick={() => setFiltersOpen(!filtersOpen)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-xs font-medium transition-all"
              style={{ background: filtersOpen ? `${P.accent}15` : P.surface, color: filtersOpen ? P.accent : P.textMd, border: `1px solid ${filtersOpen ? P.accent + '40' : P.border}` }}>
              <SlidersHorizontal size={13} /> Filters
              {(filters.category.length + filters.region.length + filters.lastStatus.length) > 0 && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-0.5" style={{ background: `${P.accent}30`, color: P.accent }}>
                  {filters.category.length + filters.region.length + filters.lastStatus.length}
                </span>
              )}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} className="px-2.5 py-2 rounded-full text-[11px] outline-none cursor-pointer" style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textMd }}>
                <option value="archivedAt">Archive Date</option>
                <option value="name">Name</option>
                <option value="budget">Budget</option>
                <option value="progress">Progress</option>
              </select>
              <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} className="p-2 rounded-xl transition-colors" style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textMd }}>
                {sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>
            <div className="flex items-center p-1 rounded-xl" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
              {([{ key: 'grid' as const, icon: LayoutGrid }, { key: 'table' as const, icon: Table2 }]).map(v => (
                <button key={v.key} onClick={() => setViewMode(v.key)} className="p-2 rounded-full transition-all" style={{ background: viewMode === v.key ? `${P.accent}18` : 'transparent', color: viewMode === v.key ? P.accent : P.textLo }}>
                  <v.icon size={14} />
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <div className="flex gap-5">
          <ArchiveFilterPanel filters={filters} onChange={f => { setFilters(f); setPage(1); }} onReset={() => { setFilters(defaultFilters); setPage(1); }} onClose={() => setFiltersOpen(false)} isOpen={filtersOpen} />

          <div className="flex-1 min-w-0">
            <BulkActionsBar count={selectedIds.size} onClear={() => setSelectedIds(new Set())}
              onRestoreAll={() => setRestoreConfirm({ type: 'bulk' })}
              onDeleteAll={() => setDeleteConfirm({ type: 'bulk' })} />

            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px]" style={{ color: P.textLo }}>
                {totalCount} archived project{totalCount !== 1 ? 's' : ''} found
                {search && <> matching "<strong style={{ color: P.textMd }}>{search}</strong>"</>}
              </span>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                variant={search.trim() || filters.category.length > 0 || filters.region.length > 0 || filters.lastStatus.length > 0 || filters.archiveDateRange[0] || filters.archiveDateRange[1] ? 'search' : 'default'}
                title={search.trim() ? 'No archived projects found' : 'No matching archived projects'}
                message={search.trim() ? `No archived projects match "${search}". Try a different search term.` : 'Try adjusting your filter criteria or reset all filters.'}
                actionLabel="Clear Filters"
                onAction={() => { setSearch(''); setFilters(defaultFilters); }}
              />
            ) : null}

            {viewMode === 'grid' && filtered.length > 0 && (
              <AnimatePresence mode="wait">
                <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {paginated.map((p, i) => <ArchivedCard key={p.id} project={p} index={i} onRestore={handleRestore} onDelete={handleDelete} onView={handleView} />)}
                </motion.div>
              </AnimatePresence>
            )}

            {viewMode === 'table' && filtered.length > 0 && (
              <AnimatePresence mode="wait">
                <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <GlassCard>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${P.border}` }}>
                            <th className="px-4 py-3.5 text-left w-8">
                              <input type="checkbox" checked={selectedIds.size === paginated.length && paginated.length > 0} onChange={toggleSelectAll} className="h-3.5 w-3.5 rounded cursor-pointer" style={{ accentColor: P.accent }} />
                            </th>
                            {['Project', 'Category', 'Last Status', 'Budget', 'Archived', 'By', 'Reason', ''].map(h => (
                              <th key={h} className="px-4 py-3.5 text-left text-[10px] font-semibold tracking-[0.14em] uppercase whitespace-nowrap" style={{ color: P.textLo }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paginated.map((p, i) => <ArchivedTableRow key={p.id} project={p} index={i} selected={selectedIds.has(p.id)} onToggle={() => toggleSelect(p.id)} onRestore={handleRestore} onDelete={handleDelete} onView={handleView} />)}
                        </tbody>
                      </table>
                    </div>
                  </GlassCard>
                </motion.div>
              </AnimatePresence>
            )}

            {filtered.length > 0 && totalPages > 1 && (
              <PaginationBar page={page} totalPages={totalPages} perPage={perPage} total={totalCount} onPageChange={setPage} onPerPageChange={n => { setPerPage(n); setPage(1); }} />
            )}
          </div>
        </div>
      </div>

      {/* Restore Confirmation Dialog */}
      <AnimatePresence>
        {restoreConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={() => setRestoreConfirm(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <GlassCard className="p-6 max-w-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)' }}>
                    <Undo2 size={22} style={{ color: '#34d399' }} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold" style={{ color: P.textHi }}>Restore Project{restoreConfirm.type === 'bulk' ? 's' : ''}?</h3>
                    <p className="text-[11px]" style={{ color: P.textLo }}>
                      {restoreConfirm.type === 'bulk' ? `${selectedIds.size} projects will be restored` : 'This project will be moved back to active projects'}
                    </p>
                  </div>
                </div>
                <p className="text-[13px] mb-6" style={{ color: P.textMd }}>
                  {restoreConfirm.type === 'bulk'
                    ? 'The selected projects will be restored to their previous status and will appear in the active projects list.'
                    : `"${allArchivedProjects.find(p => p.id === restoreConfirm.id)?.name}" will be restored to its previous status.`}
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setRestoreConfirm(null)} className="flex-1 py-2.5 rounded-full text-[12px] font-medium" style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textMd }}>Cancel</button>
                  <button onClick={() => {
                    if (restoreConfirm.type === 'bulk') {
                      selectedIds.forEach(id => restoreMutation.mutate(id));
                    } else if (restoreConfirm.id) {
                      restoreMutation.mutate(restoreConfirm.id);
                    }
                    setRestoreConfirm(null); setSelectedIds(new Set());
                  }} className="flex-1 py-2.5 rounded-full text-[12px] font-bold" style={{ background: '#34d399', color: '#042f2e' }}>
                    <span className="flex items-center justify-center gap-1.5"><Undo2 size={12} /> Restore</span>
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <GlassCard className="p-6 max-w-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ background: '#f8717115', border: '1px solid #f8717130' }}>
                    <AlertTriangle size={22} style={{ color: '#f87171' }} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold" style={{ color: P.textHi }}>Permanently Delete?</h3>
                    <p className="text-[11px]" style={{ color: '#f87171' }}>This action cannot be undone</p>
                  </div>
                </div>
                <p className="text-[13px] mb-6" style={{ color: P.textMd }}>
                  {deleteConfirm.type === 'bulk'
                    ? `You are about to permanently delete ${selectedIds.size} project(s). All data, media, documents, and history will be permanently lost.`
                    : `You are about to permanently delete "${allArchivedProjects.find(p => p.id === deleteConfirm.id)?.name}". All data will be permanently lost.`}
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-full text-[12px] font-medium" style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textMd }}>Cancel</button>
                  <button onClick={() => {
                    if (deleteConfirm.type === 'bulk') {
                      selectedIds.forEach(id => deleteMutation.mutate(id));
                    } else if (deleteConfirm.id) {
                      deleteMutation.mutate(deleteConfirm.id);
                    }
                    setDeleteConfirm(null); setSelectedIds(new Set());
                  }} className="flex-1 py-2.5 rounded-full text-[12px] font-bold" style={{ background: '#f87171', color: '#fff' }}>
                    <span className="flex items-center justify-center gap-1.5"><Trash2 size={12} /> Delete Forever</span>
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
