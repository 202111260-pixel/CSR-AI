# 🏗️ Early Warning System — Architecture Blueprint

## 📋 نظرة عامة على الصفحة

صفحة **Early Warning** (صفحة 18 من 22) هي مركز مراقبة مخاطر استباقي يعرض التنبيهات الحرجة والمخاطر في الوقت الفعلي، مع إمكانية التصرف السريع وتتبع الحلول.

---

## 🎯 1. تحليل المتطلبات التقنية

### الوظائف الأساسية (Core Features)

#### 1.1 لوحة تحكم المخاطر (Risk Dashboard)
- **KPI Cards (4 بطاقات)**:
  - إجمالي التنبيهات (Total Alerts)
  - التنبيهات الحرجة (Critical Alerts)
  - التنبيهات قيد المعالجة (In Progress)
  - معدل الحل (Resolution Rate)
- **أنيميشن**: CountUp + NumberFlow لعرض القيم
- **Trend indicators**: TrendingUp/Down icons

#### 1.2 نظام الفلترة والبحث
- **فلاتر رئيسية**:
  - Severity Filter: All, Critical, Warning, Info
  - Type Filter: All, Budget, Timeline, Quality
  - Status Filter: All, Active, Resolved
  - Date Range Picker: Last 7 Days, 30 Days, 90 Days, Custom
- **Search Bar**: بحث في رسائل التنبيهات
- **Debounced search**: استخدام `useDebounce` hook (300ms)

#### 1.3 قائمة التنبيهات (Alert Feed)
- **Alert Cards** مع:
  - Severity badge (critical/warning/info) مع أيقونات مخصصة
  - Alert type badge (budget/timeline/quality)
  - رسالة التنبيه (message)
  - اسم المشروع المرتبط (project name) + رابط سريع
  - Metric indicator (visual gauge أو progress bar)
  - Threshold comparison (Current vs Expected)
  - Timestamp (relative time: "2h ago")
  - Action buttons: View Details, Mark as Resolved, Assign
- **Empty State**: عند عدم وجود تنبيهات
- **Skeleton Loading**: أثناء التحميل

#### 1.4 قسم الإحصائيات المرئية (Visual Analytics)
- **Alert Trends Chart** (Line/Area):
  - عرض اتجاه التنبيهات خلال آخر 30 يوم
  - منحنيات منفصلة لكل مستوى خطورة
- **Distribution by Type** (Donut Chart):
  - توزيع التنبيهات حسب النوع (Budget, Timeline, Quality)
- **Top Risky Projects** (Horizontal Bar Chart):
  - أعلى 5 مشاريع خطورة
  - مع رابط سريع لصفحة المشروع

#### 1.5 قسم الإجراءات السريعة (Quick Actions)
- **Resolve Alert**: وضع علامة حل مع optional note
- **Escalate**: تصعيد التنبيه لمدير أعلى
- **Assign User**: تعيين مسؤول للمتابعة
- **Add Note**: إضافة ملاحظة على التنبيه
- **Export Report**: تصدير تقرير بصيغة PDF/Excel

#### 1.6 إعدادات التنبيهات (Alert Settings)
- **Thresholds Configuration**:
  - Budget threshold (default: 80%)
  - Timeline threshold (default: 85%)
  - Quality threshold (default: 3.5/5)
- **Notification Preferences**:
  - Email notifications toggle
  - In-app notifications toggle
  - Priority levels for each type
- **Auto-resolve rules**: قواعد الحل التلقائي

---

## 📂 2. بنية الملفات المطلوبة

```
frontend/src/pages/
├── EarlyWarning.tsx                    ← الصفحة الرئيسية (320+ lines)
└── early-warning/                      ← مجلد فرعي للمكونات
    ├── AlertCard.tsx                   ← بطاقة تنبيه واحدة (150 lines)
    ├── AlertFilters.tsx                ← شريط الفلاتر (180 lines)
    ├── AlertModal.tsx                  ← مودال تفاصيل/إجراءات (200 lines)
    ├── AlertTrendsChart.tsx            ← رسم بياني للاتجاهات (120 lines)
    ├── RiskyProjectsList.tsx           ← قائمة المشاريع الخطرة (140 lines)
    ├── SettingsPanel.tsx               ← لوحة الإعدادات (220 lines)
    └── index.ts                        ← exports

frontend/src/types/
└── alert.types.ts                      ← تحديث (إضافة أنواع جديدة)

frontend/src/services/
└── alertService.ts                     ← تحديث (إضافة endpoints جديدة)

frontend/src/hooks/
└── useAlertFilters.ts                  ← hook جديد للفلاتر (80 lines)
```

