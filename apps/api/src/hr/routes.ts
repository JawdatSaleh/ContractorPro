import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { prisma } from '../common/prisma.js';
import { ValidationError } from '../common/errors.js';
import { roleKeys } from '../auth/roles.js';
import { requireRole } from '../auth/rbac.js';
import { z } from 'zod';
import { recordActivity } from '../activity/service.js';
import { serializeEntity } from '../common/serialization.js';

function sanitizeContractForRole(contract: any, roleKeysList: string[]) {
  const privileged = ['system_admin', 'ceo', 'cfo', 'hr_manager'];
  const canSeeMoney = roleKeysList.some((r) => privileged.includes(r));
  if (!canSeeMoney) {
    const { basicSalary, allowancesJson, ...rest } = contract;
    return rest;
  }
  return contract;
}

const allowedStatuses = ['active', 'inactive', 'probation', 'terminated'] as const;

const employeeStatusSchema = z.enum(allowedStatuses);

const employeeDirectoryFilterSchema = z.object({
  search: z.string().optional(),
  q: z.string().optional(),
  department: z.string().optional(),
  departmentId: z.string().optional(),
  projectId: z.string().optional(),
  status: z.string().optional(),
  roleKey: z.string().optional()
});

const upsertEmployeeSchema = z
  .object({
    code: z.string().min(1),
    fullName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    jobTitle: z.string().optional(),
    department: z.string().optional(),
    status: employeeStatusSchema,
    hireDate: z.string().optional(),
    salary: z.number().nonnegative().optional(),
    currency: z.string().min(1).optional(),
    roleIds: z.array(z.string()).optional(),
    notes: z.string().optional(),
    managerId: z.string().optional()
  })
  .strict();

type EmployeeDirectoryFilters = z.infer<typeof employeeDirectoryFilterSchema>;
type UpsertEmployeeInput = z.infer<typeof upsertEmployeeSchema>;

type EmployeeWithRelations = Prisma.EmployeeGetPayload<{
  include: { department: true; project: true; manager: true };
}>;

type UserWithRoles = Prisma.UserGetPayload<{
  include: { roles: { include: { role: true } } };
}>;

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

function extractEmployeeMetadata(employee: EmployeeWithRelations | (EmployeeWithRelations & { allowancesJson: Prisma.JsonValue | null })) {
  const allowances = toRecord((employee as any).allowancesJson ?? {});
  const metadataSource = 'metadata' in allowances ? allowances.metadata : allowances.__meta;
  const metadata = toRecord(metadataSource);
  const notes = typeof metadata.notes === 'string' && metadata.notes.length > 0 ? metadata.notes : undefined;
  const currency = typeof metadata.currency === 'string' && metadata.currency.length > 0 ? metadata.currency : undefined;
  return { allowances, metadata, notes, currency };
}

function mergeEmployeeMetadata(existing: Prisma.JsonValue | null | undefined, updates: { notes?: string; currency?: string }) {
  const allowances = toRecord(existing ?? {});
  const metadataSource = 'metadata' in allowances ? allowances.metadata : allowances.__meta;
  const metadata = toRecord(metadataSource);
  if (updates.notes === undefined || updates.notes === '') {
    delete metadata.notes;
  } else {
    metadata.notes = updates.notes;
  }
  if (updates.currency) {
    metadata.currency = updates.currency;
  }
  allowances.metadata = metadata;
  return allowances;
}

function mapEmployeeSummary(employee: EmployeeWithRelations, user: UserWithRoles | undefined) {
  const roleKeysList = user ? user.roles.map((relation) => relation.role.key) : [];
  return {
    id: employee.id,
    code: employee.code,
    fullName: employee.fullName,
    jobTitle: employee.jobTitle ?? undefined,
    department: employee.department?.nameAr ?? undefined,
    status: employee.status as (typeof allowedStatuses)[number],
    avatarUrl: null,
    roleKeys: roleKeysList
  };
}

