import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import {
  EventService, ApiEventTicket,
  resolveEventImage, getCityName, formatEventDate,
} from '@/services/eventService';

const STATUS_COLORS: Record<string, string> = {
  confirmed: Colors.success,
  active:    Colors.success,
  pending:   Colors.warning,
  cancelled: Colors.error,
};

export default function MyEventTickets() {
  const [tickets, setTickets] = useState<ApiEventTicket[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await EventService.getMyEventTickets();
      setTickets(data);
    } catch (e: any) {
      console.warn('[MyEventTickets]', e.message);
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  const renderItem = useCallback(({ item }: { item: ApiEventTicket }) => {
    const evt = item.event;
    const imgUri = resolveEventImage(evt?.bannerImage);
    const cityName = getCityName(evt?.city);
    const dateStr = formatEventDate(evt?.eventDate);
    const status = (item.status ?? 'confirmed').toLowerCase();
    const color = STATUS_COLORS[status] ?? Colors.warning;

    return (
      <View style={styles.card}>
        <Image source={{ uri: imgUri }} style={styles.cardImg} contentFit="cover" transition={300} />

        {/* Ticket stub line */}
        <View style={styles.stubLine}>
          <View style={styles.stubDot} />
          <View style={styles.stubDash} />
          <View style={styles.stubDot} />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={2}>{evt?.title ?? 'Event'}</Text>
            <View style={[styles.statusBadge, { backgroundColor: color + '22', borderColor: color }]}>
              <Text style={[styles.statusText, { color }]}>{item.status}</Text>
            </View>
          </View>

          <View style={styles.cardMeta}>
            {dateStr ? <Text style={styles.metaText}>📅 {dateStr}</Text> : null}
            {cityName ? <Text style={styles.metaText}>📍 {cityName}</Text> : null}
            {evt?.venueName ? <Text style={styles.metaText}>🏛️ {evt.venueName}</Text> : null}
          </View>

          <View style={styles.ticketInfo}>
            {item.ticketNumber ? (
              <View style={styles.ticketNumRow}>
                <Text style={styles.ticketNumLabel}>Ticket</Text>
                <Text style={styles.ticketNum}>{item.ticketNumber}</Text>
              </View>
            ) : null}
            <View style={styles.ticketFooter}>
              {item.ticketTier?.name ? (
                <Text style={styles.tierText}>{item.ticketTier.name}</Text>
              ) : null}
              {item.quantity && item.quantity > 1 ? (
                <Text style={styles.tierText}>× {item.quantity} tickets</Text>
              ) : null}
              {item.totalPrice !== undefined ? (
                <Text style={styles.price}>
                  {item.totalPrice === 0 ? 'Free' : `₹${item.totalPrice.toLocaleString('en-IN')}`}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    );
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>My Tickets</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.gold} />
          }
          ListEmptyComponent={
            <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
              <Text style={{ fontSize: 48 }}>🎟️</Text>
              <Text style={styles.emptyTitle}>No tickets yet</Text>
              <Text style={styles.emptyText}>
                Events you register for will appear here
              </Text>
              <TouchableOpacity
                style={{ marginTop: Spacing.md }}
                onPress={() => router.push('/(tabs)/events' as any)}
              >
                <Text style={{ color: Colors.gold, fontSize: 14 }}>Browse Events →</Text>
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
  title: { ...Typography.display, fontSize: 22 },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 100, gap: Spacing.md },
  card: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    overflow: 'hidden', borderWidth: 1, borderColor: Colors.border,
  },
  cardImg: { width: '100%', height: 140 },
  stubLine: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, marginVertical: -1,
  },
  stubDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.bg },
  stubDash: { flex: 1, height: 1, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', marginHorizontal: Spacing.sm },
  cardBody: { padding: Spacing.md, gap: Spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { ...Typography.heading, fontSize: 17, flex: 1, marginRight: Spacing.sm },
  statusBadge: {
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
    borderRadius: Radius.sm, borderWidth: 1,
  },
  statusText: { ...Typography.label, fontSize: 9 },
  cardMeta: { gap: 3 },
  metaText: { ...Typography.caption, fontSize: 12 },
  ticketInfo: {
    backgroundColor: Colors.bgElevated, borderRadius: Radius.sm,
    padding: Spacing.sm, gap: 4,
  },
  ticketNumRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ticketNumLabel: { ...Typography.label, fontSize: 8 },
  ticketNum: { ...Typography.display, fontSize: 16, color: Colors.gold, letterSpacing: 2 },
  ticketFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tierText: { ...Typography.caption, fontSize: 12 },
  price: { ...Typography.bodyBold, fontSize: 14, color: Colors.gold },
  emptyTitle: { ...Typography.heading, fontSize: 20, marginTop: Spacing.md },
  emptyText: { ...Typography.caption, fontSize: 14, textAlign: 'center', marginTop: 4 },
});
