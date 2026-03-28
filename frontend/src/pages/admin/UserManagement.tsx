import React, { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Users, UserPlus, Shield, ShieldCheck, ShieldAlert, Eye, EyeOff,
  Search, Filter, MoreHorizontal, Edit3, Trash2, X, Check,
  Mail, Clock, Activity, UserCog, Lock,
  ChevronDown, ChevronLeft, ChevronRight, AlertTriangle,
  Download, Upload, Building2, Phone, FileSpreadsheet, FileText, Printer,
  BarChart3, TrendingUp, Fingerprint, RefreshCw,
  MapPin, Briefcase, FileText as FileTextLegacy, Calendar, FolderOpen, History,
  Wifi, Bell, Hash, Globe, Monitor, Zap,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { cn } from '../../utils/cn.ts';
import { useTheme } from '../../hooks/useTheme';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../../services/userService';
import { exportToExcel, printTable, type ExportColumn } from '../../utils/exportUtils';
import { generateUserManagementPDF } from '../../utils/pdfReportGenerator';

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════════
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};
const stagger = (d = 0) => ({
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: d } },
});

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & CONFIG
// ═══════════════════════════════════════════════════════════════════════════════
type UserRole = 'admin' | 'manager' | 'employee' | 'viewer';
type UserStatus = 'active' | 'inactive' | 'suspended';
type ContractType = 'full_time' | 'part_time' | 'contractor';

interface AssignedProject {
  id: string;
  name: string;
  role: string;
  status: 'planning' | 'active' | 'completed' | 'on_hold';
}

interface ActivityEntry {
  action: string;
  target: string;
  time: string;
  type: 'create' | 'update' | 'delete' | 'login' | 'export' | 'approve';
}

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  department: string;
  phone: string;
  avatar: string;
  is2FAEnabled: boolean;
  lastLogin: string;
  createdAt: string;
  projectsCount: number;
  actionsCount: number;
  jobTitle: string;
  location: string;
  bio: string;
  employeeId: string;
  contractType: ContractType;
  lastIP: string;
  loginCount: number;
  assignedProjects: AssignedProject[];
  recentActivity: ActivityEntry[];
  notifyEmail: boolean;
  notifySms: boolean;
  notifyPush: boolean;
}

