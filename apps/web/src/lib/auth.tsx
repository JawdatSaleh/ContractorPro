import { createContext, useContext, useMemo, useState } from 'react';
import { api, setToken } from './api';

interface User {
  id: string;
  email: string;
  roles: string[];
}

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    async login(email: string, password: string) {
      const { data } = await api.post('/api/auth/login', { email, password });
      setToken(data.token);
      setUser(data.user);
    },
    logout() {
      setToken(null);
      setUser(null);
    }
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
