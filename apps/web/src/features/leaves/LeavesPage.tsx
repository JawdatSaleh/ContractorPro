import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../lib/api';

interface LeaveRow {
  id: string;
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
}

export default function LeavesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ employeeId: 'EMP-001', type: 'سنوية', startDate: '', endDate: '' });
  const { data } = useQuery<LeaveRow[]>({
    queryKey: ['leaves'],
    queryFn: async () => {
      const { data } = await api.get<LeaveRow[]>('/api/leaves');
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/leaves', form);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leaves'] })
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/api/leaves/${id}/approve`, { status: 'approved' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leaves'] })
  });

  return (
    <div className="space-y-6">
      <section className="bg-white p-4 rounded shadow space-y-3">
        <h2 className="text-xl font-semibold">طلب إجازة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span>الموظف</span>
            <input value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} className="border rounded px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>النوع</span>
            <input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="border rounded px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>من</span>
            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="border rounded px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>إلى</span>
            <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="border rounded px-2 py-1" />
          </label>
        </div>
        <button onClick={() => createMutation.mutate()} className="px-4 py-2 bg-sky-600 text-white rounded">
          إرسال الطلب
        </button>
      </section>
      <section className="bg-white rounded shadow">
        <table className="min-w-full text-right">
          <thead className="bg-slate-100 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">الموظف</th>
              <th className="px-3 py-2">النوع</th>
              <th className="px-3 py-2">الفترة</th>
              <th className="px-3 py-2">الحالة</th>
              <th className="px-3 py-2">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((leave) => (
              <tr key={leave.id} className="border-b last:border-b-0">
                <td className="px-3 py-2">{leave.employeeId}</td>
                <td className="px-3 py-2">{leave.type}</td>
                <td className="px-3 py-2">
                  {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                </td>
                <td className="px-3 py-2">{leave.status}</td>
                <td className="px-3 py-2">
                  <button onClick={() => approveMutation.mutate(leave.id)} className="text-green-600">
                    اعتماد
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
