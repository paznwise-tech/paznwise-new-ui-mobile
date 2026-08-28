import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { EventService } from '@/services/eventService';

/**
 * Attendees for one event, with door check-in.
 *
 * The verify endpoint existed with no caller, so there was no way to admit
 * someone at the door — an artist running their own event had no list of
 * who was coming.
 */
export default function EventAttendees() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: bookings = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['event-bookings', id],
    queryFn: () => EventService.getEventBookings(String(id)),
    enabled: !!id,
  });

  // Searching by name or ticket number is what a door queue actually needs.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter((b: any) =>
      String(b.user?.name ?? b.attendeeName ?? '').toLowerCase().includes(q) ||
      String(b.ticketNumber ?? b.bookingRef ?? '').toLowerCase().includes(q),
    );
  }, [bookings, query]);

  const stats = useMemo(() => {
    const total = bookings.reduce((n: number, b: any) => n + Number(b.seatsBooked ?? b.quantity ?? 1), 0);
    const checkedIn = bookings.filter((b: any) => b.isVerified || b.status === 'VERIFIED').length;
    return { total, checkedIn, count: bookings.length };
  }, [bookings]);

  const handleCheckIn = useCallback((booking: any) => {
    const name = booking.user?.name ?? booking.attendeeName ?? 'this attendee';
    Alert.alert('Check in', `Admit ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Check in',
        onPress: async () => {
          setBusyId(String(booking.id));
          try {
            await EventService.verifyBooking(String(booking.id));
            qc.invalidateQueries({ queryKey: ['event-bookings', id] });
          } catch (e: any) {
            Alert.alert('Could not check in', e?.message ?? 'Please try again.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  }, [id, qc]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    const verified = item.isVerified || item.status === 'VERIFIED';
    const busy = busyId === String(item.id);
    const seats = Number(item.seatsBooked ?? item.quantity ?? 1);

    return (
      <View style={[styles.row, verified && styles.rowDone]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.user?.name ?? item.attendeeName ?? 'Attendee'}</Text>
          <Text style={styles.meta}>
            {item.ticketNumber ?? item.bookingRef ?? ''}
            {seats > 1 ? ` · ${seats} seats` : ''}
            {item.seatIds?.length ? ` · ${item.seatIds.length} seat${item.seatIds.length === 1 ? '' : 's'}` : ''}
          </Text>
        </View>
        {verified ? (
          <Text style={styles.done}>✓ In</Text>
        ) : (
          <TouchableOpacity onPress={() => handleCheckIn(item)} disabled={busy}>
            <Text style={styles.checkIn}>{busy ? '…' : 'Check in'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [busyId, handleCheckIn]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Attendees</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.statsRow}>
          <Text style={styles.stat}>{stats.count} bookings</Text>
          <Text style={styles.stat}>{stats.total} seats</Text>
          <Text style={[styles.stat, { color: Colors.success }]}>{stats.checkedIn} checked in</Text>
        </View>

        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or ticket number"
          placeholderTextColor={Colors.creamFaint}
        />
      </SafeAreaView>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.gold} size="large" /></View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(b, i) => String(b.id ?? i)}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.gold} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {query ? 'No match' : 'No bookings yet'}
              </Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingBottom: Spacing.sm,
  },
  stat: { ...Typography.caption, fontSize: 12 },

  search: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    color: Colors.cream, fontFamily: 'Inter_400Regular', fontSize: 14,
    backgroundColor: Colors.bgCard,
  },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  rowDone: { opacity: 0.55 },
  name: { ...Typography.bodySemibold, fontSize: 14 },
  meta: { ...Typography.caption, fontSize: 12, marginTop: 2 },
  checkIn: { ...Typography.bodySemibold, fontSize: 13, color: Colors.gold },
  done: { ...Typography.bodySemibold, fontSize: 13, color: Colors.success },

  empty: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyTitle: { ...Typography.heading, fontSize: 18 },
});
