import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useState } from 'react';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  day: string;
  status: string;
  shiftCode?: string | null;
}

export default function AttendancePage() {
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const queryClient = useQueryClient();
  const { data } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendance', date],
    queryFn: async () => {
      const { data } = await api.get<AttendanceRecord[]>('/api/attendance', { params: { from: date, to: date } });
      return data;
    }
  });

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/attendance/bulk', {
        records: [{ employeeId: 'EMP-001', day: date, status: 'present' }]
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance', date] })
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">الحضور اليومي</h2>
      <div className="bg-white p-4 rounded shadow space-y-3">
        <label className="flex gap-2 items-center">
          <span>تاريخ</span>
          <input value={date} onChange={(e) => setDate(e.target.value)} type="date" className="border rounded px-2 py-1" />
        </label>
        <button onClick={() => mutation.mutate()} className="px-4 py-2 bg-sky-600 text-white rounded">
          تسجيل حضور افتراضي
        </button>
      </div>
      <div className="bg-white rounded shadow">
        <table className="min-w-full text-right">
          <thead>
            <tr className="bg-slate-100 text-xs text-slate-500">
              <th className="px-3 py-2">الموظف</th>
              <th className="px-3 py-2">اليوم</th>
              <th className="px-3 py-2">الحالة</th>
              <th className="px-3 py-2">الوردية</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((record) => (
              <tr key={record.id} className="border-b last:border-b-0">
                <td className="px-3 py-2">{record.employeeId}</td>
                <td className="px-3 py-2">{new Date(record.day).toLocaleDateString()}</td>
                <td className="px-3 py-2">{record.status}</td>
                <td className="px-3 py-2">{record.shiftCode ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
