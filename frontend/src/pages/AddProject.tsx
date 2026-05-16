// @ts-nocheck
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, Plus, X, Trash2,
  FileText, Image, Upload, MapPin, Calendar, Wallet, Users, Target,
  ClipboardList, Building2, Globe, Camera, Paperclip,
  CheckCircle2, AlertTriangle, Save, Eye,
  Clock, Shield, Gauge, Bell, BarChart3,
  Heart, UserCheck, Baby, Zap, Star, Award, FolderKanban,
  Layers, Settings2, Tag, Sparkles, Loader2, type LucideIcon,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../components/common/Toast';
import { useAuthStore } from '../stores/authStore';
import { projectService } from '../services/projectService';
import { beneficiaryService } from '../services/beneficiaryService';
import { categoryService } from '../services/categoryService';
import { uploadService } from '../services/uploadService';
import { aiAnalyticsService } from '../services/aiAnalyticsService';

// ─── Palette ──────────────────────────────────────────────────────────────────


// ─── Step Config ─────────────────────────────────────────────────────────────
const STEPS = [
  { key: 'basic',         label: 'Basic Info',      icon: ClipboardList, color: '#0B5CAB' },
  { key: 'budget',        label: 'Budget & Alerts', icon: Wallet,        color: '#2563A6' },
  { key: 'beneficiaries', label: 'Beneficiaries',   icon: Users,         color: '#2D4F7B' },
  { key: 'location',      label: 'Location',        icon: MapPin,        color: '#3A587E' },
  { key: 'media',         label: 'Media & Docs',    icon: Camera,        color: '#4C6485' },
  { key: 'review',        label: 'Review & Save',   icon: CheckCircle2,  color: '#1F3E63' },
] as const;

const CORPORATE = {
  brand: '#0B5CAB',
  brandSoft: 'rgba(11,92,171,0.15)',
  borderDark: 'rgba(148,163,184,0.45)',
  panelDark: 'rgba(10,18,36,0.98)',
};

// categories come from the store now (see component body)
const statuses = [
  { value: 'planning',  label: 'Planning',  color: '#64748b' },
  { value: 'active',    label: 'Active',    color: '#0B5CAB' },
  { value: 'on_hold',   label: 'On Hold',   color: '#b45309' },
];

const governorates = [
  { name: 'Muscat', districts: ['Muscat', 'Mutrah', 'Bawshar', 'Seeb', 'Al Amerat', 'Qurayyat'] },
  { name: 'Dhofar', districts: ['Salalah', 'Thumrait', 'Taqa', 'Mirbat', 'Rakhyut'] },
  { name: 'Al Batinah North', districts: ['Sohar', 'Shinas', 'Liwa', 'Saham', 'Al Khaburah', 'Al Suwaiq'] },
  { name: 'Al Batinah South', districts: ['Al Rustaq', 'Al Awabi', 'Nakhal', 'Wadi Al Maawil', 'Barka', 'Al Musannah'] },
  { name: 'Al Dakhiliyah', districts: ['Nizwa', 'Bahla', 'Adam', 'Al Hamra', 'Manah', 'Izki', 'Bid Bid', 'Samayil'] },
  { name: 'Al Sharqiyah North', districts: ['Ibra', 'Al Mudhaibi', 'Bidiyah', 'Al Qabil', 'Wadi Bani Khalid', 'Dima Wa Al Taeen'] },
  { name: 'Al Sharqiyah South', districts: ['Sur', 'Al Kamil Wal Wafi', 'Jaalan Bani Bu Ali', 'Jaalan Bani Bu Hassan', 'Masirah'] },
  { name: 'Al Dhahirah', districts: ['Ibri', 'Yanqul', 'Dhank'] },
  { name: 'Musandam', districts: ['Khasab', 'Bukha', 'Daba Al Bayah', 'Madha'] },
  { name: 'Al Wusta', districts: ['Haima', 'Duqm', 'Mahout', 'Al Jazer'] },
  { name: 'Al Buraimi', districts: ['Al Buraimi', 'Mahdah', 'Al Sinainah'] },
];

const sdgGoals = [
  { id: 1, label: 'No Poverty', color: '#E5243B' },
  { id: 2, label: 'Zero Hunger', color: '#DDA63A' },
  { id: 3, label: 'Good Health', color: '#4C9F38' },
  { id: 4, label: 'Quality Education', color: '#C5192D' },
  { id: 5, label: 'Gender Equality', color: '#FF3A21' },
  { id: 6, label: 'Clean Water', color: '#26BDE2' },
  { id: 7, label: 'Clean Energy', color: '#FCC30B' },
  { id: 8, label: 'Decent Work', color: '#A21942' },
  { id: 9, label: 'Industry & Innovation', color: '#FD6925' },
  { id: 10, label: 'Reduced Inequalities', color: '#DD1367' },
  { id: 11, label: 'Sustainable Cities', color: '#FD9D24' },
  { id: 12, label: 'Responsible Consumption', color: '#BF8B2E' },
  { id: 13, label: 'Climate Action', color: '#3F7E44' },
  { id: 14, label: 'Life Below Water', color: '#0A97D9' },
  { id: 15, label: 'Life on Land', color: '#56C02B' },
  { id: 16, label: 'Peace & Justice', color: '#00689D' },
  { id: 17, label: 'Partnerships', color: '#19486A' },
];

const omanVisionPillars = [
  'Economic Diversification',
  'Human Capital Development',
  'Environmental Sustainability',
  'Innovation & Technology',
  'Social Well-being',
  'Governance Excellence',
];

// ─── Animation ─────────────────────────────────────────────────────────────
const EASE: any = [0.22, 1, 0.36, 1];
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};
const stagger = (delay = 0) => ({
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay } },
});

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 400 : -400, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -400 : 400, opacity: 0 }),
};

// ─── Types ──────────────────────────────────────────────────────────────────
interface FormData {
  // Step 1
  name: string;
  category: string;
  status: string;
  shortDescription: string;
  fullDescription: string;
  objectives: string[];
  expectedOutputs: string[];
  sdgGoals: number[];
  visionPillars: string[];
  tags: string[];
  // Step 2
  startDate: string;
  endDate: string;
  budget: number | '';
  budgetThreshold: number;
  delayThreshold: number;
  qualityThreshold: number;
  alertsEnabled: boolean;
  // Step 3
  targetGroup: string;
  expectedCount: number | '';
  maleCount: number | '';
  femaleCount: number | '';
  ageGroup: string;
  beneficiaryDescription: string;
  // Step 4
  governorate: string;
  district: string;
  detailedAddress: string;
  latitude: number | '';
  longitude: number | '';
  partners: string[];
  // Step 5
  images: FileItem[];
  documents: FileItem[];
  // Step 6
  agreedToTerms: boolean;
}

interface FileItem {
  id: string;
  file: File;
  preview: string;
  category: string;
  name: string;
}

interface ValidationErrors {
  [key: string]: string;
}

const initialFormData: FormData = {
  name: '', category: '', status: 'planning', shortDescription: '', fullDescription: '',
  objectives: [''], expectedOutputs: [''], sdgGoals: [], visionPillars: [], tags: [],
  startDate: '', endDate: '', budget: '', budgetThreshold: 80, delayThreshold: 14,
  qualityThreshold: 3.5, alertsEnabled: true,
  targetGroup: '', expectedCount: '', maleCount: '', femaleCount: '', ageGroup: '', beneficiaryDescription: '',
  governorate: '', district: '', detailedAddress: '', latitude: '', longitude: '', partners: [],
  images: [], documents: [],
  agreedToTerms: false,
};

// ─── Reusable Components ────────────────────────────────────────────────────

function GlassCard({ children, className, glow, style: extra }: { children: React.ReactNode; className?: string; glow?: string; style?: React.CSSProperties }) {
  const { colors: P, isDark } = useTheme();
  return (
    <div className={cn('relative rounded-xl', className)} style={{
      background: isDark ? CORPORATE.panelDark : '#ffffff',
      border: isDark ? `1px solid ${CORPORATE.borderDark}` : `1px solid ${P.border}`,
      boxShadow: [
        isDark ? 'inset 0 1px 0 0 rgba(148,163,184,0.12)' : 'inset 0 1px 0 0 rgba(15,23,42,0.04)',
        glow ? `0 0 10px ${glow}` : '',
        isDark ? '0 10px 24px rgba(2,6,23,0.42)' : '0 4px 14px rgba(2,6,23,0.05)',
      ].filter(Boolean).join(', '),
      ...extra,
    }}>
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: isDark ? 'linear-gradient(90deg, transparent, rgba(148,163,184,0.35), transparent)' : `linear-gradient(90deg, transparent, ${P.borderHi}80, transparent)` }} />
      {children}
    </div>
  );
}

