import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useToast } from '../components/common/Toast';
import {
  ResponsiveContainer, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip as RTooltip, AreaChart, Area,
  BarChart, Bar,
} from 'recharts';
import {
  Handshake, Users, Wallet, FolderKanban, Plus, Edit3, Trash2, Eye,
  X, Upload, ChevronDown, Trophy, Medal, Award, Star,
  Calendar, Clock, Target, ArrowUpRight, Search,
  Heart, Zap, Crown, Flame, DollarSign, Building2,
  Globe, Phone, Mail, MapPin, ExternalLink,
  TrendingUp, CheckCircle2, FileSpreadsheet, FileText, Printer,
  type LucideIcon,
} from 'lucide-react';
import { exportToExcel, printTable, type ExportColumn } from '../utils/exportUtils';
import { generatePartnersPDF } from '../utils/pdfReportGenerator';
import { ActionBar } from '../components/common/ActionBar';
import { cn } from '../utils/cn';
import { useTheme } from '../hooks/useTheme';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnerService } from '../services/partnerService';
import { donationService } from '../services/donationService';
import { challengeService } from '../services/challengeService';

/* ═══════════════════════════════════════════════════════════════════════
   PALETTE
═══════════════════════════════════════════════════════════════════════ */


const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } } };
const stagger = (d = 0) => ({ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: d } } });
const scaleIn = (d = 0) => ({ hidden: { opacity: 0, scale: 0.92 }, show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: EASE, delay: d } } });

const sections = ['CSR Partners', 'Micro-Donations', 'Challenges'] as const;
type Section = typeof sections[number];

/* ═══════════════════════════════════════════════════════════════════════
   TYPES & CONFIG
═══════════════════════════════════════════════════════════════════════ */
type PartnerType = 'Strategic' | 'Financial' | 'Technical' | 'Community';
interface Partner {
  id: string; name: string; logo: string; type: PartnerType;
  supportArea: string; amount: number; startDate: string; endDate: string;
  status: 'active' | 'expired' | 'pending';
  contactPerson: string; email: string; phone: string; projects: number;
  location: string;
}

