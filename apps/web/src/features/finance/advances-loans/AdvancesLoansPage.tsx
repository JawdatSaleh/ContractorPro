import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';

interface Advance {
  id: string;
  employeeId: string;
  amount: number;
  status: string;
  currency: string;
}

interface Loan {
  id: string;
  employeeId: string;
  principal: number;
  remaining: number;
  installment: number;
  status: string;
}

export default function AdvancesLoansPage() {
  const queryClient = useQueryClient();
  const { data: advances } = useQuery<Advance[]>({
    queryKey: ['advances'],
    queryFn: async () => {
      const { data } = await api.get<Advance[]>('/api/advances');
      return data;
    }
  });
  const { data: loans } = useQuery<Loan[]>({
    queryKey: ['loans'],
    queryFn: async () => {
      const { data } = await api.get<Loan[]>('/api/loans');
      return data;
    }
  });

  const approveAdvance = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/api/advances/${id}/approve`, { status: 'approved' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['advances'] })
  });

  const settleLoan = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/api/loans/${id}/settle`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['loans'] })
  });

  return (
    <div className="space-y-6">
      <section className="bg-white rounded shadow">
        <h2 className="text-xl font-semibold p-4">السلف</h2>
        <table className="min-w-full text-right">
          <thead className="bg-slate-100 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">الموظف</th>
              <th className="px-3 py-2">المبلغ</th>
              <th className="px-3 py-2">الحالة</th>
              <th className="px-3 py-2">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {advances?.map((advance) => (
              <tr key={advance.id} className="border-b last:border-b-0">
                <td className="px-3 py-2">{advance.employeeId}</td>
                <td className="px-3 py-2">{advance.amount} {advance.currency}</td>
                <td className="px-3 py-2">{advance.status}</td>
                <td className="px-3 py-2">
                  <button onClick={() => approveAdvance.mutate(advance.id)} className="text-green-600">
                    اعتماد
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="bg-white rounded shadow">
        <h2 className="text-xl font-semibold p-4">القروض</h2>
        <table className="min-w-full text-right">
          <thead className="bg-slate-100 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">الموظف</th>
              <th className="px-3 py-2">الرصيد</th>
              <th className="px-3 py-2">القسط</th>
              <th className="px-3 py-2">الحالة</th>
              <th className="px-3 py-2">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loans?.map((loan) => (
              <tr key={loan.id} className="border-b last:border-b-0">
                <td className="px-3 py-2">{loan.employeeId}</td>
                <td className="px-3 py-2">{loan.remaining}</td>
                <td className="px-3 py-2">{loan.installment}</td>
                <td className="px-3 py-2">{loan.status}</td>
                <td className="px-3 py-2">
                  <button onClick={() => settleLoan.mutate(loan.id)} className="text-green-600">
                    إقفال
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
