import { z } from 'zod';

export const paginationQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});

export const employeeFilterQuery = z.object({
  projectId: z.string().optional(),
  departmentId: z.string().optional(),
  department: z.string().optional(),
  q: z.string().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  roleKey: z.string().optional()
});

export const createPayrollBatchSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2000),
  description: z.string().optional()
});
