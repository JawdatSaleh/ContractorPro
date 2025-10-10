import { useEffect, useState } from 'react';
import { Menu, Moon, Sun } from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import { useAuth } from '../../lib/auth';

interface HeaderProps {
  onOpenSidebar: () => void;
}

const THEME_KEY = 'contractorpro-theme';

type Theme = 'light' | 'dark';

export function Header({ onOpenSidebar }: HeaderProps) {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = window.localStorage.getItem(THEME_KEY) as Theme | null;
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.dir = 'rtl';
    root.lang = 'ar';
    root.classList.remove(theme === 'dark' ? 'light' : 'dark');
    root.classList.add(theme);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_KEY, theme);
    }
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white/70 px-4 py-3 text-right backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex items-center gap-3 lg:hidden">
        <button onClick={onOpenSidebar} className="rounded-lg border border-slate-200 p-2 text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-lg font-semibold text-slate-900 dark:text-white">ContractorPro</span>
      </div>
      <div className="flex flex-1 items-center justify-end gap-4">
        <button
          onClick={toggleTheme}
          className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label={theme === 'dark' ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        {user && (
          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">{user.fullName ?? user.email}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user.roles?.map((role) => role.nameAr ?? role.key ?? role).join('، ')}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={logout}>
              تسجيل الخروج
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
