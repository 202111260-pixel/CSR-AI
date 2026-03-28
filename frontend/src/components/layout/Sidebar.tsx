import { useState, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PiSquaresFourDuotone, PiSquaresFourFill,
  PiKanbanDuotone, PiKanbanFill,
  PiPlusCircleDuotone, PiPlusCircleFill,
  PiArchiveDuotone, PiArchiveFill,
  PiFileTextDuotone, PiFileTextFill,
  PiTargetDuotone, PiTargetFill,
  PiCurrencyDollarDuotone, PiCurrencyDollarFill,
  PiUsersThreeDuotone, PiUsersThreeFill,
  PiTagDuotone, PiTagFill,
  PiHandshakeDuotone, PiHandshakeFill,
  PiLightbulbDuotone, PiLightbulbFill,
  PiShareNetworkDuotone, PiShareNetworkFill,
  PiRocketLaunchDuotone, PiRocketLaunchFill,
  PiWarningDiamondDuotone, PiWarningDiamondFill,
  PiMapPinDuotone, PiMapPinFill,
  PiGearSixDuotone, PiGearSixFill,
  PiShieldCheckFill,
  PiMagnifyingGlassDuotone,
  PiCaretLeftBold, PiCaretRightBold, PiCaretDownBold,
  PiSignOutDuotone,
  PiCrownDuotone,
} from 'react-icons/pi';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../stores/authStore';

// ── Types ────────────────────────────────────────────────────────────────────
interface SidebarProps {
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  expandedWidth?: number;
  collapsedWidth?: number;
  hidden?: boolean;
}

type IconComponent = React.ComponentType<{ size?: number; style?: React.CSSProperties }>;

interface SubItem {
  label: string;
  anchor?: string; // used for scroll-to-section or highlight only
  path?: string;   // used for actual navigation
}

interface NavItem {
  label: string;
  icon: IconComponent;
  iconActive: IconComponent;
  path: string;
  badge?: number;
  color: string;
  children?: SubItem[];
}

interface NavGroup {
  section: string;
  description?: string;
  items: NavItem[];
}

