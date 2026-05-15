/** Shared motion / spacing / radius constants for the Dashboard redesign. */
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const VP = { once: true, margin: '-60px' as const };

export const FADE_UP = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0,  transition: { duration: 0.55, ease: EASE } },
};
export const stagger = (d = 0) => ({
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0,  transition: { duration: 0.45, ease: EASE, delay: d } },
});
export const scaleIn = (d = 0) => ({
  hidden: { opacity: 0, scale: 0.92 },
  show:   { opacity: 1, scale: 1,  transition: { duration: 0.5, ease: EASE, delay: d } },
});

export const STATUS_COLORS: Record<string, string> = {
  active:    '#60a5fa',
  completed: '#34d399',
  planning:  '#C8A44E',
  on_hold:   '#f59e0b',
  archived:  '#f87171',
};

export const CHART_C = [
  '#C8A44E', '#34d399', '#60a5fa', '#DFC170',
  '#a78bfa', '#f87171', '#f59e0b', '#3b82f6',
];

export const GOLD = '#C8A44E';
export const GOLD_SOFT = 'rgba(200,164,78,0.12)';
