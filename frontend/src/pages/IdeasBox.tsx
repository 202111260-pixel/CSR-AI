import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NumberFlow from '../components/ui/NumberFlowSafe';
import {
  Lightbulb, Plus, Heart, Search, Filter, X, ChevronDown,
  Trophy, TrendingUp, Clock, CheckCircle2, Eye, Trash2,
  Sparkles, Users, ThumbsUp, Calendar, Tag, Send, AlertCircle,
  Award, Crown, Medal, Star, BarChart3, ArrowUpRight,
  FileSpreadsheet, FileText, Printer,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, BarChart, Bar, Cell,
} from 'recharts';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../stores/authStore';
import { ideaService, type Idea } from '../services/ideaService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useToast } from '../components/common/Toast';
import { exportToExcel, printTable, type ExportColumn } from '../utils/exportUtils';
import { generateIdeasPDF } from '../utils/pdfReportGenerator';

// ─── Framer Variants ────────────────────────────────────────────────────────
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};
const stagger = (delay = 0) => ({
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay } },
});
const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: EASE } },
};

// ─── Status Configuration ───────────────────────────────────────────────────
const statusCfg = {
  pending:      { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   text: '#fde68a', label: 'Pending',      icon: Clock         },
  under_review: { color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',   text: '#7dd3fc', label: 'Under Review', icon: Eye           },
  approved:     { color: '#34d399', bg: 'rgba(52,211,153,0.1)',    text: '#6ee7b7', label: 'Approved',     icon: CheckCircle2  },
  rejected:     { color: '#f87171', bg: 'rgba(248,113,113,0.1)',   text: '#fca5a5', label: 'Rejected',     icon: AlertCircle   },
} as const;

// ─── NLP Category Colors ────────────────────────────────────────────────────
const nlpCategoryColors: Record<string, string> = {
  Education:      '#C9C036',
  Healthcare:     '#38bdf8',
  Environment:    '#34d399',
  Infrastructure: '#fbbf24',
  Community:      '#a78bfa',
  Technology:     '#f472b6',
  Culture:        '#fb923c',
  Economy:        '#06b6d4',
  Other:          '#6B6849',
};

// ─── API Data Types ─────────────────────────────────────────────────────────
interface IdeaStats {
  totalIdeas: number;
  byStatus: Record<string, number>;
  topVoted: any[];
  recentIdeas: any[];
  trend: { month: string; count: number }[];
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  email: string;
  department: string | null;
  avatarUrl: string | null;
  totalVotesReceived: number;
  ideaCount: number;
}

// ─── Tab Type ───────────────────────────────────────────────────────────────
type TabKey = 'all' | 'top_voted' | 'my_ideas' | 'leaderboard';
type StatusFilter = 'all' | 'pending' | 'under_review' | 'approved' | 'rejected';

// ─── Helpers ────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

// ═════════════════════════════════════════════════════════════════════════════
// GlassCard - Reusable card container
// ═════════════════════════════════════════════════════════════════════════════
function GlassCard({
  children,
  className = '',
  style = {},
  P,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  P: Record<string, string>;
}) {
  return (
    <div
      className={className}
      style={{
        background: `linear-gradient(168deg, ${P.card} 0%, ${P.bg} 100%)`,
        border: `1px solid ${P.border}`,
        borderRadius: 20,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 0 40px rgba(0,0,0,0.3)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Submit Idea Modal
// ═════════════════════════════════════════════════════════════════════════════
function SubmitIdeaModal({
  isOpen,
  onClose,
  P,
  onSubmit,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  P: Record<string, string>;
  onSubmit: (data: { title: string; description: string }) => void;
  isSubmitting: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});

  const validate = useCallback(() => {
    const errs: { title?: string; description?: string } = {};
    if (!title.trim() || title.trim().length < 5) errs.title = 'Title must be at least 5 characters';
    if (title.trim().length > 200) errs.title = 'Title must be under 200 characters';
    if (!description.trim() || description.trim().length < 20) errs.description = 'Description must be at least 20 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [title, description]);

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({ title: title.trim(), description: description.trim() });
    setTitle('');
    setDescription('');
    setErrors({});
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setErrors({});
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.78)' }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-full max-w-lg rounded-2xl p-6"
              style={{
                background: `linear-gradient(168deg, ${P.card} 0%, ${P.surface} 100%)`,
                border: `1px solid ${P.borderHi}`,
                boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: `rgba(201,192,54,0.12)` }}
                  >
                    <Lightbulb size={20} style={{ color: P.accent }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: P.textHi }}>Submit New Idea</h2>
                    <p className="text-xs" style={{ color: P.textLo }}>Share your CSR innovation</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ background: P.cardHi }}
                >
                  <X size={16} style={{ color: P.textMd }} />
                </motion.button>
              </div>

              {/* Title Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: P.textMd }}>
                  Idea Title <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your idea a compelling title..."
                  maxLength={200}
                  className="w-full px-4 py-3 rounded-full text-sm outline-none transition-all duration-200"
                  style={{
                    background: P.bg,
                    border: `1px solid ${errors.title ? '#f87171' : P.border}`,
                    color: P.textHi,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = P.accent)}
                  onBlur={(e) => (e.target.style.borderColor = errors.title ? '#f87171' : P.border)}
                />
                <div className="flex justify-between mt-1">
                  {errors.title && (
                    <span className="text-xs" style={{ color: '#f87171' }}>{errors.title}</span>
                  )}
                  <span className="text-xs ml-auto" style={{ color: P.textDim }}>
                    {title.length}/200
                  </span>
                </div>
              </div>

              {/* Description Textarea */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2" style={{ color: P.textMd }}>
                  Description <span style={{ color: '#f87171' }}>*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your idea in detail. What problem does it solve? How would it benefit the community? (min 20 characters)"
                  rows={5}
                  className="w-full px-4 py-3 rounded-full text-sm outline-none resize-none transition-all duration-200"
                  style={{
                    background: P.bg,
                    border: `1px solid ${errors.description ? '#f87171' : P.border}`,
                    color: P.textHi,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = P.accent)}
                  onBlur={(e) => (e.target.style.borderColor = errors.description ? '#f87171' : P.border)}
                />
                <div className="flex justify-between mt-1">
                  {errors.description && (
                    <span className="text-xs" style={{ color: '#f87171' }}>{errors.description}</span>
                  )}
                  <span className="text-xs ml-auto" style={{ color: description.length >= 20 ? '#34d399' : P.textDim }}>
                    {description.length} chars {description.length < 20 ? `(${20 - description.length} more needed)` : ''}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 justify-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleClose}
                  className="px-5 py-2.5 rounded-full text-sm font-medium"
                  style={{ color: P.textMd, border: `1px solid ${P.border}` }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-opacity"
                  style={{
                    background: P.accent,
                    color: P.bg,
                    opacity: isSubmitting ? 0.6 : 1,
                  }}
                >
                  {isSubmitting ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Send size={15} />
                  )}
                  {isSubmitting ? 'Submitting...' : 'Submit Idea'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Idea Card Component
// ═════════════════════════════════════════════════════════════════════════════
function IdeaCard({
  idea,
  index,
  P,
  onVote,
  isVoting,
  onStatusChange,
  onDelete,
  canManage,
  canDelete,
}: {
  idea: Idea;
  index: number;
  P: Record<string, string>;
  onVote: (id: string) => void;
  isVoting: boolean;
  onStatusChange?: (id: string, status: string) => void;
  onDelete?: (id: string) => void;
  canManage?: boolean;
  canDelete?: boolean;
}) {
  const status = statusCfg[idea.status];
  const StatusIcon = status.icon;
  const categoryColor = nlpCategoryColors[idea.nlpCategory || 'Other'] || '#6B6849';
  const [isExpanded, setIsExpanded] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  return (
    <motion.div
      variants={stagger(index * 0.06)}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="relative overflow-hidden rounded-[20px] p-5"
      style={{
        background: `linear-gradient(168deg, ${P.card} 0%, ${P.bg} 100%)`,
        border: `1px solid ${P.border}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 0 40px rgba(0,0,0,0.3)',
      }}
    >
      {/* Subtle top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px]"
        style={{ background: `linear-gradient(90deg, transparent, ${categoryColor}40, transparent)` }}
      />

      {/* Header: Status Badge + Category Tag + Actions */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Status badge */}
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
            style={{ background: status.bg, color: status.text, border: `1px solid ${status.color}25` }}
          >
            <StatusIcon size={12} />
            {status.label}
          </span>

          {/* NLP Category tag */}
          {idea.nlpCategory && (
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
              style={{
                background: `${categoryColor}15`,
                color: categoryColor,
                border: `1px solid ${categoryColor}25`,
              }}
            >
              <Tag size={10} />
              {idea.nlpCategory}
            </span>
          )}
        </div>

        {/* Date + Action buttons */}
        <div className="flex items-center gap-2">
          {/* Status change for admin/manager */}
          {canManage && (
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
                style={{
                  background: `${P.accent}12`,
                  color: P.accent,
                  border: `1px solid ${P.accent}25`,
                }}
                title="Change Status"
              >
                <CheckCircle2 size={11} />
                <ChevronDown size={10} />
              </motion.button>
              <AnimatePresence>
                {showStatusMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1 z-30 rounded-xl overflow-hidden py-1"
                    style={{
                      background: P.card,
                      border: `1px solid ${P.border}`,
                      boxShadow: '0 15px 40px rgba(0,0,0,0.3)',
                      minWidth: 140,
                    }}
                  >
                    {(Object.entries(statusCfg) as [string, typeof statusCfg[keyof typeof statusCfg]][]).map(([key, cfg]) => {
                      if (key === idea.status) return null;
                      const CfgIcon = cfg.icon;
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            onStatusChange?.(idea.id, key);
                            setShowStatusMenu(false);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium hover:opacity-80 transition-opacity"
                          style={{ color: cfg.color }}
                        >
                          <CfgIcon size={12} />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Delete button */}
          {canDelete && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onDelete?.(idea.id)}
              className="flex items-center justify-center w-7 h-7 rounded-lg"
              style={{
                background: 'rgba(248,113,113,0.1)',
                border: '1px solid rgba(248,113,113,0.2)',
              }}
              title="Delete Idea"
            >
              <Trash2 size={12} style={{ color: '#f87171' }} />
            </motion.button>
          )}

          <span className="text-xs flex items-center gap-1" style={{ color: P.textLo }}>
            <Calendar size={11} />
            {timeAgo(idea.createdAt)}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3
        className="text-base font-semibold mb-2 leading-snug"
        style={{ color: P.textHi }}
      >
        {idea.title}
      </h3>

      {/* Description */}
      <p
        className="text-sm leading-relaxed mb-4 cursor-pointer"
        style={{ color: P.textMd }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? idea.description : idea.description.length > 120
          ? idea.description.substring(0, 120) + '...'
          : idea.description}
        {idea.description.length > 120 && (
          <span className="ml-1 text-xs font-medium" style={{ color: P.accent }}>
            {isExpanded ? 'Show less' : 'Read more'}
          </span>
        )}
      </p>

      {/* Footer: Author + Vote */}
      <div className="flex items-center justify-between pt-3" style={{ borderTop: `1px solid ${P.border}` }}>
        {/* Author */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
            style={{
              background: `linear-gradient(135deg, ${P.accent}30, ${P.accentLo}30)`,
              color: P.accent,
              border: `1px solid ${P.accent}25`,
            }}
          >
            {idea.user ? getInitials(idea.user.name) : '?'}
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: P.textHi }}>
              {idea.user?.name || 'Anonymous'}
            </p>
          </div>
        </div>

        {/* Vote button */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => onVote(idea.id)}
          disabled={isVoting}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium transition-all"
          style={{
            background: idea.hasVoted ? `rgba(248,113,113,0.1)` : P.cardHi,
            border: `1px solid ${idea.hasVoted ? 'rgba(248,113,113,0.25)' : P.border}`,
            color: idea.hasVoted ? '#f87171' : P.textMd,
          }}
        >
          <Heart
            size={15}
            fill={idea.hasVoted ? '#f87171' : 'none'}
            style={{ color: idea.hasVoted ? '#f87171' : P.textLo }}
          />
          <span>{idea.votes}</span>
        </motion.button>
      </div>
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Leaderboard Row
// ═════════════════════════════════════════════════════════════════════════════
function LeaderboardRow({
  entry,
  index,
  P,
}: {
  entry: LeaderboardEntry;
  index: number;
  P: Record<string, string>;
}) {
  const rankIcons = [Crown, Medal, Award];
  const rankColors = ['#fbbf24', '#94a3b8', '#cd7f32'];
  const RankIcon = index < 3 ? rankIcons[index] : null;
  const rankColor = index < 3 ? rankColors[index] : P.textLo;

  return (
    <motion.div
      variants={stagger(index * 0.06)}
      whileHover={{ x: 4 }}
      className="flex items-center gap-4 px-4 py-3.5 rounded-full transition-colors"
      style={{
        background: index < 3 ? `${rankColor}08` : 'transparent',
        border: `1px solid ${index < 3 ? `${rankColor}20` : 'transparent'}`,
      }}
    >
      {/* Rank */}
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold flex-shrink-0"
        style={{
          background: index < 3 ? `${rankColor}18` : P.cardHi,
          color: rankColor,
        }}
      >
        {RankIcon ? <RankIcon size={18} /> : entry.rank}
      </div>

      {/* Avatar + Name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${P.accent}25, ${P.accentLo}25)`,
            color: P.accent,
          }}
        >
          {getInitials(entry.name)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: P.textHi }}>{entry.name}</p>
          <p className="text-xs" style={{ color: P.textLo }}>{entry.ideaCount} ideas</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-5 flex-shrink-0">
        <div className="text-right">
          <p className="text-sm font-bold" style={{ color: P.textHi }}>{entry.ideaCount}</p>
          <p className="text-xs" style={{ color: P.textLo }}>Ideas</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold flex items-center gap-1" style={{ color: '#f87171' }}>
            <Heart size={12} fill="#f87171" />
            {entry.totalVotesReceived}
          </p>
          <p className="text-xs" style={{ color: P.textLo }}>Votes</p>
        </div>
      </div>
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function IdeasBox() {
  const P = useTheme().colors;
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  // ─── State ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'most_voted'>('newest');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const toast = useToast();

  // ─── API Queries ────────────────────────────────────────────────────────
  const ideasQuery = useQuery({
    queryKey: ['ideas', activeTab, statusFilter, searchQuery, sortBy],
    queryFn: () => ideaService.getIdeas({
      tab: activeTab,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      search: searchQuery || undefined,
      sortBy: sortBy === 'most_voted' ? 'votes' : 'createdAt',
      sortOrder: 'desc',
    }),
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const statsQuery = useQuery({
    queryKey: ['idea-stats'],
    queryFn: () => ideaService.getIdeaStats(),
    staleTime: 5 * 60 * 1000,
  });

  const leaderboardQuery = useQuery({
    queryKey: ['idea-leaderboard'],
    queryFn: () => ideaService.getLeaderboard(),
    staleTime: 5 * 60 * 1000,
  });

  // ─── Mutations ──────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: ideaService.createIdea,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      queryClient.invalidateQueries({ queryKey: ['idea-stats'] });
      setIsModalOpen(false);
    },
  });

  const voteMutation = useMutation({
    mutationFn: ideaService.toggleVote,
    onMutate: async (ideaId) => {
      // Optimistic update on the local ideas list
      await queryClient.cancelQueries({ queryKey: ['ideas'] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      queryClient.invalidateQueries({ queryKey: ['idea-stats'] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ideaService.updateIdea(id, { status } as Partial<Idea>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      queryClient.invalidateQueries({ queryKey: ['idea-stats'] });
      toast.success('Status Updated', 'Idea status has been updated successfully.');
    },
    onError: () => {
      toast.error('Update Failed', 'Failed to update idea status. Please try again.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ideaService.deleteIdea,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      queryClient.invalidateQueries({ queryKey: ['idea-stats'] });
      setDeleteConfirmId(null);
      toast.success('Idea Deleted', 'The idea has been removed successfully.');
    },
    onError: () => {
      toast.error('Delete Failed', 'Failed to delete idea. Please try again.');
    },
  });

  // ─── Derived Data (API only) ───────────────────────────────────────────────
  const stats = useMemo(() => {
    const data = statsQuery.data?.data as IdeaStats | undefined;
    if (!data) return { total: 0, approved: 0, underReview: 0, pending: 0, rejected: 0, totalVotes: 0, trend: [] as { month: string; count: number }[] };
    return {
      total: data.totalIdeas ?? 0,
      approved: data.byStatus?.approved ?? 0,
      underReview: data.byStatus?.under_review ?? 0,
      pending: data.byStatus?.pending ?? 0,
      rejected: data.byStatus?.rejected ?? 0,
      totalVotes: (data.topVoted ?? []).reduce((sum: number, i: any) => sum + (i.votes ?? 0), 0),
      trend: data.trend ?? [],
    };
  }, [statsQuery.data]);

  const ideas = useMemo(() => {
    return ideasQuery.data?.data?.items ?? [];
  }, [ideasQuery.data]);

  const leaderboard = useMemo(() => {
    return (leaderboardQuery.data?.data ?? []) as LeaderboardEntry[];
  }, [leaderboardQuery.data]);

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const idea of ideas) {
      const cat = idea.nlpCategory || 'Other';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [ideas]);

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleVote = useCallback((ideaId: string) => {
    voteMutation.mutate(ideaId);
  }, [voteMutation]);

  const handleSubmitIdea = useCallback((data: { title: string; description: string }) => {
    createMutation.mutate(data);
  }, [createMutation]);

  const handleStatusChange = useCallback((ideaId: string, newStatus: string) => {
    statusMutation.mutate({ id: ideaId, status: newStatus });
  }, [statusMutation]);

  const handleDeleteIdea = useCallback(() => {
    if (deleteConfirmId) {
      deleteMutation.mutate(deleteConfirmId);
    }
  }, [deleteConfirmId, deleteMutation]);

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const canManageStatus = isAdmin || isManager;

  // ─── Export Configuration ──────────────────────────────────────────────
  const ideaExportColumns: ExportColumn[] = useMemo(() => [
    { key: 'title', header: 'Title' },
    { key: 'description', header: 'Description' },
    { key: 'author', header: 'Author' },
    { key: 'status', header: 'Status' },
    { key: 'nlpCategory', header: 'Category' },
    { key: 'votes', header: 'Votes', format: 'number' },
    { key: 'createdAt', header: 'Submitted', format: 'date' },
  ], []);

  const getExportData = useCallback(() => {
    return ideas.map((idea: Idea) => ({
      title: idea.title,
      description: idea.description,
      author: (idea.user as any)?.name || 'Anonymous',
      status: statusCfg[idea.status as keyof typeof statusCfg]?.label || idea.status,
      nlpCategory: idea.nlpCategory || 'Other',
      votes: idea.votes || 0,
      createdAt: idea.createdAt,
    }));
  }, [ideas]);

  const handleExportExcel = useCallback(() => {
    const data = getExportData();
    exportToExcel(data, {
      filename: `Ideas_Export_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Ideas',
      columns: ideaExportColumns,
      title: 'Ideas Hub Report',
    });
  }, [getExportData, ideaExportColumns]);

  const handleExportPDF = useCallback(() => {
    const statusCounts: Record<string, number> = {};
    ideas.forEach((idea: Idea) => {
      const s = idea.status || 'pending';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });
    const statusColors: Record<string, string> = { approved: '#34d399', under_review: '#38bdf8', pending: '#fbbf24', rejected: '#f87171' };
    generateIdeasPDF({
      kpis: [
        { label: 'Total Ideas', value: stats.total, format: 'number' },
        { label: 'Approved', value: stats.approved, format: 'number' },
        { label: 'Under Review', value: stats.underReview, format: 'number' },
        { label: 'Total Votes', value: stats.totalVotes, format: 'number' },
      ],
      ideas: ideas.map((idea: Idea) => ({
        title: idea.title,
        author: (idea.user as any)?.name || 'Anonymous',
        status: statusCfg[idea.status as keyof typeof statusCfg]?.label || idea.status,
        category: idea.nlpCategory || 'Other',
        votes: idea.votes || 0,
        createdAt: idea.createdAt,
      })),
      statusDistribution: Object.entries(statusCounts).map(([name, value]) => ({
        name: statusCfg[name as keyof typeof statusCfg]?.label || name,
        value,
        color: statusColors[name] || '#94a3b8',
      })),
    });
  }, [ideas, stats]);

  const handlePrint = useCallback(() => {
    const data = getExportData();
    printTable(data, ideaExportColumns, 'Ideas Hub Report');
  }, [getExportData, ideaExportColumns]);

  // ─── Tabs Config ────────────────────────────────────────────────────────
  const tabs: { key: TabKey; label: string; icon: typeof Lightbulb }[] = [
    { key: 'all',         label: 'All Ideas',    icon: Lightbulb     },
    { key: 'top_voted',   label: 'Top Voted',    icon: TrendingUp    },
    { key: 'my_ideas',    label: 'My Ideas',     icon: Users         },
    { key: 'leaderboard', label: 'Leaderboard',  icon: Trophy        },
  ];

  // ─── KPI Cards Config ──────────────────────────────────────────────────
  const kpis = [
    { title: 'Total Ideas',   value: stats.total,       icon: Lightbulb,    iconBg: `rgba(201,192,54,0.15)`,   iconColor: P.accent, trend: { value: 18, isPositive: true }  },
    { title: 'Approved',      value: stats.approved,     icon: CheckCircle2, iconBg: `rgba(52,211,153,0.15)`,   iconColor: '#34d399', trend: { value: 12, isPositive: true }  },
    { title: 'Under Review',  value: stats.underReview,  icon: Eye,          iconBg: `rgba(56,189,248,0.15)`,   iconColor: '#38bdf8', trend: { value: 5, isPositive: true }   },
    { title: 'Pending',       value: stats.pending,      icon: Clock,        iconBg: `rgba(251,191,36,0.15)`,   iconColor: '#fbbf24', trend: { value: 3, isPositive: false }  },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial="hidden"
      animate="show"
      className="min-h-screen p-6"
      style={{ background: P.bg }}
    >
      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* Page Header                                                        */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={fadeUp} className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: `rgba(201,192,54,0.1)`, border: `1px solid ${P.accent}20` }}
          >
            <Lightbulb size={24} style={{ color: P.accent }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: P.textHi }}>Ideas Hub</h1>
            <p className="text-sm mt-0.5" style={{ color: P.textMd }}>
              Submit, vote and track innovative CSR ideas for Oman
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Export buttons */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
            style={{ background: P.surface, color: P.textMd, border: `1px solid ${P.border}` }}
          >
            <FileSpreadsheet size={15} />
            <span className="hidden sm:inline">Excel</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
            style={{ background: P.surface, color: P.textMd, border: `1px solid ${P.border}` }}
          >
            <FileText size={15} />
            <span className="hidden sm:inline">PDF</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
            style={{ background: P.surface, color: P.textMd, border: `1px solid ${P.border}` }}
          >
            <Printer size={15} />
            <span className="hidden sm:inline">Print</span>
          </motion.button>
          {/* Submit Idea button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold"
            style={{ background: P.accent, color: P.bg }}
          >
            <Plus size={16} />
            Submit Idea
          </motion.button>
        </div>
      </motion.div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* KPI Row                                                            */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.title}
              variants={stagger(i * 0.08)}
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="relative overflow-hidden rounded-[20px] p-5"
              style={{
                background: `linear-gradient(168deg, ${P.card} 0%, ${P.bg} 100%)`,
                border: `1px solid ${P.border}`,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 0 40px rgba(0,0,0,0.3)',
              }}
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent" />
              <div className="relative flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: P.textMd }}>{kpi.title}</p>
                  <div className="mt-2.5">
                    <span className="text-3xl font-bold tracking-tight" style={{ color: P.textHi }}>
                      <NumberFlow value={kpi.value} trend={1} />
                    </span>
                  </div>
                  {kpi.trend && (
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <TrendingUp
                        className="h-3.5 w-3.5"
                        style={{ color: kpi.trend.isPositive ? '#34d399' : '#f87171' }}
                      />
                      <span
                        className="text-xs font-medium"
                        style={{ color: kpi.trend.isPositive ? '#34d399' : '#f87171' }}
                      >
                        {kpi.trend.isPositive ? '+' : '-'}{Math.abs(kpi.trend.value)}%
                      </span>
                      <span className="text-xs" style={{ color: P.textDim }}>vs last month</span>
                    </div>
                  )}
                </div>
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: kpi.iconBg }}
                >
                  <Icon size={20} style={{ color: kpi.iconColor }} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* Tabs + Search/Filter Bar                                           */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={fadeUp} className="mb-6">
        {/* Tabs */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <motion.button
                  key={tab.key}
                  whileHover={{ scale: isActive ? 1 : 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab(tab.key)}
                  className="relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    color: isActive ? P.bg : P.textMd,
                    background: isActive ? P.accent : 'transparent',
                  }}
                >
                  <Icon size={15} />
                  {tab.label}
                </motion.button>
              );
            })}
          </div>

          {/* Sort */}
          {activeTab !== 'leaderboard' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: P.textLo }}>Sort by:</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'newest' | 'most_voted')}
                  className="appearance-none pl-3 pr-8 py-2 rounded-lg text-sm font-medium outline-none cursor-pointer"
                  style={{
                    background: P.surface,
                    border: `1px solid ${P.border}`,
                    color: P.textHi,
                  }}
                >
                  <option value="newest">Newest First</option>
                  <option value="most_voted">Most Voted</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: P.textLo }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Search + Status Filter (visible on non-leaderboard tabs) */}
        {activeTab !== 'leaderboard' && (
          <div className="flex items-center gap-3">
            {/* Search */}
            <div
              className="flex items-center gap-2.5 flex-1 px-4 py-2.5 rounded-full"
              style={{ background: P.surface, border: `1px solid ${P.border}` }}
            >
              <Search size={16} style={{ color: P.textLo }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ideas by title, description, or category..."
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: P.textHi }}
              />
              {searchQuery && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSearchQuery('')}
                  className="flex h-5 w-5 items-center justify-center rounded-full"
                  style={{ background: P.cardHi }}
                >
                  <X size={11} style={{ color: P.textMd }} />
                </motion.button>
              )}
            </div>

            {/* Filter Toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium"
              style={{
                background: showFilters ? `${P.accent}15` : P.surface,
                border: `1px solid ${showFilters ? `${P.accent}40` : P.border}`,
                color: showFilters ? P.accent : P.textMd,
              }}
            >
              <Filter size={15} />
              Filters
            </motion.button>
          </div>
        )}

        {/* Status Filter Pills */}
        <AnimatePresence>
          {showFilters && activeTab !== 'leaderboard' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: `1px solid ${P.border}` }}>
                <span className="text-xs font-medium mr-1" style={{ color: P.textLo }}>Status:</span>
                {(['all', 'pending', 'under_review', 'approved', 'rejected'] as StatusFilter[]).map((s) => {
                  const isActive = statusFilter === s;
                  const cfg = s !== 'all' ? statusCfg[s] : null;
                  return (
                    <motion.button
                      key={s}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setStatusFilter(s)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: isActive ? (cfg ? cfg.bg : `${P.accent}15`) : 'transparent',
                        border: `1px solid ${isActive ? (cfg ? `${cfg.color}40` : `${P.accent}40`) : P.border}`,
                        color: isActive ? (cfg ? cfg.text : P.accent) : P.textLo,
                      }}
                    >
                      {cfg && <div className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.color }} />}
                      {s === 'all' ? 'All' : cfg?.label}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* Main Content Area                                                   */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab !== 'leaderboard' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* ──── Ideas Grid (2/3 width) ──── */}
          <div className="xl:col-span-2">
            {ideasQuery.isLoading ? (
              <div className="flex items-center justify-center py-20">
                <LoadingSpinner size="lg" />
              </div>
            ) : ideasQuery.isError ? (
              <GlassCard P={P} className="p-0">
                <EmptyState
                  variant="error"
                  title="Failed to load ideas"
                  message="Something went wrong while fetching ideas. Please try again."
                  actionLabel="Retry"
                  onAction={() => ideasQuery.refetch()}
                />
              </GlassCard>
            ) : ideas.length === 0 ? (
              <GlassCard P={P} className="p-0">
                <EmptyState
                  variant={searchQuery ? 'search' : statusFilter !== 'all' ? 'filter' : 'default'}
                  title={
                    searchQuery
                      ? 'No ideas found'
                      : activeTab === 'my_ideas'
                        ? 'No ideas submitted yet'
                        : 'No ideas to show'
                  }
                  message={
                    searchQuery
                      ? `No ideas match "${searchQuery}". Try a different search term.`
                      : activeTab === 'my_ideas'
                        ? 'Be the first to submit an innovative CSR idea!'
                        : 'No ideas available with the selected filters.'
                  }
                  actionLabel={activeTab === 'my_ideas' ? 'Submit Idea' : undefined}
                  onAction={activeTab === 'my_ideas' ? () => setIsModalOpen(true) : undefined}
                />
              </GlassCard>
            ) : (
              <motion.div
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {ideas.map((idea, i) => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    index={i}
                    P={P}
                    onVote={handleVote}
                    isVoting={voteMutation.isPending}
                    onStatusChange={handleStatusChange}
                    onDelete={(id) => setDeleteConfirmId(id)}
                    canManage={canManageStatus}
                    canDelete={isAdmin || idea.userId === user?.id}
                  />
                ))}
              </motion.div>
            )}

            {/* Results summary */}
            {ideas.length > 0 && (
              <motion.div variants={fadeUp} className="mt-4 text-center">
                <p className="text-xs" style={{ color: P.textLo }}>
                  Showing {ideas.length} idea{ideas.length !== 1 ? 's' : ''}
                  {statusFilter !== 'all' && ` with status "${statusCfg[statusFilter].label}"`}
                  {searchQuery && ` matching "${searchQuery}"`}
                </p>
              </motion.div>
            )}
          </div>

          {/* ──── Right Sidebar ──── */}
          <div className="xl:col-span-1 flex flex-col gap-6">
            {/* Ideas Trend Chart */}
            <motion.div variants={stagger(0.2)}>
              <GlassCard P={P} className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={16} style={{ color: P.accent }} />
                  <h3 className="text-sm font-semibold" style={{ color: P.textHi }}>Ideas Trend</h3>
                  <span className="text-xs ml-auto" style={{ color: P.textLo }}>Last 6 months</span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={stats.trend}>
                    <defs>
                      <linearGradient id="ideasGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={P.accent} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={P.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: P.textLo, fontSize: 11 }}
                      axisLine={{ stroke: P.border }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: P.textLo, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: P.card,
                        border: `1px solid ${P.borderHi}`,
                        borderRadius: 12,
                        boxShadow: '0 15px 40px rgba(0,0,0,0.4)',
                        fontSize: 12,
                        color: P.textHi,
                      }}
                      itemStyle={{ color: P.textMd }}
                      labelStyle={{ color: P.textHi, fontWeight: 600, marginBottom: 4 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke={P.accent}
                      strokeWidth={2}
                      fill="url(#ideasGradient)"
                      name="Submitted"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </GlassCard>
            </motion.div>

            {/* Category Breakdown */}
            <motion.div variants={stagger(0.3)}>
              <GlassCard P={P} className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Tag size={16} style={{ color: P.accent }} />
                  <h3 className="text-sm font-semibold" style={{ color: P.textHi }}>By Category</h3>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={categoryData} layout="vertical" barCategoryGap={6}>
                    <CartesianGrid strokeDasharray="3 3" stroke={P.border} horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: P.textLo, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={85}
                      tick={{ fill: P.textMd, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: P.card,
                        border: `1px solid ${P.borderHi}`,
                        borderRadius: 12,
                        boxShadow: '0 15px 40px rgba(0,0,0,0.4)',
                        fontSize: 12,
                        color: P.textHi,
                      }}
                      itemStyle={{ color: P.textMd }}
                      labelStyle={{ color: P.textHi, fontWeight: 600 }}
                      formatter={(value: number) => [`${value} ideas`, 'Count']}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={18}>
                      {categoryData.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={nlpCategoryColors[entry.name] || P.accent}
                          fillOpacity={0.7}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>
            </motion.div>

            {/* Top Contributors Mini */}
            <motion.div variants={stagger(0.4)}>
              <GlassCard P={P} className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Trophy size={16} style={{ color: '#fbbf24' }} />
                    <h3 className="text-sm font-semibold" style={{ color: P.textHi }}>Top Contributors</h3>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveTab('leaderboard')}
                    className="flex items-center gap-1 text-xs font-medium"
                    style={{ color: P.accent }}
                  >
                    View all
                    <ArrowUpRight size={12} />
                  </motion.button>
                </div>
                <div className="flex flex-col gap-2.5">
                  {leaderboard.slice(0, 4).map((entry, i) => {
                    const rankColors = ['#fbbf24', '#94a3b8', '#cd7f32', P.textLo];
                    return (
                      <div
                        key={entry.rank}
                        className="flex items-center gap-3 py-2"
                        style={{ borderBottom: i < 3 ? `1px solid ${P.border}` : 'none' }}
                      >
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold"
                          style={{ background: `${rankColors[i]}18`, color: rankColors[i] }}
                        >
                          {entry.rank}
                        </span>
                        <div
                          className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold"
                          style={{
                            background: `linear-gradient(135deg, ${P.accent}25, ${P.accentLo}25)`,
                            color: P.accent,
                          }}
                        >
                          {getInitials(entry.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: P.textHi }}>
                            {entry.name}
                          </p>
                          <p className="text-[10px]" style={{ color: P.textLo }}>
                            {entry.ideaCount} ideas
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart size={11} fill="#f87171" style={{ color: '#f87171' }} />
                          <span className="text-xs font-semibold" style={{ color: P.textHi }}>
                            {entry.totalVotesReceived}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </motion.div>

            {/* Quick Stats */}
            <motion.div variants={stagger(0.5)}>
              <GlassCard P={P} className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={16} style={{ color: P.accent }} />
                  <h3 className="text-sm font-semibold" style={{ color: P.textHi }}>Quick Stats</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Total Votes', value: stats.totalVotes, icon: ThumbsUp, color: '#f87171' },
                    { label: 'Approval Rate', value: stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0, icon: CheckCircle2, color: '#34d399', suffix: '%' },
                    { label: 'This Month', value: stats.trend.length > 0 ? stats.trend[stats.trend.length - 1].count : 0, icon: Calendar, color: '#38bdf8' },
                    { label: 'Contributors', value: leaderboard.length, icon: Users, color: '#a78bfa' },
                  ].map((stat, i) => {
                    const StatIcon = stat.icon;
                    return (
                      <div
                        key={stat.label}
                        className="flex flex-col items-center py-3 rounded-full"
                        style={{ background: `${stat.color}08`, border: `1px solid ${stat.color}15` }}
                      >
                        <StatIcon size={16} style={{ color: stat.color }} />
                        <span className="text-lg font-bold mt-1" style={{ color: P.textHi }}>
                          {stat.value}{stat.suffix || ''}
                        </span>
                        <span className="text-[10px] font-medium" style={{ color: P.textLo }}>
                          {stat.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      ) : (
        /* ════════════════════════════════════════════════════════════════════ */
        /* Leaderboard Tab                                                     */
        /* ════════════════════════════════════════════════════════════════════ */
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Leaderboard List */}
          <div className="xl:col-span-2">
            <GlassCard P={P} className="p-5">
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(251,191,36,0.12)' }}
                >
                  <Trophy size={20} style={{ color: '#fbbf24' }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: P.textHi }}>Leaderboard</h2>
                  <p className="text-xs" style={{ color: P.textLo }}>Top idea contributors ranked by votes and approved ideas</p>
                </div>
              </div>

              {leaderboardQuery.isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <LoadingSpinner size="md" />
                </div>
              ) : (
                <motion.div initial="hidden" animate="show" className="flex flex-col gap-2">
                  {leaderboard.map((entry, i) => (
                    <LeaderboardRow key={entry.rank} entry={entry} index={i} P={P} />
                  ))}
                </motion.div>
              )}
            </GlassCard>
          </div>

          {/* Leaderboard Sidebar */}
          <div className="xl:col-span-1 flex flex-col gap-6">
            {/* Podium */}
            <motion.div variants={stagger(0.2)}>
              <GlassCard P={P} className="p-5">
                <h3 className="text-sm font-semibold mb-5 text-center" style={{ color: P.textHi }}>Top 3 Innovators</h3>
                <div className="flex items-end justify-center gap-4">
                  {/* 2nd Place */}
                  {leaderboard[1] && (
                    <div className="flex flex-col items-center">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold mb-2"
                        style={{
                          background: 'linear-gradient(135deg, #94a3b830, #64748b30)',
                          color: '#94a3b8',
                          border: '2px solid #94a3b840',
                        }}
                      >
                        {getInitials(leaderboard[1].name)}
                      </div>
                      <div
                        className="w-16 rounded-t-lg flex items-center justify-center py-3"
                        style={{ background: '#94a3b815', height: 60 }}
                      >
                        <span className="text-lg font-bold" style={{ color: '#94a3b8' }}>2</span>
                      </div>
                      <p className="text-xs font-medium mt-2 text-center" style={{ color: P.textMd }}>
                        {leaderboard[1].name.split(' ')[0]}
                      </p>
                      <p className="text-[10px]" style={{ color: P.textLo }}>{leaderboard[1].totalVotesReceived} votes</p>
                    </div>
                  )}

                  {/* 1st Place */}
                  {leaderboard[0] && (
                    <div className="flex flex-col items-center -mt-4">
                      <Crown size={20} style={{ color: '#fbbf24' }} className="mb-1" />
                      <div
                        className="flex h-14 w-14 items-center justify-center rounded-full text-sm font-bold mb-2"
                        style={{
                          background: 'linear-gradient(135deg, #fbbf2430, #f59e0b30)',
                          color: '#fbbf24',
                          border: '2px solid #fbbf2440',
                        }}
                      >
                        {getInitials(leaderboard[0].name)}
                      </div>
                      <div
                        className="w-16 rounded-t-lg flex items-center justify-center py-3"
                        style={{ background: '#fbbf2415', height: 80 }}
                      >
                        <span className="text-xl font-bold" style={{ color: '#fbbf24' }}>1</span>
                      </div>
                      <p className="text-xs font-semibold mt-2 text-center" style={{ color: P.textHi }}>
                        {leaderboard[0].name.split(' ')[0]}
                      </p>
                      <p className="text-[10px]" style={{ color: P.textLo }}>{leaderboard[0].totalVotesReceived} votes</p>
                    </div>
                  )}

                  {/* 3rd Place */}
                  {leaderboard[2] && (
                    <div className="flex flex-col items-center">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold mb-2"
                        style={{
                          background: 'linear-gradient(135deg, #cd7f3230, #a0522d30)',
                          color: '#cd7f32',
                          border: '2px solid #cd7f3240',
                        }}
                      >
                        {getInitials(leaderboard[2].name)}
                      </div>
                      <div
                        className="w-16 rounded-t-lg flex items-center justify-center py-3"
                        style={{ background: '#cd7f3215', height: 45 }}
                      >
                        <span className="text-lg font-bold" style={{ color: '#cd7f32' }}>3</span>
                      </div>
                      <p className="text-xs font-medium mt-2 text-center" style={{ color: P.textMd }}>
                        {leaderboard[2].name.split(' ')[0]}
                      </p>
                      <p className="text-[10px]" style={{ color: P.textLo }}>{leaderboard[2].totalVotesReceived} votes</p>
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>

            {/* Ideas Trend Chart (also on leaderboard tab) */}
            <motion.div variants={stagger(0.3)}>
              <GlassCard P={P} className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={16} style={{ color: P.accent }} />
                  <h3 className="text-sm font-semibold" style={{ color: P.textHi }}>Submission Trend</h3>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={stats.trend}>
                    <defs>
                      <linearGradient id="ideasGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={P.accent} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={P.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: P.textLo, fontSize: 11 }}
                      axisLine={{ stroke: P.border }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: P.textLo, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: P.card,
                        border: `1px solid ${P.borderHi}`,
                        borderRadius: 12,
                        boxShadow: '0 15px 40px rgba(0,0,0,0.4)',
                        fontSize: 12,
                        color: P.textHi,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke={P.accent}
                      strokeWidth={2}
                      fill="url(#ideasGrad2)"
                      name="Submitted"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </GlassCard>
            </motion.div>

            {/* Leaderboard Stats */}
            <motion.div variants={stagger(0.4)}>
              <GlassCard P={P} className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Star size={16} style={{ color: '#fbbf24' }} />
                  <h3 className="text-sm font-semibold" style={{ color: P.textHi }}>Community Impact</h3>
                </div>
                <div className="flex flex-col gap-3">
                  {[
                    { label: 'Total Ideas Submitted', value: stats.total, color: P.accent },
                    { label: 'Ideas Approved', value: stats.approved, color: '#34d399' },
                    { label: 'Community Votes Cast', value: stats.totalVotes, color: '#f87171' },
                    { label: 'Active Contributors', value: leaderboard.length, color: '#a78bfa' },
                  ].map((item, i) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between py-2.5 px-3 rounded-lg"
                      style={{ background: `${item.color}06`, border: `1px solid ${item.color}12` }}
                    >
                      <span className="text-xs font-medium" style={{ color: P.textMd }}>{item.label}</span>
                      <span className="text-sm font-bold" style={{ color: item.color }}>
                        {item.value.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* Submit Idea Modal                                                   */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <SubmitIdeaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        P={P}
        onSubmit={handleSubmitIdea}
        isSubmitting={createMutation.isPending}
      />
      <ConfirmDialog
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDeleteIdea}
        title="Delete Idea"
        message="Are you sure you want to delete this idea? This action cannot be undone and all associated votes will be removed."
        confirmLabel="Delete Idea"
        variant="danger"
      />
    </motion.div>
  );
}
