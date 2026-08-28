import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { BookingService, CANCELLABLE_BOOKING_STATUSES } from '@/services/bookingService';
import { downloadFileWithAuth } from '@/utils/invoice';

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: Colors.success, ACCEPTED: Colors.success, PENDING: Colors.warning,
  COMPLETED: Colors.gold, CANCELLED: Colors.error, DECLINED: Colors.error,
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function BookingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['service-booking', id],
    queryFn: () => BookingService.getBookingDetail(String(id)),
    enabled: !!id,
  });

  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [busy, setBusy] = useState(false);

  const handleCancel = useCallback(() => {
    if (!data) return;
    Alert.alert('Cancel booking', 'This cannot be undone. Cancel this booking?', [
      { text: 'Keep booking', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await BookingService.cancelBooking(data.id);
            await refetch();
            qc.invalidateQueries({ queryKey: ['my-service-bookings'] });
          } catch (e: any) {
            Alert.alert('Could not cancel', e?.message ?? 'Please try again.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }, [data, refetch, qc]);

  const handleReview = useCallback(async () => {
    if (!data || rating < 1) return;
    setBusy(true);
    try {
      await BookingService.submitReview(data.id, rating, review.trim() || undefined);
      await refetch();
      Alert.alert('Thanks', 'Your review has been submitted.');
    } catch (e: any) {
      Alert.alert('Could not submit review', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }, [data, rating, review, refetch]);

  const handleReceipt = useCallback(async () => {
    if (!data) return;
    setBusy(true);
    try {
      await downloadFileWithAuth(
        BookingService.receiptUrl(data.id),
        `paznwise-booking-${data.bookingRef}.pdf`,
      );
    } catch (e: any) {
      Alert.alert('Could not open receipt', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }, [data]);

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.gold} size="large" /></View>;
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Could not load this booking.</Text>
        <TouchableOpacity onPress={() => refetch()} style={{ marginTop: Spacing.md }}>
          <Text style={{ color: Colors.gold }}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const color = STATUS_COLORS[data.status] ?? Colors.gold;
  const canCancel = CANCELLABLE_BOOKING_STATUSES.includes(data.status);
  // A review only makes sense once the work has happened, and only once.
  const canReview = data.status === 'COMPLETED' && !data.review;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{data.bookingRef}</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 60 }}>
        <View style={styles.card}>
          <Text style={[styles.status, { color }]}>{data.status}</Text>
          <Text style={styles.serviceTitle}>{data.service?.title ?? 'Service booking'}</Text>
          {data.artist?.name ? <Text style={styles.muted}>with {data.artist.name}</Text> : null}
          {data.artistDeclineReason ? (
            <Text style={styles.decline}>Declined: {data.artistDeclineReason}</Text>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Schedule</Text>
        <View style={styles.card}>
          <Row
            label="Date"
            value={new Date(data.bookingDate).toLocaleDateString('en-IN', {
              weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
            })}
          />
          <Row label="Time" value={`${data.startTime}–${data.endTime}`} />
          {data.hours > 0 ? <Row label="Duration" value={`${data.hours} hr${data.hours === 1 ? '' : 's'}`} /> : null}
          {data.address ? <Row label="Location" value={data.address} /> : null}
          {data.specialNotes ? <Row label="Notes" value={data.specialNotes} /> : null}
        </View>

        <Text style={styles.sectionTitle}>Payment</Text>
        <View style={styles.card}>
          <Row label="Total" value={`₹${data.totalAmount.toLocaleString('en-IN')}`} />
          {data.paymentStatus ? <Row label="Status" value={data.paymentStatus} /> : null}
        </View>

        {data.review ? (
          <>
            <Text style={styles.sectionTitle}>Your review</Text>
            <View style={styles.card}>
              <Text style={styles.stars}>{'★'.repeat(data.review.rating)}</Text>
              {data.review.review ? <Text style={styles.muted}>{data.review.review}</Text> : null}
            </View>
          </>
        ) : null}

        {canReview && (
          <>
            <Text style={styles.sectionTitle}>Rate this booking</Text>
            <View style={styles.card}>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map(n => (
                  <TouchableOpacity key={n} onPress={() => setRating(n)} hitSlop={6}>
                    <Text style={[styles.star, n <= rating && styles.starOn]}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.input}
                value={review}
                onChangeText={setReview}
                placeholder="How did it go? (optional)"
                placeholderTextColor={Colors.creamFaint}
                multiline
              />
              <GoldButton
                label={busy ? 'Submitting…' : 'Submit review'}
                onPress={handleReview}
                size="md"
                fullWidth
                disabled={busy || rating < 1}
              />
            </View>
          </>
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleReceipt} disabled={busy}>
            <Text style={styles.actionText}>Download receipt</Text>
          </TouchableOpacity>
          {canCancel && (
            <TouchableOpacity style={styles.actionBtn} onPress={handleCancel} disabled={busy}>
              <Text style={[styles.actionText, { color: Colors.error }]}>Cancel booking</Text>
            </TouchableOpacity>
          )}
        </View>
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
  serviceTitle: { ...Typography.heading, fontSize: 18, marginTop: 4 },
  muted: { ...Typography.caption, fontSize: 13, marginTop: 2 },
  decline: { ...Typography.body, fontSize: 13, color: Colors.error, marginTop: Spacing.sm },

  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, gap: Spacing.md },
  rowLabel: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  rowValue: { ...Typography.bodySemibold, fontSize: 13, flexShrink: 1, textAlign: 'right' },

  starRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  star: { fontSize: 32, color: Colors.border },
  starOn: { color: Colors.gold },
  stars: { fontSize: 18, color: Colors.gold },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    padding: Spacing.sm, minHeight: 70, textAlignVertical: 'top',
    color: Colors.cream, fontFamily: 'Inter_400Regular', fontSize: 13,
    marginBottom: Spacing.md,
  },

  actions: {
    marginTop: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, overflow: 'hidden', backgroundColor: Colors.bgCard,
  },
  actionBtn: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  actionText: { ...Typography.bodySemibold, fontSize: 14, color: Colors.gold },
});
