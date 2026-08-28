import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { OrganizerService, type OrganizerEvent } from '@/services/organizerService';

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: Colors.success, APPROVED: Colors.success, ACTIVE: Colors.success,
  PENDING: Colors.warning, DRAFT: Colors.warning,
  CANCELLED: Colors.error, REJECTED: Colors.error,
};

/**
 * The organizer's events.
 *
 * Ticketed events were entirely absent from mobile — an organizer could
 * not create one, see what had sold, or check anyone in.
 */
export default function OrganizerEvents() {
  const { data: events = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['organizer-events'],
    queryFn: OrganizerService.getMyEvents,
  });

  const renderItem = ({ item }: { item: OrganizerEvent }) => {
    const status = String(item.status ?? 'DRAFT').toUpperCase();
    const color = STATUS_COLORS[status] ?? Colors.warning;
    const sold = (item.ticketTiers ?? []).reduce((n, t) => n + t.bookedSeats, 0);
    const capacity = item.totalCapacity ?? (item.ticketTiers ?? []).reduce((n, t) => n + t.totalSeats, 0);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => router.push(`/organizer/events/${item.id}` as any)}
      >
        <View style={styles.head}>
          {item.bannerImage ? (
            <Image source={{ uri: item.bannerImage }} style={styles.thumb} contentFit="cover" />
          ) : (
            <View style={[styles.thumb, { backgroundColor: Colors.bgInput }]} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            {item.eventDate ? (
              <Text style={styles.meta}>
                {new Date(item.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {item.startTime ? ` · ${item.startTime}` : ''}
              </Text>
            ) : null}
            {item.venue ? <Text style={styles.meta} numberOfLines={1}>📍 {item.venue}</Text> : null}
          </View>
          <View style={[styles.badge, { borderColor: color, backgroundColor: color + '18' }]}>
            <Text style={[styles.badgeText, { color }]}>{status}</Text>
          </View>
        </View>

        {capacity > 0 && (
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, (sold / capacity) * 100)}%` }]} />
            </View>
            <Text style={styles.progressText}>{sold} / {capacity} sold</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Events</Text>
          <TouchableOpacity onPress={() => router.push('/organizer/events/create' as any)}>
            <Text style={styles.addBtn}>+ New</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.gold} size="large" /></View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={e => e.id}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.gold} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 44 }}>🎟</Text>
              <Text style={styles.emptyTitle}>No events yet</Text>
              <Text style={styles.emptyText}>Create a ticketed event to start selling.</Text>
              <TouchableOpacity style={{ marginTop: Spacing.md }} onPress={() => router.push('/organizer/events/create' as any)}>
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

  progressWrap: { marginTop: Spacing.md, gap: 4 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.border, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: Colors.gold },
  progressText: { ...Typography.caption, fontSize: 11 },

  empty: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyTitle: { ...Typography.heading, fontSize: 18, marginTop: Spacing.md },
  emptyText: { ...Typography.caption, fontSize: 13, marginTop: 4, textAlign: 'center' },
});