---

## 🧩 3. المكونات المطلوبة (Components Breakdown)

### 3.1 المكون الرئيسي: `EarlyWarning.tsx`

#### Structure:
```tsx
export default function EarlyWarning() {
  // ─── State Management
  const [filters, setFilters] = useState<AlertFilters>(...)
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  
  // ─── Data Fetching (TanStack Query)
  const { data: alerts, isLoading } = useQuery(...)
  const { data: stats } = useQuery(...)
  
  // ─── Mutations
  const resolveMutation = useMutation(...)
  const assignMutation = useMutation(...)
  
  // ─── Custom Hooks
  const { filteredAlerts, activeFilters } = useAlertFilters(alerts, filters)
  const { unreadCount } = useAlertStore()
  
  // ─── Computed Values
  const kpiData = useMemo(() => [...], [alerts])
  const trendData = useMemo(() => [...], [alerts])
  
  return (
    <div style={{ background: P.bg }}>
      {/* KPI Row */}
      {/* Filters + Search + Settings Button */}
      {/* Alert Feed (Grid/List) */}
      {/* Charts Section */}
      {/* Modal */}
    </div>
  )
}
```

#### Sections:
1. **Header** (h1 + description + settings button)
2. **KPI Grid** (4 cards: Total, Critical, In Progress, Resolution Rate)
3. **Toolbar** (Filters + Search + View Toggle + Export)
4. **Alert Feed** (List of AlertCard components)
5. **Analytics Row** (2-col grid: Trends Chart + Distribution Chart)
6. **Risky Projects** (Horizontal list/table)
7. **Modals** (AlertModal, SettingsPanel)

---

### 3.2 المكون: `AlertCard.tsx`

#### Props:
```tsx
interface AlertCardProps {
  alert: Alert;
  onResolve: (id: string) => void;
  onViewDetails: (alert: Alert) => void;
  onAssign: (id: string) => void;
}
```

#### Features:
- **Visual Severity Indicator**: left border (4px) + glow effect
- **Badge Row**: Severity + Type badges
- **Message**: truncated with "Read more" if > 100 chars
- **Project Link**: clickable project name
- **Metric Display**: 
  - Progress bar for timeline alerts
  - Budget gauge for budget alerts
  - Star rating for quality alerts
- **Action Menu**: 3-dot menu (Resolve, Assign, Add Note, View)
- **Hover Effect**: `whileHover={{ y: -2, scale: 1.01 }}`
- **Status Indicator**: "Resolved" badge if resolvedAt exists

---

### 3.3 المكون: `AlertFilters.tsx`

#### Props:
```tsx
interface AlertFiltersProps {
  filters: AlertFilters;
  onFilterChange: (filters: AlertFilters) => void;
  alertCount: number;
}
```

#### Features:
- **Pill Tabs** for Severity (All, Critical, Warning, Info)
- **Type Dropdown** (Budget, Timeline, Quality)
- **Status Toggle** (Active / Resolved)
- **Date Range Picker** (Last 7/30/90 Days, Custom)
- **Reset Button**: clear all filters
- **Active Filter Count Badge**: e.g., "3 filters active"
- **Collapse on mobile**: hamburger menu

---

### 3.4 المكون: `AlertModal.tsx`

#### Props:
```tsx
interface AlertModalProps {
  alert: Alert | null;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (id: string, note?: string) => void;
  onAssign: (id: string, userId: string) => void;
}
```

#### Features:
- **Full Alert Details**:
  - Project card (mini version)
  - Timeline (Created → Last Updated → Resolved?)
  - All metrics (chart/gauge)
  - Related alerts (same project)
- **Action Section**:
  - Resolve form (textarea for resolution note)
  - Assign dropdown (user list)
  - Escalate button
- **Activity Log**: history of actions on this alert
- **Animation**: slide in from right

---

### 3.5 المكون: `AlertTrendsChart.tsx`

#### Props:
```tsx
interface AlertTrendsChartProps {
  data: { date: string; critical: number; warning: number; info: number }[];
}
```

#### Features:
- **Recharts AreaChart** with 3 stacked areas
- **Color mapping**: Critical=#f87171, Warning=#fbbf24, Info=#38bdf8
- **Tooltip**: custom with totals + breakdown
- **Legend**: interactive (toggle visibility)
- **Responsive**: ResponsiveContainer with height=320px

---

### 3.6 المكون: `RiskyProjectsList.tsx`

