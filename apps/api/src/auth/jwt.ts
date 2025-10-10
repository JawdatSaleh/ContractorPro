import jwt from 'jsonwebtoken';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { rolesHierarchy } from './roles.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';

export interface AuthPayload {
  sub: string;
  roles: string[];
  permissions: string[];
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch (error) {
    return null;
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthPayload;
  }
}

export function registerAuthExtractor(app: FastifyInstance) {
  app.addHook('preHandler', async (request: FastifyRequest, _reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader) return;
    const [, token] = authHeader.split(' ');
    if (!token) return;
    const payload = verifyToken(token);
    if (payload) {
      const roles = payload.roles ?? [];
      const normalized = Array.from(new Set(roles.map((r) => rolesHierarchy[r] ? r : r)));
      request.user = { ...payload, roles: normalized };
    }
  });
}
