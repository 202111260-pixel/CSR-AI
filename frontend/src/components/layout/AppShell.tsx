import { useState, useRef, useEffect, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from './Sidebar.tsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, ChevronDown, ChevronRight, X, Command, ArrowRight, Sun, Moon, Gauge } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/api';
import { NotificationHub } from '../notifications/NotificationHub';

const searchPages = [
  { label: 'Dashboard',      path: '/dashboard',          icon: '📊' },
  { label: 'All Projects',   path: '/projects',           icon: '📁' },
  { label: 'Archived',       path: '/projects/archived',  icon: '🗄️' },
  { label: 'General Reports',path: '/reports/general',    icon: '📄' },
  { label: 'Impact Reports', path: '/reports/impact',     icon: '🎯' },
  { label: 'Financial Reports',path: '/reports/financial',icon: '💰' },
  { label: 'Users',          path: '/admin/users',        icon: '👥' },
  { label: 'Categories',     path: '/admin/categories',   icon: '🏷️' },
  { label: 'Partners',       path: '/partners',           icon: '🤝' },
  { label: 'Ideas Hub',      path: '/ideas',              icon: '💡' },
  { label: 'Social Media',   path: '/social-media',       icon: '📱' },
  { label: 'Future Portal',  path: '/future',             icon: '🚀' },
  { label: 'Early Warning',  path: '/early-warning',      icon: '⚠️' },
  { label: 'Map View',       path: '/map',                icon: '🗺️' },
  { label: 'Settings',       path: '/settings',           icon: '⚙️' },
];

function getBreadcrumb(path: string): { label: string; parent?: { label: string; path: string } } {
  const map: Record<string, { label: string; parent?: { label: string; path: string } }> = {
    '/dashboard': { label: 'Dashboard' },
    '/projects': { label: 'Projects' },
    '/projects/add': { label: 'Add Project', parent: { label: 'Projects', path: '/projects' } },
    '/projects/archived': { label: 'Archived', parent: { label: 'Projects', path: '/projects' } },
    '/reports/general': { label: 'General Reports' },
    '/reports/impact': { label: 'Impact Reports' },
    '/reports/financial': { label: 'Financial Reports' },
    '/admin/users': { label: 'Users' },
    '/admin/categories': { label: 'Categories' },
    '/partners': { label: 'Partners' },
    '/ideas': { label: 'Ideas Hub' },
    '/social-media': { label: 'Social Media' },
    '/future': { label: 'Future Portal' },
    '/early-warning': { label: 'Early Warning' },
    '/map': { label: 'Map View' },
    '/settings': { label: 'Settings' },
  };

  // Dynamic routes
  if (/^\/projects\/edit\//.test(path)) {
    return { label: 'Edit Project', parent: { label: 'Projects', path: '/projects' } };
  }
  if (/^\/projects\/[^/]+$/.test(path) && path !== '/projects/add' && path !== '/projects/archived') {
    return { label: 'Project Details', parent: { label: 'Projects', path: '/projects' } };
  }

  return map[path] || { label: 'Dashboard' };
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number>(window.innerWidth);
  const [fitMode, setFitMode] = useState<boolean>(() => {
    try {
      const saved = window.localStorage.getItem('ui-fit-mode');
      if (saved === null) return window.innerWidth <= 1536;
      return saved === '1';
    } catch {
      return window.innerWidth <= 1536;
    }
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const didInitCollapse = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);
  const scrollAccumulator = useRef(0);
  const location = useLocation();
  const navigate = useNavigate();

  const isLaptopWidth = viewportWidth <= 1536;
  const sidebarExpandedWidth = isLaptopWidth ? 220 : 256;
  const sidebarCollapsedWidth = 66;
  const fitScale = Math.max(0.76, Math.min(1, viewportWidth / 1680));
  const applyFit = fitMode && viewportWidth >= 900 && viewportWidth < 1800;
  const sidebarBaseOffset = collapsed ? sidebarCollapsedWidth : sidebarExpandedWidth;
  const contentOffset = applyFit ? sidebarBaseOffset / fitScale : sidebarBaseOffset;

  // Theme
  const { colors: C, toggleTheme, isDark } = useTheme();
  // Auth
  const user = useAuthStore(s => s.user);
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'A';
  const userName = user?.name ?? 'Admin';
  const userEmail = user?.email ?? 'admin@csr.local';
  const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
  const userAvatarUrl = user?.avatarUrl
    ? (user.avatarUrl.startsWith('http') ? user.avatarUrl : `${apiBaseUrl}${user.avatarUrl.startsWith('/') ? '' : '/'}${user.avatarUrl}`)
    : null;

  // Notification count from API
  const { data: notifData } = useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: () => api.get('/notifications?limit=1').then(r => r.data),
    refetchInterval: 30000,
  });
  const unreadCount = (notifData?.data?.unreadCount as number) ?? 0;

  const filtered = searchQuery.trim()
    ? searchPages.filter(p => p.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : searchPages;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (searchOpen) { setTimeout(() => searchRef.current?.focus(), 100); setSearchQuery(''); setSelectedIdx(0); }
  }, [searchOpen]);

  useEffect(() => { setSelectedIdx(0); }, [searchQuery]);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!didInitCollapse.current) {
      setCollapsed(isLaptopWidth);
      didInitCollapse.current = true;
    }
  }, [isLaptopWidth]);

  useEffect(() => {
    try {
      window.localStorage.setItem('ui-fit-mode', fitMode ? '1' : '0');
    } catch {
      // ignore storage errors
    }
  }, [fitMode]);

  // Scroll-direction sidebar auto-hide
  const handleScroll = useCallback(() => {
    const el = mainRef.current;
    if (!el) return;
    const currentY = el.scrollTop;
    const delta = currentY - lastScrollY.current;
    lastScrollY.current = currentY;

    // Accumulate scroll in one direction; reset on direction change
    if ((delta > 0 && scrollAccumulator.current < 0) || (delta < 0 && scrollAccumulator.current > 0)) {
      scrollAccumulator.current = 0;
    }
    scrollAccumulator.current += delta;

    const THRESHOLD = 60;
    if (scrollAccumulator.current > THRESHOLD && currentY > 120) {
      setSidebarHidden(true);
    } else if (scrollAccumulator.current < -THRESHOLD || currentY <= 60) {
      setSidebarHidden(false);
    }
  }, []);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const effectiveSidebarOffset = sidebarHidden ? 0 : sidebarBaseOffset;
  const effectiveContentOffset = applyFit ? effectiveSidebarOffset / fitScale : effectiveSidebarOffset;

  const goTo = (path: string) => { setSearchOpen(false); navigate(path); };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(p => Math.min(p + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIdx(p => Math.max(p - 1, 0)); }
    if (e.key === 'Enter' && filtered[selectedIdx]) { goTo(filtered[selectedIdx].path); }
  };

  return (
    <div className="flex min-h-screen" style={{ background: C.bg }}>
      <Sidebar
        collapsed={collapsed}
        onCollapse={setCollapsed}
        expandedWidth={sidebarExpandedWidth}
        collapsedWidth={sidebarCollapsedWidth}
        hidden={sidebarHidden}
      />

      <div
        className="flex flex-1 flex-col"
        style={{
          marginLeft: effectiveContentOffset,
          zoom: applyFit ? fitScale : 1,
          transition: 'margin-left 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* ── Top Bar ── */}
        <header role="banner" className="sticky top-0 z-40 shrink-0 px-3 pt-2.5 pb-0" style={{ fontFamily: "'IBM Plex Sans Arabic', 'DM Sans', sans-serif" }}>
          <div className="relative rounded-2xl overflow-hidden" style={{
            background: isDark ? 'rgba(10,10,10, 0.96)' : 'rgba(255,253,249,0.97)',
            border: `1px solid ${isDark ? 'rgba(26,26,26, 0.60)' : 'rgba(200,164,78,0.15)'}`,
            boxShadow: isDark
              ? `0 8px 40px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.2), inset 0 1px 0 rgba(200,164,78,0.05)`
              : `0 8px 40px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)`,
          }}>
            {/* Animated scanning shimmer line */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] overflow-hidden">
              <motion.div
                className="h-full w-[200%]"
                style={{ background: `linear-gradient(90deg, transparent 0%, ${C.accent}00 20%, ${C.accent}70 40%, ${C.accent} 50%, ${C.accent}70 60%, ${C.accent}00 80%, transparent 100%)` }}
                animate={{ x: ['-50%', '0%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              />
            </div>

            {/* Main bar */}
            <div className="relative flex h-[52px] items-center justify-between px-5 gap-4">

              {/* ── Left: Breadcrumb ── */}
              <div className="flex items-center gap-3 min-w-0">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-1 min-w-0" aria-label="Breadcrumb">
                  {(() => {
                    const bc = getBreadcrumb(location.pathname);
                    return (
                      <>
                        {bc.parent && (
                          <>
                            <button
                              onClick={() => navigate(bc.parent!.path)}
                              className="text-[12px] font-medium px-2 py-1 rounded-lg transition-all duration-200 shrink-0"
                              style={{ color: C.textLo }}
                              onMouseEnter={e => { e.currentTarget.style.color = C.textHi; e.currentTarget.style.background = isDark ? 'rgba(200,164,78,0.06)' : 'rgba(0,0,0,0.04)'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = C.textLo; e.currentTarget.style.background = 'transparent'; }}
                            >
                              {bc.parent.label}
                            </button>
                            <ChevronRight size={11} strokeWidth={2.5} style={{ color: `${C.textLo}35` }} className="shrink-0" />
                          </>
                        )}
                        <motion.span
                          key={bc.label}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.25 }}
                          className="text-[12px] font-semibold px-2.5 py-1 rounded-lg truncate"
                          style={{
                            color: C.accent,
                            background: `${C.accent}10`,
                            border: `1px solid ${C.accent}18`,
                          }}
                        >{bc.label}</motion.span>
                      </>
                    );
                  })()}
                </nav>
              </div>

              {/* ── Center: Search bar ── */}
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-3 rounded-xl px-4 py-[7px] transition-all duration-300 flex-1 max-w-[380px]"
                style={{
                  background: isDark ? '#000000' : 'rgba(0,0,0,0.025)',
                  border: `1px solid ${isDark ? '#1a1a1a' : 'rgba(200,164,78,0.15)'}`,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = isDark ? 'rgba(200,164,78,0.3)' : 'rgba(200,164,78,0.35)';
                  e.currentTarget.style.boxShadow = `0 0 12px rgba(200,164,78,0.08)`;
                  e.currentTarget.style.background = isDark ? '#0a0a0a' : 'rgba(0,0,0,0.04)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = isDark ? '#1a1a1a' : 'rgba(200,164,78,0.15)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.background = isDark ? '#000000' : 'rgba(0,0,0,0.025)';
                }}
                aria-label="Search pages (Cmd+K)"
              >
                <Search size={13} style={{ color: C.textLo }} />
                <span className="text-[11.5px] flex-1 text-left hidden sm:block" style={{ color: C.textLo }}>Search pages, reports, settings...</span>
                <kbd className="hidden sm:flex items-center gap-0.5 text-[9px] font-bold px-2 py-[3px] rounded-md" style={{
                  background: isDark ? 'rgba(200,164,78,0.06)' : 'rgba(0,0,0,0.04)',
                  color: isDark ? 'rgba(200,164,78,0.5)' : C.textLo,
                  border: `1px solid ${isDark ? 'rgba(200,164,78,0.12)' : 'rgba(0,0,0,0.06)'}`,
                  fontFamily: "'Geist Mono', 'Space Grotesk', monospace",
                }}>
                  <Command size={8} />K
                </kbd>
              </button>

              {/* ── Right: Action cluster ── */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Fit mode toggle */}
                <button
                  onClick={() => setFitMode(prev => !prev)}
                  className="hidden lg:flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[10px] font-bold transition-all duration-200"
                  style={{
                    background: fitMode ? `${C.accent}16` : (isDark ? 'rgba(26,26,26, 0.3)' : 'rgba(0,0,0,0.025)'),
                    color: fitMode ? C.accent : C.textMd,
                    border: `1px solid ${fitMode ? `${C.accent}38` : (isDark ? 'rgba(26,26,26, 0.6)' : 'rgba(0,0,0,0.06)')}`,
                  }}
                  title={fitMode ? 'Disable Fit Mode' : 'Enable Fit Mode'}
                  aria-label={fitMode ? 'Disable Fit Mode' : 'Enable Fit Mode'}
                >
                  <Gauge size={12} />
                  <span>{fitMode ? `Fit ${Math.round(fitScale * 100)}%` : 'Fit Off'}</span>
                </button>

                {/* Glass action group */}
                <div className="flex items-center gap-0.5 rounded-xl px-1 py-0.5" style={{
                  background: isDark ? 'rgba(10,10,10, 0.50)' : 'rgba(0,0,0,0.025)',
                  border: `1px solid ${isDark ? 'rgba(26,26,26, 0.60)' : 'rgba(0,0,0,0.06)'}`,
                }}>
                  {/* Theme toggle */}
                  <motion.button
                    whileHover={{ scale: 1.12 }}
                    whileTap={{ scale: 0.88 }}
                    onClick={toggleTheme}
                    className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] transition-all duration-200"
                    style={{ background: 'transparent' }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = isDark ? 'rgba(200,164,78,0.08)' : 'rgba(0,0,0,0.05)';
                      e.currentTarget.style.boxShadow = `0 0 12px rgba(200,164,78,0.12)`;
                    }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
                    title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  >
                    <AnimatePresence mode="wait">
                      {isDark ? (
                        <motion.div key="sun" initial={{ rotate: -90, opacity: 0, scale: 0.5 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: 90, opacity: 0, scale: 0.5 }} transition={{ duration: 0.25, ease: 'backOut' }}>
                          <Sun size={14} style={{ color: '#fbbf24' }} />
                        </motion.div>
                      ) : (
                        <motion.div key="moon" initial={{ rotate: 90, opacity: 0, scale: 0.5 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: -90, opacity: 0, scale: 0.5 }} transition={{ duration: 0.25, ease: 'backOut' }}>
                          <Moon size={14} style={{ color: '#818cf8' }} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  {/* Inner divider */}
                  <div className="w-px h-4 mx-0.5" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />

                  {/* Notification bell */}
                  <motion.button
                    whileHover={{ scale: 1.12 }}
                    whileTap={{ scale: 0.88 }}
                    onClick={() => setNotifOpen(prev => !prev)}
                    className="relative flex h-[30px] w-[30px] items-center justify-center rounded-[10px] transition-all duration-200"
                    style={{ background: 'transparent' }}
                    onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    aria-label={`Notifications (${unreadCount} unread)`}
                  >
                    <motion.div
                      animate={unreadCount > 0 ? { rotate: [0, 15, -15, 10, -10, 0] } : {}}
                      transition={{ duration: 0.6, repeat: unreadCount > 0 ? Infinity : 0, repeatDelay: 5 }}
                    >
                      <Bell size={14} style={{ color: unreadCount > 0 ? C.accent : C.textLo }} />
                    </motion.div>
                    {unreadCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -right-0.5 -top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full text-[8px] font-black px-0.5"
                        style={{
                          background: `linear-gradient(135deg, ${C.accent}, ${isDark ? '#F48FB1' : '#60a5fa'})`,
                          color: C.bg,
                          boxShadow: `0 0 10px ${C.accent}40`,
                          fontFamily: "'Space Grotesk', sans-serif",
                        }}
                      >{unreadCount > 99 ? '99+' : unreadCount}</motion.span>
                    )}
                  </motion.button>
                </div>

                {/* User profile pill */}
                <button
                  className="flex items-center gap-2 rounded-xl pl-1 pr-2.5 py-1 transition-all duration-200"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = `${C.accent}28`;
                    e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
                    e.currentTarget.style.boxShadow = `0 2px 12px ${C.accent}06`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
                    e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  aria-label="User menu"
                >
                  <div className="relative">
                    {userAvatarUrl ? (
                      <img
                        src={userAvatarUrl}
                        alt={`${userName} avatar`}
                        className="w-7 h-7 rounded-full object-cover"
                        style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement | null;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="w-7 h-7 rounded-full items-center justify-center text-[11px] font-black"
                      style={{
                        display: userAvatarUrl ? 'none' : 'flex',
                        background: `linear-gradient(135deg, ${C.accent}, ${isDark ? '#F48FB1' : '#60a5fa'})`,
                        color: C.bg,
                      }}
                    >
                      {userInitial}
                    </div>
                    <motion.div
                      className="absolute -bottom-[1px] -right-[1px] w-2.5 h-2.5 rounded-full"
                      style={{ background: '#22c55e', border: `2px solid ${isDark ? 'rgba(14,14,9,0.82)' : 'rgba(255,255,255,0.78)'}` }}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </div>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-[11px] font-semibold leading-tight" style={{ color: C.textHi }}>{userName}</span>
                    <span className="text-[9px] font-medium leading-tight" style={{ color: C.textLo }}>{userEmail}</span>
                  </div>
                  <ChevronDown size={10} style={{ color: C.textLo }} className="ml-0.5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ── Notification Hub ── */}
        <AnimatePresence>
          {notifOpen && <NotificationHub open={notifOpen} onClose={() => setNotifOpen(false)} />}
        </AnimatePresence>

        {/* ── Command Palette Overlay ── */}
        <AnimatePresence>
          {searchOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-[100]"
                style={{ background: 'rgba(0,0,0,0.65)' }}
                onClick={() => setSearchOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -10 }}
                transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="fixed top-[15%] left-1/2 -translate-x-1/2 z-[101] w-[520px] max-w-[90vw] rounded-2xl overflow-hidden"
                style={{ background: C.surface, border: `1px solid ${C.borderHi}`, boxShadow: `0 24px 80px rgba(0,0,0,0.05), 0 0 0 1px ${C.border}, 0 0 60px ${C.accent}10` }}
              >
                {/* Search input */}
                <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <Search size={16} style={{ color: C.accent, flexShrink: 0 }} />
                  <input
                    ref={searchRef}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search pages, reports, settings..."
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: C.textHi, caretColor: C.accent }}
                  />
                  <button onClick={() => setSearchOpen(false)} className="flex items-center justify-center w-6 h-6 rounded-lg transition-colors" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                    <X size={12} style={{ color: C.textLo }} />
                  </button>
                </div>
                {/* Results */}
                <div className="max-h-[320px] overflow-y-auto py-2 px-2" style={{ scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent` }}>
                  {filtered.length === 0 ? (
                    <p className="text-center text-xs py-8" style={{ color: C.textLo }}>No results found</p>
                  ) : (
                    filtered.map((p, i) => (
                      <motion.button
                        key={p.path}
                        onClick={() => goTo(p.path)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors"
                        style={{
                          background: i === selectedIdx ? C.card : 'transparent',
                          border: i === selectedIdx ? `1px solid ${C.border}` : '1px solid transparent',
                        }}
                        onMouseEnter={() => setSelectedIdx(i)}
                        initial={false}
                        animate={{ x: 0, background: i === selectedIdx ? C.card : 'transparent' }}
                        whileHover={{ x: 3, background: C.card, transition: { duration: 0.15 } }}
                      >
                        <span className="text-base">{p.icon}</span>
                        <span className="flex-1 text-sm font-medium" style={{ color: i === selectedIdx ? C.textHi : C.textMd }}>{p.label}</span>
                        {i === selectedIdx && <ArrowRight size={13} style={{ color: C.accent }} />}
                      </motion.button>
                    ))
                  )}
                </div>
                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: `1px solid ${C.border}` }}>
                  <div className="flex items-center gap-3 text-[10px]" style={{ color: C.textLo }}>
                    <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded" style={{ background: C.card, border: `1px solid ${C.border}` }}>↑↓</kbd> Navigate</span>
                    <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded" style={{ background: C.card, border: `1px solid ${C.border}` }}>↵</kbd> Open</span>
                    <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded" style={{ background: C.card, border: `1px solid ${C.border}` }}>Esc</kbd> Close</span>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <main ref={mainRef} role="main" className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppShell;
