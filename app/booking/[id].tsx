import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { StarRow } from '@/components/ui/StarRow';
import { ArtistServiceApi } from '@/services/artistService';
import {
  BookingService, type ServiceSlot, type ServiceBookingResult,
} from '@/services/bookingService';
import { useRazorpayPayment } from '@/payments/useRazorpayPayment';
import { toPaise } from '@/payments/razorpay';
import { useUser } from '@/context/AppContext';
import { Performer } from '@/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatSlotDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export default function BookDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useUser();

  const [performer, setPerformer] = useState<(Performer & { serviceId: string }) | null>(null);
  const [loading, setLoading]     = useState(true);

  // Slots are the artist's actual availability. The date and time used to be
  // free-text fields defaulting to '6:00 PM' and '3 hrs', so a booking could
  // be requested for a time the artist had never offered.
  const [slots, setSlots]         = useState<ServiceSlot[]>([]);
  const [slotId, setSlotId]       = useState<string | null>(null);
  const [venue, setVenue]         = useState('');
  const [notes, setNotes]         = useState('');

  useEffect(() => {
    if (!id) return;
    ArtistServiceApi.getServiceById(String(id))
      .then(async s => {
        if (!s) return;
        setPerformer(s);
        const list = await BookingService.getServiceSlots(s.serviceId).catch(() => []);
        setSlots(list);
        const firstOpen = list.find(sl => !sl.isFull);
        if (firstOpen) setSlotId(firstOpen.id);
      })
      .catch(err => console.warn('[BookDetail] load error:', err))
      .finally(() => setLoading(false));
  }, [id]);

  const selectedSlot = useMemo(() => slots.find(s => s.id === slotId) ?? null, [slots, slotId]);

  // Indicative only — the server recomputes the amount, including its
  // commission split, when the booking is created.
  const baseFee = useMemo(() => {
    if (!performer) return 0;
    const num = performer.price.replace(/[^\d]/g, '');
    return num ? parseInt(num, 10) : 0;
  }, [performer]);

  const { pay, processing } = useRazorpayPayment<ServiceBookingResult>({
    createOrder: async () => {
      if (!performer || !selectedSlot) throw new Error('Pick a time slot to continue.');

      const booking = await BookingService.bookService({
        serviceId: performer.serviceId,
        slotId: selectedSlot.id,
        bookingDate: selectedSlot.date,
        address: venue.trim() || undefined,
        specialNotes: notes.trim() || undefined,
        paymentMethod: 'UPI',
      });

      pendingBookingRef.current = booking;

      if (!booking.razorpayOrderId || !booking.keyId) return null;

      return {
        razorpayOrderId: booking.razorpayOrderId,
        keyId: booking.keyId,
        amountPaise: toPaise(booking.totalAmount),
        description: performer.name,
        internalId: booking.id,
        prefill: { name: user.name || undefined, email: user.email || undefined },
      };
    },
    verify: async (payment, internalId) =>
      BookingService.verifyPayment(String(internalId), {
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: payment.razorpay_payment_id,
        razorpay_signature: payment.razorpay_signature,
      }),
    // No gateway configured: the request still stands and the artist is
    // notified — it just waits on payment being arranged another way.
    onFree: async () => pendingBookingRef.current!,
    invalidate: [['my-service-bookings']],
    onSuccess: booking => {
      router.replace({
        pathname: '/booking/confirmed',
        params: {
          performerName: performer?.name ?? '',
          bookingId: booking.bookingRef,
          date: selectedSlot ? formatSlotDate(selectedSlot.date) : '',
          venue,
          amount: String(booking.totalAmount ?? 0),
        },
      } as any);
    },
  });

  const pendingBookingRef = useRef<ServiceBookingResult | null>(null);

  const handleConfirmBooking = useCallback(() => {
    if (!selectedSlot) { Alert.alert('Pick a time', 'Please select an available slot.'); return; }
    if (!venue.trim()) { Alert.alert('Venue needed', 'Please enter the event address or venue.'); return; }
    pay();
  }, [selectedSlot, venue, pay]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  if (!performer) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }}>
        <Text style={{ color: Colors.creamDim, fontSize: 16, textAlign: 'center' }}>
          Performer not found.
        </Text>
        <TouchableOpacity style={{ marginTop: Spacing.md }} onPress={() => router.back()}>
          <Text style={{ color: Colors.gold, fontSize: 14 }}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Hero */}
        <View style={styles.heroWrap}>
          <Image source={{ uri: performer.img }} style={styles.heroImg} contentFit="cover" />
          <LinearGradient colors={['rgba(13,27,42,0.5)', 'transparent', 'rgba(13,27,42,0.6)']} style={StyleSheet.absoluteFill} />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{performer.type}</Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Performer info */}
          <View style={styles.performerStrip}>
            <Image source={{ uri: performer.img }} style={styles.performerAvatar} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <Text style={styles.performerName}>{performer.name}</Text>
              <StarRow rating={performer.rating} count={performer.reviews} />
            </View>
            <Text style={styles.price}>{performer.price}</Text>
          </View>

          <Text style={styles.sectionTitle}>Event Details</Text>

          {/* Availability */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Available Slots</Text>
            {slots.length === 0 ? (
              <Text style={styles.noSlots}>
                This artist has not published any availability yet. Try again later or message them.
              </Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  {slots.map(slot => {
                    const active = slotId === slot.id;
                    return (
                      <TouchableOpacity
                        key={slot.id}
                        style={[
                          styles.slotChip,
                          active && styles.slotChipActive,
                          slot.isFull && styles.slotChipFull,
                        ]}
                        onPress={() => !slot.isFull && setSlotId(slot.id)}
                        disabled={slot.isFull}
                      >
                        <Text style={[styles.slotDate, active && { color: Colors.gold }]}>
                          {formatSlotDate(slot.date)}
                        </Text>
                        <Text style={styles.slotTime}>
                          {slot.startTime}–{slot.endTime}
                        </Text>
                        {slot.isFull && <Text style={styles.slotFull}>Full</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Venue / Location</Text>
            <TextInput
              value={venue} onChangeText={setVenue}
              placeholder="Event address or venue name"
              placeholderTextColor={Colors.creamFaint}
              style={styles.input}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Additional Notes</Text>
            <TextInput
              value={notes} onChangeText={setNotes}
              placeholder="Theme, special requirements, audience type…"
              placeholderTextColor={Colors.creamFaint}
              multiline numberOfLines={3}
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            />
          </View>

          {/* Price breakdown */}
          <View style={styles.priceCard}>
            <View style={styles.priceCardHeader}>
              <Text style={styles.priceCardTitle}>Price Estimate</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceKey}>Artist rate</Text>
              <Text style={styles.priceVal}>
                {baseFee > 0 ? `₹${baseFee.toLocaleString('en-IN')}` : performer.price}
              </Text>
            </View>
            <View style={styles.priceDivider} />
            <Text style={styles.priceNote}>
              The final amount, including any platform fee, is calculated when your
              request is submitted and shown before you pay.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.bottomCta}>
        <GoldButton
          label={processing ? 'Processing…' : 'Request Booking'}
          onPress={handleConfirmBooking}
          size="lg"
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: { height: 260, position: 'relative' },
  heroImg: { width: '100%', height: '100%' },
  backBtn: { position: 'absolute', top: 52, left: Spacing.md, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(13,27,42,0.7)', alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: Colors.cream, fontSize: 18 },
  typeBadge: { position: 'absolute', top: 52, right: Spacing.md, paddingHorizontal: Spacing.sm, paddingVertical: 4, backgroundColor: Colors.gold + '22', borderWidth: 1, borderColor: Colors.gold, borderRadius: Radius.sm },
  typeBadgeText: { ...Typography.label, fontSize: 9, color: Colors.gold },
  content: { padding: Spacing.md, gap: Spacing.md },
  performerStrip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  performerAvatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: Colors.gold },
  performerName: { ...Typography.heading, fontSize: 18, marginBottom: 4 },
  price: { ...Typography.display, fontSize: 18, color: Colors.gold },
  sectionTitle: { ...Typography.heading, fontSize: 20, marginTop: Spacing.sm },
  slotChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard, alignItems: 'center',
  },
  slotChipActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '18' },
  slotChipFull: { opacity: 0.4 },
  slotDate: { ...Typography.bodySemibold, fontSize: 13 },
  slotTime: { ...Typography.caption, fontSize: 11, marginTop: 2 },
  slotFull: { ...Typography.caption, fontSize: 10, color: Colors.error, marginTop: 2 },
  noSlots: { ...Typography.body, fontSize: 13, color: Colors.creamDim, lineHeight: 19 },
  fieldGroup: { gap: Spacing.xs },
  fieldRow: { flexDirection: 'row', gap: Spacing.sm },
  fieldLabel: { ...Typography.label, fontSize: 9, color: Colors.creamDim },
  input: { backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, ...Typography.body, fontSize: 14, color: Colors.cream },
  guestSection: { gap: Spacing.sm },
  guestRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  guestBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' },
  guestBtnPlus: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  guestBtnText: { ...Typography.bodyBold, fontSize: 18, color: Colors.cream },
  guestBar: { flex: 1, height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
  guestFill: { height: '100%', backgroundColor: Colors.gold, borderRadius: 2 },
  guestCount: { ...Typography.bodySemibold, fontSize: 14, color: Colors.gold },
  priceCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.borderGold, overflow: 'hidden' },
  priceCardHeader: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  priceCardTitle: { ...Typography.heading, fontSize: 18 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  priceKey: { ...Typography.caption, fontSize: 13 },
  priceVal: { ...Typography.bodySemibold, fontSize: 13 },
  priceNote: { ...Typography.caption, fontSize: 12, lineHeight: 17, marginTop: Spacing.sm },
  priceDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md, marginVertical: 4 },
  priceTotalKey: { ...Typography.bodyBold, fontSize: 15 },
  priceTotal: { ...Typography.display, fontSize: 20, color: Colors.gold },
  bottomCta: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.bgElevated, borderTopWidth: 1, borderTopColor: Colors.borderGold, padding: Spacing.md, paddingBottom: 28 },
});
