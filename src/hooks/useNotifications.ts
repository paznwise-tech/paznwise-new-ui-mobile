import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NotificationService } from '@/services/notificationService';
import { getSocket } from '@/services/socket';

export const notificationKeys = {
  all: ['notifications'] as const,
  unread: ['notifications', 'unread-count'] as const,
};

/**
 * Unread badge count.
 *
 * Polled on a slow interval as a floor, and invalidated immediately when the
 * socket delivers a notification — so the badge is live while connected and
 * still correct if the socket is down.
 */
export function useUnreadNotificationCount(enabled: boolean) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: notificationKeys.unread,
    queryFn: NotificationService.getUnreadCount,
    enabled,
    refetchInterval: enabled ? 60_000 : false,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket();
    if (!socket) return;

    const onNotification = () => {
      qc.invalidateQueries({ queryKey: notificationKeys.unread });
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    };

    socket.on('notification', onNotification);
    return () => {
      socket.off('notification', onNotification);
    };
  }, [enabled, qc]);

  return query.data ?? 0;
}
