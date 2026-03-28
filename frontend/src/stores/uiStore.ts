import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  locale: 'en' | 'ar';
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setLocale: (locale: 'en' | 'ar') => void;
}

// Get initial theme from system preference
const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('ui-storage');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.state?.theme) return parsed.state.theme;
      } catch {}
    }
    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  }
  return 'light';
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: getInitialTheme(),
      locale: 'en',
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setTheme: (theme) => {
        set({ theme });
        // Update document class for global styles
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', theme === 'dark');
        }
      },
      toggleTheme: () => set((s) => {
        const newTheme = s.theme === 'light' ? 'dark' : 'light';
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', newTheme === 'dark');
        }
        return { theme: newTheme };
      }),
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ theme: state.theme, locale: state.locale }),
    }
  )
);
