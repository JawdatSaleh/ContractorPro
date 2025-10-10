import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface ContractRow {
  id: string;
  employeeId: string;
  type: string;
  startDate: string;
  endDate?: string | null;
  basicSalary?: number;
  currency?: string;
}

export default function ContractsBoard() {
  const { data } = useQuery<ContractRow[]>({
    queryKey: ['contracts'],
    queryFn: async () => {
      const { data } = await api.get<ContractRow[]>('/api/contracts');
      return data;
    },
    staleTime: 0
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">العقود</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data?.map((contract) => (
          <div key={contract.id} className="bg-white rounded shadow p-4 space-y-2">
            <h3 className="font-semibold">{contract.type}</h3>
            <p>{new Date(contract.startDate).toLocaleDateString()}</p>
            <p>{contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'غير محدد'}</p>
            <p>{contract.basicSalary ? `${contract.basicSalary} ${contract.currency}` : 'مخفي'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
