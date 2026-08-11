import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import {
  EventService, ApiEventDetail,
  resolveEventImage, getCityName, formatEventDate,
} from '@/services/eventService';

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<ApiEventDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    EventService.getEventById(id)
      .then(e => { if (e) setEvent(e); })
      .catch(err => console.warn('[EventDetail]', err))
      .finally(() => setLoading(false));
  }, [id]);

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
        <Text style={{ color: Colors.creamDim, fontSize: 16, textAlign: 'center' }}>Event not found.</Text>
        <TouchableOpacity style={{ marginTop: Spacing.md }} onPress={() => router.back()}>
          <Text style={{ color: Colors.gold, fontSize: 14 }}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cityName = getCityName(event.city);
  const going = event._count?.attendees ?? event.attendeeCount ?? 0;
  const bannerUri = resolveEventImage(event.bannerImage ?? event.eventImages?.[0]);
  const hasTiers = event.ticketTiers && event.ticketTiers.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Hero */}
        <View style={styles.hero}>
          <Image source={{ uri: bannerUri }} style={styles.heroImg} contentFit="cover" transition={300} />
          <LinearGradient
            colors={['rgba(13,27,42,0.5)', 'transparent', 'rgba(13,27,42,0.92)']}
            style={StyleSheet.absoluteFill}
          />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          {event.category && (
            <View style={styles.catBadge}>
              <Text style={styles.catBadgeText}>{event.category.toUpperCase()}</Text>
            </View>
          )}
          {event.isRegistered && (
            <View style={styles.registeredBadge}>
              <Text style={styles.registeredText}>✓ You're going</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{event.title}</Text>

          {/* Meta chips */}
          <View style={styles.metaGrid}>
            {event.eventDate && (
              <View style={styles.metaChip}>
                <Text style={styles.metaIcon}>📅</Text>
                <Text style={styles.metaLabel}>{formatEventDate(event.eventDate, event.eventEndDate)}</Text>
              </View>
            )}
            {event.startTime && (
              <View style={styles.metaChip}>
                <Text style={styles.metaIcon}>🕐</Text>
                <Text style={styles.metaLabel}>{event.startTime}</Text>
              </View>
            )}
            {cityName ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaIcon}>📍</Text>
                <Text style={styles.metaLabel}>{cityName}</Text>
              </View>
            ) : null}
            {event.venueName && (
              <View style={styles.metaChip}>
                <Text style={styles.metaIcon}>🏛️</Text>
                <Text style={styles.metaLabel}>{event.venueName}</Text>
              </View>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{going}</Text>
              <Text style={styles.statLabel}>Going</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statVal}>
                {event.isFree ? 'Free' : `₹${(event.price ?? 0).toLocaleString('en-IN')}`}
              </Text>
              <Text style={styles.statLabel}>Entry</Text>
            </View>
            {event.capacity ? (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{event.capacity}</Text>
                  <Text style={styles.statLabel}>Capacity</Text>
                </View>
              </>
            ) : null}
          </View>

          {/* Description */}
          {event.description ? (
            <>
              <Text style={styles.sectionTitle}>About This Event</Text>
              <Text style={styles.description}>{event.description}</Text>
            </>
          ) : null}

          {/* Ticket Tiers */}
          {hasTiers && (
            <>
              <Text style={styles.sectionTitle}>Ticket Options</Text>
              {event.ticketTiers!.map(tier => (
                <View key={tier.id} style={styles.tierCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tierName}>{tier.name}</Text>
                    {tier.description ? <Text style={styles.tierDesc}>{tier.description}</Text> : null}
                    {tier.available !== undefined && (
                      <Text style={styles.tierAvail}>{tier.available} spots left</Text>
                    )}
                  </View>
                  <Text style={styles.tierPrice}>
                    {tier.price === 0 ? 'Free' : `₹${tier.price.toLocaleString('en-IN')}`}
                  </Text>
                </View>
              ))}
            </>
          )}

          {/* Organizer */}
          {event.organizer?.name && (
            <>
              <Text style={styles.sectionTitle}>Organizer</Text>
              <View style={styles.organizerRow}>
                {event.organizer.avatar ? (
                  <Image source={{ uri: event.organizer.avatar }} style={styles.orgAvatar} contentFit="cover" />
                ) : (
                  <View style={[styles.orgAvatar, { backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ fontSize: 18 }}>👤</Text>
                  </View>
                )}
                <Text style={styles.orgName}>{event.organizer.name}</Text>
              </View>
            </>
          )}

          {/* Venue */}
          {event.venueAddress && (
            <>
              <Text style={styles.sectionTitle}>Venue</Text>
              <View style={styles.venueCard}>
                {event.venueName ? <Text style={styles.venueName}>{event.venueName}</Text> : null}
                <Text style={styles.venueAddr}>{event.venueAddress}</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.cta}>
        {event.isRegistered ? (
          <View style={styles.goingBanner}>
            <Text style={styles.goingText}>✓ You are registered for this event</Text>
          </View>
        ) : (
          <GoldButton
            label={event.isFree ? 'Register Free' : `Get Tickets · ₹${(event.price ?? 0).toLocaleString('en-IN')}`}
            onPress={() => router.push(`/events/book/${id}` as any)}
            size="lg"
            fullWidth
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 280, position: 'relative' },
  heroImg: { width: '100%', height: '100%' },
  backBtn: {
    position: 'absolute', top: 52, left: Spacing.md,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(13,27,42,0.7)',
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { color: Colors.cream, fontSize: 18 },
  catBadge: {
    position: 'absolute', top: 52, right: Spacing.md,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    backgroundColor: Colors.gold + '22', borderWidth: 1, borderColor: Colors.gold,
    borderRadius: Radius.sm,
  },
  catBadgeText: { ...Typography.label, fontSize: 9, color: Colors.gold },
  registeredBadge: {
    position: 'absolute', bottom: Spacing.md, left: Spacing.md,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    backgroundColor: Colors.success + '33', borderWidth: 1, borderColor: Colors.success,
    borderRadius: Radius.sm,
  },
  registeredText: { ...Typography.label, fontSize: 9, color: Colors.success },
  content: { padding: Spacing.md, gap: Spacing.md },
  title: { ...Typography.display, fontSize: 26 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.border,
  },
  metaIcon: { fontSize: 13 },
  metaLabel: { ...Typography.caption, fontSize: 12 },
  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.borderGold,
    paddingVertical: Spacing.md,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { ...Typography.display, fontSize: 20, color: Colors.gold },
  statLabel: { ...Typography.caption, fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.border },
  sectionTitle: { ...Typography.heading, fontSize: 20 },
  description: { ...Typography.body, fontSize: 15, lineHeight: 24, color: Colors.creamDim },
  tierCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, gap: Spacing.md,
  },
  tierName: { ...Typography.bodySemibold, fontSize: 15 },
  tierDesc: { ...Typography.caption, fontSize: 12, marginTop: 2 },
  tierAvail: { ...Typography.label, fontSize: 9, color: Colors.warning, marginTop: 4 },
  tierPrice: { ...Typography.display, fontSize: 18, color: Colors.gold },
  organizerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  orgAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: Colors.gold },
  orgName: { ...Typography.bodySemibold, fontSize: 16 },
  venueCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: 4,
  },
  venueName: { ...Typography.bodySemibold, fontSize: 15 },
  venueAddr: { ...Typography.caption, fontSize: 13 },
  cta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.bgElevated, borderTopWidth: 1, borderTopColor: Colors.borderGold,
    padding: Spacing.md, paddingBottom: 28,
  },
  goingBanner: {
    backgroundColor: Colors.success + '22', borderWidth: 1, borderColor: Colors.success,
    borderRadius: Radius.full, padding: Spacing.md, alignItems: 'center',
  },
  goingText: { ...Typography.bodySemibold, fontSize: 15, color: Colors.success },
});
