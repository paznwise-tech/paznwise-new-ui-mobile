import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

export default function BookingConfirmed() {
  const { performerName, bookingId, date, venue, amount } = useLocalSearchParams<{
    performerName?: string;
    bookingId?: string;
    date?: string;
    venue?: string;
    amount?: string;
  }>();

  const id = bookingId ?? `BK-${Math.floor(10000 + Math.random() * 90000)}`;
  const name = performerName ?? 'Performer';

  const rows: [string, string][] = [
    ['Booking ID', `#${id}`],
    ['Performer', name],
    ...(date ? [['Date', date] as [string, string]] : []),
    ...(venue ? [['Venue', venue] as [string, string]] : []),
    ...(amount ? [['Estimated Total', `₹${parseInt(amount).toLocaleString('en-IN')}`] as [string, string]] : []),
    ['Status', 'Pending Confirmation'],
    ['Payment', 'Due on confirmation'],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 60 }}>

        <View style={styles.successHero}>
          <LinearGradient colors={[Colors.gold + '44', Colors.gold + '11']} style={styles.checkCircle}>
            <Text style={styles.checkIcon}>✓</Text>
          </LinearGradient>
          <Text style={styles.successTitle}>Booking Confirmed!</Text>
          <Text style={styles.successSub}>
            Your booking request has been sent to {name}. You'll receive a confirmation within 24 hours.
          </Text>
        </View>

        <LinearGradient colors={['#1C2F45', '#152236']} style={styles.detailCard}>
          <View style={styles.goldLine} />
          {rows.map(([k, v]) => (
            <View key={k} style={styles.detailRow}>
              <Text style={styles.detailKey}>{k}</Text>
              <Text style={[styles.detailVal, k === 'Status' && { color: '#F6A723' }]}>{v}</Text>
            </View>
          ))}
        </LinearGradient>

        <View style={styles.nextCard}>
          <Text style={styles.nextTitle}>What happens next?</Text>
          {[
            `${name} will review your request within 24 hours.`,
            "You'll get a push notification and email with their response.",
            'Payment is collected only after the performer confirms.',
          ].map((s, i) => (
            <View key={i} style={styles.nextItem}>
              <View style={styles.stepDot}><Text style={styles.stepDotText}>{i + 1}</Text></View>
              <Text style={styles.nextText}>{s}</Text>
            </View>
          ))}
        </View>

        <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/booking/my-bookings' as any)}>
            <Text style={styles.primaryBtnText}>View My Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/messages' as any)}>
            <Text style={styles.secondaryBtnText}>💬 Message {name}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => router.replace('/(tabs)' as any)}>
            <Text style={styles.ghostBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  successHero: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.md },
  checkCircle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.gold },
  checkIcon: { fontSize: 40, color: Colors.gold, fontWeight: '700' },
  successTitle: { ...Typography.display, fontSize: 28 },
  successSub: { ...Typography.body, fontSize: 14, color: Colors.creamDim, textAlign: 'center', lineHeight: 20, paddingHorizontal: Spacing.md },
  detailCard: { borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderGold, gap: Spacing.sm, marginBottom: Spacing.lg },
  goldLine: { width: 32, height: 2, backgroundColor: Colors.gold, marginBottom: Spacing.xs },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  detailKey: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  detailVal: { ...Typography.bodySemibold, fontSize: 13, color: Colors.cream, flex: 1, textAlign: 'right', marginLeft: Spacing.md },
  nextCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: Spacing.md, marginBottom: Spacing.lg },
  nextTitle: { ...Typography.heading, fontSize: 18 },
  nextItem: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.gold + '22', borderWidth: 1, borderColor: Colors.borderGold, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  stepDotText: { ...Typography.label, fontSize: 10, color: Colors.gold },
  nextText: { ...Typography.body, fontSize: 13, color: Colors.creamDim, flex: 1, lineHeight: 19 },
  primaryBtn: { backgroundColor: Colors.gold, borderRadius: Radius.full, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { ...Typography.bodyBold, fontSize: 15, color: Colors.bg },
  secondaryBtn: { backgroundColor: Colors.bgCard, borderRadius: Radius.full, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  secondaryBtnText: { ...Typography.bodySemibold, fontSize: 15, color: Colors.cream },
  ghostBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  ghostBtnText: { ...Typography.bodySemibold, fontSize: 14, color: Colors.gold },
});
