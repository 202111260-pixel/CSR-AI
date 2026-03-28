import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, Plus, X, Trash2,
  FileText, Image, Upload, MapPin, Calendar, Wallet, Users, Target,
  ClipboardList, Building2, Globe, Camera, Paperclip,
  CheckCircle2, AlertTriangle, Save, Eye,
  Clock, Shield, Gauge, Bell, BarChart3,
  Heart, UserCheck, Baby, Zap, Star, Award,
  Edit3, History, MessageSquare, type LucideIcon,
  Settings2, Layers, Tag,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../components/common/Toast';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { projectService } from '../services/projectService';
import { uploadService } from '../services/uploadService';
import { categoryService } from '../services/categoryService';

// ─── Palette ──────────────────────────────────────────────────────────────────


// ─── Step Config ─────────────────────────────────────────────────────────────
const STEPS = [
  { key: 'basic',         label: 'Basic Info',    icon: ClipboardList, color: '#E91E63' },
  { key: 'budget',        label: 'Budget & Alerts', icon: Wallet,      color: '#38bdf8' },
  { key: 'beneficiaries', label: 'Beneficiaries', icon: Users,         color: '#a78bfa' },
  { key: 'location',      label: 'Location',      icon: MapPin,        color: '#34d399' },
  { key: 'media',         label: 'Media & Docs',  icon: Camera,        color: '#fb923c' },
  { key: 'review',        label: 'Review & Save', icon: CheckCircle2,  color: '#f472b6' },
] as const;

// categories come from the store now (categoryNames in component)
const statuses = [
  { value: 'planning',  label: 'Planning',  color: '#E91E63' },
  { value: 'active',    label: 'Active',    color: '#38bdf8' },
  { value: 'on_hold',   label: 'On Hold',   color: '#fbbf24' },
  { value: 'completed', label: 'Completed', color: '#34d399' },
];

const governorates = [
  { name: 'Muscat', districts: ['Muscat', 'Mutrah', 'Bawshar', 'Seeb', 'Al Amerat', 'Qurayyat'] },
  { name: 'Dhofar', districts: ['Salalah', 'Thumrait', 'Taqa', 'Mirbat', 'Rakhyut'] },
  { name: 'Al Batinah North', districts: ['Sohar', 'Shinas', 'Liwa', 'Saham', 'Al Khaburah', 'Al Suwaiq'] },
  { name: 'Al Batinah South', districts: ['Al Rustaq', 'Al Awabi', 'Nakhal', 'Wadi Al Maawil', 'Barka', 'Al Musannah'] },
  { name: 'Al Dakhiliyah', districts: ['Nizwa', 'Bahla', 'Adam', 'Al Hamra', 'Manah', 'Izki', 'Bid Bid', 'Samayil'] },
  { name: 'Al Sharqiyah North', districts: ['Ibra', 'Al Mudhaibi', 'Bidiyah', 'Al Qabil', 'Wadi Bani Khalid'] },
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
  'Economic Diversification', 'Human Capital Development', 'Environmental Sustainability',
  'Innovation & Technology', 'Social Well-being', 'Governance Excellence',
];

// ─── Animation ─────────────────────────────────────────────────────────────
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
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
  name: string; category: string; status: string; shortDescription: string; fullDescription: string;
  objectives: string[]; expectedOutputs: string[]; sdgGoals: number[]; visionPillars: string[]; tags: string[];
  startDate: string; endDate: string; budget: number | ''; budgetThreshold: number; delayThreshold: number;
  qualityThreshold: number; alertsEnabled: boolean;
  targetGroup: string; expectedCount: number | ''; maleCount: number | ''; femaleCount: number | '';
  ageGroup: string; beneficiaryDescription: string;
  governorate: string; district: string; detailedAddress: string; latitude: number | ''; longitude: number | '';
  partners: string[];
  images: FileItem[]; documents: FileItem[];
  agreedToTerms: boolean;
  editReason: string;
}
interface FileItem { id: string; file: File; preview: string; category: string; name: string; }
interface ValidationErrors { [key: string]: string; }

interface ModificationEntry {
  id: string;
  date: string;
  user: string;
  avatar?: string;
  changes: string[];
  reason: string;
}

// ─── Reusable Components (same as AddProject) ──────────────────────────────

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

function FormField({ label, required, error, hint, children, icon: Icon }: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode; icon?: LucideIcon;
}) {
  const { colors: P } = useTheme();
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: P.textMd }}>
        {Icon && <Icon size={13} style={{ color: P.accentLo }} />}
        {label}
        {required && <span style={{ color: '#f87171' }}>*</span>}
      </label>
      {children}
      {error && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1 text-[11px]" style={{ color: '#f87171' }}>
          <AlertTriangle size={10} /> {error}
        </motion.p>
      )}
      {hint && !error && <p className="text-[11px]" style={{ color: P.textDim }}>{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text', icon: Icon, error, ...props }: {
  value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string; icon?: LucideIcon; error?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'>) {
  const { colors: P } = useTheme();
  return (
    <div className="relative">
      {Icon && <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: P.textLo }} />}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={cn('w-full py-2.5 rounded-full text-[13px] outline-none transition-all duration-200', Icon ? 'pl-10 pr-4' : 'px-4')}
        style={{ background: P.surface, border: `1px solid ${error ? '#f8717160' : P.border}`, color: P.textHi }}
        onFocus={e => { e.currentTarget.style.borderColor = error ? '#f87171' : `${P.accent}60`; e.currentTarget.style.boxShadow = `0 0 0 3px ${error ? '#f8717115' : P.accent + '12'}`; }}
        onBlur={e => { e.currentTarget.style.borderColor = error ? '#f8717160' : P.border; e.currentTarget.style.boxShadow = 'none'; }}
        {...props} />
    </div>
  );
}

function TextArea({ value, onChange, placeholder, rows = 3, error }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; error?: boolean;
}) {
  const { colors: P } = useTheme();
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full px-4 py-3 rounded-full text-[13px] outline-none transition-all duration-200 resize-none"
      style={{ background: P.surface, border: `1px solid ${error ? '#f8717160' : P.border}`, color: P.textHi, scrollbarWidth: 'thin', scrollbarColor: `${P.border} transparent` }}
      onFocus={e => { e.currentTarget.style.borderColor = `${P.accent}60`; e.currentTarget.style.boxShadow = `0 0 0 3px ${P.accent}12`; }}
      onBlur={e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.boxShadow = 'none'; }} />
  );
}