#### Props:
```tsx
interface RiskyProjectsListProps {
  projects: { id: string; name: string; riskScore: number; alertCount: number }[];
}
```

#### Features:
- **Horizontal cards** (5 items max)
- **Risk score gauge** (0-100)
- **Alert count badge** (critical alerts only)
- **Quick action**: "View Project" button
- **Hover effect**: glow + scale

---

### 3.7 المكون: `SettingsPanel.tsx`

#### Props:
```tsx
interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}
```

#### Features:
- **Tabs**: Thresholds, Notifications, Auto-Rules
- **Threshold Sliders**: Budget (0-100%), Timeline (0-100%), Quality (1-5)
- **Notification Toggles**: Email, In-App, SMS
- **Priority Matrix**: table of alert type vs priority level
- **Save Button**: mutation to update user settings
- **Sidebar Drawer**: slide in from right (AnimatePresence)

---

## 🎨 4. الـ Types المطلوبة

### تحديث `alert.types.ts`:

```typescript
export type AlertLevel = 'info' | 'warning' | 'critical';
export type AlertType = 'budget' | 'timeline' | 'quality';
export type AlertStatus = 'active' | 'resolved' | 'escalated';

export interface Alert {
  id: string;
  projectId: string;
  projectName: string;        // ← جديد
  type: AlertType;
  level: AlertLevel;
  status: AlertStatus;        // ← جديد
  message: string;
  metric?: {                  // ← جديد
    current: number;
    threshold: number;
    unit: string;             // e.g., '%', 'OMR', 'rating'
  };
  assignedTo?: string;        // ← جديد (user ID)
  resolvedAt?: string;
  resolvedBy?: string;        // ← جديد (user ID)
  resolutionNote?: string;    // ← جديد
  createdAt: string;
  updatedAt: string;          // ← جديد
}

export interface AlertFilters {
  severity: AlertLevel | 'all';
  type: AlertType | 'all';
  status: AlertStatus | 'all';
  dateRange: {
    start: string;
    end: string;
  } | null;
  search: string;
}

export interface AlertStats {
  total: number;
  critical: number;
  warning: number;
  info: number;
  active: number;
  resolved: number;
  resolutionRate: number;     // percentage
  avgResolutionTime: number;  // hours
}

export interface AlertSettings {
  thresholds: {
    budget: number;           // percentage (default: 80)
    timeline: number;         // percentage (default: 85)
    qualityRating: number;    // 1-5 (default: 3.5)
  };
  notifications: {
    email: boolean;
    inApp: boolean;
    sms: boolean;
  };
  autoResolveRules: {
    enabled: boolean;
    conditions: string[];
  };
}

export interface AlertActivity {
  id: string;
  alertId: string;
  action: 'created' | 'resolved' | 'assigned' | 'escalated' | 'note_added';
  userId: string;
  userName: string;
  note?: string;
  timestamp: string;
}
```

---

## 🔌 5. Integration Points (API & Services)

### تحديث `alertService.ts`:

```typescript
import api from './api';
import type { Alert, AlertStats, AlertSettings, AlertActivity } from '../types/alert.types';
import type { ApiResponse, Paginated } from '../types/api.types';

export const alertService = {
  // ─── Read
  getAlerts: (params?: {
    severity?: string;
    type?: string;
    status?: string;
    projectId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get<ApiResponse<Paginated<Alert>>>('/alerts', { params }).then(r => r.data),
  
  getAlertById: (id: string) =>
    api.get<ApiResponse<Alert>>(`/alerts/${id}`).then(r => r.data),
  
  getAlertStats: () =>
    api.get<ApiResponse<AlertStats>>('/alerts/stats').then(r => r.data),
  
  getAlertActivities: (alertId: string) =>
    api.get<ApiResponse<AlertActivity[]>>(`/alerts/${alertId}/activities`).then(r => r.data),
  
  // ─── Write
  resolveAlert: (id: string, note?: string) =>
    api.patch<ApiResponse<Alert>>(`/alerts/${id}/resolve`, { note }).then(r => r.data),
  
  assignAlert: (id: string, userId: string) =>
    api.patch<ApiResponse<Alert>>(`/alerts/${id}/assign`, { userId }).then(r => r.data),
  
  escalateAlert: (id: string, reason: string) =>
    api.post<ApiResponse<Alert>>(`/alerts/${id}/escalate`, { reason }).then(r => r.data),
  
  addNote: (id: string, note: string) =>
    api.post<ApiResponse<AlertActivity>>(`/alerts/${id}/notes`, { note }).then(r => r.data),
  
  // ─── Settings
  getSettings: () =>
    api.get<ApiResponse<AlertSettings>>('/alerts/settings').then(r => r.data),
  
  updateSettings: (settings: Partial<AlertSettings>) =>
    api.put<ApiResponse<AlertSettings>>('/alerts/settings', settings).then(r => r.data),
  
  // ─── Bulk
  bulkResolve: (alertIds: string[]) =>
    api.post('/alerts/bulk-resolve', { alertIds }).then(r => r.data),
  
  // ─── Export
  exportReport: (params: { format: 'pdf' | 'excel'; filters: any }) =>
    api.post('/alerts/export', params, { responseType: 'blob' }).then(r => r.data),
};
```

