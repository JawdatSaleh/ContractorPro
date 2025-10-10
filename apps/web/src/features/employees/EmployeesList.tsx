import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

interface Employee {
  id: string;
  code: string;
  fullName: string;
  jobTitle?: string;
  department?: string | null;
  project?: string | null;
  status: string;
}

export default function EmployeesList() {
  const { data, isLoading } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data } = await api.get<Employee[]>('/api/employees');
      return data;
    }
  });

  if (isLoading) return <p>يتم التحميل...</p>;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">الموظفون</h2>
        <button className="px-4 py-2 bg-sky-600 text-white rounded">إضافة موظف</button>
      </header>
      <div className="bg-white shadow rounded">
        <table className="min-w-full text-right">
          <thead className="bg-slate-100 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">الكود</th>
              <th className="px-4 py-2">الاسم</th>
              <th className="px-4 py-2">المسمى الوظيفي</th>
              <th className="px-4 py-2">القسم</th>
              <th className="px-4 py-2">المشروع</th>
              <th className="px-4 py-2">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((employee) => (
              <tr key={employee.id} className="border-b last:border-b-0 hover:bg-slate-50">
                <td className="px-4 py-2 font-mono">{employee.code}</td>
                <td className="px-4 py-2">
                  <Link className="text-sky-600" to={`/employees/${employee.id}`}>
                    {employee.fullName}
                  </Link>
                </td>
                <td className="px-4 py-2">{employee.jobTitle ?? '-'}</td>
                <td className="px-4 py-2">{employee.department ?? '-'}</td>
                <td className="px-4 py-2">{employee.project ?? '-'}</td>
                <td className="px-4 py-2">{employee.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
