import type { FastifyReply, FastifyRequest } from 'fastify';
import { permissionKeys, roleKeys } from './roles.js';

export type RoleKey = (typeof roleKeys)[keyof typeof roleKeys];
export type PermissionKey = (typeof permissionKeys)[keyof typeof permissionKeys];

type Middleware = (req: FastifyRequest, reply: FastifyReply, done: () => void) => void;

function ensureUser(req: FastifyRequest, reply: FastifyReply): asserts req is FastifyRequest & { user: { roles: string[]; permissions: string[] } } {
  if (!req.user) {
    reply.code(401).send({ message: 'Authentication required' });
    throw new Error('UNAUTHENTICATED');
  }
}

export function requireRole(roles: RoleKey[]): Middleware {
  return (req, reply, done) => {
    try {
      ensureUser(req, reply);
      if (!roles.some((role) => req.user.roles.includes(role))) {
        reply.code(403).send({ message: 'Access denied' });
        return;
      }
      done();
    } catch (err) {
      if ((err as Error).message !== 'UNAUTHENTICATED') {
        req.log.error(err);
      }
    }
  };
}

export function requirePermission(perms: PermissionKey[]): Middleware {
  return (req, reply, done) => {
    try {
      ensureUser(req, reply);
      if (!perms.some((perm) => req.user.permissions.includes(perm))) {
        reply.code(403).send({ message: 'Insufficient permissions' });
        return;
      }
      done();
    } catch (err) {
      if ((err as Error).message !== 'UNAUTHENTICATED') {
        req.log.error(err);
      }
    }
  };
}
