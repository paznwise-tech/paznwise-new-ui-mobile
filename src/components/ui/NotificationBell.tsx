import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography, Radius } from '@/constants/theme';
import { useUser } from '@/context/AppContext';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';

/**
 * Notifications entry point.
 *
 * There was no bell anywhere in the app, so /notifications was unreachable
 * and a user had no way to know something had happened. Hidden for guests —
 * the endpoint requires a session and there is nothing to show.
 */
export function NotificationBell({ style }: { style?: object }) {
  const { status } = useUser();
  const signedIn = status === 'signedIn';
  const unread = useUnreadNotificationCount(signedIn);

  if (!signedIn) return null;

  return (
    <TouchableOpacity
      style={[styles.btn, style]}
      onPress={() => router.push('/notifications' as any)}
      accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      hitSlop={8}
    >
      <Text style={styles.icon}>🔔</Text>
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 4 },
  icon: { fontSize: 20 },
  badge: {
    position: 'absolute', top: -2, right: -4,
    minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: Radius.full,
    backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { ...Typography.label, fontSize: 9, color: Colors.cream },
});