function FormField({ label, required, error, hint, children, icon: Icon }: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode; icon?: LucideIcon;
}) {
  const { colors: P, isDark } = useTheme();
  return (
    <div className="space-y-2.5">
      <label className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: P.textHi }}>
        {Icon && <Icon size={14} style={{ color: isDark ? '#93c5fd' : CORPORATE.brand }} />}
        {label}
        {required && <span className="text-[13px]" style={{ color: '#f87171' }}>*</span>}
      </label>
      {children}
      {error && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 text-[13px] font-medium" style={{ color: '#f87171' }}>
          <AlertTriangle size={13} /> {error}
        </motion.p>
      )}
      {hint && !error && <p className="text-[12px] leading-relaxed" style={{ color: P.textLo }}>{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text', icon: Icon, error, ...props }: {
  value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string; icon?: LucideIcon; error?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'>) {
  const { colors: P, isDark } = useTheme();
  return (
    <div className="relative">
      {Icon && <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: P.textMd }} />}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn('w-full py-3.5 rounded-lg text-[15px] outline-none transition-all duration-200', Icon ? 'pl-10 pr-4' : 'px-4')}
        style={{
          background: isDark ? 'rgba(15,23,42,0.72)' : P.surface,
          border: isDark
            ? `1.5px solid ${error ? '#f87171b0' : 'rgba(148,163,184,0.45)'}`
            : `1.5px solid ${error ? '#f8717160' : P.borderHi}`,
          color: isDark ? '#f1f5f9' : P.textHi,
          fontWeight: 500,
        }}
        onFocus={e => { e.currentTarget.style.borderColor = error ? '#f87171' : (isDark ? '#60a5fa' : CORPORATE.brand); e.currentTarget.style.boxShadow = `0 0 0 3px ${error ? '#f8717118' : (isDark ? '#3b82f630' : '#0B5CAB20')}`; }}
        onBlur={e => { e.currentTarget.style.borderColor = error ? '#f8717160' : (isDark ? 'rgba(148,163,184,0.45)' : P.borderHi); e.currentTarget.style.boxShadow = 'none'; }}
        {...props}
      />
    </div>
  );
}

function TextArea({ value, onChange, placeholder, rows = 3, error }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; error?: boolean;
}) {
  const { colors: P, isDark } = useTheme();
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-4 py-3.5 rounded-lg text-[15px] outline-none transition-all duration-200 resize-none leading-relaxed"
      style={{
        background: isDark ? 'rgba(15,23,42,0.72)' : P.surface,
        border: isDark
          ? `1.5px solid ${error ? '#f87171b0' : 'rgba(148,163,184,0.45)'}`
          : `1.5px solid ${error ? '#f8717160' : P.borderHi}`,
        color: isDark ? '#f1f5f9' : P.textHi,
        fontWeight: 500,
        scrollbarWidth: 'thin',
        scrollbarColor: `${P.border} transparent`,
      }}
      onFocus={e => { e.currentTarget.style.borderColor = error ? '#f87171' : (isDark ? '#60a5fa' : CORPORATE.brand); e.currentTarget.style.boxShadow = `0 0 0 3px ${error ? '#f8717118' : (isDark ? '#3b82f630' : '#0B5CAB20')}`; }}
      onBlur={e => { e.currentTarget.style.borderColor = error ? '#f8717160' : (isDark ? 'rgba(148,163,184,0.45)' : P.borderHi); e.currentTarget.style.boxShadow = 'none'; }}
    />
  );
}

function SelectInput({ value, onChange, options, placeholder, error }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string; color?: string }[]; placeholder?: string; error?: boolean;
}) {
  const { colors: P, isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3.5 rounded-lg text-[15px] outline-none transition-all duration-200 text-left"
        style={{
          background: isDark ? 'rgba(15,23,42,0.72)' : P.surface,
          border: isDark
            ? `1.5px solid ${error ? '#f87171b0' : (isOpen ? '#60a5fa' : 'rgba(148,163,184,0.45)')}`
            : `1.5px solid ${error ? '#f8717160' : isOpen ? CORPORATE.brand : P.borderHi}`,
          color: selected ? (isDark ? '#f1f5f9' : P.textHi) : P.textMd,
          boxShadow: isOpen ? `0 0 0 3px ${isDark ? '#3b82f630' : '#0B5CAB20'}` : 'none',
        }}
      >
        <div className="flex items-center gap-2.5">
          {selected?.color && <span className="h-2.5 w-2.5 rounded-full" style={{ background: selected.color }} />}
          <span className="font-medium">{selected ? selected.label : placeholder || 'Select...'}</span>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={16} style={{ color: P.textMd }} />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="absolute z-50 w-full mt-2 rounded-lg overflow-hidden max-h-64 overflow-y-auto"
            style={{
              background: isDark ? 'rgba(10,18,36,0.99)' : P.card,
              border: isDark ? '1.5px solid rgba(148,163,184,0.45)' : `1.5px solid ${P.borderHi}`,
              boxShadow: '0 16px 40px rgba(2,6,23,0.50)',
              scrollbarWidth: 'thin',
              scrollbarColor: `${P.border} transparent`,
            }}
          >
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-[14px] font-medium text-left transition-colors"
                style={{ color: opt.value === value ? (isDark ? '#93c5fd' : CORPORATE.brand) : P.textHi }}
                onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(96,165,250,0.10)' : `${CORPORATE.brand}0f`; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                {opt.color && <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: opt.color }} />}
                {opt.label}
                {opt.value === value && <CheckCircle2 size={14} className="ml-auto" style={{ color: isDark ? '#93c5fd' : CORPORATE.brand }} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DynamicList({ items, onChange, placeholder, icon: Icon }: {
  items: string[]; onChange: (items: string[]) => void; placeholder?: string; icon?: LucideIcon;
}) {
  const { colors: P, isDark } = useTheme();
  const add = () => onChange([...items, '']);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i: number, v: string) => onChange(items.map((item, idx) => idx === i ? v : item));

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2.5"
          >
            <span className="flex items-center justify-center h-7 w-7 rounded-md text-[12px] font-bold flex-shrink-0" style={{ background: `${P.accent}18`, color: P.accent, border: `1px solid ${P.accent}35` }}>
              {i + 1}
            </span>
            <div className="flex-1 relative">
              {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: P.textMd }} />}
              <input
                type="text"
                value={item}
                onChange={e => update(i, e.target.value)}
                placeholder={placeholder}
                className={cn('w-full py-3 rounded-lg text-[14px] outline-none transition-all', Icon ? 'pl-9 pr-3' : 'px-3')}
                style={{
                  background: isDark ? 'rgba(15,23,42,0.72)' : P.surface,
                  border: `1.5px solid ${isDark ? 'rgba(148,163,184,0.45)' : P.borderHi}`,
                  color: isDark ? '#f1f5f9' : P.textHi,
                  fontWeight: 500,
                }}
                onFocus={e => { e.currentTarget.style.borderColor = isDark ? '#60a5fa' : CORPORATE.brand; e.currentTarget.style.boxShadow = `0 0 0 3px ${isDark ? '#3b82f630' : '#0B5CAB20'}`; }}
                onBlur={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(148,163,184,0.45)' : P.borderHi; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
            {items.length > 1 && (
              <button type="button" onClick={() => remove(i)} className="p-2 rounded-md transition-colors" style={{ color: P.textMd }}
                onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = '#f8717118'; }}
                onMouseLeave={e => { e.currentTarget.style.color = P.textMd; e.currentTarget.style.background = 'transparent'; }}>
                <Trash2 size={15} />
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      <button type="button" onClick={add} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-colors" style={{ color: isDark ? '#93c5fd' : CORPORATE.brand, background: isDark ? 'rgba(96,165,250,0.10)' : `${CORPORATE.brand}0e`, border: `1.5px dashed ${isDark ? 'rgba(96,165,250,0.40)' : `${CORPORATE.brand}40`}` }}
        onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(96,165,250,0.18)' : `${CORPORATE.brand}18`; }}
        onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(96,165,250,0.10)' : `${CORPORATE.brand}0e`; }}>
        <Plus size={15} /> Add Item
      </button>
    </div>
  );
}

