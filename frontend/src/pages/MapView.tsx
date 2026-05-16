import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { projectService } from '../services/projectService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../hooks/useTheme';
import {
  MapPin, Search, Filter, ChevronDown, X, Activity, Wallet,
  Users, FolderKanban, TrendingUp,
  Building2, GraduationCap, Heart, Leaf, Wrench,
  Layers, ZoomIn, ZoomOut, Maximize2,
} from 'lucide-react';

// ─── Oman Data ────────────────────────────────────────────────────────────────
const OMAN_CENTER: [number, number] = [21.4735, 55.9754];
const OMAN_BOUNDS: [[number, number], [number, number]] = [[16.6, 51.8], [26.5, 60.0]];

interface MapProject {
  id: string;
  name: string;
  lat: number;
  lng: number;
  governorate: string;
  category: string;
  status: 'active' | 'completed' | 'planning' | 'on_hold';
  budget: number;
  spent: number;
  progress: number;
  beneficiaries: number;
  risk: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  endDate: string;
}

const statusConfig = {
  active:    { label: 'Active',    color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  completed: { label: 'Completed', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  planning:  { label: 'Planning',  color: '#E91E63', bg: 'rgba(233,30,99,0.12)' },
  on_hold:   { label: 'On Hold',   color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
} as const;

const riskConfig = {
  low:      { color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  medium:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  high:     { color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  critical: { color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
} as const;

const categoryConfig: Record<string, { color: string; icon: React.ElementType }> = {
  Education:      { color: '#E91E63', icon: GraduationCap },
  Healthcare:     { color: '#38bdf8', icon: Heart },
  Environment:    { color: '#34d399', icon: Leaf },
  Infrastructure: { color: '#fbbf24', icon: Building2 },
  Community:      { color: '#a78bfa', icon: Users },
  Technology:     { color: '#f472b6', icon: Wrench },
};

// ─── Marker Icon ──────────────────────────────────────────────────────────────
function createMarkerIcon(color: string, risk: string) {
  const hasGlow = risk === 'critical' || risk === 'high';
  const riskGlow = risk === 'critical' ? 'rgba(248,113,113,0.4)' : 'rgba(251,146,60,0.3)';
  return L.divIcon({
    className: '',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -42],
    html: `<div style="position:relative;width:32px;height:40px;">
      ${hasGlow ? `<div style="position:absolute;left:4px;top:4px;width:24px;height:24px;border-radius:50%;background:${riskGlow};animation:pulse 2s ease-in-out infinite;"></div>` : ''}
      <svg viewBox="0 0 32 40" width="32" height="40" style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.05));">
        <path d="M16 0C7.16 0 0 7.16 0 16c0 10.67 14.34 22.53 14.95 23.06a1.5 1.5 0 001.9.1C17.66 38.53 32 26.67 32 16 32 7.16 24.84 0 16 0z" fill="${color}"/>
        <circle cx="16" cy="14" r="6" fill="rgba(255,255,255,0.6)"/>
        <circle cx="16" cy="14" r="3" fill="white"/>
      </svg>
    </div>`,
  });
}

// ─── Map Controls ─────────────────────────────────────────────────────────────
function MapControls() {
  const { colors: P } = useTheme();
  const map = useMap();
  return (
    <div className="absolute bottom-6 right-6 z-[1000] flex flex-col gap-2">
      {[
        { icon: ZoomIn, action: () => map.zoomIn() },
        { icon: ZoomOut, action: () => map.zoomOut() },
        { icon: Maximize2, action: () => map.fitBounds(OMAN_BOUNDS) },
      ].map((b, i) => (
        <button key={i} onClick={b.action} className="h-10 w-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95" style={{ background: 'rgba(19,19,16,0.9)', backdropFilter: 'blur(8px)', border: `1px solid ${P.border}`, color: P.textHi, boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
          <b.icon size={16} />
        </button>
      ))}
    </div>
  );
}

// ─── Stat mini card ───────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  const { colors: P } = useTheme();
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-full" style={{ background: `${color}08`, border: `1px solid ${color}15` }}>
      <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
        <Icon size={14} style={{ color }} />
      </div>
      <div>
        <p className="text-base font-black tabular-nums leading-none" style={{ color }}>{value}</p>
        <p className="text-[9px] mt-1 font-medium tracking-[0.12em] uppercase" style={{ color: P.textLo }}>{label}</p>
      </div>
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ project, isActive, onClick }: { project: MapProject; isActive: boolean; onClick: () => void }) {
  const { colors: P } = useTheme();
  const sc = statusConfig[project.status];
  const rc = riskConfig[project.risk];
  const cc = categoryConfig[project.category];
  const CatIcon = cc?.icon || FolderKanban;
  const budgetPct = Math.round((project.spent / project.budget) * 100);

  return (
    <motion.div
      layout
      onClick={onClick}
      className="cursor-pointer rounded-2xl p-4 transition-all"
      style={{ background: isActive ? P.cardHi : P.card, border: `1px solid ${isActive ? P.accent + '40' : P.border}`, boxShadow: isActive ? `0 0 20px ${P.accent}10, inset 0 1px 0 ${P.borderHi}` : `inset 0 1px 0 ${P.borderHi}` }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
    >
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${cc?.color || P.accent}12`, border: `1px solid ${cc?.color || P.accent}25` }}>
          <CatIcon size={14} style={{ color: cc?.color || P.accent }} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold truncate" style={{ color: P.textHi }}>{project.name}</h4>
          <p className="text-[10px] mt-0.5" style={{ color: P.textLo }}>{project.governorate}</p>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
      </div>
      <div className="mt-3">
        <div className="flex justify-between mb-1">
          <span className="text-[10px]" style={{ color: P.textLo }}>Progress</span>
          <span className="text-[10px] font-bold tabular-nums" style={{ color: P.textMd }}>{project.progress}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: P.border }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${project.progress}%`, background: project.progress === 100 ? '#34d399' : sc.color }} />
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-2" style={{ borderTop: `1px solid ${P.border}` }}>
        <div className="flex items-center gap-1 text-[10px]" style={{ color: P.textLo }}>
          <Wallet size={10} />
          <span className="tabular-nums font-mono">{(project.budget / 1000).toFixed(0)}k</span>
          <span className="mx-0.5">·</span>
          <span className="tabular-nums" style={{ color: budgetPct > 80 ? '#fb923c' : P.textLo }}>{budgetPct}%</span>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize" style={{ background: rc.bg, color: rc.color }}>{project.risk}</span>
      </div>
    </motion.div>
  );
}

// ─── Region fallback coordinates ──────────────────────────────────────────────
const regionCoords: Record<string, [number, number]> = {
  'Muscat':             [23.588, 58.383],
  'Dhofar':             [17.015, 54.092],
  'Al Batinah North':   [24.346, 56.731],
  'Al Batinah South':   [23.678, 57.889],
  'Al Dakhiliyah':      [22.933, 57.533],
  'Ad Dakhiliyah':      [22.933, 57.533],
  'Al Sharqiyah North': [22.573, 58.109],
  'Ash Sharqiyah North':[22.573, 58.109],
  'Al Sharqiyah South': [22.567, 59.529],
  'Ash Sharqiyah South':[22.567, 59.529],
  'Al Dhahirah':        [23.225, 56.516],
  'Ad Dhahirah':        [23.225, 56.516],
  'Musandam':           [26.180, 56.248],
  'Al Wusta':           [20.200, 56.500],
  'Al Buraimi':         [24.245, 55.783],
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MapView() {
  const navigate = useNavigate();
  const { colors: P, isDark } = useTheme();
  const [selectedProject, setSelectedProject] = useState<MapProject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  // ─── Fetch projects from API ──────────────────────────────────────────────
  const { data: mapData, isLoading } = useQuery({
    queryKey: ['projects', 'map'],
    queryFn: () => projectService.getProjectsMap(),
    staleTime: 5 * 60 * 1000,
  });

  // Map API projects to local MapProject interface
  const projects: MapProject[] = useMemo(() => {
    const apiProjects = mapData?.data || [];
    return apiProjects
      .filter(p => p.status !== 'archived')
      .map(p => {
        // Resolve lat/lng from the project or fallback to region coordinates
        const fallbackCoords = regionCoords[p.region || ''] || OMAN_CENTER;
        const lat = p.latitude || fallbackCoords[0];
        const lng = p.longitude || fallbackCoords[1];

        return {
          id: p.id,
          name: p.name,
          lat,
          lng,
          governorate: p.region || p.location || 'Unknown',
          category: p.categoryName || 'Community',
          status: p.status as MapProject['status'],
          budget: p.budget || 0,
          spent: p.spent || 0,
          progress: p.progress || 0,
          beneficiaries: p.beneficiaryCount || 0,
          risk: (p.risk || 'low') as MapProject['risk'],
          description: p.description || '',
          endDate: p.endDate || '',
        };
      });
  }, [mapData]);

  const filteredProjects = useMemo(() =>
    projects.filter((p) => {
      const search = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.governorate.toLowerCase().includes(searchQuery.toLowerCase());
      const cat = filterCategory === 'all' || p.category === filterCategory;
      const stat = filterStatus === 'all' || p.status === filterStatus;
      return search && cat && stat;
    }), [projects, searchQuery, filterCategory, filterStatus]);

  const stats = useMemo(() => ({
    total: filteredProjects.length,
    active: filteredProjects.filter(p => p.status === 'active').length,
    totalBudget: filteredProjects.reduce((s, p) => s + p.budget, 0),
    totalBeneficiaries: filteredProjects.reduce((s, p) => s + p.beneficiaries, 0),
    avgProgress: Math.round(filteredProjects.reduce((s, p) => s + p.progress, 0) / (filteredProjects.length || 1)),
    governorates: new Set(filteredProjects.map(p => p.governorate)).size,
  }), [filteredProjects]);

  const categories = useMemo(() => [...new Set(projects.map(p => p.category))], [projects]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#080805' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-60px)] flex" style={{ background: P.bg, fontFamily: 'Inter, sans-serif' }}>

      {/* ── Left Panel ── */}
      <AnimatePresence mode="wait">
        {!panelCollapsed && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="shrink-0 flex flex-col overflow-hidden"
            style={{ borderRight: `1px solid ${P.border}`, background: P.surface }}
          >
            {/* Header */}
            <div className="shrink-0 p-5 space-y-4" style={{ borderBottom: `1px solid ${P.border}` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${P.accent}, ${P.accentLo})`, boxShadow: `0 0 20px rgba(233,30,99,0.15)` }}>
                    <MapPin size={16} className="text-black" />
                  </div>
                  <div>
                    <h1 className="text-sm font-black tracking-tight" style={{ color: P.textHi }}>Project Map</h1>
                    <p className="text-[10px]" style={{ color: P.textLo }}>{stats.total} projects · {stats.governorates} governorates</p>
                  </div>
                </div>
                <button onClick={() => setPanelCollapsed(true)} className="h-7 w-7 rounded-full flex items-center justify-center transition-colors" style={{ color: P.textLo, border: `1px solid ${P.border}` }}>
                  <X size={12} />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: P.textLo }} />
                <input
                  type="text"
                  placeholder="Search projects or governorates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 rounded-full text-xs outline-none transition-colors placeholder:text-[#9CA3AF]"
                  style={{ background: P.card, border: `1px solid ${P.border}`, color: P.textHi }}
                />
                <button onClick={() => setShowFilters(!showFilters)} className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg flex items-center justify-center" style={{ color: showFilters ? P.accent : P.textLo, background: showFilters ? `${P.accent}15` : 'transparent' }}>
                  <Filter size={12} />
                </button>
              </div>

              {/* Filters */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden space-y-3">
                    <div>
                      <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: P.textLo }}>Category</p>
                      <div className="flex flex-wrap gap-1.5">
                        <button onClick={() => setFilterCategory('all')} className="text-[10px] px-2.5 py-1 rounded-full font-medium" style={{ background: filterCategory === 'all' ? `${P.accent}20` : P.card, color: filterCategory === 'all' ? P.accent : P.textLo, border: `1px solid ${filterCategory === 'all' ? P.accent + '40' : P.border}` }}>All</button>
                        {categories.map(c => (
                          <button key={c} onClick={() => setFilterCategory(c)} className="text-[10px] px-2.5 py-1 rounded-full font-medium" style={{ background: filterCategory === c ? `${categoryConfig[c]?.color}20` : P.card, color: filterCategory === c ? categoryConfig[c]?.color : P.textLo, border: `1px solid ${filterCategory === c ? (categoryConfig[c]?.color || P.accent) + '40' : P.border}` }}>{c}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: P.textLo }}>Status</p>
                      <div className="flex flex-wrap gap-1.5">
                        <button onClick={() => setFilterStatus('all')} className="text-[10px] px-2.5 py-1 rounded-full font-medium" style={{ background: filterStatus === 'all' ? `${P.accent}20` : P.card, color: filterStatus === 'all' ? P.accent : P.textLo, border: `1px solid ${filterStatus === 'all' ? P.accent + '40' : P.border}` }}>All</button>
                        {Object.entries(statusConfig).map(([key, cfg]) => (
                          <button key={key} onClick={() => setFilterStatus(key)} className="text-[10px] px-2.5 py-1 rounded-full font-medium" style={{ background: filterStatus === key ? `${cfg.color}20` : P.card, color: filterStatus === key ? cfg.color : P.textLo, border: `1px solid ${filterStatus === key ? cfg.color + '40' : P.border}` }}>{cfg.label}</button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Stats */}
            <div className="shrink-0 grid grid-cols-2 gap-2 p-4" style={{ borderBottom: `1px solid ${P.border}` }}>
              <StatCard icon={FolderKanban} label="Projects" value={stats.total} color="#E91E63" />
              <StatCard icon={Activity} label="Active" value={stats.active} color="#38bdf8" />
              <StatCard icon={Wallet} label="Budget" value={`${(stats.totalBudget / 1000000).toFixed(1)}M`} color="#fbbf24" />
              <StatCard icon={Users} label="People" value={stats.totalBeneficiaries.toLocaleString()} color="#a78bfa" />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ scrollbarWidth: 'thin', scrollbarColor: `${P.borderHi} transparent` }}>
              {filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MapPin size={32} style={{ color: P.textLo }} />
                  <p className="mt-2 text-xs font-medium" style={{ color: P.textMd }}>No projects match</p>
                  <button onClick={() => { setFilterCategory('all'); setFilterStatus('all'); setSearchQuery(''); }} className="mt-3 text-[10px] font-medium px-3 py-1.5 rounded-lg" style={{ color: P.accent, background: `${P.accent}12` }}>Reset</button>
                </div>
              ) : filteredProjects.map((p) => (
                <ProjectCard key={p.id} project={p} isActive={selectedProject?.id === p.id} onClick={() => setSelectedProject(selectedProject?.id === p.id ? null : p)} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel toggle */}
      {panelCollapsed && (
        <motion.button initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} onClick={() => setPanelCollapsed(false)} className="absolute top-4 left-4 z-[1000] h-10 px-3 rounded-xl flex items-center gap-2 hover:scale-105 transition-transform" style={{ background: 'rgba(19,19,16,0.9)', backdropFilter: 'blur(8px)', border: `1px solid ${P.border}`, color: P.textHi, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <Layers size={14} style={{ color: P.accent }} />
          <span className="text-xs font-bold">{stats.total} Projects</span>
          <ChevronDown size={12} className="rotate-[-90deg]" style={{ color: P.textLo }} />
        </motion.button>
      )}

      {/* ── Map ── */}
      <div className="flex-1 relative">
        <MapContainer
          center={OMAN_CENTER}
          zoom={6}
          maxBounds={OMAN_BOUNDS}
          maxBoundsViscosity={0.8}
          zoomControl={false}
          attributionControl={false}
          className="h-full w-full"
          style={{ background: '#0a0a08' }}
        >
          <TileLayer url={isDark ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"} />

          {/* Heat circles - colored by status */}
          {filteredProjects.map((p) => (
            <CircleMarker key={`h-${p.id}`} center={[p.lat, p.lng]} radius={18 + (p.budget / 100000) * 3} pathOptions={{ fillColor: statusConfig[p.status]?.color || '#E91E63', fillOpacity: 0.12, stroke: false }} />
          ))}

          {/* Markers - colored by status */}
          {filteredProjects.map((p) => {
            const cc = categoryConfig[p.category];
            const sc = statusConfig[p.status] || statusConfig.active;
            const rc = riskConfig[p.risk] || riskConfig.low;
            const budgetPct = Math.round((p.spent / p.budget) * 100);
            return (
              <Marker key={p.id} position={[p.lat, p.lng]} icon={createMarkerIcon(sc.color, p.risk)} eventHandlers={{ click: () => setSelectedProject(p) }}>
                <Popup className="custom-popup" maxWidth={340} minWidth={300}>
                  <div style={{ background: P.card, border: `1px solid ${P.borderHi}`, borderRadius: 16, padding: 20, fontFamily: 'Inter, sans-serif', color: P.textHi, minWidth: 280 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${cc?.color}15`, border: `1px solid ${cc?.color}30`, flexShrink: 0 }}>
                        {cc?.icon && <cc.icon size={18} style={{ color: cc.color }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: 13, fontWeight: 800, color: P.textHi, margin: 0 }}>{p.name}</h3>
                        <p style={{ fontSize: 11, color: P.textLo, margin: '2px 0 0' }}>{p.governorate} · {p.category}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: sc.bg, color: sc.color }}>{sc.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: rc.bg, color: rc.color, textTransform: 'capitalize' as const }}>{p.risk} Risk</span>
                    </div>
                    <p style={{ fontSize: 11, lineHeight: 1.6, color: P.textMd, margin: '0 0 10px' }}>{p.description}</p>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: P.textLo }}>Progress</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: P.textMd }}>{p.progress}%</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 99, background: P.border, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 99, width: `${p.progress}%`, background: p.progress === 100 ? '#34d399' : sc.color }} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        { lbl: 'Budget', val: `${(p.budget / 1000).toFixed(0)}k OMR` },
                        { lbl: 'Spent', val: `${budgetPct}%` },
                        { lbl: 'Beneficiaries', val: p.beneficiaries.toLocaleString() },
                        { lbl: 'Deadline', val: p.endDate },
                      ].map(s => (
                        <div key={s.lbl} style={{ padding: '6px 8px', borderRadius: 10, background: P.surface, border: `1px solid ${P.border}` }}>
                          <p style={{ fontSize: 9, color: P.textLo, marginBottom: 2 }}>{s.lbl}</p>
                          <p style={{ fontSize: 11, fontWeight: 700, color: P.textHi, margin: 0 }}>{s.val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          <MapControls />
        </MapContainer>

        {/* Overlay stats */}
        <div className="absolute top-4 right-4 z-[1000]" style={{ pointerEvents: 'none' }}>
          <div className="grid grid-cols-3 gap-2" style={{ pointerEvents: 'auto' }}>
            {[
              { label: 'Total Budget', value: `${(stats.totalBudget / 1000000).toFixed(1)}M`, color: '#fbbf24', icon: Wallet },
              { label: 'Avg Progress', value: `${stats.avgProgress}%`, color: '#38bdf8', icon: TrendingUp },
              { label: 'Beneficiaries', value: stats.totalBeneficiaries.toLocaleString(), color: '#34d399', icon: Users },
            ].map(s => (
              <div key={s.label} className="px-3 py-2 rounded-full" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', border: `1px solid ${P.border}`, boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <s.icon size={10} style={{ color: s.color }} />
                  <p className="text-[9px] font-medium tracking-wider uppercase" style={{ color: P.textLo }}>{s.label}</p>
                </div>
                <p className="text-sm font-black tabular-nums" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Legend - Status Colors */}
        <div className="absolute bottom-6 left-6 z-[1000]">
          <div className="flex items-center gap-4 px-4 py-2.5 rounded-full" style={{ background: 'rgba(19,19,16,0.9)', backdropFilter: 'blur(12px)', border: `1px solid ${P.border}`, boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: P.textLo }}>Status:</span>
            {Object.entries(statusConfig).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full" style={{ background: cfg.color, boxShadow: `0 0 8px ${cfg.color}60` }} />
                <span className="text-[10px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected project flyout */}
        <AnimatePresence>
          {selectedProject && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[1000] w-[600px] max-w-[calc(100%-2rem)]"
            >
              <div className="rounded-2xl p-5 relative" style={{ background: 'rgba(19,19,16,0.95)', backdropFilter: 'blur(20px)', border: `1px solid ${P.borderHi}`, boxShadow: `0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px ${P.border}` }}>
                <button onClick={() => setSelectedProject(null)} className="absolute top-3 right-3 h-7 w-7 rounded-full flex items-center justify-center" style={{ color: P.textLo, border: `1px solid ${P.border}` }}>
                  <X size={12} />
                </button>
                <div className="flex gap-5">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: statusConfig[selectedProject.status].color }} />
                      <h3 className="text-sm font-black" style={{ color: P.textHi }}>{selectedProject.name}</h3>
                    </div>
                    <p className="text-[11px] leading-relaxed mb-3" style={{ color: P.textMd }}>{selectedProject.description}</p>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: statusConfig[selectedProject.status].bg, color: statusConfig[selectedProject.status].color }}>{statusConfig[selectedProject.status].label}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize" style={{ background: riskConfig[selectedProject.risk].bg, color: riskConfig[selectedProject.risk].color }}>{selectedProject.risk} Risk</span>
                      <span className="text-[10px]" style={{ color: P.textLo }}>{selectedProject.governorate}</span>
                      <button onClick={() => navigate(`/projects/${selectedProject.id}`)} className="ml-auto text-[10px] font-bold px-3 py-1 rounded-lg transition-colors" style={{ background: `${P.accent}15`, color: P.accent, border: `1px solid ${P.accent}25` }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = `${P.accent}30`)}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = `${P.accent}15`)}>
                        View Details →
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 shrink-0 w-48">
                    {[
                      { l: 'Budget', v: `${(selectedProject.budget / 1000).toFixed(0)}k`, c: '#fbbf24' },
                      { l: 'Progress', v: `${selectedProject.progress}%`, c: '#38bdf8' },
                      { l: 'People', v: selectedProject.beneficiaries.toLocaleString(), c: '#a78bfa' },
                      { l: 'Due', v: selectedProject.endDate.slice(0, 7), c: '#34d399' },
                    ].map(s => (
                      <div key={s.l} className="px-3 py-2 rounded-full text-center" style={{ background: `${s.c}08`, border: `1px solid ${s.c}18` }}>
                        <p className="text-sm font-black tabular-nums" style={{ color: s.c }}>{s.v}</p>
                        <p className="text-[9px] mt-0.5" style={{ color: P.textLo }}>{s.l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
