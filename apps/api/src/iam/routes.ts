import type { FastifyInstance } from 'fastify';
import { prisma } from '../common/prisma.js';
import { signToken } from '../auth/jwt.js';
import { permissionKeys, roleKeys } from '../auth/roles.js';
import { requirePermission, requireRole } from '../auth/rbac.js';
import { ValidationError } from '../common/errors.js';
import { z } from 'zod';
import argon2 from 'argon2';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export function iamRoutes(app: FastifyInstance) {
  app.post('/api/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.flatten());
    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } }
      }
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
    const permissions = user.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.key));
    const token = signToken({ sub: user.id, roles, permissions });
    reply.send({ token, user: { id: user.id, email: user.email, roles } });
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
    const schema = z.object({ key: z.string(), nameAr: z.string(), description: z.string().optional() });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.flatten());
    const created = await prisma.role.create({ data: { key: parsed.data.key, nameAr: parsed.data.nameAr, description: parsed.data.description } });
    return created;
  });

  app.post('/api/iam/roles/:id/permissions', { preHandler: requireRole([roleKeys.ADMIN]) }, async (request) => {
    const roleId = String(request.params['id']);
    const schema = z.object({ permissionIds: z.array(z.string()) });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.flatten());
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    await prisma.rolePermission.createMany({ data: parsed.data.permissionIds.map((pid) => ({ roleId, permissionId: pid })) });
    return { success: true };
  });
}

  app.get('/api/iam/roles', { preHandler: requireRole([roleKeys.ADMIN, roleKeys.CEO, roleKeys.CFO, roleKeys.HR_MANAGER]) }, async () => {
    return prisma.role.findMany();
  });

  app.get('/api/iam/permissions', { preHandler: requireRole([roleKeys.ADMIN]) }, async () => {
    return prisma.permission.findMany();
  });