function TagInput({ tags, onChange, suggestions }: { tags: string[]; onChange: (t: string[]) => void; suggestions?: string[] }) {
  const { colors: P, isDark } = useTheme();
  const [input, setInput] = useState('');
  const add = (tag: string) => { const t = tag.trim(); if (t && !tags.includes(t)) onChange([...tags, t]); setInput(''); };
  const remove = (tag: string) => onChange(tags.filter(t => t !== tag));
  const filteredSuggestions = suggestions?.filter(s => !tags.includes(s) && s.toLowerCase().includes(input.toLowerCase())) || [];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {tags.map(tag => (
            <motion.span key={tag} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-semibold" style={{ background: isDark ? 'rgba(96,165,250,0.15)' : `${CORPORATE.brand}12`, color: isDark ? '#93c5fd' : CORPORATE.brand, border: `1.5px solid ${isDark ? 'rgba(96,165,250,0.35)' : `${CORPORATE.brand}35`}` }}>
              {tag}
              <button type="button" onClick={() => remove(tag)} className="opacity-70 hover:opacity-100 transition-opacity"><X size={12} /></button>
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      <div className="relative">
        <input
          type="text" value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(input); } }}
          placeholder="Type and press Enter..."
          className="w-full px-4 py-3 rounded-lg text-[14px] outline-none transition-all"
          style={{
            background: isDark ? 'rgba(15,23,42,0.72)' : P.surface,
            border: `1.5px solid ${isDark ? 'rgba(148,163,184,0.45)' : P.borderHi}`,
            color: isDark ? '#f1f5f9' : P.textHi,
            fontWeight: 500,
          }}
          onFocus={e => { e.currentTarget.style.borderColor = isDark ? '#60a5fa' : CORPORATE.brand; e.currentTarget.style.boxShadow = `0 0 0 3px ${isDark ? '#3b82f630' : '#0B5CAB20'}`; }}
          onBlur={e => { setTimeout(() => { e.currentTarget.style.borderColor = isDark ? 'rgba(148,163,184,0.45)' : P.borderHi; e.currentTarget.style.boxShadow = 'none'; }, 200); }}
        />
        {input && filteredSuggestions.length > 0 && (
          <div className="absolute z-40 w-full mt-1 rounded-lg overflow-hidden max-h-40 overflow-y-auto" style={{ background: isDark ? 'rgba(10,18,36,0.99)' : P.card, border: isDark ? '1.5px solid rgba(148,163,184,0.45)' : `1.5px solid ${P.borderHi}`, boxShadow: '0 12px 32px rgba(2,6,23,0.40)' }}>
            {filteredSuggestions.slice(0, 5).map(s => (
              <button key={s} type="button" onMouseDown={e => { e.preventDefault(); add(s); }} className="w-full px-4 py-3 text-[14px] font-medium text-left transition-colors" style={{ color: P.textHi }}
                onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(96,165,250,0.10)' : `${CORPORATE.brand}0f`; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CustomSlider({ value, onChange, min, max, step, unit, color }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step: number; unit: string; color: string;
}) {
  const { colors: P } = useTheme();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="relative h-2 rounded-full" style={{ background: P.border }}>
        <div className="absolute h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full transition-all shadow-lg" style={{ left: `calc(${pct}% - 10px)`, background: color, border: `2px solid ${P.bg}`, boxShadow: `0 0 12px ${color}50` }} />
      </div>
      <div className="flex justify-between text-[12px] font-medium" style={{ color: P.textMd }}>
        <span>{min}{unit}</span>
        <span className="font-bold px-2.5 py-1 rounded-md" style={{ background: `${color}20`, color }}>{value}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

// ─── Step Components ────────────────────────────────────────────────────────

function Step1Basic({ data, errors, onChange, categoryOptions }: { data: FormData; errors: ValidationErrors; onChange: (d: Partial<FormData>) => void; categoryOptions: { value: string; label: string }[] }) {
  const { colors: P, isDark } = useTheme();
  const toast = useToast();
  const [isSuggestingSDGs, setIsSuggestingSDGs] = useState(false);
  const [aiSuggestedIds, setAiSuggestedIds] = useState<number[]>([]);
  const [aiReasoning, setAiReasoning] = useState('');

  const canSuggest = data.name.trim().length >= 3 || data.shortDescription.trim().length >= 10;

  async function handleSuggestSDGs() {
    if (!canSuggest || isSuggestingSDGs) return;
    setIsSuggestingSDGs(true);
    setAiReasoning('');
    try {
      const result = await aiAnalyticsService.suggestSdgs({
        projectName: data.name,
        category: categoryOptions.find(c => c.value === data.category)?.label,
        shortDescription: data.shortDescription,
        fullDescription: data.fullDescription,
        objectives: data.objectives.filter(o => o.trim()),
        targetGroup: data.targetGroup,
      });
      if (result.success && result.data.suggestedSdgs.length > 0) {
        setAiSuggestedIds(result.data.suggestedSdgs);
        setAiReasoning(result.data.reasoning);
        onChange({ sdgGoals: result.data.suggestedSdgs });
        toast.success('SDGs Selected', `AI identified ${result.data.suggestedSdgs.length} relevant goals`);
      } else {
        toast.warning('No SDGs Found', 'AI could not determine SDGs — please select manually');
      }
    } catch {
      toast.error('AI Error', 'Failed to get SDG suggestion');
    } finally {
      setIsSuggestingSDGs(false);
    }
  }

  return (
    <motion.div variants={fadeUp as any} initial="hidden" animate="show" className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: CORPORATE.brandSoft, border: `1px solid ${CORPORATE.brand}33` }}>
          <ClipboardList size={18} style={{ color: CORPORATE.brand }} />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight" style={{ color: P.textHi }}>Basic Information</h2>
          <p className="text-sm font-medium mt-0.5" style={{ color: P.textMd }}>Define the project fundamentals and objectives</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <FormField label="Project Name" required error={errors.name} icon={FileText}>
          <TextInput value={data.name} onChange={v => onChange({ name: v })} placeholder="Enter project name..." icon={FileText} error={!!errors.name} />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Category" required error={errors.category} icon={Layers}>
            <SelectInput value={data.category} onChange={v => onChange({ category: v })} options={categoryOptions} placeholder="Select category" error={!!errors.category} />
          </FormField>
          <FormField label="Status" required icon={Settings2}>
            <SelectInput value={data.status} onChange={v => onChange({ status: v })} options={statuses} placeholder="Select status" />
          </FormField>
        </div>
      </div>

      <FormField label="Short Description" required error={errors.shortDescription} hint="Brief summary for project listings (max 200 characters)">
        <TextInput value={data.shortDescription} onChange={v => onChange({ shortDescription: v })} placeholder="Brief description of the project..." maxLength={200} error={!!errors.shortDescription} />
        <div className="flex justify-end">
          <span className="text-[12px] font-medium tabular-nums" style={{ color: data.shortDescription.length > 180 ? '#f59e0b' : P.textMd }}>{data.shortDescription.length}/200</span>
        </div>
      </FormField>

      <FormField label="Full Description" error={errors.fullDescription}>
        <TextArea value={data.fullDescription} onChange={v => onChange({ fullDescription: v })} placeholder="Detailed description of the project scope, methodology, and expected impact..." rows={4} error={!!errors.fullDescription} />
      </FormField>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <FormField label="Objectives" required error={errors.objectives} hint="Define clear, measurable objectives" icon={Target}>
          <DynamicList items={data.objectives} onChange={v => onChange({ objectives: v })} placeholder="e.g., Improve literacy rate by 20%" icon={Target} />
        </FormField>

        <FormField label="Expected Outputs" hint="Tangible deliverables and results" icon={Award}>
          <DynamicList items={data.expectedOutputs} onChange={v => onChange({ expectedOutputs: v })} placeholder="e.g., 5 renovated classrooms" icon={Award} />
        </FormField>
      </div>

      {/* SDG Goals */}
      <FormField label="SDG Goals Alignment" icon={Globe} hint="Select relevant UN Sustainable Development Goals">
        {/* AI Suggest Button */}
        <div className="flex items-center gap-3 mb-3">
          <motion.button
            type="button"
            whileHover={canSuggest && !isSuggestingSDGs ? { scale: 1.03 } : {}}
            whileTap={canSuggest && !isSuggestingSDGs ? { scale: 0.97 } : {}}
            onClick={handleSuggestSDGs}
            disabled={!canSuggest || isSuggestingSDGs}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: canSuggest
                ? 'linear-gradient(135deg, #7C3AED22, #2563EB22)'
                : 'transparent',
              border: `1px solid ${canSuggest ? '#7C3AED50' : P.border}`,
              color: canSuggest ? '#A78BFA' : P.textDim,
              cursor: canSuggest && !isSuggestingSDGs ? 'pointer' : 'not-allowed',
              opacity: isSuggestingSDGs ? 0.7 : 1,
            }}
          >
            {isSuggestingSDGs
              ? <Loader2 size={13} className="animate-spin" />
              : <Sparkles size={13} />
            }
            {isSuggestingSDGs ? 'Analyzing project...' : 'AI Suggest SDGs'}
          </motion.button>
          {!canSuggest && (
            <span className="text-[12px]" style={{ color: P.textMd }}>
              Fill project name or description first
            </span>
          )}
          {aiSuggestedIds.length > 0 && !isSuggestingSDGs && (
            <span className="text-[10px] flex items-center gap-1" style={{ color: '#A78BFA' }}>
              <Sparkles size={10} />
              AI selected {aiSuggestedIds.length} goals — you can still adjust
            </span>
          )}
        </div>

        {/* AI Reasoning */}
        <AnimatePresence>
          {aiReasoning && !isSuggestingSDGs && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="mb-3 px-3 py-2 rounded-lg text-[11px] leading-relaxed"
              style={{
                background: '#7C3AED10',
                border: '1px solid #7C3AED30',
                color: P.textLo,
              }}
            >
              <span style={{ color: '#A78BFA', fontWeight: 600 }}>AI Reasoning: </span>
              {aiReasoning}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {sdgGoals.map(sdg => {
            const active = data.sdgGoals.includes(sdg.id);
            const isAiPicked = aiSuggestedIds.includes(sdg.id);
            return (
              <motion.button
                key={sdg.id}
                type="button"
                whileHover={{ scale: 1.04, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onChange({ sdgGoals: active ? data.sdgGoals.filter(g => g !== sdg.id) : [...data.sdgGoals, sdg.id] })}
                className="relative flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl text-center transition-all"
                style={{
                  background: active ? `${sdg.color}1e` : (isDark ? 'rgba(255,255,255,0.03)' : P.cardHi),
                  border: `2px solid ${active ? sdg.color + '70' : (isDark ? 'rgba(255,255,255,0.12)' : P.border)}`,
                  boxShadow: isAiPicked && active ? `0 0 12px ${sdg.color}50, 0 2px 8px ${sdg.color}30` : active ? `0 2px 8px ${sdg.color}25` : 'none',
                }}
              >
                {isAiPicked && active && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center shadow-md" style={{ background: '#7C3AED' }}>
                    <Sparkles size={9} color="white" />
                  </span>
                )}
                <span className="text-[15px] font-black leading-none" style={{ color: active ? sdg.color : P.textMd }}>{sdg.id}</span>
                <span className="text-[10px] font-semibold leading-tight px-0.5" style={{ color: active ? sdg.color : P.textMd, lineHeight: '1.2' }}>{sdg.label}</span>
              </motion.button>
            );
          })}
        </div>
      </FormField>

      {/* Vision 2040 */}
      <FormField label="Oman Vision 2040 Pillars" icon={Star} hint="Align with national development strategy">
        <div className="flex flex-wrap gap-2">
          {omanVisionPillars.map(pillar => {
            const active = data.visionPillars.includes(pillar);
            return (
              <button
                key={pillar}
                type="button"
                onClick={() => onChange({ visionPillars: active ? data.visionPillars.filter(p => p !== pillar) : [...data.visionPillars, pillar] })}
                className="px-4 py-2 rounded-xl text-[13px] font-semibold transition-all"
                style={{
                  background: active ? `${P.accent}18` : (isDark ? 'rgba(255,255,255,0.04)' : P.cardHi),
                  color: active ? P.accent : P.textHi,
                  border: `1.5px solid ${active ? P.accent + '50' : (isDark ? 'rgba(255,255,255,0.15)' : P.border)}`,
                }}
              >
                {pillar}
              </button>
            );
          })}
        </div>
      </FormField>

      {/* Tags */}
      <FormField label="Tags" icon={Tag} hint="Add relevant tags for discoverability">
        <TagInput tags={data.tags} onChange={t => onChange({ tags: t })} suggestions={['SDG', 'Youth', 'Women', 'Health', 'Education', 'Environment', 'Rural', 'Urban', 'Digital', 'Innovation']} />
      </FormField>
    </motion.div>
  );
}

function Step2Budget({ data, errors, onChange }: { data: FormData; errors: ValidationErrors; onChange: (d: Partial<FormData>) => void }) {
  const { colors: P } = useTheme();
  const dateValid = data.startDate && data.endDate && new Date(data.endDate) > new Date(data.startDate);
  const durationDays = dateValid ? Math.ceil((new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const durationMonths = Math.round(durationDays / 30.44);

  return (
    <motion.div variants={fadeUp as any} initial="hidden" animate="show" className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: CORPORATE.brandSoft, border: `1px solid ${CORPORATE.brand}33` }}>
          <Wallet size={18} style={{ color: CORPORATE.brand }} />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight" style={{ color: P.textHi }}>Budget & Timeline</h2>
          <p className="text-sm font-medium" style={{ color: P.textMd }}>Set financial parameters and early warning thresholds</p>
        </div>
      </div>

      <GlassCard className="p-5" glow="rgba(56,189,248,0.05)">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <FormField label="Start Date" required error={errors.startDate} icon={Calendar}>
            <TextInput type="date" value={data.startDate} onChange={v => onChange({ startDate: v })} error={!!errors.startDate} />
          </FormField>
          <FormField label="End Date" required error={errors.endDate} icon={Calendar}>
            <TextInput type="date" value={data.endDate} onChange={v => onChange({ endDate: v })} error={!!errors.endDate} />
          </FormField>
          <FormField label="Allocated Budget (OMR)" required error={errors.budget} icon={Wallet}>
            <TextInput type="number" value={data.budget} onChange={v => onChange({ budget: v ? Number(v) : '' })} placeholder="e.g., 150000" error={!!errors.budget} />
          </FormField>
        </div>

        {/* Duration Info */}
        {dateValid && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: `${P.accent}10`, border: `1px solid ${P.accent}20` }}>
              <Clock size={12} style={{ color: P.accent }} />
              <span className="text-[11px] font-medium" style={{ color: P.accent }}>{durationDays} days ({durationMonths} months)</span>
            </div>
            {typeof data.budget === 'number' && data.budget > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)' }}>
                <BarChart3 size={12} style={{ color: '#38bdf8' }} />
                <span className="text-[11px] font-medium" style={{ color: '#7dd3fc' }}>{(Number(data.budget) / Math.max(durationMonths, 1)).toFixed(0)} OMR/month</span>
              </div>
            )}
          </motion.div>
        )}
      </GlassCard>

      {/* Early Warning Settings */}
      <GlassCard className="p-5" glow="rgba(251,191,36,0.05)">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)' }}>
              <Bell size={16} style={{ color: '#fbbf24' }} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: P.textHi }}>Early Warning Configuration</h3>
              <p className="text-[10px]" style={{ color: P.textLo }}>Set thresholds for automated risk monitoring</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange({ alertsEnabled: !data.alertsEnabled })}
            className="relative h-6 w-11 rounded-full transition-all duration-300 cursor-pointer"
            style={{ background: data.alertsEnabled ? P.accent : P.border }}
          >
            <motion.div
              animate={{ x: data.alertsEnabled ? 20 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute top-1 h-4 w-4 rounded-full"
              style={{ background: P.textHi }}
            />
          </button>
        </div>

        <AnimatePresence>
          {data.alertsEnabled && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-5 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Gauge size={14} style={{ color: '#fb923c' }} />
                    <span className="text-[12px] font-semibold" style={{ color: P.textMd }}>Budget Threshold</span>
                  </div>
                  <CustomSlider value={data.budgetThreshold} onChange={v => onChange({ budgetThreshold: v })} min={50} max={100} step={5} unit="%" color="#fb923c" />
                  <p className="text-[12px]" style={{ color: P.textMd }}>Alert when spending exceeds this % of budget</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={14} style={{ color: '#f87171' }} />
                    <span className="text-[12px] font-semibold" style={{ color: P.textMd }}>Delay Threshold</span>
                  </div>
                  <CustomSlider value={data.delayThreshold} onChange={v => onChange({ delayThreshold: v })} min={3} max={60} step={1} unit=" days" color="#f87171" />
                  <p className="text-[12px]" style={{ color: P.textMd }}>Alert when project is delayed by this many days</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Star size={14} style={{ color: '#a78bfa' }} />
                    <span className="text-[12px] font-semibold" style={{ color: P.textMd }}>Quality Threshold</span>
                  </div>
                  <CustomSlider value={data.qualityThreshold} onChange={v => onChange({ qualityThreshold: v })} min={1} max={5} step={0.5} unit="" color="#a78bfa" />
                  <p className="text-[12px]" style={{ color: P.textMd }}>Alert when average rating drops below this</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </motion.div>
  );
}

function Step3Beneficiaries({ data, errors, onChange }: { data: FormData; errors: ValidationErrors; onChange: (d: Partial<FormData>) => void }) {
  const { colors: P } = useTheme();
  const total = (Number(data.maleCount) || 0) + (Number(data.femaleCount) || 0);
  const malePct = total > 0 ? Math.round((Number(data.maleCount) || 0) / total * 100) : 50;
  const femalePct = 100 - malePct;

  const targetGroups = [
    { value: 'children', label: 'Children', icon: Baby, color: '#0B5CAB' },
    { value: 'youth', label: 'Youth', icon: Zap, color: '#1D4F91' },
    { value: 'adults', label: 'Adults', icon: UserCheck, color: '#2D4F7B' },
    { value: 'elderly', label: 'Elderly', icon: Heart, color: '#3A587E' },
    { value: 'women', label: 'Women', icon: Users, color: '#2563A6' },
    { value: 'disabled', label: 'People with Disabilities', icon: Shield, color: '#1F3E63' },
    { value: 'all', label: 'General Public', icon: Globe, color: '#64748b' },
  ];

  const ageGroups = ['0-5', '6-12', '13-17', '18-25', '26-35', '36-50', '51-65', '65+', 'All Ages'];

  return (
    <motion.div variants={fadeUp as any} initial="hidden" animate="show" className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: CORPORATE.brandSoft, border: `1px solid ${CORPORATE.brand}33` }}>
          <Users size={18} style={{ color: CORPORATE.brand }} />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight" style={{ color: P.textHi }}>Beneficiaries</h2>
          <p className="text-sm font-medium" style={{ color: P.textMd }}>Define the target population and expected reach</p>
        </div>
      </div>

      {/* Target Group Selection */}
      <FormField label="Target Group" required error={errors.targetGroup} icon={Target}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {targetGroups.map(group => {
            const active = data.targetGroup === group.value;
            const Icon = group.icon;
            return (
              <motion.button
                key={group.value}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onChange({ targetGroup: group.value })}
                className="flex items-center gap-2 p-3 rounded-xl transition-all"
                style={{
                  background: active ? `${group.color}12` : 'transparent',
                  border: `1px solid ${active ? group.color + '40' : P.border}`,
                  color: active ? group.color : P.textLo,
                }}
              >
                <Icon size={15} />
                <span className="text-[11px] font-medium">{group.label}</span>
              </motion.button>
            );
          })}
        </div>
      </FormField>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Counts */}
        <GlassCard className="p-5">
          <h3 className="text-sm font-bold mb-4" style={{ color: P.textHi }}>Population Estimate</h3>
          <div className="space-y-4">
            <FormField label="Total Expected Beneficiaries" required error={errors.expectedCount} icon={Users}>
              <TextInput type="number" value={data.expectedCount} onChange={v => onChange({ expectedCount: v ? Number(v) : '' })} placeholder="e.g., 1200" error={!!errors.expectedCount} />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Male" icon={UserCheck}>
                <TextInput type="number" value={data.maleCount} onChange={v => onChange({ maleCount: v ? Number(v) : '' })} placeholder="Male count" />
              </FormField>
              <FormField label="Female" icon={Heart}>
                <TextInput type="number" value={data.femaleCount} onChange={v => onChange({ femaleCount: v ? Number(v) : '' })} placeholder="Female count" />
              </FormField>
            </div>

            {total > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 mt-2">
                <div className="flex justify-between text-[10px]" style={{ color: P.textLo }}>
                  <span>Male {malePct}%</span>
                  <span>Female {femalePct}%</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden flex" style={{ background: P.border }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${malePct}%` }} transition={{ duration: 0.6, ease: EASE }} className="h-full rounded-l-full" style={{ background: '#38bdf8' }} />
                  <motion.div initial={{ width: 0 }} animate={{ width: `${femalePct}%` }} transition={{ duration: 0.6, ease: EASE, delay: 0.1 }} className="h-full rounded-r-full" style={{ background: '#f472b6' }} />
                </div>
                <div className="flex justify-center gap-4 text-[10px]">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: '#38bdf8' }} /> Male: {Number(data.maleCount) || 0}</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: '#f472b6' }} /> Female: {Number(data.femaleCount) || 0}</span>
                </div>
              </motion.div>
            )}
          </div>
        </GlassCard>

        {/* Age & Description */}
        <GlassCard className="p-5">
          <h3 className="text-sm font-bold mb-4" style={{ color: P.textHi }}>Demographics</h3>
          <div className="space-y-4">
            <FormField label="Age Group" icon={Baby}>
              <div className="flex flex-wrap gap-1.5">
                {ageGroups.map(ag => {
                  const active = data.ageGroup === ag;
                  return (
                    <button key={ag} type="button" onClick={() => onChange({ ageGroup: ag })} className="px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all" style={{
                      background: active ? `${P.accent}15` : 'transparent',
                      color: active ? P.accent : P.textLo,
                      border: `1px solid ${active ? P.accent + '40' : P.border}`,
                    }}>
                      {ag}
                    </button>
                  );
                })}
              </div>
            </FormField>

            <FormField label="Beneficiary Description" hint="Describe the target beneficiaries and how they will benefit">
              <TextArea value={data.beneficiaryDescription} onChange={v => onChange({ beneficiaryDescription: v })} placeholder="Describe the beneficiary profile, their needs, and expected impact..." rows={4} />
            </FormField>
          </div>
        </GlassCard>
      </div>
    </motion.div>
  );
}