// ── Navigation Data ──────────────────────────────────────────────────────────
const navGroups: NavGroup[] = [
  {
    section: 'ANALYTICS',
    description: 'Charts & insights',
    items: [
      {
        label: 'Dashboard',
        icon: PiSquaresFourDuotone,
        iconActive: PiSquaresFourFill,
        path: '/dashboard',
        color: '#C9C036',
        children: [
          { label: 'KPI Summary', anchor: 'kpis' },
          { label: 'Budget Trends', anchor: 'budget-trend' },
          { label: 'Project Distribution', anchor: 'distribution' },
          { label: 'Recent Activity', anchor: 'activity' },
          { label: 'Top Partners', anchor: 'partners' },
        ],
      },
      {
        label: 'General',
        icon: PiFileTextDuotone,
        iconActive: PiFileTextFill,
        path: '/reports/general',
        color: '#fb923c',
        children: [
          { label: 'Status Distribution', anchor: 'status' },
          { label: 'Regional Analysis', anchor: 'regional' },
          { label: 'Temporal Trends', anchor: 'temporal' },
          { label: 'Export Data', anchor: 'export' },
        ],
      },
      {
        label: 'Impact',
        icon: PiTargetDuotone,
        iconActive: PiTargetFill,
        path: '/reports/impact',
        color: '#E91E63',
        children: [
          { label: 'Beneficiary Demographics', anchor: 'beneficiaries' },
          { label: 'SDG Alignment', anchor: 'sdg' },
          { label: 'Gender Analysis', anchor: 'gender' },
        ],
      },
      {
        label: 'Financial',
        icon: PiCurrencyDollarDuotone,
        iconActive: PiCurrencyDollarFill,
        path: '/reports/financial',
        color: '#fbbf24',
        children: [
          { label: 'Budget Utilization', anchor: 'budget' },
          { label: 'Expense Breakdown', anchor: 'expenses' },
          { label: 'Monthly Trends', anchor: 'trends' },
        ],
      },
      {
        label: 'Early Warning',
        icon: PiWarningDiamondDuotone,
        iconActive: PiWarningDiamondFill,
        path: '/early-warning',
        badge: 3,
        color: '#f87171',
        children: [
          { label: 'Active Alerts', anchor: 'active' },
          { label: 'Resolved', anchor: 'resolved' },
          { label: 'Statistics', anchor: 'stats' },
        ],
      },
      { label: 'Map View', icon: PiMapPinDuotone, iconActive: PiMapPinFill, path: '/map', color: '#34d399' },
      {
        label: 'Categories',
        icon: PiTagDuotone,
        iconActive: PiTagFill,
        path: '/admin/categories',
        color: '#a78bfa',
        children: [
          { label: 'Category List', anchor: 'list' },
          { label: 'Analytics', anchor: 'analytics' },
        ],
      },
    ],
  },
  {
    section: 'AI & INTELLIGENCE',
    description: 'Predictions & AI',
    items: [
      {
        label: 'Future Portal',
        icon: PiRocketLaunchDuotone,
        iconActive: PiRocketLaunchFill,
        path: '/future',
        color: '#E91E63',
        children: [
          { label: 'Predictions', anchor: 'predictions' },
          { label: 'AI Analytics', anchor: 'ai-analytics' },
          { label: 'Recommendations', anchor: 'recommendations' },
        ],
      },
      {
        label: 'Social Analytics',
        icon: PiShareNetworkDuotone,
        iconActive: PiShareNetworkFill,
        path: '/social-media',
        color: '#38bdf8',
        children: [
          { label: 'Engagement Overview', anchor: 'engagement' },
          { label: 'Activity Trends', anchor: 'trends' },
        ],
      },
      {
        label: 'Ideas Hub',
        icon: PiLightbulbDuotone,
        iconActive: PiLightbulbFill,
        path: '/ideas',
        badge: 12,
        color: '#fbbf24',
        children: [
          { label: 'All Ideas', anchor: 'ideas' },
          { label: 'Top Contributors', anchor: 'leaderboard' },
          { label: 'Statistics', anchor: 'stats' },
        ],
      },
    ],
  },
  {
    section: 'PROJECTS',
    description: 'Manage CSR initiatives',
    items: [
      {
        label: 'All Projects',
        icon: PiKanbanDuotone,
        iconActive: PiKanbanFill,
        path: '/projects',
        color: '#38bdf8',
        children: [
          { label: 'Active', anchor: 'active' },
          { label: 'Planning', anchor: 'planning' },
          { label: 'On Hold', anchor: 'on_hold' },
          { label: 'Completed', anchor: 'completed' },
        ],
      },
      {
        label: 'Add Project',
        icon: PiPlusCircleDuotone,
        iconActive: PiPlusCircleFill,
        path: '/projects/add',
        color: '#34d399',
        children: [
          { label: 'Basic Info', anchor: 'step-1' },
          { label: 'Budget & Timeline', anchor: 'step-2' },
          { label: 'Beneficiaries', anchor: 'step-3' },
          { label: 'Location & Partners', anchor: 'step-4' },
          { label: 'Media & Documents', anchor: 'step-5' },
          { label: 'Review & Submit', anchor: 'step-6' },
        ],
      },
      {
        label: 'Archived',
        icon: PiArchiveDuotone,
        iconActive: PiArchiveFill,
        path: '/projects/archived',
        color: '#a78bfa',
      },
    ],
  },
  {
    section: 'ADMINISTRATION',
    description: 'System management',
    items: [
      {
        label: 'Users',
        icon: PiUsersThreeDuotone,
        iconActive: PiUsersThreeFill,
        path: '/admin/users',
        color: '#38bdf8',
        children: [
          { label: 'User Directory', anchor: 'directory' },
          { label: 'Role Distribution', anchor: 'roles' },
          { label: 'Department Stats', anchor: 'departments' },
        ],
      },
      {
        label: 'Partners',
        icon: PiHandshakeDuotone,
        iconActive: PiHandshakeFill,
        path: '/partners',
        color: '#34d399',
        children: [
          { label: 'Partner Directory', anchor: 'partners' },
          { label: 'Donations', anchor: 'donations' },
          { label: 'Leaderboard', anchor: 'leaderboard' },
        ],
      },
    ],
  },
  {
    section: 'TOOLS',
    description: 'Utilities & config',
    items: [
      {
        label: 'Settings',
        icon: PiGearSixDuotone,
        iconActive: PiGearSixFill,
        path: '/settings',
        color: '#a78bfa',
        children: [
          { label: 'Profile', anchor: 'profile' },
          { label: 'Security & 2FA', anchor: 'security' },
          { label: 'System Settings', anchor: 'system' },
        ],
      },
    ],
  },
];

