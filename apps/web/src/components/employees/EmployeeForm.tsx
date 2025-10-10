import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployeeStore } from '../../store/useEmployeeStore';
import { useRoleStore } from '../../store/useRoleStore';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { formatDate } from '../../utils/formatters';

interface EmployeeFormProps {
  employeeId?: string;
}

const statusOptions = [
  { value: 'active', label: 'نشط' },
  { value: 'probation', label: 'تحت التجربة' },
  { value: 'inactive', label: 'غير نشط' },
  { value: 'terminated', label: 'منتهي' }
];

export function EmployeeForm({ employeeId }: EmployeeFormProps) {
  const navigate = useNavigate();
  const roles = useRoleStore((state) => state.roles);
  const fetchRoleData = useRoleStore((state) => state.fetchAll);
  const [formState, setFormState] = useState({
    code: '',
    fullName: '',
    email: '',
    phone: '',
    jobTitle: '',
    department: '',
    status: 'active',
    hireDate: '',
    salary: '',
    currency: 'SAR',
    notes: '',
    roleIds: [] as string[]
  });

  const loading = useEmployeeStore((state) => state.loading || state.detailLoading);
  const selectedEmployee = useEmployeeStore((state) => state.selectedEmployee);
  const fetchEmployeeProfile = useEmployeeStore((state) => state.fetchEmployeeProfile);
  const createEmployee = useEmployeeStore((state) => state.createEmployee);
  const updateEmployee = useEmployeeStore((state) => state.updateEmployee);

  useEffect(() => {
    fetchRoleData().catch(() => undefined);
  }, [fetchRoleData]);

  useEffect(() => {
    if (employeeId) {
      fetchEmployeeProfile(employeeId).catch(() => undefined);
    }
  }, [employeeId, fetchEmployeeProfile]);

  useEffect(() => {
    if (employeeId && selectedEmployee?.id === employeeId) {
      setFormState({
        code: selectedEmployee.code,
        fullName: selectedEmployee.fullName,
        email: selectedEmployee.contact.email,
        phone: selectedEmployee.contact.phone ?? '',
        jobTitle: selectedEmployee.jobTitle ?? '',
        department: selectedEmployee.department ?? '',
        status: selectedEmployee.status,
        hireDate: selectedEmployee.hireDate ? selectedEmployee.hireDate.slice(0, 10) : '',
        salary: '',
        currency: 'SAR',
        notes: selectedEmployee.notes ?? '',
        roleIds: selectedEmployee.roles?.map((role) => role.id) ?? []
      });
    }
  }, [employeeId, selectedEmployee]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.code || !formState.fullName || !formState.email) return;
    const payload = {
      code: formState.code,
      fullName: formState.fullName,
      email: formState.email,
      phone: formState.phone || undefined,
      jobTitle: formState.jobTitle || undefined,
      department: formState.department || undefined,
      status: formState.status as 'active' | 'inactive' | 'probation' | 'terminated',
      hireDate: formState.hireDate || undefined,
      salary: formState.salary ? Number(formState.salary) : undefined,
      currency: formState.currency,
      roleIds: formState.roleIds,
      notes: formState.notes || undefined
    };

    if (employeeId) {
      await updateEmployee(employeeId, payload);
      navigate(`/employees/${employeeId}`);
    } else {
      const created = await createEmployee(payload);
      navigate(`/employees/${created.id}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card title={employeeId ? `تعديل بيانات ${selectedEmployee?.fullName ?? ''}` : 'إضافة موظف جديد'}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Input label="كود الموظف" name="code" value={formState.code} onChange={(event) => setFormState((state) => ({ ...state, code: event.target.value }))} required />
          <Input label="الاسم الكامل" name="fullName" value={formState.fullName} onChange={(event) => setFormState((state) => ({ ...state, fullName: event.target.value }))} required />
          <Input label="البريد الإلكتروني" type="email" name="email" value={formState.email} onChange={(event) => setFormState((state) => ({ ...state, email: event.target.value }))} required />
          <Input label="رقم الجوال" name="phone" value={formState.phone} onChange={(event) => setFormState((state) => ({ ...state, phone: event.target.value }))} />
          <Input label="المسمى الوظيفي" name="jobTitle" value={formState.jobTitle} onChange={(event) => setFormState((state) => ({ ...state, jobTitle: event.target.value }))} />
          <Input label="القسم" name="department" value={formState.department} onChange={(event) => setFormState((state) => ({ ...state, department: event.target.value }))} />
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
            الحالة
            <select
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-900"
              value={formState.status}
              onChange={(event) => setFormState((state) => ({ ...state, status: event.target.value }))}
            >
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="تاريخ التعيين"
            type="date"
            name="hireDate"
            value={formState.hireDate}
            onChange={(event) => setFormState((state) => ({ ...state, hireDate: event.target.value }))}
            helperText={selectedEmployee?.hireDate ? `آخر تحديث: ${formatDate(selectedEmployee.hireDate)}` : undefined}
          />
          <Input
            label="الراتب الأساسي"
            type="number"
            name="salary"
            value={formState.salary}
            onChange={(event) => setFormState((state) => ({ ...state, salary: event.target.value }))}
          />
          <Input label="العملة" name="currency" value={formState.currency} onChange={(event) => setFormState((state) => ({ ...state, currency: event.target.value }))} />
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-200 lg:col-span-2">
            الأدوار والصلاحيات
            <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              {roles.map((role) => (
                <label key={role.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    checked={formState.roleIds.includes(role.id)}
                    onChange={(event) => {
                      const { checked } = event.target;
                      setFormState((state) => ({
                        ...state,
                        roleIds: checked ? [...state.roleIds, role.id] : state.roleIds.filter((id) => id !== role.id)
                      }));
                    }}
                  />
                  <span>
                    {role.nameAr}
                    <span className="mr-2 text-xs text-slate-400">{role.key}</span>
                  </span>
                </label>
              ))}
            </div>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-200 lg:col-span-2">
            ملاحظات
            <textarea
              rows={4}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-900"
              value={formState.notes}
              onChange={(event) => setFormState((state) => ({ ...state, notes: event.target.value }))}
            />
          </label>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            إلغاء
          </Button>
          <Button type="submit" loading={loading}>
            {employeeId ? 'حفظ التعديلات' : 'إنشاء الموظف'}
          </Button>
        </div>
      </Card>
    </form>
  );
}

export default EmployeeForm;
