import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { NotificationService, AppNotification } from '@/services/notificationService';

const TYPE_ICON: Record<string, string> = {
  order:    '🛍️',
  booking:  '🎵',
  follow:   '👤',
  like:     '❤️',
  comment:  '💬',
  event:    '🎭',
  payment:  '💰',
  review:   '⭐',
  system:   '🔔',
  info:     'ℹ️',
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Notifications() {
  const [notifs, setNotifs]       = useState<AppNotification[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await NotificationService.getNotifications();
      setNotifs(data);
    } catch (e: any) {
      console.warn('[Notifications]', e.message);
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  const handleMarkAllRead = useCallback(async () => {
    await NotificationService.markAllAsRead();
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  const handlePress = useCallback((n: AppNotification) => {
    NotificationService.markAsRead(n.id).catch(() => {});
    setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
    if (n.type === 'order')   router.push('/orders' as any);
    else if (n.type === 'booking') router.push('/booking/my-bookings' as any);
    else if (n.type === 'event' && n.data?.eventId) router.push(`/events/${n.data.eventId}` as any);
    else if (n.type === 'follow' && n.data?.userId) router.push(`/artist/${n.data.userId}` as any);
  }, []);

  const unreadCount = notifs.filter(n => !n.isRead).length;

  const renderItem = useCallback(({ item }: { item: AppNotification }) => (
    <TouchableOpacity
      style={[styles.item, !item.isRead && styles.itemUnread]}
      onPress={() => handlePress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{TYPE_ICON[item.type] ?? TYPE_ICON.info}</Text>
      </View>
      <View style={styles.itemBody}>
        {item.title ? <Text style={styles.itemTitle}>{item.title}</Text> : null}
        <Text style={styles.itemMsg} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.itemTime}>{timeAgo(item.createdAt)}</Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  ), [handlePress]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          {unreadCount > 0 ? (
            <TouchableOpacity onPress={handleMarkAllRead}>
              <Text style={styles.markAllBtn}>Mark all read</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : (
        <FlatList
          data={notifs}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.gold} />
          }
          ListEmptyComponent={
            <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
              <Text style={{ fontSize: 48 }}>🔔</Text>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptyText}>No new notifications right now</Text>
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptySub}>Order status updates, new messages, and community activity will show up here.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  backIcon: { color: Colors.gold, fontSize: 22 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { ...Typography.display, fontSize: 22 },
  badge: {
    backgroundColor: Colors.error, borderRadius: Radius.full,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  badgeText: { ...Typography.label, fontSize: 9, color: Colors.cream },
  markAllBtn: { ...Typography.caption, fontSize: 12, color: Colors.gold },
  list: { paddingBottom: 100 },
  item: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    gap: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  itemUnread: { backgroundColor: Colors.gold + '08' },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 20 },
  itemBody: { flex: 1, gap: 2 },
  itemTitle: { ...Typography.bodySemibold, fontSize: 14 },
  itemMsg: { ...Typography.body, fontSize: 13, color: Colors.creamDim, lineHeight: 18 },
  itemTime: { ...Typography.caption, fontSize: 11, marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.gold, marginTop: 4 },
  emptyTitle: { ...Typography.heading, fontSize: 20, marginTop: Spacing.md },
  emptyText: { ...Typography.caption, fontSize: 14, marginTop: 4, textAlign: 'center' },
    </SafeAreaView>
  );
}

function getNotificationIcon(type?: string) {
  switch (type?.toUpperCase()) {
    case 'ORDER':
      return '📦';
    case 'EVENT':
      return '🎟️';
    case 'MESSAGE':
      return '💬';
    case 'RENTAL':
      return '🖼️';
    default:
      return '🔔';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backBtnText: {
    fontSize: 20,
    color: Colors.cream,
  },
  headerTitle: {
    ...Typography.display,
    fontSize: 18,
    color: Colors.cream,
  },
  markReadText: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.gold,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...Typography.bodySemibold,
    color: Colors.cream,
    marginTop: Spacing.md,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  unreadCard: {
    borderColor: Colors.gold,
    backgroundColor: Colors.gold + '11',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: Colors.cream,
    flex: 1,
    marginRight: 4,
  },
  titleUnread: {
    color: Colors.gold,
  },
  timeText: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.creamDim,
  },
  messageText: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.creamDim,
    marginTop: 2,
    lineHeight: 16,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gold,
  },
  emptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.display,
    fontSize: 20,
    color: Colors.cream,
    marginBottom: 4,
  },
  emptySub: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.creamDim,
    textAlign: 'center',
    lineHeight: 18,
  },
});