// ── Animation ────────────────────────────────────────────────────────────────
const EASE = [0.25, 0.46, 0.45, 0.94] as const;

const sectionVariants = {
  open: { height: 'auto', opacity: 1, transition: { duration: 0.2, ease: EASE } },
  closed: { height: 0, opacity: 0, transition: { duration: 0.15, ease: EASE } },
};

const childrenVariants = {
  open: { height: 'auto', opacity: 1, transition: { duration: 0.18, ease: EASE } },
  closed: { height: 0, opacity: 0, transition: { duration: 0.12, ease: EASE } },
};

const navItemVariants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } },
};

const navListVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.02, delayChildren: 0.03 } },
};

// ── Role Labels ──────────────────────────────────────────────────────────────
const roleMeta: Record<string, { label: string; color: string }> = {
  admin: { label: 'Administrator', color: '#fbbf24' },
  manager: { label: 'Project Manager', color: '#38bdf8' },
  employee: { label: 'Employee', color: '#34d399' },
  viewer: { label: 'Viewer', color: '#a78bfa' },
};

// ── Sub Components ───────────────────────────────────────────────────────────

function BrandHeader({ collapsed, C }: { collapsed: boolean; C: Record<string, string> }) {
  return (
    <div
      className="flex items-center shrink-0"
      style={{ height: 60, padding: collapsed ? '0 13px' : '0 20px', borderBottom: `1px solid ${C.border}` }}
    >
      <div className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 10, background: 'white', padding: 3 }}>
        <img src="/logo2.jpeg" alt="CSR" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 7 }} />
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            className="ml-3 overflow-hidden"
          >
            <p className="text-[14px] font-bold tracking-tight leading-none" style={{ color: C.text }}>
              CSR <span style={{ color: C.accent }}>Platform</span>
            </p>
            <p className="text-[9px] mt-1 font-medium" style={{ color: C.textMd }}>
              Corporate Social Responsibility
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MiniSearch({ collapsed, C }: { collapsed: boolean; C: Record<string, string> }) {
  const dispatch = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true, bubbles: true }));

  if (collapsed) {
    return (
      <div className="flex justify-center py-2">
        <button
          onClick={dispatch}
          className="flex items-center justify-center rounded-xl transition-colors"
          style={{ width: 38, height: 38, border: `1px solid ${C.border}`, color: C.textMd }}
          title="Search (Ctrl+K)"
        >
          <PiMagnifyingGlassDuotone size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="px-3 py-2">
      <button
        onClick={dispatch}
        className="w-full flex items-center rounded-xl cursor-pointer transition-colors"
        style={{ height: 36, border: `1px solid ${C.border}` }}
      >
        <PiMagnifyingGlassDuotone size={13} style={{ color: C.textMd, marginLeft: 12, flexShrink: 0 }} />
        <span className="flex-1 text-[11.5px] text-left px-2.5" style={{ color: C.textMd }}>Quick find...</span>
        <kbd className="text-[9px] font-medium px-1.5 py-0.5 rounded-md mr-2.5" style={{ color: C.textMd, border: `1px solid ${C.border}` }}>⌘K</kbd>
      </button>
    </div>
  );
}

function SectionHead({ label, isOpen, onToggle, collapsed, C }: {
  label: string; isOpen: boolean; onToggle: () => void; collapsed: boolean; C: Record<string, string>;
}) {
  if (collapsed) {
    return <div className="mx-3 my-2" style={{ height: 1, background: C.border }} />;
  }

  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between px-5 pt-5 pb-1 group">
      <span
        className="text-[9px] font-bold tracking-[0.16em] uppercase transition-colors"
        style={{ color: C.textMd }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.accent; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.textMd; }}
      >
        {label}
      </span>
      <motion.div animate={{ rotate: isOpen ? 0 : -90 }} transition={{ duration: 0.15 }} style={{ color: C.textMd }}>
        <PiCaretDownBold size={8} />
      </motion.div>
    </button>
  );
}

