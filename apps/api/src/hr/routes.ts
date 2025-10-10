import type { FastifyInstance } from 'fastify';
import { prisma } from '../common/prisma.js';
import { employeeFilterQuery } from '../common/validators.js';
import { ValidationError } from '../common/errors.js';
import { roleKeys } from '../auth/roles.js';
import { requireRole } from '../auth/rbac.js';
import { z } from 'zod';

function sanitizeContractForRole(contract: any, roleKeysList: string[]) {
  const privileged = ['system_admin', 'ceo', 'cfo', 'hr_manager'];
  const canSeeMoney = roleKeysList.some((r) => privileged.includes(r));
  if (!canSeeMoney) {
    const { basicSalary, allowancesJson, ...rest } = contract;
    return rest;
  }
  return contract;
}

export function hrRoutes(app: FastifyInstance) {
  app.get('/api/employees', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.CEO, roleKeys.CFO, roleKeys.HR_MANAGER, roleKeys.SUPERVISOR, roleKeys.ENGINEER, roleKeys.EMPLOYEE]) }, async (request) => {
    const parsed = employeeFilterQuery.safeParse(request.query);
    if (!parsed.success) throw new ValidationError(parsed.error.flatten());
    const { departmentId, projectId, q } = parsed.data;
    const userRoles = request.user?.roles ?? [];
    const employees = await prisma.employee.findMany({
      where: {
        departmentId: departmentId ?? undefined,
        projectId: projectId ?? undefined,
        ...(q
          ? {
              OR: [
                { fullName: { contains: q, mode: 'insensitive' } },
                { code: { contains: q, mode: 'insensitive' } }
              ]
            }
          : {})
      },
      include: {
        department: true,
        project: true
      }
    });
    return employees
      .map((employee) => {
        if (userRoles.includes(roleKeys.EMPLOYEE) && request.user?.sub !== employee.userId) {
          return null;
        }
        return {
          id: employee.id,
          code: employee.code,
          fullName: employee.fullName,
          jobTitle: employee.jobTitle,
          department: employee.department?.nameAr ?? null,
          project: employee.project?.nameAr ?? null,
          status: employee.status
        };
      })
      .filter(Boolean);
  });

  app.get('/api/employees/:id', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.CEO, roleKeys.CFO, roleKeys.HR_MANAGER, roleKeys.SUPERVISOR, roleKeys.ENGINEER, roleKeys.EMPLOYEE]) }, async (request, reply) => {
    const employee = await prisma.employee.findUnique({
      where: { id: String(request.params['id']) },
      include: {
        department: true,
        project: true,
        contracts: { orderBy: { startDate: 'desc' } }
      }
    });
    if (!employee) {
      reply.code(404).send({ message: 'Employee not found' });
      return;
    }
    if (request.user?.roles.includes(roleKeys.EMPLOYEE) && request.user?.sub !== employee.userId) {
      reply.code(403).send({ message: 'Access denied' });
      return;
    }
    return {
      id: employee.id,
      fullName: employee.fullName,
      jobTitle: employee.jobTitle,
      department: employee.department?.nameAr,
      project: employee.project?.nameAr,
      contracts: employee.contracts.map((contract) => sanitizeContractForRole(contract, request.user?.roles ?? []))
    };
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
    await prisma.attendance.createMany({
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
    return { success: true };
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
    return created;
  });

  app.patch('/api/leaves/:id/approve', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.HR_MANAGER, roleKeys.SUPERVISOR]) }, async (request) => {
    const schema = z.object({ status: z.enum(['approved', 'rejected']), notes: z.string().optional() });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.flatten());
    const updated = await prisma.leave.update({
      where: { id: String(request.params['id']) },
      data: {
        status: parsed.data.status,
        notes: parsed.data.notes,
        approvedBy: request.user?.sub ?? null
      }
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
