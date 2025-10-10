import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';

interface Contract {
  id: string;
  type: string;
  startDate: string;
  endDate?: string | null;
  basicSalary?: number;
  currency?: string;
}

interface Employee {
  id: string;
  fullName: string;
  jobTitle?: string;
  department?: string;
  project?: string;
  contracts: Contract[];
}

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery<Employee>({
    queryKey: ['employee', id],
    queryFn: async () => {
      const { data } = await api.get<Employee>(`/api/employees/${id}`);
      return data;
    }
  });

  if (isLoading) return <p>يتم التحميل...</p>;
  if (!data) return <p>لا يوجد بيانات.</p>;

  return (
    <div className="space-y-6">
      <section className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold">{data.fullName}</h2>
        <p>{data.jobTitle}</p>
        <p>القسم: {data.department ?? 'غير محدد'}</p>
        <p>المشروع: {data.project ?? 'غير محدد'}</p>
      </section>
      <section className="bg-white p-6 rounded shadow">
        <h3 className="text-lg font-semibold mb-4">العقود</h3>
        <div className="space-y-3">
          {data.contracts.map((contract) => (
            <div key={contract.id} className="border rounded p-4">
              <div className="flex justify-between">
                <span>{contract.type}</span>
                <span>{contract.currency && contract.basicSalary ? `${contract.basicSalary} ${contract.currency}` : 'مخفي'}</span>
              </div>
              <p>
                {new Date(contract.startDate).toLocaleDateString()} -
                {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'مفتوح'}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
