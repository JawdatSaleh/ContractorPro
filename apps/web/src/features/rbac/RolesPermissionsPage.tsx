import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useState } from 'react';

interface Role {
  id: string;
  key: string;
  nameAr: string;
}

interface Permission {
  id: string;
  key: string;
  nameAr: string;
}

export default function RolesPermissionsPage() {
  const queryClient = useQueryClient();
  const { data: roles } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await api.get<Role[]>('/api/iam/roles');
      return data;
    }
  });
  const { data: permissions } = useQuery<Permission[]>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data } = await api.get<Permission[]>('/api/iam/permissions');
      return data;
    }
  });

  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const updateRole = useMutation({
    mutationFn: async () => {
      if (!selectedRole) return;
      await api.post(`/api/iam/roles/${selectedRole}/permissions`, { permissionIds: selectedPermissions });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] })
  });

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) => (prev.includes(permissionId) ? prev.filter((id) => id !== permissionId) : [...prev, permissionId]));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">إدارة الأدوار والصلاحيات</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="bg-white rounded shadow p-4">
          <h3 className="text-lg font-semibold mb-2">الأدوار</h3>
          <ul className="space-y-2">
            {roles?.map((role) => (
              <li key={role.id}>
                <button
                  onClick={() => {
                    setSelectedRole(role.id);
                    setSelectedPermissions([]);
                  }}
                  className={`w-full text-right px-3 py-2 rounded ${selectedRole === role.id ? 'bg-sky-100 text-sky-700' : 'bg-slate-100'}`}
                >
                  {role.nameAr} ({role.key})
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section className="bg-white rounded shadow p-4">
          <h3 className="text-lg font-semibold mb-2">الصلاحيات</h3>
          <div className="space-y-2 max-h-96 overflow-auto">
            {permissions?.map((permission) => (
              <label key={permission.id} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded">
                <span>{permission.nameAr}</span>
                <input
                  type="checkbox"
                  checked={selectedPermissions.includes(permission.id)}
                  onChange={() => togglePermission(permission.id)}
                />
              </label>
            ))}
          </div>
          <button disabled={!selectedRole} onClick={() => updateRole.mutate()} className="mt-3 px-4 py-2 bg-sky-600 text-white rounded disabled:opacity-40">
            حفظ
          </button>
        </section>
      </div>
    </div>
  );
}