### Backend Endpoints (يجب التأكد من وجودها):

```
GET    /api/alerts                      ← قائمة التنبيهات (مع فلاتر)
GET    /api/alerts/stats                ← إحصائيات
GET    /api/alerts/:id                  ← تفاصيل تنبيه واحد
GET    /api/alerts/:id/activities       ← تاريخ الإجراءات
PATCH  /api/alerts/:id/resolve          ← حل تنبيه
PATCH  /api/alerts/:id/assign           ← تعيين مسؤول
POST   /api/alerts/:id/escalate         ← تصعيد
POST   /api/alerts/:id/notes            ← إضافة ملاحظة
GET    /api/alerts/settings             ← جلب الإعدادات
PUT    /api/alerts/settings             ← تحديث الإعدادات
POST   /api/alerts/bulk-resolve         ← حل دفعة
POST   /api/alerts/export               ← تصدير تقرير
```

---

## 🪝 6. Custom Hooks

### `useAlertFilters.ts`:

```typescript
import { useMemo } from 'react';
import type { Alert, AlertFilters } from '../types/alert.types';

export function useAlertFilters(alerts: Alert[] | undefined, filters: AlertFilters) {
  const filteredAlerts = useMemo(() => {
    if (!alerts) return [];
    
    let result = [...alerts];
    
    // Severity filter
    if (filters.severity !== 'all') {
      result = result.filter(a => a.level === filters.severity);
    }
    
    // Type filter
    if (filters.type !== 'all') {
      result = result.filter(a => a.type === filters.type);
    }
    
    // Status filter
    if (filters.status !== 'all') {
      result = result.filter(a => a.status === filters.status);
    }
    
    // Date range filter
    if (filters.dateRange) {
      result = result.filter(a => {
        const date = new Date(a.createdAt);
        return date >= new Date(filters.dateRange!.start) && 
               date <= new Date(filters.dateRange!.end);
      });
    }
    
    // Search filter
    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter(a => 
        a.message.toLowerCase().includes(query) ||
        a.projectName.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [alerts, filters]);
  
  const activeFilters = useMemo(() => {
    let count = 0;
    if (filters.severity !== 'all') count++;
    if (filters.type !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.dateRange) count++;
    if (filters.search) count++;
    return count;
  }, [filters]);
  
  return { filteredAlerts, activeFilters };
}
```

---

## 🎨 7. Design Specs (Visual Details)

### Severity Mapping:

```tsx
const severityCfg: Record<AlertLevel, {
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
  glow: string;
}> = {
  critical: {
    label: 'Critical',
    icon: AlertTriangle,
    color: '#f87171',
    bg: 'rgba(248,113,113,0.1)',
    border: '#f87171',
    glow: 'rgba(248,113,113,0.3)',
  },
  warning: {
    label: 'Warning',
    icon: AlertCircle,
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.1)',
    border: '#fbbf24',
    glow: 'rgba(251,191,36,0.3)',
  },
  info: {
    label: 'Info',
    icon: Info,
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.1)',
    border: '#38bdf8',
    glow: 'rgba(56,189,248,0.3)',
  },
};
```

### Type Mapping:

```tsx
const typeCfg: Record<AlertType, {
  label: string;
  icon: LucideIcon;
  color: string;
}> = {
  budget: {
    label: 'Budget',
    icon: Wallet,
    color: '#fbbf24',
  },
  timeline: {
    label: 'Timeline',
    icon: Clock,
    color: '#38bdf8',
  },
  quality: {
    label: 'Quality',
    icon: ShieldAlert,
    color: '#f87171',
  },
};
```

### AlertCard Layout:

