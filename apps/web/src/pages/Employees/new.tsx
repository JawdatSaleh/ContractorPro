import EmployeeForm from '../../components/employees/EmployeeForm';
import { useEmployeeStore } from '../../store/useEmployeeStore';
import { useEffect } from 'react';

export default function EmployeeCreatePage() {
  const resetSelection = useEmployeeStore((state) => state.resetSelection);

  useEffect(() => {
    resetSelection();
  }, [resetSelection]);

  return (
    <div className="space-y-6">
      <EmployeeForm />
    </div>
  );
}
