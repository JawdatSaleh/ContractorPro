import { createContext, useContext, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';

interface AuthContextValue {
  user: ReturnType<typeof useAuthStore>['user'];
  login: ReturnType<typeof useAuthStore>['login'];
  logout: ReturnType<typeof useAuthStore>['logout'];
  hasPermission: ReturnType<typeof useAuthStore>['hasPermission'];
  hasRole: ReturnType<typeof useAuthStore>['hasRole'];
  initialized: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasRole = useAuthStore((state) => state.hasRole);
  const initialize = useAuthStore((state) => state.initialize);
  const initialized = useAuthStore((state) => state.initialized);
  const loading = useAuthStore((state) => state.loading);

  useEffect(() => {
    if (!initialized) {
      initialize().catch(() => undefined);
    }
  }, [initialize, initialized]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, login, logout, hasPermission, hasRole, initialized, loading }),
    [user, login, logout, hasPermission, hasRole, initialized, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used داخل AuthProvider');
  }
  return ctx;
}
