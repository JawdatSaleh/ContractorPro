import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { fetchPermissions, fetchRoles, updateRolePermissions, Permission, Role } from '../api/auth';

interface RoleState {
  roles: Role[];
  permissions: Permission[];
  loading: boolean;
  selectedRoleId?: string;
  selectedPermissions: string[];
  fetchAll: () => Promise<void>;
  selectRole: (roleId: string, permissionIds: string[]) => void;
  togglePermission: (permissionId: string) => void;
  persistRolePermissions: () => Promise<void>;
}

export const useRoleStore = create<RoleState>()(
  devtools((set, get) => ({
    roles: [],
    permissions: [],
    loading: false,
    selectedRoleId: undefined,
    selectedPermissions: [],
    fetchAll: async () => {
      set({ loading: true });
      const [roles, permissions] = await Promise.all([fetchRoles(), fetchPermissions()]);
      set({ roles, permissions, loading: false });
    },
    selectRole: (roleId: string, permissionIds: string[]) => {
      set({ selectedRoleId: roleId, selectedPermissions: permissionIds });
    },
    togglePermission: (permissionId: string) => {
      const { selectedPermissions } = get();
      const exists = selectedPermissions.includes(permissionId);
      set({ selectedPermissions: exists ? selectedPermissions.filter((id) => id !== permissionId) : [...selectedPermissions, permissionId] });
    },
    persistRolePermissions: async () => {
      const { selectedRoleId, selectedPermissions, fetchAll } = get();
      if (!selectedRoleId) return;
      await updateRolePermissions(selectedRoleId, selectedPermissions);
      await fetchAll();
    }
  }))
);
