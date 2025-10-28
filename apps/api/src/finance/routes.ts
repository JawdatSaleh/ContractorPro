import type { FastifyInstance } from 'fastify';
import { prisma } from '../common/prisma.js';
import { createPayrollBatchSchema } from '../common/validators.js';
import { ValidationError } from '../common/errors.js';
import { permissionKeys, roleKeys } from '../auth/roles.js';
import { requirePermission, requireRole } from '../auth/rbac.js';
import { z } from 'zod';
import { recordActivity } from '../activity/service.js';
import { serializeEntity } from '../common/serialization.js';

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

function sumJsonValues(record: Record<string, unknown>) {
  return Object.values(record).reduce((total, value) => {
    if (typeof value === 'number') return total + value;
    const numeric = Number(value);
    return Number.isNaN(numeric) ? total : total + numeric;
  }, 0);
}

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
    await recordActivity({
      userId: request.user?.sub,
      actionType: 'payroll.batch.create',
      entityType: 'payroll_batch',
      entityId: batch.id,
      description: `إنشاء دفعة رواتب ${batch.month}/${batch.year}`,
      metadata: {
        month: batch.month,
        year: batch.year
      },
      request
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
    await recordActivity({
      userId: request.user?.sub,
      actionType: 'payroll.batch.calculate',
      entityType: 'payroll_batch',
      entityId: batchId,
      description: 'حساب عناصر دفعة الرواتب',
      metadata: {
        items: items.length
      },
      request
    });
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

    await recordActivity({
      userId: request.user?.sub,
      actionType: 'payroll.batch.post',
      entityType: 'payroll_batch',
      entityId: batchId,
      description: 'ترحيل دفعة الرواتب إلى القيود المحاسبية',
      metadata: {
        journalId: journal.id,
        totalsByCostCenter
      },
      request
    });

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

  app.get('/api/payroll', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.CEO, roleKeys.CFO, roleKeys.ACCOUNTANT, roleKeys.HR_MANAGER, roleKeys.SUPERVISOR, roleKeys.ENGINEER, roleKeys.EMPLOYEE]) }, async (request, reply) => {
    const schema = z.object({ employeeId: z.string() });
    const parsed = schema.safeParse(request.query);
    if (!parsed.success) throw new ValidationError(parsed.error.flatten());

    const employeeId = parsed.data.employeeId;
    const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { userId: true } });
    if (!employee) {
      reply.code(404).send({ message: 'Employee not found' });
      return;
    }
    if (request.user?.roles.includes(roleKeys.EMPLOYEE) && employee.userId && request.user.sub !== employee.userId) {
      reply.code(403).send({ message: 'Access denied' });
      return;
    }

    const items = await prisma.payrollItem.findMany({
      where: { employeeId },
      include: { batch: true },
      orderBy: [
        { batch: { year: 'desc' } },
        { batch: { month: 'desc' } }
      ]
    });

    const mapped = items.map((item) => {
      const earnings = toRecord(item.earningsJson ?? {});
      const deductions = toRecord(item.deductionsJson ?? {});
      const allowancesValue = Number(earnings.allowances ?? earnings.allowancesTotal ?? 0);
      const currency = typeof earnings.currency === 'string' && earnings.currency.length > 0 ? earnings.currency : 'SAR';
      const month = item.batch
        ? `${item.batch.year}-${String(item.batch.month).padStart(2, '0')}`
        : new Date().toISOString().slice(0, 7);

      return {
        id: item.id,
        employeeId: item.employeeId,
        month,
        netSalary: Number(item.net),
        allowances: Number.isFinite(allowancesValue) ? allowancesValue : 0,
        deductions: sumJsonValues(deductions),
        status: item.batch?.status ?? 'draft',
        currency
      };
    });

    reply.send(mapped);
  });

  app.get('/api/expenses', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.CEO, roleKeys.CFO, roleKeys.ACCOUNTANT, roleKeys.HR_MANAGER, roleKeys.SUPERVISOR, roleKeys.ENGINEER, roleKeys.EMPLOYEE]) }, async (request, reply) => {
    const schema = z.object({ employeeId: z.string() });
    const parsed = schema.safeParse(request.query);
    if (!parsed.success) throw new ValidationError(parsed.error.flatten());

    const employeeId = parsed.data.employeeId;
    const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { userId: true } });
    if (!employee) {
      reply.code(404).send({ message: 'Employee not found' });
      return;
    }
    if (request.user?.roles.includes(roleKeys.EMPLOYEE) && employee.userId && request.user.sub !== employee.userId) {
      reply.code(403).send({ message: 'Access denied' });
      return;
    }

    const expenses = await prisma.expense.findMany({
      where: { employeeId },
      orderBy: { date: 'desc' }
    });

    reply.send(
      expenses.map((expense) => ({
        id: expense.id,
        employeeId: expense.employeeId,
        description: expense.reference ?? expense.category,
        category: expense.category,
        amount: Number(expense.amount),
        currency: expense.currency,
        expenseDate: expense.date.toISOString()
      }))
    );
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
    await recordActivity({
      userId: request.user?.sub,
      actionType: 'advance.create',
      entityType: 'advance',
      entityId: advance.id,
      description: 'إنشاء طلب سلفة جديدة',
      metadata: {
        employeeId: advance.employeeId,
        amount: Number(advance.amount),
        currency: advance.currency
      },
      request
    });
    return advance;
  });

  app.patch('/api/advances/:id/approve', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.CFO, roleKeys.ACCOUNTANT]) }, async (request) => {
    const schema = z.object({ status: z.enum(['approved', 'rejected']), repaymentMonths: z.number().int().positive().optional() });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.flatten());
    const before = await prisma.advance.findUnique({ where: { id: String(request.params['id']) } });
    const updated = await prisma.advance.update({
      where: { id: String(request.params['id']) },
      data: {
        status: parsed.data.status,
        repaymentMonths: parsed.data.repaymentMonths,
        approvedBy: request.user?.sub ?? null
      }
    });
    await recordActivity({
      userId: request.user?.sub,
      actionType: 'advance.status.update',
      entityType: 'advance',
      entityId: updated.id,
      description: `تحديث حالة السلفة إلى ${parsed.data.status}`,
      metadata: {
        before: serializeEntity(before),
        after: serializeEntity(updated)
      },
      request
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
    await recordActivity({
      userId: request.user?.sub,
      actionType: 'loan.create',
      entityType: 'loan',
      entityId: loan.id,
      description: 'إضافة قرض جديد للموظف',
      metadata: {
        employeeId: loan.employeeId,
        principal: Number(loan.principal),
        installment: Number(loan.installment)
      },
      request
    });
    return loan;
  });

  app.patch('/api/loans/:id/settle', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.CFO, roleKeys.ACCOUNTANT]) }, async (request) => {
    const before = await prisma.loan.findUnique({ where: { id: String(request.params['id']) } });
    const loan = await prisma.loan.update({
      where: { id: String(request.params['id']) },
      data: {
        status: 'settled',
        remaining: 0
      }
    });
    await recordActivity({
      userId: request.user?.sub,
      actionType: 'loan.settle',
      entityType: 'loan',
      entityId: loan.id,
      description: 'تسوية القرض بالكامل',
      metadata: {
        before: serializeEntity(before),
        after: serializeEntity(loan)
      },
      request
    });
    return loan;
  });

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
}
