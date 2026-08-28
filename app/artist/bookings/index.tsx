import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { BookingService, type ServiceBooking } from '@/services/bookingService';

const STATUS_COLORS: Record<string, string> = {
  PENDING: Colors.warning, ACCEPTED: Colors.success, CONFIRMED: Colors.success,
  COMPLETED: Colors.gold, DECLINED: Colors.error, CANCELLED: Colors.error,
};

const TABS = ['Requests', 'Upcoming', 'Past'] as const;

/**
 * Booking requests received by the artist.
 *
 * Accept and decline existed on the API with no caller, so a request could
 * arrive and sit there with nothing the artist could do about it.
 */
export default function ArtistBookings() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Requests');
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: bookings = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['incoming-bookings'],
    queryFn: BookingService.getIncomingBookings,
  });

  const visible = bookings.filter(b => {
    if (tab === 'Requests') return b.status === 'PENDING';
    if (tab === 'Upcoming') return b.status === 'ACCEPTED' || b.status === 'CONFIRMED';
    return ['COMPLETED', 'DECLINED', 'CANCELLED'].includes(b.status);
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['incoming-bookings'] });
    qc.invalidateQueries({ queryKey: ['artist-dashboard'] });
  };

  const handleAccept = useCallback((booking: ServiceBooking) => {
    Alert.alert(
      'Accept booking',
      `Confirm ${booking.service?.title ?? 'this booking'} on ${new Date(booking.bookingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}?`,
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setBusyId(booking.id);
            try {
              await BookingService.acceptBooking(booking.id);
              refresh();
            } catch (e: any) {
              Alert.alert('Could not accept', e?.message ?? 'Please try again.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  }, [qc]);

  const handleDecline = useCallback((booking: ServiceBooking) => {
    // The reason is shown to the customer on their booking, so it is asked
    // for rather than sent empty.
    const decline = async (reason: string) => {
      setBusyId(booking.id);
      try {
        await BookingService.declineBooking(booking.id, reason);
        refresh();
      } catch (e: any) {
        Alert.alert('Could not decline', e?.message ?? 'Please try again.');
      } finally {
        setBusyId(null);
      }
    };

    Alert.alert('Decline booking', 'The customer will see your reason.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Not available', onPress: () => decline('Not available on that date') },
      { text: 'Too far away', onPress: () => decline('The location is outside my travel range') },
      { text: 'Other', onPress: () => decline('Unable to take this booking') },
    ]);
  }, [qc]);

  const renderItem = useCallback(({ item }: { item: ServiceBooking }) => {
    const color = STATUS_COLORS[item.status] ?? Colors.gold;
    const busy = busyId === item.id;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => router.push(`/booking/detail/${item.id}` as any)}
      >
        <View style={styles.head}>
          <Text style={styles.title} numberOfLines={1}>{item.service?.title ?? 'Service booking'}</Text>
          <View style={[styles.badge, { borderColor: color, backgroundColor: color + '18' }]}>
            <Text style={[styles.badgeText, { color }]}>{item.status}</Text>
          </View>
        </View>

        <Text style={styles.meta}>
          📅 {new Date(item.bookingDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
          {item.startTime ? ` · ${item.startTime}–${item.endTime}` : ''}
        </Text>
        {item.address ? <Text style={styles.meta} numberOfLines={1}>📍 {item.address}</Text> : null}
        {item.specialNotes ? <Text style={styles.notes} numberOfLines={2}>“{item.specialNotes}”</Text> : null}

        <View style={styles.footer}>
          <Text style={styles.amount}>₹{item.totalAmount.toLocaleString('en-IN')}</Text>
          {item.status === 'PENDING' && (
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => handleDecline(item)} disabled={busy}>
                <Text style={styles.decline}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleAccept(item)} disabled={busy}>
                <Text style={styles.accept}>{busy ? 'Working…' : 'Accept'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [busyId, handleAccept, handleDecline]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Requests</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.tabs}>
          {TABS.map(t => {
            const count = t === 'Requests' ? bookings.filter(b => b.status === 'PENDING').length : 0;
            return (
              <TouchableOpacity
                key={t}
                style={[styles.tab, tab === t && styles.tabActive]}
                onPress={() => setTab(t)}
              >
                <Text style={[styles.tabText, tab === t && { color: Colors.gold }]}>
                  {t}{count > 0 ? ` (${count})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.gold} size="large" /></View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={b => b.id}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.gold} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 44 }}>🎭</Text>
              <Text style={styles.emptyTitle}>
                {tab === 'Requests' ? 'No new requests' : `Nothing ${tab.toLowerCase()}`}
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

  tabs: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  tab: {
    paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  tabActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '18' },
  tabText: { ...Typography.caption, fontSize: 12, color: Colors.creamDim },

  card: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  title: { ...Typography.bodySemibold, fontSize: 15, flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1 },
  badgeText: { ...Typography.label, fontSize: 9 },
  meta: { ...Typography.caption, fontSize: 12, marginTop: 4 },
  notes: { ...Typography.body, fontSize: 13, color: Colors.creamDim, marginTop: 6, fontStyle: 'italic' },

  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm,
  },
  amount: { ...Typography.bodySemibold, fontSize: 15, color: Colors.gold },
  actions: { flexDirection: 'row', gap: Spacing.lg },
  decline: { ...Typography.bodySemibold, fontSize: 13, color: Colors.error },
  accept: { ...Typography.bodySemibold, fontSize: 13, color: Colors.success },

  empty: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyTitle: { ...Typography.heading, fontSize: 18, marginTop: Spacing.md },
});
