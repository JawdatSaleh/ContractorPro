import { api } from '../lib/api';

export interface ActivityLogUser {
  id: string;
  email: string | null;
}

export interface ActivityLogEntry {
  id: string;
  actionType: string;
  entityType: string;
  entityId?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: ActivityLogUser | null;
}

export interface FetchActivityLogsResponse {
  data: ActivityLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ActivityAnalytics {
  totalEvents: number;
  uniqueActors: number;
  entities: { entityType: string; count: number }[];
  actions: { actionType: string; count: number }[];
  daily: { date: string; count: number }[];
  topUsers: { userId: string | null; email: string | null; count: number }[];
}

export interface ActivityLogFilters {
  page?: number;
  pageSize?: number;
  entityType?: string;
  actionType?: string;
  userId?: string;
  from?: string;
  to?: string;
  search?: string;
}

export const fetchActivityLogs = async (filters: ActivityLogFilters) => {
  const { data } = await api.get<FetchActivityLogsResponse>('/api/activity/logs', {
    params: filters
  });
  return data;
};

export const fetchActivityAnalytics = async (filters: Omit<ActivityLogFilters, 'page' | 'pageSize' | 'search'>) => {
  const { data } = await api.get<ActivityAnalytics>('/api/activity/analytics', {
    params: filters
  });
  return data;
};

export const createActivitySnapshot = async (date?: string) => {
  const { data } = await api.post<{ success: boolean; key: string; count: number }>(
    '/api/activity/snapshots',
    date ? { date } : {}
  );
  return data;
};
