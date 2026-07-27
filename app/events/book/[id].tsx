import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { eventService } from '@/services/eventService';
import type { Event } from '@/types';

export default function BookEventScreen() {
  const { id, seats } = useLocalSearchParams<{ id: string; seats?: string }>();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [event, setEvent] = useState<Event | any>(null);

  const numSeats = parseInt(seats || '1', 10);

  // Attendee info form
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [attendeePhone, setAttendeePhone] = useState('');

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    if (!id) return;
    try {
      const data = await eventService.getEventById(id);
      setEvent(data);
    } catch (err: any) {
      console.warn('[BookEvent] Error fetching event:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!attendeeName.trim() || !attendeeEmail.trim() || !attendeePhone.trim()) {
      Alert.alert('Required Info', 'Please fill in attendee name, email, and phone number.');
      return;
    }

    setBooking(true);
    try {
      const res = await eventService.bookEvent({
        eventId: id || '',
        seatsBooked: numSeats,
      });

      const bookingId = res.bookingId || res.id || res.data?.id || 'temp';
      if (bookingId && bookingId !== 'temp') {
        await eventService.confirmBooking(bookingId);
      }

      Alert.alert('Tickets Confirmed! 🎟️', 'Your event tickets have been booked successfully.', [
        {
          text: 'View My Tickets',
          onPress: () => router.replace('/profile/event-bookings' as any),
        },
      ]);
    } catch (err: any) {
      console.error('[BookEvent] Booking error:', err);
      Alert.alert('Booking Error', err.message || 'Failed to complete ticket reservation.');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.gold} />
        <Text style={styles.loadingText}>Preparing Booking...</Text>
      </SafeAreaView>
    );
  }

  const eventPrice = typeof event?.price === 'number' ? event.price : parseFloat(event?.price || '0');
  const totalPrice = eventPrice * numSeats;

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Event Ticket</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Event Summary Card */}
        <LinearGradient colors={['#1C2F45', '#152236']} style={styles.summaryCard}>
          <Text style={styles.eventTitle}>{event?.title}</Text>
          <Text style={styles.eventSub}>📅 {event?.date} • 📍 {event?.city || event?.location || 'Venue'}</Text>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Pass Quantity</Text>
            <Text style={styles.rowVal}>{numSeats} Ticket{numSeats > 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Price per Ticket</Text>
            <Text style={styles.rowVal}>{eventPrice === 0 ? 'Free' : `₹${eventPrice.toLocaleString('en-IN')}`}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.totalKey}>Grand Total</Text>
            <Text style={styles.totalVal}>{totalPrice === 0 ? 'FREE' : `₹${totalPrice.toLocaleString('en-IN')}`}</Text>
          </View>
        </LinearGradient>

        {/* Attendee Details Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Primary Attendee Info</Text>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor={Colors.creamDim}
            value={attendeeName}
            onChangeText={setAttendeeName}
          />
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor={Colors.creamDim}
            keyboardType="email-address"
            autoCapitalize="none"
            value={attendeeEmail}
            onChangeText={setAttendeeEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Mobile Phone Number"
            placeholderTextColor={Colors.creamDim}
            keyboardType="phone-pad"
            value={attendeePhone}
            onChangeText={setAttendeePhone}
          />
        </View>

        <Text style={styles.noteText}>
          🔒 Your ticket confirmation QR code will be delivered instantly to your registered email and stored under My Tickets.
        </Text>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <GoldButton
          label={booking ? 'Processing...' : 'Confirm Ticket Reservation'}
          onPress={handleConfirmBooking}
          disabled={booking}
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...Typography.bodySemibold,
    color: Colors.cream,
    marginTop: Spacing.md,
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
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  summaryCard: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gold + '44',
    marginBottom: Spacing.md,
  },
  eventTitle: {
    ...Typography.display,
    fontSize: 18,
    color: Colors.cream,
    marginBottom: 2,
  },
  eventSub: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.creamDim,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  rowLabel: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.creamDim,
  },
  rowVal: {
    ...Typography.bodySemibold,
    fontSize: 13,
    color: Colors.cream,
  },
  totalKey: {
    ...Typography.bodyBold,
    fontSize: 15,
    color: Colors.cream,
  },
  totalVal: {
    ...Typography.display,
    fontSize: 18,
    color: Colors.gold,
  },
  formCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  formTitle: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: Colors.cream,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.bgInput,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    ...Typography.body,
    fontSize: 14,
    color: Colors.cream,
  },
  noteText: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.creamDim,
    textAlign: 'center',
    lineHeight: 18,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.md,
  },
});
