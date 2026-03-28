import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  const { user, accessToken, setUser, setAccessToken, logout } = useAuthStore();
  return { user, accessToken, isAuthenticated: !!user, setUser, setAccessToken, logout };
}
