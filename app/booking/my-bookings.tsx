import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { BookingService } from '@/services/bookingService';
import { Booking } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  confirmed: '#4CAF7D',
  pending:   '#F6A723',
  completed: Colors.gold,
  cancelled: '#E05252',
};

const TABS = ['All', 'Upcoming', 'Completed'];

export default function MyBookings() {
  const [bookings, setBookings]   = useState<Booking[]>([]);
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
      if (tab === 'Upcoming')  return b.status === 'confirmed' || b.status === 'pending';
      if (tab === 'Completed') return b.status === 'completed';
      return true;
    });
  }, [bookings, tab]);

  const renderBookingItem = useCallback(({ item }: { item: Booking }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.85}>
      {item.performerImg ? (
        <Image source={{ uri: item.performerImg }} style={styles.cardImg} contentFit="cover" transition={300} />
      ) : (
        <View style={[styles.cardImg, { backgroundColor: Colors.bgCard }]} />
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.performerName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '22', borderColor: STATUS_COLORS[item.status] }]}>
            <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
          </View>
        </View>
        {item.performerType ? <Text style={styles.cardType}>{item.performerType}</Text> : null}
        <View style={styles.cardMeta}>
          {item.date ? <Text style={styles.cardMetaText}>📅 {item.date}</Text> : null}
          {item.eventDetails ? <Text style={styles.cardMetaText} numberOfLines={1}>📍 {item.eventDetails}</Text> : null}
        </View>
        <View style={styles.cardFooter}>
          {item.price ? <Text style={styles.cardTotal}>{item.price}</Text> : <View />}
          <TouchableOpacity style={styles.viewBtn}>
            <Text style={styles.viewBtnText}>View details →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  ), []);

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
