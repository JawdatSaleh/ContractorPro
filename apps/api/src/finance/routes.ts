import type { FastifyInstance } from 'fastify';
import { prisma } from '../common/prisma.js';
import { createPayrollBatchSchema } from '../common/validators.js';
import { ValidationError } from '../common/errors.js';
import { permissionKeys, roleKeys } from '../auth/roles.js';
import { requirePermission, requireRole } from '../auth/rbac.js';
import { z } from 'zod';

export function financeRoutes(app: FastifyInstance) {
  app.post('/api/payroll/batches', { preHandler: requirePermission([permissionKeys.MANAGE_PAYROLL]) }, async (request) => {
    const parsed = createPayrollBatchSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.flatten());
    const batch = await prisma.payrollBatch.create({
      data: {
        month: parsed.data.month,
        year: parsed.data.year,
        status: 'draft',
        createdBy: request.user?.sub ?? null
      }
    });
    return batch;
  });

  app.post('/api/payroll/batches/:id/calculate', { preHandler: requirePermission([permissionKeys.MANAGE_PAYROLL]) }, async (request) => {
    const batchId = String(request.params['id']);
    const employees = await prisma.employee.findMany({ include: { project: true } });
    await prisma.payrollItem.deleteMany({ where: { batchId } });
    const items = employees.map((employee) => {
      const earnings = { basic: Number(employee.monthlyBasic ?? 0), allowances: Number((employee.allowancesJson as any)?.total ?? 0) };
      const gross = earnings.basic + earnings.allowances;
      const deductions = { social: gross * 0.045 };
      const net = gross - deductions.social;
      return {
        batchId,
        employeeId: employee.id,
        earningsJson: earnings,
        deductionsJson: deductions,
        gross,
        net,
        loanDeduction: 0,
        advanceDeduction: 0,
        costCenter: employee.project?.costCenterCode ?? 'GENERAL'
      };
    });
    if (items.length) {
      await prisma.payrollItem.createMany({ data: items });
    }
    await prisma.payrollBatch.update({ where: { id: batchId }, data: { status: 'calculated' } });
    return { success: true, count: items.length };
  });

  app.post('/api/payroll/batches/:id/post', { preHandler: requirePermission([permissionKeys.MANAGE_PAYROLL]) }, async (request) => {
    const batchId = String(request.params['id']);
    const batch = await prisma.payrollBatch.findUnique({ where: { id: batchId }, include: { items: true } });
    if (!batch) throw new ValidationError('Invalid batch id');
    if (batch.items.length === 0) throw new ValidationError('Batch has no items');

    const totalsByCostCenter = batch.items.reduce<Record<string, number>>((acc, item) => {
      acc[item.costCenter] = (acc[item.costCenter] ?? 0) + Number(item.net);
      return acc;
    }, {});

    const journal = await prisma.journal.create({
      data: {
        date: new Date(),
        description: `Payroll posting ${batch.month}/${batch.year}`,
        status: 'posted',
        entries: {
          create: Object.entries(totalsByCostCenter).flatMap(([costCenter, total]) => [
            {
              accountCode: '5001',
              debit: total,
              credit: 0,
              costCenter,
              ref: batchId
            },
            {
              accountCode: '2103',
              debit: 0,
              credit: total,
              costCenter,
              ref: batchId
            }
          ])
        }
      }
    });

    await prisma.payrollBatch.update({ where: { id: batchId }, data: { status: 'posted', postedJournalId: journal.id } });

    return journal;
  });

  app.get('/api/payroll/batches/:id/journal', { preHandler: requirePermission([permissionKeys.MANAGE_PAYROLL, permissionKeys.VIEW_FINANCE_REPORTS]) }, async (request) => {
    const batchId = String(request.params['id']);
    const batch = await prisma.payrollBatch.findUnique({ where: { id: batchId } });
    if (!batch?.postedJournalId) {
      return { message: 'Batch not posted yet' };
    }
    const journal = await prisma.journal.findUnique({
      where: { id: batch.postedJournalId },
      include: { entries: true }
    });
    return journal;
  });

  app.post('/api/advances', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.CFO, roleKeys.ACCOUNTANT, roleKeys.HR_MANAGER, roleKeys.SUPERVISOR, roleKeys.ENGINEER, roleKeys.EMPLOYEE]) }, async (request) => {
    const schema = z.object({
      employeeId: z.string(),
      requestDate: z.string(),
      amount: z.number().positive(),
      currency: z.string(),
      reason: z.string().optional()
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.flatten());
    const advance = await prisma.advance.create({
      data: {
        employeeId: parsed.data.employeeId,
        requestDate: new Date(parsed.data.requestDate),
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        status: 'pending',
        reason: parsed.data.reason
      }
    });
    return advance;
  });

  app.patch('/api/advances/:id/approve', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.CFO, roleKeys.ACCOUNTANT]) }, async (request) => {
    const schema = z.object({ status: z.enum(['approved', 'rejected']), repaymentMonths: z.number().int().positive().optional() });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.flatten());
    const updated = await prisma.advance.update({
      where: { id: String(request.params['id']) },
      data: {
        status: parsed.data.status,
        repaymentMonths: parsed.data.repaymentMonths,
        approvedBy: request.user?.sub ?? null
      }
    });
    return updated;
  });

  app.post('/api/loans', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.CFO, roleKeys.ACCOUNTANT, roleKeys.HR_MANAGER]) }, async (request) => {
    const schema = z.object({
      employeeId: z.string(),
      principal: z.number(),
      installment: z.number(),
      startMonth: z.string()
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.flatten());
    const loan = await prisma.loan.create({
      data: {
        employeeId: parsed.data.employeeId,
        principal: parsed.data.principal,
        remaining: parsed.data.principal,
        installment: parsed.data.installment,
        startMonth: parsed.data.startMonth,
        status: 'active'
      }
    });
    return loan;
  });

  app.patch('/api/loans/:id/settle', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.CFO, roleKeys.ACCOUNTANT]) }, async (request) => {
    const loan = await prisma.loan.update({
      where: { id: String(request.params['id']) },
      data: {
        status: 'settled',
        remaining: 0
      }
    });
    return loan;
  });
}

  app.get('/api/advances', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.CFO, roleKeys.ACCOUNTANT, roleKeys.HR_MANAGER, roleKeys.SUPERVISOR, roleKeys.ENGINEER, roleKeys.EMPLOYEE]) }, async (request) => {
    const where: any = {};
    if (request.user?.roles.includes(roleKeys.EMPLOYEE) || request.user?.roles.includes(roleKeys.ENGINEER)) {
      where.employeeId = request.user?.sub;
    }
    return prisma.advance.findMany({ where, orderBy: { requestDate: 'desc' } });
  });

  app.get('/api/loans', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.CFO, roleKeys.ACCOUNTANT, roleKeys.HR_MANAGER, roleKeys.ENGINEER, roleKeys.EMPLOYEE]) }, async (request) => {
    const where: any = {};
    if (request.user?.roles.includes(roleKeys.EMPLOYEE) || request.user?.roles.includes(roleKeys.ENGINEER)) {
      where.employeeId = request.user?.sub;
    }
    return prisma.loan.findMany({ where });
  });

  app.get('/api/payroll/batches', { preHandler: requirePermission([permissionKeys.MANAGE_PAYROLL, permissionKeys.VIEW_FINANCE_REPORTS]) }, async () => {
    return prisma.payrollBatch.findMany({ orderBy: [{ year: 'desc' }, { month: 'desc' }] });
  });

  app.get('/api/reports/cost-centers', { preHandler: requirePermission([permissionKeys.VIEW_FINANCE_REPORTS, permissionKeys.MANAGE_PAYROLL]) }, async () => {
    const items = await prisma.payrollItem.groupBy({
      by: ['costCenter'],
      _sum: { net: true }
    });
    return items.map((row) => ({ costCenter: row.costCenter, totalNet: Number(row._sum.net ?? 0) }));
  });
