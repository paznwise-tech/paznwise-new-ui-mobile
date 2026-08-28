import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { EventService, resolveEventImage, formatEventDate } from '@/services/eventService';

/** Approval state decides whether an event is visible to buyers at all. */
const STATUS_COLORS: Record<string, string> = {
  APPROVED: Colors.success, PUBLISHED: Colors.success,
  PENDING: Colors.warning, PENDING_APPROVAL: Colors.warning,
  REJECTED: Colors.error, DENIED: Colors.error, CANCELLED: Colors.error,
};

/**
 * The artist's own events.
 *
 * There was no way to see events you had created, how many tickets had
 * sold, or whether moderation had approved them — /events/create existed
 * and then the event vanished from the creator's view.
 */
export default function ArtistEvents() {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: events = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['my-created-events'],
    queryFn: EventService.getMyCreatedEvents,
  });

  const handleDelete = useCallback((event: any) => {
    Alert.alert('Delete event', `Remove "${event.title}"? Attendees will be notified.`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusyId(String(event.id));
          try {
            await EventService.deleteEvent(String(event.id));
            qc.invalidateQueries({ queryKey: ['my-created-events'] });
          } catch (e: any) {
            Alert.alert('Could not delete', e?.message ?? 'Please try again.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  }, [qc]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    const status = String(item.status ?? 'PENDING').toUpperCase();
    const color = STATUS_COLORS[status] ?? Colors.warning;
    const busy = busyId === String(item.id);

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.head}
          activeOpacity={0.85}
          onPress={() => router.push(`/artist/events/${item.id}` as any)}
        >
          <Image
            source={{ uri: resolveEventImage(item.bannerImage ?? item.eventImages?.[0]) }}
            style={styles.thumb}
            contentFit="cover"
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.meta}>{formatEventDate(item.eventDate, item.eventEndDate)}</Text>
            {item.venueName ? <Text style={styles.meta} numberOfLines={1}>📍 {item.venueName}</Text> : null}
          </View>
          <View style={[styles.badge, { borderColor: color, backgroundColor: color + '18' }]}>
            <Text style={[styles.badgeText, { color }]}>{status.replace(/_/g, ' ')}</Text>
          </View>
        </TouchableOpacity>

        {/* Rejection is the one state an artist has to act on, so the
            moderator's reason is surfaced rather than hidden behind a tap. */}
        {item.rejectionReason ? (
          <Text style={styles.rejection}>{item.rejectionReason}</Text>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity onPress={() => router.push(`/artist/events/${item.id}` as any)}>
            <Text style={styles.action}>Attendees</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)} disabled={busy}>
            <Text style={[styles.action, { color: Colors.error }]}>
              {busy ? 'Deleting…' : 'Delete'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [busyId, handleDelete]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Events</Text>
          <TouchableOpacity onPress={() => router.push('/events/create' as any)}>
            <Text style={styles.addBtn}>+ New</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.gold} size="large" /></View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e, i) => String(e.id ?? i)}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.gold} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 44 }}>🎪</Text>
              <Text style={styles.emptyTitle}>No events yet</Text>
              <Text style={styles.emptyText}>Host a workshop, show or exhibition.</Text>
              <TouchableOpacity style={{ marginTop: Spacing.md }} onPress={() => router.push('/events/create' as any)}>
                <Text style={{ color: Colors.gold }}>Create an event →</Text>
              </TouchableOpacity>
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
  headerTitle: { ...Typography.display, fontSize: 20 },
  addBtn: { ...Typography.bodySemibold, fontSize: 14, color: Colors.gold },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  thumb: { width: 56, height: 56, borderRadius: Radius.sm },
  title: { ...Typography.bodySemibold, fontSize: 14 },
  meta: { ...Typography.caption, fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1 },
  badgeText: { ...Typography.label, fontSize: 9 },
  rejection: { ...Typography.caption, fontSize: 12, color: Colors.error, marginTop: Spacing.sm },

  actions: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.lg,
    marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm,
  },
  action: { ...Typography.bodySemibold, fontSize: 13, color: Colors.gold },

  empty: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyTitle: { ...Typography.heading, fontSize: 18, marginTop: Spacing.md },
  emptyText: { ...Typography.caption, fontSize: 13, marginTop: 4, textAlign: 'center' },
});
