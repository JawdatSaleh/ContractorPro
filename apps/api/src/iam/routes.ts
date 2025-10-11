import type { FastifyInstance } from 'fastify';
import { prisma } from '../common/prisma.js';
import { signToken } from '../auth/jwt.js';
import { permissionKeys, roleKeys } from '../auth/roles.js';
import { requirePermission, requireRole } from '../auth/rbac.js';
import { ValidationError } from '../common/errors.js';
import { z } from 'zod';
import argon2 from 'argon2';
import type { Prisma } from '@prisma/client';
import { recordActivity } from '../activity/service.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const createRoleSchema = z.object({
  key: z.string(),
  nameAr: z.string(),
  description: z.string().optional()
});

const updateRolePermissionsSchema = z.object({
  permissionIds: z.array(z.string())
});

const authUserInclude = {
  employee: true,
  roles: {
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      }
    }
  }
} satisfies Prisma.UserInclude;

type UserWithAccess = Prisma.UserGetPayload<{ include: typeof authUserInclude }>;

export function iamRoutes(app: FastifyInstance) {
  app.post('/api/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.flatten());
    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({
      where: { email },
      include: authUserInclude
    });
    if (!user) {
      reply.code(401).send({ message: 'Invalid credentials' });
      return;
    }
    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      reply.code(401).send({ message: 'Invalid credentials' });
      return;
    }
    const roles = user.roles.map((r) => r.role.key);
    const permissions = Array.from(
      new Set(user.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.key)))
    );
    const token = signToken({ sub: user.id, roles, permissions });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    await recordActivity({
      userId: user.id,
      actionType: 'auth.login',
      entityType: 'user',
      entityId: user.id,
      description: 'تسجيل دخول ناجح إلى النظام',
      metadata: { email: user.email },
      request
    });

    reply.send({ token, user: mapAuthUser(user) });
  });

  app.get('/api/auth/profile', async (request, reply) => {
    if (!request.user) {
      reply.code(401).send({ message: 'Authentication required' });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      include: authUserInclude
    });
    if (!user) {
      reply.code(404).send({ message: 'User not found' });
      return;
    }
    reply.send(mapAuthUser(user));
  });

  app.get('/api/iam/users', { preHandler: requirePermission([permissionKeys.MANAGE_USERS]) }, async () => {
    const users = await prisma.user.findMany({
      include: {
        roles: { include: { role: true } }
      }
    });
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      phone: user.phone,
      status: user.status,
      roles: user.roles.map((r) => r.role.key)
    }));
  });

  app.post('/api/iam/roles', { preHandler: requireRole([roleKeys.ADMIN]) }, async (request) => {
    const parsed = createRoleSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.flatten());
    const created = await prisma.role.create({
      data: {
        key: parsed.data.key,
        nameAr: parsed.data.nameAr,
        description: parsed.data.description
      }
    });
    await recordActivity({
      userId: request.user?.sub,
      actionType: 'role.create',
      entityType: 'role',
      entityId: created.id,
      description: `تم إنشاء دور ${created.nameAr}`,
      metadata: created,
      request
    });
    return created;
  });

  app.post('/api/iam/roles/:id/permissions', { preHandler: requireRole([roleKeys.ADMIN]) }, async (request) => {
    const roleId = String(request.params['id']);
    const parsed = updateRolePermissionsSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.flatten());
    const existing = await prisma.rolePermission.findMany({ where: { roleId } });
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    await prisma.rolePermission.createMany({
      data: parsed.data.permissionIds.map((pid) => ({ roleId, permissionId: pid }))
    });
    await recordActivity({
      userId: request.user?.sub,
      actionType: 'role.permissions.update',
      entityType: 'role',
      entityId: roleId,
      description: 'تحديث صلاحيات الدور',
      metadata: {
        previous: existing.map((p) => p.permissionId),
        next: parsed.data.permissionIds
      },
      request
    });
    return { success: true };
  });

  app.get(
    '/api/iam/roles',
    { preHandler: requireRole([roleKeys.ADMIN, roleKeys.CEO, roleKeys.CFO, roleKeys.HR_MANAGER]) },
    async () => {
      return prisma.role.findMany();
    }
  );

  app.get('/api/iam/permissions', { preHandler: requireRole([roleKeys.ADMIN]) }, async () => {
    return prisma.permission.findMany();
  });
}

function mapAuthUser(user: UserWithAccess) {
  const roles = user.roles.map((relation) => ({
    id: relation.role.id,
    key: relation.role.key,
    nameAr: relation.role.nameAr,
    description: relation.role.description,
    permissions: relation.role.permissions.map((p) => ({
      id: p.permission.id,
      key: p.permission.key,
      nameAr: p.permission.nameAr
    }))
  }));

  const permissionsMap = new Map<string, { id: string; key: string; nameAr: string }>();
  for (const role of roles) {
    for (const perm of role.permissions ?? []) {
      if (!permissionsMap.has(perm.key)) {
        permissionsMap.set(perm.key, perm);
      }
    }
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.employee?.fullName ?? null,
    roles,
    permissions: Array.from(permissionsMap.values())
  };
}
