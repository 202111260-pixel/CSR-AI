// ═══════════════════════════════════════════════════════════════════════════
// Theme Colors - Dark & Light Mode
// ═══════════════════════════════════════════════════════════════════════════

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  // Backgrounds
  bg: string;
  surface: string;
  card: string;
  cardHi: string;

  // Borders
  border: string;
  borderHi: string;

  // Text
  textHi: string;
  textMd: string;
  textLo: string;
  textDim: string;

  // Accent
  accent: string;
  accentLo: string;
  accentXLo: string;
  accentBg: string;
  hover: string;
  glow: string;

  // Sidebar specific
  sidebarBg: string;
  sidebarPanel: string;
  sidebarBorder: string;
  sidebarText: string;
  sidebarTextMd: string;
  sidebarTextLo: string;
  sidebarPrimary: string;
  sidebarPrimaryFg: string;
  sidebarAccent: string;
  sidebarAccentFg: string;
}

// ─── Light Theme (Donezo-inspired forest green) ────────────────────────────────
export const lightTheme: ThemeColors = {
  // Backgrounds — warm cream/off-white
  bg: '#F5F3EE',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardHi: '#F8F7F2',

  // Borders — warm gray
  border: '#E5E2DA',
  borderHi: '#D0CCC2',

  // Text — olive/green-tinted
  textHi: '#1C2B1C',
  textMd: '#3A4C3A',
  textLo: '#5A6C5A',
  textDim: '#7A8C7A',

  // Accent — forest green
  accent: '#2D5A27',
  accentLo: '#4A7C3F',
  accentXLo: '#C8E0C4',
  accentBg: 'rgba(45, 90, 39, 0.08)',
  hover: 'rgba(45, 90, 39, 0.04)',
  glow: 'rgba(45, 90, 39, 0.12)',

  // Sidebar — warm terra cotta (shadcnthemer 734115ff)
  // oklch values: fg(0.2178 0 0), primary(0.465 0.147 24.9), accent(0.962 0.058 95.6), border(0.935 0.032 80.9)
  sidebarBg:        '#FAF7F0',   // warm off-white background
  sidebarPanel:     '#F3EDD7',   // sidebar-accent: light warm cream
  sidebarBorder:    '#ECE4CB',   // sidebar-border: oklch(0.9355 0.0324 80.9937)
  sidebarText:      '#363636',   // sidebar-foreground: oklch(0.2178 0 0)
  sidebarTextMd:    '#7A6A5A',   // mid warm brown
  sidebarTextLo:    '#AFA090',   // dim warm
  sidebarPrimary:   '#9E2820',   // sidebar-primary: oklch(0.4650 0.1470 24.9381)
  sidebarPrimaryFg: '#FFFFFF',   // sidebar-primary-foreground
  sidebarAccent:    '#F3EDD7',   // sidebar-accent (hover bg)
  sidebarAccentFg:  '#7A2018',   // sidebar-accent-foreground: oklch(0.3958 0.1331 25.7230)
};

// ─── Dark Theme — BentoShowcase exact palette ──────────────────────────────────
export const darkTheme: ThemeColors = {
  // Backgrounds — نفس BentoShowcase section bg / card bg
  bg:      '#060606',
  surface: '#0a0a0a',
  card:    '#111111',
  cardHi:  '#161616',

  // Borders — border-white/[0.06] من BentoShowcase
  border:   'rgba(255,255,255,0.06)',
  borderHi: 'rgba(255,255,255,0.10)',

  // Text — white opacity scale من BentoShowcase
  textHi:  '#ffffff',
  textMd:  'rgba(255,255,255,0.75)',
  textLo:  'rgba(255,255,255,0.52)',
  textDim: 'rgba(255,255,255,0.35)',

  // Accent — أبيض حرفي hex (نفس BentoShowcase: toggles, today, buttons كلها white)
  // ملاحظة: يجب أن يكون hex لأن الكود يستخدم ${P.accent}12 pattern
  accent:    '#ffffff',
  accentLo:  '#cccccc',
  accentXLo: '#1f1f1f',
  accentBg:  'rgba(255,255,255,0.05)',
  hover:     'rgba(255,255,255,0.04)',
  glow:      'rgba(255,255,255,0.08)',

  // Sidebar — نفس الـ palette
  sidebarBg:        '#000000',
  sidebarPanel:     '#0a0a0a',
  sidebarBorder:    'rgba(255,255,255,0.06)',
  sidebarText:      '#ffffff',
  sidebarTextMd:    'rgba(255,255,255,0.50)',
  sidebarTextLo:    'rgba(255,255,255,0.25)',
  sidebarPrimary:   '#ffffff',
  sidebarPrimaryFg: '#060606',
  sidebarAccent:    'rgba(255,255,255,0.06)',
  sidebarAccentFg:  'rgba(255,255,255,0.85)',
};

// ─── Get Theme Function ────────────────────────────────────────────────────────
export function getTheme(mode: ThemeMode): ThemeColors {
  return mode === 'dark' ? darkTheme : lightTheme;
}

// ─── Status Colors (Same for both themes) ──────────────────────────────────────
export const statusColors = {
  planning: { dot: '#E91E63', bg: 'rgba(233, 30, 99, 0.1)', text: '#F48FB1', label: 'Planning' },
  active: { dot: '#38bdf8', bg: 'rgba(56, 189, 248, 0.1)', text: '#7dd3fc', label: 'Active' },
  completed: { dot: '#34d399', bg: 'rgba(52, 211, 153, 0.1)', text: '#6ee7b7', label: 'Completed' },
  on_hold: { dot: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)', text: '#fde68a', label: 'On Hold' },
  archived: { dot: '#6B6849', bg: 'rgba(107, 104, 73, 0.1)', text: '#8a8668', label: 'Archived' },
};

// ─── Risk Colors ───────────────────────────────────────────────────────────────
export const riskColors = {
  low: { color: '#34d399', bg: 'rgba(52, 211, 153, 0.1)', text: '#6ee7b7', label: 'Low' },
  medium: { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)', text: '#fde68a', label: 'Medium' },
  high: { color: '#fb923c', bg: 'rgba(251, 146, 60, 0.1)', text: '#fdba74', label: 'High' },
  critical: { color: '#f87171', bg: 'rgba(248, 113, 113, 0.1)', text: '#fca5a5', label: 'Critical' },
};

// ─── Category Colors ───────────────────────────────────────────────────────────
export const categoryColors = {
  Education: '#C9C036',
  Healthcare: '#38bdf8',
  Environment: '#34d399',
  Infrastructure: '#fbbf24',
  Community: '#a78bfa',
  Technology: '#f472b6',
};

// ─── Chart Colors (shadcn Nova palette) ────────────────────────────────────────
export const chartColors = ['#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#F59E0B'];
