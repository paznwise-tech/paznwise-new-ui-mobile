import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import {
  BookingService, CANCELLABLE_BOOKING_STATUSES,
  type ServiceBooking, type ServiceBookingStatus,
} from '@/services/bookingService';

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: '#4CAF7D',
  ACCEPTED:  '#4CAF7D',
  PENDING:   '#F6A723',
  COMPLETED: Colors.gold,
  CANCELLED: '#E05252',
  DECLINED:  '#E05252',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}

function statusLabel(s: ServiceBookingStatus): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

const TABS = ['All', 'Upcoming', 'Completed'];

export default function MyBookings() {
  const [bookings, setBookings]   = useState<ServiceBooking[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab]             = useState('All');

  const load = useCallback(async () => {
    try {
      const data = await BookingService.getMyBookings();
      setBookings(data);
    } catch (e: any) {
      console.warn('[MyBookings] load error:', e.message);
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  const filtered = useMemo(() => {
    return bookings.filter(b => {
      if (tab === 'Upcoming')  return ['PENDING', 'ACCEPTED', 'CONFIRMED'].includes(b.status);
      if (tab === 'Completed') return b.status === 'COMPLETED';
      return true;
    });
  }, [bookings, tab]);

  const handleCancel = useCallback((booking: ServiceBooking) => {
    Alert.alert('Cancel booking', `Cancel your booking with ${booking.artist?.name ?? 'this artist'}?`, [
      { text: 'Keep booking', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: async () => {
          setCancellingId(booking.id);
          try {
            await BookingService.cancelBooking(booking.id);
            await load();
          } catch (e: any) {
            Alert.alert('Could not cancel', e?.message ?? 'Please try again.');
          } finally {
            setCancellingId(null);
          }
        },
      },
    ]);
  }, [load]);

  const renderBookingItem = useCallback(({ item }: { item: ServiceBooking }) => {
    const color = STATUS_COLORS[item.status] ?? Colors.gold;
    const canCancel = CANCELLABLE_BOOKING_STATUSES.includes(item.status);

    return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push(`/booking/detail/${item.id}` as any)}
    >
      {item.artist?.avatar || item.service?.bannerImage ? (
        <Image
          source={{ uri: (item.artist?.avatar ?? item.service?.bannerImage)! }}
          style={styles.cardImg}
          contentFit="cover"
          transition={300}
        />
      ) : (
        <View style={[styles.cardImg, { backgroundColor: Colors.bgCard }]} />
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.artist?.name ?? item.service?.title ?? 'Artist'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: color + '22', borderColor: color }]}>
            <Text style={[styles.statusText, { color }]}>{statusLabel(item.status)}</Text>
          </View>
        </View>
        {item.service?.title ? <Text style={styles.cardType}>{item.service.title}</Text> : null}
        <View style={styles.cardMeta}>
          {item.bookingDate ? (
            <Text style={styles.cardMetaText}>
              📅 {formatDate(item.bookingDate)} · {item.startTime}–{item.endTime}
            </Text>
          ) : null}
          {item.address ? <Text style={styles.cardMetaText} numberOfLines={1}>📍 {item.address}</Text> : null}
        </View>
        {item.artistDeclineReason ? (
          <Text style={styles.declineReason}>Declined: {item.artistDeclineReason}</Text>
        ) : null}
        <View style={styles.cardFooter}>
          <Text style={styles.cardTotal}>₹{item.totalAmount.toLocaleString('en-IN')}</Text>
          {canCancel ? (
            <TouchableOpacity onPress={() => handleCancel(item)} disabled={cancellingId === item.id}>
              <Text style={styles.cancelBtnText}>
                {cancellingId === item.id ? 'Cancelling…' : 'Cancel'}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.viewBtnText}>View details →</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
    );
  }, [handleCancel, cancellingId]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>My Bookings</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.tabs}>
          {TABS.map(t => (
            <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyExtractor={i => i.id}
          renderItem={renderBookingItem}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={3}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.gold} />
          }
          ListEmptyComponent={
            <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
              <Text style={{ ...Typography.body, fontSize: 14, color: Colors.creamDim }}>
                No bookings yet
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cancelBtnText: { ...Typography.bodySemibold, fontSize: 13, color: Colors.error },
  declineReason: { ...Typography.caption, fontSize: 12, color: Colors.error, marginTop: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backIcon: { color: Colors.gold, fontSize: 22 },
  title: { ...Typography.display, fontSize: 22 },
  tabs: { flexDirection: 'row', marginHorizontal: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: 4 },
  tab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.sm },
  tabActive: { backgroundColor: Colors.bgElevated },
  tabText: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  tabTextActive: { color: Colors.cream, fontFamily: 'Inter_600SemiBold' },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 100, gap: Spacing.sm },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  cardImg: { width: '100%', height: 120 },
  cardBody: { padding: Spacing.md, gap: Spacing.xs },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { ...Typography.heading, fontSize: 17 },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.sm, borderWidth: 1 },
  statusText: { ...Typography.label, fontSize: 9 },
  cardType: { ...Typography.caption, fontSize: 12 },
  cardMeta: { flexDirection: 'row', gap: Spacing.md },
  cardMetaText: { ...Typography.caption, fontSize: 11, flex: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  cardTotal: { ...Typography.bodyBold, fontSize: 16, color: Colors.gold },
  viewBtn: {},
  viewBtnText: { ...Typography.label, fontSize: 10, color: Colors.gold },
});
