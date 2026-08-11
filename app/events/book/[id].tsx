import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { EventService, ApiEventDetail, ApiTicketTier, formatEventDate } from '@/services/eventService';

export default function BookEventTicket() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<ApiEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<ApiTicketTier | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    EventService.getEventById(id)
      .then(e => {
        if (e) {
          setEvent(e);
          if (e.ticketTiers?.length) setSelectedTier(e.ticketTiers[0]);
        }
      })
      .catch(err => console.warn('[BookEvent]', err))
      .finally(() => setLoading(false));
  }, [id]);

  const total = useMemo(() => {
    if (!selectedTier) return 0;
    return selectedTier.price * quantity;
  }, [selectedTier, quantity]);

  const handleConfirm = useCallback(async () => {
    if (!event || submitting) return;
    if (!selectedTier && !event.isFree) {
      alert('Please select a ticket type');
      return;
    }
    setSubmitting(true);
    try {
      const tierId = selectedTier?.id ?? 'default';
      await EventService.bookEvent(String(id), tierId, quantity);
      alert('Registration successful! Check My Tickets for your ticket.');
      router.push('/event-bookings' as any);
    } catch (e: any) {
      alert(e.message ?? 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [event, selectedTier, quantity, id, submitting]);

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

          {/* Quantity */}
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

          {/* Summary */}
          {(selectedTier || event.isFree) && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>
                  {selectedTier?.name ?? 'General Admission'} × {quantity}
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
            submitting
              ? 'Processing…'
              : event.isFree
              ? `Register · ${quantity} ${quantity === 1 ? 'ticket' : 'tickets'}`
              : `Pay ₹${total.toLocaleString('en-IN')}`
          }
          onPress={handleConfirm}
          size="lg"
          fullWidth
          disabled={submitting}
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
