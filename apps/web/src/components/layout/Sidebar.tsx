import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

const navItems = [
  { to: '/dashboard', label: 'لوحة التحكم', permissions: ['dashboard:view'] },
  { to: '/employees', label: 'الموظفون', permissions: ['employees:view'] },
  { to: '/finance/advances', label: 'المالية والسلف', permissions: ['finance:view'] },
  { to: '/contracts', label: 'العقود', permissions: ['contracts:view'] },
  { to: '/attendance', label: 'الحضور', permissions: ['attendance:view'] },
  { to: '/leaves', label: 'الإجازات', permissions: ['leaves:view'] },
  { to: '/payroll', label: 'الرواتب', permissions: ['payroll:view'] },
  { to: '/reports', label: 'التقارير', permissions: ['reports:view'] },
  { to: '/activity', label: 'سجل النشاطات', permissions: ['view_activity_logs'] },
  { to: '/rbac', label: 'إدارة الصلاحيات', permissions: ['roles:manage'] }
];

interface SidebarProps {
  hasPermission: (key: string) => boolean;
  className?: string;
  isLoading?: boolean;
}

export function Sidebar({ hasPermission, className, isLoading = false }: SidebarProps) {
  const visibleItems = navItems.filter((item) => item.permissions.some((permission) => hasPermission(permission)));
  const itemsToRender = isLoading ? navItems : visibleItems;

  return (
    <aside
      className={clsx(
        'flex min-h-screen w-72 flex-col border-l border-slate-200 bg-white/95 px-4 py-6 text-right shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/90',
        className ?? 'hidden lg:flex'
      )}
    >
      <div className="px-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">ContractorPro</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">المنصة المتكاملة لإدارة المقاولات</p>
      </div>
      <nav className="mt-6 flex flex-1 flex-col gap-1">
        {!isLoading && itemsToRender.length === 0 ? (
          <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
            لا توجد أقسام متاحة ضمن صلاحياتك الحالية.
          </p>
        ) : (
          itemsToRender.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'rounded-xl px-4 py-3 text-sm font-medium transition hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-sky-900/30',
                  isActive
                    ? 'bg-sky-100 text-sky-700 shadow-inner dark:bg-sky-900/40 dark:text-sky-200'
                    : 'text-slate-600 dark:text-slate-300'
                )
              }
            >
              {item.label}
            </NavLink>
          ))
        )}
      </nav>
      <footer className="mt-6 text-xs text-slate-400 dark:text-slate-500">
        <p>© {new Date().getFullYear()} ContractorPro</p>
        <p>جميع الحقوق محفوظة</p>
      </footer>
    </aside>
  );
}

export default Sidebar;
