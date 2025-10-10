export const roleKeys = {
  ADMIN: 'system_admin',
  CEO: 'ceo',
  CFO: 'cfo',
  ACCOUNTANT: 'accountant',
  HR_MANAGER: 'hr_manager',
  SUPERVISOR: 'supervisor',
  ENGINEER: 'engineer',
  EMPLOYEE: 'employee'
} as const;

export const rolesHierarchy: Record<string, string[]> = {
  [roleKeys.ADMIN]: Object.values(roleKeys),
  [roleKeys.CEO]: [roleKeys.CEO, roleKeys.CFO, roleKeys.HR_MANAGER, roleKeys.SUPERVISOR, roleKeys.ENGINEER, roleKeys.EMPLOYEE],
  [roleKeys.CFO]: [roleKeys.CFO, roleKeys.ACCOUNTANT, roleKeys.EMPLOYEE],
  [roleKeys.ACCOUNTANT]: [roleKeys.ACCOUNTANT, roleKeys.EMPLOYEE],
  [roleKeys.HR_MANAGER]: [roleKeys.HR_MANAGER, roleKeys.SUPERVISOR, roleKeys.ENGINEER, roleKeys.EMPLOYEE],
  [roleKeys.SUPERVISOR]: [roleKeys.SUPERVISOR, roleKeys.EMPLOYEE],
  [roleKeys.ENGINEER]: [roleKeys.ENGINEER],
  [roleKeys.EMPLOYEE]: [roleKeys.EMPLOYEE]
};

export const permissionKeys = {
  MANAGE_USERS: 'manage_users',
  VIEW_EMPLOYEES: 'view_employees',
  EDIT_EMPLOYEES: 'edit_employees',
  VIEW_CONTRACT_VALUES: 'view_contract_values',
  MANAGE_PAYROLL: 'manage_payroll',
  APPROVE_ADVANCES: 'approve_advances',
  VIEW_FINANCE_REPORTS: 'view_finance_reports'
} as const;
