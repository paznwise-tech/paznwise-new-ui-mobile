import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import {
  rentalService, rentalStatusLabel,
  type RentalBookingItem, type DepositStatus,
} from '@/services/rentalService';

const STATUS_COLORS: Record<string, string> = {
  PENDING: Colors.warning, ACCEPTED: Colors.success, DISPATCHED: Colors.gold,
  RETURNED: Colors.gold, COMPLETED: Colors.success,
  DECLINED: Colors.error, CANCELLED: Colors.error,
};

const DEPOSIT_CHOICES: Array<{ value: DepositStatus; label: string }> = [
  { value: 'REFUNDED',            label: 'Refund in full' },
  { value: 'PARTIALLY_REFUNDED',  label: 'Partial refund' },
  { value: 'FORFEITED',           label: 'Withhold deposit' },
];

/**
 * Rental requests for the artist's own artwork.
 *
 * The whole lifecycle lives here: accept or decline, dispatch, record the
 * return, and settle the deposit. Only accept and decline were wired
 * before, so an accepted rental could never progress — the artwork could
 * be lent out and never marked returned, and the deposit never released.
 */
export default function ArtistRentals() {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: rentals = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['incoming-rentals'],
    queryFn: rentalService.getIncomingRentals,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['incoming-rentals'] });

  /** Both dispatch and return require at least one photo server-side. */
  const capturePhotos = useCallback(async (): Promise<Array<{ uri: string; name: string }> | null> => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach a condition report.');
      return null;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.7, allowsMultipleSelection: true, selectionLimit: 6,
    });
    if (res.canceled || res.assets.length === 0) return null;
    return res.assets.map((a, i) => ({ uri: a.uri, name: `condition-${i}.jpg` }));
  }, []);

  const runWithPhotos = useCallback(async (
    booking: RentalBookingItem,
    action: 'dispatch' | 'return',
  ) => {
    const photos = await capturePhotos();
    if (!photos) return;

    setBusyId(booking.id);
    try {
      if (action === 'dispatch') await rentalService.dispatchRental(booking.id, photos);
      else await rentalService.returnRental(booking.id, photos);
      refresh();
    } catch (e: any) {
      Alert.alert('Could not update', e?.message ?? 'Please try again.');
    } finally {
      setBusyId(null);
    }
  }, [capturePhotos, qc]);

  const handleAccept = useCallback(async (booking: RentalBookingItem) => {
    setBusyId(booking.id);
    try {
      await rentalService.acceptRental(booking.id);
      refresh();
    } catch (e: any) {
      Alert.alert('Could not accept', e?.message ?? 'Please try again.');
    } finally {
      setBusyId(null);
    }
  }, [qc]);

  const handleDecline = useCallback((booking: RentalBookingItem) => {
    const decline = async (reason: string) => {
      setBusyId(booking.id);
      try {
        await rentalService.declineRental(booking.id, reason);
        refresh();
      } catch (e: any) {
        Alert.alert('Could not decline', e?.message ?? 'Please try again.');
      } finally {
        setBusyId(null);
      }
    };
    Alert.alert('Decline request', 'The renter will see your reason.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Not available', onPress: () => decline('Artwork not available for those dates') },
      { text: 'Too fragile', onPress: () => decline('This piece is not suitable for transport') },
      { text: 'Other', onPress: () => decline('Unable to fulfil this request') },
    ]);
  }, [qc]);

  const handleComplete = useCallback((booking: RentalBookingItem) => {
    // Settling the deposit is the artist's judgement based on the condition
    // report, so the choice is explicit rather than defaulted.
    Alert.alert('Settle deposit', 'How should the security deposit be handled?', [
      { text: 'Cancel', style: 'cancel' },
      ...DEPOSIT_CHOICES.map(choice => ({
        text: choice.label,
        onPress: async () => {
          setBusyId(booking.id);
          try {
            await rentalService.completeRental(booking.id, { depositStatus: choice.value });
            refresh();
          } catch (e: any) {
            Alert.alert('Could not complete', e?.message ?? 'Please try again.');
          } finally {
            setBusyId(null);
          }
        },
      })),
    ]);
  }, [qc]);

  const renderItem = useCallback(({ item }: { item: RentalBookingItem }) => {
    const color = STATUS_COLORS[item.status] ?? Colors.gold;
    const busy = busyId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.head}>
          {item.product?.thumbnailUrl ? (
            <Image source={{ uri: item.product.thumbnailUrl }} style={styles.thumb} contentFit="cover" />
          ) : (
            <View style={[styles.thumb, { backgroundColor: Colors.bgInput }]} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{item.product?.title ?? 'Artwork'}</Text>
            <Text style={styles.meta}>
              {new Date(item.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              {' – '}
              {new Date(item.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              {' · '}{item.days} day{item.days === 1 ? '' : 's'}
            </Text>
          </View>
          <View style={[styles.badge, { borderColor: color, backgroundColor: color + '18' }]}>
            <Text style={[styles.badgeText, { color }]}>{rentalStatusLabel(item.status)}</Text>
          </View>
        </View>

        <View style={styles.amounts}>
          <Text style={styles.amount}>₹{Number(item.rentalAmount).toLocaleString('en-IN')}</Text>
          {item.securityDeposit != null && (
            <Text style={styles.deposit}>
              + ₹{Number(item.securityDeposit).toLocaleString('en-IN')} deposit
            </Text>
          )}
        </View>

        {item.address ? <Text style={styles.meta} numberOfLines={1}>📍 {item.address}</Text> : null}

        {/* Actions follow the server's state machine exactly: dispatch is
            only valid from ACCEPTED, return only from DISPATCHED. */}
        <View style={styles.actions}>
          {item.status === 'PENDING' && (
            <>
              <TouchableOpacity onPress={() => handleDecline(item)} disabled={busy}>
                <Text style={styles.decline}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleAccept(item)} disabled={busy}>
                <Text style={styles.primary}>{busy ? 'Working…' : 'Accept'}</Text>
              </TouchableOpacity>
            </>
          )}
          {item.status === 'ACCEPTED' && (
            <TouchableOpacity onPress={() => runWithPhotos(item, 'dispatch')} disabled={busy}>
              <Text style={styles.primary}>{busy ? 'Uploading…' : 'Dispatch with photos'}</Text>
            </TouchableOpacity>
          )}
          {item.status === 'DISPATCHED' && (
            <TouchableOpacity onPress={() => runWithPhotos(item, 'return')} disabled={busy}>
              <Text style={styles.primary}>{busy ? 'Uploading…' : 'Mark returned'}</Text>
            </TouchableOpacity>
          )}
          {item.status === 'RETURNED' && (
            <TouchableOpacity onPress={() => handleComplete(item)} disabled={busy}>
              <Text style={styles.primary}>{busy ? 'Working…' : 'Settle deposit'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [busyId, handleAccept, handleDecline, handleComplete, runWithPhotos]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rental Requests</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.gold} size="large" /></View>
      ) : (
        <FlatList
          data={rentals}
          keyExtractor={r => r.id}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.gold} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 44 }}>🖼</Text>
              <Text style={styles.emptyTitle}>No rental requests</Text>
              <Text style={styles.emptyText}>
                Requests to rent your artwork will appear here.
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

  card: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  thumb: { width: 48, height: 48, borderRadius: Radius.sm },
  title: { ...Typography.bodySemibold, fontSize: 14 },
  meta: { ...Typography.caption, fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1 },
  badgeText: { ...Typography.label, fontSize: 9 },

  amounts: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm, marginTop: Spacing.sm },
  amount: { ...Typography.bodySemibold, fontSize: 15, color: Colors.gold },
  deposit: { ...Typography.caption, fontSize: 12 },

  actions: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.lg,
    marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm,
  },
  primary: { ...Typography.bodySemibold, fontSize: 13, color: Colors.gold },
  decline: { ...Typography.bodySemibold, fontSize: 13, color: Colors.error },

  empty: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyTitle: { ...Typography.heading, fontSize: 18, marginTop: Spacing.md },
  emptyText: { ...Typography.caption, fontSize: 13, marginTop: 4, textAlign: 'center' },
});
