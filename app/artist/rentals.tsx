import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { rentalService, type RentalBookingItem } from '@/services/rentalService';

export default function RentalRequestsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rentals, setRentals] = useState<RentalBookingItem[]>([]);

  useEffect(() => {
    fetchRentals();
  }, []);

  const fetchRentals = async () => {
    try {
      const data = await rentalService.getIncomingRentals();
      setRentals(data);
    } catch (err: any) {
      console.warn('[RentalRequests] Error fetching rentals:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRentals();
  };

  const handleAccept = async (id: string) => {
    try {
      await rentalService.acceptRental(id);
      Alert.alert('Rental Accepted', 'Rental request has been approved.');
      fetchRentals();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to accept rental');
    }
  };

  const handleDecline = async (id: string) => {
    try {
      await rentalService.declineRental(id);
      Alert.alert('Rental Declined', 'Rental request declined.');
      fetchRentals();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to decline rental');
    }
  };

  const renderRentalItem = ({ item }: { item: RentalBookingItem }) => {
    const isPending = item.status === 'PENDING';
    const startDate = new Date(item.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endDate = new Date(item.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.refText}>Ref #{item.bookingRef || item.id}</Text>
          <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.bodyRow}>
          {item.product?.thumbnailUrl ? (
            <Image source={{ uri: item.product.thumbnailUrl }} style={styles.artworkImg} />
          ) : (
            <View style={[styles.artworkImg, { backgroundColor: Colors.bgInput }]} />
          )}

          <View style={{ flex: 1 }}>
            <Text style={styles.productTitle}>{item.product?.title || 'Rented Artwork'}</Text>
            <Text style={styles.durationText}>🗓️ {startDate} – {endDate} ({item.days || 1} days)</Text>
            <Text style={styles.amountText}>Payout: ₹{(Number(item.rentalAmount) || 0).toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {isPending && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.btn, styles.declineBtn]}
              onPress={() => handleDecline(item.id)}
            >
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.acceptBtn]}
              onPress={() => handleAccept(item.id)}
            >
              <Text style={styles.acceptText}>Accept Request</Text>
            </TouchableOpacity>
          </View>
        )}
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
        <Text style={styles.headerTitle}>Rental Requests</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.gold} />
          <Text style={styles.loadingText}>Loading Rental Requests...</Text>
        </View>
      ) : (
        <FlatList
          data={rentals}
          keyExtractor={(item) => item.id}
          renderItem={renderRentalItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.gold} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No Rental Requests</Text>
              <Text style={styles.emptySub}>When corporate buyers or galleries request to rent your artwork, details will appear here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'ACCEPTED':
    case 'COMPLETED':
      return { backgroundColor: '#2E7D3222', borderColor: '#2E7D32' };
    case 'DECLINED':
    case 'CANCELLED':
      return { backgroundColor: '#D32F2F22', borderColor: '#D32F2F' };
    default:
      return { backgroundColor: '#F57C0022', borderColor: '#F57C00' };
  }
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
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  refText: {
    ...Typography.bodyBold,
    fontSize: 13,
    color: Colors.gold,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  statusText: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: Colors.cream,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  artworkImg: {
    width: 50,
    height: 50,
    borderRadius: Radius.md,
  },
  productTitle: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: Colors.cream,
  },
  durationText: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.creamDim,
    marginTop: 2,
  },
  amountText: {
    ...Typography.bodySemibold,
    fontSize: 13,
    color: Colors.gold,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  declineBtn: {
    backgroundColor: '#D32F2F22',
    borderWidth: 1,
    borderColor: '#D32F2F',
  },
  declineText: {
    ...Typography.bodyBold,
    fontSize: 13,
    color: '#FF5252',
  },
  acceptBtn: {
    backgroundColor: Colors.gold,
  },
  acceptText: {
    ...Typography.bodyBold,
    fontSize: 13,
    color: '#0D1B2A',
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
    lineHeight: 18,
  },
});
