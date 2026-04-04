import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart as RechartsBar, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
} from 'recharts';
import {
  Edit3, Trash2, Share2, Download, Printer, BookmarkPlus, AlertTriangle,
  MapPin, Calendar, Wallet, Users, Target, Star, Clock, CheckCircle2,
  Activity, Pause, Archive, ChevronRight, FileText, Image,
  Upload, MessageSquare, History, Eye, ExternalLink,
  Building2, Tag, Zap,
  Camera, File, Paperclip, Award, Plus, ArrowRight, TrendingUp, TrendingDown,
  Globe, Heart, UserCheck, Baby, Accessibility, Play, UserPlus, X,
} from 'lucide-react';
import { cn } from '../utils/cn.ts';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useToast } from '../components/common/Toast';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { projectService } from '../services/projectService';
import { expenseService } from '../services/expenseService';
import { reviewService } from '../services/reviewService';
import { uploadService } from '../services/uploadService';
import type {
  Project, ProjectStatus, RiskLevel, MilestoneStatus, ProjectExpense, ProjectMilestone,
} from '../types/project.types';

// ─── Palette ──────────────────────────────────────────────────────────────────


const statusCfg: Record<ProjectStatus, { label: string; icon: React.ElementType; dot: string; bg: string; text: string }> = {
  planning:  { label: 'Planning',  icon: Clock,        dot: '#E91E63', bg: 'rgba(233,30,99,0.1)',   text: '#F48FB1' },
  active:    { label: 'Active',    icon: Activity,     dot: '#38bdf8', bg: 'rgba(56,189,248,0.1)',   text: '#7dd3fc' },
  on_hold:   { label: 'On Hold',   icon: Pause,        dot: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   text: '#fde68a' },
  completed: { label: 'Completed', icon: CheckCircle2, dot: '#34d399', bg: 'rgba(52,211,153,0.1)',   text: '#6ee7b7' },
  archived:  { label: 'Archived',  icon: Archive,      dot: '#9CA3AF', bg: 'rgba(156,163,175,0.1)',   text: '#4B5563' },
};
const riskCfg: Record<RiskLevel, { color: string; bg: string; text: string; label: string }> = {
  low:      { color: '#34d399', bg: 'rgba(52,211,153,0.1)',  text: '#6ee7b7', label: 'Low Risk' },
  medium:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  text: '#fde68a', label: 'Medium Risk' },
  high:     { color: '#fb923c', bg: 'rgba(251,146,60,0.1)',  text: '#fdba74', label: 'High Risk' },
  critical: { color: '#f87171', bg: 'rgba(248,113,113,0.1)', text: '#fca5a5', label: 'Critical Risk' },
};
const milestoneCfg: Record<MilestoneStatus, { icon: string; color: string; bg: string }> = {
  completed:   { icon: '✅', color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  in_progress: { icon: '🔄', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
  pending:     { icon: '⏳', color: '#9CA3AF', bg: 'rgba(156,163,175,0.1)' },
};

// ─── Framer Variants ──────────────────────────────────────────────────────────
const fadeUp = { hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } } };
const stagger = (delay = 0) => ({ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay } } });

