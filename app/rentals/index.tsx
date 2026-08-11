import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { RentalService, RentalListing, ActiveRental } from '@/services/rentalService';

const TABS = ['Browse', 'My Rentals'] as const;
type Tab = typeof TABS[number];

export default function Rentals() {
  const [tab, setTab]                 = useState<Tab>('Browse');
  const [listings, setListings]       = useState<RentalListing[]>([]);
  const [myRentals, setMyRentals]     = useState<ActiveRental[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  const load = useCallback(async () => {
    const [listingsRes, rentalsRes] = await Promise.allSettled([
      RentalService.getListings(),
      RentalService.getMyRentals(),
    ]);
    if (listingsRes.status === 'fulfilled') setListings(listingsRes.value);
    if (rentalsRes.status === 'fulfilled') setMyRentals(rentalsRes.value);
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  const handleRentRequest = useCallback((item: RentalListing) => {
    Alert.alert(
      `Rent "${item.title}"`,
      `₹${item.rentalPrice.toLocaleString('en-IN')} ${item.rentalPeriod}${item.deposit ? `\nSecurity deposit: ₹${item.deposit.toLocaleString('en-IN')}` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Rental',
          onPress: async () => {
            try {
              await RentalService.requestRental(item.id);
              Alert.alert('Requested', 'Your rental request has been sent to the artist.');
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Failed to send request');
            }
          },
        },
      ]
    );
  }, []);

  const renderListing = useCallback(({ item }: { item: RentalListing }) => (
    <TouchableOpacity
      style={[styles.listingCard, !item.available && { opacity: 0.6 }]}
      activeOpacity={0.85}
      onPress={() => item.available && handleRentRequest(item)}
    >
      <Image source={{ uri: item.img }} style={styles.listingImg} contentFit="cover" transition={300} />
      {!item.available && (
        <View style={styles.unavailableOverlay}>
          <Text style={styles.unavailableText}>Rented</Text>
        </View>
      )}
      <View style={styles.listingBody}>
        <Text style={styles.listingTitle} numberOfLines={1}>{item.title}</Text>
        {item.artist ? <Text style={styles.listingArtist}>{item.artist}</Text> : null}
        <View style={styles.listingFooter}>
          <View>
            <Text style={styles.rentalPrice}>₹{item.rentalPrice.toLocaleString('en-IN')}</Text>
            <Text style={styles.rentalPeriod}>{item.rentalPeriod}</Text>
          </View>
          {item.deposit !== undefined && (
            <Text style={styles.deposit}>+ ₹{item.deposit.toLocaleString('en-IN')} deposit</Text>
          )}
        </View>
        {item.available && (
          <TouchableOpacity style={styles.rentBtn} onPress={() => handleRentRequest(item)}>
            <Text style={styles.rentBtnText}>Request Rental</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  ), [handleRentRequest]);

  const renderMyRental = useCallback(({ item }: { item: ActiveRental }) => (
    <View style={styles.myRentalCard}>
      <Image source={{ uri: item.productImg }} style={styles.myRentalImg} contentFit="cover" />
      <View style={styles.myRentalBody}>
        <Text style={styles.myRentalTitle}>{item.productTitle}</Text>
        <View style={[styles.statusBadge, { backgroundColor: Colors.success + '22', borderColor: Colors.success }]}>
          <Text style={[styles.statusText, { color: Colors.success }]}>{item.status}</Text>
        </View>
        <Text style={styles.myRentalDate}>📅 {item.startDate} → {item.endDate}</Text>
        <Text style={styles.myRentalPrice}>₹{item.rentalPrice.toLocaleString('en-IN')} total</Text>
      </View>
    </View>
  ), []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Artwork Rentals</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.tabs}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : tab === 'Browse' ? (
        <FlatList
          data={listings}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={renderListing}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.gold} />}
          ListHeaderComponent={
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>🖼️ Rent Artwork</Text>
              <Text style={styles.infoText}>Display original art in your home or office with flexible monthly rentals. Return anytime.</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
              <Text style={{ fontSize: 48 }}>🖼️</Text>
              <Text style={styles.emptyTitle}>No rentals available</Text>
              <Text style={styles.emptyText}>Artworks available for rent will appear here</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={myRentals}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={renderMyRental}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.gold} />}
          ListEmptyComponent={
            <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
              <Text style={{ fontSize: 48 }}>📦</Text>
              <Text style={styles.emptyTitle}>No active rentals</Text>
              <Text style={styles.emptyText}>Artwork you rent will appear here</Text>
              <TouchableOpacity style={{ marginTop: Spacing.md }} onPress={() => setTab('Browse')}>
                <Text style={{ color: Colors.gold, fontSize: 14 }}>Browse Available Artwork →</Text>
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
  tabs: {
    flexDirection: 'row', marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: 4,
  },
  tab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.sm },
  tabActive: { backgroundColor: Colors.bgElevated },
  tabText: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  tabTextActive: { color: Colors.cream, fontFamily: 'Inter_600SemiBold' },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 100, gap: Spacing.md },
  infoCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.borderGold, padding: Spacing.md, gap: 4,
    marginBottom: Spacing.sm,
  },
  infoTitle: { ...Typography.heading, fontSize: 18 },
  infoText: { ...Typography.body, fontSize: 14, color: Colors.creamDim, lineHeight: 22 },
  listingCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  listingImg: { width: '100%', height: 180 },
  unavailableOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 180,
    backgroundColor: 'rgba(13,27,42,0.7)', alignItems: 'center', justifyContent: 'center',
  },
  unavailableText: { ...Typography.heading, fontSize: 20, color: Colors.cream },
  listingBody: { padding: Spacing.md, gap: Spacing.sm },
  listingTitle: { ...Typography.heading, fontSize: 17 },
  listingArtist: { ...Typography.caption, fontSize: 12 },
  listingFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  rentalPrice: { ...Typography.display, fontSize: 20, color: Colors.gold },
  rentalPeriod: { ...Typography.caption, fontSize: 11 },
  deposit: { ...Typography.caption, fontSize: 11, textAlign: 'right' },
  rentBtn: {
    backgroundColor: Colors.gold, borderRadius: Radius.full,
    padding: Spacing.md, alignItems: 'center',
  },
  rentBtnText: { ...Typography.bodyBold, fontSize: 14, color: Colors.bg },
  myRentalCard: {
    flexDirection: 'row', backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  myRentalImg: { width: 100, height: 120 },
  myRentalBody: { flex: 1, padding: Spacing.md, gap: 4 },
  myRentalTitle: { ...Typography.heading, fontSize: 15 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.sm, borderWidth: 1 },
  statusText: { ...Typography.label, fontSize: 9 },
  myRentalDate: { ...Typography.caption, fontSize: 12 },
  myRentalPrice: { ...Typography.bodyBold, fontSize: 14, color: Colors.gold },
  emptyTitle: { ...Typography.heading, fontSize: 20, marginTop: Spacing.md },
  emptyText: { ...Typography.caption, fontSize: 14, marginTop: 4, textAlign: 'center' },
});
