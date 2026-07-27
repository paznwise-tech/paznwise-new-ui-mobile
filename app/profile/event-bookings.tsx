import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { eventService } from '@/services/eventService';

export default function MyEventBookingsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const data = await eventService.getMyEventBookings();
      setBookings(data);
    } catch (err: any) {
      console.warn('[MyEventBookings] Error fetching bookings:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const renderBookingItem = ({ item }: { item: any }) => {
    const event = item.event || item;
    const imgUrl = event.img || event.bannerImage || event.imageUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=300&fit=crop';
    const dateStr = event.date || item.createdAt
      ? new Date(event.date || item.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Upcoming';

    return (
      <View style={styles.ticketCard}>
        <Image source={{ uri: imgUrl }} style={styles.ticketImg} contentFit="cover" />
        <View style={styles.ticketContent}>
          <View style={styles.headerRow}>
            <Text style={styles.eventTitle} numberOfLines={1}>{event.title || 'Live Art Event'}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.status || 'CONFIRMED'}</Text>
            </View>
          </View>

          <Text style={styles.ticketSub}>📅 {dateStr} • 📍 {event.city || event.location || 'Venue'}</Text>
          <Text style={styles.seatsText}>Passes: {item.seatsBooked || item.quantity || 1} Seat(s)</Text>

          <View style={styles.ticketFooter}>
            <Text style={styles.qrCodeText}>🎟️ QR Ticket ID: #{item.id || item.bookingId || 'PASS-882'}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Event Tickets</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.gold} />
          <Text style={styles.loadingText}>Loading Tickets...</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item, index) => (item.id || item.bookingId || index).toString()}
          renderItem={renderBookingItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.gold} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No Event Tickets Yet</Text>
              <Text style={styles.emptySub}>Book passes for upcoming art exhibitions, workshops, and music festivals.</Text>
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => router.replace('/(tabs)/events')}
              >
                <Text style={styles.browseBtnText}>Explore Events</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
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
  ticketCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gold + '44',
    marginBottom: Spacing.md,
  },
  ticketImg: {
    width: '100%',
    height: 120,
  },
  ticketContent: {
    padding: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventTitle: {
    ...Typography.bodyBold,
    fontSize: 15,
    color: Colors.cream,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    backgroundColor: '#2E7D3222',
    borderColor: '#2E7D32',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  badgeText: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: '#4CAF50',
  },
  ticketSub: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.creamDim,
    marginBottom: 4,
  },
  seatsText: {
    ...Typography.bodySemibold,
    fontSize: 13,
    color: Colors.gold,
    marginBottom: Spacing.xs,
  },
  ticketFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.xs,
  },
  qrCodeText: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.creamDim,
    fontFamily: 'monospace',
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
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  browseBtn: {
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  browseBtnText: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: '#0D1B2A',
  },
});