// ─── GlassCard ────────────────────────────────────────────────────────────────
function GlassCard({ children, className, glow, accent, style: extra }: { children: React.ReactNode; className?: string; glow?: string; accent?: string; style?: React.CSSProperties }) {
  const { colors: P } = useTheme();
  return (
    <div className={cn('relative rounded-[20px]', className)} style={{
      background: `${P.card}`, border: `1px solid ${P.border}`,
      boxShadow: [`inset 0 1px 0 0 ${P.borderHi}40`, glow ? `0 0 60px ${glow}` : '', '0 12px 40px rgba(0,0,0,0.05)', '0 2px 8px rgba(0,0,0,0.03)'].filter(Boolean).join(', '), ...extra,
    }}>
      {accent && <div className="absolute top-3 right-3 w-2 h-2 rounded-full" style={{ background: accent, boxShadow: `0 0 12px ${accent}80` }} />}
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${P.borderHi}90, transparent)` }} />
      {children}
    </div>
  );
}

function Tip({ active, payload, label, suffix = '' }: { active?: boolean; payload?: readonly { name?: string; value?: number; color?: string }[]; label?: string | number; suffix?: string }) {
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

// ─── Tabs Type ────────────────────────────────────────────────────────────────
type TabKey = 'overview' | 'timeline' | 'budget' | 'media' | 'reviews';
const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Overview', icon: Eye },
  { key: 'timeline', label: 'Timeline', icon: Clock },
  { key: 'budget',   label: 'Budget & Beneficiaries', icon: Wallet },
  { key: 'media',    label: 'Media & Documents', icon: Image },
  { key: 'reviews',  label: 'Reviews & Log', icon: MessageSquare },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1: OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════════
function OverviewTab({ project }: { project: Project }) {
  const { colors: P } = useTheme();
  const p = project;
  const budgetPct = p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0;
  const remaining = p.budget - p.spent;
  const daysLeft = Math.max(0, Math.ceil((new Date(p.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const totalDays = Math.ceil((new Date(p.endDate).getTime() - new Date(p.startDate).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-6">
      {/* ── Completion Summary ── */}
      {p.status === 'completed' && (
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <GlassCard className="p-6" glow={remaining >= 0 ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)'}>
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{
                background: remaining >= 0 ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                border: `1px solid ${remaining >= 0 ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}`,
              }}>
                <CheckCircle2 size={22} style={{ color: '#34d399' }} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black mb-1" style={{ color: P.textHi, fontFamily: 'Playfair Display, serif' }}>
                  Project Completed
                </h3>
                <p className="text-[11px] mb-4" style={{ color: P.textLo }}>
                  This project has been completed. Here is the final financial summary.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Budget', value: `OMR ${p.budget.toLocaleString()}`, color: P.textHi, sub: 'Allocated' },
                    { label: 'Spent', value: `OMR ${p.spent.toLocaleString()}`, color: budgetPct > 100 ? '#f87171' : '#fbbf24', sub: `${budgetPct}% of budget` },
                    { label: remaining >= 0 ? 'Surplus' : 'Deficit', value: `OMR ${Math.abs(remaining).toLocaleString()}`, color: remaining >= 0 ? '#34d399' : '#f87171', sub: remaining >= 0 ? 'Saved' : 'Over budget' },
                    { label: 'Beneficiaries', value: (p.beneficiaryCount || 0).toLocaleString(), color: '#a78bfa', sub: 'People reached' },
                  ].map((c) => (
                    <div key={c.label} className="p-3 rounded-xl text-center" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                      <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>{c.label}</p>
                      <p className="text-base font-black tabular-nums mt-1" style={{ color: c.color }}>{c.value}</p>
                      <p className="text-[9px] mt-0.5" style={{ color: P.textLo }}>{c.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* 4 Info Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { title: 'General Info', icon: Building2, color: '#38bdf8', items: [
            { l: 'Category', v: p.categoryName || '—' },
            { l: 'Manager', v: p.managerName || '—' },
            { l: 'Region', v: p.region || '—' },
            { l: 'Location', v: p.location },
          ]},
          { title: 'Dates', icon: Calendar, color: '#E91E63', items: [
            { l: 'Start', v: p.startDate },
            { l: 'End', v: p.endDate },
            { l: 'Duration', v: `${totalDays} days` },
            { l: 'Days Left', v: `${daysLeft} days` },
          ]},
          { title: 'Budget', icon: Wallet, color: '#fbbf24', items: [
            { l: 'Total', v: `OMR ${(p.budget / 1000).toFixed(0)}k` },
            { l: 'Spent', v: `OMR ${(p.spent / 1000).toFixed(0)}k` },
            { l: 'Remaining', v: `OMR ${((p.budget - p.spent) / 1000).toFixed(0)}k` },
            { l: 'Utilization', v: `${budgetPct}%` },
          ]},
          { title: 'Beneficiaries', icon: Users, color: '#a78bfa', items: [
            { l: 'Total', v: (p.beneficiaryCount || 0).toLocaleString() },
            { l: 'Male', v: (p.beneficiaries?.male || 0).toLocaleString() },
            { l: 'Female', v: (p.beneficiaries?.female || 0).toLocaleString() },
            { l: 'Children', v: (p.beneficiaries?.children || 0).toLocaleString() },
          ]},
        ].map((card, ci) => (
          <motion.div key={card.title} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: ci * 0.08 }}>
            <GlassCard className="p-5 h-full">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-full flex items-center justify-center" style={{ background: `${card.color}15`, border: `1px solid ${card.color}25` }}>
                  <card.icon size={13} style={{ color: card.color }} />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: P.textLo }}>{card.title}</h4>
              </div>
              <div className="space-y-2.5">
                {card.items.map(item => (
                  <div key={item.l} className="flex justify-between">
                    <span className="text-[11px]" style={{ color: P.textLo }}>{item.l}</span>
                    <span className="text-[11px] font-semibold" style={{ color: P.textHi }}>{item.v}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Description */}
      <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <GlassCard className="p-6">
          <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: P.textHi, fontFamily: 'Playfair Display, serif' }}>
            <FileText size={14} style={{ color: P.accent }} /> Project Description
          </h4>
          <p className="text-xs leading-relaxed" style={{ color: P.textMd }}>{p.description}</p>
        </GlassCard>
      </motion.div>

      {/* Objectives + Expected Outputs */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1 }}>
          <GlassCard className="p-6 h-full">
            <h4 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: P.textHi, fontFamily: 'Playfair Display, serif' }}>
              <Target size={14} style={{ color: '#38bdf8' }} /> Objectives
            </h4>
            <ol className="space-y-2.5">
              {(p.objectives || []).map((obj, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black mt-0.5" style={{ background: `${P.accent}15`, color: P.accent, border: `1px solid ${P.accent}25` }}>{i + 1}</span>
                  <span className="text-xs leading-relaxed" style={{ color: P.textMd }}>{obj}</span>
                </li>
              ))}
            </ol>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.15 }}>
          <GlassCard className="p-6 h-full">
            <h4 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: P.textHi, fontFamily: 'Playfair Display, serif' }}>
              <CheckCircle2 size={14} style={{ color: '#34d399' }} /> Expected Outputs
            </h4>
            <ul className="space-y-2.5">
              {(p.expectedOutputs || []).map((out, i) => (
                <li key={i} className="flex gap-3">
                  <div className="flex-shrink-0 h-1.5 w-1.5 rounded-full mt-1.5" style={{ background: '#34d399' }} />
                  <span className="text-xs leading-relaxed" style={{ color: P.textMd }}>{out}</span>
                </li>
              ))}
            </ul>
          </GlassCard>
        </motion.div>
      </div>

      {/* SDG Goals */}
      {p.sdgGoals && p.sdgGoals.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <GlassCard className="p-6">
            <h4 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: P.textHi, fontFamily: 'Playfair Display, serif' }}>
              <Globe size={14} style={{ color: '#a78bfa' }} /> SDG Alignment
            </h4>
            <div className="flex flex-wrap gap-3">
              {p.sdgGoals.map(g => (
                <div key={g} className="flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}>
                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-black" style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}>
                    {g}
                  </div>
                  <span className="text-[11px] font-medium" style={{ color: P.textMd }}>SDG {g}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Map Placeholder */}
      <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <GlassCard className="p-6">
          <h4 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: P.textHi, fontFamily: 'Playfair Display, serif' }}>
            <MapPin size={14} style={{ color: '#f87171' }} /> Location
          </h4>
          <div className="h-48 rounded-xl flex items-center justify-center" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
            <div className="text-center">
              <MapPin size={24} style={{ color: P.textLo }} className="mx-auto mb-2" />
              <p className="text-xs" style={{ color: P.textMd }}>{p.location}</p>
              <p className="text-[10px] mt-1" style={{ color: P.textLo }}>
                {p.latitude && p.longitude ? `${p.latitude}°N, ${p.longitude}°E` : 'Coordinates not available'}
              </p>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2: TIMELINE
// ═══════════════════════════════════════════════════════════════════════════════
function TimelineTab({ project }: { project: Project }) {
  const { colors: P } = useTheme();
  const [milestoneModal, setMilestoneModal] = useState<{ mode: 'add' | 'edit'; milestone?: ProjectMilestone } | null>(null);
  const [deleteMilestoneId, setDeleteMilestoneId] = useState<string | null>(null);
  const [localMilestones, setLocalMilestones] = useState(project.milestones || []);
  const toast = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    setLocalMilestones(project.milestones || []);
  }, [project.milestones]);

  const addMilestoneMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => projectService.addMilestone(project.id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['project', project.id] }); },
  });
  const updateMilestoneMutation = useMutation({
    mutationFn: ({ milestoneId, data }: { milestoneId: string; data: Record<string, unknown> }) =>
      projectService.updateMilestone(project.id, milestoneId, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['project', project.id] }); },
  });
  const deleteMilestoneMutation = useMutation({
    mutationFn: (milestoneId: string) => projectService.deleteMilestone(project.id, milestoneId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['project', project.id] }); },
  });

  return (
    <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <GlassCard className="p-6">
        {/* Header with Add button */}
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: P.textHi, fontFamily: 'Playfair Display, serif' }}>
            <Clock size={14} style={{ color: P.accent }} /> Project Timeline
          </h4>
          <button
            onClick={() => setMilestoneModal({ mode: 'add' })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium"
            style={{ background: `${P.accent}15`, color: P.accent, border: `1px solid ${P.accent}30` }}
          >
            <Plus size={11} /> Add Milestone
          </button>
        </div>

        <div className="relative pl-8">
          {/* Vertical line */}
          <div className="absolute left-3 top-0 bottom-0 w-px" style={{ background: `linear-gradient(to bottom, ${P.accent}60, ${P.border})` }} />
          <div className="space-y-8">
            {localMilestones.map((m, i) => {
              const cfg = milestoneCfg[m.status];
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.1, duration: 0.4 }}
                  className="relative"
                >
                  {/* Node */}
                  <div className="absolute -left-8 h-7 w-7 flex items-center justify-center rounded-full text-sm" style={{ background: P.card, border: `2px solid ${cfg.color}`, boxShadow: `0 0 12px ${cfg.color}30` }}>
                    {cfg.icon}
                  </div>

                  <div className="ml-2">
                    {/* Date + Status */}
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-[10px] font-mono tabular-nums" style={{ color: P.textLo }}>{m.date}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize" style={{ background: cfg.bg, color: cfg.color }}>
                        {m.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Title + Description */}
                    <h5 className="text-sm font-bold mb-1" style={{ color: P.textHi }}>{m.title}</h5>
                    <p className="text-xs leading-relaxed mb-2" style={{ color: P.textMd }}>{m.description}</p>

                    {/* Attachments */}
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {m.attachments.map((a: string) => (
                          <span key={a} className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px]" style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textMd }}>
                            <Paperclip size={9} /> {a}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Edit / Delete actions */}
                    <div className="flex items-center gap-1 mt-2">
                      <button
                        onClick={() => setMilestoneModal({ mode: 'edit', milestone: m })}
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium hover:bg-white/5 transition-colors"
                        style={{ color: P.textLo }}
                      >
                        <Edit3 size={10} /> Edit
                      </button>
                      <button
                        onClick={() => setDeleteMilestoneId(m.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium hover:bg-white/5 transition-colors"
                        style={{ color: '#f87171' }}
                      >
                        <Trash2 size={10} /> Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </GlassCard>

      {/* ─── Milestone Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {milestoneModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200]"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setMilestoneModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[500px] max-w-[90vw] rounded-2xl"
              style={{ background: P.card, border: `1px solid ${P.border}`, boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
            >
              <div className="p-5" style={{ borderBottom: `1px solid ${P.border}` }}>
                <h3 className="text-base font-bold" style={{ color: P.textHi }}>
                  {milestoneModal.mode === 'add' ? 'Add Milestone' : 'Edit Milestone'}
                </h3>
              </div>
              <form
                onSubmit={(ev) => {
                  ev.preventDefault();
                  const fd = new FormData(ev.currentTarget);
                  const payload: Record<string, unknown> = {
                    title: fd.get('title') as string,
                    description: fd.get('description') as string,
                    date: fd.get('date') as string,
                    status: fd.get('status') as MilestoneStatus,
                  };
                  if (milestoneModal.mode === 'add') {
                    addMilestoneMutation.mutate(payload, {
                      onSuccess: (response: any) => {
                        setLocalMilestones(prev => [...prev, response.data as ProjectMilestone]);
                        toast.success('Milestone Added', 'New milestone has been created.');
                      },
                      onError: () => {
                        toast.error('Error', 'Failed to add milestone. Please try again.');
                      },
                    });
                  } else {
                    const milestoneId = milestoneModal.milestone!.id;
                    updateMilestoneMutation.mutate({ milestoneId, data: payload }, {
                      onSuccess: (response: any) => {
                        setLocalMilestones(prev => prev.map(ms => ms.id === milestoneId ? response.data as ProjectMilestone : ms));
                        toast.success('Milestone Updated', 'Milestone has been updated.');
                      },
                      onError: () => {
                        toast.error('Error', 'Failed to update milestone. Please try again.');
                      },
                    });
                  }
                  setMilestoneModal(null);
                }}
                className="p-5 space-y-4"
              >
                {/* Title */}
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5" style={{ color: P.textLo }}>Title</label>
                  <input
                    name="title"
                    defaultValue={milestoneModal.milestone?.title || ''}
                    required
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi }}
                    placeholder="Milestone title..."
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5" style={{ color: P.textLo }}>Description</label>
                  <textarea
                    name="description"
                    defaultValue={milestoneModal.milestone?.description || ''}
                    rows={3}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                    style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi }}
                    placeholder="Describe this milestone..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Date */}
                  <div>
                    <label className="block text-[11px] font-semibold mb-1.5" style={{ color: P.textLo }}>Date</label>
                    <input
                      name="date"
                      type="date"
                      defaultValue={milestoneModal.milestone?.date || new Date().toISOString().slice(0, 10)}
                      required
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                      style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi }}
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-[11px] font-semibold mb-1.5" style={{ color: P.textLo }}>Status</label>
                    <select
                      name="status"
                      defaultValue={milestoneModal.milestone?.status || 'pending'}
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                      style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi }}
                    >
                      <option value="completed">Completed</option>
                      <option value="in_progress">In Progress</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setMilestoneModal(null)}
                    className="px-4 py-2 rounded-full text-sm font-medium"
                    style={{ color: P.textMd, border: `1px solid ${P.border}` }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full text-sm font-semibold"
                    style={{ background: '#C9C036', color: '#080805' }}
                  >
                    {milestoneModal.mode === 'add' ? 'Add Milestone' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Delete Confirm Dialog ───────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteMilestoneId}
        onClose={() => setDeleteMilestoneId(null)}
        onConfirm={() => {
          if (!deleteMilestoneId) return;
          deleteMilestoneMutation.mutate(deleteMilestoneId, {
            onSuccess: () => {
              setLocalMilestones(prev => prev.filter(ms => ms.id !== deleteMilestoneId));
              toast.success('Milestone Deleted', 'The milestone has been removed.');
              setDeleteMilestoneId(null);
            },
            onError: () => {
              toast.error('Error', 'Failed to delete milestone. Please try again.');
            },
          });
        }}
        title="Delete Milestone"
        message="Are you sure you want to delete this milestone? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3: BUDGET & BENEFICIARIES
// ═══════════════════════════════════════════════════════════════════════════════
function BudgetTab({ project }: { project: Project }) {
  const { colors: P } = useTheme();
  const p = project;
  const expenses = useMemo(() => p.expenses || [], [p.expenses]);
  const bene = p.beneficiaries;

  const [expenseModal, setExpenseModal] = useState<{ mode: 'add' | 'edit'; expense?: ProjectExpense } | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [localExpenses, setLocalExpenses] = useState(expenses);
  const toast = useToast();
  const queryClient = useQueryClient();
  const normalizeExpense = (expense: ProjectExpense) => ({
    ...expense,
    date: expense.date ? expense.date.slice(0, 10) : '',
  });

  useEffect(() => {
    setLocalExpenses(expenses);
  }, [expenses]);

  const addExpenseMutation = useMutation({
    mutationFn: (expenseData: Record<string, unknown>) => expenseService.createExpense(project.id, expenseData as any),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['project', project.id] }); },
  });
  const updateExpenseMutation = useMutation({
    mutationFn: ({ expenseId, data }: { expenseId: string; data: Record<string, unknown> }) =>
      expenseService.updateExpense(project.id, expenseId, data as any),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['project', project.id] }); },
  });
  const deleteExpenseMutation = useMutation({
    mutationFn: (expenseId: string) => expenseService.deleteExpense(project.id, expenseId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['project', project.id] }); },
  });

  // Derive spent total from localExpenses so KPI cards update when expenses are added/edited/deleted
  const localSpent = useMemo(() => localExpenses.reduce((sum, e) => sum + (e.amount || 0), 0), [localExpenses]);
  const budgetPct = (p.budget || 0) > 0 ? Math.round((localSpent / (p.budget || 1)) * 100) : 0;

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    // Use localExpenses (not the static prop) so the pie chart reacts to CRUD operations
    localExpenses.forEach(e => map.set(e.category, (map.get(e.category) || 0) + e.amount));
    const colors = ['#E91E63', '#38bdf8', '#34d399', '#fbbf24', '#a78bfa', '#f87171', '#fb923c'];
    return Array.from(map.entries()).map(([name, value], i) => ({ name, value, color: colors[i % colors.length] }));
  }, [localExpenses]);

  const ageData = useMemo(() => bene?.ageGroups?.map(g => ({ name: g.group, count: g.count })) || [], [bene]);

  return (
    <div className="space-y-6">
      {/* ─── Budget Section ──────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: P.textHi, fontFamily: 'Playfair Display, serif' }}>
          <Wallet size={14} style={{ color: '#fbbf24' }} /> Budget Overview
        </h4>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-5">
          {[
            { label: 'Total Budget', value: `OMR ${(p.budget || 0).toLocaleString()}`, color: '#E91E63', sub: 'Allocated' },
            // localSpent replaces p.spent so the card updates when expenses are added/edited/deleted
            { label: 'Spent', value: `OMR ${localSpent.toLocaleString()}`, color: budgetPct > 85 ? '#f87171' : '#fbbf24', sub: `${budgetPct}% utilized` },
            { label: 'Remaining', value: `OMR ${((p.budget || 0) - localSpent).toLocaleString()}`, color: '#34d399', sub: `${100 - budgetPct}% available` },
          ].map((c, i) => (
            <motion.div key={c.label} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: i * 0.08 }}>
              <GlassCard className="p-5">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: P.textLo }}>{c.label}</p>
                <p className="text-xl font-black tabular-nums" style={{ color: c.color }}>{c.value}</p>
                <p className="text-[10px] mt-1" style={{ color: P.textLo }}>{c.sub}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* Chart + Table */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <GlassCard className="p-5">
              <h5 className="text-xs font-bold mb-3" style={{ color: P.textHi }}>Expense Distribution</h5>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expenseByCategory} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                      {expenseByCategory.map((c, i) => <Cell key={i} fill={c.color} stroke={P.card} strokeWidth={3} />)}
                    </Pie>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <RechartsTooltip content={(p: any) => <Tip {...p} suffix=" OMR" />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-1.5">
                {expenseByCategory.map(c => (
                  <div key={c.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                      <span className="text-[11px]" style={{ color: P.textMd }}>{c.name}</span>
                    </div>
                    <span className="text-[11px] font-bold tabular-nums" style={{ color: P.textHi }}>{(c.value || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1 }}>
            <GlassCard>
              <div className="p-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${P.border}` }}>
                <h5 className="text-xs font-bold" style={{ color: P.textHi }}>Expense Records</h5>
                <button onClick={() => setExpenseModal({ mode: 'add' })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium" style={{ background: `${P.accent}15`, color: P.accent, border: `1px solid ${P.accent}30` }}>
                  <Plus size={11} /> Add Expense
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${P.border}` }}>
                      {['Category', 'Description', 'Amount', 'Date', 'Approved By', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: P.textLo }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {localExpenses.map((e, i) => (
                      <motion.tr key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 * i }} style={{ borderBottom: `1px solid ${P.border}60` }}>
                        <td className="px-4 py-3 text-[11px] whitespace-nowrap" style={{ color: P.textMd }}>{e.category}</td>
                        <td className="px-4 py-3 text-[11px]" style={{ color: P.textMd }}>{e.description}</td>
                        <td className="px-4 py-3 text-[11px] font-bold tabular-nums whitespace-nowrap" style={{ color: P.textHi }}>OMR {(e.amount || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-[11px] whitespace-nowrap" style={{ color: P.textLo }}>{e.date}</td>
                        <td className="px-4 py-3 text-[11px] whitespace-nowrap" style={{ color: P.textMd }}>{e.approvedBy || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize" style={{
                            background: e.status === 'approved' ? 'rgba(52,211,153,0.1)' : e.status === 'pending' ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)',
                            color: e.status === 'approved' ? '#6ee7b7' : e.status === 'pending' ? '#fde68a' : '#fca5a5',
                          }}>{e.status}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setExpenseModal({ mode: 'edit', expense: e })} className="p-1.5 rounded-full hover:bg-white/5 transition-colors" title="Edit">
                              <Edit3 size={12} style={{ color: P.textLo }} />
                            </button>
                            <button onClick={() => setDeleteExpenseId(e.id)} className="p-1.5 rounded-full hover:bg-white/5 transition-colors" title="Delete">
                              <Trash2 size={12} style={{ color: '#f87171' }} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>

      {/* ─── Beneficiaries Section ───────────────────────────────── */}
      {bene && (
        <div>
          <h4 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: P.textHi, fontFamily: 'Playfair Display, serif' }}>
            <Users size={14} style={{ color: '#a78bfa' }} /> Beneficiaries
          </h4>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-5">
            {[
              { label: 'Total', value: bene?.total || 0, icon: Users, color: '#a78bfa' },
              { label: 'Male', value: bene?.male || 0, icon: UserCheck, color: '#38bdf8' },
              { label: 'Female', value: bene?.female || 0, icon: Heart, color: '#f472b6' },
              { label: 'Children', value: bene?.children || 0, icon: Baby, color: '#34d399' },
              { label: 'Elderly', value: bene?.elderly || 0, icon: Award, color: '#fbbf24' },
              { label: 'Disabled', value: bene?.disabled || 0, icon: Accessibility, color: '#fb923c' },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: i * 0.05 }}>
                <GlassCard className="p-4 text-center">
                  <s.icon size={16} style={{ color: s.color }} className="mx-auto mb-2" />
                  <p className="text-lg font-black tabular-nums" style={{ color: P.textHi }}>{(s.value || 0).toLocaleString()}</p>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: P.textLo }}>{s.label}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Age Chart */}
            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <GlassCard className="p-5">
                <h5 className="text-xs font-bold mb-3" style={{ color: P.textHi }}>Age Distribution</h5>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBar data={ageData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gAge" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a78bfa" />
                          <stop offset="100%" stopColor="#3b0764" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={P.border} vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: P.textLo, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: P.textLo, fontSize: 10 }} axisLine={false} tickLine={false} />
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <RechartsTooltip content={(p: any) => <Tip {...p} />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                      <Bar dataKey="count" name="Count" fill="url(#gAge)" radius={[6, 6, 0, 0]} />
                    </RechartsBar>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </motion.div>

            {/* Description + Impact */}
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1 }}>
              <GlassCard className="p-5 h-full">
                <h5 className="text-xs font-bold mb-3" style={{ color: P.textHi }}>Target Group & Impact</h5>
                <p className="text-xs leading-relaxed mb-4" style={{ color: P.textMd }}>{bene.description}</p>
                <div className="p-3 rounded-xl mb-4" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
                  <p className="text-[11px] font-semibold mb-1" style={{ color: '#6ee7b7' }}>Impact Assessment</p>
                  <p className="text-xs leading-relaxed" style={{ color: P.textMd }}>{bene.impact}</p>
                </div>
                {bene.successStories && bene.successStories.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold mb-2" style={{ color: P.accent }}>Success Stories</p>
                    <div className="space-y-2">
                      {bene.successStories.map((s, i) => (
                        <div key={i} className="p-3 rounded-xl" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                          <p className="text-[11px] font-bold mb-1" style={{ color: P.textHi }}>{s.title}</p>
                          <p className="text-[11px] leading-relaxed" style={{ color: P.textMd }}>{s.story}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </div>
        </div>
      )}

      {/* ─── Expense Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {expenseModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200]" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setExpenseModal(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[500px] max-w-[90vw] rounded-2xl"
              style={{ background: P.card, border: `1px solid ${P.border}`, boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
            >
              <div className="p-5" style={{ borderBottom: `1px solid ${P.border}` }}>
                <h3 className="text-base font-bold" style={{ color: P.textHi }}>
                  {expenseModal.mode === 'add' ? 'Add Expense' : 'Edit Expense'}
                </h3>
              </div>
              <form onSubmit={(ev) => {
                ev.preventDefault();
                const fd = new FormData(ev.currentTarget);
                const data: ProjectExpense = {
                  id: expenseModal.expense?.id || `exp-${Date.now()}`,
                  category: fd.get('category') as string,
                  description: fd.get('description') as string,
                  amount: Number(fd.get('amount')),
                  date: fd.get('date') as string,
                  status: (fd.get('status') as string || 'pending') as ProjectExpense['status'],
                  approvedBy: expenseModal.expense?.approvedBy || '',
                };
                if (expenseModal.mode === 'add') {
                  addExpenseMutation.mutate(data, {
                    onSuccess: (response) => {
                      setLocalExpenses(prev => [...prev, normalizeExpense(response.data as ProjectExpense)]);
                      toast.success('Expense Added', 'New expense record has been created.');
                    },
                    onError: () => {
                      toast.error('Error', 'Failed to add expense. Please try again.');
                    },
                  });
                } else {
                  updateExpenseMutation.mutate({ expenseId: data.id, data }, {
                    onSuccess: (response) => {
                      setLocalExpenses(prev => prev.map(e => e.id === data.id ? normalizeExpense(response.data as ProjectExpense) : e));
                      toast.success('Expense Updated', 'Expense record has been updated.');
                    },
                    onError: () => {
                      toast.error('Error', 'Failed to update expense. Please try again.');
                    },
                  });
                }
                setExpenseModal(null);
              }} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1.5" style={{ color: P.textLo }}>Category</label>
                    <select name="category" defaultValue={expenseModal.expense?.category || ''} required className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi }}>
                      <option value="">Select category</option>
                      {['Construction', 'Materials', 'Labor', 'Equipment', 'Consulting', 'Transportation', 'Utilities', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1.5" style={{ color: P.textLo }}>Amount (OMR)</label>
                    <input name="amount" type="number" step="0.001" min="0" defaultValue={expenseModal.expense?.amount || ''} required className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi }} placeholder="0.000" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5" style={{ color: P.textLo }}>Description</label>
                  <input name="description" defaultValue={expenseModal.expense?.description || ''} required className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi }} placeholder="Expense description..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1.5" style={{ color: P.textLo }}>Date</label>
                    <input name="date" type="date" defaultValue={expenseModal.expense?.date || new Date().toISOString().slice(0, 10)} required className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi }} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1.5" style={{ color: P.textLo }}>Status</label>
                    <select name="status" defaultValue={expenseModal.expense?.status || 'pending'} className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi }}>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setExpenseModal(null)} className="px-4 py-2 rounded-full text-sm font-medium" style={{ color: P.textMd, border: `1px solid ${P.border}` }}>Cancel</button>
                  <button type="submit" className="px-5 py-2 rounded-full text-sm font-semibold" style={{ background: '#C9C036', color: '#080805' }}>{expenseModal.mode === 'add' ? 'Add Expense' : 'Save Changes'}</button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Delete Confirm Dialog ───────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteExpenseId}
        onClose={() => setDeleteExpenseId(null)}
        onConfirm={() => {
          if (!deleteExpenseId) return;
          deleteExpenseMutation.mutate(deleteExpenseId, {
            onSuccess: () => {
              setLocalExpenses(prev => prev.filter(e => e.id !== deleteExpenseId));
              toast.success('Expense Deleted', 'The expense record has been removed.');
              setDeleteExpenseId(null);
            },
            onError: () => {
              toast.error('Error', 'Failed to delete expense. Please try again.');
            },
          });
        }}
        title="Delete Expense"
        message="Are you sure you want to delete this expense record? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4: MEDIA & DOCUMENTS
// ═══════════════════════════════════════════════════════════════════════════════
function MediaTab({ project }: { project: Project }) {
  const { colors: P } = useTheme();
  const { id } = useParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [mediaFilter, setMediaFilter] = useState<string>('all');
  const [docFilter, setDocFilter] = useState<string>('all');
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const [mediaModal, setMediaModal] = useState<{ file: File; caption: string; category: string; previewUrl: string } | null>(null);
  const [documentModal, setDocumentModal] = useState<{ file: File; category: string } | null>(null);
  const media = project.media || [];
  const docs = project.documents || [];
  const mediaCategories = ['all', 'before', 'during', 'after', 'event'];
  const docCategories = ['all', 'contract', 'report', 'invoice', 'plan', 'other'];

  const filteredMedia = mediaFilter === 'all' ? media : media.filter(m => m.category === mediaFilter);
  const filteredDocs = docFilter === 'all' ? docs : docs.filter(d => d.category === docFilter);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const uploadMediaMutation = useMutation({
    mutationFn: async (payload: { file: File; caption: string; category: string }) => {
      if (!id) throw new Error('Missing project id');
      const uploaded = await uploadService.upload('media', payload.file);
      const url = (uploaded as any)?.data?.url;
      if (!url) throw new Error('Upload failed');
      return projectService.createProjectMedia(id, {
        url,
        type: payload.file.type.startsWith('video') ? 'video' : 'image',
        caption: payload.caption || payload.file.name,
        category: payload.category,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      toast.success('Uploaded', 'Media has been uploaded successfully.');
    },
    onError: () => {
      toast.error('Error', 'Failed to upload media.');
    },
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async (payload: { file: File; category: string }) => {
      if (!id) throw new Error('Missing project id');
      const uploaded = await uploadService.upload('documents', payload.file);
      const fileData = (uploaded as any)?.data;
      if (!fileData?.url) throw new Error('Upload failed');
      return projectService.createProjectDocument(id, {
        name: fileData.originalName || payload.file.name,
        type: fileData.mimeType || payload.file.type || 'application/octet-stream',
        size: fileData.size || payload.file.size,
        url: fileData.url,
        category: payload.category,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      toast.success('Uploaded', 'Document has been uploaded successfully.');
    },
    onError: () => {
      toast.error('Error', 'Failed to upload document.');
    },
  });

  const deleteMediaMutation = useMutation({
    mutationFn: (mediaId: string) => {
      if (!id) throw new Error('Missing project id');
      return projectService.deleteProjectMedia(id, mediaId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      toast.success('Deleted', 'Media item removed.');
    },
    onError: () => toast.error('Error', 'Failed to delete media.'),
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (docId: string) => {
      if (!id) throw new Error('Missing project id');
      return projectService.deleteProjectDocument(id, docId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      toast.success('Deleted', 'Document removed.');
    },
    onError: () => toast.error('Error', 'Failed to delete document.'),
  });

  const onMediaFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setMediaModal({ file, caption: file.name, category: 'event', previewUrl });
    }
    event.target.value = '';
  };

  const onDocumentFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setDocumentModal({ file, category: 'other' });
    }
    event.target.value = '';
  };

  const handleMediaSubmit = () => {
    if (!mediaModal) return;
    uploadMediaMutation.mutate(
      { file: mediaModal.file, caption: mediaModal.caption, category: mediaModal.category },
      {
        onSuccess: () => {
          URL.revokeObjectURL(mediaModal.previewUrl);
          setMediaModal(null);
        },
      },
    );
  };

  const handleDocumentSubmit = () => {
    if (!documentModal) return;
    uploadDocumentMutation.mutate(
      { file: documentModal.file, category: documentModal.category },
      {
        onSuccess: () => setDocumentModal(null),
      },
    );
  };

  return (
    <div className="space-y-8">
      {/* Media Section */}
      <div>
        <input ref={mediaInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={onMediaFileChange} />
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: P.textHi, fontFamily: 'Playfair Display, serif' }}>
            <Camera size={14} style={{ color: '#38bdf8' }} /> Photos & Videos
          </h4>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium" style={{ background: `${P.accent}15`, color: P.accent, border: `1px solid ${P.accent}30` }} onClick={() => mediaInputRef.current?.click()}>
            <Upload size={11} /> Upload
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          {mediaCategories.map(c => (
            <button
              key={c}
              onClick={() => setMediaFilter(c)}
              className="px-3 py-1.5 rounded-full text-[11px] font-medium capitalize transition-all"
              style={{
                background: mediaFilter === c ? `${P.accent}15` : 'transparent',
                color: mediaFilter === c ? P.accent : P.textLo,
                border: `1px solid ${mediaFilter === c ? P.accent + '40' : P.border}`,
              }}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filteredMedia.map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: i * 0.05 }} className="cursor-pointer group">
              <GlassCard className="p-0 overflow-hidden">
                <div className="relative h-36" style={{ background: `linear-gradient(135deg, ${m.type === 'video' ? '#38bdf8' : '#E91E63'}10, ${P.card})` }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {m.type === 'video' ? <Play size={24} style={{ color: '#38bdf8' }} /> : <Image size={24} style={{ color: P.textDim }} />}
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: `${P.bg}90`, color: P.textMd }}>{m.category}</span>
                  </div>
                  <button
                    className="absolute top-2 left-2 p-1 rounded-full"
                    style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
                    onClick={(e) => { e.stopPropagation(); deleteMediaMutation.mutate(m.id); }}
                    title="Delete">
                    <Trash2 size={11} />
                  </button>
                  <div className="absolute bottom-0 inset-x-0 p-2" style={{ background: 'linear-gradient(transparent, rgba(255,255,255,0.9))' }}>
                    <p className="text-[10px] line-clamp-1" style={{ color: P.textMd }}>{m.caption}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Documents Section */}
      <div>
        <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" className="hidden" onChange={onDocumentFileChange} />
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: P.textHi, fontFamily: 'Playfair Display, serif' }}>
            <File size={14} style={{ color: '#fbbf24' }} /> Documents
          </h4>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium" style={{ background: `${P.accent}15`, color: P.accent, border: `1px solid ${P.accent}30` }} onClick={() => docInputRef.current?.click()}>
            <Upload size={11} /> Upload
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          {docCategories.map(c => (
            <button
              key={c}
              onClick={() => setDocFilter(c)}
              className="px-3 py-1.5 rounded-full text-[11px] font-medium capitalize transition-all"
              style={{
                background: docFilter === c ? `${P.accent}15` : 'transparent',
                color: docFilter === c ? P.accent : P.textLo,
                border: `1px solid ${docFilter === c ? P.accent + '40' : P.border}`,
              }}
            >
              {c}
            </button>
          ))}
        </div>

        <GlassCard>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${P.border}` }}>
                  {['Name', 'Category', 'Size', 'Uploaded', 'By', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: P.textLo }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((d, i) => (
                  <motion.tr key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 * i }} style={{ borderBottom: `1px solid ${P.border}60` }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText size={13} style={{ color: '#fbbf24' }} />
                        <span className="text-[11px] font-medium" style={{ color: P.textHi }}>{d.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] capitalize" style={{ background: P.surface, color: P.textMd, border: `1px solid ${P.border}` }}>{d.category}</span></td>
                    <td className="px-4 py-3 text-[11px] tabular-nums" style={{ color: P.textLo }}>{formatSize(d.size)}</td>
                    <td className="px-4 py-3 text-[11px]" style={{ color: P.textLo }}>{d.uploadedAt}</td>
                    <td className="px-4 py-3 text-[11px]" style={{ color: P.textMd }}>{d.uploadedBy}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button className="p-1 rounded-full" style={{ color: P.textLo }} title="Download" onClick={() => window.open(d.url, '_blank')}><Download size={12} /></button>
                        <button className="p-1 rounded-full" style={{ color: P.textLo }} title="Preview" onClick={() => window.open(d.url, '_blank')}><Eye size={12} /></button>
                        <button className="p-1 rounded-full" style={{ color: '#f87171' }} title="Delete" onClick={() => deleteDocumentMutation.mutate(d.id)}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      <AnimatePresence>
        {mediaModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200]"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => {
                URL.revokeObjectURL(mediaModal.previewUrl);
                setMediaModal(null);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[560px] max-w-[92vw] rounded-2xl"
              style={{ background: P.card, border: `1px solid ${P.border}`, boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
            >
              <div className="p-5" style={{ borderBottom: `1px solid ${P.border}` }}>
                <h3 className="text-base font-bold" style={{ color: P.textHi }}>Upload Media</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${P.border}` }}>
                  {mediaModal.file.type.startsWith('video') ? (
                    <video src={mediaModal.previewUrl} controls className="w-full max-h-[240px] object-cover" />
                  ) : (
                    <img src={mediaModal.previewUrl} alt="Media preview" className="w-full max-h-[240px] object-cover" />
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5" style={{ color: P.textLo }}>Caption</label>
                  <input
                    value={mediaModal.caption}
                    onChange={(e) => setMediaModal((prev) => prev ? { ...prev, caption: e.target.value } : prev)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5" style={{ color: P.textLo }}>Category</label>
                  <select
                    value={mediaModal.category}
                    onChange={(e) => setMediaModal((prev) => prev ? { ...prev, category: e.target.value } : prev)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi }}
                  >
                    {mediaCategories.filter((c) => c !== 'all').map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(mediaModal.previewUrl);
                      setMediaModal(null);
                    }}
                    className="px-4 py-2 rounded-full text-sm font-medium"
                    style={{ color: P.textMd, border: `1px solid ${P.border}` }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleMediaSubmit}
                    className="px-5 py-2 rounded-full text-sm font-semibold"
                    style={{ background: '#C9C036', color: '#080805' }}
                    disabled={uploadMediaMutation.isPending}
                  >
                    {uploadMediaMutation.isPending ? 'Uploading...' : 'Upload Media'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {documentModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200]"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setDocumentModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[500px] max-w-[92vw] rounded-2xl"
              style={{ background: P.card, border: `1px solid ${P.border}`, boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
            >
              <div className="p-5" style={{ borderBottom: `1px solid ${P.border}` }}>
                <h3 className="text-base font-bold" style={{ color: P.textHi }}>Upload Document</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="rounded-xl p-3" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                  <p className="text-[11px]" style={{ color: P.textLo }}>File</p>
                  <p className="text-sm font-medium" style={{ color: P.textHi }}>{documentModal.file.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: P.textLo }}>{formatSize(documentModal.file.size)}</p>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5" style={{ color: P.textLo }}>Category</label>
                  <select
                    value={documentModal.category}
                    onChange={(e) => setDocumentModal((prev) => prev ? { ...prev, category: e.target.value } : prev)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi }}
                  >
                    {docCategories.filter((c) => c !== 'all').map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDocumentModal(null)}
                    className="px-4 py-2 rounded-full text-sm font-medium"
                    style={{ color: P.textMd, border: `1px solid ${P.border}` }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDocumentSubmit}
                    className="px-5 py-2 rounded-full text-sm font-semibold"
                    style={{ background: '#C9C036', color: '#080805' }}
                    disabled={uploadDocumentMutation.isPending}
                  >
                    {uploadDocumentMutation.isPending ? 'Uploading...' : 'Upload Document'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 5: REVIEWS & LOG
// ═══════════════════════════════════════════════════════════════════════════════
function ReviewsTab({ project }: { project: Project }) {
  const { colors: P } = useTheme();
  const { id } = useParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  const reviews = useMemo(() => project.reviews || [], [project.reviews]);
  const activities = project.activities || [];
  const avgRating = project.avgRating || 0;
  const totalReviews = project.totalReviews || reviews.length;
  const [reviewModal, setReviewModal] = useState<{ rating: number; comment: string } | null>(null);

  const addReviewMutation = useMutation({
    mutationFn: (payload: { rating: number; comment?: string }) => {
      if (!id) throw new Error('Missing project id');
      return reviewService.createReview(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      toast.success('Review Added', 'Thank you for your feedback.');
    },
    onError: () => {
      toast.error('Error', 'Failed to submit review.');
    },
  });

  const handleAddReview = () => {
    setReviewModal({ rating: 5, comment: '' });
  };

  const ratingDist = useMemo(() => {
    const dist = [0, 0, 0, 0, 0];
    reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++; });
    return dist;
  }, [reviews]);

  const activityIcons: Record<string, { icon: React.ElementType; color: string }> = {
    milestone: { icon: CheckCircle2, color: '#34d399' },
    expense: { icon: Wallet, color: '#fbbf24' },
    review: { icon: Star, color: '#fbbf24' },
    media: { icon: Camera, color: '#38bdf8' },
    update: { icon: Activity, color: '#E91E63' },
    create: { icon: FileText, color: '#a78bfa' },
    delete: { icon: Trash2, color: '#f87171' },
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Reviews */}
      <div>
        <h4 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: P.textHi, fontFamily: 'Playfair Display, serif' }}>
          <Star size={14} style={{ color: '#fbbf24' }} /> Reviews & Ratings
        </h4>

        {/* Rating Summary */}
        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <GlassCard className="p-5 mb-4">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-3xl font-black tabular-nums" style={{ color: '#fbbf24' }}>{avgRating.toFixed(1)}</p>
                <div className="flex items-center gap-0.5 my-1 justify-center">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} size={12} style={{ color: s <= Math.round(avgRating) ? '#fbbf24' : P.textDim }} fill={s <= Math.round(avgRating) ? '#fbbf24' : 'none'} />
                  ))}
                </div>
                <p className="text-[10px]" style={{ color: P.textLo }}>{totalReviews} reviews</p>
              </div>
              <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = ratingDist[star - 1];
                  const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-[10px] w-3 text-right" style={{ color: P.textLo }}>{star}</span>
                      <Star size={9} style={{ color: '#fbbf24' }} fill="#fbbf24" />
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: P.border }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: (5 - star) * 0.1 }} className="h-full rounded-full" style={{ background: '#fbbf24' }} />
                      </div>
                      <span className="text-[10px] w-5 tabular-nums" style={{ color: P.textLo }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Review List */}
        <div className="space-y-3">
          {reviews.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: i * 0.08 }}>
              <GlassCard className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: `${P.accent}15`, color: P.accent }}>
                    {(r.userName || 'U').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[11px] font-bold" style={{ color: P.textHi }}>{r.userName || 'Unknown'}</p>
                      <span className="text-[10px]" style={{ color: P.textLo }}>{r.createdAt}</span>
                    </div>
                    <div className="flex items-center gap-0.5 mb-2">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={10} style={{ color: s <= r.rating ? '#fbbf24' : P.textDim }} fill={s <= r.rating ? '#fbbf24' : 'none'} />
                      ))}
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: P.textMd }}>{r.comment}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <button className="mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-full text-[11px] font-bold" style={{ background: `${P.accent}15`, color: P.accent, border: `1px solid ${P.accent}30` }} onClick={handleAddReview}>
          <MessageSquare size={11} /> Add Review
        </button>
      </div>

      {/* Activity Log */}
      <div>
        <h4 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: P.textHi, fontFamily: 'Playfair Display, serif' }}>
          <History size={14} style={{ color: '#38bdf8' }} /> Activity Log
        </h4>

        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <GlassCard className="p-5">
            <div className="relative pl-6 space-y-5">
              <div className="absolute left-2.5 top-0 bottom-0 w-px" style={{ background: `linear-gradient(to bottom, ${P.accent}50, transparent)` }} />
              {activities.map((a, i) => {
                const ai = activityIcons[a.type] || { icon: Activity, color: P.textLo };
                const AIcon = ai.icon;
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + i * 0.06, duration: 0.35 }}
                    className="relative"
                  >
                    <div className="absolute -left-6 h-5 w-5 flex items-center justify-center rounded-full" style={{ background: P.card, border: `2px solid ${ai.color}40` }}>
                      <AIcon size={9} style={{ color: ai.color }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[11px] font-bold" style={{ color: P.textHi }}>{a.action}</p>
                        <span className="text-[9px] px-1.5 py-0.5 rounded capitalize" style={{ background: `${ai.color}10`, color: ai.color }}>{a.type}</span>
                      </div>
                      <p className="text-[11px]" style={{ color: P.textMd }}>{a.description}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: P.textLo }}>{a.userName} · {new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      <AnimatePresence>
        {reviewModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200]"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setReviewModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[500px] max-w-[92vw] rounded-2xl"
              style={{ background: P.card, border: `1px solid ${P.border}`, boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
            >
              <div className="p-5" style={{ borderBottom: `1px solid ${P.border}` }}>
                <h3 className="text-base font-bold" style={{ color: P.textHi }}>Add Review</h3>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold mb-2" style={{ color: P.textLo }}>Rating</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewModal((prev) => prev ? { ...prev, rating: star } : prev)}
                        className="p-1"
                      >
                        <Star
                          size={20}
                          style={{ color: star <= reviewModal.rating ? '#fbbf24' : P.textDim }}
                          fill={star <= reviewModal.rating ? '#fbbf24' : 'none'}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5" style={{ color: P.textLo }}>Comment</label>
                  <textarea
                    rows={4}
                    value={reviewModal.comment}
                    onChange={(e) => setReviewModal((prev) => prev ? { ...prev, comment: e.target.value } : prev)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                    style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi }}
                    placeholder="Share your feedback about this project..."
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setReviewModal(null)}
                    className="px-4 py-2 rounded-full text-sm font-medium"
                    style={{ color: P.textMd, border: `1px solid ${P.border}` }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (reviewModal.rating < 1 || reviewModal.rating > 5) {
                        toast.error('Invalid Rating', 'Please select a rating from 1 to 5.');
                        return;
                      }
                      addReviewMutation.mutate(
                        { rating: reviewModal.rating, comment: reviewModal.comment || undefined },
                        { onSuccess: () => setReviewModal(null) },
                      );
                    }}
                    className="px-5 py-2 rounded-full text-sm font-semibold"
                    style={{ background: '#C9C036', color: '#080805' }}
                    disabled={addReviewMutation.isPending}
                  >
                    {addReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALLOWED STATUS TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════════
const ALLOWED_TRANSITIONS: Record<string, { target: ProjectStatus; label: string; icon: React.ElementType; color: string }[]> = {
  planning:  [
    { target: 'active', label: 'Start Project', icon: Play, color: '#38bdf8' },
    { target: 'archived', label: 'Archive', icon: Archive, color: '#9CA3AF' },
  ],
  active: [
    { target: 'on_hold', label: 'Pause', icon: Pause, color: '#fbbf24' },
    { target: 'completed', label: 'Mark Complete', icon: CheckCircle2, color: '#34d399' },
    { target: 'archived', label: 'Archive', icon: Archive, color: '#9CA3AF' },
  ],
  on_hold: [
    { target: 'active', label: 'Resume', icon: Play, color: '#38bdf8' },
    { target: 'archived', label: 'Archive', icon: Archive, color: '#9CA3AF' },
  ],
  completed: [
    { target: 'archived', label: 'Archive', icon: Archive, color: '#9CA3AF' },
  ],
  archived: [],
};

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════════════════════
function DetailsSidebar({ project, onEdit, onStatusChange, statusLoading, canManage }: {
  project: Project;
  onEdit?: () => void;
  onStatusChange?: (newStatus: ProjectStatus) => void;
  statusLoading?: boolean;
  canManage?: boolean;
}) {
  const { colors: P } = useTheme();
  const p = project;
  const sc = statusCfg[p.status];
  const rc = p.risk ? riskCfg[p.risk] : riskCfg.low;
  const transitions = ALLOWED_TRANSITIONS[p.status] || [];
  const budgetPct = p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0;
  const remaining = p.budget - p.spent;

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <GlassCard className="p-4">
        <h5 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: P.textHi }}><Zap size={11} style={{ color: P.accent }} /> Quick Actions</h5>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Edit', icon: Edit3, color: '#38bdf8', onClick: onEdit },
            { label: 'Share', icon: Share2, color: '#a78bfa' },
            { label: 'Export', icon: Download, color: '#34d399' },
            { label: 'Print', icon: Printer, color: '#fbbf24' },
          ].map(a => (
            <button key={a.label} onClick={a.onClick} className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-medium transition-all" style={{ background: `${a.color}08`, color: a.color, border: `1px solid ${a.color}15` }}
              onMouseEnter={e => ((e.currentTarget).style.background = `${a.color}18`)} onMouseLeave={e => ((e.currentTarget).style.background = `${a.color}08`)}>
              <a.icon size={12} />{a.label}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* ── Status Management ── */}
      <GlassCard className="p-4">
        <h5 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: P.textHi }}>
          <Activity size={11} style={{ color: sc.dot }} /> Project Status
        </h5>
        {/* Current status */}
        <div className="flex items-center gap-2 p-2.5 rounded-xl mb-3" style={{ background: sc.bg, border: `1px solid ${sc.dot}25` }}>
          <sc.icon size={14} style={{ color: sc.dot }} />
          <span className="text-xs font-bold" style={{ color: sc.text }}>{sc.label}</span>
        </div>
        {/* Transition buttons */}
        {canManage && transitions.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: P.textLo }}>Change to</p>
            {transitions.map(tr => (
              <button
                key={tr.target}
                onClick={() => onStatusChange?.(tr.target)}
                disabled={statusLoading}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-semibold transition-all disabled:opacity-50"
                style={{ background: `${tr.color}08`, color: tr.color, border: `1px solid ${tr.color}20` }}
                onMouseEnter={e => { e.currentTarget.style.background = `${tr.color}18`; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${tr.color}08`; }}
              >
                <tr.icon size={13} />
                {tr.label}
                <ArrowRight size={11} className="ml-auto" />
              </button>
            ))}
          </div>
        )}
      </GlassCard>

      {/* ── Financial Summary ── */}
      <GlassCard className="p-4">
        <h5 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: P.textHi }}>
          <Wallet size={11} style={{ color: '#fbbf24' }} /> Financial Summary
        </h5>
        <div className="space-y-3">
          {/* Progress bar */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[10px]" style={{ color: P.textLo }}>Budget Used</span>
              <span className="text-[10px] font-bold" style={{ color: budgetPct > 90 ? '#f87171' : budgetPct > 75 ? '#fbbf24' : '#34d399' }}>{budgetPct}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: P.border }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(budgetPct, 100)}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full"
                style={{ background: budgetPct > 90 ? '#f87171' : budgetPct > 75 ? '#fbbf24' : '#34d399' }}
              />
            </div>
          </div>
          {/* Numbers */}
          <div className="space-y-2">
            {[
              { l: 'Total Budget', v: `OMR ${p.budget.toLocaleString()}`, color: P.textHi },
              { l: 'Total Spent', v: `OMR ${p.spent.toLocaleString()}`, color: budgetPct > 85 ? '#f87171' : '#fbbf24' },
              { l: remaining >= 0 ? 'Remaining' : 'Over Budget', v: `OMR ${Math.abs(remaining).toLocaleString()}`, color: remaining >= 0 ? '#34d399' : '#f87171' },
            ].map(item => (
              <div key={item.l} className="flex justify-between text-[11px]">
                <span style={{ color: P.textLo }}>{item.l}</span>
                <span className="font-bold tabular-nums" style={{ color: item.color }}>{item.v}</span>
              </div>
            ))}
          </div>
          {/* Surplus/Deficit badge for completed */}
          {p.status === 'completed' && (
            <div className="p-3 rounded-xl mt-2" style={{
              background: remaining >= 0 ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)',
              border: `1px solid ${remaining >= 0 ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
            }}>
              <div className="flex items-center gap-2 mb-1">
                {remaining >= 0 ? <TrendingDown size={12} style={{ color: '#34d399' }} /> : <TrendingUp size={12} style={{ color: '#f87171' }} />}
                <span className="text-[11px] font-bold" style={{ color: remaining >= 0 ? '#34d399' : '#f87171' }}>
                  {remaining >= 0 ? 'Under Budget' : 'Over Budget'}
                </span>
              </div>
              <p className="text-lg font-black tabular-nums" style={{ color: remaining >= 0 ? '#34d399' : '#f87171' }}>
                OMR {Math.abs(remaining).toLocaleString()}
              </p>
              <p className="text-[10px] mt-1" style={{ color: P.textLo }}>
                {remaining >= 0
                  ? `Saved ${(100 - budgetPct)}% of allocated budget`
                  : `Exceeded budget by ${budgetPct - 100}%`}
              </p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Quick Info */}
      <GlassCard className="p-4">
        <h5 className="text-xs font-bold mb-3" style={{ color: P.textHi }}>Quick Info</h5>
        <div className="space-y-2.5">
          {[
            { l: 'Risk', v: <span style={{ color: rc.color }}>{rc.label}</span> },
            { l: 'Progress', v: `${p.progress || 0}%` },
            { l: 'Rating', v: p.avgRating ? `${p.avgRating}/5` : 'N/A' },
            { l: 'Created', v: p.createdAt },
            { l: 'Updated', v: p.updatedAt },
          ].map(item => (
            <div key={item.l} className="flex justify-between text-[11px]">
              <span style={{ color: P.textLo }}>{item.l}</span>
              <span className="font-semibold" style={{ color: P.textHi }}>{item.v}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Team */}
      <GlassCard className="p-4">
        <h5 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: P.textHi }}><Users size={11} style={{ color: '#38bdf8' }} /> Team ({(p.team || []).length})</h5>
        <div className="space-y-2.5">
          {/* Manager */}
          {p.managerName && (
            <div className="flex items-center gap-2.5 p-2 rounded-xl" style={{ background: 'rgba(201,192,54,0.06)', border: '1px solid rgba(201,192,54,0.15)' }}>
              <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: `${P.accent}20`, color: P.accent }}>
                {p.managerName.charAt(0)}
              </div>
              <div>
                <p className="text-[11px] font-semibold" style={{ color: P.textHi }}>{p.managerName}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: P.accent }}>Manager</p>
              </div>
            </div>
          )}
          {(p.team || []).map(m => (
            <div key={m.id} className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: `${P.accent}12`, color: P.accent }}>
                {(m.name || 'T').charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold truncate" style={{ color: P.textHi }}>{m.name || 'Team Member'}</p>
                <p className="text-[9px] capitalize" style={{ color: P.textLo }}>{m.role}</p>
              </div>
            </div>
          ))}
          {(p.team || []).length === 0 && !p.managerName && (
            <p className="text-[11px] text-center py-2" style={{ color: P.textLo }}>No team members assigned</p>
          )}
        </div>
      </GlassCard>

      {/* Related Projects */}
      {p.relatedProjects && p.relatedProjects.length > 0 && (
        <GlassCard className="p-4">
          <h5 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: P.textHi }}><ExternalLink size={11} style={{ color: '#a78bfa' }} /> Related</h5>
          <div className="space-y-2">
            {p.relatedProjects.map(rp => {
              const rsc = statusCfg[rp.status];
              return (
                <a key={rp.id} href={`#/projects/${rp.id}`} className="flex items-center gap-2 p-2 rounded-xl transition-all hover:bg-black/[0.02]">
                  <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: rsc.dot }} />
                  <span className="text-[11px] truncate" style={{ color: P.textMd }}>{rp.name}</span>
                </a>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* Tags */}
      {p.tags && p.tags.length > 0 && (
        <GlassCard className="p-4">
          <h5 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: P.textHi }}><Tag size={11} style={{ color: P.accent }} /> Tags</h5>
          <div className="flex flex-wrap gap-2">
            {p.tags.map(t => (
              <span key={t} className="px-2 py-1 rounded-full text-[10px] font-medium" style={{ background: `${P.accent}10`, color: P.accentLo, border: `1px solid ${P.accent}18` }}>{t}</span>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const P = useTheme().colors;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState<ProjectStatus | null>(null);
  const toast = useToast();
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });

  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const { data: projectData, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectService.getProject(id!),
    enabled: !!id,
  });
  const project = projectData?.data;

  const deleteMutation = useMutation({
    mutationFn: () => projectService.deleteProject(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project Deleted', 'The project has been permanently removed.');
      navigate('/projects');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => projectService.updateProject(id!, { status: 'archived' } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      toast.success('Project Archived', 'The project has been moved to archives.');
      navigate('/projects/archived');
    },
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => projectService.updateProject(id!, { status: newStatus } as any),
    onSuccess: (_data, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      const label = statusCfg[newStatus as ProjectStatus]?.label || newStatus;
      toast.success('Status Updated', `Project is now "${label}".`);
    },
    onError: () => {
      toast.error('Error', 'Failed to update project status.');
    },
  });

  if (isLoading || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080805' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const sc = statusCfg[project.status];

  // Navigation handler for edit button
  const handleEdit = () => navigate(`/projects/edit/${id || project.id}`);
  const rc = project.risk ? riskCfg[project.risk] : riskCfg.low;

  return (
    <div className="min-h-full" style={{ background: P.bg, fontFamily: 'Inter, sans-serif' }}>
      <div className="fixed inset-0 pointer-events-none opacity-[0.018]" style={{ backgroundImage: `radial-gradient(${P.accent} 0.5px, transparent 0.5px)`, backgroundSize: '24px 24px' }} />

      <div className="relative max-w-[1600px] mx-auto">
        {/* ═══ Hero Section ═══════════════════════════════════════════════ */}
        <motion.div
          ref={heroRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="relative h-64 overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${sc.dot}12, ${P.card} 40%, ${rc.color}08, ${P.bg})` }}
        >
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 20% 30%, ${sc.dot}12, transparent 50%), radial-gradient(ellipse at 80% 70%, ${rc.color}08, transparent 50%)` }} />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 50%, ${P.bg})` }} />

          {/* Breadcrumb */}
          <div className="relative px-6 pt-5">
            <div className="flex items-center gap-2 text-[11px]" style={{ color: P.textLo }}>
              <a href="#/" className="hover:text-[#E91E63] transition-colors">Dashboard</a>
              <ChevronRight size={10} />
              <a href="#/projects" className="hover:text-[#E91E63] transition-colors">Projects</a>
              <ChevronRight size={10} />
              <span style={{ color: P.textMd }}>{project.categoryName}</span>
              <ChevronRight size={10} />
              <span style={{ color: P.accent }}>{project.name}</span>
            </div>
          </div>

          {/* Hero Content */}
          <div className="relative px-6 pt-8 flex items-end justify-between pb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.dot}30` }}>
                  <sc.icon size={12} />{sc.label}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: `${P.bg}80`, color: P.textMd, border: `1px solid ${P.border}` }}>
                  {project.categoryName}
                </span>
                {project.risk && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold capitalize" style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.color}30` }}>
                    {rc.label}
                  </span>
                )}
              </div>
              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-2xl font-black mb-2"
                style={{ color: P.textHi, fontFamily: 'Playfair Display, serif' }}
              >
                {project.name}
              </motion.h1>
              <div className="flex items-center gap-4 text-[11px]" style={{ color: P.textLo }}>
                <span className="flex items-center gap-1"><MapPin size={11} />{project.location}</span>
                <span className="flex items-center gap-1"><Calendar size={11} />{project.startDate} → {project.endDate}</span>
                <span className="flex items-center gap-1"><Users size={11} />{(project.beneficiaryCount || 0).toLocaleString()} beneficiaries</span>
              </div>
            </div>

            {/* Progress Circle */}
            <div className="flex-shrink-0 mr-4">
              <div className="relative h-20 w-20">
                <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke={P.border} strokeWidth="2.5" />
                  <motion.circle
                    cx="18" cy="18" r="15.5" fill="none"
                    stroke={(project.progress || 0) === 100 ? '#34d399' : P.accent}
                    strokeWidth="2.5" strokeLinecap="round"
                    initial={{ strokeDasharray: '0 100' }}
                    animate={{ strokeDasharray: `${(project.progress || 0) * 0.975} 100` }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-black tabular-nums leading-none" style={{ color: P.textHi }}>{project.progress || 0}%</span>
                  <span className="text-[8px] uppercase tracking-wider mt-0.5" style={{ color: P.textLo }}>Complete</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons row */}
          <div className="absolute top-5 right-6 flex items-center gap-2">
            {[
              { icon: Edit3, label: 'Edit', color: '#38bdf8', onClick: handleEdit },
              { icon: Share2, label: 'Share', color: '#a78bfa' },
              { icon: Download, label: 'Export', color: '#34d399' },
              { icon: BookmarkPlus, label: 'Save', color: '#fbbf24' },
              { icon: Printer, label: 'Print', color: P.textMd },
              { icon: AlertTriangle, label: 'Report', color: '#f87171' },
              { icon: Archive, label: 'Archive', color: '#fbbf24', onClick: () => setArchiveConfirm(true) },
              { icon: Trash2, label: 'Delete', color: '#f87171', onClick: () => setDeleteConfirm(true) },
            ].map(a => (
              <button key={a.label} title={a.label} onClick={a.onClick} className="h-8 w-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-[0.95]" style={{ background: `${a.color}10`, border: `1px solid ${a.color}20`, color: a.color }}
                onMouseEnter={e => { (e.currentTarget).style.background = `${a.color}25`; }} onMouseLeave={e => { (e.currentTarget).style.background = `${a.color}10`; }}>
                <a.icon size={13} />
              </button>
            ))}
          </div>
        </motion.div>

        {/* ═══ Tabs ═══════════════════════════════════════════════════════ */}
        <div className="sticky top-0 z-10 px-6" style={{ background: P.bg, borderBottom: `1px solid ${P.border}` }}>
          <div className="flex items-center gap-1 py-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {tabs.map(t => {
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className="relative flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-all duration-200"
                  style={{ color: active ? P.accent : P.textLo }}
                >
                  <t.icon size={13} />
                  {t.label}
                  {active && (
                    <motion.div
                      layoutId="tab-underline"
                      className="absolute bottom-0 inset-x-2 h-0.5 rounded-full"
                      style={{ background: P.accent }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══ Content + Sidebar ═══════════════════════════════════════ */}
        <div className="px-6 py-6">
          <div className="flex gap-6">
            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                {activeTab === 'overview' && <OverviewTab key="overview" project={project} />}
                {activeTab === 'timeline' && <TimelineTab key="timeline" project={project} />}
                {activeTab === 'budget' && <BudgetTab key="budget" project={project} />}
                {activeTab === 'media' && <MediaTab key="media" project={project} />}
                {activeTab === 'reviews' && <ReviewsTab key="reviews" project={project} />}
              </AnimatePresence>
            </div>

            {/* Sidebar */}
            <div className="hidden xl:block w-[280px] flex-shrink-0">
              <div className="sticky top-16">
                <DetailsSidebar
                  project={project}
                  onEdit={handleEdit}
                  onStatusChange={(s) => setStatusConfirm(s)}
                  statusLoading={statusMutation.isPending}
                  canManage={canManage}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={() => {
          deleteMutation.mutate();
          setDeleteConfirm(false);
        }}
        title="Delete Project"
        message="Are you sure you want to permanently delete this project? This action cannot be undone and all associated data will be lost."
        confirmLabel="Delete Project"
        variant="danger"
      />

      <ConfirmDialog
        open={archiveConfirm}
        onClose={() => setArchiveConfirm(false)}
        onConfirm={() => {
          archiveMutation.mutate();
          setArchiveConfirm(false);
        }}
        title="Archive Project"
        message="Are you sure you want to archive this project? You can restore it later from the archived projects page."
        confirmLabel="Archive"
        variant="archive"
      />

      <ConfirmDialog
        open={!!statusConfirm}
        onClose={() => setStatusConfirm(null)}
        onConfirm={() => {
          if (statusConfirm) {
            statusMutation.mutate(statusConfirm);
            setStatusConfirm(null);
          }
        }}
        title="Change Project Status"
        message={`Are you sure you want to change this project's status to "${statusConfirm ? statusCfg[statusConfirm]?.label : ''}"?${statusConfirm === 'completed' ? '\n\nThis will mark the project as completed. A financial summary will be generated.' : ''}`}
        confirmLabel={statusConfirm ? statusCfg[statusConfirm]?.label || 'Confirm' : 'Confirm'}
        variant={statusConfirm === 'archived' ? 'archive' : 'info'}
      />
    </div>
  );
}
