import { api } from '../lib/api';

export interface Permission {
  id: string;
  key: string;
  nameAr: string;
}

export interface Role {
  id: string;
  key: string;
  nameAr: string;
  description?: string;
  permissions?: Permission[];
}

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  roles: Role[];
  permissions: Permission[];
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export const login = async (email: string, password: string) => {
  const { data } = await api.post<LoginResponse>('/api/auth/login', { email, password });
  return data;
};

export const fetchProfile = async () => {
  const { data } = await api.get<AuthUser>('/api/auth/profile');
  return data;
};

export const fetchRoles = async () => {
  const { data } = await api.get<Role[]>('/api/iam/roles');
  return data;
};

export const fetchPermissions = async () => {
  const { data } = await api.get<Permission[]>('/api/iam/permissions');
  return data;
};

export const updateRolePermissions = async (roleId: string, permissionIds: string[]) => {
  await api.post(`/api/iam/roles/${roleId}/permissions`, { permissionIds });
};
