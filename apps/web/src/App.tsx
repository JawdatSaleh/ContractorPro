import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { AppRouter } from './router';

function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen flex bg-slate-100">
      <aside className="w-64 bg-white border-l border-slate-200 p-4 flex flex-col gap-4">
        <h1 className="text-xl font-semibold">ContractorPro</h1>
        <nav className="flex flex-col gap-2 text-right">
          <NavLink to="/employees" className={({ isActive }) => (isActive ? 'text-primary-600 font-semibold' : '')}>
            الموظفون
          </NavLink>
          <NavLink to="/contracts">العقود</NavLink>
          <NavLink to="/attendance">الحضور</NavLink>
          <NavLink to="/leaves">الإجازات</NavLink>
          <NavLink to="/finance/advances">السلف والقروض</NavLink>
          <NavLink to="/payroll">الرواتب</NavLink>
          <NavLink to="/reports">التقارير</NavLink>
          <NavLink to="/rbac">إدارة الصلاحيات</NavLink>
        </nav>
        {user && (
          <div className="mt-auto text-sm">
            <p>{user.email}</p>
            <button className="text-red-500" onClick={logout}>
              تسجيل الخروج
            </button>
          </div>
        )}
      </aside>
      <main className="flex-1 p-6">
        <Suspense fallback={<p>يتم التحميل...</p>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return <AppRouter layout={<Layout />} />;
}
