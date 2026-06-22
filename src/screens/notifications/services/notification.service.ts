import { post, put, remove, get, patch } from '../../../core/axios';
import { API_CONSTANTS } from '../../../core/constants/API_CONSTANTS';

export interface ScheduledNotification {
  id: string;
  title?: string;
  message: string;
  type: string;
  persistent: boolean;
  channel: string;
  userId?: string;
  frequency: string;
  timeOfDay?: string;
  scheduledAt?: string;
  active: boolean;
  sendCount: number;
  lastSentAt?: string;
  nextSendAt?: string;
  createdAt: string;
  targetUser?: { id: string; name: string; lastName: string };
}

export interface NotificationLogEntry {
  id: string;
  userId: string;
  title?: string;
  message: string;
  type: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

const BASE = '/scheduled-notifications';

export const getPaginatedNotifications = async (params: any) => {
  const res = await post<any>(`${BASE}/datatable`, params);
  if (res.success && res.data) {
    return { data: res.data.rows || [], total: res.data.total || 0 };
  }
  return { data: [], total: 0 };
};

export const createScheduledNotification = async (data: any) => {
  return await post<ScheduledNotification>(BASE, data);
};

export const updateScheduledNotification = async (id: string, data: any) => {
  return await put<ScheduledNotification>(`${BASE}/${id}`, data);
};

export const deleteScheduledNotification = async (id: string) => {
  return await remove(`${BASE}/${id}`);
};

export const getMyNotifications = async (unreadOnly = false) => {
  const res = await get<NotificationLogEntry[]>(
    `/notifications/my${unreadOnly ? '?unreadOnly=true' : ''}`,
  );
  return res;
};

export const markNotificationRead = async (id: string) => {
  return await patch(`/notifications/${id}/read`, {});
};

export const markAllNotificationsRead = async () => {
  return await patch('/notifications/read-all', {});
};

export const sendNotificationNow = async (data: {
  title?: string;
  message: string;
  type: string;
  channel?: string;
  userId?: string;
  persistent?: boolean;
}) => {
  return await post('/notifications/send', data);
};
