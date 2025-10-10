import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './lib/auth';

const EmployeesPage = lazy(() => import('./pages/Employees'));
const EmployeeDetailsPage = lazy(() => import('./pages/Employees/[id]'));
const EmployeeCreatePage = lazy(() => import('./pages/Employees/new'));
const EmployeeEditPage = lazy(() => import('./pages/Employees/edit'));
const ContractsBoard = lazy(() => import('./features/employees/ContractsBoard'));
const AttendancePage = lazy(() => import('./features/attendance/AttendancePage'));
const LeavesPage = lazy(() => import('./features/leaves/LeavesPage'));
const AdvancesLoansPage = lazy(() => import('./features/finance/advances-loans/AdvancesLoansPage'));
const PayrollPage = lazy(() => import('./features/payroll/PayrollPage'));
const ReportsPage = lazy(() => import('./features/reports/ReportsPage'));
const RBACPage = lazy(() => import('./features/rbac/RolesPermissionsPage'));

interface Props {
  layout: React.ReactNode;
}

export function AppRouter({ layout }: Props) {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={layout}>
          <Route index element={<Navigate to="employees" replace />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="employees/new" element={<EmployeeCreatePage />} />
          <Route path="employees/:id" element={<EmployeeDetailsPage />} />
          <Route path="employees/:id/edit" element={<EmployeeEditPage />} />
          <Route path="contracts" element={<ContractsBoard />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="leaves" element={<LeavesPage />} />
          <Route path="finance/advances" element={<AdvancesLoansPage />} />
          <Route path="payroll" element={<PayrollPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="rbac" element={<RBACPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
