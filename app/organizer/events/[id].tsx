import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { OrganizerService } from '@/services/organizerService';

const TABS = ['Sales', 'Tiers', 'Attendees'] as const;

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, accent && { color: Colors.gold }]}>{value}</Text>
    </View>
  );
}

/**
 * One organizer event: what sold, at what price, and who is coming.
 */
export default function OrganizerEventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Sales');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['organizer-event', id],
    queryFn: () => OrganizerService.getEventSales(String(id)),
    enabled: !!id,
  });

  const { data: attendees = [], isLoading: attendeesLoading } = useQuery({
    queryKey: ['organizer-attendees', id],
    queryFn: () => OrganizerService.getAttendees(String(id)),
    // Only fetched when the tab is opened; an attendee list can be long.
    enabled: !!id && tab === 'Attendees',
  });

  const handleCancel = useCallback(() => {
    Alert.alert(
      'Cancel event',
      'Ticket holders will need to be refunded. The event stays visible as cancelled.',
      [
        { text: 'Keep event', style: 'cancel' },
        {
          text: 'Cancel event',
          style: 'destructive',
          onPress: async () => {
            try {
              await OrganizerService.cancelEvent(String(id));
              qc.invalidateQueries({ queryKey: ['organizer-event', id] });
              qc.invalidateQueries({ queryKey: ['organizer-events'] });
            } catch (e: any) {
              Alert.alert('Could not cancel', e?.message ?? 'Please try again.');
            }
          },
        },
      ],
    );
  }, [id, qc]);

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.gold} size="large" /></View>;
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Could not load this event.</Text>
        <TouchableOpacity onPress={() => refetch()} style={{ marginTop: Spacing.md }}>
          <Text style={{ color: Colors.gold }}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { event, salesSummary, tierSummary } = data;
  const soldPct = salesSummary.totalCapacity > 0
    ? Math.min(100, (salesSummary.totalTicketsSold / salesSummary.totalCapacity) * 100)
    : 0;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{event.title}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.tabs}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && { color: Colors.gold }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 80 }}>
        {tab === 'Sales' && (
          <>
            <View style={styles.card}>
              <Text style={styles.bigNumber}>
                {salesSummary.totalTicketsSold}
                <Text style={styles.bigNumberMuted}> / {salesSummary.totalCapacity}</Text>
              </Text>
              <Text style={styles.muted}>tickets sold</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${soldPct}%` }]} />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Revenue</Text>
            <View style={styles.card}>
              <Row label="Gross" value={`₹${salesSummary.totalRevenue.toLocaleString('en-IN')}`} />
              {/* Both sides of the split are shown: an organizer needs to see
                  the platform's cut, not just what lands in their account. */}
              <Row label="Platform commission" value={`− ₹${salesSummary.totalCommission.toLocaleString('en-IN')}`} />
              <View style={styles.divider} />
              <Row label="Your payout" value={`₹${salesSummary.totalPayout.toLocaleString('en-IN')}`} accent />
            </View>

            {String(event.status).toUpperCase() !== 'CANCELLED' && (
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                <Text style={styles.cancelText}>Cancel this event</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {tab === 'Tiers' && (
          tierSummary.length === 0 ? (
            <Text style={styles.muted}>No ticket tiers.</Text>
          ) : (
            tierSummary.map(t => (
              <View key={t.tierId} style={styles.card}>
                <View style={styles.tierHead}>
                  <Text style={styles.tierName}>{t.tierName}</Text>
                  <Text style={styles.tierPrice}>₹{t.price.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${t.totalSeats > 0 ? (t.bookedSeats / t.totalSeats) * 100 : 0}%` },
                      t.remainingSeats === 0 && { backgroundColor: Colors.success },
                    ]}
                  />
                </View>
                <Text style={styles.muted}>
                  {t.bookedSeats} sold · {t.remainingSeats === 0 ? 'Sold out' : `${t.remainingSeats} left`}
                  {' · '}₹{(t.bookedSeats * t.price).toLocaleString('en-IN')} earned
                </Text>
              </View>
            ))
          )
        )}

        {tab === 'Attendees' && (
          attendeesLoading ? (
            <ActivityIndicator color={Colors.gold} style={{ marginTop: Spacing.lg }} />
          ) : attendees.length === 0 ? (
            <Text style={styles.muted}>No one has booked yet.</Text>
          ) : (
            attendees.map((a: any, i: number) => (
              <View key={String(a.id ?? i)} style={styles.attendeeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.attendeeName}>
                    {a.user?.name ?? a.attendeeName ?? a.buyer?.name ?? 'Attendee'}
                  </Text>
                  <Text style={styles.muted}>
                    {a.orderRef ?? a.ticketNumber ?? ''}
                    {a.quantity ? ` · ${a.quantity} ticket${a.quantity === 1 ? '' : 's'}` : ''}
                    {a.tierName ? ` · ${a.tierName}` : ''}
                  </Text>
                </View>
                {a.status ? <Text style={styles.attendeeStatus}>{a.status}</Text> : null}
              </View>
            ))
          )
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
  headerTitle: { ...Typography.display, fontSize: 18, flex: 1, textAlign: 'center' },
  center: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },

  tabs: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  tab: {
    paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  tabActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '18' },
  tabText: { ...Typography.caption, fontSize: 12, color: Colors.creamDim },

  card: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  sectionTitle: { ...Typography.label, fontSize: 10, color: Colors.gold, marginTop: Spacing.md, marginBottom: 6 },
  bigNumber: { ...Typography.display, fontSize: 34, color: Colors.gold },
  bigNumberMuted: { ...Typography.display, fontSize: 22, color: Colors.creamDim },
  muted: { ...Typography.caption, fontSize: 12, marginTop: 2 },

  progressTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.border, overflow: 'hidden', marginTop: Spacing.sm },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: Colors.gold },

  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  rowValue: { ...Typography.bodySemibold, fontSize: 14 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },

  tierHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tierName: { ...Typography.bodySemibold, fontSize: 15 },
  tierPrice: { ...Typography.bodySemibold, fontSize: 14, color: Colors.gold },

  attendeeRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  attendeeName: { ...Typography.bodySemibold, fontSize: 14 },
  attendeeStatus: { ...Typography.label, fontSize: 9, color: Colors.gold },

  cancelBtn: {
    marginTop: Spacing.lg, paddingVertical: Spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.error + '66', borderRadius: Radius.md,
  },
  cancelText: { ...Typography.bodySemibold, fontSize: 14, color: Colors.error },
});
