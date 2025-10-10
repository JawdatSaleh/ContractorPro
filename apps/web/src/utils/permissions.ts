import { Permission } from '../api/auth';

export const hasPermission = (permissions: Permission[] | undefined, key: string) =>
  Boolean(permissions?.some((permission) => permission.key === key));

export const hasRole = (roles: { key: string }[] | undefined, key: string) =>
  Boolean(roles?.some((role) => role.key === key));

export const mapRoleToBadgeColor = (roleKey: string) => {
  switch (roleKey) {
    case 'executive_manager':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200';
    case 'accountant':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200';
    case 'auditor':
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200';
    case 'engineer':
      return 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200';
  }
};
