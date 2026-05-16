// @ts-nocheck
import { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  User, Building2, Settings as SettingsIcon, Shield, Database, FileText, Puzzle, CreditCard,
  Camera, Mail, Phone, Briefcase, Users, Lock, Smartphone, Bell, Globe, Clock, Calendar,
  DollarSign, Sun, Moon, Monitor, Scale, Eye, EyeOff, Laptop, MapPin, Trash2, Download,
  Upload, RefreshCw, HardDrive, Cloud, History, Filter, Search, ChevronDown, Check, X,
  Plus, Edit3, ExternalLink, Zap, AlertTriangle, Info, CheckCircle2, MoreVertical,
  Webhook, Crown, Sparkles, Star, ArrowUpRight, Copy, RotateCcw, Loader2,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { cn } from '../utils/cn';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { settingsService } from '../services/settingsService';
import { activityLogService } from '../services/activityLogService';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../components/common/Toast';

// ═══════════════════════════════════════════════════════════════════════════
// Framer Motion Variants
// ═══════════════════════════════════════════════════════════════════════════
const EASE: any = [0.22, 1, 0.36, 1];
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};
const stagger = (delay = 0) => ({
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay } },
});
const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: EASE } },
};
const slideIn = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE } },
};

// ═══════════════════════════════════════════════════════════════════════════
// Tab Definitions
// ═══════════════════════════════════════════════════════════════════════════
const tabs = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'company', label: 'Company', icon: Building2 },
  { id: 'system', label: 'System', icon: SettingsIcon },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'backup', label: 'Backup', icon: Database },
  { id: 'audit', label: 'Audit Log', icon: FileText },
  { id: 'integrations', label: 'Integrations', icon: Puzzle },
  { id: 'billing', label: 'Billing', icon: CreditCard },
] as const;

type TabId = typeof tabs[number]['id'];


// ═══════════════════════════════════════════════════════════════════════════
// Helper Components
// ═══════════════════════════════════════════════════════════════════════════

