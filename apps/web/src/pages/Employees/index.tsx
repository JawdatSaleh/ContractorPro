import EmployeeTable from '../../components/employees/EmployeeTable';
import { useAuth } from '../../lib/auth';
import { Navigate } from 'react-router-dom';

export default function EmployeesPage() {
  const { user, hasPermission, initialized, loading } = useAuth();

  if (!initialized || loading) {
    return <p className="text-center text-slate-500">جارٍ التحقق من الصلاحيات...</p>;
  }

  if (user && !hasPermission('employees:view')) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <EmployeeTable />
    </div>
  );
}
