import { fetchApi } from './api';

export interface AppNotification {
  id: string;
  type: string;
  title?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: {
    userId?: string;
    productId?: string;
    eventId?: string;
    orderId?: string;
    bookingId?: string;
  };
}

function normalizeNotification(n: any): AppNotification {
  return {
    id: n.id ?? n._id ?? '',
    type: n.type ?? 'info',
    title: n.title ?? undefined,
    message: n.message ?? n.body ?? n.content ?? '',
    isRead: n.isRead ?? n.read ?? false,
    createdAt: n.createdAt ?? new Date().toISOString(),
    data: n.data ?? n.metadata ?? {},
  };
}

export const NotificationService = {
  async getNotifications(): Promise<AppNotification[]> {
    const res = await fetchApi<any>('/notifications', { requiresAuth: true });
    const data = res.data ?? res;
    if (Array.isArray(data)) return data.map(normalizeNotification);
    return (data?.notifications ?? data?.items ?? []).map(normalizeNotification);
  },

  async markAsRead(id: string): Promise<void> {
    await fetchApi<any>(`/notifications/${id}/read`, {
      method: 'PATCH',
      requiresAuth: true,
    }).catch(() => {});
  },

  async markAllAsRead(): Promise<void> {
    await fetchApi<any>('/notifications/read-all', {
      method: 'PATCH',
      requiresAuth: true,
    }).catch(() => {});
  },

  async getUnreadCount(): Promise<number> {
    try {
      const res = await fetchApi<any>('/notifications/unread-count', { requiresAuth: true });
      return res.data?.count ?? res.count ?? 0;
    } catch {
      return 0;
    }
  },
};