function mapEmployeeDetails(employee: EmployeeWithRelations, user: UserWithRoles | undefined) {
  const { notes } = extractEmployeeMetadata(employee);
  const roleRelations = user?.roles ?? [];
  const latestContractType = (employee as any).contracts?.[0]?.type as string | undefined;
  return {
    ...mapEmployeeSummary(employee, user),
    nationalId: employee.nationalId ?? undefined,
    hireDate: employee.hireDate ? employee.hireDate.toISOString() : undefined,
    contractType: latestContractType,
    contact: {
      email: user?.email ?? '',
      phone: user?.phone ?? undefined,
      address: undefined
    },
    manager: employee.manager?.fullName ?? undefined,
    roles: roleRelations.map((relation) => ({
      id: relation.role.id,
      key: relation.role.key,
      nameAr: relation.role.nameAr,
      description: relation.role.description ?? undefined
    })),
    notes
  };
}

async function fetchUsersByIds(userIds: string[]) {
  if (!userIds.length) return new Map<string, UserWithRoles>();
  const uniqueIds = Array.from(new Set(userIds));
  const users = await prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    include: { roles: { include: { role: true } } }
  });
  return new Map(users.map((user) => [user.id, user]));
}

async function fetchUserWithRoles(userId: string | null | undefined) {
  if (!userId) return undefined;
  return prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } }
  });
}

async function resolveDepartmentId(input?: string | null) {
  if (!input) return null;
  const byId = await prisma.department.findUnique({ where: { id: input } });
  if (byId) return byId.id;
  const byName = await prisma.department.findFirst({ where: { nameAr: { equals: input, mode: 'insensitive' } } });
  return byName?.id ?? null;
}

async function handleEmployeeUpsert(payload: UpsertEmployeeInput, existing?: EmployeeWithRelations & { userId: string | null }) {
  const departmentId = await resolveDepartmentId(payload.department ?? null);
  const hireDate = payload.hireDate ? new Date(payload.hireDate) : null;
  const metadata = mergeEmployeeMetadata(existing?.allowancesJson, { notes: payload.notes, currency: payload.currency ?? 'SAR' });

  if (existing) {
    const userId = existing.userId;
    return prisma.$transaction(async (trx) => {
      let user: UserWithRoles | undefined;
      if (userId) {
        user = await trx.user.update({
          where: { id: userId },
          data: {
            email: payload.email,
            phone: payload.phone ?? null
          },
          include: { roles: { include: { role: true } } }
        });
        await trx.userRole.deleteMany({ where: { userId } });
        if (payload.roleIds?.length) {
          await trx.userRole.createMany({
            data: payload.roleIds.map((roleId) => ({ userId, roleId }))
          });
        }
      }

      const updated = await trx.employee.update({
        where: { id: existing.id },
        data: {
          code: payload.code,
          fullName: payload.fullName,
          jobTitle: payload.jobTitle ?? null,
          status: payload.status,
          departmentId: departmentId ?? null,
          hireDate: hireDate ?? undefined,
          monthlyBasic: payload.salary ?? null,
          allowancesJson: metadata,
          managerId: payload.managerId ?? null
        },
        include: { department: true, project: true, manager: true }
      });

      return { employee: updated, user };
    });
  }

  const provisionalPassword = randomBytes(9).toString('base64url');
  const hashedPassword = await argon2.hash(provisionalPassword);

  return prisma.$transaction(async (trx) => {
    const user = await trx.user.create({
      data: {
        email: payload.email,
        phone: payload.phone ?? null,
        passwordHash: hashedPassword,
        status: 'active'
      },
      include: { roles: { include: { role: true } } }
    });

    if (payload.roleIds?.length) {
      await trx.userRole.createMany({
        data: payload.roleIds.map((roleId) => ({ userId: user.id, roleId }))
      });
    }

    const employee = await trx.employee.create({
      data: {
        userId: user.id,
        code: payload.code,
        fullName: payload.fullName,
        jobTitle: payload.jobTitle ?? null,
        departmentId: departmentId ?? null,
        status: payload.status,
        hireDate: hireDate ?? undefined,
        monthlyBasic: payload.salary ?? null,
        allowancesJson: metadata,
        managerId: payload.managerId ?? null
      },
      include: { department: true, project: true, manager: true }
    });

    return { employee, user };
  });
}

