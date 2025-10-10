import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { ActivityLog, Prisma } from '@prisma/client';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { Readable } from 'node:stream';
import { prisma } from '../common/prisma.js';
import { logger } from '../common/logger.js';

const bucketName = process.env.ACTIVITY_LOG_BUCKET;
const bucketRegion = process.env.AWS_REGION ?? 'us-east-1';
const logPrefix = process.env.ACTIVITY_LOG_PREFIX ?? 'logs';
const snapshotPrefix = process.env.ACTIVITY_SNAPSHOT_PREFIX ?? 'snapshots';
const enableCloudSync = Boolean(bucketName);
const enableScheduler = (process.env.ACTIVITY_SNAPSHOT_SCHEDULER ?? 'true') !== 'false';

let s3Client: S3Client | null = null;
if (enableCloudSync) {
  s3Client = new S3Client({ region: bucketRegion });
}

export interface RecordActivityInput {
  userId?: string | null;
  actionType: string;
  entityType: string;
  entityId?: string | null;
  description?: string | null;
  metadata?: Prisma.JsonValue | null;
  request?: FastifyRequest;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface ActivityLogFilters {
  entityType?: string;
  actionType?: string;
  userId?: string;
  from?: Date;
  to?: Date;
  search?: string;
}

export interface FetchActivityLogsOptions extends ActivityLogFilters {
  page?: number;
  pageSize?: number;
}

export interface FetchActivityLogsResult {
  data: (ActivityLog & { user?: { id: string; email: string | null } | null })[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ActivityAnalyticsResult {
  totalEvents: number;
  uniqueActors: number;
  entities: { entityType: string; count: number }[];
  actions: { actionType: string; count: number }[];
  daily: { date: string; count: number }[];
  topUsers: { userId: string | null; email: string | null; count: number }[];
}

export interface SnapshotResult {
  key: string;
  count: number;
}

export async function recordActivity(input: RecordActivityInput): Promise<ActivityLog> {
  const contextIp = input.ipAddress ?? input.request?.ip ?? null;
  const contextAgent = input.userAgent ?? (input.request?.headers['user-agent'] as string | undefined) ?? null;

  const created = await prisma.activityLog.create({
    data: {
      userId: input.userId ?? undefined,
      actionType: input.actionType,
      entityType: input.entityType,
      entityId: input.entityId ?? undefined,
      description: input.description ?? undefined,
      metadata: input.metadata ?? undefined,
      ipAddress: contextIp ?? undefined,
      userAgent: contextAgent ?? undefined
    }
  });

  if (enableCloudSync && s3Client && bucketName) {
    syncEventToCloud(created).catch((error) => {
      logger.error('فشل إرسال النشاط إلى التخزين السحابي');
      logger.error(error);
    });
  }

  return created;
}

export async function fetchActivityLogs(options: FetchActivityLogsOptions): Promise<FetchActivityLogsResult> {
  const { page = 1, pageSize = 25, ...filters } = options;
  const where: Prisma.ActivityLogWhereInput = {};

  if (filters.entityType) {
    where.entityType = { equals: filters.entityType, mode: 'insensitive' };
  }
  if (filters.actionType) {
    where.actionType = { contains: filters.actionType, mode: 'insensitive' };
  }
  if (filters.userId) {
    where.userId = filters.userId;
  }
  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) {
      where.createdAt.gte = filters.from;
    }
    if (filters.to) {
      where.createdAt.lte = filters.to;
    }
  }
  if (filters.search) {
    where.OR = [
      { description: { contains: filters.search, mode: 'insensitive' } },
      { actionType: { contains: filters.search, mode: 'insensitive' } },
      { entityType: { contains: filters.search, mode: 'insensitive' } },
      { entityId: { contains: filters.search, mode: 'insensitive' } }
    ];
  }

  const skip = (page - 1) * pageSize;

  const [data, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: { user: { select: { id: true, email: true } } }
    }),
    prisma.activityLog.count({ where })
  ]);

  return { data, total, page, pageSize };
}