```tsx
<GlassCard 
  className="relative p-5"
  style={{
    borderLeft: `4px solid ${severityCfg[alert.level].color}`,
    boxShadow: `0 0 30px ${severityCfg[alert.level].glow}`,
  }}
>
  {/* Header Row */}
  <div className="flex items-start justify-between mb-3">
    <div className="flex items-center gap-2">
      {/* Severity Badge */}
      <span className="px-2 py-1 rounded-full text-[9px] font-bold"
        style={{
          background: severityCfg[alert.level].bg,
          color: severityCfg[alert.level].color,
        }}>
        {severityCfg[alert.level].label.toUpperCase()}
      </span>
      
      {/* Type Badge */}
      <span className="px-2 py-1 rounded-lg text-[9px] font-medium"
        style={{
          background: P.surface,
          color: typeCfg[alert.type].color,
          border: `1px solid ${P.border}`,
        }}>
        <typeCfg[alert.type].icon size={10} />
        {typeCfg[alert.type].label}
      </span>
    </div>
    
    {/* Actions Menu */}
    <button className="p-1.5 rounded-lg hover:bg-gray-800/60">
      <MoreHorizontal size={14} style={{ color: P.textLo }} />
    </button>
  </div>
  
  {/* Message */}
  <p className="text-sm mb-2" style={{ color: P.textHi }}>
    {alert.message}
  </p>
  
  {/* Project Link */}
  <a href={`/projects/${alert.projectId}`}
    className="text-xs font-medium hover:underline"
    style={{ color: P.accent }}>
    {alert.projectName} →
  </a>
  
  {/* Metric (if exists) */}
  {alert.metric && (
    <div className="mt-3 p-2 rounded-lg" style={{ background: P.surface }}>
      <div className="flex items-center justify-between text-[10px] mb-1">
        <span style={{ color: P.textLo }}>Current</span>
        <span style={{ color: P.textHi }}>{alert.metric.current}{alert.metric.unit}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: P.border }}>
        <div className="h-full transition-all duration-500"
          style={{
            width: `${(alert.metric.current / alert.metric.threshold) * 100}%`,
            background: severityCfg[alert.level].color,
          }} />
      </div>
      <div className="flex justify-end text-[9px] mt-0.5" style={{ color: P.textDim }}>
        Threshold: {alert.metric.threshold}{alert.metric.unit}
      </div>
    </div>
  )}
  
  {/* Footer */}
  <div className="flex items-center justify-between mt-3 pt-3"
    style={{ borderTop: `1px solid ${P.border}` }}>
    <span className="text-[10px]" style={{ color: P.textLo }}>
      {alert.createdAt}
    </span>
    {alert.assignedTo && (
      <span className="text-[9px] px-2 py-0.5 rounded-full"
        style={{ background: P.surface, color: P.textMd }}>
        Assigned
      </span>
    )}
  </div>
</GlassCard>
```

---

## 🎭 8. Animations & Micro-Interactions

### Page Enter:
```tsx
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};
```

### Alert Cards Stagger:
```tsx
const stagger = (delay = 0) => ({
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay } },
});

// Usage:
alerts.map((alert, i) => (
  <motion.div key={alert.id} variants={stagger(i * 0.06)} initial="hidden" animate="show">
    <AlertCard {...} />
  </motion.div>
))
```

### Hover Effects:
```tsx
// Alert Card
whileHover={{ y: -2, scale: 1.01, boxShadow: `0 0 40px ${severityCfg[level].glow}` }}

// Action Buttons
whileHover={{ scale: 1.04 }}
whileTap={{ scale: 0.96 }}

// Severity Badge
whileHover={{ scale: 1.08 }}
```

### Skeleton Loading:
```tsx
function AlertCardSkeleton() {
  return (
    <GlassCard className="p-5 animate-pulse">
      <div className="h-4 w-20 rounded-lg mb-3" style={{ background: P.border }} />
      <div className="h-3 w-full rounded mb-2" style={{ background: P.border }} />
      <div className="h-3 w-2/3 rounded mb-4" style={{ background: P.border }} />
      <div className="h-8 rounded-lg" style={{ background: P.border }} />
    </GlassCard>
  );
}
```

### Modal Enter/Exit:
```tsx
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0, x: 320 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 320 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    >
      <AlertModal {...} />
    </motion.div>
  )}
</AnimatePresence>
```

### Filter Change Animation:
```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={filters.severity + filters.type}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.25 }}
  >
    {/* Alert list */}
  </motion.div>
</AnimatePresence>
```

---

## 🚨 9. Error & Edge Case Handling

