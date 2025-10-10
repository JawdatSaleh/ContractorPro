import { api } from '../lib/api';
import { Role } from './auth';

export interface EmployeeSummary {
  id: string;
  code: string;
  fullName: string;
  jobTitle?: string;
  department?: string;
  status: 'active' | 'inactive' | 'probation' | 'terminated';
  avatarUrl?: string | null;
  roleKeys?: string[];
}

export interface EmployeeContact {
  email: string;
  phone?: string;
  address?: string;
}

export interface EmployeeContractSummary {
  id: string;
  contractNumber: string;
  projectName: string;
  startDate: string;
  endDate?: string;
  status: 'draft' | 'active' | 'closed';
  value?: number;
  currency?: string;
}

export interface EmployeeAdvanceSummary {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'settled';
  requestedAt: string;
}

export interface EmployeeLoanSummary {
  id: string;
  principal: number;
  remaining: number;
  installment: number;
  currency: string;
  status: 'active' | 'settled' | 'overdue';
  startedAt: string;
}

export interface EmployeeFinanceSummary {
  monthlySalary: number;
  allowances: number;
  deductions: number;
  expenses: number;
  currency: string;
}

export interface EmployeeExpenseItem {
  id: string;
  description: string;
  category: string;
  amount: number;
  currency: string;
  expenseDate: string;
}

export interface EmployeeDetails extends EmployeeSummary {
  nationalId?: string;
  hireDate?: string;
  contractType?: string;
  contact: EmployeeContact;
  manager?: string;
  roles?: Role[];
  notes?: string;
}

export interface UpsertEmployeePayload {
  code: string;
  fullName: string;
  jobTitle?: string;
  department?: string;
  status: EmployeeDetails['status'];
  email: string;
  phone?: string;
  hireDate?: string;
  salary?: number;
  currency?: string;
  roleIds?: string[];
  managerId?: string;
  notes?: string;
}

export const fetchEmployees = async (params?: Record<string, unknown>) => {
  const { data } = await api.get<EmployeeSummary[]>('/api/employees', { params });
  return data;
};

export const fetchEmployeeById = async (id: string) => {
  const { data } = await api.get<EmployeeDetails>(`/api/employees/${id}`);
  return data;
};

export const fetchEmployeeFinance = async (id: string) => {
  const { data } = await api.get<EmployeeFinanceSummary>(`/api/employees/${id}/finance`);
  return data;
};

export const fetchEmployeeExpenses = async (id: string) => {
  const { data } = await api.get<EmployeeExpenseItem[]>(`/api/employees/${id}/expenses`);
  return data;
};

export const fetchEmployeeContracts = async (id: string) => {
  const { data } = await api.get<EmployeeContractSummary[]>(`/api/employees/${id}/contracts`);
  return data;
};

export const fetchEmployeeAdvances = async (id: string) => {
  const { data } = await api.get<EmployeeAdvanceSummary[]>(`/api/employees/${id}/advances`);
  return data;
};

export const fetchEmployeeLoans = async (id: string) => {
  const { data } = await api.get<EmployeeLoanSummary[]>(`/api/employees/${id}/loans`);
  return data;
};

export const createEmployee = async (payload: UpsertEmployeePayload) => {
  const { data } = await api.post<EmployeeDetails>('/api/employees', payload);
  return data;
};

export const updateEmployee = async (id: string, payload: UpsertEmployeePayload) => {
  const { data } = await api.put<EmployeeDetails>(`/api/employees/${id}`, payload);
  return data;
};
