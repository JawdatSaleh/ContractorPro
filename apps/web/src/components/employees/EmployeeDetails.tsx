import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useEmployeeStore } from '../../store/useEmployeeStore';
import Card from '../ui/Card';
import RoleBadge from './RoleBadge';
import { formatCurrency, formatDate, formatStatus } from '../../utils/formatters';

interface EmployeeDetailsProps {
  employeeId: string;
}

export function EmployeeDetails({ employeeId }: EmployeeDetailsProps) {
  const fetchEmployeeProfile = useEmployeeStore((state) => state.fetchEmployeeProfile);
  const detailLoading = useEmployeeStore((state) => state.detailLoading);
  const employee = useEmployeeStore((state) => state.selectedEmployee);
  const financeSummary = useEmployeeStore((state) => state.financeSummary);
  const contracts = useEmployeeStore((state) => state.contracts);
  const advances = useEmployeeStore((state) => state.advances);
  const loans = useEmployeeStore((state) => state.loans);
  const expenses = useEmployeeStore((state) => state.expenses);

  const latestContract = contracts
    .slice()
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];

  useEffect(() => {
    fetchEmployeeProfile(employeeId).catch(() => undefined);
  }, [employeeId, fetchEmployeeProfile]);

  if (detailLoading && !employee) {
    return (
      <Card>
        <p className="text-center text-slate-500">جارِ تحميل بيانات الموظف...</p>
      </Card>
    );
  }

  if (!employee) {
    return (
      <Card>
        <p className="text-center text-rose-500">تعذر تحميل بيانات الموظف.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-gradient-to-l from-sky-50 to-white p-6 text-right shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500">كود الموظف</p>
              <p className="font-mono text-lg text-slate-900 dark:text-white">{employee.code}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {employee.roles?.map((role) => (
                <RoleBadge key={role.id} roleKey={role.key} label={role.nameAr} />
              ))}
            </div>
          </div>
          <h2 className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">{employee.fullName}</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {employee.jobTitle ?? '—'} • {employee.department ?? 'غير محدد'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-slate-900/90 px-4 py-1.5 text-sm font-semibold text-white dark:bg-slate-700">
            {formatStatus(employee.status)}
          </span>
          <Link
            to={`/employees/${employee.id}/edit`}
            className="inline-flex items-center rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            تعديل البيانات
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="التواصل" padded>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">البريد الإلكتروني</p>
              <p className="font-medium text-slate-800 dark:text-slate-200">{employee.contact.email}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">رقم الجوال</p>
              <p className="font-medium text-slate-800 dark:text-slate-200">{employee.contact.phone ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">المدير المباشر</p>
              <p className="font-medium text-slate-800 dark:text-slate-200">{employee.manager ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">تاريخ التعيين</p>
              <p className="font-medium text-slate-800 dark:text-slate-200">{formatDate(employee.hireDate)}</p>
            </div>
          </div>
        </Card>
        <Card title="الوضع المالي" padded>
          {financeSummary ? (
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">الراتب الشهري</dt>
                <dd className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(financeSummary.monthlySalary, financeSummary.currency)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">البدلات</dt>
                <dd className="text-slate-700 dark:text-slate-200">{formatCurrency(financeSummary.allowances, financeSummary.currency)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">الخصومات</dt>
                <dd className="text-slate-700 dark:text-slate-200">{formatCurrency(financeSummary.deductions, financeSummary.currency)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">المصاريف</dt>
                <dd className="text-slate-700 dark:text-slate-200">{formatCurrency(financeSummary.expenses, financeSummary.currency)}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-slate-500">لا تتوفر بيانات مالية.</p>
          )}
        </Card>
        <Card title="ملخص العقود" padded>
          <div className="space-y-3 text-sm">
            <p className="text-slate-600 dark:text-slate-300">عدد العقود الفعالة: {contracts.filter((contract) => contract.status === 'active').length}</p>
            <p className="text-slate-600 dark:text-slate-300">إجمالي العقود: {contracts.length}</p>
            <p className="text-slate-600 dark:text-slate-300">آخر عقد: {latestContract ? formatDate(latestContract.startDate) : '—'}</p>
          </div>
        </Card>
      </div>

      <Card title="المصاريف المرتبطة" padded={false}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-right text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
              <tr>
                <th className="px-6 py-3">الوصف</th>
                <th className="px-6 py-3">الفئة</th>
                <th className="px-6 py-3">المبلغ</th>
                <th className="px-6 py-3">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-slate-700 dark:divide-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-center text-slate-400">
                    لا توجد مصاريف مسجلة.
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="px-6 py-3">{expense.description}</td>
                    <td className="px-6 py-3">{expense.category}</td>
                    <td className="px-6 py-3">{formatCurrency(expense.amount, expense.currency)}</td>
                    <td className="px-6 py-3">{formatDate(expense.expenseDate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="السلف" padded={false}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-right text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">المبلغ</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3">تاريخ الطلب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-slate-700 dark:divide-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
                {advances.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-5 text-center text-slate-400">
                      لا توجد سلف مسجلة.
                    </td>
                  </tr>
                ) : (
                  advances.map((advance) => (
                    <tr key={advance.id}>
                      <td className="px-4 py-3">{formatCurrency(advance.amount, advance.currency)}</td>
                      <td className="px-4 py-3">{formatStatus(advance.status)}</td>
                      <td className="px-4 py-3">{formatDate(advance.requestedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="القروض" padded={false}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-right text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">الرصيد المتبقي</th>
                  <th className="px-4 py-3">القسط</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3">تاريخ البدء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-slate-700 dark:divide-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
                {loans.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-5 text-center text-slate-400">
                      لا توجد قروض مسجلة.
                    </td>
                  </tr>
                ) : (
                  loans.map((loan) => (
                    <tr key={loan.id}>
                      <td className="px-4 py-3">{formatCurrency(loan.remaining, loan.currency)}</td>
                      <td className="px-4 py-3">{formatCurrency(loan.installment, loan.currency)}</td>
                      <td className="px-4 py-3">{formatStatus(loan.status)}</td>
                      <td className="px-4 py-3">{formatDate(loan.startedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card title="العقود" padded={false}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-right text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
              <tr>
                <th className="px-6 py-3">رقم العقد</th>
                <th className="px-6 py-3">المشروع</th>
                <th className="px-6 py-3">تاريخ البدء</th>
                <th className="px-6 py-3">تاريخ الانتهاء</th>
                <th className="px-6 py-3">الحالة</th>
                <th className="px-6 py-3">القيمة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-slate-700 dark:divide-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
              {contracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-slate-400">
                    لا توجد عقود مرتبطة بالموظف.
                  </td>
                </tr>
              ) : (
                contracts.map((contract) => (
                  <tr key={contract.id}>
                    <td className="px-6 py-3 font-mono text-xs">{contract.contractNumber}</td>
                    <td className="px-6 py-3">{contract.projectName}</td>
                    <td className="px-6 py-3">{formatDate(contract.startDate)}</td>
                    <td className="px-6 py-3">{formatDate(contract.endDate)}</td>
                    <td className="px-6 py-3">{formatStatus(contract.status)}</td>
                    <td className="px-6 py-3">{contract.value ? formatCurrency(contract.value, contract.currency) : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default EmployeeDetails;
