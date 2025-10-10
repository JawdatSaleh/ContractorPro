import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { login as loginRequest, fetchProfile, AuthUser } from '../api/auth';
import { setToken } from '../lib/api';

const TOKEN_KEY = 'contractorpro-token';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  initialized: boolean;
  loading: boolean;
  error?: string;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (key: string) => boolean;
  hasRole: (key: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  devtools((set, get) => ({
    user: null,
    token: null,
    initialized: false,
    loading: false,
    error: undefined,
    initialize: async () => {
      try {
        set({ loading: true });
        const storedToken = typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null;
        if (storedToken) {
          setToken(storedToken);
          set({ token: storedToken });
          const profile = await fetchProfile();
          set({ user: profile, initialized: true, loading: false, error: undefined });
        } else {
          set({ initialized: true, loading: false });
        }
      } catch (error) {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(TOKEN_KEY);
        }
        setToken(null);
        set({ user: null, token: null, initialized: true, loading: false });
      }
    },
    login: async (email: string, password: string) => {
      set({ loading: true, error: undefined });
      try {
        const { token, user } = await loginRequest(email, password);
        setToken(token);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(TOKEN_KEY, token);
        }
        set({ token, user, loading: false });
      } catch (error) {
        set({ error: 'تعذر تسجيل الدخول، يرجى المحاولة لاحقًا', loading: false });
        throw error;
      }
    },
    logout: () => {
      setToken(null);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(TOKEN_KEY);
      }
      set({ user: null, token: null });
    },
    hasPermission: (key: string) => {
      const { user } = get();
      return Boolean(user?.permissions?.some((permission) => permission.key === key));
    },
    hasRole: (key: string) => {
      const { user } = get();
      return Boolean(user?.roles?.some((role) => role.key === key));
    }
  }))
);