### Error States:
1. **API Fetch Error**:
   - عرض ErrorBoundary fallback
   - رسالة خطأ مخصصة + زر "Retry"
   
2. **Empty State**:
   - أيقونة كبيرة (ShieldCheck)
   - رسالة: "No alerts at the moment 🎉"
   - "Your projects are running smoothly!"
   
3. **No Results After Filter**:
   - "No alerts match your filters"
   - "Try adjusting your search or filters"
   - زر "Clear Filters"

4. **Network Offline**:
   - banner في أعلى الصفحة
   - "You're offline — showing cached data"

### Loading States:
- **Initial Load**: Skeleton cards (6 items)
- **Filter Change**: Smooth crossfade (AnimatePresence)
- **Mutation Loading**: Button spinner + disabled state
- **Chart Loading**: Shimmer effect inside chart container

### Validation:
- **Date Range**: start < end
- **Resolution Note**: optional but recommended (toast warning if empty)
- **Assignment**: must select a valid user

---

## 🎯 10. تحسينات احترافية إضافية

### 10.1 Real-Time Updates (WebSocket)
```tsx
import { useRealTime } from '../hooks/useRealTime';

const { isConnected, on } = useRealTime({
  channel: 'alerts',
  events: ['alert.created', 'alert.resolved', 'alert.assigned'],
});

useEffect(() => {
  if (isConnected) {
    on('alert.created', (alert: Alert) => {
      // Trigger toast notification
      toast.info(`New ${alert.level} alert: ${alert.message}`);
      // Refetch alerts
      queryClient.invalidateQueries(['alerts']);
    });
  }
}, [isConnected, on]);
```

### 10.2 Sound Notifications
```tsx
// Play sound on critical alert
useEffect(() => {
  if (alerts?.some(a => a.level === 'critical' && !a.resolvedAt)) {
    const audio = new Audio('/sounds/alert-critical.mp3');
    audio.play().catch(() => {});
  }
}, [alerts]);
```

### 10.3 Keyboard Shortcuts
```tsx
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'f' && e.ctrlKey) {
      e.preventDefault();
      searchInputRef.current?.focus();
    }
    if (e.key === 'r' && e.ctrlKey) {
      e.preventDefault();
      queryClient.invalidateQueries(['alerts']);
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []);
```

### 10.4 Bulk Actions
- **Select Mode**: checkbox on each card
- **Bulk Resolve**: resolve multiple alerts at once
- **Bulk Assign**: assign multiple alerts to one user
- **Bulk Export**: export selected alerts

### 10.5 Alert Grouping
```tsx
// Group by project
const groupedAlerts = useMemo(() => {
  return alerts.reduce((acc, alert) => {
    if (!acc[alert.projectId]) acc[alert.projectId] = [];
    acc[alert.projectId].push(alert);
    return acc;
  }, {} as Record<string, Alert[]>);
}, [alerts]);

// Render as collapsible groups
{Object.entries(groupedAlerts).map(([projectId, alerts]) => (
  <Collapsible key={projectId}>
    <CollapsibleTrigger>
      {alerts[0].projectName} ({alerts.length} alerts)
    </CollapsibleTrigger>
    <CollapsibleContent>
      {alerts.map(alert => <AlertCard {...} />)}
    </CollapsibleContent>
  </Collapsible>
))}
```

### 10.6 Auto-Refresh
```tsx
const { data: alerts } = useQuery(['alerts'], alertService.getAlerts, {
  refetchInterval: 30000, // 30 seconds
  refetchIntervalInBackground: true,
});

// Show "Refreshing..." indicator
const [isRefreshing, setIsRefreshing] = useState(false);
useEffect(() => {
  if (isFetching && !isLoading) {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  }
}, [isFetching, isLoading]);
```

### 10.7 Alert History Timeline
```tsx
// في AlertModal
<div className="space-y-2">
  {activities.map((activity, i) => (
    <div key={activity.id} className="flex gap-3">
      <div className="relative flex flex-col items-center">
        <div className="h-8 w-8 rounded-full flex items-center justify-center"
          style={{ background: P.surface, border: `2px solid ${P.accent}` }}>
          <activity.icon size={12} style={{ color: P.accent }} />
        </div>
        {i < activities.length - 1 && (
          <div className="w-0.5 flex-1 mt-1" style={{ background: P.border }} />
        )}
      </div>
      <div className="flex-1 pb-4">
        <p className="text-xs font-medium" style={{ color: P.textHi }}>
          {activity.action}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: P.textLo }}>
          by {activity.userName} • {activity.timestamp}
        </p>
        {activity.note && (
          <p className="text-xs mt-1 p-2 rounded-lg" style={{ background: P.surface, color: P.textMd }}>
            "{activity.note}"
          </p>
        )}
      </div>
    </div>
  ))}
</div>
```

