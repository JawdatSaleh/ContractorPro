import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface CostReportRow {
  costCenter: string;
  totalNet: number;
}

export default function ReportsPage() {
  const { data } = useQuery<CostReportRow[]>({
    queryKey: ['reports', 'cost-centers'],
    queryFn: async () => {
      const { data } = await api.get<CostReportRow[]>('/api/reports/cost-centers');
      return data;
    }
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">تقرير تكلفة مراكز التكلفة</h2>
      <div className="bg-white rounded shadow">
        <table className="min-w-full text-right">
          <thead className="bg-slate-100 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">مركز التكلفة</th>
              <th className="px-3 py-2">صافي الرواتب</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((row) => (
              <tr key={row.costCenter} className="border-b last:border-b-0">
                <td className="px-3 py-2">{row.costCenter}</td>
                <td className="px-3 py-2">{row.totalNet.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