function ChildItems({ children, active, itemColor, C }: {
  children: SubItem[]; active: boolean; itemColor: string; C: Record<string, string>;
}) {
  return (
    <AnimatePresence initial={false}>
      {active && (
        <motion.div
          variants={childrenVariants}
          initial="closed"
          animate="open"
          exit="closed"
          className="overflow-hidden"
        >
          <div className="relative py-1" style={{ marginLeft: 28 }}>
            {/* Vertical line from parent icon down through all children */}
            <div
              className="absolute"
              style={{ left: 0, top: -4, bottom: 4, width: 2, background: `${itemColor}60`, borderRadius: 1 }}
            />
            {children.map((child, i) => (
              <motion.div
                key={child.label}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.025, duration: 0.15 }}
                className="relative flex items-center py-[6px] rounded-lg cursor-default transition-colors"
                style={{ paddingLeft: 28, paddingRight: 8 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${itemColor}0a`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {/* Horizontal branch line */}
                <div
                  className="absolute"
                  style={{ left: 1, top: '50%', width: 14, height: 2, background: `${itemColor}60`, borderRadius: 1 }}
                />
                {/* Circle dot at branch end */}
                <div
                  className="absolute rounded-full"
                  style={{ left: 14, top: '50%', transform: 'translateY(-50%)', width: 8, height: 8, background: C.bg, border: `2px solid ${itemColor}80`, zIndex: 1 }}
                />
                <span className="text-[11px] font-medium" style={{ color: C.textMd }}>
                  {child.label}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function NavItemRow({ item, active, hovered, collapsed, C, isLight, onHover, onLeave }: {
  item: NavItem; active: boolean; hovered: boolean; collapsed: boolean; C: Record<string, string>;
  isLight: boolean; onHover: () => void; onLeave: () => void;
}) {
  const Icon = active ? item.iconActive : item.icon;
  const clr = item.color;
  const hasChildren = item.children && item.children.length > 0;

  // Active pill: sidebar-primary in light mode, accent-tinted in dark mode
  const activeBg = isLight ? C.primary : `${C.accent}14`;
  const activeText = isLight ? C.primaryFg : C.accent;
  const activeIcon = isLight ? C.primaryFg : C.accent;

  return (
    <motion.li variants={navItemVariants}>
      <NavLink
        to={item.path}
        className="relative flex items-center group"
        style={{
          margin: '1px 8px',
          padding: collapsed ? '8px 0' : '7px 12px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: 12,
          background: active ? activeBg : hovered ? (isLight ? C.sidebarAccent : `${C.accent}06`) : 'transparent',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        title={collapsed ? item.label : undefined}
      >
        {/* Collapsed icon */}
        {collapsed ? (
          <div
            className="relative flex items-center justify-center"
            style={{
              width: 38, height: 38, borderRadius: 12,
              background: active ? activeBg : hovered ? (isLight ? C.sidebarAccent : `${C.accent}08`) : 'transparent',
              transition: 'all 0.15s ease',
            }}
          >
            <Icon size={18} style={{ color: active ? activeIcon : hovered ? clr : C.textMd, transition: 'color 0.15s' }} />
            {item.badge != null && (
              <span
                className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full text-[8px] font-bold"
                style={{ height: 16, minWidth: 16, padding: '0 4px', background: clr, color: '#fff', border: `2px solid ${C.bg}` }}
              >
                {item.badge}
              </span>
            )}
          </div>
        ) : (
          <>
            {/* Expanded: icon inline with text (no icon box) */}
            <Icon size={17} style={{
              color: active ? activeIcon : hovered ? clr : C.textMd,
              transition: 'color 0.15s',
              flexShrink: 0,
            }} />

            <AnimatePresence initial={false}>
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.12 }}
                className="ml-3 flex-1 flex items-center justify-between min-w-0"
              >
                <span
                  className="text-[12.5px] font-semibold truncate"
                  style={{ color: active ? activeText : hovered ? C.text : C.textMd, transition: 'color 0.15s' }}
                >
                  {item.label}
                </span>

                <div className="flex items-center gap-2">
                  {item.badge != null && (
                    <span
                      className="flex items-center justify-center text-[9px] font-bold rounded-full"
                      style={{
                        height: 18, minWidth: 18, padding: '0 5px',
                        background: active ? (isLight ? 'rgba(255,255,255,0.2)' : `${C.accent}25`) : `${clr}18`,
                        color: active ? activeText : clr,
                      }}
                    >
                      {item.badge}
                    </span>
                  )}

                  {hasChildren && (
                    <motion.div
                      animate={{ rotate: active ? 0 : -90 }}
                      transition={{ duration: 0.15 }}
                      style={{ color: active ? `${activeText}80` : C.textMd }}
                    >
                      <PiCaretDownBold size={8} />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </>
        )}

        {/* Collapsed tooltip */}
        {collapsed && (
          <div
            className="absolute left-full ml-3 px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-[60]"
            style={{
              background: C.panel, color: C.text,
              border: `1px solid ${C.borderHi}`,
              boxShadow: `0 4px 16px rgba(0,0,0,0.15)`,
              fontSize: 11.5, fontWeight: 600,
              transform: 'translateY(-50%)', top: '50%',
              transition: 'opacity 0.12s',
            }}
          >
            <div className="flex items-center gap-2">
              {item.label}
              {item.badge != null && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${clr}15`, color: clr }}>
                  {item.badge}
                </span>
              )}
            </div>
          </div>
        )}
      </NavLink>

      {/* Sub-items (only when expanded & active) */}
      {!collapsed && hasChildren && (
        <ChildItems children={item.children!} active={active} itemColor={clr} C={C} />
      )}
    </motion.li>
  );
}

