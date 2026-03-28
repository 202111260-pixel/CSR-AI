/**
 * NotificationHub — Smart Notification Center v2
 *
 * "Signal Intelligence" design language:
 *  - Each card type has a distinct visual DNA
 *  - Critical risks pulse with urgency
 *  - AI insights shimmer with intelligence
 *  - Staggered cinematic entrance
 *  - Hover reveals action controls with slide-in
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Bell,
  AlertTriangle,
  Brain,
  Shield,
  Clock,
  DollarSign,
  Star,
  ChevronRight,
  CheckCheck,
  Trash2,
  Zap,
  TrendingUp,
  Users,
  Globe,
  Target,
  Handshake,
  ScanLine,
  Radio,
  Activity,
  Eye,
  ArrowUpRight,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { notificationService } from '../../services/notificationService';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

type TabKey = 'all' | 'risks' | 'insights' | 'system';

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function getNotifCategory(type: string): TabKey {
  if (type.startsWith('risk_')) return 'risks';
  if (type === 'ai_insight') return 'insights';
  return 'system';
}

function getTypeConfig(type: string, isDark: boolean) {
  switch (type) {
    case 'risk_critical': return {
      icon: <AlertTriangle size={15} />,
      label: 'CRITICAL',
      color: isDark ? '#ef4444' : '#dc2626',
      bg: isDark ? 'rgba(239, 68, 68, 0.06)' : 'rgba(239, 68, 68, 0.04)',
      barGradient: isDark
        ? 'linear-gradient(180deg, #ef4444, #b91c1c)'
        : 'linear-gradient(180deg, #ef4444, #dc2626)',
      glowColor: 'rgba(239, 68, 68, 0.35)',
      iconBg: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
      pulses: true,
    };
    case 'risk_warning': return {
      icon: <Shield size={15} />,
      label: 'WARNING',
      color: isDark ? '#f59e0b' : '#d97706',
      bg: isDark ? 'rgba(251, 191, 36, 0.05)' : 'rgba(251, 191, 36, 0.04)',
      barGradient: isDark
        ? 'linear-gradient(180deg, #f59e0b, #b45309)'
        : 'linear-gradient(180deg, #f59e0b, #d97706)',
      glowColor: 'rgba(245, 158, 11, 0.3)',
      iconBg: isDark ? 'rgba(251, 191, 36, 0.12)' : 'rgba(251, 191, 36, 0.08)',
      pulses: false,
    };
    case 'ai_insight': return {
      icon: <Brain size={15} />,
      label: 'AI INSIGHT',
      color: isDark ? '#a78bfa' : '#7c3aed',
      bg: isDark ? 'rgba(139, 92, 246, 0.05)' : 'rgba(139, 92, 246, 0.03)',
      barGradient: isDark
        ? 'linear-gradient(180deg, #a78bfa, #6d28d9)'
        : 'linear-gradient(180deg, #8b5cf6, #6d28d9)',
      glowColor: 'rgba(139, 92, 246, 0.3)',
      iconBg: isDark ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.08)',
      pulses: false,
    };
    default: return {
      icon: <Bell size={15} />,
      label: 'INFO',
      color: isDark ? '#60a5fa' : '#3b82f6',
      bg: isDark ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.03)',
      barGradient: isDark
        ? 'linear-gradient(180deg, #60a5fa, #2563eb)'
        : 'linear-gradient(180deg, #3b82f6, #2563eb)',
      glowColor: 'rgba(59, 130, 246, 0.25)',
      iconBg: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.08)',
      pulses: false,
    };
  }
}

function getContextIcon(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes('budget') || lower.includes('spending')) return <DollarSign size={11} />;
  if (lower.includes('timeline') || lower.includes('schedule')) return <Clock size={11} />;
  if (lower.includes('quality')) return <Star size={11} />;
  if (lower.includes('partner')) return <Handshake size={11} />;
  if (lower.includes('sdg') || lower.includes('coverage')) return <Globe size={11} />;
  if (lower.includes('impact') || lower.includes('milestone')) return <Target size={11} />;
  if (lower.includes('stalled')) return <TrendingUp size={11} />;
  if (lower.includes('beneficiar')) return <Users size={11} />;
  return null;
}

// ── Pulsing Keyframes (injected once) ─────────────────────────────────────────

const styleId = 'notif-hub-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes notif-bar-pulse {
      0%, 100% { opacity: 1; box-shadow: 0 0 8px var(--pulse-color); }
      50%      { opacity: 0.6; box-shadow: 0 0 16px var(--pulse-color); }
    }
    @keyframes notif-radar-ring {
      0%   { transform: scale(1); opacity: 0.5; }
      100% { transform: scale(2.2); opacity: 0; }
    }
    @keyframes notif-shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `;
  document.head.appendChild(style);
}

// ── Tab Config ────────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'All', icon: <Radio size={12} /> },
  { key: 'risks', label: 'Alerts', icon: <AlertTriangle size={12} /> },
  { key: 'insights', label: 'AI', icon: <Brain size={12} /> },
  { key: 'system', label: 'System', icon: <Zap size={12} /> },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface NotificationHubProps {
  open: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export function NotificationHub({ open, onClose }: NotificationHubProps) {
  const { colors: C, isDark } = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const panelRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: notifData, isLoading } = useQuery({
    queryKey: ['notifications', 'hub'],
    queryFn: () => notificationService.getAll({ limit: 50 }),
    enabled: open,
    refetchInterval: open ? 15000 : false,
  });

  const notifications: Notification[] = notifData?.data?.items ?? [];
  const unreadCount: number = notifData?.data?.unreadCount ?? 0;

  const filtered = activeTab === 'all'
    ? notifications
    : notifications.filter(n => getNotifCategory(n.type) === activeTab);

  const counts = {
    all: notifications.length,
    risks: notifications.filter(n => getNotifCategory(n.type) === 'risks').length,
    insights: notifications.filter(n => getNotifCategory(n.type) === 'insights').length,
    system: notifications.filter(n => getNotifCategory(n.type) === 'system').length,
  };

  // ── Mutations ─────────────────────────────────────────────────────────────

  const markRead = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); },
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); },
  });

  const deleteNotif = useMutation({
    mutationFn: (id: string) => notificationService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); },
  });

  const scanMutation = useMutation({
    mutationFn: () => notificationService.scan(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); },
  });

  // ── Close on outside click ────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handler); };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleNotifClick = useCallback((notif: Notification) => {
    if (!notif.read) markRead.mutate(notif.id);
    if (notif.link) { navigate(notif.link); onClose(); }
  }, [markRead, navigate, onClose]);

  const handleDelete = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotif.mutate(id);
  }, [deleteNotif]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[90]"
        style={{ background: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.12)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        ref={panelRef}
        initial={{ opacity: 0, y: -12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.96 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed right-4 top-[56px] z-[91] w-[440px] max-w-[calc(100vw-32px)] rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: C.surface,
          border: `1px solid ${C.borderHi}`,
          boxShadow: [
            `0 32px 80px rgba(0,0,0,${isDark ? '0.6' : '0.15'})`,
            `0 0 0 1px ${C.border}`,
            `inset 0 1px 0 ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)'}`,
          ].join(', '),
          maxHeight: 'calc(100vh - 80px)',
        }}
      >
        {/* ═══════════════════════════ HEADER ═══════════════════════════ */}
        <div className="relative px-5 pt-4 pb-3" style={{ borderBottom: `1px solid ${C.border}` }}>
          {/* Subtle gradient wash */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: isDark
                ? `linear-gradient(135deg, ${C.accent}06 0%, transparent 60%)`
                : `linear-gradient(135deg, ${C.accent}04 0%, transparent 60%)`,
            }}
          />

          {/* Title row */}
          <div className="relative flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${C.accent}18, ${C.accent}08)`,
                    border: `1px solid ${C.accent}25`,
                  }}
                >
                  <Activity size={16} style={{ color: C.accent }} />
                </div>
                {unreadCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                    style={{
                      background: '#22c55e',
                      boxShadow: '0 0 6px rgba(34, 197, 94, 0.6)',
                      animation: 'notif-bar-pulse 2s ease-in-out infinite',
                      '--pulse-color': 'rgba(34, 197, 94, 0.4)',
                    } as React.CSSProperties}
                  />
                )}
              </div>
              <div>
                <h3 className="text-[19px] leading-none" style={{ color: C.textHi, fontFamily: "'Caveat', cursive", fontWeight: 700 }}>
                  Operations Center
                </h3>
                <p className="text-[10px] mt-0.5" style={{ color: C.textMd }}>
                  {unreadCount > 0
                    ? <><span style={{ color: C.accent, fontWeight: 700 }}>{unreadCount}</span> unread signal{unreadCount !== 1 ? 's' : ''}</>
                    : 'All signals processed'
                  }
                </p>
              </div>
            </div>

            <div className="relative flex items-center gap-1.5">
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => scanMutation.mutate()}
                disabled={scanMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-[7px] rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                style={{
                  background: `linear-gradient(135deg, ${C.accent}20, ${C.accent}10)`,
                  color: C.accent,
                  border: `1px solid ${C.accent}30`,
                  opacity: scanMutation.isPending ? 0.7 : 1,
                }}
              >
                <motion.div
                  animate={scanMutation.isPending ? { rotate: 360 } : {}}
                  transition={scanMutation.isPending ? { repeat: Infinity, duration: 0.8, ease: 'linear' } : {}}
                >
                  <ScanLine size={12} />
                </motion.div>
                {scanMutation.isPending ? 'Scanning…' : 'Scan'}
              </motion.button>

              {unreadCount > 0 && (
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => markAllRead.mutate()}
                  className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
                  style={{ color: C.textMd, background: C.card, border: `1px solid ${C.border}` }}
                  title="Mark all as read"
                >
                  <CheckCheck size={12} />
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.06, rotate: 90 }}
                whileTap={{ scale: 0.94 }}
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
                style={{ color: C.textMd, background: C.card, border: `1px solid ${C.border}` }}
              >
                <X size={13} />
              </motion.button>
            </div>
          </div>

          {/* Live stats */}
          <div className="relative flex items-center gap-3 mb-3">
            {[
              { label: 'Risks', count: counts.risks, color: isDark ? '#ef4444' : '#dc2626' },
              { label: 'AI', count: counts.insights, color: isDark ? '#a78bfa' : '#7c3aed' },
              { label: 'System', count: counts.system, color: isDark ? '#60a5fa' : '#3b82f6' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color, boxShadow: `0 0 4px ${s.color}60` }} />
                <span className="text-[10px] font-medium" style={{ color: C.textMd }}>{s.label}</span>
                <span className="text-[10px] font-bold tabular-nums" style={{ color: s.count > 0 ? s.color : C.textMd }}>{s.count}</span>
              </div>
            ))}
          </div>

          {/* Segmented tabs */}
          <div
            className="flex gap-0.5 p-0.5 rounded-xl"
            style={{ background: C.card, border: `1px solid ${C.border}` }}
          >
            {TABS.map(tab => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="relative flex-1 flex items-center justify-center gap-1.5 py-[6px] rounded-[10px] text-[10px] font-semibold transition-all duration-200"
                  style={{
                    background: isActive ? C.surface : 'transparent',
                    color: isActive ? C.accent : C.textMd,
                    boxShadow: isActive
                      ? `0 1px 3px rgba(0,0,0,${isDark ? '0.3' : '0.08'}), inset 0 1px 0 ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)'}`
                      : 'none',
                  }}
                >
                  {tab.icon}
                  {tab.label}
                  {counts[tab.key] > 0 && (
                    <span
                      className="text-[8px] font-black min-w-[14px] h-[14px] flex items-center justify-center rounded-full"
                      style={{
                        background: isActive ? `${C.accent}20` : `${C.textMd}15`,
                        color: isActive ? C.accent : C.textMd,
                      }}
                    >
                      {counts[tab.key]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══════════ SCAN RESULTS ═══════════════════════════════════ */}
        <AnimatePresence>
          {scanMutation.isSuccess && scanMutation.data?.data && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div
                className="px-4 py-2 flex items-center gap-2"
                style={{
                  background: isDark
                    ? `linear-gradient(90deg, ${C.accent}10, transparent)`
                    : `linear-gradient(90deg, ${C.accent}08, transparent)`,
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: `${C.accent}20` }}>
                  <Zap size={10} style={{ color: C.accent }} />
                </div>
                <span className="text-[10px] font-semibold" style={{ color: C.accent }}>
                  {scanMutation.data.data.riskScan?.findingsCount ?? 0} risks · {scanMutation.data.data.aiInsights?.insightsGenerated ?? 0} insights detected
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════════ NOTIFICATION LIST ═══════════════════════════ */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent` }}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative w-14 h-14">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                  className="absolute inset-0 rounded-full"
                  style={{ border: `2px solid ${C.accent}20`, borderTopColor: C.accent }}
                />
                <div className="absolute inset-2 rounded-full flex items-center justify-center" style={{ background: C.card }}>
                  <Radio size={16} style={{ color: C.accent }} />
                </div>
              </div>
              <span className="text-[11px] font-medium" style={{ color: C.textMd }}>Scanning signals…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                  <Radio size={24} style={{ color: C.textMd }} />
                </div>
                {[1,2,3].map(r => (
                  <motion.div
                    key={r}
                    animate={{ scale: [1, 2.5], opacity: [0.3, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5, delay: r * 0.6, ease: 'easeOut' }}
                    className="absolute inset-0 rounded-2xl"
                    style={{ border: `1px solid ${C.accent}30` }}
                  />
                ))}
              </div>
              <div className="text-center">
                <p className="text-[12px] font-semibold" style={{ color: C.textMd }}>No signals detected</p>
                <p className="text-[10px] mt-1 max-w-[200px]" style={{ color: C.textMd }}>
                  {activeTab === 'all'
                    ? 'Hit "Scan" to analyse projects for risks & generate AI insights'
                    : `No ${activeTab === 'risks' ? 'risk alerts' : activeTab === 'insights' ? 'AI insights' : 'system signals'} at this time`
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="py-1.5 px-2">
              <AnimatePresence mode="popLayout">
                {filtered.map((notif, i) => {
                  const cfg = getTypeConfig(notif.type, isDark);
                  const ctxIcon = getContextIcon(notif.title);
                  const isHovered = hoveredId === notif.id;

                  return (
                    <motion.div
                      key={notif.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, height: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                      onClick={() => handleNotifClick(notif)}
                      onMouseEnter={() => setHoveredId(notif.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className="relative mb-1.5 rounded-xl cursor-pointer overflow-hidden"
                      style={{
                        background: notif.read ? (isHovered ? C.card : 'transparent') : cfg.bg,
                        border: `1px solid ${isHovered ? (notif.read ? C.borderHi : `${cfg.color}30`) : (notif.read ? 'transparent' : `${cfg.color}15`)}`,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Left Accent Bar */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
                        style={{
                          background: notif.read ? `${cfg.color}30` : cfg.barGradient,
                          boxShadow: !notif.read ? `0 0 8px ${cfg.glowColor}` : 'none',
                          animation: (!notif.read && cfg.pulses) ? 'notif-bar-pulse 1.5s ease-in-out infinite' : 'none',
                          '--pulse-color': cfg.glowColor,
                        } as React.CSSProperties}
                      />

                      <div className="flex gap-3 pl-4 pr-3 py-3">
                        {/* Icon with effects */}
                        <div className="relative flex-shrink-0 mt-0.5">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{
                              background: cfg.iconBg,
                              color: notif.read ? `${cfg.color}80` : cfg.color,
                              border: `1px solid ${cfg.color}${notif.read ? '15' : '25'}`,
                            }}
                          >
                            {cfg.icon}
                          </div>
                          {/* Radar ring for unread critical */}
                          {!notif.read && cfg.pulses && (
                            <div
                              className="absolute inset-0 rounded-xl pointer-events-none"
                              style={{
                                border: `1px solid ${cfg.color}40`,
                                animation: 'notif-radar-ring 2s ease-out infinite',
                              }}
                            />
                          )}
                          {/* Shimmer for AI insights */}
                          {!notif.read && notif.type === 'ai_insight' && (
                            <div
                              className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden"
                              style={{ opacity: 0.4 }}
                            >
                              <div
                                className="absolute inset-0"
                                style={{
                                  background: `linear-gradient(90deg, transparent 30%, ${cfg.color}40 50%, transparent 70%)`,
                                  backgroundSize: '200% 100%',
                                  animation: 'notif-shimmer 2.5s ease-in-out infinite',
                                }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Label + time row */}
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="text-[8px] font-black uppercase tracking-[0.08em] px-1.5 py-[2px] rounded-md"
                                style={{
                                  background: `${cfg.color}${notif.read ? '10' : '15'}`,
                                  color: notif.read ? `${cfg.color}90` : cfg.color,
                                }}
                              >
                                {cfg.label}
                              </span>
                              {ctxIcon && (
                                <span style={{ color: `${cfg.color}80` }}>{ctxIcon}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {!notif.read && (
                                <span
                                  className="w-[5px] h-[5px] rounded-full"
                                  style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}80` }}
                                />
                              )}
                              <span className="text-[9px] font-mono tabular-nums" style={{ color: C.textMd }}>
                                {timeAgo(notif.createdAt)}
                              </span>
                            </div>
                          </div>

                          {/* Title */}
                          <p
                            className="text-[11.5px] font-semibold leading-snug truncate"
                            style={{ color: notif.read ? C.textMd : C.textHi }}
                          >
                            {notif.title.replace(/^[^\w\s]+\s*/, '')}
                          </p>

                          {/* Message */}
                          <p
                            className="text-[10.5px] leading-[1.55] mt-0.5 line-clamp-2"
                            style={{ color: C.textMd }}
                          >
                            {notif.message}
                          </p>

                          {/* Hover action buttons */}
                          <AnimatePresence>
                            {isHovered && (
                              <motion.div
                                initial={{ opacity: 0, y: 4, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto', marginTop: 8 }}
                                exit={{ opacity: 0, y: 4, height: 0, marginTop: 0 }}
                                transition={{ duration: 0.15 }}
                                className="flex items-center gap-1.5 overflow-hidden"
                              >
                                {notif.link && (
                                  <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={e => { e.stopPropagation(); handleNotifClick(notif); }}
                                    className="flex items-center gap-1 px-2.5 py-[5px] rounded-lg text-[10px] font-semibold transition-all"
                                    style={{
                                      background: `${cfg.color}15`,
                                      color: cfg.color,
                                      border: `1px solid ${cfg.color}25`,
                                    }}
                                  >
                                    <Eye size={10} />
                                    View Details
                                    <ArrowUpRight size={9} />
                                  </motion.button>
                                )}
                                <motion.button
                                  whileHover={{ scale: 1.03 }}
                                  whileTap={{ scale: 0.97 }}
                                  onClick={e => handleDelete(e, notif.id)}
                                  className="flex items-center gap-1 px-2 py-[5px] rounded-lg text-[10px] font-medium transition-all"
                                  style={{
                                    background: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.05)',
                                    color: isDark ? '#fca5a5' : '#ef4444',
                                    border: `1px solid ${isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)'}`,
                                  }}
                                >
                                  <Trash2 size={9} />
                                  Dismiss
                                </motion.button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ═══════════════════════════ FOOTER ═══════════════════════════ */}
        <div
          className="px-4 py-2.5 flex items-center justify-between"
          style={{
            borderTop: `1px solid ${C.border}`,
            background: isDark
              ? `linear-gradient(180deg, ${C.card}, ${C.surface})`
              : `linear-gradient(180deg, ${C.card}, ${C.surface})`,
          }}
        >
          <motion.button
            whileHover={{ x: 3 }}
            onClick={() => { navigate('/early-warning'); onClose(); }}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors"
            style={{ color: C.accent }}
          >
            <Shield size={11} />
            Early Warning Center
            <ChevronRight size={10} />
          </motion.button>
          <span className="text-[9px] font-mono tabular-nums" style={{ color: C.textMd }}>
            {notifications.length} signals
          </span>
        </div>
      </motion.div>
    </>
  );
}

export default NotificationHub;
