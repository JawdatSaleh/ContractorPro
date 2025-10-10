import { useParams } from 'react-router-dom';
import EmployeeForm from '../../components/employees/EmployeeForm';

export default function EmployeeEditPage() {
  const params = useParams<{ id: string }>();

  if (!params.id) {
    return <p className="text-center text-rose-500">لم يتم العثور على الموظف.</p>;
  }

  return (
    <div className="space-y-6">
      <EmployeeForm employeeId={params.id} />
    </div>
  );
}
