import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requirePermission } from '../auth/rbac.js';
import { permissionKeys } from '../auth/roles.js';
import {
  createSnapshotForDate,
  fetchActivityLogs,
  getActivityAnalytics,
  recordActivity
} from './service.js';

const logsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  entityType: z.string().optional(),
  actionType: z.string().optional(),
  userId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().optional()
});

const analyticsQuerySchema = z.object({
  entityType: z.string().optional(),
  actionType: z.string().optional(),
  userId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional()
});

const snapshotBodySchema = z.object({
  date: z.string().optional()
});

export function activityRoutes(app: FastifyInstance) {
  app.get(
    '/api/activity/logs',
    { preHandler: requirePermission([permissionKeys.VIEW_ACTIVITY_LOGS]) },
    async (request, reply) => {
      const parsed = logsQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        reply.code(400).send({ message: 'Invalid filters', details: parsed.error.flatten() });
        return;
      }
      const { page, pageSize, entityType, actionType, userId, from, to, search } = parsed.data;
      const result = await fetchActivityLogs({
        page,
        pageSize,
        entityType,
        actionType,
        userId,
        search,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined
      });
      reply.send(result);
    }
  );

  app.get(
    '/api/activity/analytics',
    { preHandler: requirePermission([permissionKeys.VIEW_ACTIVITY_ANALYTICS, permissionKeys.VIEW_ACTIVITY_LOGS]) },
    async (request, reply) => {
      const parsed = analyticsQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        reply.code(400).send({ message: 'Invalid filters', details: parsed.error.flatten() });
        return;
      }
      const { entityType, actionType, userId, from, to } = parsed.data;
      const analytics = await getActivityAnalytics({
        entityType,
        actionType,
        userId,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined
      });
      reply.send(analytics);
    }
  );

  app.post(
    '/api/activity/snapshots',
    { preHandler: requirePermission([permissionKeys.MANAGE_ACTIVITY_RETENTION]) },
    async (request, reply) => {
      const parsed = snapshotBodySchema.safeParse(request.body);
      if (!parsed.success) {
        reply.code(400).send({ message: 'Invalid payload', details: parsed.error.flatten() });
        return;
      }
      const snapshotDate = parsed.data.date ? new Date(parsed.data.date) : new Date();
      const result = await createSnapshotForDate(snapshotDate);
      await recordActivity({
        userId: request.user?.sub,
        actionType: 'activity.snapshot.created',
        entityType: 'activity_snapshot',
        entityId: result.key,
        description: 'تم إنشاء نسخة أرشيفية لسجل النشاطات',
        metadata: {
          key: result.key,
          count: result.count,
          requestedDate: snapshotDate.toISOString()
        },
        request
      });
      reply.send({ success: true, ...result });
    }
  );
}
