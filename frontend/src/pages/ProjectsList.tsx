import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { projectService } from '../services/projectService';
import { categoryService } from '../services/categoryService';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Search, SlidersHorizontal, LayoutGrid, Table2, MapPin, Plus,
  FileSpreadsheet, FileText, ChevronDown, ChevronLeft, ChevronRight,
  X, Filter, RotateCcw, Calendar, Wallet, Users,
  FolderKanban, Activity, CheckCircle2, Clock, Pause, Archive,
  Trash2, Edit3, Printer,
  MoreHorizontal, Star, MapPinned,
  ChevronUp,
} from 'lucide-react';
import { cn } from '../utils/cn.ts';
import type { Project, ProjectStatus, RiskLevel } from '../types/project.types';
import { useTheme } from '../hooks/useTheme';
import { exportToExcel, printTable, reportColumns } from '../utils/exportUtils';
import { generateProjectsListPDF } from '../utils/pdfReportGenerator';

// ─── Palette (same as Dashboard) ──────────────────────────────────────────────


// ─── Config ───────────────────────────────────────────────────────────────────
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

const regions = [
  'Muscat', 'Dhofar', 'Musandam', 'Al Buraimi', 'Ad Dakhiliyah',
  'Al Batinah North', 'Al Batinah South', 'Ash Sharqiyah North',
  'Ash Sharqiyah South', 'Ad Dhahirah', 'Al Wusta',
];

// ─── Framer Variants ──────────────────────────────────────────────────────────
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};
const stagger = (delay = 0) => ({
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay } },
});

// ─── Region Coordinates ───────────────────────────────────────────────────────
const regionCoords: Record<string, [number, number]> = {
  'Muscat':             [23.588, 58.383],
  'Dhofar':             [17.015, 54.092],
  'Al Batinah North':   [24.346, 56.731],
  'Al Batinah South':   [23.678, 57.889],
  'Al Dakhiliyah':      [22.933, 57.533],
  'Al Sharqiyah North': [22.573, 58.109],
  'Al Sharqiyah South': [22.567, 59.529],
  'Al Dhahirah':        [23.225, 56.516],
  'Musandam':           [26.180, 56.248],
  'Al Wusta':           [20.200, 56.500],
  'Al Buraimi':         [24.245, 55.783],
};

const statusColors: Record<string, string> = {
  active: '#38bdf8', completed: '#34d399', planning: '#E91E63', on_hold: '#fbbf24', archived: '#9CA3AF',
};

function FitBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  React.useEffect(() => {
    // Always fit to Oman bounds
    const omanBounds = L.latLngBounds(
      L.latLng(16.6, 51.8),
      L.latLng(26.5, 60.0)
    );
    map.setMaxBounds(omanBounds);
    map.fitBounds(omanBounds, { padding: [20, 20] });
    map.setMinZoom(5);
    map.setMaxZoom(10);
  }, [coords, map]);
  return null;
}

