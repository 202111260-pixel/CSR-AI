import { useMemo, useEffect } from 'react';
import { useUiStore } from '../stores/uiStore';
import { getTheme } from '../theme/colors';
import type { ThemeColors, ThemeMode } from '../theme/colors';

// ═══════════════════════════════════════════════════════════════════════════
// useTheme Hook - Returns current theme colors
// ═══════════════════════════════════════════════════════════════════════════

export function useTheme() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  
  // Apply theme class on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  
  const colors = useMemo(() => getTheme(theme), [theme]);
  
  return {
    mode: theme as ThemeMode,
    colors,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    setTheme,
    toggleTheme,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Typed Color Accessor - For inline styles
// ═══════════════════════════════════════════════════════════════════════════

export function useColors(): ThemeColors {
  const theme = useUiStore((s) => s.theme);
  return useMemo(() => getTheme(theme), [theme]);
}

export default useTheme;