const partnerTypeCfg: Record<string, { color: string; bg: string }> = {
  Strategic: { color: '#E91E63', bg: 'rgba(233,30,99,0.1)' },
  Financial: { color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  Technical: { color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
  Community: { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
};
const defaultTypeCfg = { color: '#6B6849', bg: 'rgba(107,104,73,0.1)' };

const partnerStatusCfg: Record<string, { color: string; bg: string; label: string }> = {
  active:  { color: '#34d399', bg: 'rgba(52,211,153,0.1)',  label: 'Active' },
  expired: { color: '#9CA3AF', bg: 'rgba(156,163,175,0.1)',  label: 'Expired' },
  pending: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  label: 'Pending' },
};
const defaultStatusCfg = { color: '#6B6849', bg: 'rgba(107,104,73,0.1)', label: 'Unknown' };


/* ═══════════════════════════════════════════════════════════════════════
   DONATION UI CONFIG
═══════════════════════════════════════════════════════════════════════ */
const donationTypes = [
  { id: 'salary_rounding' as const, label: 'Salary Rounding', desc: 'Round down your salary to the nearest OMR and donate the baisas difference automatically each month', icon: DollarSign },
  { id: 'monthly_fixed' as const, label: 'Monthly Fixed Donation', desc: 'Set a fixed amount to donate every month from your salary — fully customizable', icon: Calendar },
  { id: 'company_match' as const, label: 'Company Matching', desc: 'When enabled, the company doubles every donation you make — 2x the impact!', icon: Zap },
];

const badgeCfg = {
  gold:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  icon: Crown, label: 'Gold' },
  silver: { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: Medal, label: 'Silver' },
  bronze: { color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  icon: Award, label: 'Bronze' },
};

const challengeRewardIcons: Record<string, LucideIcon> = {
  Crown,
  Medal,
  Award,
  Star,
  Trophy,
  Heart,
  Zap,
};


/* ═══════════════════════════════════════════════════════════════════════
   SHARED UI
═══════════════════════════════════════════════════════════════════════ */
function GlassCard({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const { colors: P } = useTheme();
  return (
    <div className={cn('relative rounded-[20px]', className)}
      style={{
        background: `${P.card}`,
        border: `1px solid ${P.border}`,
        boxShadow: `inset 0 1px 0 ${P.borderHi}40, 0 12px 40px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.03)`,
        ...style,
      }}>
      {children}
    </div>
  );
}

function Kpi({ label, value, icon: Icon, color, format, prev, delay, href, onClick }: {
  label: string; value: number; icon: LucideIcon; color: string; format: string; prev: number; delay: number;
  href?: string; onClick?: () => void;
}) {
  const { colors: P } = useTheme();
  const formatted = format === 'omr'
    ? `OMR ${(value / 1000).toFixed(0)}K`
    : value.toLocaleString();
  const delta = prev > 0 ? Math.round(((value - prev) / prev) * 100) : 0;

  return (
    <motion.div variants={stagger(delay)} whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
      onClick={onClick}
      style={{ cursor: href || onClick ? 'pointer' : 'default' }}>
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
            <Icon size={20} style={{ color }} />
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg" style={{ background: 'rgba(52,211,153,0.1)' }}>
            <ArrowUpRight size={12} style={{ color: '#34d399' }} />
            <span className="text-xs font-medium" style={{ color: '#34d399' }}>+{delta}%</span>
          </div>
        </div>
        <p className="text-2xl font-bold" style={{ color: P.textHi }}>{formatted}</p>
        <p className="text-xs mt-1" style={{ color: P.textLo }}>{label}</p>
      </GlassCard>
    </motion.div>
  );
}

const getTooltipStyle = (P: { card: string; borderHi: string; textHi: string }): React.CSSProperties => ({
  backgroundColor: P.card, border: `1px solid ${P.borderHi}`,
  borderRadius: 12, boxShadow: '0 25px 50px rgba(0,0,0,0.05)',
  color: P.textHi, fontSize: 12,
});

/* ═══════════════════════════════════════════════════════════════════════
   ADD PARTNER MODAL — DETAILED
═══════════════════════════════════════════════════════════════════════ */
function AddPartnerModal({
  open,
  onClose,
  editPartner,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  editPartner?: Partner | null;
  onSave?: (data: Partial<Partner> & { description?: string }, isEdit: boolean) => void;
}) {
  const { colors: P } = useTheme();
  const isEditMode = !!editPartner;

  const [formData, setFormData] = useState({
    name: editPartner?.name ?? '',
    type: editPartner?.type ?? '',
    supportArea: editPartner?.supportArea ?? '',
    amount: editPartner?.amount?.toString() ?? '',
    startDate: editPartner?.startDate ?? '',
    endDate: editPartner?.endDate ?? '',
    contactPerson: editPartner?.contactPerson ?? '',
    email: editPartner?.email ?? '',
    phone: editPartner?.phone ?? '',
    location: editPartner?.location ?? '',
    description: '',
  });

  // Reset form whenever the modal opens/closes or edit target changes
  React.useEffect(() => {
    setFormData({
      name: editPartner?.name ?? '',
      type: editPartner?.type ?? '',
      supportArea: editPartner?.supportArea ?? '',
      amount: editPartner?.amount?.toString() ?? '',
      startDate: editPartner?.startDate ?? '',
      endDate: editPartner?.endDate ?? '',
      contactPerson: editPartner?.contactPerson ?? '',
      email: editPartner?.email ?? '',
      phone: editPartner?.phone ?? '',
      location: editPartner?.location ?? '',
      description: '',
    });
  }, [editPartner, open]);

  const set = (key: string, val: string) => setFormData(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    if (onSave) {
      onSave(
        {
          name: formData.name,
          type: formData.type as PartnerType,
          supportArea: formData.supportArea,
          totalContribution: parseFloat(formData.amount) || 0,
          startDate: formData.startDate,
          endDate: formData.endDate,
          contactPerson: formData.contactPerson,
          email: formData.email,
          phone: formData.phone,
          location: formData.location,
          description: formData.description,
        },
        isEditMode,
      );
    }
    onClose();
  };

  const fieldGroups = [
    {
      title: 'Partner Information',
      icon: Building2,
      fields: [
        { key: 'name', label: 'Partner Name', type: 'text', placeholder: 'e.g. Oman LNG', half: false },
        { key: 'type', label: 'Partnership Type', type: 'select', options: ['Strategic', 'Financial', 'Technical', 'Community'], half: true },
        { key: 'supportArea', label: 'Support Area', type: 'select', options: ['Energy & Environment', 'Education & Youth', 'Technology & Digital', 'Healthcare', 'Infrastructure', 'Community Development', 'Tourism & Heritage'], half: true },
        { key: 'description', label: 'Partnership Description', type: 'textarea', placeholder: 'Brief description of the partnership goals and scope...', half: false },
      ],
    },
    {
      title: 'Financial & Timeline',
      icon: Wallet,
      fields: [
        { key: 'amount', label: 'Support Amount (OMR)', type: 'number', placeholder: '0.000', half: true },
        { key: 'location', label: 'Location', type: 'select', options: ['Muscat', 'Sohar', 'Salalah', 'Nizwa', 'Sur', 'Ibri', 'Other'], half: true },
        { key: 'startDate', label: 'Start Date', type: 'date', placeholder: '', half: true },
        { key: 'endDate', label: 'End Date', type: 'date', placeholder: '', half: true },
      ],
    },
    {
      title: 'Contact Person',
      icon: Users,
      fields: [
        { key: 'contactPerson', label: 'Contact Name', type: 'text', placeholder: 'Full name', half: false },
        { key: 'email', label: 'Email Address', type: 'email', placeholder: 'email@company.com', half: true },
        { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: '+968 XXXX XXXX', half: true },
      ],
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-2xl mx-4 rounded-[20px] overflow-hidden max-h-[90vh] flex flex-col"
            style={{ background: P.card, border: `1px solid ${P.border}` }}
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: EASE }}>

            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 shrink-0"
              style={{ borderBottom: `1px solid ${P.border}` }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${P.accent}15` }}>
                  <Handshake size={18} style={{ color: P.accent }} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: P.textHi }}>
                    {isEditMode ? 'Edit Partner' : 'Add New Partner'}
                  </h3>
                  <p className="text-xs" style={{ color: P.textLo }}>
                    {isEditMode ? 'Update the partnership details below' : 'Fill in the partnership details below'}
                  </p>
                </div>
              </div>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: P.surface }}>
                <X size={16} style={{ color: P.textMd }} />
              </motion.button>
            </div>

            {/* Body — scrollable */}
            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              {fieldGroups.map((group) => {
                const GIcon = group.icon;
                return (
                  <div key={group.title}>
                    <div className="flex items-center gap-2 mb-4">
                      <GIcon size={15} style={{ color: P.accent }} />
                      <h4 className="text-sm font-semibold" style={{ color: P.textHi }}>{group.title}</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {group.fields.map((f) => {
                        const span = f.half ? '' : 'col-span-2';
                        return (
                          <div key={f.key} className={span}>
                            <label className="text-xs font-medium mb-1.5 block" style={{ color: P.textMd }}>
                              {f.label}
                            </label>
                            {f.type === 'select' ? (
                              <div className="relative">
                                <select
                                  value={formData[f.key as keyof typeof formData]}
                                  onChange={e => set(f.key, e.target.value)}
                                  className="w-full px-3 py-2.5 rounded-full text-sm appearance-none"
                                  style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi, outline: 'none' }}>
                                  <option value="" style={{ color: P.textLo }}>Select...</option>
                                  {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: P.textLo }} />
                              </div>
                            ) : f.type === 'textarea' ? (
                              <textarea rows={3} placeholder={f.placeholder}
                                value={formData[f.key as keyof typeof formData]}
                                onChange={e => set(f.key, e.target.value)}
                                className="w-full px-3 py-2.5 rounded-full text-sm resize-none"
                                style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi, outline: 'none' }} />
                            ) : (
                              <input type={f.type} placeholder={f.placeholder}
                                value={formData[f.key as keyof typeof formData]}
                                onChange={e => set(f.key, e.target.value)}
                                className="w-full px-3 py-2.5 rounded-full text-sm"
                                style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi, outline: 'none' }} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Logo Upload */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Upload size={15} style={{ color: P.accent }} />
                  <h4 className="text-sm font-semibold" style={{ color: P.textHi }}>Partner Logo</h4>
                </div>
                <div className="flex items-center justify-center gap-3 px-6 py-8 rounded-xl cursor-pointer transition-colors hover:border-[#E91E63]"
                  style={{ background: P.surface, border: `2px dashed ${P.borderHi}` }}>
                  <div className="text-center">
                    <Upload size={28} style={{ color: P.textLo }} className="mx-auto mb-2" />
                    <p className="text-sm font-medium" style={{ color: P.textMd }}>Click to upload or drag & drop</p>
                    <p className="text-xs mt-1" style={{ color: P.textDim }}>PNG, JPG or SVG (max 2MB)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 pt-4 shrink-0" style={{ borderTop: `1px solid ${P.border}` }}>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex-1 py-2.5 rounded-full text-sm font-medium"
                style={{ background: P.surface, color: P.textMd, border: `1px solid ${P.border}` }}
                onClick={onClose}>Cancel</motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex-1 py-2.5 rounded-full text-sm font-medium"
                style={{ background: P.accent, color: P.bg }}
                onClick={handleSave}>
                {isEditMode ? 'Update Partner' : 'Save Partner'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   PARTNER DETAIL MODAL
═══════════════════════════════════════════════════════════════════════ */
function PartnerDetailModal({
  partner,
  onClose,
  onViewProjects,
  onEdit,
  onDelete,
}: {
  partner: Partner | null;
  onClose: () => void;
  onViewProjects?: () => void;
  onEdit?: (partner: Partner) => void;
  onDelete?: (partnerId: string) => void;
}) {
  const { colors: P } = useTheme();
  if (!partner) return null;
  const tc = partnerTypeCfg[partner.type] || defaultTypeCfg;
  const sc = partnerStatusCfg[partner.status] || defaultStatusCfg;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div className="relative w-full max-w-lg mx-4 rounded-[20px] overflow-hidden"
          style={{ background: P.card, border: `1px solid ${P.border}` }}
          initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>

          {/* Header */}
          <div className="p-6 pb-4" style={{ borderBottom: `1px solid ${P.border}` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold"
                  style={{ background: `${P.accent}15`, color: P.accent }}>{partner.logo}</div>
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: P.textHi }}>{partner.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium" style={{ background: tc.bg, color: tc.color }}>{partner.type}</span>
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                  </div>
                </div>
              </div>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: P.surface }}>
                <X size={16} style={{ color: P.textMd }} />
              </motion.button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Wallet, label: 'Amount', value: `OMR ${partner.amount.toLocaleString()}` },
                { icon: FolderKanban, label: 'Projects', value: `${partner.projects} active` },
                { icon: MapPin, label: 'Location', value: partner.location },
                { icon: Globe, label: 'Support Area', value: partner.supportArea },
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-xl" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <item.icon size={13} style={{ color: P.accent }} />
                    <span className="text-xs" style={{ color: P.textLo }}>{item.label}</span>
                  </div>
                  <p className="text-sm font-medium" style={{ color: P.textHi }}>{item.value}</p>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
              <p className="text-xs font-medium mb-3" style={{ color: P.textLo }}>CONTACT PERSON</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users size={13} style={{ color: P.textLo }} />
                  <span className="text-sm" style={{ color: P.textHi }}>{partner.contactPerson}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={13} style={{ color: P.textLo }} />
                  <span className="text-sm" style={{ color: P.accent }}>{partner.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={13} style={{ color: P.textLo }} />
                  <span className="text-sm" style={{ color: P.textMd }}>{partner.phone}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs" style={{ color: P.textLo }}>
              <span>Start: {partner.startDate}</span>
              <span>End: {partner.endDate}</span>
            </div>
          </div>

          <div className="space-y-3 px-6 pb-6">
            {/* Project links — shown when partner has projects */}
            {partner.projects > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                <FolderKanban size={13} style={{ color: P.accent }} />
                <span className="text-xs flex-1" style={{ color: P.textMd }}>
                  {partner.projects} associated project{partner.projects !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => { onClose(); onViewProjects?.(); }}
                  className="text-xs hover:underline font-medium"
                  style={{ color: P.accent }}>
                  View Projects →
                </button>
              </div>
            )}
            <div className="flex gap-3">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex-1 py-2.5 rounded-full text-sm font-medium flex items-center justify-center gap-2"
                style={{ background: P.surface, color: P.textMd, border: `1px solid ${P.border}` }}
                onClick={() => { onEdit?.(partner); onClose(); }}>
                <Edit3 size={14} /> Edit Partner
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="py-2.5 px-4 rounded-full text-sm font-medium flex items-center justify-center gap-2"
                style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
                onClick={() => { onDelete?.(partner.id); onClose(); }}>
                <Trash2 size={14} /> Remove
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 1: CSR PARTNERS
═══════════════════════════════════════════════════════════════════════ */
function PartnersSection() {
  const { colors: P } = useTheme();
  const navigate = useNavigate();
  const toast = useToast();

  // API queries & mutations
  const queryClient = useQueryClient();
  const { data: partnersData, isLoading: partnersLoading, refetch, isRefetching } = useQuery({
    queryKey: ['partners', { limit: 100 }],
    queryFn: () => partnerService.getPartners({ limit: 100 }),
    staleTime: 60 * 1000,
  });
  const { data: partnerStatsData, isLoading: statsLoading } = useQuery({
    queryKey: ['partner-stats'],
    queryFn: () => partnerService.getPartnerStats(),
    staleTime: 5 * 60 * 1000,
  });
  const createPartnerMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => partnerService.createPartner(data as any),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['partners'] }); queryClient.invalidateQueries({ queryKey: ['partner-stats'] }); },
  });
  const updatePartnerMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => partnerService.updatePartner(id, data as any),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['partners'] }); queryClient.invalidateQueries({ queryKey: ['partner-stats'] }); },
  });
  const deletePartnerMut = useMutation({
    mutationFn: (id: string) => partnerService.deletePartner(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['partners'] }); queryClient.invalidateQueries({ queryKey: ['partner-stats'] }); },
  });

  // Local mutable partners list (initialized empty, synced with API data)
  const [localPartners, setLocalPartners] = useState<Partner[]>([]);

  // Sync API data into local state when it arrives
  useEffect(() => {
    const items = (partnersData as any)?.data?.items || [];
    if (Array.isArray(items) && items.length > 0) {
      const mapped: Partner[] = items.map((p: any) => ({
        id: p.id,
        name: p.name || '',
        logo: p.logoUrl || (p.name || 'NP').slice(0, 2).toUpperCase(),
        type: p.type || 'Community',
        supportArea: p.supportArea || p.support_area || '',
        amount: p.totalContribution || p.amount || 0,
        startDate: p.startDate || p.start_date || '',
        endDate: p.endDate || p.end_date || '',
        status: p.status || 'active',
        contactPerson: p.contactPerson || p.contact_person || '',
        email: p.email || '',
        phone: p.phone || '',
        projects: p.projects || p.projectCount || p.projectsCount || 0,
        location: p.location || '',
      }));
      setLocalPartners(mapped);
    }
  }, [partnersData]);

  // Computed KPI values derived from API stats (with localPartners as fallback for current values)
  const computedKpis = useMemo(() => {
    const stats = (partnerStatsData as any)?.data;

    // Use API stats if available, otherwise compute from localPartners
    const totalPartners  = stats?.totalPartners ?? localPartners.length;
    const activePartners = stats?.activePartners ?? localPartners.filter(p => p.status === 'active').length;
    const totalSupport   = stats?.totalSupport ?? localPartners.reduce((sum, p) => sum + p.amount, 0);
    const jointProjects  = stats?.jointProjects ?? localPartners.reduce((sum, p) => sum + p.projects, 0);

    // Previous values from stats (if available) for trend calculation
    const prevTotalPartners  = stats?.previousTotalPartners ?? Math.floor(totalPartners * 0.85);
    const prevActivePartners = stats?.previousActivePartners ?? Math.floor(activePartners * 0.85);
    const prevTotalSupport   = stats?.previousTotalContribution ?? Math.floor(totalSupport * 0.82);
    const prevJointProjects  = stats?.previousTotalProjects ?? Math.floor(jointProjects * 0.85);

    return [
      { label: 'Total Partners',  value: totalPartners,  prev: prevTotalPartners,  icon: Handshake, color: '#E91E63', format: '' },
      { label: 'Active Partners', value: activePartners, prev: prevActivePartners, icon: Users, color: '#38bdf8', format: '' },
      { label: 'Total Support',   value: totalSupport,   prev: prevTotalSupport,   icon: Wallet, color: '#34d399', format: 'omr' },
      { label: 'Joint Projects',  value: jointProjects,  prev: prevJointProjects,  icon: FolderKanban, color: '#a78bfa', format: '' },
    ];
  }, [partnerStatsData, localPartners]);

  // Computed pie chart data derived from localPartners so it reacts when partners change
  const computedPartnerByType = useMemo(() => {
    const typeColors: Record<PartnerType, string> = {
      Strategic: '#E91E63',
      Financial: '#34d399',
      Technical: '#38bdf8',
      Community: '#a78bfa',
    };
    const counts = localPartners.reduce<Record<string, number>>((acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + 1;
      return acc;
    }, {});
    return (Object.keys(typeColors) as PartnerType[])
      .filter(t => counts[t] !== undefined)
      .map(t => ({ name: t, value: counts[t], color: typeColors[t] }));
  }, [localPartners]);

  // Contribution trend data — derived from API stats when available
  const partnerContribution: { month: string; amount: number }[] = useMemo(() => {
    const stats = (partnerStatsData as any)?.data;
    const trend = stats?.contributionTrend;
    if (Array.isArray(trend) && trend.length > 0) {
      return trend.map((item: any) => ({
        month: item.month ?? '',
        amount: item.amount ?? 0,
      }));
    }
    return [];
  }, [partnerStatsData]);

  const [showAdd, setShowAdd] = useState(false);
  const [editPartner, setEditPartner] = useState<Partner | null>(null);
  const [viewPartner, setViewPartner] = useState<Partner | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = localPartners.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.supportArea.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || p.type === typeFilter;
    return matchSearch && matchType;
  });

  const handleSave = (data: Partial<Partner> & { description?: string }, isEdit: boolean) => {
    const totalContribution = Number((data as Partial<Partner> & { amount?: number; totalContribution?: number }).totalContribution ?? (data as { amount?: number }).amount ?? 0);
    const payload = { ...data, totalContribution, status: (data as { status?: string }).status || 'active' };

    if (isEdit && editPartner) {
      updatePartnerMut.mutate(
        { id: editPartner.id, data: payload as Record<string, unknown> },
        {
          onSuccess: () => {
            toast.success('Partner Updated', 'Partner details have been updated successfully.');
            setShowAdd(false);
            setEditPartner(null);
          },
          onError: () => {
            toast.error('Error', 'Failed to update partner. Please try again.');
          },
        }
      );
    } else {
      createPartnerMut.mutate(payload as Record<string, unknown>, {
        onSuccess: () => {
          toast.success('Partner Added', 'New partner has been registered in the system.');
          setShowAdd(false);
          setEditPartner(null);
        },
        onError: () => {
          toast.error('Error', 'Failed to create partner. Please try again.');
        },
      });
    }
  };

  const handleOpenEdit = (partner: Partner) => {
    setEditPartner(partner);
    setShowAdd(true);
  };

  const handleDeleteConfirmed = () => {
    const target = localPartners.find(p => p.id === deleteConfirm);
    if (!deleteConfirm) return;
    deletePartnerMut.mutate(deleteConfirm, {
      onSuccess: () => {
        setLocalPartners(prev => prev.filter(p => p.id !== deleteConfirm));
        toast.success('Partner Removed', `${target?.name ?? 'Partner'} has been removed from the system.`);
        setDeleteConfirm(null);
        setViewPartner(null);
      },
      onError: () => {
        toast.error('Error', 'Failed to delete partner. Please try again.');
      },
    });
  };

  return (
    <motion.div initial="hidden" animate="show" className="space-y-6">
      {/* KPIs — computed from API stats with loading state */}
      <div className="grid grid-cols-4 gap-4">
        {(statsLoading || partnersLoading) ? (
          // Loading skeleton for KPIs
          Array.from({ length: 4 }).map((_, i) => (
            <motion.div key={i} variants={stagger(i * 0.06)}>
              <GlassCard className="p-5 h-[110px] flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-2 w-full">
                  <div className="w-10 h-10 rounded-xl" style={{ background: P.borderHi }} />
                  <div className="w-20 h-6 rounded" style={{ background: P.borderHi }} />
                  <div className="w-24 h-3 rounded" style={{ background: P.border }} />
                </div>
              </GlassCard>
            </motion.div>
          ))
        ) : (
          computedKpis.map((k, i) => (
            <Kpi
              key={k.label}
              {...k}
              delay={i * 0.06}
              onClick={k.label === 'Joint Projects' ? () => navigate('/projects') : undefined}
            />
          ))
        )}
      </div>

      {/* Partners Table */}
      <motion.div variants={stagger(0.3)}>
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold" style={{ color: P.textHi }}>Partners Directory</h3>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
              style={{ background: P.accent, color: P.bg }}
              onClick={() => { setEditPartner(null); setShowAdd(true); }}>
              <Plus size={15} /> Add Partner
            </motion.button>
          </div>

          {/* Search + Filter */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: P.textLo }} />
              <input type="text" placeholder="Search partners..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-full text-sm"
                style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi, outline: 'none' }} />
            </div>
            <div className="relative">
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="px-3 py-2.5 rounded-full text-sm appearance-none pr-8"
                style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi, outline: 'none' }}>
                <option value="all">All Types</option>
                {(['Strategic', 'Financial', 'Technical', 'Community'] as const).map(t =>
                  <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: P.textLo }} />
            </div>
          </div>

          <div className="overflow-x-auto">
            {partnersLoading ? (
              // Loading skeleton for table
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center gap-4 px-4 py-4"
                    style={{ borderBottom: `1px solid ${P.border}` }}>
                    <div className="w-9 h-9 rounded-lg" style={{ background: P.borderHi }} />
                    <div className="flex-1 space-y-2">
                      <div className="w-32 h-4 rounded" style={{ background: P.borderHi }} />
                      <div className="w-24 h-3 rounded" style={{ background: P.border }} />
                    </div>
                    <div className="w-20 h-6 rounded-lg" style={{ background: P.borderHi }} />
                    <div className="w-28 h-4 rounded" style={{ background: P.border }} />
                    <div className="w-24 h-4 rounded" style={{ background: P.border }} />
                  </div>
                ))}
              </div>
            ) : (
              <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${P.border}` }}>
                  {['Partner', 'Type', 'Support Area', 'Amount', 'Projects', 'Duration', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium whitespace-nowrap" style={{ color: P.textLo }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const tc = partnerTypeCfg[p.type] || defaultTypeCfg;
                  const sc = partnerStatusCfg[p.status] || defaultStatusCfg;
                  return (
                    <tr key={p.id} className="group transition-colors"
                      style={{ borderBottom: `1px solid ${P.border}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = P.cardHi)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: `${tc.color}15`, color: tc.color }}>{p.logo}</div>
                          <div>
                            <span className="text-sm font-medium block" style={{ color: P.textHi }}>{p.name}</span>
                            <span className="text-xs" style={{ color: P.textLo }}>{p.location}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: tc.bg, color: tc.color }}>{p.type}</span>
                      </td>
                      <td className="px-4 py-3.5 text-sm" style={{ color: P.textMd }}>{p.supportArea}</td>
                      <td className="px-4 py-3.5 text-sm font-medium" style={{ color: P.textHi }}>OMR {p.amount.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-sm" style={{ color: P.textMd }}>{p.projects}</td>
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="text-xs" style={{ color: P.textMd }}>{p.startDate}</p>
                          <p className="text-xs" style={{ color: P.textLo }}>{p.endDate}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: P.surface }}
                            onClick={() => setViewPartner(p)}>
                            <Eye size={13} style={{ color: P.textMd }} />
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: P.surface }}
                            onClick={() => handleOpenEdit(p)}>
                            <Edit3 size={13} style={{ color: P.textMd }} />
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: P.surface }}
                            onClick={() => setDeleteConfirm(p.id)}>
                            <Trash2 size={13} style={{ color: '#f87171' }} />
                          </motion.button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            )}
            {!partnersLoading && filtered.length === 0 && (
              <div className="text-center py-12">
                <Search size={32} style={{ color: P.textDim }} className="mx-auto mb-3" />
                <p className="text-sm" style={{ color: P.textLo }}>No partners found matching your criteria</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: `1px solid ${P.border}` }}>
            <p className="text-xs" style={{ color: P.textLo }}>Showing {filtered.length} of {localPartners.length} partners</p>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: P.textLo }}>Total Support:</span>
              <span className="text-sm font-semibold" style={{ color: P.accent }}>
                OMR {localPartners.reduce((a, b) => a + b.amount, 0).toLocaleString()}
              </span>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Bottom Row: Pie Chart + Contribution Trend */}
      <div className="grid grid-cols-2 gap-6">
        <motion.div variants={stagger(0.4)}>
          <GlassCard className="p-6">
            <h3 className="text-sm font-semibold mb-4" style={{ color: P.textHi }}>Partners by Type</h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  {/* computedPartnerByType is derived from localPartners so the chart reacts to CRUD */}
                  <Pie data={computedPartnerByType} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    dataKey="value" paddingAngle={3} strokeWidth={0}>
                    {computedPartnerByType.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.color}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setTypeFilter(d.name)}
                      />
                    ))}
                  </Pie>
                  <RTooltip contentStyle={getTooltipStyle(P)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {computedPartnerByType.map(d => (
                <div
                  key={d.name}
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setTypeFilter(d.name)}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-xs flex-1" style={{ color: P.textMd }}>{d.name}</span>
                  <span className="text-xs font-medium" style={{ color: P.textHi }}>{d.value}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        <motion.div variants={stagger(0.45)}>
          <GlassCard className="p-6">
            <h3 className="text-sm font-semibold mb-4" style={{ color: P.textHi }}>Partner Contributions (OMR K)</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={partnerContribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                  <XAxis dataKey="month" tick={{ fill: P.textLo, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: P.textLo, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <RTooltip contentStyle={getTooltipStyle(P)} formatter={(v: unknown) => `OMR ${v as number}K`} />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]} fill={P.accent} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      <AddPartnerModal
        open={showAdd}
        onClose={() => { setShowAdd(false); setEditPartner(null); }}
        editPartner={editPartner}
        onSave={handleSave}
      />
      <PartnerDetailModal
        partner={viewPartner}
        onClose={() => setViewPartner(null)}
        onViewProjects={() => navigate('/projects')}
        onEdit={handleOpenEdit}
        onDelete={(id) => { setDeleteConfirm(id); setViewPartner(null); }}
      />
      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirmed}
        title="Remove Partner"
        message="Are you sure you want to remove this partner? This will remove their association with all projects and cannot be undone."
        confirmLabel="Remove Partner"
        variant="danger"
      />
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 2: MICRO-DONATIONS
═══════════════════════════════════════════════════════════════════════ */
function DonationsSection() {
  const { colors: P } = useTheme();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  // API queries for donation data
  const { data: donStatsData } = useQuery({
    queryKey: ['donation-stats'],
    queryFn: () => donationService.getDonationStats(),
    staleTime: 60 * 1000,
  });
  const { data: leaderboardData } = useQuery({
    queryKey: ['donation-leaderboard'],
    queryFn: () => donationService.getLeaderboard(),
    staleTime: 60 * 1000,
  });
  const { data: preferenceData } = useQuery({
    queryKey: ['donation-preferences'],
    queryFn: () => donationService.getDonationPreferences(),
    staleTime: 60 * 1000,
  });
  const { data: supportedProjectsData } = useQuery({
    queryKey: ['donations-by-user'],
    queryFn: () => donationService.getDonationsByUser(),
    staleTime: 60 * 1000,
  });

  const savePreferencesMut = useMutation({
    mutationFn: (payload: {
      salaryRoundingEnabled?: boolean;
      monthlyDonationEnabled?: boolean;
      companyMatchEnabled?: boolean;
      monthlyDonationAmount?: number | null;
    }) => donationService.saveDonationPreferences(payload),
    onError: () => {
      toast.error('Error', 'Failed to save donation preferences.');
    },
  });

  const createDonationMut = useMutation({
    mutationFn: (payload: { amount: number; type: string; partnerId?: string | null; projectId?: string | null; challengeId?: string | null }) =>
      donationService.createDonation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donation-stats'] });
      queryClient.invalidateQueries({ queryKey: ['donation-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['donations-by-user'] });
      toast.success('Donation Submitted', 'Thank you for your contribution.');
    },
    onError: () => {
      toast.error('Error', 'Failed to submit donation. Please try again.');
    },
  });

  // Derive donation stats from API
  const donStats = useMemo(() => {
    const d = (donStatsData as any)?.data;
    return { total: d?.totalDonated ?? 0, thisMonth: d?.thisMonth ?? 0, thisYear: d?.thisYear ?? 0 };
  }, [donStatsData]);

  // Derive breakdown from API
  const breakdown = useMemo(() => {
    const d = (donStatsData as any)?.data?.byCategory;
    if (Array.isArray(d) && d.length > 0) {
      const catColors: Record<string, string> = { Education: '#E91E63', Healthcare: '#38bdf8', Environment: '#34d399', Community: '#a78bfa', Infrastructure: '#fbbf24' };
      return d.map((item: any) => ({ name: item.type || item.name || item.category, value: item.amount || item.value || item.percentage || 0, color: catColors[item.type || item.name || item.category] || '#C9C036' }));
    }
    return [] as { name: string; value: number; color: string }[];
  }, [donStatsData]);

  // Derive leaderboard from API
  const lbRows = useMemo(() => {
    const items = (leaderboardData as any)?.data;
    if (Array.isArray(items) && items.length > 0) {
      return items.map((row: any, idx: number) => ({
        rank: row.rank || idx + 1,
        name: row.name || '',
        dept: row.department || '',
        total: row.totalDonated || 0,
        months: row.monthsActive || 0,
        badge: (idx < 2 ? 'gold' : idx < 4 ? 'silver' : 'bronze') as 'gold' | 'silver' | 'bronze',
        avatar: row.avatarUrl || (row.name || 'UN').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
      }));
    }
    return [] as { rank: number; name: string; dept: string; total: number; months: number; badge: 'gold' | 'silver' | 'bronze'; avatar: string }[];
  }, [leaderboardData]);

  // Supported projects — populated from API when available
  const supportedProjects: { id: string; name: string; amount: number; category: string; progress: number; date: string }[] = useMemo(() => {
    const items = (supportedProjectsData as any)?.data;
    if (!Array.isArray(items)) return [];
    return items.map((item: any) => ({
      id: item.id,
      name: item.name || 'Unnamed project',
      amount: Number(item.amount) || 0,
      category: item.category || 'Unknown',
      progress: Number(item.progress) || 0,
      date: item.date || '',
    }));
  }, [supportedProjectsData]);

  const [salaryRounding, setSalaryRounding] = useState(true);
  const [monthlyFixed, setMonthlyFixed] = useState(false);
  const [companyMatch, setCompanyMatch] = useState(true);
  const [monthlyAmount, setMonthlyAmount] = useState(5);

  useEffect(() => {
    const prefs = (preferenceData as any)?.data;
    if (!prefs) return;
    if (typeof prefs.salaryRoundingEnabled === 'boolean') setSalaryRounding(prefs.salaryRoundingEnabled);
    if (typeof prefs.monthlyDonationEnabled === 'boolean') setMonthlyFixed(prefs.monthlyDonationEnabled);
    if (typeof prefs.companyMatchEnabled === 'boolean') setCompanyMatch(prefs.companyMatchEnabled);
    if (typeof prefs.monthlyDonationAmount === 'number' && prefs.monthlyDonationAmount > 0) {
      setMonthlyAmount(prefs.monthlyDonationAmount);
    }
  }, [preferenceData]);

  const toggleWithSave = useCallback((type: 'salary' | 'monthly' | 'match') => {
    if (type === 'salary') {
      const next = !salaryRounding;
      setSalaryRounding(next);
      savePreferencesMut.mutate({ salaryRoundingEnabled: next });
      return;
    }
    if (type === 'monthly') {
      const next = !monthlyFixed;
      setMonthlyFixed(next);
      savePreferencesMut.mutate({ monthlyDonationEnabled: next, monthlyDonationAmount: next ? monthlyAmount : null });
      return;
    }
    const next = !companyMatch;
    setCompanyMatch(next);
    savePreferencesMut.mutate({ companyMatchEnabled: next });
  }, [companyMatch, monthlyAmount, monthlyFixed, salaryRounding, savePreferencesMut]);

  const saveMonthlyAmount = useCallback((amount: number) => {
    setMonthlyAmount(amount);
    if (monthlyFixed) {
      savePreferencesMut.mutate({ monthlyDonationAmount: amount, monthlyDonationEnabled: true });
    }
  }, [monthlyFixed, savePreferencesMut]);

  const toggles = [
    { ...donationTypes[0], enabled: salaryRounding, toggle: () => toggleWithSave('salary') },
    { ...donationTypes[1], enabled: monthlyFixed,   toggle: () => toggleWithSave('monthly') },
    { ...donationTypes[2], enabled: companyMatch,   toggle: () => toggleWithSave('match') },
  ];

  const handleDonateNow = useCallback(() => {
    const base = monthlyFixed ? monthlyAmount : 1;
    const amount = companyMatch ? base * 2 : base;
    const type = monthlyFixed ? 'monthly_fixed' : salaryRounding ? 'salary_rounding' : 'one_time';
    createDonationMut.mutate({ amount, type, partnerId: null, projectId: null });
  }, [companyMatch, createDonationMut, monthlyAmount, monthlyFixed, salaryRounding]);

  return (
    <motion.div initial="hidden" animate="show" className="space-y-6">
      {/* Banner */}
      <motion.div variants={fadeUp}>
        <GlassCard className="p-6" style={{ borderLeft: `3px solid ${P.accent}` }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${P.accent}15` }}>
              <Heart size={24} style={{ color: P.accent }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold" style={{ color: P.textHi }}>Employee Micro-Donations Program</h3>
              <p className="text-sm mt-0.5" style={{ color: P.textMd }}>
                Small contributions, big impact. Choose your preferred donation method below.
              </p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Donation Types */}
      <div className="grid grid-cols-3 gap-4">
        {toggles.map((dt, i) => {
          const Icon = dt.icon;
          return (
            <motion.div key={dt.id} variants={stagger(0.08 + i * 0.06)}>
              <GlassCard className="p-5 h-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: dt.enabled ? `${P.accent}15` : `${P.textDim}30` }}>
                      <Icon size={18} style={{ color: dt.enabled ? P.accent : P.textLo }} />
                    </div>
                    <p className="text-sm font-semibold" style={{ color: P.textHi }}>{dt.label}</p>
                  </div>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={dt.toggle}
                    className="w-11 h-6 rounded-full relative shrink-0"
                    style={{ background: dt.enabled ? P.accent : P.borderHi }}>
                    <motion.div className="absolute top-1 w-4 h-4 rounded-full"
                      animate={{ left: dt.enabled ? 24 : 4 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      style={{ background: dt.enabled ? P.bg : P.textLo }} />
                  </motion.button>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: P.textLo }}>{dt.desc}</p>
                {dt.id === 'monthly_fixed' && (
                  <AnimatePresence>
                    {dt.enabled && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-3 flex items-center gap-2 pt-3" style={{ borderTop: `1px solid ${P.border}` }}>
                          <span className="text-xs font-medium" style={{ color: P.textMd }}>OMR</span>
                          <input type="number" value={monthlyAmount} onChange={e => saveMonthlyAmount(Math.max(1, Number(e.target.value) || 1))} min={1}
                            className="w-20 px-2 py-1.5 rounded-lg text-sm text-center"
                            style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi, outline: 'none' }} />
                          <span className="text-xs" style={{ color: P.textLo }}>/ month</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
                {dt.id === 'company_match' && dt.enabled && (
                  <div className="mt-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(52,211,153,0.08)' }}>
                    <CheckCircle2 size={13} style={{ color: '#34d399' }} />
                    <span className="text-xs" style={{ color: '#34d399' }}>2x matching active</span>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {/* My Donation Dashboard */}
      <motion.div variants={stagger(0.25)}>
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-5" style={{ color: P.textHi }}>My Donation Dashboard</h3>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total Donated', value: donStats.total, color: '#E91E63', icon: Wallet },
              { label: 'This Month', value: donStats.thisMonth, color: '#38bdf8', icon: Calendar },
              { label: 'This Year', value: donStats.thisYear, color: '#34d399', icon: TrendingUp },
            ].map((s, i) => (
              <div key={i} className="p-4 rounded-xl flex items-center gap-4"
                style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${s.color}15` }}>
                  <s.icon size={18} style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-xs mb-0.5" style={{ color: P.textLo }}>{s.label}</p>
                  <p className="text-xl font-bold" style={{ color: s.color }}>OMR {s.value.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Where My Donations Go */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: P.textHi }}>
                <Target size={15} style={{ color: P.accent }} /> Where My Donations Go
              </h4>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={breakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={80}
                      dataKey="value" paddingAngle={3} strokeWidth={0}>
                      {breakdown.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <RTooltip contentStyle={getTooltipStyle(P)} formatter={(v: unknown) => `${v as number}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {breakdown.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-xs" style={{ color: P.textLo }}>{d.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Supported Projects */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: P.textHi }}>
                <FolderKanban size={15} style={{ color: P.accent }} /> Projects I Support
              </h4>
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {supportedProjects.map((sp, i) => (
                  <div key={sp.id} className="p-3 rounded-xl flex items-center gap-3 transition-colors cursor-pointer"
                    style={{ background: P.surface, border: `1px solid ${P.border}` }}
                    onClick={() => navigate(`/projects/${sp.id}`)}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = P.borderHi)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = P.border)}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: P.textHi }}>{sp.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs" style={{ color: P.textLo }}>{sp.category}</span>
                        <span className="text-xs" style={{ color: P.textDim }}>|</span>
                        <span className="text-xs" style={{ color: P.textLo }}>{sp.date}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium" style={{ color: P.accent }}>OMR {sp.amount}</p>
                      <div className="w-16 h-1.5 rounded-full mt-1" style={{ background: P.borderHi }}>
                        <div className="h-full rounded-full transition-all" style={{
                          width: `${sp.progress}%`,
                          background: sp.progress >= 100 ? '#34d399' : '#38bdf8',
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
                {supportedProjects.length === 0 && (
                  <div className="p-3 rounded-xl text-xs" style={{ background: P.surface, border: `1px dashed ${P.border}`, color: P.textLo }}>
                    No project-linked donations yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Leaderboard */}
      <motion.div variants={stagger(0.35)}>
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <Trophy size={20} style={{ color: '#fbbf24' }} />
              <h3 className="text-lg font-semibold" style={{ color: P.textHi }}>Donor Honor Board</h3>
            </div>
            <span className="text-xs px-3 py-1 rounded-lg" style={{ background: `${P.accent}10`, color: P.accent }}>
              {lbRows.length} employees
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${P.border}` }}>
                  {['Rank', 'Employee', 'Department', 'Total Donated', 'Active Months', 'Badge', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: P.textLo }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lbRows.map((row) => {
                  const b = badgeCfg[row.badge];
                  const BadgeIcon = b.icon;
                  const isTop3 = row.rank <= 3;
                  return (
                    <tr key={row.rank} className="transition-colors"
                      style={{ borderBottom: `1px solid ${P.border}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = P.cardHi)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td className="px-4 py-3.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                          style={{ background: isTop3 ? `${b.color}20` : P.surface, color: isTop3 ? b.color : P.textLo }}>
                          {row.rank}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: `${b.color}15`, color: b.color }}>{row.avatar}</div>
                          <span className="text-sm font-medium" style={{ color: P.textHi }}>{row.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm" style={{ color: P.textMd }}>{row.dept}</td>
                      <td className="px-4 py-3.5 text-sm font-medium" style={{ color: P.textHi }}>OMR {row.total.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-sm" style={{ color: P.textMd }}>{row.months} months</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg w-fit" style={{ background: b.bg, color: b.color }}>
                          <BadgeIcon size={13} />
                          <span className="text-xs font-medium">{b.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {isTop3 && <Star size={14} style={{ color: '#fbbf24' }} fill="#fbbf24" />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 3: CHALLENGES
═══════════════════════════════════════════════════════════════════════ */
function ChallengesSection() {
  const { colors: P } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: preferenceData } = useQuery({
    queryKey: ['donation-preferences'],
    queryFn: () => donationService.getDonationPreferences(),
    staleTime: 60 * 1000,
  });

  const { data: currentChallengeData } = useQuery({
    queryKey: ['challenges', 'current'],
    queryFn: () => challengeService.getCurrentChallenge(),
    staleTime: 60 * 1000,
  });

  const { data: pastChallengesData } = useQuery({
    queryKey: ['challenges', 'past'],
    queryFn: () => challengeService.getPastChallenges(),
    staleTime: 60 * 1000,
  });

  const currentChallenge = (currentChallengeData as any)?.data;

  const { data: trendData } = useQuery({
    queryKey: ['challenges', currentChallenge?.id, 'trend'],
    queryFn: () => challengeService.getChallengeDonationTrend(currentChallenge.id),
    enabled: !!currentChallenge?.id,
    staleTime: 60 * 1000,
  });

  const createDonationMut = useMutation({
    mutationFn: (payload: { amount: number; type: string; partnerId?: string | null; projectId?: string | null; challengeId?: string | null }) =>
      donationService.createDonation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donation-stats'] });
      queryClient.invalidateQueries({ queryKey: ['donation-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['donations-by-user'] });
      queryClient.invalidateQueries({ queryKey: ['challenges', 'current'] });
      queryClient.invalidateQueries({ queryKey: ['challenges', 'past'] });
      if (currentChallenge?.id) {
        queryClient.invalidateQueries({ queryKey: ['challenges', currentChallenge.id, 'trend'] });
      }
      toast.success('Donation Submitted', 'Your challenge donation was recorded successfully.');
    },
    onError: () => {
      toast.error('Error', 'Failed to submit challenge donation. Please try again.');
    },
  });

  const pastChallenges: { title: string; endDate: string; goal: number; collected: number; result: 'success' | 'failed'; winner: string; participants: number }[] =
    ((pastChallengesData as any)?.data || []).map((ch: any) => ({
      title: ch.title,
      endDate: ch.endDate ? new Date(ch.endDate).toLocaleDateString('en-GB') : '',
      goal: Number(ch.goal) || 0,
      collected: Number(ch.collected) || 0,
      result: ch.result === 'failed' ? 'failed' : 'success',
      winner: ch.winner || 'N/A',
      participants: Number(ch.participants) || 0,
    }));

  const rewards: { title: string; icon: typeof Award; condition: string; color: string }[] =
    (currentChallenge?.rewards || []).map((r: any) => ({
      title: r.title,
      icon: challengeRewardIcons[r.icon] || Award,
      condition: r.condition,
      color: r.color || '#fbbf24',
    }));

  const donationTrend: { month: string; amount: number }[] = ((trendData as any)?.data || []).map((row: any) => ({
    month: row.month,
    amount: Number(row.amount) || 0,
  }));

  const donationPrefs = (preferenceData as any)?.data || {};

  const handleDonateNow = useCallback(() => {
    if (!currentChallenge?.id || currentChallenge?.status !== 'active') {
      toast.info('No Active Challenge', 'There is currently no active challenge to donate to.');
      return;
    }
    const salaryRounding = donationPrefs.salaryRoundingEnabled !== false;
    const monthlyFixed = donationPrefs.monthlyDonationEnabled === true;
    const companyMatch = donationPrefs.companyMatchEnabled !== false;
    const monthlyAmount = Math.max(1, Number(donationPrefs.monthlyDonationAmount) || 5);
    const base = monthlyFixed ? monthlyAmount : 1;
    const amount = companyMatch ? base * 2 : base;
    const type = monthlyFixed ? 'monthly_fixed' : salaryRounding ? 'salary_rounding' : 'one_time';
    createDonationMut.mutate({
      amount,
      type,
      partnerId: null,
      projectId: null,
      challengeId: currentChallenge.id,
    });
  }, [createDonationMut, currentChallenge, donationPrefs, toast]);

  if (!currentChallenge) {
    return (
      <motion.div initial="hidden" animate="show" className="space-y-6">
        <GlassCard className="p-8 text-center">
          <Flame size={28} className="mx-auto mb-3" style={{ color: P.textLo }} />
          <h3 className="text-lg font-semibold mb-1" style={{ color: P.textHi }}>No Active Challenge</h3>
          <p className="text-sm" style={{ color: P.textLo }}>
            No challenge is active right now. Create one from the admin panel to start collecting donations.
          </p>
        </GlassCard>
      </motion.div>
    );
  }

  const normalizedCurrentChallenge = {
    title: currentChallenge.title || 'CSR Challenge',
    description: currentChallenge.description || '',
    goal: Number(currentChallenge.goal) || 0,
    collected: Number(currentChallenge.collected) || 0,
    endDate: currentChallenge.endDate ? new Date(currentChallenge.endDate).toLocaleDateString('en-GB') : '',
    participants: Number(currentChallenge.participants) || 0,
    topDonors: currentChallenge.topDonors || [],
  };

  const pct = normalizedCurrentChallenge.goal > 0 ? Math.round((normalizedCurrentChallenge.collected / normalizedCurrentChallenge.goal) * 100) : 0;
  const daysLeft = currentChallenge.endDate ? Math.max(0, Math.ceil((new Date(currentChallenge.endDate).getTime() - Date.now()) / 86400000)) : 0;

  return (
    <motion.div initial="hidden" animate="show" className="space-y-6">
      {/* Current Challenge — Hero Card */}
      <motion.div variants={scaleIn(0)}>
        <div className="relative rounded-[20px]"
          style={{
            background: `linear-gradient(135deg, ${P.card} 0%, #1a1810 50%, ${P.card} 100%)`,
            border: `2px solid ${P.accent}40`,
            boxShadow: `0 0 60px ${P.accent}10, inset 0 1px 0 ${P.borderHi}40`,
          }}>
          <div className="absolute top-0 left-0 w-full h-1" style={{ background: `linear-gradient(90deg, transparent, ${P.accent}, transparent)` }} />

          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Flame size={20} style={{ color: P.accent }} />
                  <span className="text-xs font-medium px-2.5 py-1 rounded-lg" style={{ background: `${P.accent}15`, color: P.accent }}>
                    ACTIVE CHALLENGE
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-lg" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>
                    {normalizedCurrentChallenge.participants} participants
                  </span>
                </div>
                <h2 className="text-2xl font-bold" style={{ color: P.textHi }}>{normalizedCurrentChallenge.title}</h2>
                <p className="text-sm mt-2 max-w-lg leading-relaxed" style={{ color: P.textMd }}>{normalizedCurrentChallenge.description}</p>
              </div>
              <div className="text-right shrink-0 ml-6">
                <div className="flex items-center gap-2 mb-1">
                  <Clock size={14} style={{ color: P.textLo }} />
                  <span className="text-sm font-medium" style={{ color: P.accent }}>{daysLeft} days left</span>
                </div>
                <p className="text-xs" style={{ color: P.textLo }}>Ends {normalizedCurrentChallenge.endDate}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <span className="text-3xl font-bold" style={{ color: P.accent }}>OMR {normalizedCurrentChallenge.collected.toLocaleString()}</span>
                  <span className="text-sm ml-2" style={{ color: P.textLo }}>of OMR {normalizedCurrentChallenge.goal.toLocaleString()}</span>
                </div>
                <span className="text-lg font-bold" style={{ color: P.accent }}>{pct}%</span>
              </div>
              <div className="w-full h-3 rounded-full" style={{ background: P.borderHi }}>
                <motion.div className="h-full rounded-full" initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }} transition={{ duration: 1.2, ease: EASE }}
                  style={{ background: `linear-gradient(90deg, ${P.accentLo}, ${P.accent})` }} />
              </div>
            </div>

            {/* Top Donors + CTA */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-medium mb-3" style={{ color: P.textLo }}>TOP CONTRIBUTORS</p>
                <div className="space-y-2">
                  {normalizedCurrentChallenge.topDonors.map((d: { name: string; amount: number; avatar: string }, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: `${P.accent}15`, color: P.accent }}>{d.avatar}</div>
                      <span className="text-sm" style={{ color: P.textHi }}>{d.name}</span>
                      <span className="text-xs font-medium" style={{ color: P.accent }}>OMR {d.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="px-8 py-3.5 rounded-full text-sm font-bold flex items-center gap-2"
                style={{ background: P.accent, color: P.bg, boxShadow: `0 0 30px ${P.accent}30` }}
                onClick={handleDonateNow}
                disabled={createDonationMut.isPending}>
                <Heart size={16} /> Donate Now
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Past Challenges */}
      <motion.div variants={stagger(0.15)}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: P.textHi }}>Past Challenges</h3>
        <div className="grid grid-cols-3 gap-4">
          {pastChallenges.map((ch, i) => {
            const isSuccess = ch.result === 'success';
            const resPct = Math.round((ch.collected / ch.goal) * 100);
            return (
              <motion.div key={i} variants={stagger(0.2 + i * 0.06)}
                whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
                <GlassCard className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium"
                      style={{
                        background: isSuccess ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                        color: isSuccess ? '#34d399' : '#f87171',
                      }}>
                      {isSuccess ? 'Succeeded' : 'Failed'}
                    </span>
                    <span className="text-xs" style={{ color: P.textLo }}>{ch.endDate}</span>
                  </div>
                  <h4 className="text-sm font-semibold mb-2" style={{ color: P.textHi }}>{ch.title}</h4>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs" style={{ color: P.textLo }}>
                      OMR {ch.collected.toLocaleString()} / {ch.goal.toLocaleString()}
                    </span>
                    <span className="text-xs font-medium" style={{ color: isSuccess ? '#34d399' : '#f87171' }}>{resPct}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full mb-3" style={{ background: P.borderHi }}>
                    <div className="h-full rounded-full" style={{
                      width: `${Math.min(resPct, 100)}%`,
                      background: isSuccess ? '#34d399' : '#f87171',
                    }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy size={13} style={{ color: '#fbbf24' }} />
                      <span className="text-xs" style={{ color: P.textMd }}>{ch.winner}</span>
                    </div>
                    <span className="text-xs" style={{ color: P.textLo }}>{ch.participants} joined</span>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Rewards System */}
      <motion.div variants={stagger(0.3)}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: P.textHi }}>Rewards System</h3>
        <div className="grid grid-cols-4 gap-4">
          {rewards.map((r, i) => {
            const Icon = r.icon;
            return (
              <motion.div key={i} variants={stagger(0.35 + i * 0.06)}
                whileHover={{ y: -4, scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}>
                <GlassCard className="p-5 text-center h-full">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: `${r.color}15` }}>
                    <Icon size={22} style={{ color: r.color }} />
                  </div>
                  <h4 className="text-sm font-semibold mb-1.5" style={{ color: P.textHi }}>{r.title}</h4>
                  <p className="text-xs leading-relaxed" style={{ color: P.textLo }}>{r.condition}</p>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Donation Trend */}
      <motion.div variants={stagger(0.4)}>
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: P.textHi }}>Company-wide Donation Trend</h3>
            <div className="flex items-center gap-2">
              <TrendingUp size={14} style={{ color: '#34d399' }} />
              <span className="text-xs font-medium" style={{ color: '#34d399' }}>+12% this month</span>
            </div>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={donationTrend}>
                <defs>
                  <linearGradient id="donGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={P.accent} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={P.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                <XAxis dataKey="month" tick={{ fill: P.textLo, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: P.textLo, fontSize: 12 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v / 1000).toFixed(1)}k`} />
                <RTooltip contentStyle={getTooltipStyle(P)} formatter={(v: unknown) => `OMR ${(v as number).toLocaleString()}`} />
                <Area type="monotone" dataKey="amount" stroke={P.accent} strokeWidth={2}
                  fill="url(#donGrad)" dot={{ r: 4, fill: P.accent, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: P.accent, strokeWidth: 2, stroke: P.bg }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════ */
export default function PartnersAndDonations() {
  const P = useTheme().colors;
  const [activeSection, setActiveSection] = useState<Section>('CSR Partners');

  // Queries for export functionality  
  const { data: partnersData } = useQuery({
    queryKey: ['partners', { limit: 100 }],
    queryFn: () => partnerService.getPartners({ limit: 100 }),
    staleTime: 60 * 1000,
  });
  const { data: donStatsData } = useQuery({
    queryKey: ['donation-stats'],
    queryFn: () => donationService.getDonationStats(),
    staleTime: 60 * 1000,
  });
  const { data: leaderboardData } = useQuery({
    queryKey: ['donation-leaderboard'],
    queryFn: () => donationService.getLeaderboard(),
    staleTime: 60 * 1000,
  });

  // Export columns for partners
  const partnerColumns: ExportColumn[] = [
    { key: 'name', header: 'Partner Name' },
    { key: 'type', header: 'Type' },
    { key: 'supportArea', header: 'Support Area' },
    { key: 'totalContribution', header: 'Total Contribution (OMR)', format: 'number' },
    { key: 'status', header: 'Status' },
    { key: 'contactPerson', header: 'Contact Person' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'createdAt', header: 'Partner Since', format: 'date' },
  ];

  // Export columns for donations leaderboard
  const donationColumns: ExportColumn[] = [
    { key: 'rank', header: 'Rank' },
    { key: 'name', header: 'Employee Name' },
    { key: 'department', header: 'Department' },
    { key: 'totalDonated', header: 'Total Donated (OMR)', format: 'number' },
    { key: 'monthsActive', header: 'Months Active' },
  ];

  // Get partners data for export
  const getPartnersExportData = useCallback(() => {
    const items = (partnersData as any)?.data?.items || [];
    return items.map((p: any) => ({
      name: p.name || '',
      type: p.type || 'Community',
      supportArea: p.supportArea || '',
      totalContribution: p.totalContribution || 0,
      status: (p.status || 'active').charAt(0).toUpperCase() + (p.status || 'active').slice(1),
      contactPerson: p.contactPerson || '',
      email: p.email || '',
      phone: p.phone || '',
      createdAt: p.createdAt,
    }));
  }, [partnersData]);

  // Get donations leaderboard for export
  const getDonationsExportData = useCallback(() => {
    const items = (leaderboardData as any)?.data || [];
    return items.map((row: any, idx: number) => ({
      rank: row.rank || idx + 1,
      name: row.name || '',
      department: row.department || '',
      totalDonated: row.totalDonated || 0,
      monthsActive: row.monthsActive || 0,
    }));
  }, [leaderboardData]);

  // Export handlers
  const handleExportExcel = useCallback(() => {
    if (activeSection === 'CSR Partners') {
      const data = getPartnersExportData();
      exportToExcel(data, {
        filename: `CSR_Partners_${new Date().toISOString().split('T')[0]}`,
        sheetName: 'Partners',
        columns: partnerColumns,
        title: 'CSR Partners Report',
      });
    } else if (activeSection === 'Micro-Donations') {
      const data = getDonationsExportData();
      exportToExcel(data, {
        filename: `Donations_Leaderboard_${new Date().toISOString().split('T')[0]}`,
        sheetName: 'Leaderboard',
        columns: donationColumns,
        title: 'Donations Leaderboard',
      });
    }
  }, [activeSection, getPartnersExportData, getDonationsExportData, partnerColumns, donationColumns]);

  const handleExportPDF = useCallback(() => {
    const partnersItems = getPartnersExportData();
    const donorsItems = getDonationsExportData();
    const totalContrib = partnersItems.reduce((s: number, p: any) => s + (p.totalContribution || 0), 0);
    generatePartnersPDF({
      kpis: [
        { label: 'Total Partners', value: partnersItems.length, format: 'number' },
        { label: 'Active Partners', value: partnersItems.filter((p: any) => p.status === 'Active').length, format: 'number' },
        { label: 'Total Contribution', value: totalContrib, format: 'currency' },
        { label: 'Top Donors', value: donorsItems.length, format: 'number' },
      ],
      partners: partnersItems.map((p: any) => ({
        name: p.name,
        type: p.type,
        supportArea: p.supportArea,
        totalContribution: p.totalContribution || 0,
        status: p.status,
        contactPerson: p.contactPerson,
      })),
      leaderboard: donorsItems.map((d: any) => ({
        rank: d.rank,
        name: d.name,
        department: d.department,
        totalDonated: d.totalDonated || 0,
        monthsActive: d.monthsActive || 0,
      })),
    });
  }, [getPartnersExportData, getDonationsExportData]);

  const handlePrint = useCallback(() => {
    if (activeSection === 'CSR Partners') {
      const data = getPartnersExportData();
      printTable(data, partnerColumns, 'CSR Partners Report');
    } else if (activeSection === 'Micro-Donations') {
      const data = getDonationsExportData();
      printTable(data, donationColumns, 'Employee Donations Leaderboard');
    }
  }, [activeSection, getPartnersExportData, getDonationsExportData, partnerColumns, donationColumns]);

  return (
    <motion.div initial="hidden" animate="show" className="min-h-screen p-6" style={{ background: P.bg }}>
      {/* Header */}
      <motion.div variants={fadeUp} className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: P.textHi }}>Partners & Donations</h1>
          <p className="text-sm mt-1" style={{ color: P.textMd }}>
            Manage CSR partnerships, employee micro-donations, and community challenges
          </p>
        </div>
        {activeSection !== 'Challenges' && (
          <ActionBar
            onRefresh={refetch}
            onExcel={handleExportExcel}
            onPdf={handleExportPDF}
            onPrint={handlePrint}
            isRefreshing={isRefetching}
          />
        )}
      </motion.div>

      {/* Section Tabs */}
      <motion.div variants={stagger(0.08)} className="flex gap-2 mb-6">
        {sections.map((s, i) => {
          const active = activeSection === s;
          return (
            <motion.button key={s} variants={stagger(0.1 + i * 0.04)}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setActiveSection(s)}
              className="px-5 py-2.5 rounded-full text-sm font-medium transition-colors"
              style={{
                background: active ? P.accent : P.surface,
                color: active ? P.bg : P.textMd,
                border: `1px solid ${active ? P.accent : P.border}`,
              }}>
              {s}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Section Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeSection}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3, ease: EASE }}>
          {activeSection === 'CSR Partners' && <PartnersSection />}
          {activeSection === 'Micro-Donations' && <DonationsSection />}
          {activeSection === 'Challenges' && <ChallengesSection />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
