import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { notificationKeys } from '@/hooks/useNotifications';
import { registerForPush, unregisterPush } from './registerDevice';

// A push arriving while the app is open should still be visible — the badge
// alone is easy to miss mid-task.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

/**
 * Where a notification type leads.
 *
 * Mirrors the in-app notification screen's routing, so a push and a tap on
 * the same notification in the list go to the same place.
 */
function routeFor(data: Record<string, unknown>): string | null {
  const type = String(data.type ?? '').toLowerCase();
  const postId = data.postId ? String(data.postId) : '';

  if (type === 'order') return '/orders';
  if (type === 'booking') return '/booking/my-bookings';
  if (type === 'rental') return '/rentals';
  if (type === 'event') return '/event-bookings';
  if (type === 'message') return '/messages';
  if ((type === 'like' || type === 'comment' || type === 'reply') && postId) return `/feed/${postId}`;
  return '/notifications';
}

/**
 * Wires push into the app: registers the device once signed in, unregisters
 * on sign-out, and routes taps.
 */
export function usePushNotifications(signedIn: boolean) {
  const qc = useQueryClient();
  const registered = useRef(false);

  useEffect(() => {
    if (!signedIn) {
      if (registered.current) {
        registered.current = false;
        void unregisterPush();
      }
      return;
    }
    if (registered.current) return;

    registerForPush().then(ok => {
      registered.current = ok;
    });
  }, [signedIn]);

  useEffect(() => {
    // A push means something changed server-side, so the list and badge are
    // stale even if the user never opens the notification.
    const received = Notifications.addNotificationReceivedListener(() => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
      qc.invalidateQueries({ queryKey: notificationKeys.unread });
    });

    const tapped = Notifications.addNotificationResponseReceivedListener(response => {
      const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
      const target = routeFor(data);
      if (target) router.push(target as never);
      qc.invalidateQueries({ queryKey: notificationKeys.unread });
    });

    return () => {
      received.remove();
      tapped.remove();
    };
  }, [qc]);
}
