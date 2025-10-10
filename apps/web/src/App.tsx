import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { AppRouter } from './router';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

function Layout() {
  const { hasPermission, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 text-right transition dark:bg-slate-950">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar hasPermission={hasPermission} isLoading={loading} />

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div className="fixed inset-0 bg-slate-900/60" onClick={() => setSidebarOpen(false)} />
            <div className="relative ml-auto w-72 bg-white p-4 shadow-xl dark:bg-slate-950">
              <Sidebar hasPermission={hasPermission} className="flex lg:hidden" isLoading={loading} />
            </div>
          </div>
        )}

        <div className="flex min-h-screen flex-1 flex-col">
          <Header onOpenSidebar={() => setSidebarOpen(true)} />
          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
            <Suspense fallback={<p className="text-center text-slate-500">جاري التحميل...</p>}>
              <Outlet />
            </Suspense>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return <AppRouter layout={<Layout />} />;
}
