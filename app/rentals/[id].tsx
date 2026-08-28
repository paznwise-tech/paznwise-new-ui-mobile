import { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import {
  rentalService, CANCELLABLE_RENTAL_STATUSES, rentalStatusLabel,
} from '@/services/rentalService';

const STATUS_COLORS: Record<string, string> = {
  PENDING: Colors.warning, ACCEPTED: Colors.success, DISPATCHED: Colors.gold,
  RETURNED: Colors.gold, COMPLETED: Colors.success,
  DECLINED: Colors.error, CANCELLED: Colors.error,
};

/** What the deposit outcome means to the renter, in their terms. */
const DEPOSIT_LABELS: Record<string, string> = {
  HELD: 'Held until the artwork is returned',
  REFUNDED: 'Refunded in full',
  PARTIALLY_REFUNDED: 'Partially refunded',
  FORFEITED: 'Not refunded',
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function PhotoStrip({ title, urls }: { title: string; urls: string[] }) {
  if (!urls?.length) return null;
  return (
    <>
      <Text style={styles.sectionTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          {urls.map(url => (
            <Image key={url} source={{ uri: url }} style={styles.photo} contentFit="cover" />
          ))}
        </View>
      </ScrollView>
    </>
  );
}

export default function RentalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['rental', id],
    queryFn: () => rentalService.getRentalDetail(String(id)),
    enabled: !!id,
  });

  const handleCancel = useCallback(() => {
    if (!data) return;
    Alert.alert('Cancel rental', 'Withdraw this rental request?', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: async () => {
          try {
            await rentalService.cancelRental(data.id);
            await refetch();
            qc.invalidateQueries({ queryKey: ['my-rentals'] });
          } catch (e: any) {
            Alert.alert('Could not cancel', e?.message ?? 'Please try again.');
          }
        },
      },
    ]);
  }, [data, refetch, qc]);

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.gold} size="large" /></View>;
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Could not load this rental.</Text>
        <TouchableOpacity onPress={() => refetch()} style={{ marginTop: Spacing.md }}>
          <Text style={{ color: Colors.gold }}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const color = STATUS_COLORS[data.status] ?? Colors.gold;
  const canCancel = CANCELLABLE_RENTAL_STATUSES.includes(data.status);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>#{data.bookingRef}</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 60 }}>
        <View style={styles.card}>
          <Text style={[styles.status, { color }]}>{rentalStatusLabel(data.status)}</Text>
          <Text style={styles.productTitle}>{data.product?.title ?? 'Artwork'}</Text>
          {data.artist?.name ? <Text style={styles.muted}>from {data.artist.name}</Text> : null}
          {data.artistDeclineReason ? (
            <Text style={styles.decline}>Declined: {data.artistDeclineReason}</Text>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Rental period</Text>
        <View style={styles.card}>
          <Row
            label="From"
            value={new Date(data.startDate).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          />
          <Row
            label="To"
            value={new Date(data.endDate).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          />
          <Row label="Duration" value={`${data.days} day${data.days === 1 ? '' : 's'}`} />
          {data.address ? <Row label="Delivered to" value={data.address} /> : null}
        </View>

        <Text style={styles.sectionTitle}>Charges</Text>
        <View style={styles.card}>
          <Row label="Daily rate" value={`₹${Number(data.dailyRate).toLocaleString('en-IN')}`} />
          <Row label="Rental" value={`₹${Number(data.rentalAmount).toLocaleString('en-IN')}`} />
          {data.securityDeposit != null && (
            <Row label="Security deposit" value={`₹${Number(data.securityDeposit).toLocaleString('en-IN')}`} />
          )}
          {data.depositStatus ? (
            <Row label="Deposit" value={DEPOSIT_LABELS[data.depositStatus] ?? data.depositStatus} />
          ) : null}
          {data.depositNotes ? <Text style={styles.note}>{data.depositNotes}</Text> : null}
          {data.paymentStatus ? <Row label="Payment" value={data.paymentStatus} /> : null}
        </View>

        {/* Condition reports are the owner's evidence of the artwork's state,
            and the renter's protection against a disputed deposit. */}
        <PhotoStrip title="Condition at dispatch" urls={data.conditionReportBeforeUrls ?? []} />
        <PhotoStrip title="Condition on return" urls={data.conditionReportAfterUrls ?? []} />

        {data.specialNotes ? (
          <>
            <Text style={styles.sectionTitle}>Your notes</Text>
            <View style={styles.card}>
              <Text style={styles.note}>{data.specialNotes}</Text>
            </View>
          </>
        ) : null}

        {canCancel && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelText}>Withdraw this request</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  backIcon: { color: Colors.gold, fontSize: 22 },
  title: { ...Typography.display, fontSize: 18, flex: 1, textAlign: 'center' },
  center: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },

  card: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  sectionTitle: { ...Typography.label, fontSize: 10, color: Colors.gold, marginTop: Spacing.md, marginBottom: 6 },
  status: { ...Typography.label, fontSize: 10 },
  productTitle: { ...Typography.heading, fontSize: 18, marginTop: 4 },
  muted: { ...Typography.caption, fontSize: 13, marginTop: 2 },
  decline: { ...Typography.body, fontSize: 13, color: Colors.error, marginTop: Spacing.sm },
  note: { ...Typography.body, fontSize: 13, color: Colors.creamDim, marginTop: 4, lineHeight: 19 },

  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, gap: Spacing.md },
  rowLabel: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  rowValue: { ...Typography.bodySemibold, fontSize: 13, flexShrink: 1, textAlign: 'right' },

  photo: { width: 96, height: 96, borderRadius: Radius.sm },

  cancelBtn: {
    marginTop: Spacing.lg, paddingVertical: Spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.error + '66', borderRadius: Radius.md,
  },
  cancelText: { ...Typography.bodySemibold, fontSize: 14, color: Colors.error },
});
