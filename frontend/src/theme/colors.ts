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

// ─── Light Theme (Gold accent on cream) ─────────────────────────────────────
export const lightTheme: ThemeColors = {
  // Backgrounds — warm cream/off-white
  bg: '#FFFDF9',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardHi: '#FBF8F0',

  // Borders — warm gold-tinted
  border: '#E8E0CC',
  borderHi: '#D4C9AE',

  // Text — dark warm
  textHi: '#1A1A1A',
  textMd: '#3D3A34',
  textLo: '#6B6560',
  textDim: '#9A9490',

  // Accent — gold
  accent: '#C8A44E',
  accentLo: '#DFC170',
  accentXLo: '#F5ECD0',
  accentBg: 'rgba(200, 164, 78, 0.08)',
  hover: 'rgba(200, 164, 78, 0.04)',
  glow: 'rgba(200, 164, 78, 0.12)',

  // Sidebar — gold tinted cream
  sidebarBg:        '#FAF7F0',
  sidebarPanel:     '#F5ECD0',
  sidebarBorder:    '#E8E0CC',
  sidebarText:      '#1A1A1A',
  sidebarTextMd:    '#6B6560',
  sidebarTextLo:    '#9A9490',
  sidebarPrimary:   '#C8A44E',
  sidebarPrimaryFg: '#000000',
  sidebarAccent:    '#F5ECD0',
  sidebarAccentFg:  '#8B7330',
};

// ─── Dark Theme — Pure Black with Gold Accent ──────────────────────────────────
export const darkTheme: ThemeColors = {
  // Backgrounds — pure black
  bg:      '#000000',
  surface: '#0a0a0a',
  card:    '#0a0a0a',
  cardHi:  '#121212',

  // Borders — neutral dark grey
  border:   '#1a1a1a',
  borderHi: '#2a2a2a',

  // Text — white opacity scale
  textHi:  '#ffffff',
  textMd:  'rgba(255,255,255,0.80)',
  textLo:  'rgba(255,255,255,0.55)',
  textDim: 'rgba(255,255,255,0.35)',

  // Accent — gold (hex for ${P.accent}12 pattern compatibility)
  accent:    '#C8A44E',
  accentLo:  '#DFC170',
  accentXLo: '#1A1608',
  accentBg:  'rgba(200,164,78,0.08)',
  hover:     'rgba(200,164,78,0.04)',
  glow:      'rgba(200,164,78,0.15)',

  // Sidebar — pure black
  sidebarBg:        '#000000',
  sidebarPanel:     '#0a0a0a',
  sidebarBorder:    '#1a1a1a',
  sidebarText:      '#ffffff',
  sidebarTextMd:    'rgba(255,255,255,0.55)',
  sidebarTextLo:    'rgba(255,255,255,0.30)',
  sidebarPrimary:   '#C8A44E',
  sidebarPrimaryFg: '#000000',
  sidebarAccent:    'rgba(200,164,78,0.08)',
  sidebarAccentFg:  '#DFC170',
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