function Step4Location({ data, errors, onChange }: { data: FormData; errors: ValidationErrors; onChange: (d: Partial<FormData>) => void }) {
  const { colors: P } = useTheme();
  const selectedGov = governorates.find(g => g.name === data.governorate);
  const districts = selectedGov?.districts || [];

  const partnersList = [
    'Ministry of Social Development', 'Ministry of Education', 'Ministry of Health',
    'Oman Charitable Organization', 'UNICEF Oman', 'WHO Oman',
    'Shell Oman', 'PDO (Petroleum Development Oman)', 'Bank Muscat',
    'Omantel', 'OQ Group', 'Sohar Aluminium',
  ];

  return (
    <motion.div variants={fadeUp as any} initial="hidden" animate="show" className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: CORPORATE.brandSoft, border: `1px solid ${CORPORATE.brand}33` }}>
          <MapPin size={18} style={{ color: CORPORATE.brand }} />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight" style={{ color: P.textHi }}>Location & Partners</h2>
          <p className="text-sm font-medium" style={{ color: P.textMd }}>Specify project location and collaborating partners</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GlassCard className="p-5" glow="rgba(52,211,153,0.05)">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: P.textHi }}>
            <Globe size={14} style={{ color: '#34d399' }} /> Project Location
          </h3>
          <div className="space-y-4">
            <FormField label="Governorate" required error={errors.governorate} icon={MapPin}>
              <SelectInput value={data.governorate} onChange={v => { onChange({ governorate: v, district: '' }); }} options={governorates.map(g => ({ value: g.name, label: g.name }))} placeholder="Select governorate" error={!!errors.governorate} />
            </FormField>

            <FormField label="District / Wilayat" required error={errors.district}>
              <SelectInput value={data.district} onChange={v => onChange({ district: v })} options={districts.map(d => ({ value: d, label: d }))} placeholder={data.governorate ? 'Select district' : 'Select governorate first'} error={!!errors.district} />
            </FormField>

            <FormField label="Detailed Address">
              <TextArea value={data.detailedAddress} onChange={v => onChange({ detailedAddress: v })} placeholder="Street, building, or landmark details..." rows={2} />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Latitude" hint="Optional">
                <TextInput type="number" value={data.latitude} onChange={v => onChange({ latitude: v ? Number(v) : '' })} placeholder="e.g., 23.5880" />
              </FormField>
              <FormField label="Longitude" hint="Optional">
                <TextInput type="number" value={data.longitude} onChange={v => onChange({ longitude: v ? Number(v) : '' })} placeholder="e.g., 58.3829" />
              </FormField>
            </div>
          </div>
        </GlassCard>

        {/* Map Preview Placeholder */}
        <GlassCard className="p-5">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: P.textHi }}>
            <MapPin size={14} style={{ color: '#a78bfa' }} /> Map Preview
          </h3>
          <div className="h-64 rounded-xl flex flex-col items-center justify-center" style={{ background: P.surface, border: `1px dashed ${P.border}` }}>
            <MapPin size={36} style={{ color: P.textDim }} />
            <p className="text-[12px] mt-3 font-medium" style={{ color: P.textLo }}>
              {data.governorate && data.district
                ? `${data.district}, ${data.governorate}`
                : 'Select a location to preview on map'}
            </p>
            {data.latitude && data.longitude && (
              <p className="text-[12px] mt-1 tabular-nums font-medium" style={{ color: P.textMd }}>{String(data.latitude)}, {String(data.longitude)}</p>
            )}
          </div>

          {/* Partners */}
          <div className="mt-5">
            <FormField label="Partners & Collaborators" icon={Building2} hint="Select organizations partnering on this project">
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: `${P.border} transparent` }}>
                {partnersList.map(partner => {
                  const active = data.partners.includes(partner);
                  return (
                    <button
                      key={partner}
                      type="button"
                      onClick={() => onChange({ partners: active ? data.partners.filter(p => p !== partner) : [...data.partners, partner] })}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-full text-[11px] text-left transition-all"
                      style={{
                        background: active ? `${P.accent}10` : 'transparent',
                        color: active ? P.accent : P.textMd,
                        border: `1px solid ${active ? P.accent + '30' : 'transparent'}`,
                      }}
                    >
                      <Building2 size={12} style={{ color: active ? P.accent : P.textDim }} />
                      {partner}
                      {active && <CheckCircle2 size={12} className="ml-auto" style={{ color: P.accent }} />}
                    </button>
                  );
                })}
              </div>
            </FormField>
          </div>
        </GlassCard>
      </div>
    </motion.div>
  );
}

