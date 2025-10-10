import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityLogEntry,
  ActivityLogFilters,
  createActivitySnapshot,
  fetchActivityAnalytics,
  fetchActivityLogs
} from '../../api/activity';
import { useAuth } from '../../lib/auth';

const dateFormatter = new Intl.DateTimeFormat('ar-SA', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const pageSizeOptions = [25, 50, 100, 200];

type TimelineFilterState = {
  search: string;
  entityType: string;
  actionType: string;
  userId: string;
  from: string;
  to: string;
};

const initialFilters: TimelineFilterState = {
  search: '',
  entityType: '',
  actionType: '',
  userId: '',
  from: '',
  to: ''
};

export default function ActivityCenterPage() {
  const { hasPermission } = useAuth();
  const [filters, setFilters] = useState<TimelineFilterState>(initialFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const queryClient = useQueryClient();

  const logsQuery = useQuery({
    queryKey: ['activity', 'logs', { ...filters, page, pageSize }],
    queryFn: async () =>
      fetchActivityLogs(
        mapFiltersToQuery({
          ...filters,
          page,
          pageSize
        })
      ),
    keepPreviousData: true
  });

  const analyticsQuery = useQuery({
    queryKey: ['activity', 'analytics', filters.entityType, filters.actionType, filters.userId, filters.from, filters.to],
    queryFn: async () =>
      fetchActivityAnalytics(
        mapFiltersToQuery({
          entityType: filters.entityType,
          actionType: filters.actionType,
          userId: filters.userId,
          from: filters.from,
          to: filters.to
        })
      ),
    enabled: hasPermission('view_activity_logs') || hasPermission('view_activity_analytics')
  });

  const snapshotMutation = useMutation({
    mutationFn: (date?: string) => createActivitySnapshot(date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity', 'logs'] });
      queryClient.invalidateQueries({ queryKey: ['activity', 'analytics'] });
    }
  });

  const totalPages = useMemo(() => {
    if (!logsQuery.data?.total) return 1;
    return Math.max(1, Math.ceil(logsQuery.data.total / pageSize));
  }, [logsQuery.data?.total, pageSize]);

  const canManageSnapshots = hasPermission('manage_activity_retention');

  const handleFilterChange = (name: keyof TimelineFilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const handleExportCsv = () => {
    const rows = logsQuery.data?.data ?? [];
    if (!rows.length) return;
    const header = ['createdAt', 'actionType', 'entityType', 'entityId', 'userEmail', 'description', 'metadata'];
    const csvRows = rows.map((row) => [
      new Date(row.createdAt).toISOString(),
      row.actionType,
      row.entityType,
      row.entityId ?? '',
      row.user?.email ?? '',
      row.description ?? '',
      JSON.stringify(row.metadata ?? {})
    ]);
    const csv = [header, ...csvRows]
      .map((cols) => cols.map((col) => toCsvCell(col)).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-logs-${new Date().toISOString()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const logs = logsQuery.data?.data ?? [];
  const analytics = analyticsQuery.data;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">سجل النشاطات الشامل</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            تتبع كل العمليات والمهام داخل المنصة مع إمكانية البحث، الفرز والتحليل التفصيلي.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            disabled={logs.length === 0}
          >
            تصدير CSV
          </button>
          {canManageSnapshots && (
            <button
              type="button"
              onClick={() => snapshotMutation.mutate(filters.to || undefined)}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:bg-sky-400"
              disabled={snapshotMutation.isLoading}
            >
              {snapshotMutation.isLoading ? 'جاري إنشاء النسخة...' : 'إنشاء نسخة احتياطية'}
            </button>
          )}
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">عوامل التصفية</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <input
            type="search"
            value={filters.search}
            onChange={(event) => handleFilterChange('search', event.target.value)}
            placeholder="بحث في الوصف أو المعرفات"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <input
            type="text"
            value={filters.entityType}
            onChange={(event) => handleFilterChange('entityType', event.target.value)}
            placeholder="نوع الكيان (مثال: payroll_batch)"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <input
            type="text"
            value={filters.actionType}
            onChange={(event) => handleFilterChange('actionType', event.target.value)}
            placeholder="نوع العملية (مثال: payroll.batch.post)"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <input
            type="text"
            value={filters.userId}
            onChange={(event) => handleFilterChange('userId', event.target.value)}
            placeholder="معرف المستخدم"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-500 dark:text-slate-400">من</label>
            <input
              type="date"
              value={filters.from}
              onChange={(event) => handleFilterChange('from', event.target.value)}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-500 dark:text-slate-400">إلى</label>
            <input
              type="date"
              value={filters.to}
              onChange={(event) => handleFilterChange('to', event.target.value)}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option} / صفحة
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setFilters(initialFilters);
              setPage(1);
            }}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            إعادة التعيين
          </button>
        </div>
      </section>

      {(analyticsQuery.isLoading || analytics) && (
        <section className="grid gap-4 md:grid-cols-4">
          <AnalyticsCard
            title="إجمالي الأحداث"
            value={analytics?.totalEvents ?? 0}
            loading={analyticsQuery.isLoading}
          />
          <AnalyticsCard
            title="عدد المستخدمين الفعّالين"
            value={analytics?.uniqueActors ?? 0}
            loading={analyticsQuery.isLoading}
          />
          <AnalyticsBreakdown
            title="أكثر الكيانات نشاطًا"
            items={(analytics?.entities ?? []).slice(0, 5).map((item) => ({ label: item.entityType, value: item.count }))}
            loading={analyticsQuery.isLoading}
          />
          <AnalyticsBreakdown
            title="أكثر العمليات تكرارًا"
            items={(analytics?.actions ?? []).slice(0, 5).map((item) => ({ label: item.actionType, value: item.count }))}
            loading={analyticsQuery.isLoading}
          />
          <AnalyticsBreakdown
            title="أكثر المستخدمين نشاطًا"
            items={(analytics?.topUsers ?? []).slice(0, 5).map((item) => ({
              label: item.email ?? 'مستخدم غير معرف',
              value: item.count
            }))}
            loading={analyticsQuery.isLoading}
          />
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">الخط الزمني للنشاطات</h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {logsQuery.isLoading ? 'جاري التحميل...' : `${logsQuery.data?.total ?? 0} حدث مسجل`}
          </span>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {logsQuery.isLoading && (
            <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">جاري تحميل السجل...</p>
          )}
          {!logsQuery.isLoading && logs.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              لا توجد نشاطات مطابقة لعوامل التصفية الحالية.
            </p>
          )}
          {logs.map((log) => (
            <TimelineRow key={log.id} log={log} />
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
            className="rounded-xl border border-slate-300 px-3 py-1 text-sm text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            الصفحة السابقة
          </button>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            صفحة {page} من {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
            className="rounded-xl border border-slate-300 px-3 py-1 text-sm text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            الصفحة التالية
          </button>
        </div>
      </section>
    </div>
  );
}

interface AnalyticsCardProps {
  title: string;
  value: number;
  loading?: boolean;
}

function AnalyticsCard({ title, value, loading }: AnalyticsCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        {loading ? '...' : value.toLocaleString('ar-SA')}
      </p>
    </div>
  );
}

interface AnalyticsBreakdownProps {
  title: string;
  items: { label: string; value: number }[];
  loading?: boolean;
}

function AnalyticsBreakdown({ title, items, loading }: AnalyticsBreakdownProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      <div className="mt-3 space-y-2">
        {loading && <p className="text-sm text-slate-500 dark:text-slate-400">جاري التحميل...</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">لا توجد بيانات متاحة.</p>
        )}
        {!loading &&
          items.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
              <span className="truncate" title={item.label}>
                {item.label}
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{item.value.toLocaleString('ar-SA')}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

function TimelineRow({ log }: { log: ActivityLogEntry }) {
  return (
    <article className="flex flex-col gap-1 px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-slate-900 dark:text-slate-100">{log.actionType}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {dateFormatter.format(new Date(log.createdAt))} • {log.user?.email ?? 'مستخدم غير معروف'}
          </span>
        </div>
        <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
          {log.entityType}
        </span>
      </div>
      {log.description && <p className="text-sm text-slate-600 dark:text-slate-300">{log.description}</p>}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
        {log.entityId && (
          <span className="rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-900/50">المعرف: {log.entityId}</span>
        )}
        {log.ipAddress && <span className="rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-900/50">IP: {log.ipAddress}</span>}
        {log.userAgent && (
          <span className="rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-900/50" title={log.userAgent}>
            المتصفح: {truncate(log.userAgent, 40)}
          </span>
        )}
      </div>
      {log.metadata && (
        <details className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 transition dark:bg-slate-900/60 dark:text-slate-300">
          <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">تفاصيل إضافية</summary>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-[11px]">
            {JSON.stringify(log.metadata, null, 2)}
          </pre>
        </details>
      )}
    </article>
  );
}

function truncate(value: string, length: number) {
  if (value.length <= length) return value;
  return `${value.slice(0, length - 1)}…`;
}

function toCsvCell(value: string) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function mapFiltersToQuery(filters: Partial<ActivityLogFilters>): ActivityLogFilters {
  const mapped: ActivityLogFilters = {};
  if (filters.page) mapped.page = filters.page;
  if (filters.pageSize) mapped.pageSize = filters.pageSize;
  if (filters.entityType) mapped.entityType = filters.entityType;
  if (filters.actionType) mapped.actionType = filters.actionType;
  if (filters.userId) mapped.userId = filters.userId;
  if (filters.from) mapped.from = filters.from;
  if (filters.to) mapped.to = filters.to;
  if ((filters as TimelineFilterState).search !== undefined && (filters as TimelineFilterState).search !== '') {
    mapped.search = (filters as TimelineFilterState).search;
  }
  return mapped;
}