### 10.8 Export with Custom Template
```tsx
async function exportReport(format: 'pdf' | 'excel') {
  try {
    const blob = await alertService.exportReport({
      format,
      filters: {
        severity: filters.severity,
        type: filters.type,
        dateRange: filters.dateRange,
      },
    });
    
    // Trigger download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alerts-report-${Date.now()}.${format}`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success(`Report exported as ${format.toUpperCase()}`);
  } catch (error) {
    toast.error('Failed to export report');
  }
}
```

### 10.9 Smart Recommendations
```tsx
// عرض اقتراحات بناءً على نوع التنبيه
const recommendations: Record<AlertType, string[]> = {
  budget: [
    'Review expense breakdown',
    'Request budget adjustment',
    'Reallocate resources from other categories',
  ],
  timeline: [
    'Extend project deadline',
    'Add more team members',
    'Identify and remove blockers',
  ],
  quality: [
    'Schedule quality review meeting',
    'Implement additional testing',
    'Request stakeholder feedback',
  ],
};

// في AlertModal
<div className="mt-4 p-3 rounded-lg" style={{ background: P.surface }}>
  <h4 className="text-xs font-bold mb-2" style={{ color: P.textHi }}>
    💡 Recommended Actions
  </h4>
  <ul className="space-y-1">
    {recommendations[alert.type].map((rec, i) => (
      <li key={i} className="text-[11px] flex items-start gap-2" style={{ color: P.textMd }}>
        <span style={{ color: P.accent }}>•</span>
        {rec}
      </li>
    ))}
  </ul>
</div>
```

### 10.10 Alert Severity Animation
```tsx
// Pulse animation for critical alerts
{alert.level === 'critical' && (
  <motion.div
    className="absolute -top-1 -right-1 h-3 w-3 rounded-full"
    style={{ background: '#f87171' }}
    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
    transition={{ repeat: Infinity, duration: 1.5 }}
  />
)}
```

---

## 📊 11. Mock Data للتطوير

```tsx
const mockAlerts: Alert[] = [
  {
    id: '1',
    projectId: '5',
    projectName: 'Solar Power Installation',
    type: 'budget',
    level: 'critical',
    status: 'active',
    message: 'Budget overrun detected — 87.5% spent with only 45% completion.',
    metric: { current: 87.5, threshold: 80, unit: '%' },
    assignedTo: undefined,
    resolvedAt: undefined,
    createdAt: '2026-02-23T08:30:00Z',
    updatedAt: '2026-02-23T08:30:00Z',
  },
  {
    id: '2',
    projectId: '2',
    projectName: 'Community Health Center',
    type: 'timeline',
    level: 'warning',
    status: 'active',
    message: 'Project is 15% behind schedule — expected completion: 85%, actual: 70%.',
    metric: { current: 70, threshold: 85, unit: '%' },
    assignedTo: 'user-123',
    createdAt: '2026-02-22T14:20:00Z',
    updatedAt: '2026-02-23T09:15:00Z',
  },
  {
    id: '3',
    projectId: '5',
    projectName: 'Solar Power Installation',
    type: 'quality',
    level: 'critical',
    status: 'escalated',
    message: 'Average quality rating dropped to 3.2/5 — requires immediate review.',
    metric: { current: 3.2, threshold: 3.5, unit: '/5' },
    createdAt: '2026-02-21T11:45:00Z',
    updatedAt: '2026-02-23T07:00:00Z',
  },
  {
    id: '4',
    projectId: '10',
    projectName: 'Heritage Restoration — Bahla Fort',
    type: 'timeline',
    level: 'info',
    status: 'resolved',
    message: 'Milestone "Foundation Work" completed 3 days ahead of schedule.',
    resolvedAt: '2026-02-22T16:00:00Z',
    resolvedBy: 'user-456',
    resolutionNote: 'Team worked extra hours to meet early deadline.',
    createdAt: '2026-02-20T09:00:00Z',
    updatedAt: '2026-02-22T16:00:00Z',
  },
];

const mockStats: AlertStats = {
  total: 24,
  critical: 6,
  warning: 12,
  info: 6,
  active: 18,
  resolved: 6,
  resolutionRate: 75, // percentage
  avgResolutionTime: 36, // hours
};