function Step5Media({ data, onChange }: { data: FormData; errors: ValidationErrors; onChange: (d: Partial<FormData>) => void }) {
  const { colors: P } = useTheme();
  const imageCategories = [
    { value: 'before', label: 'Before', color: '#fb923c' },
    { value: 'during', label: 'During', color: '#38bdf8' },
    { value: 'after',  label: 'After',  color: '#34d399' },
  ];

  const docCategories = [
    { value: 'contract', label: 'Contract', icon: FileText },
    { value: 'plan',     label: 'Plan',     icon: ClipboardList },
    { value: 'report',   label: 'Report',   icon: BarChart3 },
    { value: 'invoice',  label: 'Invoice',  icon: Wallet },
    { value: 'other',    label: 'Other',    icon: Paperclip },
  ];

  const onDropImages = useCallback((accepted: File[]) => {
    const newItems: FileItem[] = accepted.map(file => ({
      id: Math.random().toString(36).slice(2),
      file,
      preview: URL.createObjectURL(file),
      category: 'before',
      name: file.name,
    }));
    onChange({ images: [...data.images, ...newItems] });
  }, [data.images, onChange]);

  const onDropDocs = useCallback((accepted: File[]) => {
    const newItems: FileItem[] = accepted.map(file => ({
      id: Math.random().toString(36).slice(2),
      file,
      preview: '',
      category: 'other',
      name: file.name,
    }));
    onChange({ documents: [...data.documents, ...newItems] });
  }, [data.documents, onChange]);

  const { getRootProps: getImgRootProps, getInputProps: getImgInputProps, isDragActive: imgDragActive } = useDropzone({
    onDrop: onDropImages,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.svg'] },
    maxSize: 10 * 1024 * 1024,
  });

  const { getRootProps: getDocRootProps, getInputProps: getDocInputProps, isDragActive: docDragActive } = useDropzone({
    onDrop: onDropDocs,
    accept: { 'application/pdf': ['.pdf'], 'application/msword': ['.doc'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'application/vnd.ms-excel': ['.xls'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxSize: 25 * 1024 * 1024,
  });

  const removeImage = (id: string) => {
    const item = data.images.find(img => img.id === id);
    if (item) URL.revokeObjectURL(item.preview);
    onChange({ images: data.images.filter(img => img.id !== id) });
  };

  const removeDoc = (id: string) => onChange({ documents: data.documents.filter(d => d.id !== id) });

  const updateImageCategory = (id: string, category: string) => onChange({ images: data.images.map(img => img.id === id ? { ...img, category } : img) });
  const updateDocCategory = (id: string, category: string) => onChange({ documents: data.documents.map(d => d.id === id ? { ...d, category } : d) });

  return (
    <motion.div variants={fadeUp as any} initial="hidden" animate="show" className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: CORPORATE.brandSoft, border: `1px solid ${CORPORATE.brand}33` }}>
          <Camera size={18} style={{ color: CORPORATE.brand }} />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight" style={{ color: P.textHi }}>Media & Documents</h2>
          <p className="text-sm font-medium" style={{ color: P.textMd }}>Upload project images and supporting documents</p>
        </div>
      </div>

      {/* Images Upload */}
      <GlassCard className="p-5" glow="rgba(251,146,60,0.04)">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: P.textHi }}>
            <Image size={14} style={{ color: '#fb923c' }} /> Project Images
          </h3>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: `${P.accent}15`, color: P.accent }}>{data.images.length} files</span>
        </div>

        <div {...getImgRootProps()} className="cursor-pointer">
          <input {...getImgInputProps()} />
          <motion.div
            animate={{ borderColor: imgDragActive ? P.accent : P.border, background: imgDragActive ? `${P.accent}08` : 'transparent' }}
            className="flex flex-col items-center justify-center py-10 rounded-xl transition-all"
            style={{ border: `2px dashed ${P.border}` }}
          >
            <motion.div animate={{ scale: imgDragActive ? 1.15 : 1 }} className="h-14 w-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.2)' }}>
              <Upload size={22} style={{ color: '#fb923c' }} />
            </motion.div>
            <p className="text-[13px] font-medium mb-1" style={{ color: P.textHi }}>
              {imgDragActive ? 'Drop images here...' : 'Drag & drop images, or click to browse'}
            </p>
            <p className="text-[13px]" style={{ color: P.textMd }}>PNG, JPG, WebP, SVG — Max 10MB each</p>
          </motion.div>
        </div>

        {data.images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
            <AnimatePresence>
              {data.images.map(img => (
                <motion.div
                  key={img.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative group rounded-xl overflow-hidden"
                  style={{ border: `1px solid ${P.border}` }}
                >
                  <img src={img.preview} alt={img.name} className="w-full h-28 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <button type="button" onClick={() => removeImage(img.id)} className="absolute top-2 right-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all" style={{ background: 'rgba(248,113,113,0.9)' }}>
                    <X size={10} style={{ color: '#fff' }} />
                  </button>
                  <div className="absolute bottom-0 inset-x-0 p-2 flex gap-1">
                    {imageCategories.map(cat => (
                      <button key={cat.value} type="button" onClick={() => updateImageCategory(img.id, cat.value)} className="px-2 py-0.5 rounded-md text-[9px] font-bold transition-all" style={{
                        background: img.category === cat.value ? `${cat.color}90` : 'rgba(0,0,0,0.6)',
                        color: '#fff',
                      }}>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </GlassCard>

      {/* Documents Upload */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: P.textHi }}>
            <FileText size={14} style={{ color: '#38bdf8' }} /> Documents
          </h3>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(56,189,248,0.12)', color: '#7dd3fc' }}>{data.documents.length} files</span>
        </div>

        <div {...getDocRootProps()} className="cursor-pointer">
          <input {...getDocInputProps()} />
          <motion.div
            animate={{ borderColor: docDragActive ? '#38bdf8' : P.border, background: docDragActive ? 'rgba(56,189,248,0.05)' : 'transparent' }}
            className="flex flex-col items-center justify-center py-8 rounded-xl transition-all"
            style={{ border: `2px dashed ${P.border}` }}
          >
            <motion.div animate={{ scale: docDragActive ? 1.15 : 1 }} className="h-12 w-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}>
              <Paperclip size={20} style={{ color: '#38bdf8' }} />
            </motion.div>
            <p className="text-[13px] font-medium mb-1" style={{ color: P.textHi }}>
              {docDragActive ? 'Drop files here...' : 'Drag & drop documents, or click to browse'}
            </p>
            <p className="text-[13px]" style={{ color: P.textMd }}>PDF, DOC, DOCX, XLS, XLSX — Max 25MB each</p>
          </motion.div>
        </div>

        {data.documents.length > 0 && (
          <div className="space-y-2 mt-4">
            <AnimatePresence>
              {data.documents.map(doc => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                  style={{ background: P.surface, border: `1px solid ${P.border}` }}
                >
                  <div className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(56,189,248,0.1)' }}>
                    <FileText size={15} style={{ color: '#38bdf8' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium truncate" style={{ color: P.textHi }}>{doc.name}</p>
                    <p className="text-[12px]" style={{ color: P.textMd }}>{(doc.file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {docCategories.map(cat => (
                      <button key={cat.value} type="button" onClick={() => updateDocCategory(doc.id, cat.value)} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all" style={{
                        background: doc.category === cat.value ? `${P.accent}18` : 'transparent',
                        color: doc.category === cat.value ? P.accent : P.textMd,
                        border: `1px solid ${doc.category === cat.value ? P.accent + '40' : 'transparent'}`,
                      }}>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={() => removeDoc(doc.id)} className="p-1.5 rounded-full transition-colors" style={{ color: P.textLo }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = '#f8717112'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = P.textLo; e.currentTarget.style.background = 'transparent'; }}>
                    <Trash2 size={13} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}

function Step6Review({ data, onChange, categoryOptions }: { data: FormData; errors: ValidationErrors; onChange: (d: Partial<FormData>) => void; categoryOptions: { value: string; label: string }[] }) {
  const { colors: P } = useTheme();
  const sections = [
    {
      title: 'Basic Information', icon: ClipboardList, color: '#E91E63',
      items: [
        { label: 'Project Name', value: data.name },
        { label: 'Category', value: categoryOptions.find(c => c.value === data.category)?.label || data.category },
        { label: 'Status', value: data.status },
        { label: 'Short Description', value: data.shortDescription },
        { label: 'SDG Goals', value: data.sdgGoals.map(g => sdgGoals.find(s => s.id === g)?.label).filter(Boolean).join(', ') || 'None' },
        { label: 'Vision 2040 Pillars', value: data.visionPillars.join(', ') || 'None' },
        { label: 'Objectives', value: data.objectives.filter(o => o.trim()).join(' | ') || 'None' },
      ],
    },
    {
      title: 'Budget & Timeline', icon: Wallet, color: '#38bdf8',
      items: [
        { label: 'Start Date', value: data.startDate || 'Not set' },
        { label: 'End Date', value: data.endDate || 'Not set' },
        { label: 'Budget', value: data.budget ? `${Number(data.budget).toLocaleString()} OMR` : 'Not set' },
        { label: 'Early Warning', value: data.alertsEnabled ? 'Enabled' : 'Disabled' },
        ...(data.alertsEnabled ? [
          { label: 'Budget Threshold', value: `${data.budgetThreshold}%` },
          { label: 'Delay Threshold', value: `${data.delayThreshold} days` },
          { label: 'Quality Threshold', value: `${data.qualityThreshold} / 5` },
        ] : []),
      ],
    },
    {
      title: 'Beneficiaries', icon: Users, color: '#a78bfa',
      items: [
        { label: 'Target Group', value: data.targetGroup || 'Not set' },
        { label: 'Expected Count', value: data.expectedCount ? Number(data.expectedCount).toLocaleString() : 'Not set' },
        { label: 'Male / Female', value: `${data.maleCount || 0} / ${data.femaleCount || 0}` },
        { label: 'Age Group', value: data.ageGroup || 'Not set' },
      ],
    },
    {
      title: 'Location & Partners', icon: MapPin, color: '#34d399',
      items: [
        { label: 'Location', value: [data.governorate, data.district].filter(Boolean).join(', ') || 'Not set' },
        { label: 'Address', value: data.detailedAddress || 'Not specified' },
        { label: 'Coordinates', value: data.latitude && data.longitude ? `${data.latitude}, ${data.longitude}` : 'Not set' },
        { label: 'Partners', value: data.partners.length > 0 ? data.partners.join(', ') : 'None' },
      ],
    },
    {
      title: 'Media & Documents', icon: Camera, color: '#fb923c',
      items: [
        { label: 'Images', value: `${data.images.length} file(s)` },
        { label: 'Documents', value: `${data.documents.length} file(s)` },
      ],
    },
  ];

  // Completeness score
  const checks = [
    !!data.name, !!data.category, !!data.shortDescription,
    !!data.startDate, !!data.endDate, typeof data.budget === 'number' && data.budget > 0,
    !!data.targetGroup, typeof data.expectedCount === 'number' && data.expectedCount > 0,
    !!data.governorate, !!data.district,
    data.objectives.some(o => o.trim()),
  ];
  const completeness = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  return (
    <motion.div variants={fadeUp as any} initial="hidden" animate="show" className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: CORPORATE.brandSoft, border: `1px solid ${CORPORATE.brand}33` }}>
          <Eye size={18} style={{ color: CORPORATE.brand }} />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight" style={{ color: P.textHi }}>Review & Submit</h2>
          <p className="text-sm font-medium" style={{ color: P.textMd }}>Verify all information before creating the project</p>
        </div>
      </div>

      {/* Completeness Indicator */}
      <GlassCard className="p-5" glow={completeness === 100 ? 'rgba(52,211,153,0.08)' : 'rgba(251,191,36,0.05)'}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] font-semibold" style={{ color: P.textMd }}>Project Completeness</span>
          <span className="text-lg font-black tabular-nums" style={{ color: completeness === 100 ? '#34d399' : completeness >= 70 ? '#fbbf24' : '#f87171' }}>{completeness}%</span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: P.border }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completeness}%` }}
            transition={{ duration: 1, ease: EASE }}
            className="h-full rounded-full"
            style={{ background: completeness === 100 ? '#34d399' : completeness >= 70 ? '#fbbf24' : '#f87171' }}
          />
        </div>
        {completeness < 100 && (
          <p className="text-[10px] mt-2 flex items-center gap-1" style={{ color: '#fbbf24' }}>
            <AlertTriangle size={10} /> Some required fields are incomplete. You can still save as draft.
          </p>
        )}
      </GlassCard>

      {/* Sections Review */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sections.map((section, i) => {
          const Icon = section.icon;
          return (
            <motion.div key={section.title} variants={stagger(i * 0.08) as any} initial="hidden" animate="show">
              <GlassCard className="p-4 h-full">
                <div className="flex items-center gap-2 mb-3 pb-3" style={{ borderBottom: `1px solid ${P.border}` }}>
                  <div className="h-7 w-7 rounded-full flex items-center justify-center" style={{ background: `${section.color}12`, border: `1px solid ${section.color}25` }}>
                    <Icon size={13} style={{ color: section.color }} />
                  </div>
                  <h4 className="text-[13px] font-bold" style={{ color: P.textHi }}>{section.title}</h4>
                </div>
                <div className="space-y-2">
                  {section.items.map(item => (
                    <div key={item.label} className="flex justify-between gap-4">
                      <span className="text-[13px] font-medium flex-shrink-0" style={{ color: P.textMd }}>{item.label}</span>
                      <span className="text-[13px] font-semibold text-right truncate" style={{ color: item.value === 'Not set' || item.value === 'None' ? P.textLo : P.textHi, maxWidth: '60%' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {/* Image Previews in Review */}
      {data.images.length > 0 && (
        <GlassCard className="p-4">
          <h4 className="text-[13px] font-bold mb-3 flex items-center gap-2" style={{ color: P.textHi }}>
            <Image size={13} style={{ color: '#fb923c' }} /> Uploaded Images
          </h4>
          <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin', scrollbarColor: `${P.border} transparent` }}>
            {data.images.map(img => (
              <img key={img.id} src={img.preview} alt={img.name} className="h-20 w-28 rounded-lg object-cover flex-shrink-0" style={{ border: `1px solid ${P.border}` }} />
            ))}
          </div>
        </GlassCard>
      )}

      {/* Terms */}
      <GlassCard className="p-5">
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="mt-0.5">
            <input type="checkbox" checked={data.agreedToTerms} onChange={e => onChange({ agreedToTerms: e.target.checked })} className="sr-only" />
            <div className="h-5 w-5 rounded-md flex items-center justify-center transition-all" style={{
              background: data.agreedToTerms ? P.accent : 'transparent',
              border: `2px solid ${data.agreedToTerms ? P.accent : P.border}`,
            }}>
              {data.agreedToTerms && <Check size={12} style={{ color: P.bg }} />}
            </div>
          </div>
          <div>
            <p className="text-[14px] font-semibold" style={{ color: P.textHi }}>I confirm that all information provided is accurate</p>
            <p className="text-[13px] mt-1 leading-relaxed" style={{ color: P.textMd }}>By submitting, you agree that this project will go through the standard approval workflow and all data will be audited.</p>
          </div>
        </label>
      </GlassCard>
    </motion.div>
  );
}

// ─── Progress Bar ────────────────────────────────────────────────────────────
function WizardProgress({ currentStep, completedSteps, onStepClick }: { currentStep: number; completedSteps: Set<number>; onStepClick: (step: number) => void }) {
  const { colors: P, isDark } = useTheme();
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
      {STEPS.map((step, i) => {
        const isActive = i === currentStep;
        const isCompleted = completedSteps.has(i);
        const Icon = step.icon;

        return (
          <motion.button
            key={step.key}
            type="button"
            onClick={() => onStepClick(i)}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all relative cursor-pointer text-left"
            style={{
              background: isActive
                ? `${step.color}1a`
                : (isDark ? 'rgba(15,23,42,0.55)' : P.surface),
              border: `1.5px solid ${isActive ? `${step.color}70` : (isDark ? 'rgba(148,163,184,0.40)' : P.borderHi)}`,
              boxShadow: isActive ? `0 0 0 1px ${step.color}30 inset, 0 2px 8px ${step.color}20` : 'none',
            }}
          >
            <div className="h-9 w-9 rounded-lg flex items-center justify-center transition-all flex-shrink-0" style={{
              background: isCompleted ? `${step.color}28` : isActive ? `${step.color}18` : (isDark ? 'rgba(255,255,255,0.06)' : P.cardHi),
              border: `1.5px solid ${isCompleted || isActive ? `${step.color}70` : (isDark ? 'rgba(255,255,255,0.15)' : P.border)}`,
            }}>
              {isCompleted ? <Check size={15} style={{ color: step.color }} /> : <Icon size={15} style={{ color: isActive ? step.color : P.textMd }} />}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold" style={{ color: isActive ? step.color : P.textMd }}>Step {i + 1}</p>
              <p className="text-[13px] font-bold truncate" style={{ color: isActive ? (isDark ? '#f1f5f9' : P.textHi) : P.textHi }}>{step.label}</p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function AddProject() {
  const { colors: P, isDark } = useTheme();
  const navigate = useNavigate();
  const toast = useToast();
  const user = useAuthStore(s => s.user);
  const queryClient = useQueryClient();

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
  });
  const categoriesRaw = (categoriesData as any)?.data?.items ?? (categoriesData as any)?.data ?? [];
  const categoryOptions = Array.isArray(categoriesRaw) ? categoriesRaw.map((c: any) => ({ value: c.id, label: c.name })) : [];

  const createMutation = useMutation({
    mutationFn: (projectData: Record<string, unknown>) => projectService.createProject(projectData as any),
  });

  // Read prefill from router state (handed off by Project Studio in FuturePortal)
  const location = useLocation();
  const prefill = (location.state as { prefill?: Partial<FormData> } | null)?.prefill;
  const seededData: FormData = useMemo(() => prefill ? { ...initialFormData, ...prefill } : initialFormData, [prefill]);

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [data, setData] = useState<FormData>(seededData);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clear prefill from history once consumed so a fresh visit to /projects/add starts blank
  useEffect(() => {
    if (prefill) {
      window.history.replaceState({}, '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = useCallback((partial: Partial<FormData>) => {
    setData(prev => ({ ...prev, ...partial }));
    // Clear errors for changed fields
    const keys = Object.keys(partial);
    setErrors(prev => {
      const next = { ...prev };
      keys.forEach(k => delete next[k]);
      return next;
    });
  }, []);

  const validateStep = useCallback((step: number): boolean => {
    const errs: ValidationErrors = {};
    switch (step) {
      case 0:
        if (!data.name.trim()) errs.name = 'Project name is required';
        if (!data.category) errs.category = 'Please select a category';
        if (!data.shortDescription.trim()) errs.shortDescription = 'Short description is required';
        if (!data.objectives.some(o => o.trim())) errs.objectives = 'At least one objective is required';
        break;
      case 1:
        if (!data.startDate) errs.startDate = 'Start date is required';
        if (!data.endDate) errs.endDate = 'End date is required';
        if (data.startDate && data.endDate && new Date(data.endDate) <= new Date(data.startDate)) errs.endDate = 'End date must be after start date';
        if (!data.budget || Number(data.budget) <= 0) errs.budget = 'Budget is required';
        break;
      case 2:
        if (!data.targetGroup) errs.targetGroup = 'Please select a target group';
        if (!data.expectedCount || Number(data.expectedCount) <= 0) errs.expectedCount = 'Expected count is required';
        break;
      case 3:
        if (!data.governorate) errs.governorate = 'Please select a governorate';
        if (!data.district) errs.district = 'Please select a district';
        break;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [data]);

  const goNext = useCallback(() => {
    if (!validateStep(currentStep)) {
      toast.error('Validation Error', 'Please fill in all required fields before submitting.');
      return;
    }
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    setDirection(1);
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep, validateStep, toast]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setCurrentStep(prev => Math.max(prev - 1, 0));
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step < currentStep || completedSteps.has(step) || step === currentStep + 1) {
      setDirection(step > currentStep ? 1 : -1);
      setCurrentStep(step);
    }
  }, [currentStep, completedSteps]);

  const handleSave = useCallback(async () => {
    if (!user || !['admin', 'manager'].includes(user.role)) {
      toast.error('Permission denied', 'Only admin and manager roles can create projects.');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: data.name,
        categoryId: data.category,
        status: data.status,
        description: data.shortDescription,
        objectives: data.objectives.filter(o => o.trim()),
        expectedOutputs: data.expectedOutputs.filter(o => o.trim()),
        sdgGoals: data.sdgGoals,
        tags: data.tags,
        startDate: data.startDate,
        endDate: data.endDate,
        budget: Number(data.budget) || 0,
        location: [data.governorate, data.district].filter(Boolean).join(', '),
        region: data.governorate,
        latitude: data.latitude ? Number(data.latitude) : undefined,
        longitude: data.longitude ? Number(data.longitude) : undefined,
      };

      const createdProject = await createMutation.mutateAsync(payload);
      const projectId = createdProject.data.id;
      const followUpTasks: Promise<unknown>[] = [];

      if (typeof data.expectedCount === 'number' && data.expectedCount > 0) {
        followUpTasks.push(
          beneficiaryService.createProjectBeneficiary(projectId, {
            count: Number(data.expectedCount),
            male: Number(data.maleCount) || 0,
            female: Number(data.femaleCount) || 0,
            ageGroup: data.ageGroup || undefined,
            description: data.beneficiaryDescription || undefined,
            impact: data.targetGroup ? `Target group: ${data.targetGroup}` : undefined,
          })
        );
      }

      followUpTasks.push(
        ...data.images.map(async (image) => {
          const uploadResult = await uploadService.upload('media', image.file);
          return projectService.createProjectMedia(projectId, {
            url: uploadResult.data.url,
            type: image.file.type.startsWith('video/') ? 'video' : 'image',
            caption: image.name,
            category: image.category || undefined,
          });
        })
      );

      followUpTasks.push(
        ...data.documents.map(async (document) => {
          const uploadResult = await uploadService.upload('documents', document.file);
          return projectService.createProjectDocument(projectId, {
            name: document.name,
            type: document.file.type || 'application/octet-stream',
            size: document.file.size,
            url: uploadResult.data.url,
          });
        })
      );

      const followUpResults = await Promise.allSettled(followUpTasks);
      const failedFollowUps = followUpResults.filter((result) => result.status === 'rejected').length;

      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      if (failedFollowUps > 0) {
        toast.warning('Project Created With Warnings', `${failedFollowUps} attachment upload${failedFollowUps === 1 ? '' : 's'} failed. The project itself was saved successfully.`);
      } else {
        toast.success('Project Created', 'Your new project has been created successfully.');
      }
      navigate('/projects');
    } catch (error: any) {
      const apiMessage = error?.response?.data?.error?.message
        || error?.response?.data?.message
        || error?.message;
      toast.error('Error', apiMessage || 'Failed to create project. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [createMutation, data, navigate, queryClient, toast, user]);

  const stepComponents = [
    <Step1Basic key="s1" data={data} errors={errors} onChange={onChange} categoryOptions={categoryOptions} />,
    <Step2Budget key="s2" data={data} errors={errors} onChange={onChange} />,
    <Step3Beneficiaries key="s3" data={data} errors={errors} onChange={onChange} />,
    <Step4Location key="s4" data={data} errors={errors} onChange={onChange} />,
    <Step5Media key="s5" data={data} errors={errors} onChange={onChange} />,
    <Step6Review key="s6" data={data} errors={errors} onChange={onChange} categoryOptions={categoryOptions} />,
  ];

  const overallProgress = Math.round(((completedSteps.size + (currentStep === STEPS.length - 1 ? 0.5 : 0)) / STEPS.length) * 100);

  return (
    <div className="min-h-full" style={{ background: isDark ? '#0a1322' : '#f8fafc', fontFamily: "'Inter', sans-serif" }}>

      <div className="relative max-w-[1380px] mx-auto px-6 py-6" ref={containerRef}>
        {/* ═══ Header ═══ */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => navigate('/projects')} className="h-9 w-9 rounded-xl flex items-center justify-center transition-colors" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : P.surface, border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : P.border}`, color: P.textMd }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${P.accent}40`; e.currentTarget.style.color = P.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.10)' : P.border; e.currentTarget.style.color = P.textMd; }}>
                <ArrowLeft size={16} />
              </button>
              <div>
                <h1 className="text-xl font-bold tracking-tight flex items-center gap-2" style={{ color: P.textHi }}>
                  <FolderKanban size={20} style={{ color: isDark ? '#93c5fd' : CORPORATE.brand }} />
                  Add New Project
                </h1>
                <p className="text-sm mt-0.5 font-medium" style={{ color: P.textMd }}>Enterprise project intake form with audit-ready structure</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : P.surface, border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : P.border}` }}>
                <div className="h-1.5 w-24 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.10)' : P.border }}>
                  <motion.div animate={{ width: `${overallProgress}%` }} className="h-full rounded-full" style={{ background: isDark ? '#3b82f6' : CORPORATE.brand }} />
                </div>
                <span className="text-[12px] font-bold tabular-nums" style={{ color: isDark ? '#93c5fd' : CORPORATE.brand }}>{overallProgress}%</span>
              </div>
              <button type="button" onClick={() => navigate('/projects')} className="px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-colors" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : P.surface, border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.18)' : P.borderHi}`, color: P.textHi }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#f8717140'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.10)' : P.border; }}>
                Cancel
              </button>
            </div>
          </div>
        </motion.div>

        {/* ═══ Bento Body ═══ */}
        <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-5 items-start">
          <div className="xl:sticky xl:top-5 space-y-5">
            <GlassCard className="p-4">
              <p className="text-[13px] font-bold mb-3" style={{ color: P.textHi }}>Project Workflow</p>
              <WizardProgress currentStep={currentStep} completedSteps={completedSteps} onStepClick={goToStep} />
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[14px] font-bold" style={{ color: P.textHi }}>Completion</p>
                <span className="text-[14px] font-black" style={{ color: isDark ? '#93c5fd' : CORPORATE.brand }}>{overallProgress}%</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.15)' : P.borderHi }}>
                <motion.div animate={{ width: `${overallProgress}%` }} className="h-full rounded-full" style={{ background: isDark ? '#3b82f6' : CORPORATE.brand }} />
              </div>
              <p className="text-[12px] mt-2.5 leading-relaxed" style={{ color: P.textMd }}>All entries are preserved between steps.</p>
            </GlassCard>
          </div>

          <div className="space-y-5">
            <GlassCard className="p-5 min-h-[560px]">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentStep}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  {stepComponents[currentStep]}
                </motion.div>
              </AnimatePresence>
            </GlassCard>

            {/* ═══ Navigation ═══ */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <GlassCard className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={goPrev}
                    disabled={currentStep === 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: isDark ? 'rgba(255,255,255,0.03)' : P.surface, border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : P.border}`, color: P.textMd }}
                    onMouseEnter={e => { if (currentStep > 0) e.currentTarget.style.borderColor = `${P.accent}40`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.10)' : P.border; }}
                  >
                    <ArrowLeft size={14} />
                    Previous
                  </button>

                  <div className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: P.textMd }}>
                    Step {currentStep + 1} of {STEPS.length}
                  </div>

                  {currentStep < STEPS.length - 1 ? (
                    <motion.button
                      type="button"
                      onClick={goNext}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-semibold transition-all"
                      style={{ background: isDark ? '#1e3a8a2f' : '#0B5CAB16', color: isDark ? '#93c5fd' : CORPORATE.brand, border: `1px solid ${isDark ? '#3b82f660' : '#0B5CAB4a'}` }}
                    >
                      Next Step
                      <ArrowRight size={14} />
                    </motion.button>
                  ) : (
                    <motion.button
                      type="button"
                      onClick={handleSave}
                      disabled={!data.agreedToTerms || saving}
                      whileHover={{ y: data.agreedToTerms ? -1 : 0 }}
                      whileTap={{ scale: data.agreedToTerms ? 0.98 : 1 }}
                      className="flex items-center gap-2 px-6 py-3 rounded-lg text-[14px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: data.agreedToTerms ? '#34d399' : (isDark ? 'rgba(255,255,255,0.08)' : P.border), color: data.agreedToTerms ? '#022c22' : P.textMd, border: `1.5px solid ${data.agreedToTerms ? '#34d399' : (isDark ? 'rgba(255,255,255,0.20)' : P.borderHi)}` }}
                    >
                      {saving ? (
                        <>
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                            <Settings2 size={14} />
                          </motion.div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={14} />
                          Save Project
                        </>
                      )}
                    </motion.button>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}
