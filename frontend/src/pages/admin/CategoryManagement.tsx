import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import NumberFlow from '../../components/ui/NumberFlowSafe';
import Tilt from 'react-parallax-tilt';
import {
  Tags, GraduationCap, Heart, Leaf, Building2, Users, Cpu,
  Plus, Edit3, Trash2, Search, X, Eye, FolderKanban, Wallet,
  TrendingUp, TrendingDown, BarChart3, Target, Activity,
  Droplets, Briefcase, Globe, BookOpen, Hammer,
  ShieldCheck, Megaphone, Sparkles, CheckCircle2, AlertTriangle,
  Calendar, Award, Shield, Layers, Clock, Star, Crown, Medal, Trophy,
  ChevronDown, Filter, Gauge, MapPin, ChevronRight, Check,
  ArrowUpRight, Info, MoreHorizontal, Zap, PanelLeftClose, PanelLeft,
  FileSpreadsheet, FileText, Printer,
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart as RechartsBar,
  Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  AreaChart, Area, RadialBarChart, RadialBar, PolarRadiusAxis,
} from 'recharts';
import { cn } from '../../utils/cn.ts';
import { formatOMR, formatNumber } from '../../utils/formatters.ts';
import { SDG_GOALS } from '../../utils/constants.ts';
import { useTheme } from '../../hooks/useTheme';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryService } from '../../services/categoryService';
import { useToast } from '../../components/common/Toast';
import { exportToExcel, printTable, type ExportColumn } from '../../utils/exportUtils';
import { generateCategoryManagementPDF } from '../../utils/pdfReportGenerator';
import { Button } from '../../components/ui/Button';

// ─── Oman Governorates ──────────────────────────────────────────────────────
const OMAN_REGIONS = [
  'Muscat', 'Dhofar', 'Musandam', 'Al Buraimi', 'Ad Dakhiliyah',
  'Al Batinah North', 'Al Batinah South', 'Ash Sharqiyah North',
  'Ash Sharqiyah South', 'Ad Dhahirah', 'Al Wusta',
];

// ─── Palette ─────────────────────────────────────────────────────────────────


// ─── Motion ─────────────────────────────────────────────────────────────────
const spring = { type: 'spring' as const, stiffness: 400, damping: 30 };
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ─── Icons ──────────────────────────────────────────────────────────────────
const ICON_MAP = {
  GraduationCap, Heart, Leaf, Building2, Users, Cpu, Droplets, Briefcase,
  Globe, BookOpen, Hammer, ShieldCheck, Megaphone, Sparkles, Star, Shield,
} as const;
type IconName = keyof typeof ICON_MAP;
const iconNames = Object.keys(ICON_MAP) as IconName[];

const COLOR_OPTIONS = [
  '#E91E63', '#38bdf8', '#34d399', '#fbbf24', '#a78bfa', '#f87171',
  '#fb923c', '#f472b6', '#22d3ee', '#84cc16', '#e879f9', '#2dd4bf',
];

const statusCfg = {
  active: { dot: '#34d399', bg: 'rgba(52,211,153,0.08)', text: '#6ee7b7', label: 'Active' },
  inactive: { dot: '#9CA3AF', bg: 'rgba(156,163,175,0.08)', text: '#8a8668', label: 'Inactive' },
};

const riskColor = { low: '#34d399', medium: '#fbbf24', high: '#fb923c' } as const;

// ─── Types ──────────────────────────────────────────────────────────────────
interface Category {
  id: string; name: string; nameAr: string; description: string; icon: IconName;
  color: string; status: 'active' | 'inactive'; projectCount: number; activeProjects: number;
  completedProjects: number; totalBudget: number; spentBudget: number; beneficiaries: number;
  createdAt: string; sdgAlignment: number[]; impactScore: number; riskLevel: 'low' | 'medium' | 'high';
  regions: string[]; trend: number[]; partners: number; satisfaction: number; rank: number;
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── Helpers ────────────────────────────────────────────────────────────────
function Tip({ active, payload, label, suffix = '' }: { active?: boolean; payload?: { name?: string; value?: number; color?: string }[]; label?: string | number; suffix?: string }) {
  const { colors: P } = useTheme();
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 shadow-2xl" style={{ background: 'rgba(255,255,255,0.95)', border: `1px solid ${P.borderHi}` }}>
      <p className="mb-1.5 text-[9px] font-semibold tracking-widest uppercase" style={{ color: P.textLo }}>{label}</p>
      {payload.map((e, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: e.color }} />
          <span style={{ color: P.textMd }}>{e.name}:</span>
          <span className="font-bold tabular-nums" style={{ color: P.textHi }}>{Number(e.value ?? 0).toLocaleString()}{suffix}</span>
        </div>
      ))}
    </div>
  );
}