export async function getActivityAnalytics(filters: ActivityLogFilters): Promise<ActivityAnalyticsResult> {
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const from = filters.from ?? defaultFrom;
  const to = filters.to ?? now;

  const logs = await prisma.activityLog.findMany({
    where: {
      createdAt: {
        gte: from,
        lte: to
      },
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.actionType ? { actionType: { contains: filters.actionType, mode: 'insensitive' } } : {}),
      ...(filters.userId ? { userId: filters.userId } : {})
    },
    include: { user: { select: { id: true, email: true } } }
  });

  const dailyMap = new Map<string, number>();
  const actionMap = new Map<string, number>();
  const entityMap = new Map<string, number>();
  const userMap = new Map<string, { count: number; email: string | null }>();

  for (const log of logs) {
    const dateKey = toDateKey(log.createdAt);
    dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + 1);

    actionMap.set(log.actionType, (actionMap.get(log.actionType) ?? 0) + 1);
    entityMap.set(log.entityType, (entityMap.get(log.entityType) ?? 0) + 1);

    const userId = log.userId ?? 'anonymous';
    const existing = userMap.get(userId) ?? { count: 0, email: log.user?.email ?? null };
    existing.count += 1;
    existing.email = existing.email ?? log.user?.email ?? null;
    userMap.set(userId, existing);
  }

  const uniqueActors = Array.from(userMap.keys()).length;

  const entities = Array.from(entityMap.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([entityType, count]) => ({ entityType, count }));
  const actions = Array.from(actionMap.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([actionType, count]) => ({ actionType, count }));

  return {
    totalEvents: logs.length,
    uniqueActors,
    entities,
    actions,
    daily: Array.from(dailyMap.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([date, count]) => ({ date, count })),
    topUsers: Array.from(userMap.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([userId, { count, email }]) => ({ userId: userId === 'anonymous' ? null : userId, email, count }))
  };
}

export async function createSnapshotForDate(targetDate: Date): Promise<SnapshotResult> {
  if (!enableCloudSync || !s3Client || !bucketName) {
    throw new Error('Cloud snapshotting is disabled – ACTIVITY_LOG_BUCKET not set');
  }
  const rangeStart = startOfDay(targetDate);
  const rangeEnd = endOfDay(targetDate);

  const logs = await prisma.activityLog.findMany({
    where: {
      createdAt: {
        gte: rangeStart,
        lte: rangeEnd
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  const { year, month, day } = getDateParts(rangeStart);
  const key = `${snapshotPrefix}/${year}/${month}/${day}.json`;
  const body = JSON.stringify(
    {
      date: rangeStart.toISOString(),
      generatedAt: new Date().toISOString(),
      count: logs.length,
      logs
    },
    null,
    2
  );

  await putObject(key, body);
  return { key, count: logs.length };
}

export function scheduleDailySnapshots(server: FastifyInstance) {
  if (!enableCloudSync || !enableScheduler || !s3Client || !bucketName) {
    return;
  }

  const run = async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    try {
      const result = await createSnapshotForDate(yesterday);
      server.log.info({ key: result.key, count: result.count }, 'Activity snapshot created');
    } catch (error) {
      server.log.error(error, 'Failed to create activity snapshot');
    }
  };

  const scheduleNext = () => {
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(0, 5, 0, 0);
    if (next <= now) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    const delay = Math.max(next.getTime() - now.getTime(), 5 * 60 * 1000);
    setTimeout(() => {
      run().catch((error) => server.log.error(error, 'Scheduled snapshot failed'));
      setInterval(() => {
        run().catch((error) => server.log.error(error, 'Scheduled snapshot failed'));
      }, 24 * 60 * 60 * 1000);
    }, delay);
  };

  scheduleNext();
}

async function syncEventToCloud(event: ActivityLog) {
  if (!s3Client || !bucketName) return;
  const { year, month, day } = getDateParts(event.createdAt);
  const baseKey = `${logPrefix}/${year}/${month}/${day}`;
  const eventKey = `${baseKey}/${event.id}.json`;
  const payload = JSON.stringify(event, null, 2);

  await putObject(eventKey, payload);
  await appendToDailyArchive(`${baseKey}.json`, event);
}

async function appendToDailyArchive(key: string, event: ActivityLog) {
  if (!s3Client || !bucketName) return;
  try {
    const existingRaw = await getObjectBody(key);
    const parsed = existingRaw ? (JSON.parse(existingRaw) as ActivityLog[]) : [];
    parsed.push(event);
    await putObject(key, JSON.stringify(parsed, null, 2));
  } catch (error) {
    if ((error as any)?.$metadata?.httpStatusCode === 404) {
      await putObject(key, JSON.stringify([event], null, 2));
      return;
    }
    logger.error('Failed to append to daily archive');
    logger.error(error);
  }
}

async function getObjectBody(key: string): Promise<string | null> {
  if (!s3Client || !bucketName) return null;
  try {
    const result = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: key
      })
    );
    return await streamToString(result.Body as Readable);
  } catch (error) {
    if ((error as any)?.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw error;
  }
}

async function putObject(key: string, body: string) {
  if (!s3Client || !bucketName) return;
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: 'application/json',
      ServerSideEncryption: 'AES256'
    })
  );
}

function getDateParts(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return { year, month, day };
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setUTCHours(23, 59, 59, 999);
  return copy;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function streamToString(stream: Readable | undefined | null): Promise<string> {
  if (!stream) return '';
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}
