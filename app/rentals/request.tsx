import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQueryClient } from '@tanstack/react-query';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { rentalService, type RentalPaymentMethod } from '@/services/rentalService';
import { useDebounced } from '@/hooks/useDebounced';

const DAY_MS = 24 * 60 * 60 * 1000;

function fmt(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Date-only ISO, which is what the server's `Joi.date().iso()` expects. */
function toIso(d: Date): string {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString();
}

/**
 * Request an artwork rental.
 *
 * The previous rentals screen posted `{ productId }` alone — the server
 * requires start and end dates and a payment method, so every request was
 * rejected. Dates are picked here, availability is checked against the
 * chosen range, and the daily rate drives an indicative total.
 */
export default function RequestRental() {
  const { productId, title, dailyRate } = useLocalSearchParams<{
    productId: string;
    title?: string;
    dailyRate?: string;
  }>();
  const qc = useQueryClient();

  const today = useMemo(() => new Date(), []);
  const [start, setStart] = useState<Date>(new Date(today.getTime() + DAY_MS));
  const [end, setEnd] = useState<Date>(new Date(today.getTime() + 4 * DAY_MS));
  const [picking, setPicking] = useState<'start' | 'end' | null>(null);

  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [method, setMethod] = useState<RentalPaymentMethod>('UPI');

  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const rate = Number(dailyRate ?? 0);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS));
  const rentalAmount = rate * days;

  // Re-check when either end of the range settles, not on every tap.
  const rangeKey = useDebounced(`${toIso(start)}|${toIso(end)}`, 400);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    setChecking(true);
    setAvailable(null);
    rentalService
      .checkAvailability(String(productId), toIso(start), toIso(end))
      .then(ok => { if (!cancelled) setAvailable(ok); })
      .catch(() => { if (!cancelled) setAvailable(null); })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey, productId]);

  const onPickDate = useCallback((_: unknown, picked?: Date) => {
    const which = picking;
    setPicking(null);
    if (!picked || !which) return;

    if (which === 'start') {
      setStart(picked);
      // Keep the range valid rather than letting the user submit an
      // end-before-start the server would reject.
      if (picked >= end) setEnd(new Date(picked.getTime() + DAY_MS));
    } else {
      setEnd(picked <= start ? new Date(start.getTime() + DAY_MS) : picked);
    }
  }, [picking, start, end]);

  const handleSubmit = useCallback(async () => {
    if (!productId) return;
    if (available === false) {
      Alert.alert('Not available', 'This artwork is already booked for those dates.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Address needed', 'Please enter where the artwork should be delivered.');
      return;
    }

    setSubmitting(true);
    try {
      const booking = await rentalService.createRental({
        productId: String(productId),
        startDate: toIso(start),
        endDate: toIso(end),
        address: address.trim(),
        specialNotes: notes.trim() || undefined,
        paymentMethod: method,
      });
      qc.invalidateQueries({ queryKey: ['my-rentals'] });
      router.replace(`/rentals/${booking.id}` as any);
    } catch (e: any) {
      Alert.alert('Could not request rental', e?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [productId, available, address, notes, method, start, end, qc]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Rent artwork</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        {title ? <Text style={styles.product} numberOfLines={2}>{title}</Text> : null}

        <Text style={styles.label}>Rental period</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.dateBox} onPress={() => setPicking('start')}>
            <Text style={styles.dateCaption}>From</Text>
            <Text style={styles.dateValue}>{fmt(start)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateBox} onPress={() => setPicking('end')}>
            <Text style={styles.dateCaption}>To</Text>
            <Text style={styles.dateValue}>{fmt(end)}</Text>
          </TouchableOpacity>
        </View>

        {picking && (
          <DateTimePicker
            value={picking === 'start' ? start : end}
            mode="date"
            minimumDate={picking === 'start' ? today : new Date(start.getTime() + DAY_MS)}
            onChange={onPickDate}
          />
        )}

        <View style={styles.availability}>
          {checking ? (
            <Text style={styles.muted}>Checking availability…</Text>
          ) : available === true ? (
            <Text style={styles.available}>✓ Available for these dates</Text>
          ) : available === false ? (
            <Text style={styles.unavailable}>Already booked for these dates</Text>
          ) : null}
        </View>

        {rate > 0 && (
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceKey}>₹{rate.toLocaleString('en-IN')} × {days} day{days === 1 ? '' : 's'}</Text>
              <Text style={styles.priceVal}>₹{rentalAmount.toLocaleString('en-IN')}</Text>
            </View>
            {/* The security deposit is computed server-side from the rate and
                duration, so it is named but not guessed at here. */}
            <Text style={styles.priceNote}>
              A refundable security deposit is added when the request is created, and the
              final amount is confirmed before payment.
            </Text>
          </View>
        )}

        <Text style={styles.label}>Delivery address</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Where should the artwork be delivered?"
          placeholderTextColor={Colors.creamFaint}
          multiline
        />

        <Text style={styles.label}>Notes for the owner (optional)</Text>
        <TextInput
          style={styles.input}
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything they should know?"
          placeholderTextColor={Colors.creamFaint}
          multiline
        />

        <Text style={styles.label}>Payment method</Text>
        <View style={styles.methodRow}>
          {(['UPI', 'CARD', 'NET_BANKING', 'WALLET'] as RentalPaymentMethod[]).map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.methodChip, method === m && styles.methodChipActive]}
              onPress={() => setMethod(m)}
            >
              <Text style={[styles.methodText, method === m && { color: Colors.gold }]}>
                {m.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <GoldButton
          label={submitting ? 'Sending request…' : 'Request rental'}
          onPress={handleSubmit}
          size="lg"
          fullWidth
          disabled={submitting || checking || available === false}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  backIcon: { color: Colors.gold, fontSize: 22 },
  title: { ...Typography.display, fontSize: 20 },

  product: { ...Typography.bodySemibold, fontSize: 15, marginBottom: Spacing.lg },
  label: { ...Typography.label, fontSize: 10, marginBottom: 8, marginTop: Spacing.md },

  dateRow: { flexDirection: 'row', gap: Spacing.sm },
  dateBox: {
    flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    padding: Spacing.md, backgroundColor: Colors.bgCard,
  },
  dateCaption: { ...Typography.caption, fontSize: 10 },
  dateValue: { ...Typography.bodySemibold, fontSize: 14, marginTop: 2 },

  availability: { minHeight: 20, marginTop: Spacing.sm },
  muted: { ...Typography.caption, fontSize: 12 },
  available: { ...Typography.bodySemibold, fontSize: 13, color: Colors.success },
  unavailable: { ...Typography.bodySemibold, fontSize: 13, color: Colors.error },

  priceCard: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.md,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  priceKey: { ...Typography.body, fontSize: 13, color: Colors.creamDim },
  priceVal: { ...Typography.bodySemibold, fontSize: 14 },
  priceNote: { ...Typography.caption, fontSize: 12, lineHeight: 17, marginTop: Spacing.sm },

  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    padding: Spacing.md, minHeight: 64, textAlignVertical: 'top',
    color: Colors.cream, fontFamily: 'Inter_400Regular', fontSize: 14,
    backgroundColor: Colors.bgCard,
  },

  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  methodChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  methodChipActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '18' },
  methodText: { ...Typography.caption, fontSize: 12, color: Colors.creamDim },

  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    padding: Spacing.md, paddingBottom: Spacing.lg,
    backgroundColor: Colors.bg, borderTopWidth: 1, borderTopColor: Colors.border,
  },
});
