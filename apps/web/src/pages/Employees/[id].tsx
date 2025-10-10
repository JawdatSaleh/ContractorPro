import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import EmployeeDetails from '../../components/employees/EmployeeDetails';
import { useEmployeeStore } from '../../store/useEmployeeStore';

export default function EmployeeDetailsPage() {
  const params = useParams<{ id: string }>();
  const resetSelection = useEmployeeStore((state) => state.resetSelection);

  useEffect(() => {
    return () => {
      resetSelection();
    };
  }, [resetSelection]);

  if (!params.id) {
    return <p className="text-center text-rose-500">لم يتم تحديد الموظف.</p>;
  }

  return (
    <div className="space-y-6">
      <EmployeeDetails employeeId={params.id} />
    </div>
  );
}
