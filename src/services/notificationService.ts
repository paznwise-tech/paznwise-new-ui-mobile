import { fetchApi } from './api';
import type { ApiResponse } from '../types';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

export const notificationService = {
  /**
   * Get user notifications list
   */
  async getNotifications(): Promise<NotificationItem[]> {
    const res = await fetchApi<ApiResponse<NotificationItem[]> | NotificationItem[]>('/notifications', {
      requiresAuth: true,
    });
    if (Array.isArray(res)) return res;
    return res.data || [];
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const res = await fetchApi<ApiResponse<{ count: number }> | { count: number }>('/notifications/unread-count', {
        requiresAuth: true,
      });
      if ('data' in res && res.data) return res.data.count || 0;
      return (res as any).count || 0;
    } catch {
      return 0;
    }
  },

  /**
   * Mark notification as read
   */
  async markAsRead(id: string): Promise<void> {
    await fetchApi(`/notifications/${id}/read`, {
      method: 'PUT',
      requiresAuth: true,
    });
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    await fetchApi('/notifications/read-all', {
      method: 'PUT',
      requiresAuth: true,
    });
  },
};
