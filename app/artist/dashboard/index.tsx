import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { BookingService } from '@/services/bookingService';
import { ArtistServiceApi } from '@/services/artistService';
import type { ServiceBooking } from '@/services/bookingService';
import { Performer } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  confirmed: Colors.success,
  pending:   Colors.warning,
  completed: Colors.gold,
  cancelled: Colors.error,
};

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ArtistDashboard() {
  const [bookings, setBookings]     = useState<ServiceBooking[]>([]);
  const [services, setServices]     = useState<Array<Performer & { serviceId: string }>>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [bookingsRes, servicesRes] = await Promise.allSettled([
      BookingService.getIncomingBookings(),
      ArtistServiceApi.getServices({ limit: 50 }),
    ]);
    if (bookingsRes.status === 'fulfilled') setBookings(bookingsRes.value);
    if (servicesRes.status === 'fulfilled') setServices(servicesRes.value);
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  const totalBookings = bookings.length;
  const pending = bookings.filter(b => b.status === 'PENDING').length;
  const completed = bookings.filter(b => b.status === 'COMPLETED').length;

  const renderBooking = useCallback(({ item }: { item: ServiceBooking }) => {
    const color = STATUS_COLORS[item.status] ?? Colors.warning;
    return (
      <View style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <Text style={styles.bookingName}>{item.service?.title ?? 'Service booking'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: color + '22', borderColor: color }]}>
            <Text style={[styles.statusText, { color }]}>{item.status}</Text>
          </View>
        </View>
        {item.bookingDate ? (
          <Text style={styles.bookingMeta}>
            📅 {new Date(item.bookingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            {item.startTime ? ` · ${item.startTime}–${item.endTime}` : ''}
          </Text>
        ) : null}
        {item.address ? <Text style={styles.bookingMeta}>📍 {item.address}</Text> : null}
        <Text style={styles.bookingPrice}>₹{item.totalAmount.toLocaleString('en-IN')}</Text>
      </View>
    );
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>My Dashboard</Text>
          <TouchableOpacity onPress={() => router.push('/artist/availability' as any)}>
            <Text style={styles.availBtn}>Availability</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.gold} />}
      >
        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatCard icon="📋" label="Total Bookings" value={String(totalBookings)} />
          <StatCard icon="⏳" label="Pending" value={String(pending)} />
          <StatCard icon="✅" label="Completed" value={String(completed)} />
          <StatCard icon="🎭" label="Services" value={String(services.length)} />
        </View>

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/artist/register-artist' as any)}
          >
            <Text style={styles.actionBtnIcon}>+ Add Service</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/artist/availability' as any)}
          >
            <Text style={styles.actionBtnIcon}>📅 Set Availability</Text>
          </TouchableOpacity>
        </View>

        {/* Recent booking requests */}
        <TouchableOpacity
          style={styles.createServiceBtn}
          onPress={() => router.push('/artist/services/create' as any)}
        >
          <Text style={styles.createServiceText}>+ Add a bookable service</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Recent Booking Requests</Text>
        {bookings.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptyText}>No booking requests yet</Text>
            <Text style={styles.emptySubtext}>Clients who request your services will appear here</Text>
          </View>
        ) : (
          bookings.slice(0, 5).map(b => (
            <View key={b.id}>{renderBooking({ item: b } as any)}</View>
          ))
        )}
        {bookings.length > 5 && (
          <TouchableOpacity style={styles.viewAllBtn} onPress={() => router.push('/booking/my-bookings' as any)}>
            <Text style={styles.viewAllText}>View all {bookings.length} bookings →</Text>
          </TouchableOpacity>
        )}

        {/* My services */}
        {services.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>My Services</Text>
            {services.map(s => (
              <View key={s.serviceId} style={styles.serviceCard}>
                <View>
                  <Text style={styles.serviceName}>{s.name}</Text>
                  <Text style={styles.serviceType}>{s.type}</Text>
                </View>
                <View style={styles.serviceRight}>
                  <Text style={styles.servicePrice}>{s.price}</Text>
                  <Text style={styles.serviceRating}>★ {s.rating.toFixed(1)}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  createServiceBtn: {
    borderWidth: 1, borderColor: Colors.gold + '66', borderRadius: Radius.md,
    paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md,
  },
  createServiceText: { ...Typography.bodySemibold, fontSize: 14, color: Colors.gold },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  backIcon: { color: Colors.gold, fontSize: 22 },
  title: { ...Typography.display, fontSize: 22 },
  availBtn: { ...Typography.label, fontSize: 10, color: Colors.gold },
  content: { paddingBottom: 100 },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
    padding: Spacing.md,
  },
  statCard: {
    flex: 1, minWidth: 140, backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.borderGold,
    padding: Spacing.md, alignItems: 'center', gap: 4,
  },
  statIcon: { fontSize: 24 },
  statValue: { ...Typography.display, fontSize: 28, color: Colors.gold },
  statLabel: { ...Typography.caption, fontSize: 12, textAlign: 'center' },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  actionBtn: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.borderGold, padding: Spacing.md, alignItems: 'center',
  },
  actionBtnIcon: { ...Typography.bodySemibold, fontSize: 14, color: Colors.gold },
  sectionTitle: { ...Typography.heading, fontSize: 20, paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  bookingCard: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: 4,
  },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookingName: { ...Typography.bodySemibold, fontSize: 15, flex: 1 },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.sm, borderWidth: 1 },
  statusText: { ...Typography.label, fontSize: 9 },
  bookingMeta: { ...Typography.caption, fontSize: 12 },
  bookingPrice: { ...Typography.bodyBold, fontSize: 14, color: Colors.gold },
  viewAllBtn: { margin: Spacing.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.borderGold, borderRadius: Radius.md, alignItems: 'center' },
  viewAllText: { ...Typography.bodySemibold, fontSize: 14, color: Colors.gold },
  serviceCard: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  serviceName: { ...Typography.bodySemibold, fontSize: 15 },
  serviceType: { ...Typography.caption, fontSize: 12, marginTop: 2 },
  serviceRight: { alignItems: 'flex-end' },
  servicePrice: { ...Typography.bodyBold, fontSize: 14, color: Colors.gold },
  serviceRating: { ...Typography.caption, fontSize: 12, color: Colors.gold },
  emptySection: { padding: Spacing.xl, alignItems: 'center' },
  emptyText: { ...Typography.heading, fontSize: 18 },
  emptySubtext: { ...Typography.caption, fontSize: 13, textAlign: 'center', marginTop: 4 },
});
