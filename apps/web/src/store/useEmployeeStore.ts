import { create } from 'zustand';
import type { StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  EmployeeAdvanceSummary,
  EmployeeContractSummary,
  EmployeeDetails,
  EmployeeExpenseItem,
  EmployeeFinanceSummary,
  EmployeeLoanSummary,
  EmployeeSummary,
  UpsertEmployeePayload,
  createEmployee,
  fetchEmployeeAdvances,
  fetchEmployeeById,
  fetchEmployeeContracts,
  fetchEmployeeExpenses,
  fetchEmployeeFinance,
  fetchEmployeeLoans,
  fetchEmployees,
  updateEmployee
} from '../api/employees';

interface EmployeeFilters {
  search?: string;
  status?: EmployeeSummary['status'] | 'all';
  department?: string;
  roleKey?: string;
}

interface EmployeeState {
  employees: EmployeeSummary[];
  selectedEmployee?: EmployeeDetails;
  financeSummary?: EmployeeFinanceSummary;
  contracts: EmployeeContractSummary[];
  advances: EmployeeAdvanceSummary[];
  loans: EmployeeLoanSummary[];
  expenses: EmployeeExpenseItem[];
  loading: boolean;
  detailLoading: boolean;
  filters: EmployeeFilters;
  fetchEmployees: () => Promise<void>;
  fetchEmployeeProfile: (id: string) => Promise<void>;
  createEmployee: (payload: UpsertEmployeePayload) => Promise<EmployeeDetails>;
  updateEmployee: (id: string, payload: UpsertEmployeePayload) => Promise<EmployeeDetails>;
  setFilters: (filters: Partial<EmployeeFilters>) => void;
  resetSelection: () => void;
}

const enableDevtools = typeof window !== 'undefined' && import.meta.env.DEV;

const initializer: StateCreator<EmployeeState> = (set, get) => ({
  employees: [],
  selectedEmployee: undefined,
  financeSummary: undefined,
  contracts: [],
  advances: [],
  loans: [],
  expenses: [],
  loading: false,
  detailLoading: false,
  filters: { status: 'all' },
  fetchEmployees: async () => {
    const { filters } = get();
    set({ loading: true });
    try {
      const params: Record<string, unknown> = {};
      if (filters.search) params.search = filters.search;
      if (filters.department) params.department = filters.department;
      if (filters.roleKey) params.roleKey = filters.roleKey;
      if (filters.status && filters.status !== 'all') params.status = filters.status;
      const employees = await fetchEmployees(params);
      set({ employees, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  fetchEmployeeProfile: async (id: string) => {
    set({ detailLoading: true });
    try {
      const [employee, financeSummary, contracts, advances, loans, expenses] = await Promise.all([
        fetchEmployeeById(id),
        fetchEmployeeFinance(id),
        fetchEmployeeContracts(id),
        fetchEmployeeAdvances(id),
        fetchEmployeeLoans(id),
        fetchEmployeeExpenses(id)
      ]);
      set({
        selectedEmployee: employee,
        financeSummary,
        contracts,
        advances,
        loans,
        expenses,
        detailLoading: false
      });
    } catch (error) {
      set({ detailLoading: false });
      throw error;
    }
  },
  createEmployee: async (payload: UpsertEmployeePayload) => {
    set({ loading: true });
    try {
      const employee = await createEmployee(payload);
      const employees = get().employees;
      set({ employees: [employee, ...employees], loading: false });
      return employee;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  updateEmployee: async (id: string, payload: UpsertEmployeePayload) => {
    set({ loading: true });
    try {
      const employee = await updateEmployee(id, payload);
      set({
        employees: get().employees.map((item) => (item.id === employee.id ? employee : item)),
        selectedEmployee: employee,
        loading: false
      });
      return employee;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  setFilters: (filters: Partial<EmployeeFilters>) => {
    set((state) => ({ filters: { ...state.filters, ...filters } }));
  },
  resetSelection: () => {
    set({ selectedEmployee: undefined, financeSummary: undefined, contracts: [], advances: [], loans: [], expenses: [] });
  }
});

export const useEmployeeStore = create<EmployeeState>()(
  enableDevtools ? devtools(initializer, { name: 'EmployeeStore' }) : initializer
);
