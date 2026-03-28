import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: 'admin' | 'manager' | 'employee' | 'viewer';
  department?: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null; // Kept for backward compat — no longer used for auth (httpOnly cookie)
  setUser: (user: AuthUser | null) => void;
  setAccessToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setUser: (user) => set({ user }),
      setAccessToken: (_token) => set({ accessToken: 'cookie' }), // Marker only — real token in httpOnly cookie
      logout: () => set({ user: null, accessToken: null }),
    }),
    { name: 'auth-storage' }
  )
);
