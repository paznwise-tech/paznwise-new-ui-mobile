import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { SeatMap } from '@/components/events/SeatMap';
import {
  EventService, ApiEventDetail, ApiTicketTier, formatEventDate,
  type EventSeat, type EventBookingResult,
} from '@/services/eventService';
import { useRazorpayPayment } from '@/payments/useRazorpayPayment';
import { toPaise } from '@/payments/razorpay';
import { useUser } from '@/context/AppContext';

export default function BookEventTicket() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useUser();

  const [event, setEvent] = useState<ApiEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<ApiTicketTier | null>(null);
  const [quantity, setQuantity] = useState(1);

  const [slots, setSlots] = useState<any[]>([]);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [seats, setSeats] = useState<EventSeat[]>([]);
  const [seatsLoading, setSeatsLoading] = useState(false);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([EventService.getEventById(id), EventService.getEventSlots(id)])
      .then(([e, slotList]) => {
        if (e) {
          setEvent(e);
          if (e.ticketTiers?.length) setSelectedTier(e.ticketTiers[0]);
        }
        setSlots(slotList);
        if (slotList.length > 0) setSlotId(String(slotList[0].id));
      })
      .catch(err => console.warn('[BookEvent]', err))
      .finally(() => setLoading(false));
  }, [id]);

  // Seats are optional: only seat-mapped slots return any, and the screen
  // falls back to a plain quantity picker when there are none.
  const loadSeats = useCallback(async (targetSlotId: string) => {
    setSeatsLoading(true);
    try {
      setSeats(await EventService.getSeats(targetSlotId));
    } catch {
      setSeats([]);
    } finally {
      setSeatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!slotId) return;
    setSelectedSeatIds([]);
    loadSeats(slotId);
  }, [slotId, loadSeats]);

  const seatMapped = seats.length > 0;
  const effectiveQuantity = seatMapped ? selectedSeatIds.length : quantity;

  const total = useMemo(
    () => (selectedTier ? Number(selectedTier.price) * effectiveQuantity : 0),
    [selectedTier, effectiveQuantity],
  );

  const toggleSeat = useCallback((seatId: string) => {
    setSelectedSeatIds(prev =>
      prev.includes(seatId) ? prev.filter(s => s !== seatId) : [...prev, seatId],
    );
  }, []);

  const { pay, processing } = useRazorpayPayment<EventBookingResult>({
    createOrder: async () => {
      if (!event || !slotId) throw new Error('This event has no bookable slot.');

      // Hold the seats first. Between rendering the map and this call
      // someone else may have taken one, which comes back as a 409 naming
      // exactly which — those are dropped from the selection and the map is
      // refreshed rather than retried blind.
      if (seatMapped) {
        try {
          await EventService.lockSeats(slotId, selectedSeatIds);
        } catch (e: any) {
          const taken: string[] = e?.data?.unavailableSeats ?? [];
          if (e?.status === 409) {
            setSelectedSeatIds(prev => prev.filter(s => !taken.includes(s)));
            await loadSeats(slotId);
            throw new Error(
              taken.length
                ? `${taken.length} of your seats were just taken. They have been removed — please pick again.`
                : 'Those seats were just taken. Please pick again.',
            );
          }
          throw e;
        }
      }

      const booking: EventBookingResult = await EventService.bookEvent({
        eventId: String(id),
        slotId,
        ticketTierId: selectedTier?.id,
        seatsBooked: effectiveQuantity,
        seatIds: seatMapped ? selectedSeatIds : undefined,
        totalPrice: total,
      });

      // A free event, or one where Razorpay is not configured, comes back
      // with no order and is settled by /confirm instead.
      if (!booking.razorpayOrderId || !booking.keyId) {
        pendingBookingRef.current = booking;
        return null;
      }

      return {
        razorpayOrderId: booking.razorpayOrderId,
        keyId: booking.keyId,
        amountPaise: toPaise(booking.totalPrice ?? total),
        description: event.title,
        internalId: String(booking.bookingId ?? booking.id),
        prefill: { name: user.name || undefined, email: user.email || undefined },
      };
    },
    verify: async (payment, internalId) =>
      EventService.verifyBookingPayment(String(internalId), {
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: payment.razorpay_payment_id,
        razorpay_signature: payment.razorpay_signature,
      }),
    onFree: async () => {
      const booking = pendingBookingRef.current!;
      await EventService.confirmBooking(String(booking.bookingId ?? booking.id));
      return booking;
    },
    invalidate: [['my-event-bookings']],
    onSuccess: () => {
      router.replace('/event-bookings' as any);
    },
  });

  const pendingBookingRef = useRef<EventBookingResult | null>(null);

  const handleConfirm = useCallback(() => {
    if (!event) return;
    if (!selectedTier && (event.ticketTiers?.length ?? 0) > 0) {
      Alert.alert('Pick a ticket', 'Please select a ticket type.');
      return;
    }
    if (seatMapped && selectedSeatIds.length === 0) {
      Alert.alert('Pick a seat', 'Please select at least one seat.');
      return;
    }
    pay();
  }, [event, selectedTier, seatMapped, selectedSeatIds, pay]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }}>
        <Text style={{ color: Colors.creamDim }}>Event not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: Spacing.md }}>
          <Text style={{ color: Colors.gold }}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const tiers = event.ticketTiers ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Get Tickets</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          {/* Event summary */}
          <View style={styles.eventSummary}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            {event.eventDate && (
              <Text style={styles.eventDate}>
                📅 {formatEventDate(event.eventDate, event.eventEndDate)}
              </Text>
            )}
            {event.venueName && (
              <Text style={styles.eventDate}>🏛️ {event.venueName}</Text>
            )}
          </View>

          {/* Tier selection */}
          {tiers.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Select Ticket Type</Text>
              {tiers.map(tier => {
                const isSelected = selectedTier?.id === tier.id;
                return (
                  <TouchableOpacity
                    key={tier.id}
                    style={[styles.tierCard, isSelected && styles.tierCardActive]}
                    onPress={() => setSelectedTier(tier)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.radioOuter, isSelected && styles.radioOuterActive]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tierName}>{tier.name}</Text>
                      {tier.description ? <Text style={styles.tierDesc}>{tier.description}</Text> : null}
                      {tier.available !== undefined && tier.available <= 10 && (
                        <Text style={styles.tierAvail}>Only {tier.available} left!</Text>
                      )}
                    </View>
                    <Text style={styles.tierPrice}>
                      {tier.price === 0 ? 'Free' : `₹${tier.price.toLocaleString('en-IN')}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </>
          ) : (
            <View style={styles.freeNotice}>
              <Text style={styles.freeNoticeText}>🎟️ This is a free event</Text>
              <Text style={[styles.freeNoticeText, { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 4 }]}>
                Register to confirm your spot
              </Text>
            </View>
          )}

          {/* Slot */}
          {slots.length > 1 && (
            <>
              <Text style={styles.sectionTitle}>Select a Time</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  {slots.map(slot => {
                    const active = slotId === String(slot.id);
                    const full = slot.availableSeats === 0;
                    return (
                      <TouchableOpacity
                        key={slot.id}
                        style={[styles.slotChip, active && styles.slotChipActive, full && styles.slotChipFull]}
                        onPress={() => !full && setSlotId(String(slot.id))}
                        disabled={full}
                      >
                        <Text style={[styles.slotText, active && { color: Colors.gold }]}>
                          {slot.startTime ?? slot.name ?? 'Slot'}
                        </Text>
                        {full && <Text style={styles.slotFullText}>Full</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </>
          )}

          {/* Seats, when this slot is seat-mapped */}
          {seatsLoading ? (
            <View style={{ paddingVertical: Spacing.lg, alignItems: 'center' }}>
              <ActivityIndicator color={Colors.gold} />
            </View>
          ) : seatMapped ? (
            <>
              <Text style={styles.sectionTitle}>Choose Your Seats</Text>
              <SeatMap
                seats={seats}
                selectedIds={selectedSeatIds}
                onToggle={toggleSeat}
                maxSelectable={10}
              />
              <Text style={styles.seatHint}>
                {selectedSeatIds.length === 0
                  ? 'Tap a seat to select it'
                  : `${selectedSeatIds.length} seat${selectedSeatIds.length === 1 ? '' : 's'} selected`}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Number of Tickets</Text>
              <View style={styles.qtyRow}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(q => Math.max(1, q - 1))}>
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyVal}>{quantity}</Text>
                <TouchableOpacity
                  style={[styles.qtyBtn, styles.qtyBtnPlus]}
                  onPress={() => setQuantity(q => Math.min(10, q + 1))}
                >
                  <Text style={[styles.qtyBtnText, { color: Colors.bg }]}>+</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Summary */}
          {(selectedTier || event.isFree) && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>
                  {selectedTier?.name ?? 'General Admission'} × {effectiveQuantity}
                </Text>
                <Text style={styles.summaryVal}>
                  {total === 0 ? 'Free' : `₹${total.toLocaleString('en-IN')}`}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotalKey}>Total</Text>
                <Text style={styles.summaryTotal}>
                  {total === 0 ? 'Free' : `₹${total.toLocaleString('en-IN')}`}
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.cta}>
        <GoldButton
          label={
            processing
              ? 'Processing…'
              : total === 0
                ? `Register · ${effectiveQuantity} ${effectiveQuantity === 1 ? 'ticket' : 'tickets'}`
                : `Pay ₹${total.toLocaleString('en-IN')}`
          }
          onPress={handleConfirm}
          size="lg"
          fullWidth
          disabled={processing || effectiveQuantity === 0}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md, paddingTop: 52,
  },
  backIcon: { color: Colors.gold, fontSize: 22 },
  headerTitle: { ...Typography.heading, fontSize: 20 },
  content: { padding: Spacing.md, gap: Spacing.md },
  eventSummary: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.borderGold, padding: Spacing.md, gap: 4,
  },
  eventTitle: { ...Typography.heading, fontSize: 18 },
  eventDate: { ...Typography.caption, fontSize: 13 },
  sectionTitle: { ...Typography.heading, fontSize: 20, marginTop: Spacing.sm },
  tierCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border, padding: Spacing.md,
  },
  tierCardActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '11' },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterActive: { borderColor: Colors.gold },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.gold },
  tierName: { ...Typography.bodySemibold, fontSize: 15 },
  tierDesc: { ...Typography.caption, fontSize: 12, marginTop: 2 },
  tierAvail: { ...Typography.label, fontSize: 9, color: Colors.warning, marginTop: 4 },
  tierPrice: { ...Typography.display, fontSize: 18, color: Colors.gold },
  freeNotice: {
    backgroundColor: Colors.success + '22', borderWidth: 1, borderColor: Colors.success,
    borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center',
  },
  freeNoticeText: { ...Typography.bodySemibold, fontSize: 16, color: Colors.success },
  slotChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard, alignItems: 'center',
  },
  slotChipActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '18' },
  slotChipFull: { opacity: 0.4 },
  slotText: { ...Typography.bodySemibold, fontSize: 13 },
  slotFullText: { ...Typography.caption, fontSize: 10, color: Colors.error },
  seatHint: { ...Typography.caption, fontSize: 12, textAlign: 'center', marginTop: Spacing.sm },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  qtyBtn: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnPlus: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  qtyBtnText: { ...Typography.bodyBold, fontSize: 22, color: Colors.cream },
  qtyVal: {
    ...Typography.display, fontSize: 28, color: Colors.gold,
    minWidth: 40, textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.borderGold, overflow: 'hidden',
  },
  summaryTitle: {
    ...Typography.heading, fontSize: 18, padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  summaryKey: { ...Typography.caption, fontSize: 13 },
  summaryVal: { ...Typography.bodySemibold, fontSize: 13 },
  summaryDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md, marginVertical: 4 },
  summaryTotalKey: { ...Typography.bodyBold, fontSize: 15 },
  summaryTotal: { ...Typography.display, fontSize: 20, color: Colors.gold },
  cta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.bgElevated, borderTopWidth: 1, borderTopColor: Colors.borderGold,
    padding: Spacing.md, paddingBottom: 28,
  },
});