function UserCard({ collapsed, C, isLight }: { collapsed: boolean; C: Record<string, string>; isLight: boolean }) {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const [hovered, setHovered] = useState(false);

  const userName = user?.name ?? 'User';
  const userEmail = user?.email ?? 'user@csr.local';
  const userRole = user?.role ?? 'viewer';
  const userInitial = userName.charAt(0).toUpperCase();
  const meta = roleMeta[userRole] || roleMeta.viewer;
  const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
  const userAvatarUrl = user?.avatarUrl
    ? (user.avatarUrl.startsWith('http') ? user.avatarUrl : `${apiBaseUrl}${user.avatarUrl.startsWith('/') ? '' : '/'}${user.avatarUrl}`)
    : null;

  const handleLogout = () => {
    // Call backend to revoke tokens + clear cookies, then clear local state
    import('../../services/authService').then(({ authService }) => {
      authService.logout().catch(() => {});
    });
    logout();
    window.location.href = '/login';
  };

  return (
    <div style={{ borderTop: `1px solid ${C.border}` }}>
      <div className="p-2.5">
        <div
          className="flex items-center rounded-xl cursor-pointer transition-colors"
          style={{
            padding: collapsed ? '6px 0' : '6px 10px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: hovered ? `${C.accent}06` : 'transparent',
            borderRadius: 12,
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Avatar */}
          <div className="relative shrink-0">
            {userAvatarUrl ? (
              <img
                src={userAvatarUrl}
                alt={`${userName} avatar`}
                className="object-cover"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  border: `1px solid ${C.borderHi}`,
                }}
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement | null;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="items-center justify-center text-[11px] font-bold"
              style={{
                display: userAvatarUrl ? 'none' : 'flex',
                width: 32, height: 32, borderRadius: 10,
                background: `${meta.color}20`,
                color: meta.color,
              }}
            >
              {userInitial}
            </div>
            <div
              className="absolute -bottom-0.5 -right-0.5 rounded-full"
              style={{ width: 8, height: 8, background: '#34d399', border: `2px solid ${C.bg}` }}
            />
          </div>

          {!collapsed && (
            <div className="ml-2.5 flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[12px] font-semibold truncate" style={{ color: C.text }}>{userName}</p>
                {userRole === 'admin' && <PiCrownDuotone size={11} style={{ color: '#fbbf24', flexShrink: 0 }} />}
              </div>
              <p className="text-[9px] truncate mt-0.5 font-medium" style={{ color: C.textLo }}>
                {userEmail}
              </p>
            </div>
          )}

          {!collapsed && hovered && (
            <button
              onClick={handleLogout}
              className="shrink-0 flex items-center justify-center rounded-lg transition-colors"
              style={{ width: 26, height: 26, color: C.textMd }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.08)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.textMd; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              title="Sign Out"
            >
              <PiSignOutDuotone size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CollapseToggle({ collapsed, onCollapse, C }: { collapsed: boolean; onCollapse: (v: boolean) => void; C: Record<string, string> }) {
  return (
    <button
      onClick={() => onCollapse(!collapsed)}
      className="flex items-center justify-center shrink-0 transition-colors"
      style={{ height: 36, borderTop: `1px solid ${C.border}`, color: C.textMd }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.accent; (e.currentTarget as HTMLElement).style.background = `${C.accent}06`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.textMd; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      {collapsed ? <PiCaretRightBold size={12} /> : (
        <span className="flex items-center gap-2 text-[10.5px] font-semibold"><PiCaretLeftBold size={10} />Collapse</span>
      )}
    </button>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function Sidebar({
  collapsed,
  onCollapse,
  expandedWidth = 256,
  collapsedWidth = 66,
  hidden = false,
}: SidebarProps) {
  const location = useLocation();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    Object.fromEntries(navGroups.map(g => [g.section, true]))
  );
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  const { colors, isLight } = useTheme();
  const C = useMemo(() => ({
    bg: colors.sidebarBg,
    panel: colors.sidebarPanel,
    surface: colors.sidebarBorder,
    border: colors.sidebarBorder,
    borderHi: colors.borderHi,
    text: colors.sidebarText,
    textMd: colors.sidebarTextMd,
    textLo: colors.sidebarTextLo,
    accent: colors.accent,
    accentLo: colors.accentLo,
    accentBg: colors.accentBg,
    hover: colors.hover,
    glow: colors.glow,
    primary: colors.sidebarPrimary,
    primaryFg: colors.sidebarPrimaryFg,
    sidebarAccent: colors.sidebarAccent,
    sidebarAccentFg: colors.sidebarAccentFg,
  }), [colors]);

  // Green color mapper for light mode nav items
  const greenNavMap: Record<string, string> = useMemo(() => ({
    '#C9C036': '#2D5A27', '#38bdf8': '#3E7A35', '#34d399': '#5A9A4E',
    '#a78bfa': '#4A8C3E', '#fb923c': '#7AB86E', '#E91E63': '#2D5A27',
    '#fbbf24': '#6BAB5E', '#f87171': '#5A9A4E',
  }), []);
  const mapNavColor = (color: string) => isLight ? (greenNavMap[color] ?? '#2D5A27') : color;

  const toggleSection = (s: string) => { if (!collapsed) setOpenSections(p => ({ ...p, [s]: !p[s] })); };

  const isActive = (path: string) =>
    location.pathname === path ||
    (path !== '/dashboard' && path !== '/projects' && location.pathname.startsWith(path + '/')) ||
    (path === '/projects' && location.pathname === '/projects');

  const currentWidth = collapsed ? collapsedWidth : expandedWidth;

  return (
    <motion.aside
      animate={{
        width: currentWidth,
        x: hidden ? -currentWidth - 1 : 0,
      }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="fixed left-0 top-0 bottom-0 z-50 flex flex-col"
      style={{
        background: C.bg,
        borderRight: `1px solid ${C.border}`,
      }}
    >
      <BrandHeader collapsed={collapsed} C={C} />
      <MiniSearch collapsed={collapsed} C={C} />

      {/* Navigation */}
      <nav
        aria-label="Main navigation"
        className="relative flex-1 overflow-y-auto py-0.5"
        style={{ scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent` }}
      >
        <motion.div variants={navListVariants} initial="hidden" animate="show">
          {navGroups.map(({ section, items }) => (
            <div key={section}>
              <SectionHead
                label={section}
                isOpen={openSections[section]}
                onToggle={() => toggleSection(section)}
                collapsed={collapsed}
                C={C}
              />
              <AnimatePresence initial={false}>
                {(collapsed || openSections[section]) && (
                  <motion.ul key={section} variants={sectionVariants} initial={collapsed ? false : 'closed'} animate="open" exit="closed" className="overflow-hidden">
                    {items.map(item => {
                      const themedItem = isLight ? { ...item, color: mapNavColor(item.color) } : item;
                      return (
                        <NavItemRow
                          key={item.path}
                          item={themedItem}
                          active={isActive(item.path)}
                          hovered={hoveredPath === item.path}
                          collapsed={collapsed}
                          C={C}
                          isLight={isLight}
                          onHover={() => setHoveredPath(item.path)}
                          onLeave={() => setHoveredPath(null)}
                        />
                      );
                    })}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          ))}
        </motion.div>
      </nav>

      <UserCard collapsed={collapsed} C={C} isLight={isLight} />
      <CollapseToggle collapsed={collapsed} onCollapse={onCollapse} C={C} />
    </motion.aside>
  );
}
