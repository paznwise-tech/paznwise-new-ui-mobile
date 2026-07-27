import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { eventService } from '@/services/eventService';
import type { Event } from '@/types';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | any>(null);
  const [seats, setSeats] = useState(1);

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    if (!id) return;
    try {
      const data = await eventService.getEventById(id);
      setEvent(data);
    } catch (err: any) {
      console.warn('[EventDetail] Error fetching event:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBookTicket = () => {
    if (!event) return;
    router.push({
      pathname: '/events/book/[id]' as any,
      params: { id: (event.id || id).toString(), seats: seats.toString() },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.gold} />
        <Text style={styles.loadingText}>Loading Event Details...</Text>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>Event details not found.</Text>
        <TouchableOpacity style={styles.backBtnAction} onPress={() => router.back()}>
          <Text style={styles.backBtnActionText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const imgUrl = event.img || event.bannerImage || event.imageUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=400&fit=crop';
  const eventPrice = typeof event.price === 'number' ? event.price : parseFloat(event.price || '0');

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {event.title}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Banner */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: imgUrl }} style={styles.bannerImage} contentFit="cover" />
          <LinearGradient colors={['transparent', Colors.bg]} style={styles.gradientOverlay} />
        </View>

        {/* Info Content */}
        <View style={styles.infoCard}>
          <View style={styles.badgeRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{event.category || 'Live Art & Music'}</Text>
            </View>
            {event.going && (
              <Text style={styles.goingText}>🔥 {event.going} people attending</Text>
            )}
          </View>

          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventPriceText}>
            {eventPrice === 0 ? 'FREE ADMISSION' : `₹${eventPrice.toLocaleString('en-IN')} / Ticket`}
          </Text>

          {/* Date & Location Grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailBox}>
              <Text style={styles.detailIcon}>📅</Text>
              <View>
                <Text style={styles.detailLabel}>Date & Time</Text>
                <Text style={styles.detailValue}>{event.date || 'Upcoming Weekend'}</Text>
              </View>
            </View>

            <View style={styles.detailBox}>
              <Text style={styles.detailIcon}>📍</Text>
              <View>
                <Text style={styles.detailLabel}>Location / Venue</Text>
                <Text style={styles.detailValue}>{event.city || event.location || 'Bangalore Art Center'}</Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.sectionHeader}>About Event</Text>
          <Text style={styles.descriptionText}>
            {event.description ||
              'Experience an intimate live art gallery, live music performances, and interactive workshops with master artists. Network with fellow collectors and art enthusiasts.'}
          </Text>

          {/* Seat Counter */}
          <Text style={[styles.sectionHeader, { marginTop: Spacing.md }]}>Select Quantity</Text>
          <View style={styles.seatSelector}>
            <Text style={styles.seatLabel}>Number of Passes</Text>
            <View style={styles.counterRow}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setSeats((s) => Math.max(1, s - 1))}
              >
                <Text style={styles.counterBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.seatCount}>{seats}</Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setSeats((s) => Math.min(10, s + 1))}
              >
                <Text style={styles.counterBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total ({seats} Ticket{seats > 1 ? 's' : ''})</Text>
          <Text style={styles.totalPrice}>
            {eventPrice === 0 ? 'FREE' : `₹${(eventPrice * seats).toLocaleString('en-IN')}`}
          </Text>
        </View>
        <GoldButton label="Book Event Pass" onPress={handleBookTicket} size="lg" />
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
  errorText: {
    ...Typography.bodyBold,
    color: Colors.error,
    marginBottom: Spacing.md,
  },
  backBtnAction: {
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
  },
  backBtnActionText: {
    ...Typography.bodyBold,
    color: '#0D1B2A',
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
    fontSize: 16,
    color: Colors.cream,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.xs,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  imageContainer: {
    position: 'relative',
    height: 240,
    width: '100%',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  infoCard: {
    paddingHorizontal: Spacing.md,
    marginTop: -20,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  categoryBadge: {
    backgroundColor: Colors.gold + '22',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  categoryText: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.gold,
    fontWeight: '700',
  },
  goingText: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.creamDim,
  },
  eventTitle: {
    ...Typography.display,
    fontSize: 22,
    color: Colors.cream,
    marginBottom: 4,
  },
  eventPriceText: {
    ...Typography.bodyBold,
    fontSize: 18,
    color: Colors.gold,
    marginBottom: Spacing.md,
  },
  detailsGrid: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  detailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  detailIcon: {
    fontSize: 22,
  },
  detailLabel: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.creamDim,
  },
  detailValue: {
    ...Typography.bodySemibold,
    fontSize: 13,
    color: Colors.cream,
    marginTop: 2,
  },
  sectionHeader: {
    ...Typography.bodyBold,
    fontSize: 15,
    color: Colors.cream,
    marginBottom: Spacing.xs,
  },
  descriptionText: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.creamDim,
    lineHeight: 20,
  },
  seatSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  seatLabel: {
    ...Typography.bodySemibold,
    fontSize: 13,
    color: Colors.cream,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0D1B2A',
  },
  seatCount: {
    ...Typography.bodyBold,
    fontSize: 16,
    color: Colors.cream,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  totalBox: {},
  totalLabel: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.creamDim,
  },
  totalPrice: {
    ...Typography.display,
    fontSize: 18,
    color: Colors.gold,
  },
});