function DonutProgress({ value, size = 56, stroke = 5, color }: { value: number; size?: number; stroke?: number; color: string }) {
  const { colors: P } = useTheme();
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r, off = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={P.border} strokeWidth={stroke} />
      <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circ} initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: off }} transition={{ duration: 1, ease: EASE }} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MAIN PAGE — SIDEBAR + CONTENT LAYOUT ─────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function CategoryManagement() {
  const P = useTheme().colors;
  const navigate = useNavigate();
  const toast = useToast();

  // API queries
  const queryClient = useQueryClient();
  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
    staleTime: 60 * 1000,
  });
  const { data: categoryStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['category-stats'],
    queryFn: () => categoryService.getCategoryStats(),
    staleTime: 5 * 60 * 1000,
  });
  const createMutation = useMutation({
    mutationFn: (data: Partial<Category>) => categoryService.createCategory(data as any),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories'] }); queryClient.invalidateQueries({ queryKey: ['category-stats'] }); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) => categoryService.updateCategory(id, data as any),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories'] }); queryClient.invalidateQueries({ queryKey: ['category-stats'] }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoryService.deleteCategory(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories'] }); queryClient.invalidateQueries({ queryKey: ['category-stats'] }); },
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Category | null>(null);

  // Sync API data into local state when it arrives - NO MOCK DATA
  useEffect(() => {
    // Prioritize categoryStats (has budget/trend data) over categoriesData (basic info only)
    const statsItems = (categoryStats as any)?.data?.items || (categoryStats as any)?.data;
    const regularItems = (categoriesData as any)?.data?.items || (categoriesData as any)?.data;
    
    // Use stats if available (has detailed budget/spending info), otherwise fall back to basic data
    const items = Array.isArray(statsItems) && statsItems.length > 0 ? statsItems : regularItems;

    if (Array.isArray(items) && items.length > 0) {
      const mapped: Category[] = items.map((c: any, idx: number) => ({
        id: c.id || String(idx),
        name: c.name || '',
        nameAr: c.nameAr || c.name_ar || c.name || '',
        description: c.description || '',
        icon: (c.icon && ICON_MAP[c.icon as IconName]) ? c.icon : 'GraduationCap',
        color: c.color || COLOR_OPTIONS[idx % COLOR_OPTIONS.length],
        status: c.status || 'active',
        projectCount: c.projectCount || c.project_count || 0,
        activeProjects: c.activeProjects || c.active_projects || 0,
        completedProjects: c.completedProjects || c.completed_projects || 0,
        // Use calculated totalBudget from projects, NOT category's own budget field
        totalBudget: c.totalBudget ?? c.total_budget ?? 0,
        spentBudget: c.spentBudget ?? c.spent_budget ?? c.totalSpent ?? 0,
        beneficiaries: c.beneficiaries || 0,
        createdAt: c.createdAt || c.created_at || new Date().toISOString(),
        sdgAlignment: c.sdgGoals || c.sdgAlignment || c.sdg_alignment || c.sdg_goals || [],
        impactScore: c.impactScore || c.impact_score || (c.avgRating ? Math.round(c.avgRating * 20) : 0),
        riskLevel: c.riskLevel || c.risk_level || 'low',
        regions: Array.isArray(c.regions) ? c.regions : [],
        // Use API trend data, or zeros if not available (no fake data)
        trend: Array.isArray(c.trend) ? c.trend : Array(12).fill(0),
        partners: c.partners || c.partner_count || 0,
        satisfaction: c.satisfaction || (c.avgRating ? Math.round(c.avgRating * 20) : 0),
        rank: c.rank || idx + 1,
      }));
      setCategories(mapped);
      if (!selected || !mapped.find(c => c.id === selected.id)) {
        setSelected(mapped[0] || null);
      }
    }
  }, [categoriesData, categoryStats]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modalCategory, setModalCategory] = useState<Category | null | 'new'>(null);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);
  const [detailTab, setDetailTab] = useState<'dashboard' | 'analytics' | 'settings'>('dashboard');

  const filtered = useMemo(() => {
    return categories.filter(c => {
      const ms = c.name.toLowerCase().includes(search.toLowerCase()) || c.nameAr.includes(search);
      const sf = statusFilter === 'all' || c.status === statusFilter;
      return ms && sf;
    });
  }, [categories, search, statusFilter]);

  const totals = useMemo(() => ({
    projects: categories.reduce((s, c) => s + c.projectCount, 0),
    budget: categories.reduce((s, c) => s + c.totalBudget, 0),
    spent: categories.reduce((s, c) => s + c.spentBudget, 0),
    beneficiaries: categories.reduce((s, c) => s + c.beneficiaries, 0),
    activeCategories: categories.filter(c => c.status === 'active').length,
    avgImpact: Math.round(categories.reduce((s, c) => s + c.impactScore, 0) / categories.length),
  }), [categories]);

  // Export columns definition
  const categoryExportColumns: ExportColumn[] = useMemo(() => [
    { key: 'name', header: 'Category Name' },
    { key: 'nameAr', header: 'Arabic Name' },
    { key: 'status', header: 'Status' },
    { key: 'projectCount', header: 'Projects', format: 'number' },
    { key: 'activeProjects', header: 'Active Projects', format: 'number' },
    { key: 'totalBudget', header: 'Budget (OMR)', format: 'number' },
    { key: 'spentBudget', header: 'Spent (OMR)', format: 'number' },
    { key: 'beneficiaries', header: 'Beneficiaries', format: 'number' },
    { key: 'impactScore', header: 'Impact Score' },
    { key: 'riskLevel', header: 'Risk Level' },
    { key: 'partners', header: 'Partners', format: 'number' },
    { key: 'regions', header: 'Regions' },
    { key: 'createdAt', header: 'Created', format: 'date' },
  ], []);

  // Get data for export
  const getExportData = useCallback(() => {
    return categories.map(c => ({
      name: c.name,
      nameAr: c.nameAr,
      status: c.status.charAt(0).toUpperCase() + c.status.slice(1),
      projectCount: c.projectCount,
      activeProjects: c.activeProjects,
      totalBudget: c.totalBudget,
      spentBudget: c.spentBudget,
      beneficiaries: c.beneficiaries,
      impactScore: c.impactScore,
      riskLevel: c.riskLevel.charAt(0).toUpperCase() + c.riskLevel.slice(1),
      partners: c.partners,
      regions: Array.isArray(c.regions) ? c.regions.join(', ') : '',
      createdAt: c.createdAt,
    }));
  }, [categories]);

  // Export handlers
  const handleExportExcel = useCallback(() => {
    const data = getExportData();
    exportToExcel(data, {
      filename: `Categories_Export_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Categories',
      columns: categoryExportColumns,
      title: 'Category Management Report',
    });
  }, [getExportData, categoryExportColumns]);

  const handleExportPDF = useCallback(() => {
    generateCategoryManagementPDF({
      kpis: [
        { label: 'Total Categories', value: categories.length, format: 'number' },
        { label: 'Active', value: totals.activeCategories, format: 'number' },
        { label: 'Total Projects', value: totals.projects, format: 'number' },
        { label: 'Total Budget', value: totals.budget, format: 'currency' },
        { label: 'Beneficiaries', value: totals.beneficiaries, format: 'number' },
      ],
      categories: categories.map(c => ({
        name: c.name,
        status: c.status.charAt(0).toUpperCase() + c.status.slice(1),
        projectCount: c.projectCount,
        activeProjects: c.activeProjects,
        totalBudget: c.totalBudget,
        spentBudget: c.spentBudget,
        beneficiaries: c.beneficiaries,
        impactScore: c.impactScore,
        riskLevel: c.riskLevel.charAt(0).toUpperCase() + c.riskLevel.slice(1),
      })),
    });
  }, [categories, totals]);

  const handlePrint = useCallback(() => {
    const data = getExportData();
    printTable(data, categoryExportColumns.slice(0, 8), 'Category Management Report');
  }, [getExportData, categoryExportColumns]);

  const handleSave = useCallback((data: Partial<Category>) => {
    // Map frontend field names to backend-expected names
    const apiData: Record<string, unknown> = {
      name: data.name,
      description: data.description,
      icon: data.icon,
      color: data.color,
      budget: data.totalBudget ?? 0,
      sdgGoals: data.sdgAlignment ?? [],
      regions: data.regions ?? [],
    };

    if (modalCategory === 'new') {
      createMutation.mutate(apiData as any, {
        onSuccess: () => {
          toast.success('Category Added', 'The category was saved successfully.');
          setModalCategory(null);
        },
        onError: () => {
          toast.error('Error', 'Failed to create category. Please try again.');
        },
      });
    } else if (modalCategory && modalCategory !== 'new') {
      updateMutation.mutate({ id: (modalCategory as Category).id, data: apiData as any }, {
        onSuccess: () => {
          toast.success('Category Updated', 'The category changes were saved successfully.');
          setModalCategory(null);
        },
        onError: () => {
          toast.error('Error', 'Failed to update category. Please try again.');
        },
      });
    }
  }, [modalCategory, createMutation, toast, updateMutation]);

  const handleDelete = useCallback(() => {
    if (deleteCategory) {
      deleteMutation.mutate(deleteCategory.id, {
        onSuccess: () => {
          toast.success('Category Deleted', 'The category was deleted successfully.');
          setDeleteCategory(null);
        },
        onError: () => {
          toast.error('Error', 'Failed to delete category. Please try again.');
        },
      });
    }
  }, [deleteCategory, deleteMutation, toast]);

  // Sync selected with latest categories data
  const currentSelected = useMemo(() => {
    if (!selected) return null;
    return categories.find(c => c.id === selected.id) ?? selected;
  }, [categories, selected]);

  const isLoading = isLoadingCategories || isLoadingStats;

  return (
    <div className="h-full flex" style={{ background: P.bg, fontFamily: 'Inter, sans-serif' }}>
      {/* Background mesh gradient */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 0% 0%, ${currentSelected?.color || P.accent}04 0%, transparent 50%), radial-gradient(ellipse at 100% 100%, ${P.accent}03 0%, transparent 50%)` }} />

      {/* ═══ SIDEBAR ══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }} animate={{ width: 288, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="relative flex-shrink-0 flex flex-col h-full overflow-hidden"
            style={{ background: `${P.surface}ee`, borderRight: `1px solid ${P.border}`, backdropFilter: 'blur(20px)' }}>

            {/* Sidebar header */}
            <div className="px-4 pt-5 pb-3">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: `${P.accent}15`, border: `1px solid ${P.accent}25` }}>
                    <Tags size={14} style={{ color: P.accent }} />
                  </div>
                  <div>
                    <h1 className="text-sm font-bold" style={{ color: P.textHi }}>Categories</h1>
                    <p className="text-[10px]" style={{ color: P.textLo }}>{categories.length} total</p>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-full transition-colors" style={{ color: P.textLo }}
                  onMouseEnter={e => (e.currentTarget.style.color = P.textMd)} onMouseLeave={e => (e.currentTarget.style.color = P.textLo)}>
                  <PanelLeftClose size={14} />
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: P.textDim }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-xs outline-none transition-colors"
                  style={{ background: P.card, border: `1px solid ${P.border}`, color: P.textHi }}
                  onFocus={e => (e.currentTarget.style.borderColor = P.accent)} onBlur={e => (e.currentTarget.style.borderColor = P.border)} />
                {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: P.textDim }}><X size={11} /></button>}
              </div>

              {/* Status filter pills */}
              <div className="flex gap-1">
                {(['all', 'active', 'inactive'] as const).map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className="flex-1 py-1.5 rounded-md text-[10px] font-medium capitalize transition-all"
                    style={{ background: statusFilter === s ? `${P.accent}12` : 'transparent', color: statusFilter === s ? P.accent : P.textLo, border: `1px solid ${statusFilter === s ? P.accent + '30' : 'transparent'}` }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Category list */}
            <div className="flex-1 overflow-y-auto px-2 pb-2" style={{ scrollbarWidth: 'thin', scrollbarColor: `${P.border} transparent` }}>
              <div className="space-y-0.5">
                {filtered.map(cat => {
                  const Icon = ICON_MAP[cat.icon];
                  const isSel = currentSelected?.id === cat.id;
                  const st = statusCfg[cat.status];
                  return (
                    <motion.button key={cat.id} onClick={() => { setSelected(cat); setDetailTab('dashboard'); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-full text-left transition-all relative"
                      style={{ background: isSel ? `${cat.color}08` : 'transparent' }}
                      whileHover={{ x: isSel ? 0 : 3 }} transition={spring}>
                      {/* Left accent */}
                      {isSel && (
                        <motion.div layoutId="sidebar-cat-active" className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
                          style={{ background: cat.color, boxShadow: `0 0 8px ${cat.color}60` }} transition={spring} />
                      )}
                      <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                        style={{ background: `${cat.color}${isSel ? '18' : '0a'}`, border: `1px solid ${cat.color}${isSel ? '30' : '15'}` }}>
                        <Icon size={14} style={{ color: cat.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold truncate" style={{ color: isSel ? P.textHi : P.textMd }}>{cat.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="h-1 w-1 rounded-full" style={{ background: st.dot }} />
                          <span className="text-[9px]" style={{ color: P.textLo }}>{cat.projectCount} projects</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[11px] font-black tabular-nums" style={{ color: isSel ? cat.color : P.textLo }}>{cat.impactScore}%</p>
                        <p className="text-[8px] tracking-wider uppercase" style={{ color: P.textDim }}>impact</p>
                      </div>
                    </motion.button>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="text-center py-8">
                    <Search size={20} className="mx-auto mb-2" style={{ color: P.textDim }} />
                    <p className="text-xs" style={{ color: P.textLo }}>No categories match</p>
                  </div>
                )}
              </div>
            </div>

            {/* Add button */}
            <div className="px-3 py-3" style={{ borderTop: `1px solid ${P.border}` }}>
              <Button
                size="sm"
                leftIcon={<Plus size={14} />}
                onClick={() => setModalCategory('new')}
                className="w-full justify-center"
              >
                New Category
              </Button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ═══ MAIN CONTENT ═════════════════════════════════════════════════════ */}
      <main className="flex-1 overflow-y-auto relative" style={{ scrollbarWidth: 'thin', scrollbarColor: `${P.border} transparent` }}>
        {!currentSelected ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Tags size={32} style={{ color: P.textDim }} className="mx-auto mb-3" />
              <p className="text-sm" style={{ color: P.textLo }}>Select a category to view details</p>
            </div>
          </div>
        ) : (
        <div className="px-6 py-5 max-w-[1400px] mx-auto space-y-5">

          {/* Top bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <motion.button initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-full" style={{ color: P.textLo, background: P.surface, border: `1px solid ${P.border}` }}>
                  <PanelLeft size={15} />
                </motion.button>
              )}
              <div>
                <h1 className="text-xl font-black tracking-tight" style={{ color: P.textHi, fontFamily: 'Playfair Display, serif' }}>
                  Category Management
                </h1>
                <p className="text-[11px] mt-0.5" style={{ color: P.textLo }}>
                  {totals.activeCategories} active categories &middot; {totals.projects} projects &middot; {formatOMR(totals.budget)} total budget
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Export buttons */}
              <div className="flex items-center gap-1.5">
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleExportExcel}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-medium"
                  style={{ background: P.surface, color: P.textMd, border: `1px solid ${P.border}` }}>
                  <FileSpreadsheet size={13} />Excel
                </motion.button>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleExportPDF}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-medium"
                  style={{ background: P.surface, color: P.textMd, border: `1px solid ${P.border}` }}>
                  <FileText size={13} />PDF
                </motion.button>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-medium"
                  style={{ background: P.surface, color: P.textMd, border: `1px solid ${P.border}` }}>
                  <Printer size={13} />Print
                </motion.button>
              </div>
              {/* Tab navigation */}
              <div className="flex items-center gap-1 p-0.5 rounded-xl" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                {([
                  { k: 'dashboard' as const, l: 'Dashboard', i: BarChart3 },
                  { k: 'analytics' as const, l: 'Analytics', i: Target },
                  { k: 'settings' as const, l: 'Details', i: Info },
                ]).map(t => (
                  <button key={t.k} onClick={() => setDetailTab(t.k)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-medium transition-all"
                    style={{ background: detailTab === t.k ? `${currentSelected.color}12` : 'transparent', color: detailTab === t.k ? currentSelected.color : P.textLo, border: `1px solid ${detailTab === t.k ? currentSelected.color + '30' : 'transparent'}` }}>
                  <t.i size={12} />{t.l}
                </button>
              ))}
              </div>
            </div>
          </div>

          {/* Selected category content */}
          <AnimatePresence mode="wait">
            <motion.div key={`${currentSelected.id}-${detailTab}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>

              {detailTab === 'dashboard' && <DashboardTab cat={currentSelected} onEdit={() => setModalCategory(currentSelected)} onDelete={() => setDeleteCategory(currentSelected)} onViewProjects={() => navigate(`/projects?category=${currentSelected.id}`)} onAddProject={() => navigate(`/projects/add?category=${currentSelected.id}`)} />}
              {detailTab === 'analytics' && <AnalyticsTab cat={currentSelected} categories={categories} />}
              {detailTab === 'settings' && <DetailsTab cat={currentSelected} onEdit={() => setModalCategory(currentSelected)} />}

            </motion.div>
          </AnimatePresence>
        </div>
        )}
      </main>

      {/* ═══ MODALS ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>{modalCategory && <CategoryModal category={modalCategory === 'new' ? null : modalCategory} onClose={() => setModalCategory(null)} onSave={handleSave} />}</AnimatePresence>
      <AnimatePresence>{deleteCategory && <DeleteConfirm category={deleteCategory} onClose={() => setDeleteCategory(null)} onConfirm={handleDelete} />}</AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── DASHBOARD TAB ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function DashboardTab({ cat, onEdit, onDelete, onViewProjects, onAddProject }: { cat: Category; onEdit: () => void; onDelete: () => void; onViewProjects: () => void; onAddProject: () => void }) {
  const { colors: P } = useTheme();
  const Icon = ICON_MAP[cat.icon];
  const st = statusCfg[cat.status];
  const budgetPct = Math.round((cat.spentBudget / cat.totalBudget) * 100);
  const sparkData = cat.trend.map((v, i) => ({ m: months[i], v }));

  return (
    <div className="space-y-5">
      {/* ── CATEGORY HEADER ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Tilt tiltMaxAngleX={12} tiltMaxAngleY={12} transitionSpeed={600}>
            <motion.div className="h-14 w-14 rounded-2xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${cat.color}20, ${cat.color}08)`, border: `1px solid ${cat.color}30`, boxShadow: `0 0 30px ${cat.color}12` }}
              whileHover={{ rotate: [0, -5, 5, 0] }} transition={{ duration: 0.4 }}>
              <Icon size={26} style={{ color: cat.color }} />
            </motion.div>
          </Tilt>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-black" style={{ color: P.textHi, fontFamily: 'Playfair Display, serif' }}>{cat.name}</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: `${cat.color}12`, color: cat.color }}>#{cat.rank}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: st.bg, color: st.text }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.dot }} />{st.label}
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: P.textLo }}>{cat.nameAr} &middot; Created {new Date(cat.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onViewProjects}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium"
            style={{ background: `${cat.color}10`, border: `1px solid ${cat.color}25`, color: cat.color }}>
            <FolderKanban size={12} /> View Projects ({cat.projectCount})
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onAddProject}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium"
            style={{ background: P.accent + '15', border: `1px solid ${P.accent}30`, color: P.accent }}>
            <Plus size={12} /> Add Project
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onEdit}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium"
            style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textMd }}>
            <Edit3 size={12} /> Edit
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onDelete}
            className="p-2 rounded-xl" style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textLo }}>
            <Trash2 size={13} />
          </motion.button>
        </div>
      </div>

      {/* ── BENTO STATS ROW ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { title: 'Impact Score', value: cat.impactScore, suffix: '%', icon: Target, color: cat.color, trend: '+3.2%' },
          { title: 'Total Budget', value: cat.totalBudget, prefix: 'OMR', icon: Wallet, color: '#fbbf24', trend: `${budgetPct}% used`, isCurrency: true },
          { title: 'Beneficiaries', value: cat.beneficiaries, icon: Users, color: '#a78bfa', trend: `${cat.regions.length} regions` },
          { title: 'Satisfaction', value: cat.satisfaction, suffix: '%', icon: Award, color: '#34d399', trend: `${cat.partners} partners` },
        ].map((s, i) => (
          <motion.div key={s.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <div className="relative p-4 rounded-2xl overflow-hidden group cursor-default"
              style={{ background: P.card, border: `1px solid ${P.border}` }}>
              <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${s.color}60, transparent)` }} />
              <div className="flex items-center justify-between mb-3">
                <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: `${s.color}10`, border: `1px solid ${s.color}18` }}>
                  <s.icon size={14} style={{ color: s.color }} />
                </div>
                <span className="text-[9px] font-medium px-2 py-0.5 rounded-md" style={{ background: P.surface, color: P.textLo }}>{s.trend}</span>
              </div>
              <div className="flex items-baseline gap-1">
                {s.prefix && <span className="text-[10px] font-medium" style={{ color: P.textLo }}>{s.prefix}</span>}
                <span className="text-xl font-black tabular-nums leading-none" style={{ color: P.textHi }}>
                  <NumberFlow value={s.isCurrency ? Math.round(s.value / 1000) : s.value} format={s.isCurrency ? { notation: 'compact' } : undefined} />
                </span>
                {s.isCurrency && <span className="text-[10px] font-medium" style={{ color: P.textLo }}>k</span>}
                {s.suffix && <span className="text-xs font-bold" style={{ color: s.color }}>{s.suffix}</span>}
              </div>
              <p className="text-[9px] font-medium tracking-wider uppercase mt-1" style={{ color: P.textLo }}>{s.title}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── BENTO GRID ── */}
      <div className="grid grid-cols-12 gap-4">
        {/* Budget + Donut — 3 cols, 2 rows */}
        <div className="col-span-3 row-span-2 rounded-2xl overflow-hidden" style={{ background: P.card, border: `1px solid ${P.border}` }}>
          <div className="p-5 h-full flex flex-col">
            <p className="text-[10px] font-bold tracking-wider uppercase mb-4" style={{ color: P.textLo }}>Budget Utilization</p>
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <div className="relative">
                <DonutProgress value={budgetPct} size={100} stroke={8} color={cat.color} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black tabular-nums" style={{ color: P.textHi }}>{budgetPct}%</span>
                  <span className="text-[8px] tracking-wider uppercase" style={{ color: P.textLo }}>Used</span>
                </div>
              </div>
            </div>
            <div className="space-y-2.5 mt-4">
              {[
                { l: 'Allocated', v: formatOMR(cat.totalBudget), c: P.textHi },
                { l: 'Spent', v: formatOMR(cat.spentBudget), c: '#fbbf24' },
                { l: 'Remaining', v: formatOMR(cat.totalBudget - cat.spentBudget), c: '#34d399' },
              ].map(r => (
                <div key={r.l} className="flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: P.textLo }}>{r.l}</span>
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: r.c }}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trend Chart — 6 cols */}
        <div className="col-span-6 rounded-2xl overflow-hidden" style={{ background: P.card, border: `1px solid ${P.border}` }}>
          <div className="px-5 pt-4 pb-1">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold tracking-wider uppercase" style={{ color: P.textLo }}>Growth Trend</p>
              <span className="text-[9px] font-medium px-2 py-0.5 rounded-md" style={{ background: `${cat.color}10`, color: cat.color }}>2026</span>
            </div>
            <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`trend-${cat.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={cat.color} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={cat.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={P.border} vertical={false} />
                  <XAxis dataKey="m" tick={{ fill: P.textLo, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: P.textLo, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Area type="monotone" dataKey="v" stroke={cat.color} strokeWidth={2} fill={`url(#trend-${cat.id})`} dot={false} activeDot={{ r: 3, fill: cat.color, stroke: P.card, strokeWidth: 2 }} />
                  <RechartsTooltip content={p => <Tip {...p} />} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Projects breakdown — 3 cols */}
        <div className="col-span-3 rounded-2xl overflow-hidden" style={{ background: P.card, border: `1px solid ${P.border}` }}>
          <div className="p-4">
            <p className="text-[10px] font-bold tracking-wider uppercase mb-3" style={{ color: P.textLo }}>Projects</p>
            <div className="space-y-2.5">
              {[
                { l: 'Active', v: cat.activeProjects, c: '#38bdf8', pct: Math.round((cat.activeProjects / Math.max(cat.projectCount, 1)) * 100) },
                { l: 'Completed', v: cat.completedProjects, c: '#34d399', pct: Math.round((cat.completedProjects / Math.max(cat.projectCount, 1)) * 100) },
                { l: 'Pending', v: cat.projectCount - cat.activeProjects - cat.completedProjects, c: P.textLo, pct: Math.round(((cat.projectCount - cat.activeProjects - cat.completedProjects) / Math.max(cat.projectCount, 1)) * 100) },
              ].map(p => (
                <div key={p.l}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium" style={{ color: P.textMd }}>{p.l}</span>
                    <span className="text-[11px] font-bold tabular-nums" style={{ color: p.c }}>{p.v}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: P.border }}>
                    <motion.div className="h-full rounded-full" style={{ background: p.c }} initial={{ width: 0 }} animate={{ width: `${p.pct}%` }} transition={{ duration: 0.6, ease: EASE }} />
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 mt-1" style={{ borderTop: `1px solid ${P.border}` }}>
                <span className="text-[10px] font-semibold" style={{ color: P.textMd }}>Total</span>
                <span className="text-sm font-black tabular-nums" style={{ color: P.textHi }}>{cat.projectCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk + Partners — 3 cols */}
        <div className="col-span-3 rounded-2xl overflow-hidden" style={{ background: P.card, border: `1px solid ${P.border}` }}>
          <div className="p-4 space-y-4">
            <div>
              <p className="text-[10px] font-bold tracking-wider uppercase mb-2" style={{ color: P.textLo }}>Risk Level</p>
              <div className="flex items-center gap-2.5">
                <span className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: `${riskColor[cat.riskLevel]}12`, border: `1px solid ${riskColor[cat.riskLevel]}25` }}>
                  <Shield size={14} style={{ color: riskColor[cat.riskLevel] }} />
                </span>
                <span className="text-sm font-bold capitalize" style={{ color: riskColor[cat.riskLevel] }}>{cat.riskLevel}</span>
              </div>
            </div>
            <div style={{ borderTop: `1px solid ${P.border}`, paddingTop: 12 }}>
              <p className="text-[10px] font-bold tracking-wider uppercase mb-2" style={{ color: P.textLo }}>Partners</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tabular-nums" style={{ color: P.textHi }}>{cat.partners}</span>
                <span className="text-[10px]" style={{ color: P.textLo }}>organizations</span>
              </div>
            </div>
          </div>
        </div>

        {/* SDG Alignment — 5 cols */}
        <div className="col-span-5 rounded-2xl overflow-hidden" style={{ background: P.card, border: `1px solid ${P.border}` }}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold tracking-wider uppercase" style={{ color: P.textLo }}>SDG Alignment</p>
              <span className="text-[9px] font-bold tabular-nums px-2 py-0.5 rounded-md" style={{ background: `${cat.color}10`, color: cat.color }}>{cat.sdgAlignment.length} goals</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SDG_GOALS.map(goal => {
                const aligned = cat.sdgAlignment.includes(goal.id);
                return (
                  <span key={goal.id} className="text-[9px] font-medium px-2 py-1 rounded-lg transition-all"
                    style={{ background: aligned ? `${cat.color}12` : P.surface, color: aligned ? cat.color : P.textDim, border: `1px solid ${aligned ? cat.color + '25' : P.border}` }}>
                    {goal.id}. {goal.name.split(' ')[0]}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Regions — 4 cols */}
        <div className="col-span-4 rounded-2xl overflow-hidden" style={{ background: P.card, border: `1px solid ${P.border}` }}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold tracking-wider uppercase" style={{ color: P.textLo }}>Regions</p>
              <span className="text-[9px] font-bold tabular-nums px-2 py-0.5 rounded-md" style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8' }}>{cat.regions.length}/{OMAN_REGIONS.length}</span>
            </div>
            <div className="space-y-1">
              {OMAN_REGIONS.map(region => {
                const active = cat.regions.includes(region);
                return (
                  <div key={region} className="flex items-center gap-2 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: active ? '#38bdf8' : P.textDim }} />
                    <span className="text-[10px]" style={{ color: active ? P.textHi : P.textDim }}>{region}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── DESCRIPTION ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: P.card, border: `1px solid ${P.border}` }}>
        <div className="px-5 py-4">
          <p className="text-[10px] font-bold tracking-wider uppercase mb-2" style={{ color: P.textLo }}>Description</p>
          <p className="text-sm leading-relaxed" style={{ color: P.textMd }}>{cat.description}</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── ANALYTICS TAB ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function AnalyticsTab({ cat, categories }: { cat: Category; categories: Category[] }) {
  const { colors: P } = useTheme();
  const pieData = useMemo(() => categories.map(c => ({ name: c.name, value: c.projectCount, color: c.color })), [categories]);
  const radarData = useMemo(() => categories.filter(c => c.status === 'active').slice(0, 6).map(c => ({ name: c.name.slice(0, 8), impact: c.impactScore, satisfaction: c.satisfaction, budget: Math.round((c.spentBudget / c.totalBudget) * 100) })), [categories]);
  const budgetBarData = useMemo(() => categories.filter(c => c.status === 'active').map(c => ({ name: c.name.slice(0, 10), allocated: c.totalBudget / 1000, spent: c.spentBudget / 1000, color: c.color })).sort((a, b) => b.allocated - a.allocated), [categories]);
  const trendData = useMemo(() => months.map((m, i) => {
    const row: Record<string, string | number> = { month: m };
    categories.filter(c => c.status === 'active').slice(0, 5).forEach(c => { row[c.name] = c.trend[i]; });
    return row;
  }), [categories]);
  const topCats = useMemo(() => [...categories].sort((a, b) => b.impactScore - a.impactScore).slice(0, 5), [categories]);

  return (
    <div className="space-y-5">
      {/* Highlighted category banner */}
      <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: `${cat.color}06`, border: `1px solid ${cat.color}15` }}>
        <Zap size={16} style={{ color: cat.color }} />
        <p className="text-xs" style={{ color: P.textMd }}>Viewing cross-category analytics with <span className="font-bold" style={{ color: cat.color }}>{cat.name}</span> highlighted</p>
      </div>

      {/* Charts grid - 2x2 */}
      <div className="grid grid-cols-2 gap-4">
        {/* Project Distribution Pie */}
        <div className="rounded-2xl overflow-hidden" style={{ background: P.card, border: `1px solid ${P.border}` }}>
          <div className="p-5">
            <p className="text-[10px] font-bold tracking-wider uppercase mb-1" style={{ color: P.textLo }}>Project Distribution</p>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <RechartsTooltip content={p => <Tip {...p} suffix=" projects" />} />
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} innerRadius={35} dataKey="value" nameKey="name" strokeWidth={2} stroke={P.card} paddingAngle={2}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} opacity={e.name === cat.name ? 1 : 0.5} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Performance Radar */}
        <div className="rounded-2xl overflow-hidden" style={{ background: P.card, border: `1px solid ${P.border}` }}>
          <div className="p-5">
            <p className="text-[10px] font-bold tracking-wider uppercase mb-1" style={{ color: P.textLo }}>Performance Radar</p>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                  <PolarGrid stroke={P.border} />
                  <PolarAngleAxis dataKey="name" tick={{ fill: P.textLo, fontSize: 9 }} />
                  <Radar name="Impact" dataKey="impact" stroke={cat.color} fill={cat.color} fillOpacity={0.15} strokeWidth={2} />
                  <Radar name="Satisfaction" dataKey="satisfaction" stroke="#34d399" fill="#34d399" fillOpacity={0.08} strokeWidth={1.5} />
                  <RechartsTooltip content={p => <Tip {...p} suffix="%" />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Budget Comparison Bars */}
        <div className="rounded-2xl overflow-hidden" style={{ background: P.card, border: `1px solid ${P.border}` }}>
          <div className="p-5">
            <p className="text-[10px] font-bold tracking-wider uppercase mb-1" style={{ color: P.textLo }}>Budget vs Spent (OMR k)</p>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBar data={budgetBarData} layout="vertical" margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={P.border} horizontal={false} />
                  <XAxis type="number" tick={{ fill: P.textLo, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: P.textLo, fontSize: 8 }} axisLine={false} tickLine={false} width={65} />
                  <RechartsTooltip content={p => <Tip {...p} suffix="k OMR" />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                  <Bar dataKey="allocated" name="Allocated" fill={P.accent} radius={[0, 3, 3, 0]} opacity={0.25} />
                  <Bar dataKey="spent" name="Spent" radius={[0, 3, 3, 0]}>
                    {budgetBarData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </RechartsBar>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Growth Trends */}
        <div className="rounded-2xl overflow-hidden" style={{ background: P.card, border: `1px solid ${P.border}` }}>
          <div className="p-5">
            <p className="text-[10px] font-bold tracking-wider uppercase mb-1" style={{ color: P.textLo }}>Growth Trends (Top 5)</p>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={P.border} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: P.textLo, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: P.textLo, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip content={p => <Tip {...p} />} />
                  {categories.filter(c => c.status === 'active').slice(0, 5).map(c => (
                    <Area key={c.id} type="monotone" dataKey={c.name} stroke={c.color} strokeWidth={c.id === cat.id ? 2.5 : 1} fill="none" dot={false} opacity={c.id === cat.id ? 1 : 0.4} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[9px]" style={{ color: P.textLo }}>
              {categories.filter(c => c.status === 'active').slice(0, 5).map(c => (
                <span key={c.id} className="flex items-center gap-1" style={{ opacity: c.id === cat.id ? 1 : 0.5 }}>
                  <span className="h-1 w-3 rounded-full" style={{ background: c.color }} />{c.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Impact Leaderboard */}
      <div className="rounded-2xl overflow-hidden" style={{ background: P.card, border: `1px solid ${P.border}` }}>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={14} style={{ color: '#fbbf24' }} />
            <p className="text-[10px] font-bold tracking-wider uppercase" style={{ color: P.textLo }}>Impact Leaderboard</p>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {topCats.map((c, i) => {
              const CIcon = ICON_MAP[c.icon];
              const medals = ['#fbbf24', '#4B5563', '#cd7f32'];
              const isCurrent = c.id === cat.id;
              return (
                <div key={c.id} className="p-3 rounded-full text-center transition-all"
                  style={{ background: isCurrent ? `${c.color}08` : P.surface, border: `1px solid ${isCurrent ? c.color + '30' : P.border}` }}>
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {i < 3 ? <Medal size={12} style={{ color: medals[i] }} /> : <span className="text-[10px] font-bold" style={{ color: P.textLo }}>#{i + 1}</span>}
                  </div>
                  <CIcon size={18} className="mx-auto mb-1.5" style={{ color: c.color }} />
                  <p className="text-[10px] font-semibold truncate" style={{ color: P.textHi }}>{c.name}</p>
                  <p className="text-lg font-black tabular-nums" style={{ color: c.color }}>{c.impactScore}%</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── DETAILS TAB ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function DetailsTab({ cat, onEdit }: { cat: Category; onEdit: () => void }) {
  const { colors: P } = useTheme();
  const Icon = ICON_MAP[cat.icon];
  return (
    <div className="space-y-5">
      {/* Full info */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left: Details */}
        <div className="rounded-2xl overflow-hidden" style={{ background: P.card, border: `1px solid ${P.border}` }}>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-wider uppercase" style={{ color: P.textLo }}>Category Details</p>
              <button onClick={onEdit} className="text-[10px] font-medium px-3 py-1 rounded-lg" style={{ background: P.surface, color: P.accent, border: `1px solid ${P.accent}25` }}>
                <Edit3 size={10} className="inline mr-1" /> Edit
              </button>
            </div>
            {[
              { l: 'ID', v: cat.id },
              { l: 'Name', v: cat.name },
              { l: 'Arabic Name', v: cat.nameAr },
              { l: 'Status', v: cat.status, badge: true },
              { l: 'Rank', v: `#${cat.rank}` },
              { l: 'Risk Level', v: cat.riskLevel, risk: true },
              { l: 'Created', v: new Date(cat.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
            ].map(row => (
              <div key={row.l} className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${P.border}` }}>
                <span className="text-[11px]" style={{ color: P.textLo }}>{row.l}</span>
                {row.badge ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize" style={{ background: statusCfg[cat.status].bg, color: statusCfg[cat.status].text }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusCfg[cat.status].dot }} />{row.v}
                  </span>
                ) : row.risk ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold capitalize" style={{ color: riskColor[cat.riskLevel] }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: riskColor[cat.riskLevel] }} />{row.v}
                  </span>
                ) : (
                  <span className="text-[11px] font-medium" style={{ color: P.textHi }}>{row.v}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Metrics */}
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden" style={{ background: P.card, border: `1px solid ${P.border}` }}>
            <div className="p-5">
              <p className="text-[10px] font-bold tracking-wider uppercase mb-3" style={{ color: P.textLo }}>Financial Overview</p>
              {[
                { l: 'Total Budget', v: formatOMR(cat.totalBudget) },
                { l: 'Spent', v: formatOMR(cat.spentBudget) },
                { l: 'Remaining', v: formatOMR(cat.totalBudget - cat.spentBudget) },
                { l: 'Utilization', v: `${Math.round((cat.spentBudget / cat.totalBudget) * 100)}%` },
              ].map(row => (
                <div key={row.l} className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${P.border}` }}>
                  <span className="text-[11px]" style={{ color: P.textLo }}>{row.l}</span>
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: P.textHi }}>{row.v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ background: P.card, border: `1px solid ${P.border}` }}>
            <div className="p-5">
              <p className="text-[10px] font-bold tracking-wider uppercase mb-3" style={{ color: P.textLo }}>Performance</p>
              {[
                { l: 'Impact Score', v: `${cat.impactScore}%`, c: cat.color },
                { l: 'Satisfaction', v: `${cat.satisfaction}%`, c: '#34d399' },
                { l: 'Projects', v: `${cat.projectCount} (${cat.activeProjects} active)` },
                { l: 'Beneficiaries', v: formatNumber(cat.beneficiaries) },
                { l: 'Partners', v: String(cat.partners) },
              ].map(row => (
                <div key={row.l} className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${P.border}` }}>
                  <span className="text-[11px]" style={{ color: P.textLo }}>{row.l}</span>
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: row.c ?? P.textHi }}>{row.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="rounded-2xl overflow-hidden" style={{ background: P.card, border: `1px solid ${P.border}` }}>
        <div className="p-5">
          <p className="text-[10px] font-bold tracking-wider uppercase mb-3" style={{ color: P.textLo }}>Full Description</p>
          <p className="text-sm leading-relaxed" style={{ color: P.textMd }}>{cat.description}</p>
        </div>
      </div>

      {/* SDGs + Regions */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl overflow-hidden" style={{ background: P.card, border: `1px solid ${P.border}` }}>
          <div className="p-5">
            <p className="text-[10px] font-bold tracking-wider uppercase mb-3" style={{ color: P.textLo }}>SDG Alignment</p>
            <div className="flex flex-wrap gap-1.5">
              {cat.sdgAlignment.map(s => {
                const goal = SDG_GOALS.find(g => g.id === s);
                return <span key={s} className="text-[10px] font-medium px-2.5 py-1.5 rounded-lg" style={{ background: `${cat.color}10`, color: cat.color, border: `1px solid ${cat.color}20` }}>Goal {s}: {goal?.name ?? ''}</span>;
              })}
            </div>
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: P.card, border: `1px solid ${P.border}` }}>
          <div className="p-5">
            <p className="text-[10px] font-bold tracking-wider uppercase mb-3" style={{ color: P.textLo }}>Target Regions</p>
            <div className="flex flex-wrap gap-1.5">
              {cat.regions.map(r => (
                <span key={r} className="text-[10px] font-medium px-2.5 py-1.5 rounded-lg flex items-center gap-1" style={{ background: P.surface, color: P.textMd, border: `1px solid ${P.border}` }}>
                  <MapPin size={9} style={{ color: '#38bdf8' }} /> {r}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── CATEGORY MODAL (Multi-Step Wizard) ─────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
const MODAL_STEPS = [
  { key: 'basic', label: 'Basic Info', icon: Tags, desc: 'Name, description & status' },
  { key: 'visual', label: 'Visual Identity', icon: Sparkles, desc: 'Icon & color theme' },
  { key: 'financial', label: 'Financial', icon: Wallet, desc: 'Budget allocation' },
  { key: 'impact', label: 'Impact & KPIs', icon: Target, desc: 'Performance metrics' },
  { key: 'geography', label: 'SDG & Regions', icon: Globe, desc: 'Alignment & coverage' },
  { key: 'review', label: 'Review', icon: CheckCircle2, desc: 'Confirm & save' },
] as const;

function CategoryModal({ category, onClose, onSave }: { category: Category | null; onClose: () => void; onSave: (d: Partial<Category>) => void }) {
  const { colors: P } = useTheme();
  const isEdit = !!category;
  const [step, setStep] = useState(0);
  const [name, setName] = useState(category?.name ?? '');
  const [nameAr, setNameAr] = useState(category?.nameAr ?? '');
  const [desc, setDesc] = useState(category?.description ?? '');
  const [status, setStatus] = useState<'active' | 'inactive'>(category?.status ?? 'active');
  const [icon, setIcon] = useState<IconName>(category?.icon ?? 'GraduationCap');
  const [color, setColor] = useState(category?.color ?? '#E91E63');
  const [totalBudget, setTotalBudget] = useState(category?.totalBudget ?? 0);
  const [spentBudget, setSpentBudget] = useState(category?.spentBudget ?? 0);
  const [projectCount, setProjectCount] = useState(category?.projectCount ?? 0);
  const [activeProjects, setActiveProjects] = useState(category?.activeProjects ?? 0);
  const [completedProjects, setCompletedProjects] = useState(category?.completedProjects ?? 0);
  const [beneficiaries, setBeneficiaries] = useState(category?.beneficiaries ?? 0);
  const [impactScore, setImpactScore] = useState(category?.impactScore ?? 50);
  const [satisfaction, setSatisfaction] = useState(category?.satisfaction ?? 50);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>(category?.riskLevel ?? 'low');
  const [partners, setPartners] = useState(category?.partners ?? 0);
  const [sdgAlignment, setSdgAlignment] = useState<number[]>(category?.sdgAlignment ?? []);
  const [regions, setRegions] = useState<string[]>(category?.regions ?? []);

  const toggleSdg = (id: number) => setSdgAlignment(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  const toggleRegion = (r: string) => setRegions(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  const budgetPct = totalBudget > 0 ? Math.round((spentBudget / totalBudget) * 100) : 0;
  const SelectedIcon = ICON_MAP[icon];
  const canNext = () => { if (step === 0) return name.trim().length >= 2; return true; };

  const handleSubmit = () => {
    onSave({ name, nameAr, description: desc, icon, color, status, totalBudget, spentBudget, projectCount, activeProjects, completedProjects, beneficiaries, impactScore, satisfaction, riskLevel, partners, sdgAlignment, regions, trend: category?.trend ?? Array(12).fill(0) });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(16px)' }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 40 }} transition={{ duration: 0.4, ease: EASE }}
        className="w-full max-w-4xl rounded-2xl overflow-hidden" style={{ background: P.card, border: `1px solid ${P.borderHi}`, boxShadow: '0 60px 120px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5" style={{ borderBottom: `1px solid ${P.border}` }}>
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
              <SelectedIcon size={18} style={{ color }} />
            </div>
            <div>
              <h2 className="text-base font-black" style={{ color: P.textHi }}>{isEdit ? 'Edit Category' : 'Create New Category'}</h2>
              <p className="text-[10px] mt-0.5" style={{ color: P.textLo }}>Step {step + 1}/{MODAL_STEPS.length} — {MODAL_STEPS[step].desc}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full" style={{ color: P.textLo }}><X size={16} /></button>
        </div>
        {/* Steps */}
        <div className="px-7 py-3 flex items-center gap-1" style={{ background: P.surface }}>
          {MODAL_STEPS.map((s, i) => (
            <React.Fragment key={s.key}>
              <button onClick={() => { if (i <= step || canNext()) setStep(i); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-medium transition-all whitespace-nowrap"
                style={{ background: i === step ? `${color}12` : 'transparent', color: i === step ? color : i < step ? '#34d399' : P.textLo, border: `1px solid ${i === step ? color + '30' : 'transparent'}` }}>
                {i < step ? <Check size={10} /> : <s.icon size={10} />}
                <span className="hidden lg:inline">{s.label}</span>
              </button>
              {i < MODAL_STEPS.length - 1 && <ChevronRight size={10} style={{ color: P.textDim }} className="flex-shrink-0" />}
            </React.Fragment>
          ))}
        </div>
        {/* Body */}
        <div className="px-7 py-6 min-h-[360px] max-h-[55vh] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: `${P.border} transparent` }}>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
              {step === 0 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <ModalField label="Name (English)" value={name} onChange={setName} placeholder="e.g. Education" required />
                    <ModalField label="Name (Arabic)" value={nameAr} onChange={setNameAr} placeholder="مثال: التعليم" dir="rtl" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold tracking-wider uppercase mb-2 block" style={{ color: P.textLo }}>Description</label>
                    <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4} placeholder="Describe the category scope..."
                      className="w-full px-4 py-3 rounded-full text-sm outline-none resize-none" style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi }}
                      onFocus={e => (e.currentTarget.style.borderColor = color)} onBlur={e => (e.currentTarget.style.borderColor = P.border)} />
                    <p className="text-[9px] mt-1 tabular-nums" style={{ color: desc.length > 150 ? '#34d399' : P.textLo }}>{desc.length} chars</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold tracking-wider uppercase mb-2 block" style={{ color: P.textLo }}>Status</label>
                    <div className="flex gap-3">
                      {(['active', 'inactive'] as const).map(s => { const sc = statusCfg[s]; return (
                        <button key={s} onClick={() => setStatus(s)} className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium"
                          style={{ background: status === s ? sc.bg : P.surface, border: `1px solid ${status === s ? sc.dot + '35' : P.border}`, color: status === s ? sc.text : P.textLo }}>
                          <span className="h-2 w-2 rounded-full" style={{ background: sc.dot }} />{sc.label}
                          {status === s && <Check size={11} className="ml-auto" />}
                        </button>
                      ); })}
                    </div>
                  </div>
                </div>
              )}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <div className="flex flex-col items-center gap-3 p-5 rounded-2xl" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                      <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                        <SelectedIcon size={28} style={{ color }} />
                      </div>
                      <p className="text-sm font-bold" style={{ color: P.textHi }}>{name || 'Preview'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold tracking-wider uppercase mb-2 block" style={{ color: P.textLo }}>Icon</label>
                    <div className="grid grid-cols-8 gap-2">
                      {iconNames.map(k => { const I = ICON_MAP[k]; const sel = icon === k; return (
                        <button key={k} onClick={() => setIcon(k)} className="h-11 w-11 rounded-xl flex items-center justify-center transition-all"
                          style={{ background: sel ? `${color}15` : P.surface, border: `2px solid ${sel ? color : P.border}` }}>
                          <I size={18} style={{ color: sel ? color : P.textLo }} />
                        </button>
                      ); })}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold tracking-wider uppercase mb-2 block" style={{ color: P.textLo }}>Color</label>
                    <div className="flex gap-2.5 flex-wrap">
                      {COLOR_OPTIONS.map(c => (
                        <button key={c} onClick={() => setColor(c)} className="h-10 w-10 rounded-xl relative" style={{ background: c, border: color === c ? `3px solid ${P.textHi}` : '3px solid transparent' }}>
                          {color === c && <Check size={14} className="absolute inset-0 m-auto" style={{ color: '#000' }} />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="p-5 rounded-xl" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-[10px] font-semibold tracking-wider uppercase mb-2 block" style={{ color: P.textLo }}>Total Budget (OMR)</label>
                      <input type="number" value={totalBudget || ''} onChange={e => setTotalBudget(Number(e.target.value) || 0)} placeholder="0"
                        className="w-full px-4 py-2.5 rounded-full text-sm outline-none tabular-nums font-semibold" style={{ background: P.card, border: `1px solid ${P.border}`, color: P.textHi }}
                        onFocus={e => (e.currentTarget.style.borderColor = '#fbbf24')} onBlur={e => (e.currentTarget.style.borderColor = P.border)} />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold tracking-wider uppercase mb-2 block" style={{ color: P.textLo }}>Spent Budget (OMR)</label>
                      <input type="number" value={spentBudget || ''} onChange={e => setSpentBudget(Math.min(Number(e.target.value) || 0, totalBudget))} placeholder="0"
                        className="w-full px-4 py-2.5 rounded-full text-sm outline-none tabular-nums font-semibold" style={{ background: P.card, border: `1px solid ${P.border}`, color: P.textHi }}
                        onFocus={e => (e.currentTarget.style.borderColor = '#fbbf24')} onBlur={e => (e.currentTarget.style.borderColor = P.border)} />
                    </div>
                  </div>
                  {totalBudget > 0 && (
                    <div className="p-4 rounded-xl" style={{ background: P.card, border: `1px solid ${P.border}` }}>
                      <div className="flex justify-between mb-2">
                        <span className="text-[10px]" style={{ color: P.textLo }}>Utilization</span>
                        <span className="text-sm font-black tabular-nums" style={{ color: budgetPct > 90 ? '#f87171' : budgetPct > 70 ? '#fbbf24' : '#34d399' }}>{budgetPct}%</span>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: P.border }}>
                        <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${budgetPct}%` }} transition={{ duration: 0.5 }}
                          style={{ background: budgetPct > 90 ? '#f87171' : budgetPct > 70 ? '#fbbf24' : '#34d399' }} />
                      </div>
                    </div>
                  )}
                </div>
              )}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl space-y-3" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                      <p className="text-[10px] font-bold tracking-wider uppercase" style={{ color: P.textLo }}>Projects</p>
                      <NumField label="Total" value={projectCount} onChange={setProjectCount} />
                      <NumField label="Active" value={activeProjects} onChange={v => setActiveProjects(Math.min(v, projectCount))} />
                      <NumField label="Completed" value={completedProjects} onChange={v => setCompletedProjects(Math.min(v, projectCount))} />
                    </div>
                    <div className="p-4 rounded-xl space-y-3" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                      <p className="text-[10px] font-bold tracking-wider uppercase" style={{ color: P.textLo }}>People</p>
                      <NumField label="Beneficiaries" value={beneficiaries} onChange={setBeneficiaries} />
                      <NumField label="Partners" value={partners} onChange={setPartners} />
                    </div>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                    <p className="text-[10px] font-bold tracking-wider uppercase mb-4" style={{ color: P.textLo }}>Performance</p>
                    <SliderField label="Impact Score" value={impactScore} onChange={setImpactScore} color={color} />
                    <SliderField label="Satisfaction" value={satisfaction} onChange={setSatisfaction} color="#34d399" />
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                    <p className="text-[10px] font-bolt tracking-wider uppercase mb-3" style={{ color: P.textLo }}>Risk Level</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(['low', 'medium', 'high'] as const).map(level => (
                        <button key={level} onClick={() => setRiskLevel(level)}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-full text-xs font-semibold capitalize"
                          style={{ background: riskLevel === level ? `${riskColor[level]}10` : P.card, border: `2px solid ${riskLevel === level ? riskColor[level] + '50' : P.border}`, color: riskLevel === level ? riskColor[level] : P.textLo }}>
                          <span className="h-3 w-3 rounded-full" style={{ background: riskColor[level] }} />{level}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {step === 4 && (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-bold tracking-wider uppercase" style={{ color: P.textLo }}>SDG Alignment</p>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md tabular-nums" style={{ background: `${color}10`, color }}>{sdgAlignment.length} selected</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-3">
                      {SDG_GOALS.map(goal => { const sel = sdgAlignment.includes(goal.id); return (
                        <button key={goal.id} onClick={() => toggleSdg(goal.id)} className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left"
                          style={{ background: sel ? `${color}08` : P.card, border: `1px solid ${sel ? color + '30' : P.border}` }}>
                          <span className="h-5 w-5 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0" style={{ background: sel ? `${color}18` : P.surface, color: sel ? color : P.textLo }}>{goal.id}</span>
                          <span className="text-[9px] leading-tight" style={{ color: sel ? P.textHi : P.textMd }}>{goal.name}</span>
                        </button>
                      ); })}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-bold tracking-wider uppercase" style={{ color: P.textLo }}>Target Regions</p>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md tabular-nums" style={{ background: 'rgba(56,189,248,0.08)', color: '#38bdf8' }}>{regions.length}/{OMAN_REGIONS.length}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-3">
                      {OMAN_REGIONS.map(region => { const sel = regions.includes(region); return (
                        <button key={region} onClick={() => toggleRegion(region)} className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left"
                          style={{ background: sel ? 'rgba(56,189,248,0.06)' : P.card, border: `1px solid ${sel ? 'rgba(56,189,248,0.25)' : P.border}` }}>
                          <MapPin size={10} style={{ color: sel ? '#38bdf8' : P.textLo }} />
                          <span className="text-[10px]" style={{ color: sel ? P.textHi : P.textMd }}>{region}</span>
                        </button>
                      ); })}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => setRegions([...OMAN_REGIONS])} className="text-[9px] px-2.5 py-1 rounded-md" style={{ color: '#38bdf8', background: P.card, border: `1px solid ${P.border}` }}>Select All</button>
                      <button onClick={() => setRegions([])} className="text-[9px] px-2.5 py-1 rounded-md" style={{ color: P.textLo, background: P.card, border: `1px solid ${P.border}` }}>Clear</button>
                    </div>
                  </div>
                </div>
              )}
              {step === 5 && (
                <div className="space-y-4">
                  <div className="text-center mb-2">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-2" style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
                      <SelectedIcon size={26} style={{ color }} />
                    </div>
                    <h3 className="text-base font-black" style={{ color: P.textHi }}>{name || 'Unnamed'}</h3>
                    <p className="text-[10px]" style={{ color: P.textLo }}>{nameAr || '—'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl space-y-1.5" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                      <p className="text-[9px] font-bold tracking-wider uppercase" style={{ color: P.textLo }}>Basic</p>
                      <RRow l="Status" v={status} />
                      <RRow l="Budget" v={totalBudget > 0 ? formatOMR(totalBudget) : '—'} />
                      <RRow l="Spent" v={spentBudget > 0 ? formatOMR(spentBudget) : '—'} />
                    </div>
                    <div className="p-3 rounded-xl space-y-1.5" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
                      <p className="text-[9px] font-bold tracking-wider uppercase" style={{ color: P.textLo }}>Impact</p>
                      <RRow l="Score" v={`${impactScore}%`} />
                      <RRow l="Satisfaction" v={`${satisfaction}%`} />
                      <RRow l="Risk" v={riskLevel} />
                      <RRow l="Projects" v={String(projectCount)} />
                      <RRow l="SDGs" v={sdgAlignment.length > 0 ? sdgAlignment.map(s => `#${s}`).join(', ') : 'None'} />
                      <RRow l="Regions" v={regions.length > 0 ? `${regions.length} selected` : 'None'} />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        {/* Footer */}
        <div className="flex items-center justify-between px-7 py-4" style={{ borderTop: `1px solid ${P.border}` }}>
          <div className="flex gap-1">
            {Array.from({ length: MODAL_STEPS.length }, (_, i) => (
              <div key={i} className="h-1 rounded-full transition-all" style={{ width: i === step ? 20 : 6, background: i <= step ? color : P.border }} />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 ? <button onClick={() => setStep(step - 1)} className="px-4 py-2 rounded-full text-xs font-medium" style={{ color: P.textMd, background: P.surface, border: `1px solid ${P.border}` }}>Back</button>
              : <button onClick={onClose} className="px-4 py-2 rounded-full text-xs font-medium" style={{ color: P.textMd, background: P.surface, border: `1px solid ${P.border}` }}>Cancel</button>}
            {step < MODAL_STEPS.length - 1
              ? <button onClick={() => { if (canNext()) setStep(step + 1); }} className="flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-bold"
                  style={{ background: canNext() ? `linear-gradient(135deg, ${color}, ${P.accentLo})` : P.surface, color: canNext() ? P.bg : P.textLo, opacity: canNext() ? 1 : 0.5 }}>Next <ChevronRight size={12} /></button>
              : <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} className="flex items-center gap-1.5 px-6 py-2 rounded-full text-xs font-black"
                  style={{ background: `linear-gradient(135deg, ${color}, ${P.accentLo})`, color: P.bg }}><CheckCircle2 size={14} /> {isEdit ? 'Save' : 'Create'}</motion.button>}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Modal helpers ──────────────────────────────────────────────────────────
function ModalField({ label, value, onChange, placeholder, dir, required }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; dir?: string; required?: boolean }) {
  const { colors: P } = useTheme();
  return (
    <div>
      <label className="text-[10px] font-semibold tracking-wider uppercase mb-2 block" style={{ color: P.textLo }}>{label} {required && <span style={{ color: '#f87171' }}>*</span>}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} dir={dir}
        className="w-full px-4 py-2.5 rounded-full text-sm outline-none" style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.textHi }}
        onFocus={e => (e.currentTarget.style.borderColor = P.accent)} onBlur={e => (e.currentTarget.style.borderColor = P.border)} />
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const { colors: P } = useTheme();
  return (
    <div>
      <label className="text-[9px] font-medium tracking-wider uppercase mb-1 block" style={{ color: P.textLo }}>{label}</label>
      <input type="number" min={0} value={value || ''} onChange={e => onChange(Math.max(0, Number(e.target.value) || 0))} placeholder="0"
        className="w-full px-3 py-1.5 rounded-lg text-sm outline-none tabular-nums font-semibold" style={{ background: P.card, border: `1px solid ${P.border}`, color: P.textHi }}
        onFocus={e => (e.currentTarget.style.borderColor = P.accent)} onBlur={e => (e.currentTarget.style.borderColor = P.border)} />
    </div>
  );
}

function SliderField({ label, value, onChange, color }: { label: string; value: number; onChange: (v: number) => void; color: string }) {
  const { colors: P } = useTheme();
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-medium" style={{ color: P.textMd }}>{label}</span>
        <span className="text-xs font-black tabular-nums" style={{ color }}>{value}%</span>
      </div>
      <input type="range" min={0} max={100} value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(90deg, ${color} ${value}%, ${P.border} ${value}%)`, accentColor: color }} />
    </div>
  );
}

function RRow({ l, v }: { l: string; v: string }) {
  const { colors: P } = useTheme();
  return (
    <div className="flex items-center justify-between">
      <span className="text-[9px]" style={{ color: P.textLo }}>{l}</span>
      <span className="text-[10px] font-medium capitalize truncate max-w-[55%] text-right" style={{ color: P.textHi }}>{v}</span>
    </div>
  );
}

// ─── Delete Confirm ─────────────────────────────────────────────────────────
function DeleteConfirm({ category, onClose, onConfirm }: { category: Category; onClose: () => void; onConfirm: () => void }) {
  const { colors: P } = useTheme();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 20 }} transition={{ duration: 0.3, ease: EASE }}
        className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: P.card, border: '1px solid rgba(248,113,113,0.2)', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>
        <div className="p-6 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full mb-3" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <AlertTriangle size={24} style={{ color: '#f87171' }} />
          </div>
          <h3 className="text-base font-bold mb-1.5" style={{ color: P.textHi }}>Delete Category</h3>
          <p className="text-sm mb-1" style={{ color: P.textMd }}>Delete <span className="font-bold" style={{ color: P.textHi }}>{category.name}</span>?</p>
          <p className="text-xs mb-5" style={{ color: P.textLo }}>{category.projectCount} projects and {formatNumber(category.beneficiaries)} beneficiaries affected.</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2 rounded-full text-sm font-medium" style={{ background: P.surface, color: P.textMd, border: `1px solid ${P.border}` }}>Cancel</button>
            <button onClick={onConfirm} className="flex-1 py-2 rounded-full text-sm font-bold" style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>Delete</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
