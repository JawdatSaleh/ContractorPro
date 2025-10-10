import { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useEmployeeStore } from '../../store/useEmployeeStore';
import Card from '../ui/Card';
import clsx from 'clsx';
import Button from '../ui/Button';
import Input from '../ui/Input';
import RoleBadge from './RoleBadge';
import { formatStatus } from '../../utils/formatters';

const statusFilters = [
  { value: 'all', label: 'الكل' },
  { value: 'active', label: 'نشط' },
  { value: 'probation', label: 'تحت التجربة' },
  { value: 'inactive', label: 'غير نشط' },
  { value: 'terminated', label: 'منتهي' }
];

export function EmployeeTable() {
  const navigate = useNavigate();
  const employees = useEmployeeStore((state) => state.employees);
  const loading = useEmployeeStore((state) => state.loading);
  const filters = useEmployeeStore((state) => state.filters);
  const fetchEmployees = useEmployeeStore((state) => state.fetchEmployees);
  const setFilters = useEmployeeStore((state) => state.setFilters);

  useEffect(() => {
    fetchEmployees().catch(() => undefined);
  }, [filters.search, filters.status, filters.department, filters.roleKey, fetchEmployees]);

  const departments = useMemo(() => {
    const values = new Set<string>();
    employees.forEach((employee) => employee.department && values.add(employee.department));
    return Array.from(values);
  }, [employees]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach((employee) => {
      employee.roleKeys?.forEach((roleKey) => {
        counts[roleKey] = (counts[roleKey] ?? 0) + 1;
      });
    });
    return counts;
  }, [employees]);

  return (
    <div className="space-y-6">
      <Card
        title="الموظفون"
        actions={
          <Button onClick={() => navigate('/employees/new')}>
            إضافة موظف
          </Button>
        }
      >
        <div className="grid gap-4 lg:grid-cols-4">
          <Input
            label="بحث"
            placeholder="ابحث بالاسم أو الكود"
            value={filters.search ?? ''}
            onChange={(event) => setFilters({ search: event.target.value })}
          />
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
            الحالة
            <select
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-900"
              value={filters.status ?? 'all'}
              onChange={(event) => setFilters({ status: event.target.value as typeof filters.status })}
            >
              {statusFilters.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
            القسم
            <select
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-900"
              value={filters.department ?? 'all'}
              onChange={(event) => setFilters({ department: event.target.value === 'all' ? undefined : event.target.value })}
            >
              <option value="all">الكل</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
            الدور
            <input
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-900"
              placeholder="مثال: accountant"
              value={filters.roleKey ?? ''}
              onChange={(event) => setFilters({ roleKey: event.target.value || undefined })}
            />
          </label>
        </div>
      </Card>

      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-right dark:divide-slate-800">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
              <tr>
                <th className="px-6 py-3">الكود</th>
                <th className="px-6 py-3">الاسم</th>
                <th className="px-6 py-3">المسمى الوظيفي</th>
                <th className="px-6 py-3">القسم</th>
                <th className="px-6 py-3">الأدوار</th>
                <th className="px-6 py-3">الحالة</th>
                <th className="px-6 py-3">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-sm text-slate-700 dark:divide-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                    جارِ تحميل الموظفين...
                  </td>
                </tr>
              )}
              {!loading && employees.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                    لا يوجد موظفون مطابقون لخيارات البحث الحالية.
                  </td>
                </tr>
              )}
              {!loading &&
                employees.map((employee) => (
                  <tr key={employee.id} className="transition hover:bg-slate-50/70 dark:hover:bg-slate-900/60">
                    <td className="px-6 py-4 font-mono text-xs">{employee.code}</td>
                    <td className="px-6 py-4">
                      <Link to={`/employees/${employee.id}`} className="font-semibold text-sky-600 hover:text-sky-500 dark:text-sky-300">
                        {employee.fullName}
                      </Link>
                    </td>
                    <td className="px-6 py-4">{employee.jobTitle ?? '—'}</td>
                    <td className="px-6 py-4">{employee.department ?? '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2 justify-end">
                        {employee.roleKeys?.map((roleKey) => (
                          <RoleBadge key={roleKey} roleKey={roleKey} label={roleCounts[roleKey] ? `${roleKey} (${roleCounts[roleKey]})` : roleKey} />
                        )) ?? '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800/80 dark:text-slate-200">
                        {formatStatus(employee.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/employees/${employee.id}`}
                          className={clsx(
                            'inline-flex items-center rounded-lg border border-transparent px-3 py-1.5 text-sm font-medium text-sky-600 transition hover:bg-slate-100 dark:text-sky-300 dark:hover:bg-slate-800'
                          )}
                        >
                          عرض
                        </Link>
                        <Link
                          to={`/employees/${employee.id}/edit`}
                          className={clsx(
                            'inline-flex items-center rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700'
                          )}
                        >
                          تعديل
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default EmployeeTable;