function SelectInput({ value, onChange, options, placeholder, error }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string; color?: string }[]; placeholder?: string; error?: boolean;
}) {
  const { colors: P } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-full text-[13px] outline-none transition-all duration-200 text-left"
        style={{ background: P.surface, border: `1px solid ${error ? '#f8717160' : isOpen ? `${P.accent}60` : P.border}`, color: selected ? P.textHi : P.textLo }}>
        <div className="flex items-center gap-2">
          {selected?.color && <span className="h-2 w-2 rounded-full" style={{ background: selected.color }} />}
          {selected ? selected.label : placeholder || 'Select...'}
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}><ChevronDown size={14} style={{ color: P.textLo }} /></motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }} transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-2 rounded-xl overflow-hidden max-h-60 overflow-y-auto"
            style={{ background: P.card, border: `1px solid ${P.borderHi}`, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
            {options.map(opt => (
              <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-left transition-colors"
                style={{ color: opt.value === value ? P.accent : P.textMd }}
                onMouseEnter={e => { e.currentTarget.style.background = `${P.accent}10`; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                {opt.color && <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: opt.color }} />}
                {opt.label}
                {opt.value === value && <CheckCircle2 size={12} className="ml-auto" style={{ color: P.accent }} />}
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
  const { colors: P } = useTheme();
  return (
    <div className="space-y-2">
      <AnimatePresence>
        {items.map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2">
            <span className="flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold flex-shrink-0" style={{ background: `${P.accent}15`, color: P.accent, border: `1px solid ${P.accent}25` }}>{i + 1}</span>
            <div className="flex-1 relative">
              {Icon && <Icon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: P.textDim }} />}
              <input type="text" value={item} onChange={e => onChange(items.map((it, idx) => idx === i ? e.target.value : it))} placeholder={placeholder}
                className={cn('w-full py-2 rounded-full text-[12px] outline-none transition-all', Icon ? 'pl-9 pr-3' : 'px-3')}
                style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi }}
                onFocus={e => { e.currentTarget.style.borderColor = `${P.accent}60`; }} onBlur={e => { e.currentTarget.style.borderColor = P.border; }} />
            </div>
            {items.length > 1 && (
              <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="p-1.5 rounded-full transition-colors" style={{ color: P.textLo }}
                onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = '#f8717115'; }}
                onMouseLeave={e => { e.currentTarget.style.color = P.textLo; e.currentTarget.style.background = 'transparent'; }}>
                <Trash2 size={13} />
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      <button type="button" onClick={() => onChange([...items, ''])} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors" style={{ color: P.accent, background: `${P.accent}08`, border: `1px dashed ${P.accent}30` }}>
        <Plus size={12} /> Add Item
      </button>
    </div>
  );
}

function TagInput({ tags, onChange, suggestions }: { tags: string[]; onChange: (t: string[]) => void; suggestions?: string[] }) {
  const { colors: P } = useTheme();
  const [input, setInput] = useState('');
  const add = (tag: string) => { const t = tag.trim(); if (t && !tags.includes(t)) onChange([...tags, t]); setInput(''); };
  const remove = (tag: string) => onChange(tags.filter(t => t !== tag));
  const filteredSuggestions = suggestions?.filter(s => !tags.includes(s) && s.toLowerCase().includes(input.toLowerCase())) || [];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <AnimatePresence>
          {tags.map(tag => (
            <motion.span key={tag} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: `${P.accent}15`, color: P.accent, border: `1px solid ${P.accent}25` }}>
              {tag}
              <button type="button" onClick={() => remove(tag)}><X size={10} /></button>
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      <div className="relative">
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(input); } }}
          placeholder="Type and press Enter..."
          className="w-full px-3 py-2 rounded-full text-[12px] outline-none transition-all"
          style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi }}
          onFocus={e => { e.currentTarget.style.borderColor = `${P.accent}60`; }}
          onBlur={e => { setTimeout(() => { e.currentTarget.style.borderColor = P.border; }, 200); }} />
        {input && filteredSuggestions.length > 0 && (
          <div className="absolute z-40 w-full mt-1 rounded-xl overflow-hidden max-h-32 overflow-y-auto" style={{ background: P.card, border: `1px solid ${P.borderHi}`, boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }}>
            {filteredSuggestions.slice(0, 5).map(s => (
              <button key={s} type="button" onMouseDown={e => { e.preventDefault(); add(s); }} className="w-full px-3 py-2 text-[12px] text-left transition-colors" style={{ color: P.textMd }}
                onMouseEnter={e => { e.currentTarget.style.background = `${P.accent}10`; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
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
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        <div className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full transition-all shadow-lg" style={{ left: `calc(${pct}% - 10px)`, background: color, border: `2px solid ${P.bg}`, boxShadow: `0 0 12px ${color}50` }} />
      </div>
      <div className="flex justify-between text-[10px]" style={{ color: P.textLo }}>
        <span>{min}{unit}</span>
        <span className="font-bold px-2 py-0.5 rounded-md" style={{ background: `${color}15`, color }}>{value}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

// ─── Modification History Timeline ──────────────────────────────────────────

function ModificationTimeline({ modifications }: { modifications: ModificationEntry[] }) {
  const { colors: P } = useTheme();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <GlassCard className="p-5" glow={`${P.accent}05`}>
      <div className="flex items-center gap-3 mb-5">
        <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: `${P.accent}12`, border: `1px solid ${P.accent}25` }}>
          <History size={16} style={{ color: P.accent }} />
        </div>
        <div>
          <h3 className="text-sm font-bold" style={{ color: P.textHi }}>Modification History</h3>
          <p className="text-[10px]" style={{ color: P.textLo }}>{modifications.length} changes recorded</p>
        </div>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-px" style={{ background: P.border }} />

        <div className="space-y-4">
          {modifications.map((mod, i) => {
            const isExpanded = expandedId === mod.id;
            const date = new Date(mod.date);

            return (
              <motion.div
                key={mod.id}
                variants={stagger(i * 0.08)}
                initial="hidden"
                animate="show"
                className="relative pl-12"
              >
                {/* Timeline dot */}
                <div className="absolute left-3 top-2 h-5 w-5 rounded-full flex items-center justify-center z-10" style={{
                  background: i === 0 ? `${P.accent}20` : P.surface,
                  border: `2px solid ${i === 0 ? P.accent : P.border}`,
                }}>
                  <div className="h-2 w-2 rounded-full" style={{ background: i === 0 ? P.accent : P.textDim }} />
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : mod.id)}
                  className="w-full text-left p-3 rounded-xl transition-all"
                  style={{
                    background: isExpanded ? `${P.accent}06` : 'transparent',
                    border: `1px solid ${isExpanded ? P.accent + '25' : P.border}`,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-bold" style={{ background: `${P.accent}10`, color: P.accent }}>
                        {(mod.user || 'U').charAt(0)}
                      </span>
                      <span className="text-[12px] font-semibold" style={{ color: P.textHi }}>{mod.user || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] tabular-nums" style={{ color: P.textLo }}>{date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md" style={{ background: P.surface, color: P.textDim }}>{date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                      <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown size={12} style={{ color: P.textLo }} />
                      </motion.div>
                    </div>
                  </div>

                  <p className="text-[11px] mb-1" style={{ color: P.textMd }}>{mod.reason}</p>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 pt-2 space-y-1.5 overflow-hidden" style={{ borderTop: `1px solid ${P.border}` }}>
                        {mod.changes.map((change, ci) => (
                          <div key={ci} className="flex items-start gap-2">
                            <div className="mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: P.accent }} />
                            <span className="text-[11px]" style={{ color: P.textMd }}>{change}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
}

// ─── Progress Bar ────────────────────────────────────────────────────────────
function WizardProgress({ currentStep, completedSteps, onStepClick }: { currentStep: number; completedSteps: Set<number>; onStepClick: (step: number) => void }) {
  const { colors: P } = useTheme();
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const isActive = i === currentStep;
        const isCompleted = completedSteps.has(i);
        const isPast = i < currentStep;
        const Icon = step.icon;
        return (
          <React.Fragment key={step.key}>
            <motion.button type="button" onClick={() => onStepClick(i)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-3 py-2 rounded-full transition-all relative cursor-pointer"
              style={{ background: isActive ? `${step.color}15` : 'transparent', border: `1px solid ${isActive ? step.color + '40' : 'transparent'}` }}>
              <div className="h-8 w-8 rounded-xl flex items-center justify-center transition-all" style={{
                background: isCompleted ? `${step.color}20` : isActive ? `${step.color}15` : P.surface,
                border: `1.5px solid ${isCompleted ? step.color : isActive ? step.color + '60' : P.border}`,
              }}>
                {isCompleted ? <Check size={14} style={{ color: step.color }} /> : <Icon size={14} style={{ color: isActive ? step.color : P.textDim }} />}
              </div>
              <div className="hidden lg:block">
                <p className="text-[10px] font-bold" style={{ color: isActive ? step.color : isPast ? P.textMd : P.textLo }}>Step {i + 1}</p>
                <p className="text-[11px] font-semibold whitespace-nowrap" style={{ color: isActive ? P.textHi : P.textLo }}>{step.label}</p>
              </div>
              {isActive && <motion.div layoutId="editActiveStep" className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full" style={{ background: step.color }} />}
            </motion.button>
            {i < STEPS.length - 1 && <div className="flex-1 h-px min-w-[12px] mx-1" style={{ background: isPast || isCompleted ? `${STEPS[i].color}40` : P.border }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function EditProject() {
  const P = useTheme().colors;
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
  });
  const categoryOptions = categoriesData?.data?.items?.map((c: any) => ({ id: c.id, name: c.name })) ?? [];

  const { data: projectData, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectService.getProject(id!),
    enabled: !!id,
  });

  const [formInitialized, setFormInitialized] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [data, setData] = useState<FormData>({
    name: '', category: '', status: 'planning', shortDescription: '', fullDescription: '',
    objectives: [''], expectedOutputs: [''], sdgGoals: [], visionPillars: [], tags: [],
    startDate: '', endDate: '', budget: '', budgetThreshold: 80, delayThreshold: 14,
    qualityThreshold: 3.5, alertsEnabled: true,
    targetGroup: '', expectedCount: '', maleCount: '', femaleCount: '', ageGroup: '', beneficiaryDescription: '',
    governorate: '', district: '', detailedAddress: '', latitude: '', longitude: '', partners: [],
    images: [], documents: [],
    agreedToTerms: false, editReason: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set([0, 1, 2, 3, 4]));
  const [saving, setSaving] = useState(false);
  const [, setShowHistory] = useState(false);
  void setShowHistory;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Populate form data from API response
  useEffect(() => {
    if (projectData?.data && !formInitialized) {
      const p = projectData.data;
      setData({
        name: p.name || '',
        category: p.categoryId || '',
        status: p.status || 'planning',
        shortDescription: p.description || '',
        fullDescription: p.description || '',
        objectives: p.objectives?.length ? p.objectives : [''],
        expectedOutputs: p.expectedOutputs?.length ? p.expectedOutputs : [''],
        sdgGoals: p.sdgGoals || [],
        visionPillars: [],
        tags: p.tags || [],
        startDate: p.startDate ? p.startDate.slice(0, 10) : '',
        endDate: p.endDate ? p.endDate.slice(0, 10) : '',
        budget: p.budget || '',
        budgetThreshold: 80,
        delayThreshold: 14,
        qualityThreshold: 3.5,
        alertsEnabled: true,
        targetGroup: '',
        expectedCount: p.beneficiaryCount || '',
        maleCount: p.beneficiaries?.male || '',
        femaleCount: p.beneficiaries?.female || '',
        ageGroup: '',
        beneficiaryDescription: p.beneficiaries?.description || '',
        governorate: p.region || '',
        district: '',
        detailedAddress: p.location || '',
        latitude: p.latitude || '',
        longitude: p.longitude || '',
        partners: [],
        images: [],
        documents: [],
        agreedToTerms: false,
        editReason: '',
      });
      setFormInitialized(true);
    }
  }, [projectData, formInitialized]);

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const updated = await projectService.updateProject(id!, payload as any);

      for (const img of data.images) {
        const uploaded = await uploadService.upload('media', img.file);
        const mediaUrl = (uploaded as any)?.data?.url;
        if (!mediaUrl) continue;

        await projectService.createProjectMedia(id!, {
          url: mediaUrl,
          type: 'image',
          caption: img.name,
          category: img.category,
        });
      }

      for (const doc of data.documents) {
        const uploaded = await uploadService.upload('documents', doc.file);
        const fileData = (uploaded as any)?.data;
        if (!fileData?.url) continue;

        await projectService.createProjectDocument(id!, {
          name: fileData.originalName || doc.name,
          type: fileData.mimeType || doc.file.type || 'application/octet-stream',
          size: fileData.size || doc.file.size || 0,
          url: fileData.url,
          category: doc.category,
        });
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      toast.success('Project Updated', 'Changes have been saved successfully.');
      navigate(`/projects/${id}`);
    },
    onError: () => {
      toast.error('Error', 'Failed to update project. Please try again.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => projectService.deleteProject(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project Deleted', 'The project has been permanently deleted.');
      navigate('/projects');
    },
  });

  const onChange = useCallback((partial: Partial<FormData>) => {
    setData(prev => ({ ...prev, ...partial }));
    const keys = Object.keys(partial);
    setErrors(prev => { const next = { ...prev }; keys.forEach(k => delete next[k]); return next; });
  }, []);

  const validateStep = useCallback((step: number): boolean => {
    const errs: ValidationErrors = {};
    switch (step) {
      case 0:
        if (!data.name.trim()) errs.name = 'Project name is required';
        if (!data.category) errs.category = 'Please select a category';
        if (!data.shortDescription.trim()) errs.shortDescription = 'Short description is required';
        break;
      case 1:
        if (!data.startDate) errs.startDate = 'Start date is required';
        if (!data.endDate) errs.endDate = 'End date is required';
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
      case 5:
        if (!data.editReason.trim()) errs.editReason = 'Please provide a reason for this modification';
        break;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [data]);

  const goNext = useCallback(() => {
    if (!validateStep(currentStep)) return;
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    setDirection(1);
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep, validateStep]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setCurrentStep(prev => Math.max(prev - 1, 0));
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goToStep = useCallback((step: number) => {
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  }, [currentStep]);

  const handleSave = useCallback(async () => {
    if (!validateStep(5)) return;
    setSaving(true);
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
    updateMutation.mutate(payload, {
      onSettled: () => setSaving(false),
    });
  }, [validateStep, data, updateMutation]);

  // ─── Step 1-4 are shared with AddProject, Step 5 and 6 have edit-specific additions ───
  // For brevity, we reuse the same step component patterns
  const partnersList = [
    'Ministry of Social Development', 'Ministry of Education', 'Ministry of Health',
    'Oman Charitable Organization', 'UNICEF Oman', 'WHO Oman',
    'Shell Oman', 'PDO (Petroleum Development Oman)', 'Bank Muscat',
    'Omantel', 'OQ Group', 'Sohar Aluminium',
  ];

  const targetGroups = [
    { value: 'children', label: 'Children', icon: Baby, color: '#38bdf8' },
    { value: 'youth', label: 'Youth', icon: Zap, color: '#a78bfa' },
    { value: 'adults', label: 'Adults', icon: UserCheck, color: '#34d399' },
    { value: 'elderly', label: 'Elderly', icon: Heart, color: '#fb923c' },
    { value: 'women', label: 'Women', icon: Users, color: '#f472b6' },
    { value: 'disabled', label: 'People with Disabilities', icon: Shield, color: '#E91E63' },
    { value: 'all', label: 'General Public', icon: Globe, color: '#9CA3AF' },
  ];

  const ageGroups = ['0-5', '6-12', '13-17', '18-25', '26-35', '36-50', '51-65', '65+', 'All Ages'];

  const onDropImages = useCallback((accepted: File[]) => {
    const newItems: FileItem[] = accepted.map(file => ({
      id: Math.random().toString(36).slice(2),
      file, preview: URL.createObjectURL(file), category: 'before', name: file.name,
    }));
    onChange({ images: [...data.images, ...newItems] });
  }, [data.images, onChange]);

  const onDropDocs = useCallback((accepted: File[]) => {
    const newItems: FileItem[] = accepted.map(file => ({
      id: Math.random().toString(36).slice(2),
      file, preview: '', category: 'other', name: file.name,
    }));
    onChange({ documents: [...data.documents, ...newItems] });
  }, [data.documents, onChange]);

  const { getRootProps: getImgRootProps, getInputProps: getImgInputProps, isDragActive: imgDragActive } = useDropzone({
    onDrop: onDropImages, accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] }, maxSize: 10 * 1024 * 1024,
  });
  const { getRootProps: getDocRootProps, getInputProps: getDocInputProps, isDragActive: docDragActive } = useDropzone({
    onDrop: onDropDocs, accept: { 'application/pdf': ['.pdf'], 'application/msword': ['.doc'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] }, maxSize: 25 * 1024 * 1024,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080805' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ─── Render Step Content ──────────────────────────────────────────────────
  const renderStep = () => {
    switch (currentStep) {
      case 0: // Basic Info (same as AddProject)
        return (
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${P.accent}15`, border: `1px solid ${P.accent}30` }}>
                <ClipboardList size={18} style={{ color: P.accent }} />
              </div>
              <div>
                <h2 className="text-base font-bold" style={{ color: P.textHi }}>Basic Information</h2>
                <p className="text-[11px]" style={{ color: P.textLo }}>Update the project fundamentals</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <FormField label="Project Name" required error={errors.name} icon={FileText}>
                <TextInput value={data.name} onChange={v => onChange({ name: v })} placeholder="Project name..." icon={FileText} error={!!errors.name} />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Category" required error={errors.category} icon={Layers}>
                  <SelectInput value={data.category} onChange={v => onChange({ category: v })} options={categoryOptions.map(c => ({ value: c.id, label: c.name }))} placeholder="Select category" error={!!errors.category} />
                </FormField>
                <FormField label="Status" required icon={Settings2}>
                  <SelectInput value={data.status} onChange={v => onChange({ status: v })} options={statuses} placeholder="Select status" />
                </FormField>
              </div>
            </div>
            <FormField label="Short Description" required error={errors.shortDescription}>
              <TextInput value={data.shortDescription} onChange={v => onChange({ shortDescription: v })} placeholder="Brief description..." maxLength={200} error={!!errors.shortDescription} />
              <div className="flex justify-end"><span className="text-[10px] tabular-nums" style={{ color: data.shortDescription.length > 180 ? '#fbbf24' : P.textDim }}>{data.shortDescription.length}/200</span></div>
            </FormField>
            <FormField label="Full Description">
              <TextArea value={data.fullDescription} onChange={v => onChange({ fullDescription: v })} placeholder="Detailed description..." rows={4} />
            </FormField>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <FormField label="Objectives" required error={errors.objectives} icon={Target}>
                <DynamicList items={data.objectives} onChange={v => onChange({ objectives: v })} placeholder="e.g., Improve literacy rate by 20%" icon={Target} />
              </FormField>
              <FormField label="Expected Outputs" icon={Award}>
                <DynamicList items={data.expectedOutputs} onChange={v => onChange({ expectedOutputs: v })} placeholder="e.g., 5 renovated classrooms" icon={Award} />
              </FormField>
            </div>
            <FormField label="SDG Goals Alignment" icon={Globe}>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {sdgGoals.map(sdg => {
                  const active = data.sdgGoals.includes(sdg.id);
                  return (
                    <motion.button key={sdg.id} type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => onChange({ sdgGoals: active ? data.sdgGoals.filter(g => g !== sdg.id) : [...data.sdgGoals, sdg.id] })}
                      className="flex flex-col items-center gap-1 p-2 rounded-full text-center transition-all"
                      style={{ background: active ? `${sdg.color}18` : 'transparent', border: `1px solid ${active ? sdg.color + '50' : P.border}` }}>
                      <span className="text-sm font-black" style={{ color: active ? sdg.color : P.textLo }}>{sdg.id}</span>
                      <span className="text-[8px] font-medium leading-tight" style={{ color: active ? sdg.color : P.textDim }}>{sdg.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </FormField>
            <FormField label="Oman Vision 2040 Pillars" icon={Star}>
              <div className="flex flex-wrap gap-2">
                {omanVisionPillars.map(pillar => {
                  const active = data.visionPillars.includes(pillar);
                  return (
                    <button key={pillar} type="button" onClick={() => onChange({ visionPillars: active ? data.visionPillars.filter(p => p !== pillar) : [...data.visionPillars, pillar] })}
                      className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all"
                      style={{ background: active ? `${P.accent}15` : 'transparent', color: active ? P.accent : P.textLo, border: `1px solid ${active ? P.accent + '40' : P.border}` }}>
                      {pillar}
                    </button>
                  );
                })}
              </div>
            </FormField>
            <FormField label="Tags" icon={Tag}>
              <TagInput tags={data.tags} onChange={t => onChange({ tags: t })} suggestions={['SDG', 'Youth', 'Women', 'Health', 'Education', 'Environment', 'Rural', 'Urban', 'Digital', 'Innovation']} />
            </FormField>
          </motion.div>
        );

      case 1: { // Budget & Timeline
        const dateValid = data.startDate && data.endDate && new Date(data.endDate) > new Date(data.startDate);
        const durationDays = dateValid ? Math.ceil((new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
        const durationMonths = Math.round(durationDays / 30.44);
        return (
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.25)' }}>
                <Wallet size={18} style={{ color: '#38bdf8' }} />
              </div>
              <div><h2 className="text-base font-bold" style={{ color: P.textHi }}>Budget & Timeline</h2><p className="text-[11px]" style={{ color: P.textLo }}>Update financial parameters and early warning thresholds</p></div>
            </div>
            <GlassCard className="p-5" glow="rgba(56,189,248,0.05)">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <FormField label="Start Date" required error={errors.startDate} icon={Calendar}><TextInput type="date" value={data.startDate} onChange={v => onChange({ startDate: v })} error={!!errors.startDate} /></FormField>
                <FormField label="End Date" required error={errors.endDate} icon={Calendar}><TextInput type="date" value={data.endDate} onChange={v => onChange({ endDate: v })} error={!!errors.endDate} /></FormField>
                <FormField label="Allocated Budget (OMR)" required error={errors.budget} icon={Wallet}><TextInput type="number" value={data.budget} onChange={v => onChange({ budget: v ? Number(v) : '' })} placeholder="e.g., 150000" error={!!errors.budget} /></FormField>
              </div>
              {dateValid && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: `${P.accent}10`, border: `1px solid ${P.accent}20` }}>
                    <Clock size={12} style={{ color: P.accent }} /><span className="text-[11px] font-medium" style={{ color: P.accent }}>{durationDays} days ({durationMonths} months)</span>
                  </div>
                  {typeof data.budget === 'number' && data.budget > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)' }}>
                      <BarChart3 size={12} style={{ color: '#38bdf8' }} /><span className="text-[11px] font-medium" style={{ color: '#7dd3fc' }}>{(Number(data.budget) / Math.max(durationMonths, 1)).toFixed(0)} OMR/month</span>
                    </div>
                  )}
                </motion.div>
              )}
            </GlassCard>
            <GlassCard className="p-5" glow="rgba(251,191,36,0.05)">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)' }}>
                    <Bell size={16} style={{ color: '#fbbf24' }} />
                  </div>
                  <div><h3 className="text-sm font-bold" style={{ color: P.textHi }}>Early Warning Configuration</h3><p className="text-[10px]" style={{ color: P.textLo }}>Set thresholds for automated risk monitoring</p></div>
                </div>
                <button type="button" onClick={() => onChange({ alertsEnabled: !data.alertsEnabled })}
                  className="relative h-6 w-11 rounded-full transition-all duration-300 cursor-pointer"
                  style={{ background: data.alertsEnabled ? P.accent : P.border }}>
                  <motion.div animate={{ x: data.alertsEnabled ? 20 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="absolute top-1 h-4 w-4 rounded-full" style={{ background: P.textHi }} />
                </button>
              </div>
              <AnimatePresence>
                {data.alertsEnabled && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-5 overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="space-y-2"><div className="flex items-center gap-2 mb-3"><Gauge size={14} style={{ color: '#fb923c' }} /><span className="text-[12px] font-semibold" style={{ color: P.textMd }}>Budget Threshold</span></div><CustomSlider value={data.budgetThreshold} onChange={v => onChange({ budgetThreshold: v })} min={50} max={100} step={5} unit="%" color="#fb923c" /></div>
                      <div className="space-y-2"><div className="flex items-center gap-2 mb-3"><Clock size={14} style={{ color: '#f87171' }} /><span className="text-[12px] font-semibold" style={{ color: P.textMd }}>Delay Threshold</span></div><CustomSlider value={data.delayThreshold} onChange={v => onChange({ delayThreshold: v })} min={3} max={60} step={1} unit=" days" color="#f87171" /></div>
                      <div className="space-y-2"><div className="flex items-center gap-2 mb-3"><Star size={14} style={{ color: '#a78bfa' }} /><span className="text-[12px] font-semibold" style={{ color: P.textMd }}>Quality Threshold</span></div><CustomSlider value={data.qualityThreshold} onChange={v => onChange({ qualityThreshold: v })} min={1} max={5} step={0.5} unit="" color="#a78bfa" /></div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          </motion.div>
        );
      }

      case 2: { // Beneficiaries
        const total = (Number(data.maleCount) || 0) + (Number(data.femaleCount) || 0);
        const malePct = total > 0 ? Math.round((Number(data.maleCount) || 0) / total * 100) : 50;
        const femalePct = 100 - malePct;
        return (
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)' }}>
                <Users size={18} style={{ color: '#a78bfa' }} />
              </div>
              <div><h2 className="text-base font-bold" style={{ color: P.textHi }}>Beneficiaries</h2><p className="text-[11px]" style={{ color: P.textLo }}>Update target population and reach</p></div>
            </div>
            <FormField label="Target Group" required error={errors.targetGroup} icon={Target}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {targetGroups.map(group => {
                  const active = data.targetGroup === group.value;
                  const Icon = group.icon;
                  return (
                    <motion.button key={group.value} type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => onChange({ targetGroup: group.value })}
                      className="flex items-center gap-2 p-3 rounded-xl transition-all"
                      style={{ background: active ? `${group.color}12` : 'transparent', border: `1px solid ${active ? group.color + '40' : P.border}`, color: active ? group.color : P.textLo }}>
                      <Icon size={15} /><span className="text-[11px] font-medium">{group.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </FormField>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <GlassCard className="p-5">
                <h3 className="text-sm font-bold mb-4" style={{ color: P.textHi }}>Population Estimate</h3>
                <div className="space-y-4">
                  <FormField label="Total Expected" required error={errors.expectedCount} icon={Users}><TextInput type="number" value={data.expectedCount} onChange={v => onChange({ expectedCount: v ? Number(v) : '' })} placeholder="e.g., 1200" error={!!errors.expectedCount} /></FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Male" icon={UserCheck}><TextInput type="number" value={data.maleCount} onChange={v => onChange({ maleCount: v ? Number(v) : '' })} placeholder="Male count" /></FormField>
                    <FormField label="Female" icon={Heart}><TextInput type="number" value={data.femaleCount} onChange={v => onChange({ femaleCount: v ? Number(v) : '' })} placeholder="Female count" /></FormField>
                  </div>
                  {total > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 mt-2">
                      <div className="flex justify-between text-[10px]" style={{ color: P.textLo }}><span>Male {malePct}%</span><span>Female {femalePct}%</span></div>
                      <div className="h-3 rounded-full overflow-hidden flex" style={{ background: P.border }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${malePct}%` }} transition={{ duration: 0.6 }} className="h-full rounded-l-full" style={{ background: '#38bdf8' }} />
                        <motion.div initial={{ width: 0 }} animate={{ width: `${femalePct}%` }} transition={{ duration: 0.6, delay: 0.1 }} className="h-full rounded-r-full" style={{ background: '#f472b6' }} />
                      </div>
                    </motion.div>
                  )}
                </div>
              </GlassCard>
              <GlassCard className="p-5">
                <h3 className="text-sm font-bold mb-4" style={{ color: P.textHi }}>Demographics</h3>
                <div className="space-y-4">
                  <FormField label="Age Group" icon={Baby}>
                    <div className="flex flex-wrap gap-1.5">
                      {ageGroups.map(ag => {
                        const active = data.ageGroup === ag;
                        return (
                          <button key={ag} type="button" onClick={() => onChange({ ageGroup: ag })} className="px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all"
                            style={{ background: active ? `${P.accent}15` : 'transparent', color: active ? P.accent : P.textLo, border: `1px solid ${active ? P.accent + '40' : P.border}` }}>{ag}</button>
                        );
                      })}
                    </div>
                  </FormField>
                  <FormField label="Description"><TextArea value={data.beneficiaryDescription} onChange={v => onChange({ beneficiaryDescription: v })} placeholder="Describe the beneficiaries..." rows={4} /></FormField>
                </div>
              </GlassCard>
            </div>
          </motion.div>
        );
      }

      case 3: { // Location
        const selectedGov = governorates.find(g => g.name === data.governorate);
        const districts = selectedGov?.districts || [];
        return (
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)' }}>
                <MapPin size={18} style={{ color: '#34d399' }} />
              </div>
              <div><h2 className="text-base font-bold" style={{ color: P.textHi }}>Location & Partners</h2><p className="text-[11px]" style={{ color: P.textLo }}>Update project location and collaborating partners</p></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <GlassCard className="p-5">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: P.textHi }}><Globe size={14} style={{ color: '#34d399' }} /> Project Location</h3>
                <div className="space-y-4">
                  <FormField label="Governorate" required error={errors.governorate} icon={MapPin}><SelectInput value={data.governorate} onChange={v => { onChange({ governorate: v, district: '' }); }} options={governorates.map(g => ({ value: g.name, label: g.name }))} placeholder="Select governorate" error={!!errors.governorate} /></FormField>
                  <FormField label="District / Wilayat" required error={errors.district}><SelectInput value={data.district} onChange={v => onChange({ district: v })} options={districts.map(d => ({ value: d, label: d }))} placeholder={data.governorate ? 'Select district' : 'Select governorate first'} error={!!errors.district} /></FormField>
                  <FormField label="Detailed Address"><TextArea value={data.detailedAddress} onChange={v => onChange({ detailedAddress: v })} placeholder="Street, building, or landmark..." rows={2} /></FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Latitude"><TextInput type="number" value={data.latitude} onChange={v => onChange({ latitude: v ? Number(v) : '' })} placeholder="e.g., 23.5880" /></FormField>
                    <FormField label="Longitude"><TextInput type="number" value={data.longitude} onChange={v => onChange({ longitude: v ? Number(v) : '' })} placeholder="e.g., 58.3829" /></FormField>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-5">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: P.textHi }}><Building2 size={14} style={{ color: '#a78bfa' }} /> Partners</h3>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: `${P.border} transparent` }}>
                  {partnersList.map(partner => {
                    const active = data.partners.includes(partner);
                    return (
                      <button key={partner} type="button" onClick={() => onChange({ partners: active ? data.partners.filter(p => p !== partner) : [...data.partners, partner] })}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-full text-[11px] text-left transition-all"
                        style={{ background: active ? `${P.accent}10` : 'transparent', color: active ? P.accent : P.textMd, border: `1px solid ${active ? P.accent + '30' : 'transparent'}` }}>
                        <Building2 size={12} style={{ color: active ? P.accent : P.textDim }} />{partner}
                        {active && <CheckCircle2 size={12} className="ml-auto" style={{ color: P.accent }} />}
                      </button>
                    );
                  })}
                </div>
              </GlassCard>
            </div>
          </motion.div>
        );
      }

      case 4: // Media
        return (
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.25)' }}>
                <Camera size={18} style={{ color: '#fb923c' }} />
              </div>
              <div><h2 className="text-base font-bold" style={{ color: P.textHi }}>Media & Documents</h2><p className="text-[11px]" style={{ color: P.textLo }}>Update project images and documents</p></div>
            </div>
            <GlassCard className="p-5">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-4" style={{ color: P.textHi }}><Image size={14} style={{ color: '#fb923c' }} /> Project Images</h3>
              <div {...getImgRootProps()} className="cursor-pointer">
                <input {...getImgInputProps()} />
                <motion.div animate={{ borderColor: imgDragActive ? P.accent : P.border }} className="flex flex-col items-center justify-center py-8 rounded-xl" style={{ border: `2px dashed ${P.border}` }}>
                  <Upload size={20} style={{ color: '#fb923c' }} />
                  <p className="text-[12px] mt-2" style={{ color: P.textMd }}>{imgDragActive ? 'Drop images here...' : 'Drag & drop or click to browse'}</p>
                </motion.div>
              </div>
              {data.images.length > 0 && (
                <div className="grid grid-cols-3 lg:grid-cols-4 gap-2 mt-3">
                  {data.images.map(img => (
                    <div key={img.id} className="relative group rounded-lg overflow-hidden" style={{ border: `1px solid ${P.border}` }}>
                      <img src={img.preview} alt={img.name} className="w-full h-24 object-cover" />
                      <button type="button" onClick={() => { URL.revokeObjectURL(img.preview); onChange({ images: data.images.filter(i => i.id !== img.id) }); }}
                        className="absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-all" style={{ background: '#f87171e0' }}><X size={10} style={{ color: '#fff' }} /></button>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
            <GlassCard className="p-5">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-4" style={{ color: P.textHi }}><FileText size={14} style={{ color: '#38bdf8' }} /> Documents</h3>
              <div {...getDocRootProps()} className="cursor-pointer">
                <input {...getDocInputProps()} />
                <motion.div animate={{ borderColor: docDragActive ? '#38bdf8' : P.border }} className="flex flex-col items-center justify-center py-8 rounded-xl" style={{ border: `2px dashed ${P.border}` }}>
                  <Paperclip size={20} style={{ color: '#38bdf8' }} />
                  <p className="text-[12px] mt-2" style={{ color: P.textMd }}>{docDragActive ? 'Drop files here...' : 'Drag & drop or click to browse'}</p>
                </motion.div>
              </div>
              {data.documents.length > 0 && (
                <div className="space-y-2 mt-3">
                  {data.documents.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                      <FileText size={14} style={{ color: '#38bdf8' }} />
                      <span className="flex-1 text-[12px] truncate" style={{ color: P.textHi }}>{doc.name}</span>
                      <button type="button" onClick={() => onChange({ documents: data.documents.filter(d => d.id !== doc.id) })} className="p-1 rounded transition-colors" style={{ color: P.textLo }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; }} onMouseLeave={e => { e.currentTarget.style.color = P.textLo; }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>
        );

      case 5: { // Review + Edit Reason + History
        const sections = [
          { title: 'Basic Info', icon: ClipboardList, color: '#E91E63', items: [
            { label: 'Name', value: data.name }, { label: 'Category', value: data.category }, { label: 'Status', value: data.status },
          ]},
          { title: 'Budget', icon: Wallet, color: '#38bdf8', items: [
            { label: 'Start', value: data.startDate || 'Not set' }, { label: 'End', value: data.endDate || 'Not set' },
            { label: 'Budget', value: data.budget ? `${Number(data.budget).toLocaleString()} OMR` : 'Not set' },
          ]},
          { title: 'Beneficiaries', icon: Users, color: '#a78bfa', items: [
            { label: 'Target', value: data.targetGroup || 'Not set' }, { label: 'Count', value: data.expectedCount ? Number(data.expectedCount).toLocaleString() : 'Not set' },
          ]},
          { title: 'Location', icon: MapPin, color: '#34d399', items: [
            { label: 'Location', value: [data.governorate, data.district].filter(Boolean).join(', ') || 'Not set' },
            { label: 'Partners', value: data.partners.length > 0 ? `${data.partners.length} partner(s)` : 'None' },
          ]},
        ];

        return (
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(244,114,182,0.12)', border: '1px solid rgba(244,114,182,0.25)' }}>
                <Eye size={18} style={{ color: '#f472b6' }} />
              </div>
              <div><h2 className="text-base font-bold" style={{ color: P.textHi }}>Review Changes</h2><p className="text-[11px]" style={{ color: P.textLo }}>Review modifications and provide a reason for changes</p></div>
            </div>

            {/* Edit Reason (Required) */}
            <GlassCard className="p-5" glow="rgba(251,191,36,0.05)">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={14} style={{ color: '#fbbf24' }} />
                <h3 className="text-sm font-bold" style={{ color: P.textHi }}>Reason for Modification</h3>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#f8717120', color: '#f87171' }}>Required</span>
              </div>
              <TextArea value={data.editReason} onChange={v => onChange({ editReason: v })} placeholder="Explain the reason for these changes (e.g., scope expansion, budget adjustment, stakeholder request)..." rows={3} error={!!errors.editReason} />
              {errors.editReason && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 text-[11px] mt-1" style={{ color: '#f87171' }}>
                  <AlertTriangle size={10} /> {errors.editReason}
                </motion.p>
              )}
            </GlassCard>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {sections.map((section, i) => {
                const Icon = section.icon;
                return (
                  <motion.div key={section.title} variants={stagger(i * 0.08)} initial="hidden" animate="show">
                    <GlassCard className="p-4 h-full">
                      <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: `1px solid ${P.border}` }}>
                        <div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: `${section.color}12`, border: `1px solid ${section.color}25` }}>
                          <Icon size={11} style={{ color: section.color }} />
                        </div>
                        <h4 className="text-[11px] font-bold" style={{ color: P.textHi }}>{section.title}</h4>
                      </div>
                      <div className="space-y-1.5">
                        {section.items.map(item => (
                          <div key={item.label} className="flex justify-between gap-2">
                            <span className="text-[10px]" style={{ color: P.textLo }}>{item.label}</span>
                            <span className="text-[10px] font-medium text-right truncate" style={{ color: item.value === 'Not set' || item.value === 'None' ? P.textDim : P.textMd, maxWidth: '55%' }}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>

            {/* Modification History */}
            <ModificationTimeline modifications={
              (projectData?.data?.activities || []).map((a: any) => ({
                id: a.id,
                date: a.createdAt,
                user: a.userName || 'Unknown',
                changes: [a.description || a.action],
                reason: a.action || '',
              }))
            } />

            {/* Terms */}
            <GlassCard className="p-5">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="mt-0.5">
                  <input type="checkbox" checked={data.agreedToTerms} onChange={e => onChange({ agreedToTerms: e.target.checked })} className="sr-only" />
                  <div className="h-5 w-5 rounded-md flex items-center justify-center transition-all" style={{ background: data.agreedToTerms ? P.accent : 'transparent', border: `2px solid ${data.agreedToTerms ? P.accent : P.border}` }}>
                    {data.agreedToTerms && <Check size={12} style={{ color: P.bg }} />}
                  </div>
                </div>
                <div>
                  <p className="text-[12px] font-medium" style={{ color: P.textHi }}>I confirm these modifications are accurate and authorized</p>
                  <p className="text-[10px] mt-0.5" style={{ color: P.textLo }}>All changes will be logged in the project audit trail.</p>
                </div>
              </label>
            </GlassCard>
          </motion.div>
        );
      }

      default: return null;
    }
  };

  return (
    <div className="min-h-full" style={{ background: P.bg, fontFamily: 'Inter, sans-serif' }}>
      <div className="fixed inset-0 pointer-events-none opacity-[0.015]" style={{ backgroundImage: `radial-gradient(${P.accent} 0.5px, transparent 0.5px)`, backgroundSize: '24px 24px' }} />

      <div className="relative max-w-[1200px] mx-auto px-6 py-5" ref={containerRef}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => { toast.info('Cancelled', 'No changes were saved.'); navigate(`/projects/${id}`); }}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors"
                style={{ border: `1px solid ${P.border}`, color: P.textMd, background: P.surface }}
              >
                <ArrowLeft size={16} />
                Back to Project
              </motion.button>
              <div>
                <h1 className="text-lg font-black flex items-center gap-2" style={{ color: P.textHi }}>
                  <Edit3 size={18} style={{ color: '#38bdf8' }} />
                  Edit Project: <span style={{ color: P.accent }}>{data.name}</span>
                </h1>
                <p className="text-[11px]" style={{ color: P.textLo }}>ID: {id} — Last updated: Feb 20, 2026</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => { toast.info('Cancelled', 'No changes were saved.'); navigate(`/projects/${id}`); }}
                className="px-4 py-2 rounded-full text-[12px] font-medium transition-colors"
                style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textMd }}
              >
                Cancel
              </motion.button>
              <button type="button" onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 rounded-full text-[12px] font-medium transition-colors" style={{ background: '#f8717112', border: `1px solid #f8717130`, color: '#f87171' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f8717120'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f8717112'; }}>
                <span className="flex items-center gap-1.5"><Trash2 size={12} /> Delete</span>
              </button>
            </div>
          </div>

          <GlassCard className="px-4 py-3">
            <WizardProgress currentStep={currentStep} completedSteps={completedSteps} onStepClick={goToStep} />
          </GlassCard>
        </motion.div>

        {/* Step Content */}
        <div className="min-h-[500px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={currentStep} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35, ease: EASE }}>
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-8 mb-6">
          <GlassCard className="px-5 py-4">
            <div className="flex items-center justify-between">
              <button type="button" onClick={goPrev} disabled={currentStep === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[12px] font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textMd }}>
                <ArrowLeft size={14} /> Previous
              </button>
              <div className="text-[11px]" style={{ color: P.textDim }}>Step {currentStep + 1} of {STEPS.length}</div>
              {currentStep < STEPS.length - 1 ? (
                <motion.button type="button" onClick={goNext} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[12px] font-bold transition-all"
                  style={{ background: `${P.accent}20`, color: P.accent, border: `1px solid ${P.accent}40` }}>
                  Next Step <ArrowRight size={14} />
                </motion.button>
              ) : (
                <motion.button type="button" onClick={handleSave} disabled={!data.agreedToTerms || !data.editReason.trim() || saving}
                  whileHover={{ scale: data.agreedToTerms && data.editReason.trim() ? 1.02 : 1 }} whileTap={{ scale: data.agreedToTerms && data.editReason.trim() ? 0.98 : 1 }}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full text-[12px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: data.agreedToTerms && data.editReason.trim() ? '#38bdf8' : P.border, color: data.agreedToTerms && data.editReason.trim() ? '#082f49' : P.textDim }}>
                  {saving ? (
                    <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><Settings2 size={14} /></motion.div>Saving...</>
                  ) : (
                    <><Save size={14} /> Save Changes</>
                  )}
                </motion.button>
              )}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setShowDeleteConfirm(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <GlassCard className="p-6 max-w-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ background: '#f8717115', border: '1px solid #f8717130' }}>
                    <AlertTriangle size={22} style={{ color: '#f87171' }} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold" style={{ color: P.textHi }}>Delete Project?</h3>
                    <p className="text-[11px]" style={{ color: P.textLo }}>This action cannot be undone</p>
                  </div>
                </div>
                <p className="text-[13px] mb-6" style={{ color: P.textMd }}>Are you sure you want to permanently delete "<strong style={{ color: P.textHi }}>{data.name}</strong>"? All data, media, and history will be lost.</p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 rounded-full text-[12px] font-medium" style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textMd }}>Cancel</button>
                  <button type="button" onClick={() => { setShowDeleteConfirm(false); deleteMutation.mutate(); }} className="flex-1 py-2.5 rounded-full text-[12px] font-bold" style={{ background: '#f87171', color: '#fff' }}>
                    <span className="flex items-center justify-center gap-1.5"><Trash2 size={12} /> Delete Project</span>
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