const roleCfg: Record<UserRole, { label: string; icon: React.ElementType; color: string; bg: string; text: string }> = {
  admin:    { label: 'Admin',    icon: ShieldAlert,  color: '#f87171', bg: 'rgba(248,113,113,0.1)', text: '#fca5a5' },
  manager:  { label: 'Manager',  icon: ShieldCheck,  color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',  text: '#7dd3fc' },
  employee: { label: 'Employee', icon: Shield,       color: '#34d399', bg: 'rgba(52,211,153,0.1)',  text: '#6ee7b7' },
  viewer:   { label: 'Viewer',   icon: Eye,          color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', text: '#c4b5fd' },
};

const statusCfg: Record<UserStatus, { label: string; color: string; bg: string; dot: string }> = {
  active:    { label: 'Active',    color: '#34d399', bg: 'rgba(52,211,153,0.1)',  dot: '#34d399' },
  inactive:  { label: 'Inactive',  color: '#6B6849', bg: 'rgba(107,104,73,0.1)',  dot: '#6B6849' },
  suspended: { label: 'Suspended', color: '#f87171', bg: 'rgba(248,113,113,0.1)', dot: '#f87171' },
};

const contractCfg: Record<ContractType, { label: string; color: string; bg: string }> = {
  full_time:  { label: 'Full-Time',  color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  part_time:  { label: 'Part-Time',  color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  contractor: { label: 'Contractor', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
};

const omanGovernorates = ['Muscat', 'Dhofar', 'Musandam', 'Al Buraimi', 'Ad Dakhiliyah', 'Al Batinah North', 'Al Batinah South', 'Ash Sharqiyah North', 'Ash Sharqiyah South', 'Ad Dhahirah', 'Al Wusta'];

const departments = ['Executive', 'Operations', 'Finance', 'Marketing', 'Engineering', 'HR', 'Legal', 'Community'];


const activityTypeCfg: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  create:  { color: '#34d399', icon: Zap,          label: 'Created' },
  update:  { color: '#38bdf8', icon: Edit3,        label: 'Updated' },
  delete:  { color: '#f87171', icon: Trash2,       label: 'Deleted' },
  login:   { color: '#a78bfa', icon: Monitor,      label: 'Login' },
  export:  { color: '#fbbf24', icon: Download,     label: 'Exported' },
  approve: { color: '#E91E63', icon: Check,        label: 'Approved' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// REUSABLE: GlassCard
// ═══════════════════════════════════════════════════════════════════════════════
function GlassCard({ children, className, style: extraStyle }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const { colors: P } = useTheme();
  return (
    <div
      className={cn('relative rounded-[20px] overflow-hidden', className)}
      style={{
        background: P.card,
        border: `1px solid ${P.border}`,
        boxShadow: `inset 0 1px 0 0 ${P.borderHi}40, 0 12px 40px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.03)`,
        ...extraStyle,
      }}
    >
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${P.borderHi}90, transparent)` }} />
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER MODAL (Add / Edit)
// ═══════════════════════════════════════════════════════════════════════════════
function UserModal({ isOpen, onClose, user, mode, onSave }: { isOpen: boolean; onClose: () => void; user?: User | null; mode: 'add' | 'edit'; onSave?: (data: Record<string, unknown>, mode: 'add' | 'edit', userId?: string) => void }) {
  const { colors: P } = useTheme();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'employee' as UserRole,
    department: user?.department || departments[0],
    phone: user?.phone || '',
    status: user?.status || 'active' as UserStatus,
    is2FAEnabled: user?.is2FAEnabled || false,
    jobTitle: user?.jobTitle || '',
    employeeId: user?.employeeId || '',
    location: user?.location || omanGovernorates[0],
    contractType: user?.contractType || 'full_time' as ContractType,
    bio: user?.bio || '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleSave = () => {
    if (onSave) {
      const { password, ...rest } = form;
      // Only include password when creating a new user and it's non-empty
      const payload = (mode === 'add' && password) ? { ...rest, password } : rest;
      onSave(payload as unknown as Record<string, unknown>, mode, user?.id);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="w-full max-w-2xl rounded-2xl overflow-hidden"
            style={{ background: P.surface, border: `1px solid ${P.border}` }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${P.border}` }}>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: `${P.accent}15`, border: `1px solid ${P.accent}30` }}>
                  {mode === 'add' ? <UserPlus size={16} style={{ color: P.accent }} /> : <Edit3 size={16} style={{ color: P.accent }} />}
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: P.textHi }}>{mode === 'add' ? 'Add New User' : 'Edit User'}</h3>
                  <p className="text-[11px]" style={{ color: P.textLo }}>{mode === 'add' ? 'Create a new team member account' : `Editing ${user?.name}`}</p>
                </div>
              </div>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose} className="p-1.5 rounded-full" style={{ color: P.textLo }}>
                <X size={16} />
              </motion.button>
            </div>

            {/* Form */}
            <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
              {/* Row: Name + Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold mb-1.5 block" style={{ color: P.textMd }}>Full Name</label>
                  <div className="relative">
                    <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: P.textLo }} />
                    <input
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Enter full name"
                      className="w-full h-10 pl-9 pr-3 rounded-full text-xs outline-none transition-all"
                      style={{ background: P.bg, border: `1px solid ${P.border}`, color: P.textHi }}
                      onFocus={e => e.currentTarget.style.borderColor = P.accent}
                      onBlur={e => e.currentTarget.style.borderColor = P.border}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold mb-1.5 block" style={{ color: P.textMd }}>Email Address</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: P.textLo }} />
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="email@csr.om"
                      className="w-full h-10 pl-9 pr-3 rounded-full text-xs outline-none transition-all"
                      style={{ background: P.bg, border: `1px solid ${P.border}`, color: P.textHi }}
                      onFocus={e => e.currentTarget.style.borderColor = P.accent}
                      onBlur={e => e.currentTarget.style.borderColor = P.border}
                    />
                  </div>
                </div>
              </div>

              {/* Row: Phone + Department */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold mb-1.5 block" style={{ color: P.textMd }}>Phone</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: P.textLo }} />
                    <input
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+968 9xxx xxxx"
                      className="w-full h-10 pl-9 pr-3 rounded-full text-xs outline-none transition-all"
                      style={{ background: P.bg, border: `1px solid ${P.border}`, color: P.textHi }}
                      onFocus={e => e.currentTarget.style.borderColor = P.accent}
                      onBlur={e => e.currentTarget.style.borderColor = P.border}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold mb-1.5 block" style={{ color: P.textMd }}>Department</label>
                  <div className="relative">
                    <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: P.textLo }} />
                    <select
                      value={form.department}
                      onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                      className="w-full h-10 pl-9 pr-3 rounded-full text-xs outline-none appearance-none cursor-pointer"
                      style={{ background: P.bg, border: `1px solid ${P.border}`, color: P.textHi }}
                    >
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: P.textLo }} />
                  </div>
                </div>
              </div>

              {/* Row: Job Title + Employee ID */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold mb-1.5 block" style={{ color: P.textMd }}>Job Title</label>
                  <div className="relative">
                    <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: P.textLo }} />
                    <input
                      value={form.jobTitle}
                      onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))}
                      placeholder="e.g. Operations Manager"
                      className="w-full h-10 pl-9 pr-3 rounded-full text-xs outline-none transition-all"
                      style={{ background: P.bg, border: `1px solid ${P.border}`, color: P.textHi }}
                      onFocus={e => e.currentTarget.style.borderColor = P.accent}
                      onBlur={e => e.currentTarget.style.borderColor = P.border}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold mb-1.5 block" style={{ color: P.textMd }}>Employee ID</label>
                  <div className="relative">
                    <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: P.textLo }} />
                    <input
                      value={form.employeeId}
                      onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                      placeholder="CSR-XXX"
                      className="w-full h-10 pl-9 pr-3 rounded-full text-xs outline-none transition-all"
                      style={{ background: P.bg, border: `1px solid ${P.border}`, color: P.textHi }}
                      onFocus={e => e.currentTarget.style.borderColor = P.accent}
                      onBlur={e => e.currentTarget.style.borderColor = P.border}
                    />
                  </div>
                </div>
              </div>

              {/* Row: Location + Contract Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold mb-1.5 block" style={{ color: P.textMd }}>Location (Governorate)</label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: P.textLo }} />
                    <select
                      value={form.location}
                      onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                      className="w-full h-10 pl-9 pr-3 rounded-full text-xs outline-none appearance-none cursor-pointer"
                      style={{ background: P.bg, border: `1px solid ${P.border}`, color: P.textHi }}
                    >
                      {omanGovernorates.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: P.textLo }} />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold mb-1.5 block" style={{ color: P.textMd }}>Contract Type</label>
                  <div className="flex items-center gap-2">
                    {(Object.keys(contractCfg) as ContractType[]).map(ct => {
                      const cfg = contractCfg[ct];
                      const active = form.contractType === ct;
                      return (
                        <motion.button
                          key={ct}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setForm(f => ({ ...f, contractType: ct }))}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-full text-[11px] font-semibold transition-all"
                          style={{
                            background: active ? cfg.bg : P.bg,
                            border: `1px solid ${active ? cfg.color + '50' : P.border}`,
                            color: active ? cfg.color : P.textLo,
                          }}
                        >
                          {cfg.label}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="text-[11px] font-semibold mb-1.5 block" style={{ color: P.textMd }}>Bio</label>
                <textarea
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="Brief professional biography..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-full text-xs outline-none transition-all resize-none"
                  style={{ background: P.bg, border: `1px solid ${P.border}`, color: P.textHi }}
                  onFocus={e => e.currentTarget.style.borderColor = P.accent}
                  onBlur={e => e.currentTarget.style.borderColor = P.border}
                />
              </div>

              {/* Row: Role + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold mb-1.5 block" style={{ color: P.textMd }}>Role</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(roleCfg) as UserRole[]).map(r => {
                      const cfg = roleCfg[r];
                      const active = form.role === r;
                      return (
                        <motion.button
                          key={r}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setForm(f => ({ ...f, role: r }))}
                          className="flex items-center gap-1.5 px-2.5 py-2 rounded-full text-[11px] font-semibold transition-all"
                          style={{
                            background: active ? cfg.bg : P.bg,
                            border: `1px solid ${active ? cfg.color + '50' : P.border}`,
                            color: active ? cfg.text : P.textLo,
                          }}
                        >
                          <cfg.icon size={12} />
                          {cfg.label}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold mb-1.5 block" style={{ color: P.textMd }}>Status</label>
                  <div className="space-y-2">
                    {(Object.keys(statusCfg) as UserStatus[]).map(s => {
                      const cfg = statusCfg[s];
                      const active = form.status === s;
                      return (
                        <motion.button
                          key={s}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setForm(f => ({ ...f, status: s }))}
                          className="flex items-center gap-2 w-full px-3 py-2 rounded-full text-[11px] font-semibold transition-all"
                          style={{
                            background: active ? cfg.bg : 'transparent',
                            border: `1px solid ${active ? cfg.color + '40' : P.border}`,
                            color: active ? cfg.color : P.textLo,
                          }}
                        >
                          <span className="h-2 w-2 rounded-full" style={{ background: cfg.dot }} />
                          {cfg.label}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Password (only on add) */}
              {mode === 'add' && (
                <div>
                  <label className="text-[11px] font-semibold mb-1.5 block" style={{ color: P.textMd }}>Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: P.textLo }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimum 8 characters"
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="w-full h-10 pl-9 pr-10 rounded-full text-xs outline-none transition-all"
                      style={{ background: P.bg, border: `1px solid ${P.border}`, color: P.textHi }}
                      onFocus={e => e.currentTarget.style.borderColor = P.accent}
                      onBlur={e => e.currentTarget.style.borderColor = P.border}
                    />
                    <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: P.textLo }}>
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              )}

              {/* 2FA Toggle */}
              <div className="flex items-center justify-between px-4 py-3 rounded-full" style={{ background: P.bg, border: `1px solid ${P.border}` }}>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: form.is2FAEnabled ? 'rgba(52,211,153,0.1)' : `${P.accent}10` }}>
                    <Fingerprint size={15} style={{ color: form.is2FAEnabled ? '#34d399' : P.textLo }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: P.textHi }}>Two-Factor Authentication</p>
                    <p className="text-[10px]" style={{ color: P.textLo }}>Extra security layer for account</p>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setForm(f => ({ ...f, is2FAEnabled: !f.is2FAEnabled }))}
                  className="relative h-6 w-11 rounded-full transition-colors"
                  style={{ background: form.is2FAEnabled ? '#34d399' : P.border }}
                >
                  <motion.div
                    className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md"
                    animate={{ left: form.is2FAEnabled ? 22 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </motion.button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: `1px solid ${P.border}` }}>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="px-5 py-2.5 rounded-full text-xs font-semibold"
                style={{ color: P.textMd, border: `1px solid ${P.border}` }}
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                className="px-5 py-2.5 rounded-full text-xs font-bold"
                style={{ background: P.accent, color: P.bg }}
              >
                {mode === 'add' ? 'Create User' : 'Save Changes'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE CONFIRMATION MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function DeleteModal({ isOpen, onClose, user, onConfirm }: { isOpen: boolean; onClose: () => void; user: User | null; onConfirm?: () => void }) {
  const { colors: P } = useTheme();
  if (!isOpen || !user) return null;

  const handleDelete = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="w-full max-w-sm rounded-2xl p-6 text-center"
            style={{ background: P.surface, border: `1px solid ${P.border}` }}
            onClick={e => e.stopPropagation()}
          >
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
              <AlertTriangle size={22} style={{ color: '#f87171' }} />
            </div>
            <h3 className="text-sm font-bold mb-1" style={{ color: P.textHi }}>Delete User Account</h3>
            <p className="text-xs mb-5" style={{ color: P.textMd }}>
              Are you sure you want to delete <span className="font-semibold" style={{ color: P.textHi }}>{user.name}</span>? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-full text-xs font-semibold"
                style={{ color: P.textMd, border: `1px solid ${P.border}` }}
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 rounded-full text-xs font-bold"
                style={{ background: '#f87171', color: '#fff' }}
              >
                Delete User
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER DETAIL DRAWER (Tabbed)
// ═══════════════════════════════════════════════════════════════════════════════
function UserDrawer({ isOpen, onClose, user, onEdit, onDelete }: {
  isOpen: boolean; onClose: () => void; user: User | null; onEdit: (u: User) => void; onDelete: (u: User) => void;
}) {
  const { colors: P } = useTheme();
  const [tab, setTab] = useState<'overview' | 'activity' | 'projects'>('overview');

  if (!isOpen || !user) return null;

  const rc = roleCfg[user.role];
  const sc = statusCfg[user.status];
  const cc = contractCfg[user.contractType];
  const daysSinceLogin = Math.floor((Date.now() - new Date(user.lastLogin).getTime()) / 86400000);

  const projStatusCfg: Record<string, { color: string; bg: string }> = {
    planning:  { color: '#C9C036', bg: 'rgba(201,192,54,0.1)' },
    active:    { color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
    completed: { color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
    on_hold:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  };

  const tabs = [
    { key: 'overview' as const, label: 'Overview', icon: Eye },
    { key: 'activity' as const, label: 'Activity', icon: History },
    { key: 'projects' as const, label: 'Projects', icon: FolderOpen },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex justify-end"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: EASE }}
            className="w-full max-w-lg h-full overflow-y-auto"
            style={{ background: P.surface, borderLeft: `1px solid ${P.border}` }}
            onClick={e => e.stopPropagation()}
          >
            {/* ─── Header with gradient ─── */}
            <div className="relative h-52 overflow-hidden">
              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${rc.color}20 0%, ${P.surface} 70%)` }} />
              <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 30% 30%, ${rc.color}15, transparent 60%)` }} />
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onEdit(user)} className="p-2 rounded-xl backdrop-blur-md" style={{ background: `${P.bg}80`, border: `1px solid ${P.border}`, color: P.textMd }}>
                  <Edit3 size={14} />
                </motion.button>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose} className="p-2 rounded-xl backdrop-blur-md" style={{ background: `${P.bg}80`, border: `1px solid ${P.border}`, color: P.textMd }}>
                  <X size={14} />
                </motion.button>
              </div>
              {/* Avatar + identity */}
              <div className="absolute bottom-4 left-6 right-6">
                <div className="flex items-end gap-4">
                  <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-lg font-black flex-shrink-0" style={{ background: `linear-gradient(135deg, ${rc.color}30, ${rc.color}10)`, border: `2px solid ${rc.color}40`, color: rc.text }}>
                    {user.avatar}
                  </div>
                  <div className="mb-1 min-w-0 flex-1">
                    <h2 className="text-base font-bold truncate" style={{ color: P.textHi }}>{user.name}</h2>
                    <p className="text-[11px] truncate" style={{ color: P.textMd }}>{user.jobTitle}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.color}30` }}>
                        <rc.icon size={10} />{rc.label}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: sc.bg, color: sc.color }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: sc.dot }} />{sc.label}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: cc.bg, color: cc.color }}>
                        {cc.label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Tabs ─── */}
            <div className="flex items-center border-b px-6 gap-1" style={{ borderColor: P.border }}>
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="relative flex items-center gap-1.5 px-3 py-3 text-[11px] font-semibold transition-colors"
                  style={{ color: tab === t.key ? P.accent : P.textLo }}
                >
                  <t.icon size={12} />
                  {t.label}
                  {tab === t.key && (
                    <motion.div layoutId="drawer-tab" className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ background: P.accent }} />
                  )}
                </button>
              ))}
            </div>

            {/* ─── Tab Content ─── */}
            <div className="px-6 py-5 space-y-4">
              <AnimatePresence mode="wait">
                {/* ═══ OVERVIEW TAB ═══ */}
                {tab === 'overview' && (
                  <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-4">
                    {/* Bio */}
                    {user.bio && (
                      <div className="p-3 rounded-xl" style={{ background: P.bg, border: `1px solid ${P.border}` }}>
                        <p className="text-[11px] leading-relaxed" style={{ color: P.textMd }}>{user.bio}</p>
                      </div>
                    )}

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { icon: Mail,       label: 'Email',       value: user.email },
                        { icon: Phone,      label: 'Phone',       value: user.phone },
                        { icon: Building2,  label: 'Department',  value: user.department },
                        { icon: MapPin,     label: 'Location',    value: user.location },
                        { icon: Hash,       label: 'Employee ID', value: user.employeeId },
                        { icon: FileText,   label: 'Contract',    value: cc.label },
                        { icon: Clock,      label: 'Last Login',  value: daysSinceLogin === 0 ? 'Today' : `${daysSinceLogin}d ago` },
                        { icon: Calendar,   label: 'Joined',      value: user.createdAt },
                        { icon: Globe,      label: 'Login Count', value: user.loginCount.toLocaleString() },
                        { icon: Wifi,       label: 'Last IP',     value: user.lastIP },
                        { icon: Activity,   label: 'Actions',     value: user.actionsCount.toLocaleString() },
                        { icon: BarChart3,  label: 'Projects',    value: user.projectsCount.toString() },
                      ].map(item => (
                        <div key={item.label} className="p-3 rounded-xl" style={{ background: P.bg, border: `1px solid ${P.border}` }}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <item.icon size={11} style={{ color: P.textLo }} />
                            <span className="text-[10px] font-medium" style={{ color: P.textLo }}>{item.label}</span>
                          </div>
                          <p className="text-xs font-semibold truncate" style={{ color: P.textHi }}>{item.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Security */}
                    <div className="p-4 rounded-xl" style={{ background: P.bg, border: `1px solid ${P.border}` }}>
                      <p className="text-[11px] font-bold mb-3 flex items-center gap-1.5" style={{ color: P.textMd }}>
                        <Shield size={12} style={{ color: P.accent }} />Security & Preferences
                      </p>
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Fingerprint size={13} style={{ color: user.is2FAEnabled ? '#34d399' : P.textLo }} />
                            <span className="text-xs" style={{ color: P.textMd }}>Two-Factor Auth</span>
                          </div>
                          <span className="text-[11px] font-bold" style={{ color: user.is2FAEnabled ? '#34d399' : '#f87171' }}>
                            {user.is2FAEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="h-px" style={{ background: P.border }} />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Mail size={13} style={{ color: user.notifyEmail ? '#34d399' : P.textLo }} />
                            <span className="text-xs" style={{ color: P.textMd }}>Email Notifications</span>
                          </div>
                          <span className="text-[11px] font-bold" style={{ color: user.notifyEmail ? '#34d399' : P.textLo }}>
                            {user.notifyEmail ? 'On' : 'Off'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Phone size={13} style={{ color: user.notifySms ? '#34d399' : P.textLo }} />
                            <span className="text-xs" style={{ color: P.textMd }}>SMS Notifications</span>
                          </div>
                          <span className="text-[11px] font-bold" style={{ color: user.notifySms ? '#34d399' : P.textLo }}>
                            {user.notifySms ? 'On' : 'Off'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bell size={13} style={{ color: user.notifyPush ? '#34d399' : P.textLo }} />
                            <span className="text-xs" style={{ color: P.textMd }}>Push Notifications</span>
                          </div>
                          <span className="text-[11px] font-bold" style={{ color: user.notifyPush ? '#34d399' : P.textLo }}>
                            {user.notifyPush ? 'On' : 'Off'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ═══ ACTIVITY TAB ═══ */}
                {tab === 'activity' && (
                  <motion.div key="activity" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-1">
                    <p className="text-[11px] font-bold mb-3" style={{ color: P.textMd }}>Recent Activity</p>
                    {user.recentActivity.length === 0 ? (
                      <div className="text-center py-8">
                        <History size={24} style={{ color: P.textLo }} className="mx-auto mb-2" />
                        <p className="text-xs" style={{ color: P.textLo }}>No recent activity</p>
                      </div>
                    ) : (
                      <div className="space-y-0">
                        {user.recentActivity.map((act, i) => {
                          const cfg = activityTypeCfg[act.type] || activityTypeCfg.update;
                          const date = new Date(act.time);
                          const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                          const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          return (
                            <div key={i} className="relative flex gap-3 py-3">
                              {/* Timeline line */}
                              {i < user.recentActivity.length - 1 && (
                                <div className="absolute left-[15px] top-[38px] bottom-0 w-px" style={{ background: P.border }} />
                              )}
                              {/* Icon */}
                              <div className="h-[30px] w-[30px] rounded-lg flex items-center justify-center flex-shrink-0 z-10" style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}25` }}>
                                <cfg.icon size={13} style={{ color: cfg.color }} />
                              </div>
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold" style={{ color: P.textHi }}>{act.action}</p>
                                <p className="text-[10px] truncate" style={{ color: P.textLo }}>{act.target}</p>
                                <p className="text-[10px] mt-0.5" style={{ color: P.textDim }}>{dateStr} at {timeStr}</p>
                              </div>
                              {/* Type badge */}
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md h-fit flex-shrink-0" style={{ background: `${cfg.color}10`, color: cfg.color }}>
                                {cfg.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Activity stats mini */}
                    <div className="grid grid-cols-3 gap-2 pt-3 mt-3" style={{ borderTop: `1px solid ${P.border}` }}>
                      <div className="text-center p-2.5 rounded-xl" style={{ background: P.bg, border: `1px solid ${P.border}` }}>
                        <p className="text-sm font-black tabular-nums" style={{ color: P.textHi }}>{user.loginCount}</p>
                        <p className="text-[9px]" style={{ color: P.textLo }}>Total Logins</p>
                      </div>
                      <div className="text-center p-2.5 rounded-xl" style={{ background: P.bg, border: `1px solid ${P.border}` }}>
                        <p className="text-sm font-black tabular-nums" style={{ color: P.textHi }}>{user.actionsCount}</p>
                        <p className="text-[9px]" style={{ color: P.textLo }}>Total Actions</p>
                      </div>
                      <div className="text-center p-2.5 rounded-xl" style={{ background: P.bg, border: `1px solid ${P.border}` }}>
                        <p className="text-sm font-black tabular-nums" style={{ color: daysSinceLogin > 30 ? '#f87171' : P.textHi }}>
                          {daysSinceLogin === 0 ? 'Today' : `${daysSinceLogin}d`}
                        </p>
                        <p className="text-[9px]" style={{ color: P.textLo }}>Last Seen</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ═══ PROJECTS TAB ═══ */}
                {tab === 'projects' && (
                  <motion.div key="projects" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold" style={{ color: P.textMd }}>Assigned Projects</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ background: `${P.accent}10`, color: P.accent }}>
                        {user.assignedProjects.length} assigned
                      </span>
                    </div>

                    {user.assignedProjects.length === 0 ? (
                      <div className="text-center py-8">
                        <FolderOpen size={24} style={{ color: P.textLo }} className="mx-auto mb-2" />
                        <p className="text-xs" style={{ color: P.textLo }}>No projects assigned</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {user.assignedProjects.map((proj) => {
                          const ps = projStatusCfg[proj.status] || projStatusCfg.planning;
                          return (
                            <motion.div
                              key={proj.id}
                              whileHover={{ scale: 1.01 }}
                              className="p-3.5 rounded-xl transition-colors cursor-pointer"
                              style={{ background: P.bg, border: `1px solid ${P.border}` }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold truncate" style={{ color: P.textHi }}>{proj.name}</p>
                                  <p className="text-[10px] mt-0.5" style={{ color: P.textLo }}>Role: {proj.role}</p>
                                </div>
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg whitespace-nowrap flex-shrink-0" style={{ background: ps.bg, color: ps.color, border: `1px solid ${ps.color}25` }}>
                                  {proj.status.replace('_', ' ')}
                                </span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}

                    {/* Project summary stats */}
                    <div className="grid grid-cols-4 gap-2 pt-2" style={{ borderTop: `1px solid ${P.border}` }}>
                      {['planning', 'active', 'completed', 'on_hold'].map(s => {
                        const count = user.assignedProjects.filter(p => p.status === s).length;
                        const ps = projStatusCfg[s];
                        return (
                          <div key={s} className="text-center p-2 rounded-xl" style={{ background: P.bg, border: `1px solid ${P.border}` }}>
                            <p className="text-sm font-black tabular-nums" style={{ color: count > 0 ? ps.color : P.textDim }}>{count}</p>
                            <p className="text-[8px] capitalize" style={{ color: P.textLo }}>{s.replace('_', ' ')}</p>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ─── Action Buttons (always visible) ─── */}
              <div className="flex items-center gap-3 pt-3" style={{ borderTop: `1px solid ${P.border}` }}>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => {}}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-semibold"
                  style={{ background: `${P.accent}15`, color: P.accent, border: `1px solid ${P.accent}30` }}
                >
                  <RefreshCw size={13} />Reset Password
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => onDelete(user)}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-xs font-semibold"
                  style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
                >
                  <Trash2 size={13} />Delete
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function UserManagement() {
  const { colors: P } = useTheme();

  // API queries
  const queryClient = useQueryClient();
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', { limit: 200 }],
    queryFn: () => userService.getUsers({ limit: 200 }),
    staleTime: 60 * 1000,
  });
  const { data: statsData } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => userService.getUserStats(),
    staleTime: 5 * 60 * 1000,
  });
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => userService.createUser(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); queryClient.invalidateQueries({ queryKey: ['user-stats'] }); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => userService.updateUser(id, data as any),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); queryClient.invalidateQueries({ queryKey: ['user-stats'] }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => userService.deleteUser(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); queryClient.invalidateQueries({ queryKey: ['user-stats'] }); },
  });
  const apiUsers: User[] = useMemo(() => {
    const items = (usersData as any)?.data?.items || [];
    return items.map((u: any) => ({
      id: u.id,
      name: u.name || '',
      email: u.email || '',
      role: u.role || 'viewer',
      status: u.status || 'active',
      department: u.department || '',
      phone: u.phone || '',
      avatar: (u.name || 'UN').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
      is2FAEnabled: u.is2FAEnabled || false,
      lastLogin: u.lastLoginAt || u.lastLogin || u.updatedAt || u.createdAt || '',
      createdAt: u.createdAt || '',
      projectsCount: u.projectsCount || 0,
      actionsCount: u.activityCount || u.actionsCount || 0,
      jobTitle: u.jobTitle || '',
      location: u.location || '',
      bio: u.bio || '',
      employeeId: u.employeeId || '',
      contractType: u.contractType || 'full_time',
      lastIP: u.lastIP || '',
      loginCount: u.loginCount || 0,
      assignedProjects: u.assignedProjects || [],
      recentActivity: u.recentActivity || [],
      notifyEmail: u.notifyEmail ?? true,
      notifySms: u.notifySms ?? false,
      notifyPush: u.notifyPush ?? false,
    }));
  }, [usersData]);
  const users = apiUsers;

  // State
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const perPage = 8;

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerUser, setDrawerUser] = useState<User | null>(null);

  // Filtered users
  const filtered = useMemo(() => {
    let list = [...users];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.department.toLowerCase().includes(q));
    }
    if (roleFilter !== 'all') list = list.filter(u => u.role === roleFilter);
    if (statusFilter !== 'all') list = list.filter(u => u.status === statusFilter);
    if (deptFilter !== 'all') list = list.filter(u => u.department === deptFilter);
    return list;
  }, [users, search, roleFilter, statusFilter, deptFilter]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  // Handlers
  const handleAdd = useCallback(() => {
    setModalMode('add');
    setEditUser(null);
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((user: User) => {
    setModalMode('edit');
    setEditUser(user);
    setModalOpen(true);
    setDrawerOpen(false);
  }, []);

  const handleDelete = useCallback((user: User) => {
    setDeleteUser(user);
    setDeleteOpen(true);
    setDrawerOpen(false);
  }, []);

  const handleViewUser = useCallback((user: User) => {
    setDrawerUser(user);
    setDrawerOpen(true);
  }, []);

  // Export columns definition
  const userExportColumns: ExportColumn[] = useMemo(() => [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role' },
    { key: 'department', header: 'Department' },
    { key: 'status', header: 'Status' },
    { key: 'phone', header: 'Phone' },
    { key: 'jobTitle', header: 'Job Title' },
    { key: 'location', header: 'Location' },
    { key: 'contractType', header: 'Contract Type' },
    { key: 'is2FAEnabled', header: '2FA Enabled' },
    { key: 'projectsCount', header: 'Projects', format: 'number' },
    { key: 'actionsCount', header: 'Actions', format: 'number' },
    { key: 'loginCount', header: 'Login Count', format: 'number' },
    { key: 'lastLogin', header: 'Last Login', format: 'date' },
    { key: 'createdAt', header: 'Created', format: 'date' },
  ], []);

  // Get data for export (uses filtered list)
  const getExportData = useCallback(() => {
    return filtered.map(u => ({
      name: u.name,
      email: u.email,
      role: u.role.charAt(0).toUpperCase() + u.role.slice(1),
      department: u.department || 'N/A',
      status: u.status.charAt(0).toUpperCase() + u.status.slice(1),
      phone: u.phone || 'N/A',
      jobTitle: u.jobTitle || 'N/A',
      location: u.location || 'N/A',
      contractType: u.contractType === 'full_time' ? 'Full-Time' : u.contractType === 'part_time' ? 'Part-Time' : 'Contractor',
      is2FAEnabled: u.is2FAEnabled ? 'Yes' : 'No',
      projectsCount: u.projectsCount,
      actionsCount: u.actionsCount,
      loginCount: u.loginCount,
      lastLogin: u.lastLogin,
      createdAt: u.createdAt,
    }));
  }, [filtered]);

  // Refs for entrance animation
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });

  // KPI stats - must be before export handlers that use them
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  const twoFAUsers = users.filter(u => u.is2FAEnabled).length;
  const avgActions = Math.round(users.reduce((s, u) => s + u.actionsCount, 0) / Math.max(totalUsers, 1));
  const fullTimeCount = users.filter(u => u.contractType === 'full_time').length;
  const totalLogins = users.reduce((s, u) => s + u.loginCount, 0);

  // Export handlers
  const handleExportExcel = useCallback(() => {
    const data = getExportData();
    exportToExcel(data, {
      filename: `Users_Export_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Users',
      columns: userExportColumns,
      title: 'User Management Report',
    });
  }, [getExportData, userExportColumns]);

  const handleExportPDF = useCallback(() => {
    const roleCounts: Record<string, number> = {};
    users.forEach(u => { roleCounts[u.role] = (roleCounts[u.role] || 0) + 1; });
    const roleColors: Record<string, string> = { admin: '#f87171', manager: '#38bdf8', employee: '#34d399', viewer: '#fbbf24' };
    generateUserManagementPDF({
      kpis: [
        { label: 'Total Users', value: totalUsers, format: 'number' },
        { label: 'Active Users', value: activeUsers, format: 'number' },
        { label: '2FA Enabled', value: twoFAUsers, format: 'number' },
        { label: 'Full-Time', value: fullTimeCount, format: 'number' },
      ],
      users: filtered.map(u => ({
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department,
        status: u.status,
        jobTitle: u.jobTitle || '',
        contractType: u.contractType || '',
        projectsCount: u.projectsCount || 0,
        actionsCount: u.activityCount || u.actionsCount || 0,
      })),
      roleDistribution: Object.entries(roleCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: roleColors[name] || '#94a3b8',
      })),
    });
  }, [users, filtered, totalUsers, activeUsers, twoFAUsers, fullTimeCount]);

  const handlePrint = useCallback(() => {
    const data = getExportData();
    printTable(data, userExportColumns.slice(0, 8), 'User Management Report');
  }, [getExportData, userExportColumns]);

  const kpis = [
    { label: 'Total Users',    value: totalUsers,   icon: Users,       color: '#E91E63', glow: 'rgba(233,30,99,0.15)', trend: '+2' },
    { label: 'Active',         value: activeUsers,   icon: Activity,    color: '#34d399', glow: 'rgba(52,211,153,0.15)', trend: '+1' },
    { label: '2FA Enabled',    value: twoFAUsers,    icon: Fingerprint, color: '#38bdf8', glow: 'rgba(56,189,248,0.15)', trend: '+3' },
    { label: 'Avg Actions',    value: avgActions,    icon: TrendingUp,  color: '#fbbf24', glow: 'rgba(251,191,36,0.15)', trend: '+12%' },
    { label: 'Full-Time',      value: fullTimeCount, icon: Briefcase,   color: '#a78bfa', glow: 'rgba(167,139,250,0.15)', trend: '0' },
    { label: 'Total Logins',   value: totalLogins,   icon: Globe,       color: '#fb923c', glow: 'rgba(251,146,60,0.15)', trend: '+156' },
  ];

  // Computed chart data from users
  const roleColorMap: Record<string, string> = { admin: '#f87171', manager: '#38bdf8', employee: '#34d399', viewer: '#a78bfa' };
  const roleDistData = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => { counts[u.role] = (counts[u.role] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, color: roleColorMap[name] || '#6B6849' }));
  }, [users]);

  const stats = (statsData as any)?.data;
  const activityTrend = useMemo(() => {
    const trend = stats?.activityTrend;
    const newUsers = stats?.newUsersTrend;
    if (!trend?.length) return [];
    return trend.map((t: any, i: number) => ({
      month: t.month?.replace(/\s\d{4}$/, '') || `M${i}`,
      logins: newUsers?.[i]?.count ?? 0,
      actions: t.count ?? 0,
    }));
  }, [stats]);

  const deptDistData = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => { if (u.department) counts[u.department] = (counts[u.department] || 0) + 1; });
    return Object.entries(counts).map(([dept, count]) => ({ dept, count }));
  }, [users]);

  const contractColorMap: Record<string, string> = { full_time: '#34d399', part_time: '#fbbf24', contractor: '#38bdf8' };
  const contractLabelMap: Record<string, string> = { full_time: 'Full-Time', part_time: 'Part-Time', contractor: 'Contractor' };
  const contractDistData = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => { counts[u.contractType] = (counts[u.contractType] || 0) + 1; });
    return Object.entries(counts).map(([key, value]) => ({ name: contractLabelMap[key] || key, value, color: contractColorMap[key] || '#6B6849' }));
  }, [users]);

  const locationDistData = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => { if (u.location) counts[u.location] = (counts[u.location] || 0) + 1; });
    return Object.entries(counts)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);
  }, [users]);

  const loginFrequency: { day: string; count: number }[] = [];

  return (
    <div className="min-h-full" style={{ background: P.bg, fontFamily: 'Inter, sans-serif' }}>
      {/* Background texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.018]" style={{ backgroundImage: `radial-gradient(${P.accent} 0.5px, transparent 0.5px)`, backgroundSize: '24px 24px' }} />

      <div className="relative px-6 py-5 space-y-5 max-w-[1600px] mx-auto">

        {/* ═══ Header ═══ */}
        <motion.div
          ref={heroRef}
          initial={{ opacity: 0, y: 10 }}
          animate={heroInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: EASE }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-xl font-black leading-tight flex items-center gap-3" style={{ color: P.textHi, fontFamily: 'Playfair Display, serif' }}>
              <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: `${P.accent}15`, border: `1px solid ${P.accent}30` }}>
                <UserCog size={17} style={{ color: P.accent }} />
              </div>
              User Management
            </h1>
            <p className="mt-1 text-xs" style={{ color: P.textLo }}>Manage team members, roles, and access permissions</p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-full text-xs font-semibold transition-all"
              style={{ background: P.card, color: P.textMd, border: `1px solid ${P.border}` }}
              onClick={handleExportExcel}
            >
              <FileSpreadsheet size={13} />Excel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-full text-xs font-semibold transition-all"
              style={{ background: P.card, color: P.textMd, border: `1px solid ${P.border}` }}
              onClick={handleExportPDF}
            >
              <FileText size={13} />PDF
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-full text-xs font-semibold transition-all"
              style={{ background: P.card, color: P.textMd, border: `1px solid ${P.border}` }}
              onClick={handlePrint}
            >
              <Printer size={13} />Print
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all"
              style={{ background: `${P.accent}20`, color: P.accent, border: `1px solid ${P.accent}40` }}
              onClick={handleAdd}
            >
              <UserPlus size={14} />New User
            </motion.button>
          </div>
        </motion.div>

        {/* ═══ KPI Row ═══ */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {kpis.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              variants={stagger(i * 0.06)}
              initial="hidden"
              animate="show"
              whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.25 } }}
            >
              <GlassCard className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: kpi.glow, boxShadow: `0 0 20px ${kpi.glow}` }}>
                    <kpi.icon size={16} style={{ color: kpi.color }} />
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg" style={{ background: `${kpi.color}10`, color: kpi.color }}>
                    <TrendingUp size={9} className="inline mr-0.5" />{kpi.trend}
                  </span>
                </div>
                <p className="text-2xl font-black tabular-nums" style={{ color: P.textHi }}>{kpi.value.toLocaleString()}</p>
                <p className="text-[11px] mt-0.5" style={{ color: P.textLo }}>{kpi.label}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* ═══ Charts Row ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Role Distribution Pie */}
          <motion.div variants={stagger(0.1)} initial="hidden" animate="show">
            <GlassCard className="p-5">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: P.textHi }}>
                <Shield size={14} style={{ color: P.accent }} />
                Role Distribution
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={roleDistData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={4} dataKey="value" stroke="none">
                    {roleDistData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, fontSize: 12, color: P.textHi }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {roleDistData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-[10px]" style={{ color: P.textMd }}>{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Activity Trend */}
          <motion.div variants={stagger(0.15)} initial="hidden" animate="show" className="lg:col-span-2">
            <GlassCard className="p-5">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: P.textHi }}>
                <Activity size={14} style={{ color: '#38bdf8' }} />
                User Activity Trend
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={activityTrend}>
                  <defs>
                    <linearGradient id="loginGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="actionGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={P.accent} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={P.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                  <XAxis dataKey="month" tick={{ fill: P.textLo, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: P.textLo, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ backgroundColor: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, fontSize: 12, color: P.textHi }} />
                  <Area type="monotone" dataKey="logins" stroke="#38bdf8" fill="url(#loginGrad)" strokeWidth={2} name="Logins" />
                  <Area type="monotone" dataKey="actions" stroke={P.accent} fill="url(#actionGrad)" strokeWidth={2} name="Actions" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-6 mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-6 rounded-full" style={{ background: '#38bdf8' }} />
                  <span className="text-[10px]" style={{ color: P.textMd }}>Logins</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-6 rounded-full" style={{ background: P.accent }} />
                  <span className="text-[10px]" style={{ color: P.textMd }}>Actions</span>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* ═══ Filters & Search Bar ═══ */}
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <GlassCard className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: P.textLo }} />
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search by name, email, or department..."
                  className="w-full h-10 pl-9 pr-4 rounded-full text-xs outline-none transition-all"
                  style={{ background: P.bg, border: `1px solid ${P.border}`, color: P.textHi }}
                  onFocus={e => e.currentTarget.style.borderColor = P.accent}
                  onBlur={e => e.currentTarget.style.borderColor = P.border}
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: P.textLo }}>
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Role Filter */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Filter size={12} style={{ color: P.textLo }} />
                {(['all', ...Object.keys(roleCfg)] as (UserRole | 'all')[]).map(r => {
                  const active = roleFilter === r;
                  const cfg = r !== 'all' ? roleCfg[r] : null;
                  return (
                    <motion.button
                      key={r}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { setRoleFilter(r); setPage(1); }}
                      className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all"
                      style={{
                        background: active ? (cfg ? cfg.bg : `${P.accent}15`) : 'transparent',
                        border: `1px solid ${active ? (cfg ? cfg.color + '40' : P.accent + '40') : P.border}`,
                        color: active ? (cfg ? cfg.text : P.accent) : P.textLo,
                      }}
                    >
                      {r === 'all' ? 'All Roles' : cfg?.label}
                    </motion.button>
                  );
                })}
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value as UserStatus | 'all'); setPage(1); }}
                  className="h-10 pl-3 pr-8 rounded-full text-xs outline-none appearance-none cursor-pointer"
                  style={{ background: P.bg, border: `1px solid ${P.border}`, color: P.textHi }}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: P.textLo }} />
              </div>

              {/* Department Filter */}
              <div className="relative">
                <select
                  value={deptFilter}
                  onChange={e => { setDeptFilter(e.target.value); setPage(1); }}
                  className="h-10 pl-3 pr-8 rounded-full text-xs outline-none appearance-none cursor-pointer"
                  style={{ background: P.bg, border: `1px solid ${P.border}`, color: P.textHi }}
                >
                  <option value="all">All Departments</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: P.textLo }} />
              </div>
            </div>

            {/* Active filter tags */}
            {(roleFilter !== 'all' || statusFilter !== 'all' || deptFilter !== 'all') && (
              <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: `1px solid ${P.border}` }}>
                <span className="text-[10px]" style={{ color: P.textLo }}>Active filters:</span>
                {roleFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: roleCfg[roleFilter].bg, color: roleCfg[roleFilter].text }}>
                    {roleCfg[roleFilter].label}
                    <X size={9} className="cursor-pointer" onClick={() => setRoleFilter('all')} />
                  </span>
                )}
                {statusFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: statusCfg[statusFilter].bg, color: statusCfg[statusFilter].color }}>
                    {statusCfg[statusFilter].label}
                    <X size={9} className="cursor-pointer" onClick={() => setStatusFilter('all')} />
                  </span>
                )}
                {deptFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: `${P.accent}10`, color: P.accent }}>
                    {deptFilter}
                    <X size={9} className="cursor-pointer" onClick={() => setDeptFilter('all')} />
                  </span>
                )}
                <button onClick={() => { setRoleFilter('all'); setStatusFilter('all'); setDeptFilter('all'); }} className="text-[10px] font-medium ml-auto" style={{ color: P.accent }}>
                  Clear all
                </button>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* ═══ Users Table ═══ */}
        <motion.div variants={stagger(0.2)} initial="hidden" animate="show">
          <GlassCard className="overflow-hidden">
            {/* Table header info */}
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${P.border}` }}>
              <p className="text-xs font-semibold" style={{ color: P.textMd }}>
                Showing <span style={{ color: P.textHi }}>{paginated.length}</span> of <span style={{ color: P.textHi }}>{filtered.length}</span> users
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[10px]" style={{ color: P.textLo }}>
                  {filtered.filter(u => u.status === 'active').length} active
                </span>
                <span className="h-3 w-px" style={{ background: P.border }} />
                <span className="text-[10px]" style={{ color: P.textLo }}>
                  {filtered.filter(u => u.is2FAEnabled).length} with 2FA
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${P.border}` }}>
                    {['User', 'Role', 'Department', 'Location', 'Status', '2FA', 'Last Login', 'Projects', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: P.textLo }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {paginated.map((user, i) => {
                      const rc = roleCfg[user.role];
                      const sc = statusCfg[user.status];
                      const daysSince = Math.floor((Date.now() - new Date(user.lastLogin).getTime()) / 86400000);

                      return (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ delay: i * 0.04, duration: 0.35 }}
                          className="group transition-colors cursor-pointer"
                          style={{ borderBottom: `1px solid ${P.border}80` }}
                          onMouseEnter={e => e.currentTarget.style.background = `${P.accent}06`}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          onClick={() => handleViewUser(user)}
                        >
                          {/* User */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: `${rc.color}15`, border: `1px solid ${rc.color}25`, color: rc.text }}>
                                {user.avatar}
                              </div>
                              <div>
                                <p className="text-[13px] font-semibold group-hover:!text-[#E91E63] transition-colors" style={{ color: P.textHi }}>{user.name}</p>
                                <p className="text-[10px]" style={{ color: P.textLo }}>{user.jobTitle}</p>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.color}25` }}>
                              <rc.icon size={10} />{rc.label}
                            </span>
                          </td>

                          {/* Department */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="text-xs" style={{ color: P.textMd }}>{user.department}</span>
                          </td>

                          {/* Location */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <MapPin size={10} style={{ color: P.textLo }} />
                              <span className="text-[11px]" style={{ color: P.textLo }}>{user.location}</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: sc.bg, color: sc.color }}>
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: sc.dot }} />
                              {sc.label}
                            </span>
                          </td>

                          {/* 2FA */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-center">
                            {user.is2FAEnabled ? (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-lg" style={{ background: 'rgba(52,211,153,0.1)' }}>
                                <Check size={12} style={{ color: '#34d399' }} />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-lg" style={{ background: 'rgba(248,113,113,0.1)' }}>
                                <X size={12} style={{ color: '#f87171' }} />
                              </span>
                            )}
                          </td>

                          {/* Last Login */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Clock size={11} style={{ color: P.textLo }} />
                              <span className="text-[11px] tabular-nums" style={{ color: daysSince > 30 ? '#f87171' : P.textMd }}>
                                {daysSince === 0 ? 'Today' : daysSince === 1 ? 'Yesterday' : `${daysSince}d ago`}
                              </span>
                            </div>
                          </td>

                          {/* Projects */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="text-xs tabular-nums font-semibold" style={{ color: P.textMd }}>{user.projectsCount}</span>
                          </td>

                          {/* Actions column */}
                          <td className="px-4 py-3.5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <motion.button
                                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                onClick={() => handleEdit(user)}
                                className="p-1.5 rounded-full transition-colors"
                                style={{ color: P.textLo }}
                                onMouseEnter={e => { e.currentTarget.style.background = `${P.accent}15`; e.currentTarget.style.color = P.accent; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = P.textLo; }}
                                title="Edit"
                              >
                                <Edit3 size={13} />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                onClick={() => handleDelete(user)}
                                className="p-1.5 rounded-full transition-colors"
                                style={{ color: P.textLo }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; e.currentTarget.style.color = '#f87171'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = P.textLo; }}
                                title="Delete"
                              >
                                <Trash2 size={13} />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                onClick={() => handleViewUser(user)}
                                className="p-1.5 rounded-full transition-colors"
                                style={{ color: P.textLo }}
                                onMouseEnter={e => { e.currentTarget.style.background = `${P.accent}15`; e.currentTarget.style.color = P.accent; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = P.textLo; }}
                                title="View Details"
                              >
                                <MoreHorizontal size={14} />
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>

                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: `${P.accent}10`, border: `1px solid ${P.accent}20` }}>
                            <Users size={24} style={{ color: P.accent }} />
                          </div>
                          <p className="text-sm font-semibold" style={{ color: P.textHi }}>No users found</p>
                          <p className="text-xs" style={{ color: P.textLo }}>Try adjusting your search or filters</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: `1px solid ${P.border}` }}>
                <p className="text-[11px]" style={{ color: P.textLo }}>
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-full disabled:opacity-30"
                    style={{ color: P.textMd }}
                  >
                    <ChevronLeft size={14} />
                  </motion.button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <motion.button
                      key={p}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setPage(p)}
                      className="h-8 w-8 rounded-full text-xs font-semibold"
                      style={{
                        background: page === p ? `${P.accent}20` : 'transparent',
                        color: page === p ? P.accent : P.textLo,
                        border: `1px solid ${page === p ? P.accent + '40' : 'transparent'}`,
                      }}
                    >
                      {p}
                    </motion.button>
                  ))}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-full disabled:opacity-30"
                    style={{ color: P.textMd }}
                  >
                    <ChevronRight size={14} />
                  </motion.button>
                </div>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* ═══ Bottom Charts Grid (3-col) ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Department Distribution */}
          <motion.div variants={stagger(0.25)} initial="hidden" animate="show">
            <GlassCard className="p-5">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: P.textHi }}>
                <Building2 size={14} style={{ color: '#fbbf24' }} />
                Users by Department
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={deptDistData} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                  <XAxis dataKey="dept" tick={{ fill: P.textLo, fontSize: 9 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={45} />
                  <YAxis tick={{ fill: P.textLo, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <RechartsTooltip contentStyle={{ backgroundColor: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, fontSize: 12, color: P.textHi }} />
                  <Bar dataKey="count" name="Users" radius={[8, 8, 0, 0]}>
                    {deptDistData.map((_, idx) => (
                      <Cell key={idx} fill={['#E91E63', '#38bdf8', '#34d399', '#fbbf24', '#a78bfa', '#f87171', '#fb923c', '#34d399'][idx % 8]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>

          {/* Contract Type Distribution */}
          <motion.div variants={stagger(0.3)} initial="hidden" animate="show">
            <GlassCard className="p-5">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: P.textHi }}>
                <FileText size={14} style={{ color: '#34d399' }} />
                Contract Types
              </h3>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={contractDistData} cx="50%" cy="50%" innerRadius={40} outerRadius={64} paddingAngle={4} dataKey="value" stroke="none">
                    {contractDistData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, fontSize: 12, color: P.textHi }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {contractDistData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-[10px]" style={{ color: P.textMd }}>{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Login Frequency by Day */}
          <motion.div variants={stagger(0.35)} initial="hidden" animate="show">
            <GlassCard className="p-5">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: P.textHi }}>
                <Globe size={14} style={{ color: '#a78bfa' }} />
                Login Frequency (Weekly)
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={loginFrequency} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                  <XAxis dataKey="day" tick={{ fill: P.textLo, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: P.textLo, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ backgroundColor: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, fontSize: 12, color: P.textHi }} />
                  <Bar dataKey="count" name="Logins" radius={[8, 8, 0, 0]} fill="#a78bfa" />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </div>

        {/* ═══ Location Distribution (Horizontal Bar) ═══ */}
        <motion.div variants={stagger(0.4)} initial="hidden" animate="show">
          <GlassCard className="p-5">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: P.textHi }}>
              <MapPin size={14} style={{ color: '#E91E63' }} />
              Users by Governorate
            </h3>
            <div className="space-y-2.5">
              {locationDistData.map((loc, i) => {
                const max = Math.max(...locationDistData.map(l => l.count));
                const pct = (loc.count / max) * 100;
                const barColors = ['#E91E63', '#38bdf8', '#34d399', '#fbbf24', '#a78bfa'];
                return (
                  <div key={loc.location} className="flex items-center gap-3">
                    <span className="text-[11px] w-40 text-right truncate" style={{ color: P.textMd }}>{loc.location}</span>
                    <div className="flex-1 h-6 rounded-lg overflow-hidden" style={{ background: P.bg }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }}
                        className="h-full rounded-lg"
                        style={{ background: barColors[i % barColors.length] }}
                      />
                    </div>
                    <span className="text-xs font-bold w-8 text-right tabular-nums" style={{ color: P.textHi }}>{loc.count}</span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* ═══ Modals ═══ */}
      <UserModal isOpen={modalOpen} onClose={() => setModalOpen(false)} user={editUser} mode={modalMode}
        onSave={(data, mode, userId) => { if (mode === 'add') createMutation.mutate(data); else if (userId) updateMutation.mutate({ id: userId, data }); }} />
      <DeleteModal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} user={deleteUser}
        onConfirm={() => { if (deleteUser) deleteMutation.mutate(deleteUser.id); }} />
      <UserDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} user={drawerUser} onEdit={handleEdit} onDelete={handleDelete} />
    </div>
  );
}