const mockTrendData = [
  { date: '2026-02-01', critical: 2, warning: 5, info: 3 },
  { date: '2026-02-05', critical: 3, warning: 6, info: 2 },
  { date: '2026-02-10', critical: 4, warning: 7, info: 4 },
  { date: '2026-02-15', critical: 5, warning: 8, info: 3 },
  { date: '2026-02-20', critical: 6, warning: 9, info: 5 },
  { date: '2026-02-23', critical: 6, warning: 12, info: 6 },
];
```

---

## ✅ 12. Checklist للتنفيذ

### Phase 1: Foundation (يوم 1)
- [ ] إنشاء بنية المجلدات (`early-warning/`)
- [ ] تحديث `alert.types.ts` بالأنواع الجديدة
- [ ] تحديث `alertService.ts` بالـ endpoints
- [ ] إنشاء `useAlertFilters.ts` hook
- [ ] إعداد mock data في أعلى `EarlyWarning.tsx`

### Phase 2: Core Components (يوم 2)
- [ ] بناء `EarlyWarning.tsx` (structure + KPIs + filters)
- [ ] بناء `AlertCard.tsx` (مع severity indicators)
- [ ] بناء `AlertFilters.tsx` (pill tabs + dropdowns)
- [ ] ربط TanStack Query مع API

### Phase 3: Advanced Features (يوم 3)
- [ ] بناء `AlertModal.tsx` (details + actions)
- [ ] بناء `AlertTrendsChart.tsx` (area chart)
- [ ] بناء `RiskyProjectsList.tsx` (horizontal cards)
- [ ] إضافة empty state + error handling

### Phase 4: Polish (يوم 4)
- [ ] بناء `SettingsPanel.tsx` (thresholds + notifications)
- [ ] إضافة animations (stagger, hover, modal)
- [ ] إضافة skeleton loading states
- [ ] تحسين responsive design (mobile)

### Phase 5: Enhancements (يوم 5)
- [ ] Real-time updates (WebSocket)
- [ ] Keyboard shortcuts
- [ ] Bulk actions
- [ ] Auto-refresh indicator
- [ ] Sound notifications (optional)
- [ ] Export functionality (PDF/Excel)

---

## 🎨 13. مرجع سريع للألوان

```tsx
const P = {
  bg:        '#080805',
  surface:   '#0E0E09',
  card:      '#131310',
  cardHi:    '#1A1A14',
  border:    '#1E1E16',
  borderHi:  '#2E2D20',
  accent:    '#C9C036',
  accentLo:  '#8B8724',
  accentXlo: '#4A481F',
  textHi:    '#F0EFE2',
  textMd:    '#A8A48A',
  textLo:    '#6B6849',
  textDim:   '#3A3824',
};

// Severity Colors
Critical: #f87171 (red)
Warning:  #fbbf24 (amber)
Info:     #38bdf8 (sky blue)

// Type Colors
Budget:   #fbbf24 (amber)
Timeline: #38bdf8 (sky)
Quality:  #f87171 (red)

// Status Colors
Active:    #38bdf8 (sky)
Resolved:  #34d399 (emerald)
Escalated: #fb923c (orange)
```

---

## 📝 14. نصائح للتنفيذ

1. **ابدأ بالـ stub version**: نفذ الهيكل الأساسي أولاً بدون API، استخدم mock data
2. **Test incrementally**: اختبر كل مكون على حدة قبل التكامل
3. **Reuse existing components**: استخدم `KpiCard`, `RiskBadge`, `SearchBar` الموجودة
4. **Follow the pattern**: اتبع نفس نمط `Dashboard.tsx` و `ProjectsList.tsx`
5. **Mobile-first**: تأكد من responsive design من البداية
6. **Accessibility**: أضف ARIA labels و keyboard navigation
7. **Performance**: استخدم `useMemo` للـ filtered data و `React.memo` للمكونات الثقيلة
8. **Type safety**: كل prop يجب أن يكون typed بوضوح

---

## 🚀 15. Next Steps (بعد Agent 1)

بعد الموافقة على هذا التخطيط، سيقوم:

- **Agent 2**: بناء الـ Types والـ Services
- **Agent 3**: بناء المكونات الأساسية (AlertCard, AlertFilters)
- **Agent 4**: بناء الصفحة الرئيسية (EarlyWarning.tsx)
- **Agent 5**: بناء المكونات المتقدمة (Modal, Charts, Settings)
- **Agent 6**: التحسينات النهائية (animations, real-time, export)

---

**✅ Architecture Blueprint Complete — Ready for Development!**
