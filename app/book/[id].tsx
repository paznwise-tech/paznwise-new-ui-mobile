import { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/GoldButton';
import { StarRow } from '@/components/StarRow';
import { useAppData, useBookings } from '@/context/AppContext';

export default function BookDetail() {
  const { id } = useLocalSearchParams();
  const { performers } = useAppData();
  const { addBooking } = useBookings();

  const performer = performers.find(p => p.id === Number(id)) ?? performers[0];

  const [date, setDate]           = useState('');
  const [startTime, setStartTime] = useState('6:00 PM');
  const [duration, setDuration]   = useState('3 hrs');
  const [venue, setVenue]         = useState('');
  const [guests, setGuests]       = useState(50);
  const [notes, setNotes]         = useState('');

  // Extract base fee from performer price string (e.g., "₹8,000+" -> 8000)
  const baseFee = useMemo(() => {
    const num = performer.price.replace(/[^\d]/g, '');
    return num ? parseInt(num, 10) : 5000; // default to 5000 if not parsable
  }, [performer.price]);

  const travelFee = 500;
  const platformFee = Math.round(baseFee * 0.1);
  const totalEstimation = baseFee + travelFee + platformFee;

  const handleConfirmBooking = useCallback(() => {
    if (!date) {
      alert('Please enter a booking date');
      return;
    }
    if (!venue) {
      alert('Please enter a venue or location');
      return;
    }

    addBooking({
      performerId: performer.id,
      performerName: performer.name,
      performerType: performer.type,
      performerImg: performer.img,
      date,
      eventDetails: `${startTime} · ${duration} · ${guests} guests · at ${venue}`,
      price: `₹${totalEstimation.toLocaleString('en-IN')}`,
    });

    alert('Booking request sent successfully!');
    router.push('/my-bookings');
  }, [date, venue, startTime, duration, guests, totalEstimation, performer, addBooking]);

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

          {/* Section: Event Details */}
          <Text style={styles.sectionTitle}>Event Details</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Event Date</Text>
            <TextInput
              value={date} onChangeText={setDate}
              placeholder="DD / MM / YYYY"
              placeholderTextColor={Colors.creamFaint}
              style={styles.input}
            />
          </View>

          <View style={styles.fieldRow}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Start Time</Text>
              <TextInput
                value={startTime}
                onChangeText={setStartTime}
                placeholder="6:00 PM"
                placeholderTextColor={Colors.creamFaint}
                style={styles.input}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Duration</Text>
              <TextInput
                value={duration}
                onChangeText={setDuration}
                placeholder="3 hrs"
                placeholderTextColor={Colors.creamFaint}
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Venue / Location</Text>
            <TextInput
              value={venue}
              onChangeText={setVenue}
              placeholder="Event address or venue name"
              placeholderTextColor={Colors.creamFaint}
              style={styles.input}
            />
          </View>

          {/* Guests */}
          <View style={styles.guestSection}>
            <Text style={styles.fieldLabel}>Estimated Guests</Text>
            <View style={styles.guestRow}>
              <TouchableOpacity style={styles.guestBtn} onPress={() => setGuests(g => Math.max(10, g - 10))}>
                <Text style={styles.guestBtnText}>−</Text>
              </TouchableOpacity>
              <View style={styles.guestBar}>
                <View style={[styles.guestFill, { width: `${Math.min((guests / 200) * 100, 100)}%` }]} />
              </View>
              <TouchableOpacity style={[styles.guestBtn, styles.guestBtnPlus]} onPress={() => setGuests(g => Math.min(200, g + 10))}>
                <Text style={[styles.guestBtnText, { color: Colors.bg }]}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.guestCount}>{guests} guests</Text>
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
            {[
              ['Artist Fee', `₹${baseFee.toLocaleString('en-IN')}`],
              ['Travel & Hospitality', `₹${travelFee.toLocaleString('en-IN')}`],
              ['Platform Fee (10%)', `₹${platformFee.toLocaleString('en-IN')}`],
            ].map(([k, v]) => (
              <View key={k} style={styles.priceRow}>
                <Text style={styles.priceKey}>{k}</Text>
                <Text style={styles.priceVal}>{v}</Text>
              </View>
            ))}
            <View style={styles.priceDivider} />
            <View style={styles.priceRow}>
              <Text style={styles.priceTotalKey}>Total</Text>
              <Text style={styles.priceTotal}>₹{totalEstimation.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.bottomCta}>
        <GoldButton
          label={`Confirm Booking · ₹${totalEstimation.toLocaleString('en-IN')}`}
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
  priceDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md, marginVertical: 4 },
  priceTotalKey: { ...Typography.bodyBold, fontSize: 15 },
  priceTotal: { ...Typography.display, fontSize: 20, color: Colors.gold },
  bottomCta: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.bgElevated, borderTopWidth: 1, borderTopColor: Colors.borderGold, padding: Spacing.md, paddingBottom: 28 },
});
