import { api } from '../lib/api';

export interface ContractRecord {
  id: string;
  employeeId: string;
  contractNumber: string;
  projectName: string;
  startDate: string;
  endDate?: string;
  status: 'draft' | 'active' | 'closed';
  value?: number;
  currency?: string;
}

export const fetchContractsByEmployee = async (employeeId: string) => {
  const { data } = await api.get<ContractRecord[]>(`/api/contracts?employeeId=${employeeId}`);
  return data;
};
