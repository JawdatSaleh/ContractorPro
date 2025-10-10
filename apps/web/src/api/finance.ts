import { api } from '../lib/api';

export interface PayrollRecord {
  id: string;
  employeeId: string;
  month: string;
  netSalary: number;
  allowances: number;
  deductions: number;
  status: 'draft' | 'approved' | 'paid';
  currency: string;
}

export interface ExpenseRecord {
  id: string;
  employeeId: string;
  description: string;
  category: string;
  amount: number;
  currency: string;
  expenseDate: string;
}

export const fetchPayrollByEmployee = async (employeeId: string) => {
  const { data } = await api.get<PayrollRecord[]>(`/api/payroll?employeeId=${employeeId}`);
  return data;
};

export const fetchExpensesByEmployee = async (employeeId: string) => {
  const { data } = await api.get<ExpenseRecord[]>(`/api/expenses?employeeId=${employeeId}`);
  return data;
};