// ─── Reusable Card ────────────────────────────────────────────────────────────
function GlassCard({ children, className, glow, accent, style: extraStyle }: { children: React.ReactNode; className?: string; glow?: string; accent?: string; style?: React.CSSProperties }) {
  const { colors: P } = useTheme();
  return (
    <div
      className={cn('relative rounded-[20px]', className)}
      style={{
        background: `${P.card}`,
        border: `1px solid ${P.border}`,
        boxShadow: [
          `inset 0 1px 0 0 ${P.borderHi}40`,
          glow ? `0 0 60px ${glow}` : '',
          '0 12px 40px rgba(0,0,0,0.05)',
          '0 2px 8px rgba(0,0,0,0.03)',
        ].filter(Boolean).join(', '),
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        ...extraStyle,
      }}
    >
      {accent && <div className="absolute top-3 right-3 w-2 h-2 rounded-full" style={{ background: accent, boxShadow: `0 0 12px ${accent}80` }} />}
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${P.borderHi}90, transparent)` }} />
      {children}
    </div>
  );
}

// ─── Filter Sidebar ───────────────────────────────────────────────────────────
interface Filters {
  status: ProjectStatus[];
  category: string[];
  region: string[];
  budgetRange: [number, number];
  beneficiaryRange: [number, number];
  progressRange: [number, number];
  dateRange: [string, string];
}
const defaultFilters: Filters = {
  status: [],
  category: [],
  region: [],
  budgetRange: [0, 1000000],
  beneficiaryRange: [0, 10000],
  progressRange: [0, 100],
  dateRange: ['', ''],
};

function FilterPanel({ filters, onChange, onReset, onClose, isOpen, categoryList }: {
  filters: Filters;
  onChange: (f: Filters) => void;
  onReset: () => void;
  onClose: () => void;
  isOpen: boolean;
  categoryList: string[];
}) {
  const { colors: P } = useTheme();
  const toggleArrayFilter = <K extends keyof Filters>(key: K, value: string) => {
    const arr = filters[key] as string[];
    const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
    onChange({ ...filters, [key]: next });
  };

  const activeCount = filters.status.length + filters.category.length + filters.region.length
    + (filters.budgetRange[0] > 0 || filters.budgetRange[1] < 1000000 ? 1 : 0)
    + (filters.progressRange[0] > 0 || filters.progressRange[1] < 100 ? 1 : 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 300, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="flex-shrink-0 overflow-hidden"
        >
          <GlassCard className="h-full p-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Filter size={14} style={{ color: P.accent }} />
                <h3 className="text-sm font-bold" style={{ color: P.textHi }}>Filters</h3>
                {activeCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${P.accent}20`, color: P.accent }}>{activeCount}</span>
                )}
              </div>
              <button onClick={onClose} className="p-1 rounded-full transition-colors" style={{ color: P.textLo }} onMouseEnter={e => ((e.currentTarget).style.background = `${P.accent}15`)} onMouseLeave={e => ((e.currentTarget).style.background = 'transparent')}>
                <X size={14} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Status */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2.5" style={{ color: P.textLo }}>Status</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(statusCfg) as ProjectStatus[]).filter(s => s !== 'archived').map(s => {
                    const cfg = statusCfg[s];
                    const active = filters.status.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => toggleArrayFilter('status', s)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200"
                        style={{
                          background: active ? cfg.bg : 'transparent',
                          color: active ? cfg.text : P.textLo,
                          border: `1px solid ${active ? cfg.dot + '40' : P.border}`,
                        }}
                      >
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
                  {categoryList.map(c => {
                    const active = filters.category.includes(c);
                    return (
                      <button
                        key={c}
                        onClick={() => toggleArrayFilter('category', c)}
                        className="px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200"
                        style={{
                          background: active ? `${P.accent}15` : 'transparent',
                          color: active ? P.accent : P.textLo,
                          border: `1px solid ${active ? P.accent + '40' : P.border}`,
                        }}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Region */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2.5" style={{ color: P.textLo }}>Region</label>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: `${P.border} transparent` }}>
                  {regions.map(r => {
                    const active = filters.region.includes(r);
                    return (
                      <button
                        key={r}
                        onClick={() => toggleArrayFilter('region', r)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-full text-[11px] font-medium transition-all duration-200 text-left"
                        style={{
                          background: active ? `${P.accent}12` : 'transparent',
                          color: active ? P.accent : P.textMd,
                        }}
                      >
                        <MapPinned size={11} style={{ color: active ? P.accent : P.textLo, flexShrink: 0 }} />
                        {r}
                        {active && <CheckCircle2 size={11} className="ml-auto" style={{ color: P.accent }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Budget Range */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2.5" style={{ color: P.textLo }}>Budget Range (OMR)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.budgetRange[0] || ''}
                    onChange={e => onChange({ ...filters, budgetRange: [Number(e.target.value) || 0, filters.budgetRange[1]] })}
                    className="w-full px-3 py-2 rounded-full text-xs outline-none transition-all"
                    style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi }}
                    onFocus={e => (e.currentTarget.style.borderColor = `${P.accent}60`)}
                    onBlur={e => (e.currentTarget.style.borderColor = P.border)}
                  />
                  <span className="text-xs" style={{ color: P.textDim }}>—</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.budgetRange[1] === 1000000 ? '' : filters.budgetRange[1]}
                    onChange={e => onChange({ ...filters, budgetRange: [filters.budgetRange[0], Number(e.target.value) || 1000000] })}
                    className="w-full px-3 py-2 rounded-full text-xs outline-none transition-all"
                    style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi }}
                    onFocus={e => (e.currentTarget.style.borderColor = `${P.accent}60`)}
                    onBlur={e => (e.currentTarget.style.borderColor = P.border)}
                  />
                </div>
              </div>

              {/* Progress Range */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2.5" style={{ color: P.textLo }}>Completion %</label>
                <div className="flex items-center gap-3">
                  <span className="text-xs tabular-nums w-8 text-right" style={{ color: P.textMd }}>{filters.progressRange[0]}%</span>
                  <div className="flex-1 relative h-1.5 rounded-full" style={{ background: P.border }}>
                    <div
                      className="absolute h-full rounded-full"
                      style={{
                        left: `${filters.progressRange[0]}%`,
                        width: `${filters.progressRange[1] - filters.progressRange[0]}%`,
                        background: P.accent,
                      }}
                    />
                  </div>
                  <span className="text-xs tabular-nums w-8" style={{ color: P.textMd }}>{filters.progressRange[1]}%</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-2.5">
              <button onClick={onReset}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 active:scale-[0.96] hover:border-current"
                style={{ background: 'transparent', color: P.textLo, border: `1.5px dashed ${P.border}` }}
              >
                <RotateCcw size={11} />
                Reset
              </button>
              <button onClick={onClose}
                className="relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-black tracking-wide transition-all duration-300 active:scale-[0.96] overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${P.accent}, ${P.accent}cc)`, color: P.bg, boxShadow: `0 4px 16px ${P.accent}35, inset 0 1px 0 rgba(255,255,255,0.12)` }}
              >
                <span className="absolute inset-0 bg-gradient-to-t from-black/8 to-transparent" />
                <CheckCircle2 size={11} className="relative z-10" />
                <span className="relative z-10">Apply</span>
              </button>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Project Card (Grid View) ─────────────────────────────────────────────────
function ProjectCard({ project, index, onSelect, onEdit }: { project: Project; index: number; onSelect: (id: string) => void; onEdit: (id: string) => void }) {
  const { colors: P } = useTheme();
  const sc = statusCfg[project.status];
  const rc = project.risk ? riskCfg[project.risk] : riskCfg.low;
  const budgetPct = project.budget > 0 ? Math.round((project.spent / project.budget) * 100) : 0;

  return (
    <motion.div
      variants={stagger(index * 0.05)}
      initial="hidden"
      animate="show"
      whileHover={{ y: -6, scale: 1.015, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }}
      onClick={() => onSelect(project.id)}
      className="cursor-pointer group"
    >
      <GlassCard className="p-0 h-full flex flex-col">
        {/* Cover / Gradient Header */}
        <div className="relative h-32 overflow-hidden rounded-t-[20px]" style={{ background: `linear-gradient(135deg, ${sc.dot}15, ${P.card} 60%, ${rc.color}10)` }}>
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 30% 20%, ${sc.dot}15, transparent 60%)` }} />
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.dot}30` }}>
              <sc.icon size={10} />
              {sc.label}
            </span>
            {project.risk && (
              <span className="px-2 py-1 rounded-full text-[10px] font-bold backdrop-blur-md capitalize" style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.color}30` }}>
                {project.risk}
              </span>
            )}
          </div>
          <div className="absolute bottom-3 left-3">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium backdrop-blur-sm" style={{ background: `${P.bg}90`, color: P.textMd, border: `1px solid ${P.border}` }}>
              {project.categoryName}
            </span>
          </div>
          <div className="absolute bottom-3 right-3">
            <div className="relative h-10 w-10">
              <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke={P.border} strokeWidth="2" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke={(project.progress || 0) === 100 ? '#34d399' : P.accent} strokeWidth="2" strokeLinecap="round" strokeDasharray={`${(project.progress || 0) * 0.975} 100`} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black tabular-nums" style={{ color: P.textHi }}>{project.progress || 0}%</span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 flex flex-col">
          <h3 className="text-sm font-bold mb-1 line-clamp-1 group-hover:text-[#E91E63] transition-colors" style={{ color: P.textHi }}>{project.name}</h3>
          <div className="flex items-center gap-1.5 mb-3">
            <MapPin size={10} style={{ color: P.textLo }} />
            <span className="text-[11px]" style={{ color: P.textLo }}>{project.location}{project.region ? `, ${project.region}` : ''}</span>
          </div>

          <div className="mb-3">
            <div className="flex justify-between text-[10px] mb-1">
              <span style={{ color: P.textLo }}>Budget</span>
              <span className="font-bold tabular-nums" style={{ color: budgetPct > 85 ? '#f87171' : P.textMd }}>
                {(project.spent / 1000).toFixed(0)}k / {(project.budget / 1000).toFixed(0)}k OMR
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: P.border }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(budgetPct, 100)}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full"
                style={{ background: budgetPct > 90 ? '#f87171' : budgetPct > 75 ? '#fbbf24' : P.accent }}
              />
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between pt-3" style={{ borderTop: `1px solid ${P.border}` }}>
            <div className="flex items-center gap-1">
              <Users size={10} style={{ color: P.textLo }} />
              <span className="text-[10px] tabular-nums" style={{ color: P.textMd }}>{(project.beneficiaryCount || 0).toLocaleString()}</span>
            </div>
            {project.avgRating && project.avgRating > 0 ? (
              <div className="flex items-center gap-1">
                <Star size={10} style={{ color: '#fbbf24' }} />
                <span className="text-[10px] font-bold tabular-nums" style={{ color: P.textMd }}>{project.avgRating.toFixed(1)}</span>
              </div>
            ) : null}
            <div className="flex items-center gap-1">
              <Calendar size={10} style={{ color: P.textLo }} />
              <span className="text-[10px]" style={{ color: P.textLo }}>{project.endDate.substring(0, 7)}</span>
            </div>
          </div>

          {project.tags && project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2.5">
              {project.tags.slice(0, 3).map(t => (
                <span key={t} className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ background: `${P.accent}10`, color: P.accentLo, border: `1px solid ${P.accent}15` }}>{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Edit Button */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onEdit(project.id)}
            className="h-8 w-8 rounded-xl flex items-center justify-center backdrop-blur-md"
            style={{ background: `${P.bg}cc`, border: `1px solid ${P.border}`, color: P.textMd }}
            title="Edit Project"
          >
            <Edit3 size={13} />
          </motion.button>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ─── Table Row ────────────────────────────────────────────────────────────────
function ProjectTableRow({ project, index, selected, onToggle, onSelect, onEdit }: {
  project: Project; index: number; selected: boolean; onToggle: () => void; onSelect: (id: string) => void; onEdit: (id: string) => void;
}) {
  const { colors: P } = useTheme();
  const sc = statusCfg[project.status];
  const rc = project.risk ? riskCfg[project.risk] : riskCfg.low;

  return (
    <motion.tr
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.03 + index * 0.04, duration: 0.35 }}
      className="group transition-colors cursor-pointer"
      style={{ borderBottom: `1px solid ${P.border}80` }}
      onMouseEnter={e => (e.currentTarget.style.background = `${P.accent}06`)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      onClick={() => onSelect(project.id)}
    >
      <td className="px-4 py-3.5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
        <input type="checkbox" checked={selected} onChange={onToggle} className="h-3.5 w-3.5 rounded cursor-pointer" style={{ accentColor: P.accent }} />
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${sc.dot}15`, border: `1px solid ${sc.dot}25` }}>
            <sc.icon size={13} style={{ color: sc.dot }} />
          </div>
          <div>
            <p className="text-[13px] font-semibold group-hover:text-[#E91E63] transition-colors" style={{ color: P.textHi }}>{project.name}</p>
            <p className="text-[10px]" style={{ color: P.textLo }}>{project.location}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap"><span className="text-[11px]" style={{ color: P.textMd }}>{project.categoryName}</span></td>
      <td className="px-4 py-3.5 whitespace-nowrap">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium" style={{ background: sc.bg, color: sc.text }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: sc.dot }} />
          {sc.label}
        </span>
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap">
        <div>
          <span className="text-xs tabular-nums font-mono" style={{ color: P.textMd }}>{(project.budget / 1000).toFixed(0)}k OMR</span>
          <div className="w-16 h-1 rounded-full mt-1 overflow-hidden" style={{ background: P.border }}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(Math.round((project.spent / project.budget) * 100), 100)}%`, background: Math.round((project.spent / project.budget) * 100) > 85 ? '#f87171' : P.accent }} />
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ background: P.border }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${project.progress || 0}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="h-full rounded-full" style={{ background: (project.progress || 0) === 100 ? '#34d399' : P.accent }} />
          </div>
          <span className="text-[11px] tabular-nums w-7 text-right" style={{ color: P.textLo }}>{project.progress || 0}%</span>
        </div>
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap"><span className="text-[11px]" style={{ color: P.textLo }}>{project.endDate}</span></td>
      <td className="px-4 py-3.5 whitespace-nowrap">
        {project.risk && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize" style={{ background: rc.bg, color: rc.text }}>{project.risk}</span>}
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(project.id)}
            className="h-7 w-7 flex items-center justify-center rounded-full transition-all duration-300 active:scale-[0.88]"
            style={{ color: P.textLo, border: `1.5px solid transparent` }}
            onMouseEnter={e => { e.currentTarget.style.background = `${P.accent}18`; e.currentTarget.style.color = P.accent; e.currentTarget.style.borderColor = `${P.accent}30`; e.currentTarget.style.boxShadow = `0 0 10px ${P.accent}15`; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = P.textLo; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
            title="Edit Project"
          >
            <Edit3 size={13} />
          </button>
          <button className="h-7 w-7 flex items-center justify-center rounded-full transition-all duration-300 active:scale-[0.88]" style={{ color: P.textLo, border: `1.5px solid transparent` }} onMouseEnter={e => { (e.currentTarget).style.background = `${P.accent}18`; (e.currentTarget).style.borderColor = `${P.accent}30`; (e.currentTarget).style.boxShadow = `0 0 10px ${P.accent}15`; }} onMouseLeave={e => { (e.currentTarget).style.background = 'transparent'; (e.currentTarget).style.borderColor = 'transparent'; (e.currentTarget).style.boxShadow = 'none'; }}>
            <MoreHorizontal size={14} />
          </button>
        </div>
      </td>
    </motion.tr>
  );
}

// ─── KPI Summary ──────────────────────────────────────────────────────────────
function KpiBar({ projects }: { projects: Project[] }) {
  const { colors: P } = useTheme();
  const total = projects.length;
  const active = projects.filter(p => p.status === 'active').length;
  const completed = projects.filter(p => p.status === 'completed').length;
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalBeneficiaries = projects.reduce((s, p) => s + (p.beneficiaryCount || 0), 0);

  const kpis = [
    { label: 'Total', value: total, icon: FolderKanban, color: P.accent, glow: `${P.accent}15` },
    { label: 'Active', value: active, icon: Activity, color: '#38bdf8', glow: 'rgba(56,189,248,0.15)' },
    { label: 'Completed', value: completed, icon: CheckCircle2, color: '#34d399', glow: 'rgba(52,211,153,0.15)' },
    { label: 'Budget', value: totalBudget, icon: Wallet, color: '#fbbf24', glow: 'rgba(251,191,36,0.15)', isOMR: true },
    { label: 'Beneficiaries', value: totalBeneficiaries, icon: Users, color: '#a78bfa', glow: 'rgba(167,139,250,0.15)' },
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
                  {(k as { isOMR?: boolean }).isOMR ? `${(k.value / 1000000).toFixed(1)}M` : k.value.toLocaleString()}
                </p>
              </div>
            </GlassCard>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function PaginationBar({ page, totalPages, perPage, total, onPageChange, onPerPageChange }: {
  page: number; totalPages: number; perPage: number; total: number;
  onPageChange: (p: number) => void; onPerPageChange: (n: number) => void;
}) {
  const { colors: P } = useTheme();
  const pages = useMemo(() => {
    const arr: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) arr.push(i);
    } else {
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
          {[6, 9, 12, 24, 48].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <span className="text-[11px]" style={{ color: P.textLo }}>of <strong style={{ color: P.textMd }}>{total}</strong> projects</span>
      </div>
      <div className="flex items-center gap-0.5 p-1 rounded-full" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="h-7 w-7 flex items-center justify-center rounded-full transition-all duration-200 disabled:opacity-20 active:scale-[0.9] hover:bg-white/5" style={{ color: P.textLo }}><ChevronLeft size={14} /></button>
        {pages.map((p, i) => (
          <button key={i} onClick={() => typeof p === 'number' ? onPageChange(p) : undefined} disabled={p === '...'} className={cn('h-7 min-w-[28px] px-1.5 rounded-full text-[11px] font-bold transition-all duration-300', typeof p === 'number' && p === page && 'shadow-lg')} style={{ background: p === page ? P.accent : 'transparent', color: p === page ? P.bg : P.textLo, cursor: p === '...' ? 'default' : 'pointer', boxShadow: p === page ? `0 2px 10px ${P.accent}40` : 'none', transform: p === page ? 'scale(1.1)' : 'scale(1)' }}>
            {p}
          </button>
        ))}
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="h-7 w-7 flex items-center justify-center rounded-full transition-all duration-200 disabled:opacity-20 active:scale-[0.9] hover:bg-white/5" style={{ color: P.textLo }}><ChevronRight size={14} /></button>
      </div>
    </div>
  );
}

// ─── Bulk Actions Bar ─────────────────────────────────────────────────────────
function BulkActionsBar({ count, onClear, onExport }: { count: number; onClear: () => void; onExport?: () => void }) {
  const { colors: P } = useTheme();
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div initial={{ opacity: 0, y: 10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: 10, height: 0 }} className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 rounded-full mb-3" style={{ background: `${P.accent}10`, border: `1px solid ${P.accent}25` }}>
            <span className="text-xs font-bold" style={{ color: P.accent }}>{count} selected</span>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={onExport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all duration-300 active:scale-[0.95] hover:shadow-lg" 
                style={{ color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', boxShadow: '0 0 0 0 transparent' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(52,211,153,0.2)'; e.currentTarget.style.background = 'rgba(52,211,153,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 0 0 transparent'; e.currentTarget.style.background = 'rgba(52,211,153,0.1)'; }}>
                <FileSpreadsheet size={11} />Export
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all duration-300 active:scale-[0.95]" style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(251,191,36,0.2)'; e.currentTarget.style.background = 'rgba(251,191,36,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = 'rgba(251,191,36,0.1)'; }}>
                <Archive size={11} />Archive
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all duration-300 active:scale-[0.95]" style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(248,113,113,0.2)'; e.currentTarget.style.background = 'rgba(248,113,113,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; }}>
                <Trash2 size={11} />Delete
              </button>
              <button onClick={onClear} className="h-6 w-6 flex items-center justify-center rounded-full transition-all duration-200 active:scale-[0.88]" style={{ color: P.textLo, border: `1px solid ${P.border}` }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#f87171'; e.currentTarget.style.color = '#f87171'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.color = P.textLo; }}><X size={10} /></button>
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
type ViewMode = 'grid' | 'table' | 'map';
type SortKey = 'name' | 'budget' | 'progress' | 'endDate' | 'risk';
type SortDir = 'asc' | 'desc';

const fallbackCategories = ['Education', 'Healthcare', 'Environment', 'Infrastructure', 'Community', 'Technology'];

export default function ProjectsList() {
  const { colors: P, isDark } = useTheme();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // ─── Fetch categories for filter dropdown ─────────────────────────────────
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories({ limit: 100 }),
    staleTime: 10 * 60 * 1000,
  });
  const categoryList = useMemo(() => {
    const items = categoriesData?.data?.items;
    if (items && items.length > 0) return items.map(c => c.name);
    return fallbackCategories;
  }, [categoriesData]);

  // ─── Fetch projects from API ──────────────────────────────────────────────
  const queryFilters = useMemo(() => {
    const params: Record<string, unknown> = {
      page,
      limit: perPage,
      sortBy: sortKey,
      sortOrder: sortDir,
    };
    if (search.trim()) params.search = search.trim();
    if (filters.status.length === 1) params.status = filters.status[0];
    if (filters.category.length === 1) params.categoryName = filters.category[0];
    if (filters.region.length === 1) params.region = filters.region[0];
    if (filters.budgetRange[0] > 0) params.minBudget = filters.budgetRange[0];
    if (filters.budgetRange[1] < 1000000) params.maxBudget = filters.budgetRange[1];
    return params;
  }, [page, perPage, sortKey, sortDir, search, filters]);

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects', queryFilters],
    queryFn: () => projectService.getProjects(queryFilters),
    staleTime: 5 * 60 * 1000,
  });

  const allProjects = useMemo(() => {
    const items = projectsData?.data?.items || [];
    // Filter out archived on the client side as well, in case the API returns them
    return items.filter(p => p.status !== 'archived');
  }, [projectsData]);

  // Client-side filtering for multi-select filters that the API may not support
  const filtered = useMemo(() => {
    let result = [...allProjects];

    // Apply multi-value filters client-side if needed (API only supports single value)
    if (filters.status.length > 1) result = result.filter(p => filters.status.includes(p.status));
    if (filters.category.length > 1) result = result.filter(p => filters.category.includes(p.categoryName || ''));
    if (filters.region.length > 1) result = result.filter(p => filters.region.includes(p.region || ''));
    if (filters.progressRange[0] > 0 || filters.progressRange[1] < 100) {
      result = result.filter(p => (p.progress || 0) >= filters.progressRange[0] && (p.progress || 0) <= filters.progressRange[1]);
    }

    // Client-side sorting as secondary measure
    const riskOrder: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'budget': cmp = a.budget - b.budget; break;
        case 'progress': cmp = (a.progress || 0) - (b.progress || 0); break;
        case 'endDate': cmp = new Date(a.endDate).getTime() - new Date(b.endDate).getTime(); break;
        case 'risk': cmp = riskOrder[a.risk || 'low'] - riskOrder[b.risk || 'low']; break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [allProjects, filters, sortKey, sortDir]);

  const totalPages = projectsData?.data?.totalPages || Math.ceil(filtered.length / perPage) || 1;
  const totalCount = projectsData?.data?.total || filtered.length;
  const paginated = filtered;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginated.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginated.map(p => p.id)));
  }, [paginated, selectedIds.size]);

  const handleProjectSelect = useCallback((id: string) => {
    navigate(`/projects/${id}`);
  }, [navigate]);

  const handleProjectEdit = useCallback((id: string) => {
    navigate(`/projects/edit/${id}`);
  }, [navigate]);

  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });

  /* ── Export Handlers ── */
  const getExportData = useCallback(() => {
    return filtered.map(p => ({
      name: p.name,
      category: p.categoryName || '-',
      status: p.status,
      region: p.region || '-',
      budget: p.budget || 0,
      progress: p.progress || 0,
      startDate: p.startDate || '-',
      endDate: p.endDate || '-',
    }));
  }, [filtered]);

  const handleExportExcel = useCallback(() => {
    exportToExcel(getExportData(), {
      filename: 'projects_list',
      title: 'قائمة المشاريع',
      subtitle: `إجمالي: ${filtered.length} مشروع`,
      columns: reportColumns.projects,
    });
  }, [getExportData, filtered.length]);

  const handleExportPDF = useCallback(() => {
    const total = filtered.length;
    const active = filtered.filter(p => p.status === 'active').length;
    const completed = filtered.filter(p => p.status === 'completed').length;
    const budget = filtered.reduce((s, p) => s + (p.budget || 0), 0);
    const statusMap: Record<string, number> = {};
    filtered.forEach(p => { statusMap[p.status] = (statusMap[p.status] || 0) + 1; });
    const statusColors: Record<string, string> = { active: '#38bdf8', completed: '#34d399', planning: '#E91E63', on_hold: '#fbbf24' };
    generateProjectsListPDF({
      kpis: [
        { label: 'Total Projects', value: total, format: 'number' },
        { label: 'Active', value: active, format: 'number' },
        { label: 'Completed', value: completed, format: 'number' },
        { label: 'Budget', value: budget, format: 'currency' },
      ],
      projects: filtered.map(p => ({
        name: p.name,
        category: p.categoryName || '-',
        status: p.status,
        region: p.region || '-',
        budget: p.budget || 0,
        progress: p.progress || 0,
        startDate: p.startDate || '-',
        endDate: p.endDate || '-',
      })),
      statusDistribution: Object.entries(statusMap).map(([name, value]) => ({
        name, value, color: statusColors[name] || '#94a3b8',
      })),
    });
  }, [filtered]);

  const handlePrint = useCallback(() => {
    printTable(getExportData(), reportColumns.projects, 'قائمة المشاريع - Projects List');
  }, [getExportData]);

  const handleBulkExport = useCallback(() => {
    const selectedProjects = filtered.filter(p => selectedIds.has(p.id));
    const data = selectedProjects.map(p => ({
      name: p.name,
      category: p.categoryName || '-',
      status: p.status,
      region: p.region || '-',
      budget: p.budget || 0,
      progress: p.progress || 0,
      startDate: p.startDate || '-',
      endDate: p.endDate || '-',
    }));
    exportToExcel(data, {
      filename: 'selected_projects',
      title: 'المشاريع المحددة',
      subtitle: `${selectedProjects.length} مشروع محدد`,
      columns: reportColumns.projects,
    });
  }, [filtered, selectedIds]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#080805' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ background: P.bg, fontFamily: 'Inter, sans-serif' }}>
      <div className="fixed inset-0 pointer-events-none opacity-[0.018]" style={{ backgroundImage: `radial-gradient(${P.accent} 0.5px, transparent 0.5px)`, backgroundSize: '24px 24px' }} />

      <div className="relative px-6 py-5 space-y-5 max-w-[1600px] mx-auto">
        {/* ═══ Header ═══ */}
        <motion.div ref={heroRef} initial={{ opacity: 0, y: 10 }} animate={heroInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-black leading-tight flex items-center gap-3" style={{ color: P.textHi, fontFamily: 'Playfair Display, serif' }}>
              <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: `${P.accent}15`, border: `1px solid ${P.accent}30` }}>
                <FolderKanban size={17} style={{ color: P.accent }} />
              </div>
              Projects
            </h1>
            <p className="mt-1 text-xs" style={{ color: P.textLo }}>Manage and track all CSR projects across regions</p>
          </div>
          <div className="flex items-center gap-2.5">
            <motion.button
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.96 }}
              className="relative flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-black tracking-wide transition-all duration-300 overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${P.accent}, ${P.accent}dd)`, color: P.bg, boxShadow: `0 4px 20px ${P.accent}40, inset 0 1px 0 rgba(255,255,255,0.15)`, textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}
              onClick={() => navigate('/projects/add')}>
              <span className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
              <Plus size={14} className="relative z-10" /><span className="relative z-10">New Project</span>
            </motion.button>
            <div className="flex items-center rounded-full overflow-hidden" style={{ border: `1px solid ${P.border}`, background: P.surface }}>
              <button 
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 hover:brightness-125 active:scale-[0.97]" 
                style={{ color: '#34d399', borderRight: `1px solid ${P.border}` }}>
                <FileSpreadsheet size={13} />Excel
              </button>
              <button 
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 hover:brightness-125 active:scale-[0.97]" 
                style={{ color: '#f87171', borderRight: `1px solid ${P.border}` }}>
                <FileText size={13} />PDF
              </button>
              <button 
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 hover:brightness-125 active:scale-[0.97]" 
                style={{ color: P.textMd }}>
                <Printer size={13} />Print
              </button>
            </div>
          </div>
        </motion.div>

        {/* ═══ KPI Bar ═══ */}
        <KpiBar projects={allProjects} />

        {/* ═══ Search + View Toggle ═══ */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 flex items-center gap-2 max-w-xl">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: P.textLo }} />
              <input type="text" placeholder="Search projects by name, category, location, tags..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="w-full pl-10 pr-4 py-2.5 rounded-full text-xs outline-none transition-all duration-300" style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi }} onFocus={e => (e.currentTarget.style.borderColor = `${P.accent}60`)} onBlur={e => (e.currentTarget.style.borderColor = P.border)} />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: P.textLo }}><X size={12} /></button>}
            </div>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setFiltersOpen(!filtersOpen)} className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold tracking-wide transition-all duration-300" style={{ background: filtersOpen ? `linear-gradient(135deg, ${P.accent}20, ${P.accent}08)` : P.surface, color: filtersOpen ? P.accent : P.textMd, border: `1.5px solid ${filtersOpen ? P.accent + '50' : P.border}`, boxShadow: filtersOpen ? `0 0 16px ${P.accent}15, inset 0 0 12px ${P.accent}08` : 'none' }}>
              <SlidersHorizontal size={13} />Filters
              {(filters.status.length + filters.category.length + filters.region.length) > 0 && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: P.accent, color: P.bg }}>{filters.status.length + filters.category.length + filters.region.length}</span>
              )}
            </motion.button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} className="px-2.5 py-2 rounded-full text-[11px] outline-none cursor-pointer" style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textMd }}>
                <option value="name">Name</option>
                <option value="budget">Budget</option>
                <option value="progress">Progress</option>
                <option value="endDate">Due Date</option>
                <option value="risk">Risk</option>
              </select>
              <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} className="p-2 rounded-xl transition-colors" style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textMd }}>
                {sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>
            <div className="flex items-center gap-0.5 p-1 rounded-full" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
              {([{ key: 'grid' as const, icon: LayoutGrid }, { key: 'table' as const, icon: Table2 }, { key: 'map' as const, icon: MapPin }]).map(v => (
                <button key={v.key} onClick={() => setViewMode(v.key)} className="relative h-8 w-8 flex items-center justify-center rounded-full transition-all duration-300" style={{ background: viewMode === v.key ? `${P.accent}20` : 'transparent', color: viewMode === v.key ? P.accent : P.textLo, boxShadow: viewMode === v.key ? `0 2px 8px ${P.accent}20, inset 0 0 8px ${P.accent}10` : 'none' }}>
                  <v.icon size={14} />
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ═══ Content Area ═══ */}
        <div className="flex gap-5">
          <FilterPanel filters={filters} onChange={f => { setFilters(f); setPage(1); }} onReset={() => { setFilters(defaultFilters); setPage(1); }} onClose={() => setFiltersOpen(false)} isOpen={filtersOpen} categoryList={categoryList} />

          <div className="flex-1 min-w-0">
            <BulkActionsBar count={selectedIds.size} onClear={() => setSelectedIds(new Set())} onExport={handleBulkExport} />

            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px]" style={{ color: P.textLo }}>
                {totalCount} project{totalCount !== 1 ? 's' : ''} found
                {search && <> matching "<strong style={{ color: P.textMd }}>{search}</strong>"</>}
              </span>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                variant={search.trim() || Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : false) ? 'search' : 'filter'}
                title={search.trim() ? 'No projects found' : 'No projects match filters'}
                message={search.trim() ? `No projects match "${search}". Try a different search term.` : 'Try adjusting your filter criteria or reset all filters.'}
                actionLabel="Clear Filters"
                onAction={() => { setSearch(''); setFilters(defaultFilters); }}
              />
            ) : null}

            {viewMode === 'grid' && filtered.length > 0 && (
              <AnimatePresence mode="wait">
                <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {paginated.map((p, i) => <ProjectCard key={p.id} project={p} index={i} onSelect={handleProjectSelect} onEdit={handleProjectEdit} />)}
                </motion.div>
              </AnimatePresence>
            )}

            {viewMode === 'table' && filtered.length > 0 && (
              <AnimatePresence mode="wait">
                <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <GlassCard>
                    <div className="overflow-x-auto">
                      <table className="w-full" style={{ fontFamily: 'Inter, sans-serif' }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${P.border}` }}>
                            <th className="px-4 py-3.5 text-left w-8">
                              <input type="checkbox" checked={selectedIds.size === paginated.length && paginated.length > 0} onChange={toggleSelectAll} className="h-3.5 w-3.5 rounded cursor-pointer" style={{ accentColor: P.accent }} />
                            </th>
                            {['Project', 'Category', 'Status', 'Budget', 'Progress', 'Due', 'Risk', ''].map(h => (
                              <th key={h} className="px-4 py-3.5 text-left text-[10px] font-semibold tracking-[0.14em] uppercase whitespace-nowrap" style={{ color: P.textLo }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paginated.map((p, i) => <ProjectTableRow key={p.id} project={p} index={i} selected={selectedIds.has(p.id)} onToggle={() => toggleSelect(p.id)} onSelect={handleProjectSelect} onEdit={handleProjectEdit} />)}
                        </tbody>
                      </table>
                    </div>
                  </GlassCard>
                </motion.div>
              </AnimatePresence>
            )}

            {viewMode === 'map' && filtered.length > 0 && (
              <AnimatePresence mode="wait">
                <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <GlassCard className="p-0 overflow-hidden">
                    {/* Map Header */}
                    <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${P.border}` }}>
                      <div className="flex items-center gap-2">
                        <MapPinned size={14} style={{ color: '#a78bfa' }} />
                        <span className="text-xs font-bold" style={{ color: P.textHi }}>Project Locations</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa' }}>{filtered.length} projects</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {Object.entries(statusColors).slice(0, 4).map(([s, c]) => (
                          <div key={s} className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ background: c }} />
                            <span className="text-[9px] capitalize" style={{ color: P.textLo }}>{s.replace('_', ' ')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Leaflet Map */}
                    <div style={{ height: 380 }}>
                      <MapContainer
                        center={[21.4735, 55.9754]}
                        zoom={6}
                        style={{ height: '100%', width: '100%', background: P.bg }}
                        zoomControl={false}
                        attributionControl={false}
                        maxBounds={[[16.6, 51.8], [26.5, 60.0]]}
                        maxBoundsViscosity={1.0}
                        minZoom={5}
                        maxZoom={10}
                      >
                        <TileLayer url={isDark ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"} />
                        <FitBounds coords={filtered.map(p => regionCoords[p.region || ''] || [21.47, 55.97])} />
                        {filtered.map(p => {
                          const coords = p.latitude && p.longitude
                            ? [p.latitude, p.longitude] as [number, number]
                            : regionCoords[p.region || ''];
                          if (!coords) return null;
                          const sc = statusCfg[p.status];
                          const color = sc?.dot || '#E91E63';
                          return (
                            <CircleMarker
                              key={p.id}
                              center={[coords[0], coords[1]]}
                              radius={Math.max(6, Math.min(14, (p.budget || 100000) / 40000))}
                              pathOptions={{ color, fillColor: color, fillOpacity: 0.35, weight: 2, opacity: 0.8 }}
                            >
                              <Popup>
                                <div style={{ minWidth: 200, fontFamily: 'Inter, sans-serif', padding: 4 }}>
                                  <p style={{ fontWeight: 700, fontSize: 13, color: P.textHi, marginBottom: 4 }}>{p.name}</p>
                                  <div style={{ display: 'flex', gap: 8, fontSize: 11, color: P.textMd, marginBottom: 6 }}>
                                    <span>{p.categoryName}</span>
                                    <span>•</span>
                                    <span style={{ color }}>{sc?.label}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9CA3AF' }}>
                                    <span>Budget: {((p.budget || 0) / 1000).toFixed(0)}K OMR</span>
                                    <span>Progress: {p.progress}%</span>
                                  </div>
                                  <div style={{ height: 4, borderRadius: 4, background: P.border, marginTop: 6 }}>
                                    <div style={{ height: '100%', borderRadius: 4, width: `${p.progress}%`, background: color }} />
                                  </div>
                                </div>
                              </Popup>
                            </CircleMarker>
                          );
                        })}
                      </MapContainer>
                    </div>
                    {/* Region Stats Footer */}
                    <div className="flex items-center gap-3 px-5 py-3 overflow-x-auto" style={{ borderTop: `1px solid ${P.border}` }}>
                      {[...new Set(filtered.map(p => p.region).filter(Boolean))].map(r => (
                        <div key={r} className="flex items-center gap-2 px-3 py-1.5 rounded-lg shrink-0" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                          <MapPin size={10} style={{ color: '#a78bfa' }} />
                          <span className="text-[10px] font-bold" style={{ color: P.textHi }}>{filtered.filter(p => p.region === r).length}</span>
                          <span className="text-[10px]" style={{ color: P.textLo }}>{r}</span>
                        </div>
                      ))}
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
    </div>
  );
}
