import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useState } from 'react';

interface PayrollBatch {
  id: string;
  month: number;
  year: number;
  status: string;
  postedJournalId?: string | null;
}

export default function PayrollPage() {
  const [form, setForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const queryClient = useQueryClient();
  const { data } = useQuery<PayrollBatch[]>({
    queryKey: ['payroll-batches'],
    queryFn: async () => {
      const { data } = await api.get<PayrollBatch[]>('/api/payroll/batches');
      return data;
    }
  });

  const createBatch = useMutation({
    mutationFn: async () => {
      await api.post('/api/payroll/batches', form);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll-batches'] })
  });

  const calculateBatch = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/api/payroll/batches/${id}/calculate`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll-batches'] })
  });

  const postBatch = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/api/payroll/batches/${id}/post`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll-batches'] })
  });

  return (
    <div className="space-y-6">
      <section className="bg-white rounded shadow p-4 space-y-3">
        <h2 className="text-xl font-semibold">إنشاء دفعة رواتب</h2>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2">
            <span>الشهر</span>
            <input type="number" min={1} max={12} value={form.month} onChange={(e) => setForm({ ...form, month: Number(e.target.value) })} className="border rounded px-2 py-1 w-20" />
          </label>
          <label className="flex items-center gap-2">
            <span>السنة</span>
            <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} className="border rounded px-2 py-1 w-24" />
          </label>
          <button onClick={() => createBatch.mutate()} className="px-4 py-2 bg-sky-600 text-white rounded">
            إنشاء
          </button>
        </div>
      </section>
      <section className="bg-white rounded shadow">
        <table className="min-w-full text-right">
          <thead className="bg-slate-100 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">الشهر</th>
              <th className="px-3 py-2">السنة</th>
              <th className="px-3 py-2">الحالة</th>
              <th className="px-3 py-2">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((batch) => (
              <tr key={batch.id} className="border-b last:border-b-0">
                <td className="px-3 py-2">{batch.month}</td>
                <td className="px-3 py-2">{batch.year}</td>
                <td className="px-3 py-2">{batch.status}</td>
                <td className="px-3 py-2 space-x-2 space-x-reverse">
                  <button onClick={() => calculateBatch.mutate(batch.id)} className="text-blue-600">
                    حساب
                  </button>
                  <button onClick={() => postBatch.mutate(batch.id)} className="text-green-600">
                    ترحيل
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