function GlassCard({ 
  children, 
  className, 
  glow, 
  noPadding,
  hover = true,
}: { 
  children: React.ReactNode; 
  className?: string; 
  glow?: string;
  noPadding?: boolean;
  hover?: boolean;
}) {
  const { colors: P } = useTheme();
  return (
    <motion.div
      className={cn('relative rounded-[20px]', className)}
      style={{
        background: `linear-gradient(168deg, ${P.card} 0%, ${P.bg} 100%)`,
        border: `1px solid ${P.border}`,
        boxShadow: [
          `inset 0 1px 0 0 ${P.borderHi}40`,
          glow ? `0 0 60px ${glow}` : '',
          '0 12px 40px rgba(0,0,0,0.15)',
        ].filter(Boolean).join(', '),
      }}
      whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : undefined}
    >
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${P.borderHi}90, transparent)` }} />
      <div className={noPadding ? '' : 'p-6'}>{children}</div>
    </motion.div>
  );
}

function SectionHeader({ 
  icon: Icon, 
  title, 
  subtitle,
  action,
}: { 
  icon: React.ElementType; 
  title: string; 
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const { colors: P } = useTheme();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div 
      ref={ref}
      className="flex items-center justify-between mb-6"
      initial={{ opacity: 0, x: -20 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <div className="flex items-center gap-3">
        <div 
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ 
            background: `linear-gradient(135deg, ${P.accent}25, ${P.accent}08)`,
            border: `1px solid ${P.accent}35`,
          }}
        >
          <Icon size={18} style={{ color: P.accent }} />
        </div>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: P.textHi }}>{title}</h3>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: P.textLo }}>{subtitle}</p>}
        </div>
      </div>
      {action}
    </motion.div>
  );
}

function FormField({ 
  label, 
  value, 
  onChange, 
  type = 'text',
  placeholder,
  icon: Icon,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  icon?: React.ElementType;
  disabled?: boolean;
}) {
  const { colors: P } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium tracking-wide uppercase" style={{ color: P.textLo }}>
        {label}
      </label>
      <div 
        className="relative flex items-center rounded-xl overflow-hidden transition-all duration-200"
        style={{ 
          background: P.surface,
          border: `1px solid ${focused ? P.accent + '60' : P.border}`,
          boxShadow: focused ? `0 0 0 3px ${P.accent}15` : 'none',
        }}
      >
        {Icon && (
          <div className="pl-4" style={{ color: focused ? P.accent : P.textLo }}>
            <Icon size={16} />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full px-4 py-3 bg-transparent outline-none text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ color: P.textHi }}
        />
      </div>
    </div>
  );
}

function Toggle({ 
  enabled, 
  onChange, 
  label, 
  subtitle,
}: { 
  enabled: boolean; 
  onChange: (v: boolean) => void; 
  label: string;
  subtitle?: string;
}) {
  const { colors: P } = useTheme();

  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium" style={{ color: P.textHi }}>{label}</p>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: P.textLo }}>{subtitle}</p>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className="relative w-12 h-6 rounded-full transition-all duration-300"
        style={{ 
          background: enabled ? P.accent : P.surface,
          border: `1px solid ${enabled ? P.accent : P.border}`,
        }}
      >
        <motion.div
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow-md"
          style={{ background: enabled ? P.bg : P.textLo }}
          animate={{ x: enabled ? 22 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}

function SelectDropdown({
  label,
  value,
  options,
  onChange,
  icon: Icon,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  icon?: React.ElementType;
}) {
  const { colors: P } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium tracking-wide uppercase" style={{ color: P.textLo }}>
        {label}
      </label>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-200"
          style={{ 
            background: P.surface,
            border: `1px solid ${open ? P.accent + '60' : P.border}`,
          }}
        >
          <div className="flex items-center gap-3">
            {Icon && <Icon size={16} style={{ color: P.textLo }} />}
            <span className="text-sm" style={{ color: P.textHi }}>
              {options.find(o => o.value === value)?.label || value}
            </span>
          </div>
          <ChevronDown 
            size={16} 
            style={{ color: P.textLo, transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} 
          />
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-2 w-full rounded-xl overflow-hidden z-50 shadow-2xl"
              style={{ 
                background: P.card,
                border: `1px solid ${P.border}`,
              }}
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => { onChange(option.value); setOpen(false); }}
                  className="w-full flex items-center justify-between px-4 py-3 transition-all duration-150"
                  style={{ 
                    background: value === option.value ? `${P.accent}15` : 'transparent',
                    color: value === option.value ? P.accent : P.textMd,
                  }}
                  onMouseEnter={(e) => { if (value !== option.value) e.currentTarget.style.background = `${P.accent}08`; }}
                  onMouseLeave={(e) => { if (value !== option.value) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span className="text-sm">{option.label}</span>
                  {value === option.value && <Check size={14} style={{ color: P.accent }} />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'success' | 'warning' | 'error' | 'info' | 'completed' | 'failed' | 'paid' }) {
  const { colors: P } = useTheme();
  const config: Record<string, { bg: string; text: string; label: string }> = {
    success: { bg: 'rgba(52,211,153,0.15)', text: '#6ee7b7', label: 'Success' },
    completed: { bg: 'rgba(52,211,153,0.15)', text: '#6ee7b7', label: 'Completed' },
    paid: { bg: 'rgba(52,211,153,0.15)', text: '#6ee7b7', label: 'Paid' },
    warning: { bg: 'rgba(251,191,36,0.15)', text: '#fde68a', label: 'Warning' },
    error: { bg: 'rgba(248,113,113,0.15)', text: '#fca5a5', label: 'Failed' },
    failed: { bg: 'rgba(248,113,113,0.15)', text: '#fca5a5', label: 'Failed' },
    info: { bg: `${P.accent}20`, text: P.accent, label: 'Info' },
  };
  const cfg = config[status] || config.info;

  return (
    <span 
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      {cfg.label}
    </span>
  );
}

function ActionButton({ 
  variant = 'default',
  size = 'md',
  icon: Icon,
  children,
  onClick,
  disabled,
}: {
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ElementType;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const { colors: P } = useTheme();
  
  const variants = {
    default: { bg: P.surface, border: P.border, text: P.textMd, hover: P.cardHi },
    primary: { bg: P.accent, border: P.accent, text: P.bg, hover: P.accentLo },
    danger: { bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.3)', text: '#fca5a5', hover: 'rgba(248,113,113,0.25)' },
    ghost: { bg: 'transparent', border: 'transparent', text: P.textMd, hover: `${P.accent}10` },
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-sm gap-2.5',
  };

  const v = variants[variant];

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={cn('inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed', sizes[size])}
      style={{ background: v.bg, border: `1px solid ${v.border}`, color: v.text }}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = v.hover; }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.background = v.bg; }}
    >
      {Icon && <Icon size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} />}
      {children}
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Tab Content Components
// ═══════════════════════════════════════════════════════════════════════════

function AccountTab() {
  const { colors: P } = useTheme();
  const queryClient = useQueryClient();
  const storeUser = useAuthStore((s) => s.user);

  // Fetch user profile from API
  const { data: meData, isLoading: meLoading } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => authService.getMe(),
  });

  const apiUser = meData?.data;

  const [account, setAccount] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    avatar: null as string | null,
    twoFactorEnabled: false,
    notifications: { email: true, push: true, sms: false, weeklyDigest: true, alertsOnly: false },
  });

  // Sync state when API data arrives
  useEffect(() => {
    if (apiUser) {
      setAccount((prev) => ({
        ...prev,
        name: apiUser.name || '',
        email: apiUser.email || '',
        phone: (apiUser as any).phone || '',
        position: (apiUser as any).position || '',
        department: apiUser.department || '',
        avatar: (apiUser as any).avatarUrl || null,
        twoFactorEnabled: (apiUser as any).is2FAEnabled || false,
      }));
    } else if (storeUser) {
      setAccount((prev) => ({
        ...prev,
        name: storeUser.name || '',
        email: storeUser.email || '',
        department: storeUser.department || '',
      }));
    }
  }, [apiUser, storeUser]);

  // Save profile mutation
  const updateProfile = useMutation({
    mutationFn: (data: Record<string, unknown>) => authService.updateMe(data as any),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['auth-me'] }); },
  });

  const [saving, setSaving] = useState(false);
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile.mutateAsync({ name: account.name, department: account.department, phone: account.phone, location: account.position });
    } catch {}
    setSaving(false);
  };

  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const toast = useToast();

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Missing fields', 'Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mismatch', 'New password and confirmation do not match.');
      return;
    }
    setChangingPassword(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      toast.success('Password updated', 'Your password has been changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to change password.';
      toast.error('Password change failed', msg);
    }
    setChangingPassword(false);
  };

  return (
    <motion.div initial="hidden" animate="show" className="space-y-8">
      {/* Profile Section */}
      <motion.div variants={fadeUp as any}>
        <GlassCard>
          <SectionHeader icon={User} title="Profile Information" subtitle="Update your personal details" />
          
          <div className="flex items-start gap-8 mb-8">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div 
                className="relative w-28 h-28 rounded-2xl overflow-hidden"
                style={{ 
                  background: `linear-gradient(135deg, ${P.accent}30, ${P.accent}10)`,
                  border: `2px solid ${P.accent}40`,
                }}
              >
                {account.avatar ? (
                  <img src={account.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={40} style={{ color: P.accent }} />
                  </div>
                )}
                <button 
                  className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200"
                  style={{ background: 'rgba(0,0,0,0.6)' }}
                >
                  <Camera size={24} style={{ color: P.textHi }} />
                </button>
              </div>
              <button 
                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                style={{ color: P.accent, background: `${P.accent}15` }}
              >
                Change Photo
              </button>
            </div>

            {/* Form Fields */}
            <div className="flex-1 grid grid-cols-2 gap-6">
              <FormField 
                label="Full Name" 
                value={account.name} 
                onChange={(v) => setAccount({...account, name: v})}
                icon={User}
              />
              <FormField 
                label="Email Address" 
                value={account.email} 
                onChange={(v) => setAccount({...account, email: v})}
                type="email"
                icon={Mail}
              />
              <FormField 
                label="Phone Number" 
                value={account.phone} 
                onChange={(v) => setAccount({...account, phone: v})}
                icon={Phone}
              />
              <FormField 
                label="Position" 
                value={account.position} 
                onChange={(v) => setAccount({...account, position: v})}
                icon={Briefcase}
              />
              <div className="col-span-2">
                <FormField 
                  label="Department" 
                  value={account.department} 
                  onChange={(v) => setAccount({...account, department: v})}
                  icon={Users}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <ActionButton variant="primary" icon={saving ? Loader2 : Check} onClick={handleSaveProfile} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </ActionButton>
          </div>
        </GlassCard>
      </motion.div>

      {/* Password Section */}
      <motion.div variants={stagger(0.1) as any}>
        <GlassCard>
          <SectionHeader icon={Lock} title="Change Password" subtitle="Ensure your password is strong and unique" />
          
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="space-y-2">
              <label className="text-xs font-medium tracking-wide uppercase" style={{ color: P.textLo }}>
                Current Password
              </label>
              <div 
                className="relative flex items-center rounded-xl overflow-hidden"
                style={{ background: P.surface, border: `1px solid ${P.border}` }}
              >
                <div className="pl-4" style={{ color: P.textLo }}><Lock size={16} /></div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-transparent outline-none text-sm"
                  style={{ color: P.textHi }}
                />
                <button 
                  onClick={() => setShowPassword(!showPassword)}
                  className="pr-4"
                  style={{ color: P.textLo }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <FormField 
              label="New Password" 
              value={newPassword} 
              onChange={setNewPassword}
              type="password"
              placeholder="••••••••"
              icon={Lock}
            />
            <FormField 
              label="Confirm Password" 
              value={confirmPassword} 
              onChange={setConfirmPassword}
              type="password"
              placeholder="••••••••"
              icon={Lock}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl mb-6" style={{ background: `${P.accent}08`, border: `1px solid ${P.accent}20` }}>
            <div className="flex items-center gap-3">
              <Info size={16} style={{ color: P.accent }} />
              <span className="text-xs" style={{ color: P.textMd }}>
                Password must be at least 12 characters with uppercase, lowercase, numbers, and symbols.
              </span>
            </div>
          </div>

          <div className="flex justify-end">
            <ActionButton variant="default" icon={changingPassword ? Loader2 : Lock} onClick={handleChangePassword} disabled={changingPassword}>
              {changingPassword ? 'Updating...' : 'Update Password'}
            </ActionButton>
          </div>
        </GlassCard>
      </motion.div>

      {/* 2FA & Notifications */}
      <div className="grid grid-cols-2 gap-6">
        <motion.div variants={stagger(0.2) as any}>
          <GlassCard>
            <SectionHeader icon={Smartphone} title="Two-Factor Authentication" subtitle="Add extra security to your account" />
            
            <div 
              className="flex items-center gap-4 p-4 rounded-xl mb-4"
              style={{ 
                background: account.twoFactorEnabled ? 'rgba(52,211,153,0.1)' : `${P.accent}08`,
                border: `1px solid ${account.twoFactorEnabled ? 'rgba(52,211,153,0.3)' : P.accent + '20'}`,
              }}
            >
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: account.twoFactorEnabled ? 'rgba(52,211,153,0.2)' : `${P.accent}15` }}
              >
                {account.twoFactorEnabled ? (
                  <Shield size={20} style={{ color: '#6ee7b7' }} />
                ) : (
                  <AlertTriangle size={20} style={{ color: P.accent }} />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: account.twoFactorEnabled ? '#6ee7b7' : P.textHi }}>
                  {account.twoFactorEnabled ? '2FA is Enabled' : '2FA is Disabled'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: P.textLo }}>
                  {account.twoFactorEnabled ? 'Your account is protected with authenticator app' : 'Enable for enhanced security'}
                </p>
              </div>
            </div>

            <Toggle
              enabled={account.twoFactorEnabled}
              onChange={async (v) => {
                if (v) {
                  // Enabling 2FA: call setup then prompt for verification
                  try {
                    const res = await authService.setup2FA();
                    const secret = (res as any)?.data?.secret || '';
                    const code = window.prompt(`2FA Setup: Enter the verification code from your authenticator app.\n\nSecret: ${secret}`);
                    if (code) {
                      await authService.verify2FA(code);
                      setAccount({ ...account, twoFactorEnabled: true });
                      toast.success('2FA Enabled', 'Two-factor authentication is now active.');
                    } else {
                      toast.info('2FA Setup Cancelled', 'You did not enter a verification code.');
                    }
                  } catch (err: any) {
                    const msg = err?.response?.data?.error?.message || 'Failed to set up 2FA.';
                    toast.error('2FA Setup Failed', msg);
                  }
                } else {
                  // Disabling 2FA
                  try {
                    await authService.disable2FA();
                    setAccount({ ...account, twoFactorEnabled: false });
                    toast.success('2FA Disabled', 'Two-factor authentication has been disabled.');
                  } catch (err: any) {
                    const msg = err?.response?.data?.error?.message || 'Failed to disable 2FA.';
                    toast.error('2FA Disable Failed', msg);
                  }
                }
              }}
              label="Enable 2FA"
              subtitle="Use Google Authenticator or similar app"
            />
          </GlassCard>
        </motion.div>

        <motion.div variants={stagger(0.25) as any}>
          <GlassCard>
            <SectionHeader icon={Bell} title="Notification Preferences" subtitle="Manage how you receive updates" />
            
            <div className="space-y-1">
              <Toggle 
                enabled={account.notifications.email} 
                onChange={(v) => setAccount({...account, notifications: {...account.notifications, email: v}})}
                label="Email Notifications"
                subtitle="Receive updates via email"
              />
              <div className="h-px" style={{ background: P.border }} />
              <Toggle 
                enabled={account.notifications.push} 
                onChange={(v) => setAccount({...account, notifications: {...account.notifications, push: v}})}
                label="Push Notifications"
                subtitle="Browser and mobile push alerts"
              />
              <div className="h-px" style={{ background: P.border }} />
              <Toggle 
                enabled={account.notifications.sms} 
                onChange={(v) => setAccount({...account, notifications: {...account.notifications, sms: v}})}
                label="SMS Alerts"
                subtitle="Critical alerts via text message"
              />
              <div className="h-px" style={{ background: P.border }} />
              <Toggle 
                enabled={account.notifications.weeklyDigest} 
                onChange={(v) => setAccount({...account, notifications: {...account.notifications, weeklyDigest: v}})}
                label="Weekly Digest"
                subtitle="Summary email every Monday"
              />
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </motion.div>
  );
}

function CompanyTab() {
  const { colors: P } = useTheme();
  const queryClient = useQueryClient();

  // Fetch settings from API
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsService.getAll(),
  });

  const settings = settingsData?.data as Record<string, any> || {};

  const [company, setCompany] = useState({
    name: '',
    website: '',
    phone: '',
    address: '',
    logo: null as string | null,
    visionAlignment: { economy: 0, society: 0, governance: 0, environment: 0 },
  });

  // Sync from settings API
  useEffect(() => {
    if (settings['company.name']) setCompany((prev) => ({ ...prev, name: settings['company.name'] as string }));
    if (settings['company.website']) setCompany((prev) => ({ ...prev, website: settings['company.website'] as string }));
    if (settings['company.phone']) setCompany((prev) => ({ ...prev, phone: settings['company.phone'] as string }));
    if (settings['company.address']) setCompany((prev) => ({ ...prev, address: settings['company.address'] as string }));
    if (settings['company.visionAlignment']) setCompany((prev) => ({ ...prev, visionAlignment: settings['company.visionAlignment'] as any }));
  }, [settings]);

  // Save mutation
  const saveCompany = useMutation({
    mutationFn: () => settingsService.bulkUpdate([
      { key: 'company.name', value: company.name },
      { key: 'company.website', value: company.website },
      { key: 'company.phone', value: company.phone },
      { key: 'company.address', value: company.address },
      { key: 'company.visionAlignment', value: company.visionAlignment },
    ]),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['settings'] }); },
  });

  const pillars = [
    { key: 'economy', label: 'Economy & Diversification', icon: DollarSign, color: '#C9C036' },
    { key: 'society', label: 'Society & Wellbeing', icon: Users, color: '#38bdf8' },
    { key: 'governance', label: 'Governance & Institutions', icon: Building2, color: '#a78bfa' },
    { key: 'environment', label: 'Environment & Resources', icon: Globe, color: '#34d399' },
  ];

  return (
    <motion.div initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={fadeUp as any}>
        <GlassCard>
          <SectionHeader icon={Building2} title="Organization Details" subtitle="Your company information" />
          
          <div className="flex items-start gap-8 mb-8">
            {/* Logo */}
            <div className="flex flex-col items-center gap-3">
              <div 
                className="relative w-32 h-32 rounded-2xl overflow-hidden flex items-center justify-center"
                style={{ 
                  background: `linear-gradient(135deg, ${P.accent}20, ${P.accent}05)`,
                  border: `2px dashed ${P.accent}40`,
                }}
              >
                {company.logo ? (
                  <img src={company.logo} alt="Company Logo" className="w-full h-full object-contain p-4" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload size={28} style={{ color: P.accent }} />
                    <span className="text-[10px] font-medium" style={{ color: P.textLo }}>Upload Logo</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ color: P.accent, background: `${P.accent}15` }}>
                  Upload
                </button>
                <button className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ color: P.textLo, background: P.surface }}>
                  Remove
                </button>
              </div>
            </div>

            {/* Fields */}
            <div className="flex-1 grid grid-cols-2 gap-6">
              <FormField 
                label="Organization Name" 
                value={company.name} 
                onChange={(v) => setCompany({...company, name: v})}
                icon={Building2}
              />
              <FormField 
                label="Website" 
                value={company.website} 
                onChange={(v) => setCompany({...company, website: v})}
                icon={Globe}
              />
              <FormField 
                label="Phone" 
                value={company.phone} 
                onChange={(v) => setCompany({...company, phone: v})}
                icon={Phone}
              />
              <div className="col-span-1" />
              <div className="col-span-2">
                <FormField 
                  label="Address" 
                  value={company.address} 
                  onChange={(v) => setCompany({...company, address: v})}
                  icon={MapPin}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <ActionButton variant="primary" icon={saveCompany.isPending ? Loader2 : Check} onClick={() => saveCompany.mutate()} disabled={saveCompany.isPending}>
              {saveCompany.isPending ? 'Saving...' : 'Save Changes'}
            </ActionButton>
          </div>
        </GlassCard>
      </motion.div>

      {/* Vision 2040 Alignment */}
      <motion.div variants={stagger(0.1) as any}>
        <GlassCard>
          <SectionHeader 
            icon={Star} 
            title="Oman Vision 2040 Alignment" 
            subtitle="Track alignment with national development goals"
          />
          
          <div className="grid grid-cols-4 gap-4">
            {pillars.map((pillar, i) => {
              const Icon = pillar.icon;
              const value = company.visionAlignment[pillar.key as keyof typeof company.visionAlignment];
              
              return (
                <motion.div
                  key={pillar.key}
                  variants={stagger(i * 0.05) as any}
                  className="relative p-5 rounded-2xl"
                  style={{ 
                    background: `linear-gradient(135deg, ${pillar.color}10, transparent)`,
                    border: `1px solid ${pillar.color}25`,
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${pillar.color}20` }}
                    >
                      <Icon size={18} style={{ color: pillar.color }} />
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: P.textHi }}>{pillar.label.split(' & ')[0]}</p>
                      <p className="text-[10px]" style={{ color: P.textLo }}>{pillar.label.split(' & ')[1]}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-end gap-2 mb-3">
                    <span className="text-3xl font-bold tabular-nums" style={{ color: pillar.color }}>{value}</span>
                    <span className="text-sm mb-1" style={{ color: P.textLo }}>%</span>
                  </div>
                  
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: `${pillar.color}15` }}>
                    <motion.div 
                      className="h-full rounded-full"
                      style={{ background: pillar.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${value}%` }}
                      transition={{ duration: 1, delay: i * 0.1, ease: EASE }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

function SystemTab() {
  const { colors: P, isDark, toggleTheme } = useTheme();
  const [language, setLanguage] = useState('en');
  const [timezone, setTimezone] = useState('gmt+4');
  const [dateFormat, setDateFormat] = useState('dd-mm-yyyy');
  const [currency, setCurrency] = useState('omr');
  const [density, setDensity] = useState(50);

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'ar', label: 'العربية (Arabic)' },
  ];

  const timezones = [
    { value: 'gmt+4', label: 'Gulf Standard Time (GMT+4)' },
    { value: 'gmt+3', label: 'Arabia Standard Time (GMT+3)' },
    { value: 'gmt+0', label: 'UTC (GMT+0)' },
    { value: 'gmt-5', label: 'Eastern Time (GMT-5)' },
  ];

  const dateFormats = [
    { value: 'dd-mm-yyyy', label: 'DD-MM-YYYY' },
    { value: 'mm-dd-yyyy', label: 'MM-DD-YYYY' },
    { value: 'yyyy-mm-dd', label: 'YYYY-MM-DD' },
  ];

  const currencies = [
    { value: 'omr', label: 'OMR - Omani Rial' },
    { value: 'usd', label: 'USD - US Dollar' },
    { value: 'eur', label: 'EUR - Euro' },
    { value: 'gbp', label: 'GBP - British Pound' },
  ];

  return (
    <motion.div initial="hidden" animate="show" className="space-y-8">
      {/* Localization */}
      <motion.div variants={fadeUp as any}>
        <GlassCard>
          <SectionHeader icon={Globe} title="Localization" subtitle="Configure regional settings" />
          
          <div className="grid grid-cols-2 gap-6">
            <SelectDropdown 
              label="Language" 
              value={language} 
              options={languages}
              onChange={setLanguage}
              icon={Globe}
            />
            <SelectDropdown 
              label="Timezone" 
              value={timezone} 
              options={timezones}
              onChange={setTimezone}
              icon={Clock}
            />
            <SelectDropdown 
              label="Date Format" 
              value={dateFormat} 
              options={dateFormats}
              onChange={setDateFormat}
              icon={Calendar}
            />
            <SelectDropdown 
              label="Currency" 
              value={currency} 
              options={currencies}
              onChange={setCurrency}
              icon={DollarSign}
            />
          </div>
        </GlassCard>
      </motion.div>

      {/* Appearance */}
      <motion.div variants={stagger(0.1) as any}>
        <GlassCard>
          <SectionHeader icon={Sun} title="Appearance" subtitle="Customize visual settings" />
          
          <div className="space-y-6">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: P.surface }}>
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => !isDark && toggleTheme()}
                    className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200"
                    style={{ 
                      background: isDark ? `${P.accent}20` : P.bg,
                      border: `1px solid ${isDark ? P.accent : P.border}`,
                    }}
                  >
                    <Moon size={20} style={{ color: isDark ? P.accent : P.textLo }} />
                  </button>
                  <button
                    onClick={() => isDark && toggleTheme()}
                    className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200"
                    style={{ 
                      background: !isDark ? `${P.accent}20` : P.bg,
                      border: `1px solid ${!isDark ? P.accent : P.border}`,
                    }}
                  >
                    <Sun size={20} style={{ color: !isDark ? P.accent : P.textLo }} />
                  </button>
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: P.textHi }}>Theme Mode</p>
                  <p className="text-xs" style={{ color: P.textLo }}>Currently using {isDark ? 'dark' : 'light'} mode</p>
                </div>
              </div>
            </div>

            {/* Density Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: P.textHi }}>Display Density</p>
                  <p className="text-xs" style={{ color: P.textLo }}>Adjust spacing and compactness</p>
                </div>
                <span className="text-sm font-mono px-3 py-1 rounded-lg" style={{ background: P.surface, color: P.accent }}>
                  {density < 33 ? 'Compact' : density < 66 ? 'Comfortable' : 'Spacious'}
                </span>
              </div>
              <div className="relative h-2 rounded-full" style={{ background: P.surface }}>
                <motion.div 
                  className="absolute h-full rounded-full"
                  style={{ background: P.accent, width: `${density}%` }}
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={density}
                  onChange={(e) => setDensity(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 shadow-lg"
                  style={{ 
                    left: `calc(${density}% - 10px)`,
                    background: P.bg,
                    borderColor: P.accent,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px]" style={{ color: P.textLo }}>
                <span>Compact</span>
                <span>Comfortable</span>
                <span>Spacious</span>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Preview */}
      <motion.div variants={stagger(0.2) as any}>
        <GlassCard>
          <SectionHeader icon={Monitor} title="Preview" subtitle="See how your settings look" />
          
          <div 
            className="p-6 rounded-xl"
            style={{ background: P.surface, border: `1px solid ${P.border}` }}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl" style={{ background: `${P.accent}20` }} />
              <div>
                <p className="text-sm font-medium" style={{ color: P.textHi }}>Sample Project Title</p>
                <p className="text-xs" style={{ color: P.textLo }}>
                  {dateFormat === 'dd-mm-yyyy' ? '26-02-2026' : dateFormat === 'mm-dd-yyyy' ? '02-26-2026' : '2026-02-26'}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-lg font-bold" style={{ color: P.accent }}>
                  {currency === 'omr' ? 'OMR' : currency === 'usd' ? '$' : currency === 'eur' ? '€' : '£'} 15,000
                </p>
                <p className="text-xs" style={{ color: P.textLo }}>Budget</p>
              </div>
            </div>
            <p className="text-sm" style={{ color: P.textMd }}>
              {language === 'ar' ? 'هذا نص تجريبي لعرض كيف ستبدو الإعدادات' : 'This is sample text showing how your settings will appear in the application.'}
            </p>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

function SecurityTab() {
  const { colors: P } = useTheme();
  const toast = useToast();
  const logout = useAuthStore((s) => s.logout);
  const activeDevices: { id: string; device: string; browser: string; location: string; ip: string; lastActive: string; current: boolean }[] = [];
  const loginHistory: { id: string; time: string; device: string; location: string; status: string }[] = [];
  const blockedIPs: { id: string; ip: string; reason: string; blockedAt: string; expiresAt: string }[] = [];
  const [minLength, setMinLength] = useState('12');
  const [sessionTimeout, setSessionTimeout] = useState('30');

  const handleDownloadMyData = async () => {
    try {
      const response = await authService.exportMyData();
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `my-account-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Data Exported', 'Your account data file has been downloaded.');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to export your data.';
      toast.error('Export Failed', msg);
    }
  };

  const handleDeleteAccount = async () => {
    const password = window.prompt('To delete your account, enter your current password:');
    if (!password) return;

    try {
      await authService.deleteMyAccount(password);
      logout();
      toast.success('Account Deleted', 'Your account has been deleted successfully.');
      window.location.href = '/login';
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to delete your account.';
      toast.error('Delete Failed', msg);
    }
  };

  return (
    <motion.div initial="hidden" animate="show" className="space-y-8">
      {/* Active Devices */}
      <motion.div variants={fadeUp as any}>
        <GlassCard noPadding>
          <div className="p-6">
            <SectionHeader icon={Laptop} title="Active Devices" subtitle="Devices currently logged into your account" />
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: P.surface }}>
                  <th className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>Device</th>
                  <th className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>Location</th>
                  <th className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>IP Address</th>
                  <th className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>Last Active</th>
                  <th className="text-right px-6 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeDevices.map((device, i) => (
                  <motion.tr 
                    key={device.id}
                    variants={stagger(i * 0.05) as any}
                    className="border-t transition-colors hover:bg-opacity-50"
                    style={{ borderColor: P.border }}
                    onMouseEnter={(e) => e.currentTarget.style.background = `${P.accent}05`}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: P.surface }}>
                          {device.device.includes('iPhone') ? <Smartphone size={18} style={{ color: P.textMd }} /> :
                           device.device.includes('iPad') ? <Monitor size={18} style={{ color: P.textMd }} /> :
                           <Laptop size={18} style={{ color: P.textMd }} />}
                        </div>
                        <div>
                          <p className="text-sm font-medium flex items-center gap-2" style={{ color: P.textHi }}>
                            {device.device}
                            {device.current && (
                              <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${P.accent}20`, color: P.accent }}>
                                Current
                              </span>
                            )}
                          </p>
                          <p className="text-xs" style={{ color: P.textLo }}>{device.browser}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm" style={{ color: P.textMd }}>{device.location}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono px-2 py-1 rounded" style={{ background: P.surface, color: P.textLo }}>
                        {device.ip}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm" style={{ color: P.textMd }}>{device.lastActive}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!device.current && (
                        <ActionButton variant="danger" size="sm" icon={X}>Revoke</ActionButton>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </motion.div>

      {/* Login History */}
      <motion.div variants={stagger(0.1) as any}>
        <GlassCard noPadding>
          <div className="p-6">
            <SectionHeader icon={History} title="Login History" subtitle="Recent account access attempts" />
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: P.surface }}>
                  <th className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>Time</th>
                  <th className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>Device</th>
                  <th className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>Location</th>
                  <th className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {loginHistory.map((entry, i) => (
                  <motion.tr 
                    key={entry.id}
                    variants={stagger(i * 0.03) as any}
                    className="border-t"
                    style={{ borderColor: P.border }}
                  >
                    <td className="px-6 py-3">
                      <span className="text-sm" style={{ color: P.textMd }}>{entry.time}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-sm" style={{ color: P.textHi }}>{entry.device}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-sm" style={{ color: P.textMd }}>{entry.location}</span>
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={entry.status as 'success' | 'failed'} />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </motion.div>

      <div className="grid grid-cols-2 gap-6">
        {/* Password Policies */}
        <motion.div variants={stagger(0.15) as any}>
          <GlassCard>
            <SectionHeader icon={Lock} title="Password Policies" subtitle="Security requirements for passwords" />
            
            <div className="space-y-4">
              <FormField 
                label="Minimum Password Length" 
                value={minLength} 
                onChange={setMinLength}
                type="number"
              />
              <FormField 
                label="Session Timeout (minutes)" 
                value={sessionTimeout} 
                onChange={setSessionTimeout}
                type="number"
              />
              <Toggle enabled={true} onChange={() => {}} label="Require uppercase letters" />
              <Toggle enabled={true} onChange={() => {}} label="Require numbers" />
              <Toggle enabled={true} onChange={() => {}} label="Require special characters" />
              <Toggle enabled={false} onChange={() => {}} label="Force password change every 90 days" />
            </div>
          </GlassCard>
        </motion.div>

        {/* Blocked IPs & GDPR */}
        <motion.div variants={stagger(0.2) as any} className="space-y-6">
          <GlassCard>
            <SectionHeader icon={Shield} title="Blocked IPs" subtitle="Automatically blocked addresses" />
            
            <div className="space-y-3">
              {blockedIPs.map((ip) => (
                <div 
                  key={ip.id}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}
                >
                  <div>
                    <p className="text-sm font-mono font-medium" style={{ color: '#fca5a5' }}>{ip.ip}</p>
                    <p className="text-xs" style={{ color: P.textLo }}>{ip.reason}</p>
                  </div>
                  <ActionButton variant="ghost" size="sm" icon={X}>Unblock</ActionButton>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <SectionHeader icon={Scale} title="GDPR & Data Privacy" subtitle="Manage your data" />
            
            <div className="space-y-4">
              <Toggle enabled={true} onChange={() => {}} label="Allow analytics cookies" subtitle="Help us improve the platform" />
              <div className="h-px" style={{ background: P.border }} />
              <div className="flex gap-3">
                <ActionButton variant="default" icon={Download} onClick={handleDownloadMyData}>Download My Data</ActionButton>
                <ActionButton variant="danger" icon={Trash2} onClick={handleDeleteAccount}>Delete Account</ActionButton>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </motion.div>
  );
}

function BackupTab() {
  const { colors: P } = useTheme();
  const backups: { id: string; date: string; size: string; type: string; status: string }[] = [];
  const [autoBackup, setAutoBackup] = useState(true);
  const [frequency, setFrequency] = useState('daily');
  const [storage, setStorage] = useState('cloud');

  const frequencies = [
    { value: 'hourly', label: 'Every Hour' },
    { value: 'daily', label: 'Daily at 3:00 AM' },
    { value: 'weekly', label: 'Weekly (Sunday)' },
    { value: 'monthly', label: 'Monthly (1st)' },
  ];

  const storageOptions = [
    { value: 'cloud', label: 'Cloud Storage (AWS S3)' },
    { value: 'local', label: 'Local Server' },
    { value: 'both', label: 'Both (Redundant)' },
  ];

  return (
    <motion.div initial="hidden" animate="show" className="space-y-8">
      {/* Backup Settings */}
      <motion.div variants={fadeUp as any}>
        <GlassCard>
          <SectionHeader icon={Database} title="Backup Configuration" subtitle="Configure automatic data backups" />
          
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div 
              className="p-5 rounded-2xl text-center"
              style={{ 
                background: `linear-gradient(135deg, ${P.accent}15, transparent)`,
                border: `1px solid ${P.accent}25`,
              }}
            >
              <HardDrive size={28} className="mx-auto mb-3" style={{ color: P.accent }} />
              <p className="text-2xl font-bold" style={{ color: P.textHi }}>12.4 GB</p>
              <p className="text-xs mt-1" style={{ color: P.textLo }}>Total Backup Size</p>
            </div>
            <div 
              className="p-5 rounded-2xl text-center"
              style={{ 
                background: 'linear-gradient(135deg, rgba(52,211,153,0.15), transparent)',
                border: '1px solid rgba(52,211,153,0.25)',
              }}
            >
              <CheckCircle2 size={28} className="mx-auto mb-3" style={{ color: '#34d399' }} />
              <p className="text-2xl font-bold" style={{ color: P.textHi }}>6</p>
              <p className="text-xs mt-1" style={{ color: P.textLo }}>Successful Backups</p>
            </div>
            <div 
              className="p-5 rounded-2xl text-center"
              style={{ 
                background: 'linear-gradient(135deg, rgba(56,189,248,0.15), transparent)',
                border: '1px solid rgba(56,189,248,0.25)',
              }}
            >
              <Clock size={28} className="mx-auto mb-3" style={{ color: '#38bdf8' }} />
              <p className="text-lg font-bold" style={{ color: P.textHi }}>Today 03:00</p>
              <p className="text-xs mt-1" style={{ color: P.textLo }}>Last Backup</p>
            </div>
          </div>

          <div className="h-px mb-6" style={{ background: P.border }} />

          <div className="space-y-6">
            <Toggle 
              enabled={autoBackup} 
              onChange={setAutoBackup}
              label="Automatic Backups"
              subtitle="Enable scheduled automatic backups"
            />
            
            {autoBackup && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="grid grid-cols-2 gap-6"
              >
                <SelectDropdown 
                  label="Backup Frequency" 
                  value={frequency} 
                  options={frequencies}
                  onChange={setFrequency}
                  icon={RefreshCw}
                />
                <SelectDropdown 
                  label="Storage Location" 
                  value={storage} 
                  options={storageOptions}
                  onChange={setStorage}
                  icon={Cloud}
                />
              </motion.div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <ActionButton variant="default" icon={RefreshCw}>Backup Now</ActionButton>
            <ActionButton variant="primary" icon={Check}>Save Settings</ActionButton>
          </div>
        </GlassCard>
      </motion.div>

      {/* Backup History */}
      <motion.div variants={stagger(0.1) as any}>
        <GlassCard noPadding>
          <div className="p-6">
            <SectionHeader icon={History} title="Backup History" subtitle="Previous backups and restore options" />
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: P.surface }}>
                  <th className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>Date & Time</th>
                  <th className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>Size</th>
                  <th className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>Type</th>
                  <th className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>Status</th>
                  <th className="text-right px-6 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup, i) => (
                  <motion.tr 
                    key={backup.id}
                    variants={stagger(i * 0.05) as any}
                    className="border-t"
                    style={{ borderColor: P.border }}
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm" style={{ color: P.textHi }}>{backup.date}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono" style={{ color: P.textMd }}>{backup.size}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span 
                        className="text-xs px-2.5 py-1 rounded-lg font-medium"
                        style={{ 
                          background: backup.type === 'Manual' ? `${P.accent}15` : P.surface,
                          color: backup.type === 'Manual' ? P.accent : P.textMd,
                        }}
                      >
                        {backup.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={backup.status as 'completed' | 'failed'} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <ActionButton variant="ghost" size="sm" icon={RotateCcw}>Restore</ActionButton>
                        <ActionButton variant="ghost" size="sm" icon={Download}>Download</ActionButton>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

function AuditTab() {
  const { colors: P } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [page, setPage] = useState(1);

  const logsQuery = useQuery({
    queryKey: ['activity-logs', page, searchQuery, filterAction],
    queryFn: () => activityLogService.getAll({
      page,
      limit: 10,
      ...(searchQuery ? { search: searchQuery } : {}),
      ...(filterAction !== 'all' ? { action: filterAction } : {}),
    }),
    staleTime: 30 * 1000,
  });

  const apiLogs = (logsQuery.data as any)?.data?.items ?? [];
  const totalLogs = (logsQuery.data as any)?.data?.total ?? 0;
  const totalPages = (logsQuery.data as any)?.data?.totalPages ?? 1;

  const auditLogs = apiLogs.map((log: any) => ({
    id: log.id,
    time: new Date(log.createdAt).toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    user: log.user?.name ?? 'System',
    action: log.action,
    module: log.entity ? (log.entity.charAt(0).toUpperCase() + log.entity.slice(1)) : 'System',
    details: log.details ?? '',
    ip: log.ip ?? 'N/A',
    status: 'success' as const,
  }));

  const actions = [
    { value: 'all', label: 'All Actions' },
    { value: 'create', label: 'Create' },
    { value: 'update', label: 'Update' },
    { value: 'delete', label: 'Delete' },
    { value: 'review_add', label: 'Review' },
    { value: 'status_change', label: 'Status Change' },
  ];

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'login': return User;
      case 'create': case 'project_create': return Plus;
      case 'update': case 'status_change': return Edit3;
      case 'delete': return Trash2;
      case 'export': return Download;
      case 'backup': return Database;
      case 'settings': return SettingsIcon;
      default: return FileText;
    }
  };

  return (
    <motion.div initial="hidden" animate="show" className="space-y-6">
      {/* Filters */}
      <motion.div variants={fadeUp as any}>
        <GlassCard>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: P.textLo }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                placeholder="Search audit logs..."
                className="w-full pl-11 pr-4 py-3 rounded-full text-sm bg-transparent outline-none"
                style={{
                  background: P.surface,
                  border: `1px solid ${P.border}`,
                  color: P.textHi,
                }}
              />
            </div>
            <div className="w-48">
              <SelectDropdown
                label=""
                value={filterAction}
                options={actions}
                onChange={(v) => { setFilterAction(v); setPage(1); }}
                icon={Filter}
              />
            </div>
            <ActionButton variant="default" icon={Download}>Export</ActionButton>
          </div>
        </GlassCard>
      </motion.div>

      {/* Audit Table */}
      <motion.div variants={stagger(0.1) as any}>
        <GlassCard noPadding>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: P.surface }}>
                  <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>Timestamp</th>
                  <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>User</th>
                  <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>Action</th>
                  <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>Module</th>
                  <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>Details</th>
                  <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>IP Address</th>
                  <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {logsQuery.isLoading ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-sm" style={{ color: P.textLo }}>Loading audit logs...</td></tr>
                ) : auditLogs.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-sm" style={{ color: P.textLo }}>No audit logs found</td></tr>
                ) : auditLogs.map((log: any, i: number) => {
                  const ActionIcon = getActionIcon(log.action);
                  return (
                    <motion.tr
                      key={log.id}
                      variants={stagger(i * 0.03) as any}
                      className="border-t transition-colors"
                      style={{ borderColor: P.border }}
                      onMouseEnter={(e) => e.currentTarget.style.background = `${P.accent}03`}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono" style={{ color: P.textLo }}>{log.time}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: P.surface }}>
                            <User size={12} style={{ color: P.textMd }} />
                          </div>
                          <span className="text-sm" style={{ color: P.textHi }}>{log.user}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <ActionIcon size={14} style={{ color: P.accent }} />
                          <span className="text-sm font-medium" style={{ color: P.textMd }}>{log.action}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs px-2 py-1 rounded-lg" style={{ background: P.surface, color: P.textMd }}>
                          {log.module}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-[280px]">
                        <span className="text-xs truncate block" style={{ color: P.textLo }}>{log.details}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono" style={{ color: P.textLo }}>{log.ip}</span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={log.status as 'success' | 'warning' | 'error'} />
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: P.border }}>
            <span className="text-xs" style={{ color: P.textLo }}>
              Showing {auditLogs.length} of {totalLogs} entries
            </span>
            <div className="flex gap-2">
              <ActionButton variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Previous</ActionButton>
              <ActionButton variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</ActionButton>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

function IntegrationsTab() {
  const { colors: P } = useTheme();
  const [integrationsState, setIntegrationsState] = useState<{
    id: string; name: string; description: string; logo: string;
    connected: boolean; lastSync: string | null;
  }[]>([]);

  const toggleIntegration = (id: string) => {
    setIntegrationsState(prev => 
      prev.map(i => i.id === id ? { ...i, connected: !i.connected } : i)
    );
  };

  const connectedCount = integrationsState.filter(i => i.connected).length;

  return (
    <motion.div initial="hidden" animate="show" className="space-y-8">
      {/* Header Stats */}
      <motion.div variants={fadeUp as any} className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: P.textHi }}>Connected Services</h2>
          <p className="text-sm mt-1" style={{ color: P.textLo }}>
            {connectedCount} of {integrationsState.length} integrations active
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {integrationsState.filter(i => i.connected).slice(0, 5).map((integration) => (
              <div 
                key={integration.id}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-lg border-2"
                style={{ background: P.surface, borderColor: P.bg }}
              >
                {integration.logo}
              </div>
            ))}
          </div>
          <ActionButton variant="primary" icon={Plus}>Add Integration</ActionButton>
        </div>
      </motion.div>

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-2 gap-6">
        {integrationsState.map((integration, i) => (
          <motion.div 
            key={integration.id}
            variants={stagger(i * 0.05) as any}
          >
            <GlassCard 
              className={integration.connected ? '' : 'opacity-70'}
              glow={integration.connected ? `${P.accent}10` : undefined}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                    style={{ 
                      background: integration.connected ? `${P.accent}15` : P.surface,
                      border: `1px solid ${integration.connected ? P.accent + '30' : P.border}`,
                    }}
                  >
                    {integration.logo}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: P.textHi }}>{integration.name}</h3>
                    <p className="text-xs mt-0.5" style={{ color: P.textLo }}>
                      {integration.connected ? `Last sync: ${integration.lastSync}` : 'Not connected'}
                    </p>
                  </div>
                </div>
                <Toggle 
                  enabled={integration.connected} 
                  onChange={() => toggleIntegration(integration.id)}
                  label=""
                />
              </div>
              
              <p className="text-sm mb-4" style={{ color: P.textMd }}>{integration.description}</p>
              
              <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: P.border }}>
                <span 
                  className="text-xs font-medium px-2.5 py-1 rounded-lg"
                  style={{ 
                    background: integration.connected ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.1)',
                    color: integration.connected ? '#6ee7b7' : '#fca5a5',
                  }}
                >
                  {integration.connected ? '● Connected' : '○ Disconnected'}
                </span>
                <div className="flex gap-2">
                  {integration.connected && (
                    <>
                      <ActionButton variant="ghost" size="sm" icon={RefreshCw}>Sync</ActionButton>
                      <ActionButton variant="ghost" size="sm" icon={SettingsIcon}>Configure</ActionButton>
                    </>
                  )}
                  {!integration.connected && (
                    <ActionButton variant="primary" size="sm" icon={Zap}>Connect</ActionButton>
                  )}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Webhooks Section */}
      <motion.div variants={stagger(0.4) as any}>
        <GlassCard>
          <SectionHeader 
            icon={Webhook} 
            title="Custom Webhooks" 
            subtitle="Send events to external services in real-time"
            action={<ActionButton variant="default" size="sm" icon={Plus}>Add Webhook</ActionButton>}
          />
          
          <div className="space-y-3">
            <div 
              className="flex items-center justify-between p-4 rounded-xl"
              style={{ background: P.surface, border: `1px solid ${P.border}` }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.15)' }}>
                  <CheckCircle2 size={18} style={{ color: '#34d399' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: P.textHi }}>Project Updates Hook</p>
                  <code className="text-[10px] font-mono mt-0.5 block" style={{ color: P.textLo }}>https://hooks.example.com/csr/projects</code>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(52,211,153,0.15)', color: '#6ee7b7' }}>Active</span>
                <ActionButton variant="ghost" size="sm" icon={Edit3} />
                <ActionButton variant="ghost" size="sm" icon={Trash2} />
              </div>
            </div>
            
            <div 
              className="flex items-center justify-between p-4 rounded-xl"
              style={{ background: P.surface, border: `1px solid ${P.border}` }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.15)' }}>
                  <CheckCircle2 size={18} style={{ color: '#34d399' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: P.textHi }}>Alert Notifications</p>
                  <code className="text-[10px] font-mono mt-0.5 block" style={{ color: P.textLo }}>https://hooks.example.com/csr/alerts</code>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(52,211,153,0.15)', color: '#6ee7b7' }}>Active</span>
                <ActionButton variant="ghost" size="sm" icon={Edit3} />
                <ActionButton variant="ghost" size="sm" icon={Trash2} />
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

function BillingTab() {
  const { colors: P } = useTheme();
  const plans: { id: string; name: string; price: number; period: string; features: string[]; recommended: boolean }[] = [];
  const invoices: { id: string; date: string; amount: number; status: string; plan: string }[] = [];
  const currentPlan = 'professional';

  return (
    <motion.div initial="hidden" animate="show" className="space-y-8">
      {/* Current Plan */}
      <motion.div variants={fadeUp as any}>
        <GlassCard glow={`${P.accent}15`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ 
                  background: `linear-gradient(135deg, ${P.accent}30, ${P.accent}10)`,
                  border: `2px solid ${P.accent}40`,
                }}
              >
                <Crown size={28} style={{ color: P.accent }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold" style={{ color: P.textHi }}>Professional Plan</h2>
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: `${P.accent}20`, color: P.accent }}>
                    Current
                  </span>
                </div>
                <p className="text-sm mt-1" style={{ color: P.textMd }}>
                  Renews on March 1, 2026 • <span style={{ color: P.accent }}>OMR 99/month</span>
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <ActionButton variant="default" icon={FileText}>View Invoice</ActionButton>
              <ActionButton variant="primary" icon={Sparkles}>Upgrade to Enterprise</ActionButton>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Plan Comparison */}
      <motion.div variants={stagger(0.1) as any}>
        <GlassCard noPadding>
          <div className="p-6 border-b" style={{ borderColor: P.border }}>
            <SectionHeader icon={Star} title="Compare Plans" subtitle="Choose the best plan for your organization" />
          </div>
          
          <div className="grid grid-cols-3 divide-x" style={{ borderColor: P.border }}>
            {plans.map((plan, i) => (
              <motion.div 
                key={plan.id}
                variants={stagger(i * 0.1) as any}
                className="p-6 relative"
                style={{ 
                  background: plan.recommended ? `linear-gradient(180deg, ${P.accent}08, transparent)` : 'transparent',
                }}
              >
                {plan.recommended && (
                  <div 
                    className="absolute -top-px left-0 right-0 h-1 rounded-t-xl"
                    style={{ background: P.accent }}
                  />
                )}
                
                <div className="text-center mb-6">
                  {plan.recommended && (
                    <span 
                      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-3"
                      style={{ background: `${P.accent}20`, color: P.accent }}
                    >
                      <Sparkles size={10} /> Recommended
                    </span>
                  )}
                  <h3 className="text-lg font-bold" style={{ color: P.textHi }}>{plan.name}</h3>
                  <div className="mt-3 flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold" style={{ color: plan.recommended ? P.accent : P.textHi }}>
                      {plan.price === 0 ? 'Free' : `OMR ${plan.price}`}
                    </span>
                    {plan.price > 0 && <span className="text-sm" style={{ color: P.textLo }}>{plan.period}</span>}
                  </div>
                </div>
                
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm" style={{ color: P.textMd }}>
                      <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" style={{ color: plan.recommended ? P.accent : '#34d399' }} />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <ActionButton 
                  variant={plan.id === currentPlan ? 'default' : plan.recommended ? 'primary' : 'default'}
                  size="lg"
                  disabled={plan.id === currentPlan}
                >
                  {plan.id === currentPlan ? 'Current Plan' : plan.id === 'starter' ? 'Downgrade' : 'Upgrade'}
                </ActionButton>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      <div className="grid grid-cols-2 gap-6">
        {/* Payment Method */}
        <motion.div variants={stagger(0.2) as any}>
          <GlassCard>
            <SectionHeader icon={CreditCard} title="Payment Method" subtitle="Manage your billing details" />
            
            <div 
              className="flex items-center gap-4 p-4 rounded-xl mb-4"
              style={{ background: P.surface, border: `1px solid ${P.border}` }}
            >
              <div 
                className="w-14 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
                style={{ background: 'linear-gradient(135deg, #1a1f71, #252c8f)', color: '#fff' }}
              >
                VISA
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: P.textHi }}>•••• •••• •••• 4242</p>
                <p className="text-xs" style={{ color: P.textLo }}>Expires 12/2027</p>
              </div>
              <span className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(52,211,153,0.15)', color: '#6ee7b7' }}>
                Default
              </span>
            </div>
            
            <div className="flex gap-3">
              <ActionButton variant="default" icon={Edit3}>Update Card</ActionButton>
              <ActionButton variant="ghost" icon={Plus}>Add Method</ActionButton>
            </div>
          </GlassCard>
        </motion.div>

        {/* Billing Address */}
        <motion.div variants={stagger(0.25) as any}>
          <GlassCard>
            <SectionHeader icon={MapPin} title="Billing Address" subtitle="Address for invoices" />
            
            <div className="space-y-2 mb-4">
              <p className="text-sm font-medium" style={{ color: P.textHi }}>Oman Vision CSR Initiative</p>
              <p className="text-sm" style={{ color: P.textMd }}>Al Khuwair Business District</p>
              <p className="text-sm" style={{ color: P.textMd }}>Building 243, Office 5B</p>
              <p className="text-sm" style={{ color: P.textMd }}>Muscat, Sultanate of Oman</p>
              <p className="text-sm" style={{ color: P.textLo }}>Tax ID: OM123456789</p>
            </div>
            
            <ActionButton variant="default" icon={Edit3}>Edit Address</ActionButton>
          </GlassCard>
        </motion.div>
      </div>

      {/* Invoice History */}
      <motion.div variants={stagger(0.3) as any}>
        <GlassCard noPadding>
          <div className="p-6">
            <SectionHeader icon={FileText} title="Invoice History" subtitle="Download past invoices" />
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: P.surface }}>
                  <th className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>Invoice</th>
                  <th className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>Date</th>
                  <th className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>Plan</th>
                  <th className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>Amount</th>
                  <th className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>Status</th>
                  <th className="text-right px-6 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textLo }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice, i) => (
                  <motion.tr 
                    key={invoice.id}
                    variants={stagger(i * 0.03) as any}
                    className="border-t"
                    style={{ borderColor: P.border }}
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono font-medium" style={{ color: P.textHi }}>{invoice.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm" style={{ color: P.textMd }}>{invoice.date}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm" style={{ color: P.textMd }}>{invoice.plan}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold" style={{ color: P.textHi }}>OMR {invoice.amount}</span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={invoice.status as 'paid'} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ActionButton variant="ghost" size="sm" icon={Download}>PDF</ActionButton>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Settings Component
// ═══════════════════════════════════════════════════════════════════════════

export default function Settings() {
  const { colors: P } = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>('account');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account': return <AccountTab />;
      case 'company': return <CompanyTab />;
      case 'system': return <SystemTab />;
      case 'security': return <SecurityTab />;
      case 'backup': return <BackupTab />;
      case 'audit': return <AuditTab />;
      case 'integrations': return <IntegrationsTab />;
      case 'billing': return <BillingTab />;
      default: return <AccountTab />;
    }
  };

  return (
    <motion.div 
      initial="hidden" 
      animate="show"
      className="min-h-screen p-6 pb-12"
      style={{ background: P.bg }}
    >
      {/* Page Header */}
      <motion.div variants={fadeUp as any} className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: P.textHi }}>Settings</h1>
            <p className="text-sm mt-1" style={{ color: P.textMd }}>Manage your account, organization, and platform preferences</p>
          </div>
          <div className="flex items-center gap-3">
            <div 
              className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)' }}
            >
              <CheckCircle2 size={14} style={{ color: '#34d399' }} />
              <span className="text-xs font-medium" style={{ color: '#6ee7b7' }}>All changes auto-saved</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div variants={stagger(0.05) as any} className="mb-8">
        <div 
          className="relative flex items-center gap-1 p-1.5 rounded-2xl overflow-x-auto"
          style={{ background: P.surface, border: `1px solid ${P.border}` }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative flex items-center gap-2.5 px-5 py-3 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap"
                style={{ 
                  color: isActive ? P.bg : P.textMd,
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-xl"
                    style={{ 
                      background: P.accent,
                      boxShadow: `0 4px 20px ${P.accent}40`,
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon size={16} className="relative z-10" />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: EASE }}
        >
          {renderTabContent()}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
