import { useEffect } from 'react';
import { useRoleStore } from '../../store/useRoleStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function RolesPermissionsPage() {
  const roles = useRoleStore((state) => state.roles);
  const permissions = useRoleStore((state) => state.permissions);
  const loading = useRoleStore((state) => state.loading);
  const selectedRoleId = useRoleStore((state) => state.selectedRoleId);
  const selectedPermissions = useRoleStore((state) => state.selectedPermissions);
  const fetchAll = useRoleStore((state) => state.fetchAll);
  const selectRole = useRoleStore((state) => state.selectRole);
  const togglePermission = useRoleStore((state) => state.togglePermission);
  const persistRolePermissions = useRoleStore((state) => state.persistRolePermissions);

  useEffect(() => {
    fetchAll().catch(() => undefined);
  }, [fetchAll]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">إدارة الأدوار والصلاحيات</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="الأدوار" padded>
          <ul className="space-y-2 text-right">
            {roles.map((role) => (
              <li key={role.id}>
                <button
                  onClick={() => selectRole(role.id, role.permissions?.map((permission) => permission.id) ?? [])}
                  className={`w-full rounded-xl px-4 py-2 text-sm transition ${
                    selectedRoleId === role.id
                      ? 'bg-sky-100 text-sky-700 shadow-inner dark:bg-sky-900/40 dark:text-sky-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900/60 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{role.nameAr}</span>
                    <span className="text-xs text-slate-500">{role.key}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="الصلاحيات" padded>
          <div className="max-h-[420px] space-y-2 overflow-auto text-right">
            {permissions.map((permission) => (
              <label key={permission.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2 text-sm dark:bg-slate-900/60">
                <span>{permission.nameAr}</span>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  checked={selectedPermissions.includes(permission.id)}
                  onChange={() => togglePermission(permission.id)}
                />
              </label>
            ))}
            {!loading && permissions.length === 0 && <p className="text-sm text-slate-500">لا توجد صلاحيات متاحة.</p>}
          </div>
          <Button
            className="mt-4"
            disabled={!selectedRoleId}
            onClick={() =>
              persistRolePermissions().catch(() => undefined)
            }
          >
            حفظ التغييرات
          </Button>
        </Card>
      </div>
    </div>
  );
}