function isForbiddenEmployeeAccess(userId: string | undefined, roles: string[] | undefined, employee: { userId: string | null }) {
  if (!roles) return false;
  return Boolean(roles.includes(roleKeys.EMPLOYEE) && employee.userId && userId !== employee.userId);
}

function determineContractStatus(contract: { startDate: Date; endDate: Date | null }) {
  const now = new Date();
  if (contract.startDate > now) return 'draft';
  if (contract.endDate && contract.endDate < now) return 'closed';
  return 'active';
}

function parseLoanStartDate(startMonth: string | null) {
  if (!startMonth) return null;
  const [year, month] = startMonth.split('-');
  if (!year || !month) return null;
  const parsed = new Date(Number(year), Number(month) - 1, 1);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function sumJsonValues(record: Record<string, unknown>) {
  return Object.values(record).reduce((total, value) => {
    if (typeof value === 'number') return total + value;
    const numeric = Number(value);
    return Number.isNaN(numeric) ? total : total + numeric;
  }, 0);
}

export function hrRoutes(app: FastifyInstance) {
  app.get('/api/employees', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.CEO, roleKeys.CFO, roleKeys.HR_MANAGER, roleKeys.SUPERVISOR, roleKeys.ENGINEER, roleKeys.EMPLOYEE]) }, async (request, reply) => {
    const parsed = employeeDirectoryFilterSchema.safeParse(request.query);
    if (!parsed.success) throw new ValidationError(parsed.error.flatten());
    const filters = parsed.data as EmployeeDirectoryFilters;
    const statusFilter = filters.status && allowedStatuses.includes(filters.status as any) ? (filters.status as typeof allowedStatuses[number]) : undefined;
    const search = filters.search ?? filters.q ?? undefined;
    const userRoles = request.user?.roles ?? [];

    const employees = await prisma.employee.findMany({
      where: {
        ...(filters.projectId ? { projectId: filters.projectId } : {}),
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } }
              ]
            }
          : {})
      },
      include: {
        department: true,
        project: true,
        manager: true
      },
      orderBy: { fullName: 'asc' }
    });

    const userIds = employees.map((employee) => employee.userId).filter((id): id is string => Boolean(id));
    const userMap = await fetchUsersByIds(userIds);

    let filtered = employees;
    if (filters.department && !filters.departmentId) {
      filtered = filtered.filter((employee) =>
        employee.department?.nameAr ? employee.department.nameAr.toLowerCase().includes(filters.department!.toLowerCase()) : false
      );
    }
    if (filters.roleKey) {
      filtered = filtered.filter((employee) => {
        const user = employee.userId ? userMap.get(employee.userId) : undefined;
        return user ? user.roles.some((relation) => relation.role.key === filters.roleKey) : false;
      });
    }

    const result = filtered
      .map((employee) => {
        if (userRoles.includes(roleKeys.EMPLOYEE) && request.user?.sub !== employee.userId) {
          return null;
        }
        const user = employee.userId ? userMap.get(employee.userId) : undefined;
        return mapEmployeeSummary(employee, user);
      })
      .filter((employee): employee is ReturnType<typeof mapEmployeeSummary> => Boolean(employee));

    reply.send(result);
  });

  app.post('/api/employees', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.HR_MANAGER]) }, async (request, reply) => {
    const parsed = upsertEmployeeSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.flatten());

    const { employee, user } = await handleEmployeeUpsert(parsed.data);
    const detail = mapEmployeeDetails(employee, user);

    await recordActivity({
      userId: request.user?.sub,
      actionType: 'employee.create',
      entityType: 'employee',
      entityId: employee.id,
      description: 'إنشاء سجل موظف جديد',
      metadata: {
        employeeId: employee.id,
        code: employee.code,
        departmentId: employee.department?.id ?? null,
        roleIds: parsed.data.roleIds ?? []
      },
      request
    });

    reply.code(201).send(detail);
  });

  app.put('/api/employees/:id', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.HR_MANAGER]) }, async (request, reply) => {
    const parsed = upsertEmployeeSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.flatten());

    const employeeId = String(request.params['id']);
    const existing = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { department: true, project: true, manager: true }
    });
    if (!existing) {
      reply.code(404).send({ message: 'Employee not found' });
      return;
    }
    if (isForbiddenEmployeeAccess(request.user?.sub, request.user?.roles, existing)) {
      reply.code(403).send({ message: 'Access denied' });
      return;
    }

    const before = serializeEntity(existing);
    const { employee, user } = await handleEmployeeUpsert(parsed.data, existing);
    const detail = mapEmployeeDetails(employee, user ?? (existing.userId ? await fetchUserWithRoles(existing.userId) : undefined));

    await recordActivity({
      userId: request.user?.sub,
      actionType: 'employee.update',
      entityType: 'employee',
      entityId: employee.id,
      description: 'تحديث بيانات الموظف',
      metadata: {
        before,
        after: serializeEntity(employee)
      },
      request
    });

    reply.send(detail);
  });

  app.get('/api/employees/:id', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.CEO, roleKeys.CFO, roleKeys.HR_MANAGER, roleKeys.SUPERVISOR, roleKeys.ENGINEER, roleKeys.EMPLOYEE]) }, async (request, reply) => {
    const employeeId = String(request.params['id']);
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: true,
        project: true,
        manager: true,
        contracts: { orderBy: { startDate: 'desc' } }
      }
    });
    if (!employee) {
      reply.code(404).send({ message: 'Employee not found' });
      return;
    }
    if (isForbiddenEmployeeAccess(request.user?.sub, request.user?.roles, employee)) {
      reply.code(403).send({ message: 'Access denied' });
      return;
    }

    const user = await fetchUserWithRoles(employee.userId);
    const detail = mapEmployeeDetails(employee, user);
    const contracts = employee.contracts.map((contract) => {
      const sanitized = sanitizeContractForRole(contract, request.user?.roles ?? []);
      return {
        id: sanitized.id,
        type: sanitized.type,
        startDate: sanitized.startDate instanceof Date ? sanitized.startDate.toISOString() : sanitized.startDate,
        endDate: sanitized.endDate ? (sanitized.endDate instanceof Date ? sanitized.endDate.toISOString() : sanitized.endDate) : null,
        basicSalary: 'basicSalary' in sanitized ? Number(sanitized.basicSalary ?? 0) : undefined,
        currency: sanitized.currency ?? undefined
      };
    });

    reply.send({ ...detail, contracts });
  });

  app.get('/api/employees/:id/contracts', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.CEO, roleKeys.CFO, roleKeys.HR_MANAGER, roleKeys.SUPERVISOR, roleKeys.ENGINEER, roleKeys.EMPLOYEE]) }, async (request, reply) => {
    const employeeId = String(request.params['id']);
    const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { userId: true } });
    if (!employee) {
      reply.code(404).send({ message: 'Employee not found' });
      return;
    }
    if (isForbiddenEmployeeAccess(request.user?.sub, request.user?.roles, employee)) {
      reply.code(403).send({ message: 'Access denied' });
      return;
    }

    const contracts = await prisma.contract.findMany({
      where: { employeeId },
      include: { employee: { include: { project: true } } },
      orderBy: { startDate: 'desc' }
    });

    const mapped = contracts.map((contract) => {
      const sanitized = sanitizeContractForRole(contract, request.user?.roles ?? []);
      const startDate = contract.startDate instanceof Date ? contract.startDate : new Date(contract.startDate);
      const endDate = contract.endDate ? (contract.endDate instanceof Date ? contract.endDate : new Date(contract.endDate)) : null;
      const value = 'basicSalary' in sanitized ? Number(sanitized.basicSalary ?? 0) : undefined;
      const currency = 'currency' in sanitized ? sanitized.currency : undefined;

      return {
        id: contract.id,
        contractNumber: contract.id,
        projectName: contract.employee?.project?.nameAr ?? undefined,
        startDate: startDate.toISOString(),
        endDate: endDate ? endDate.toISOString() : undefined,
        status: determineContractStatus({ startDate, endDate }),
        value,
        currency
      };
    });

    reply.send(mapped);
  });

  app.get('/api/employees/:id/finance', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.CEO, roleKeys.CFO, roleKeys.ACCOUNTANT, roleKeys.HR_MANAGER, roleKeys.SUPERVISOR, roleKeys.ENGINEER, roleKeys.EMPLOYEE]) }, async (request, reply) => {
    const employeeId = String(request.params['id']);
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      reply.code(404).send({ message: 'Employee not found' });
      return;
    }
    if (isForbiddenEmployeeAccess(request.user?.sub, request.user?.roles, employee)) {
      reply.code(403).send({ message: 'Access denied' });
      return;
    }

    const { allowances, metadata } = extractEmployeeMetadata(employee);
    const allowancesClone = { ...allowances } as Record<string, unknown>;
    delete allowancesClone.metadata;
    delete (allowancesClone as any).__meta;

    const allowancesProfileTotal = typeof allowancesClone.total === 'number' ? allowancesClone.total : sumJsonValues(allowancesClone);

    const latestPayrollItem = await prisma.payrollItem.findFirst({
      where: { employeeId },
      include: { batch: true },
      orderBy: [
        { batch: { year: 'desc' } },
        { batch: { month: 'desc' } }
      ]
    });

    const earningsRecord = latestPayrollItem ? toRecord(latestPayrollItem.earningsJson ?? {}) : {};
    const deductionsRecord = latestPayrollItem ? toRecord(latestPayrollItem.deductionsJson ?? {}) : {};

    const allowancesPayroll = Number(earningsRecord.allowances ?? earningsRecord.allowancesTotal ?? 0);
    const deductionsTotal = sumJsonValues(deductionsRecord);
    const expensesAggregate = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: { employeeId }
    });

    const monthlySalary = Number(employee.monthlyBasic ?? 0);
    const allowancesValue = allowancesPayroll || allowancesProfileTotal || 0;
    const currency = (typeof earningsRecord.currency === 'string' && earningsRecord.currency.length > 0
      ? earningsRecord.currency
      : typeof metadata.currency === 'string' && metadata.currency.length > 0
      ? metadata.currency
      : 'SAR');

    reply.send({
      monthlySalary,
      allowances: allowancesValue,
      deductions: deductionsTotal,
      expenses: Number(expensesAggregate._sum.amount ?? 0),
      currency
    });
  });

  app.get('/api/employees/:id/expenses', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.CEO, roleKeys.CFO, roleKeys.ACCOUNTANT, roleKeys.HR_MANAGER, roleKeys.SUPERVISOR, roleKeys.ENGINEER, roleKeys.EMPLOYEE]) }, async (request, reply) => {
    const employeeId = String(request.params['id']);
    const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { userId: true } });
    if (!employee) {
      reply.code(404).send({ message: 'Employee not found' });
      return;
    }
    if (isForbiddenEmployeeAccess(request.user?.sub, request.user?.roles, employee)) {
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
        description: expense.reference ?? expense.category,
        category: expense.category,
        amount: Number(expense.amount),
        currency: expense.currency,
        expenseDate: expense.date.toISOString()
      }))
    );
  });

  app.get('/api/employees/:id/advances', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.CEO, roleKeys.CFO, roleKeys.ACCOUNTANT, roleKeys.HR_MANAGER, roleKeys.SUPERVISOR, roleKeys.ENGINEER, roleKeys.EMPLOYEE]) }, async (request, reply) => {
    const employeeId = String(request.params['id']);
    const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { userId: true } });
    if (!employee) {
      reply.code(404).send({ message: 'Employee not found' });
      return;
    }
    if (isForbiddenEmployeeAccess(request.user?.sub, request.user?.roles, employee)) {
      reply.code(403).send({ message: 'Access denied' });
      return;
    }

    const advances = await prisma.advance.findMany({
      where: { employeeId },
      orderBy: { requestDate: 'desc' }
    });

    reply.send(
      advances.map((advance) => ({
        id: advance.id,
        amount: Number(advance.amount),
        currency: advance.currency,
        status: advance.status,
        requestedAt: advance.requestDate.toISOString()
      }))
    );
  });

  app.get('/api/employees/:id/loans', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.CEO, roleKeys.CFO, roleKeys.ACCOUNTANT, roleKeys.HR_MANAGER, roleKeys.SUPERVISOR, roleKeys.ENGINEER, roleKeys.EMPLOYEE]) }, async (request, reply) => {
    const employeeId = String(request.params['id']);
    const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { userId: true } });
    if (!employee) {
      reply.code(404).send({ message: 'Employee not found' });
      return;
    }
    if (isForbiddenEmployeeAccess(request.user?.sub, request.user?.roles, employee)) {
      reply.code(403).send({ message: 'Access denied' });
      return;
    }

    const loans = await prisma.loan.findMany({
      where: { employeeId },
      orderBy: { startMonth: 'desc' }
    });

    reply.send(
      loans.map((loan) => ({
        id: loan.id,
        principal: Number(loan.principal),
        remaining: Number(loan.remaining),
        installment: Number(loan.installment),
        currency: 'SAR',
        status: loan.status,
        startedAt: parseLoanStartDate(loan.startMonth)?.toISOString() ?? null
      }))
    );
  });

  app.post('/api/employees/:id/contracts', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.HR_MANAGER]) }, async (request) => {
    const schema = z.object({
      type: z.string(),
      startDate: z.string(),
      endDate: z.string().optional(),
      probationEnd: z.string().optional(),
      basicSalary: z.number(),
      allowancesJson: z.any().optional(),
      currency: z.string(),
      visibilityScope: z.string().default('restricted')
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.flatten());
    const created = await prisma.contract.create({
      data: {
        employeeId: String(request.params['id']),
        type: parsed.data.type,
        startDate: new Date(parsed.data.startDate),
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
        probationEnd: parsed.data.probationEnd ? new Date(parsed.data.probationEnd) : null,
        basicSalary: parsed.data.basicSalary,
        allowancesJson: parsed.data.allowancesJson ?? {},
        currency: parsed.data.currency,
        visibilityScope: parsed.data.visibilityScope
      }
    });
    await recordActivity({
      userId: request.user?.sub,
      actionType: 'contract.create',
      entityType: 'contract',
      entityId: created.id,
      description: 'إنشاء عقد جديد للموظف',
      metadata: {
        employeeId: created.employeeId,
        type: created.type,
        startDate: created.startDate.toISOString(),
        endDate: created.endDate ? created.endDate.toISOString() : null
      },
      request
    });
    return sanitizeContractForRole(created, request.user?.roles ?? []);
  });

  app.post('/api/attendance/bulk', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.HR_MANAGER, roleKeys.SUPERVISOR]) }, async (request) => {
    const schema = z.object({
      records: z.array(
        z.object({
          employeeId: z.string(),
          day: z.string(),
          checkIn: z.string().optional(),
          checkOut: z.string().optional(),
          shiftCode: z.string().optional(),
          overtimeMinutes: z.number().int().optional(),
          status: z.string().default('present')
        })
      )
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.flatten());
    const created = await prisma.attendance.createMany({
      data: parsed.data.records.map((record) => ({
        employeeId: record.employeeId,
        day: new Date(record.day),
        checkIn: record.checkIn ? new Date(record.checkIn) : null,
        checkOut: record.checkOut ? new Date(record.checkOut) : null,
        shiftCode: record.shiftCode,
        overtimeMinutes: record.overtimeMinutes ?? 0,
        status: record.status
      }))
    });
    await recordActivity({
      userId: request.user?.sub,
      actionType: 'attendance.bulk_import',
      entityType: 'attendance_batch',
      description: 'استيراد سجل حضور جماعي',
      metadata: { count: parsed.data.records.length },
      request
    });
    return { success: true, inserted: created.count };
  });

  app.get('/api/attendance', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.HR_MANAGER, roleKeys.SUPERVISOR, roleKeys.ENGINEER, roleKeys.EMPLOYEE]) }, async (request, reply) => {
    const schema = z.object({
      employeeId: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional()
    });
    const parsed = schema.safeParse(request.query);
    if (!parsed.success) throw new ValidationError(parsed.error.flatten());
    const user = request.user;
    const where: any = {};
    if (parsed.data.employeeId) where.employeeId = parsed.data.employeeId;
    if (parsed.data.from || parsed.data.to) {
      where.day = {};
      if (parsed.data.from) where.day.gte = new Date(parsed.data.from);
      if (parsed.data.to) where.day.lte = new Date(parsed.data.to);
    }
    if (user?.roles.includes(roleKeys.EMPLOYEE) || user?.roles.includes(roleKeys.ENGINEER)) {
      where.employeeId = user.sub;
    }
    const records = await prisma.attendance.findMany({ where });
    reply.send(records);
  });

  app.post('/api/leaves', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.HR_MANAGER, roleKeys.SUPERVISOR, roleKeys.ENGINEER, roleKeys.EMPLOYEE]) }, async (request) => {
    const schema = z.object({
      employeeId: z.string(),
      type: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      notes: z.string().optional()
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.flatten());
    const created = await prisma.leave.create({
      data: {
        employeeId: parsed.data.employeeId,
        type: parsed.data.type,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
        status: 'pending',
        notes: parsed.data.notes
      }
    });
    await recordActivity({
      userId: request.user?.sub,
      actionType: 'leave.request',
      entityType: 'leave',
      entityId: created.id,
      description: 'تقديم طلب إجازة جديد',
      metadata: {
        employeeId: created.employeeId,
        type: created.type,
        startDate: created.startDate.toISOString(),
        endDate: created.endDate.toISOString()
      },
      request
    });
    return created;
  });

  app.patch('/api/leaves/:id/approve', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.HR_MANAGER, roleKeys.SUPERVISOR]) }, async (request) => {
    const schema = z.object({ status: z.enum(['approved', 'rejected']), notes: z.string().optional() });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.flatten());
    const before = await prisma.leave.findUnique({ where: { id: String(request.params['id']) } });
    const updated = await prisma.leave.update({
      where: { id: String(request.params['id']) },
      data: {
        status: parsed.data.status,
        notes: parsed.data.notes,
        approvedBy: request.user?.sub ?? null
      }
    });
    await recordActivity({
      userId: request.user?.sub,
      actionType: 'leave.status.update',
      entityType: 'leave',
      entityId: updated.id,
      description: `تحديث حالة طلب الإجازة إلى ${parsed.data.status}`,
      metadata: {
        before: serializeEntity(before),
        after: serializeEntity(updated)
      },
      request
    });
    return updated;
  });

  app.get('/api/contracts', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.CEO, roleKeys.CFO, roleKeys.HR_MANAGER, roleKeys.ACCOUNTANT, roleKeys.SUPERVISOR, roleKeys.ENGINEER]) }, async (request) => {
    const contracts = await prisma.contract.findMany({ include: { employee: true }, orderBy: { startDate: 'desc' } });
    return contracts.map((contract) => {
      const sanitized = sanitizeContractForRole(contract, request.user?.roles ?? []);
      return {
        id: sanitized.id,
        employeeId: sanitized.employeeId,
        type: sanitized.type,
        startDate: sanitized.startDate,
        endDate: sanitized.endDate,
        basicSalary: sanitized.basicSalary,
        currency: sanitized.currency
      };
    });
  });

  app.get('/api/leaves', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.HR_MANAGER, roleKeys.SUPERVISOR, roleKeys.CEO, roleKeys.CFO, roleKeys.ENGINEER, roleKeys.EMPLOYEE]) }, async (request) => {
    const where: any = {};
    if (request.user?.roles.includes(roleKeys.EMPLOYEE) || request.user?.roles.includes(roleKeys.ENGINEER)) {
      where.employeeId = request.user?.sub;
    }
    const leaves = await prisma.leave.findMany({ where, orderBy: { startDate: 'desc' } });
    return leaves;
  });
}
