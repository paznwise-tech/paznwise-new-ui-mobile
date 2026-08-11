import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

const TIMELINE = [
  { label: 'Submitted', detail: 'Application received', done: true },
  { label: 'Fee Verified', detail: '₹499 confirmed', done: true },
  { label: 'Under Curation Review', detail: 'Being reviewed by our team', done: false, active: true },
  { label: 'Approved & Live', detail: 'Est. 24–48 hours', done: false },
];

export default function SellPending() {
  const { submissionId, artworkTitle } = useLocalSearchParams<{ submissionId?: string; artworkTitle?: string }>();
  const id = submissionId ?? `ART-${Date.now().toString().slice(-8)}`;

  const detailRows: [string, string, boolean?][] = [
    ['Submission ID', `#${id}`],
    ['Status', 'Under Review', true],
    ['Registration Fee', '₹499 · Paid'],
    ['Estimated Approval', 'Within 24–48 hours'],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)' as any)}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Under Review</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 60, gap: Spacing.xl }}>

        {/* Status hero */}
        <View style={styles.statusHero}>
          <View style={styles.clockWrap}>
            <Text style={styles.clockIcon}>⏳</Text>
          </View>
          <Text style={styles.statusTitle}>Pending Admin Review</Text>
          {artworkTitle ? <Text style={styles.artworkTitle}>"{artworkTitle}"</Text> : null}
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>Under Review</Text>
          </View>
        </View>

        {/* Submission details */}
        <LinearGradient colors={['#1C3A58', '#0D1B2A']} style={styles.detailCard}>
          <View style={styles.detailGoldLine} />
          {detailRows.map(([k, v, orange]) => (
            <View key={k} style={styles.detailRow}>
              <Text style={styles.detailKey}>{k}</Text>
              <Text style={[styles.detailVal, orange && { color: '#F6A723' }]}>{v}</Text>
            </View>
          ))}
        </LinearGradient>

        {/* Timeline */}
        <View>
          <Text style={styles.sectionTitle}>Approval Timeline</Text>
          <View>
            {TIMELINE.map((step, i) => (
              <View key={step.label} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[
                    styles.timelineDot,
                    step.done && styles.timelineDotDone,
                    step.active && styles.timelineDotActive,
                  ]}>
                    {step.done
                      ? <Text style={styles.timelineCheck}>✓</Text>
                      : step.active
                        ? <View style={styles.timelineLiveDot} />
                        : null}
                  </View>
                  {i < TIMELINE.length - 1 && (
                    <View style={[styles.timelineLine, step.done && styles.timelineLineDone]} />
                  )}
                </View>
                <View style={styles.timelineBody}>
                  <View style={styles.timelineLabelRow}>
                    <Text style={[styles.timelineLabel, step.active && { color: Colors.cream }]}>{step.label}</Text>
                    {step.active && <View style={styles.livePill}><Text style={styles.livePillText}>LIVE</Text></View>}
                  </View>
                  <Text style={styles.timelineDetail}>{step.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* What happens next */}
        <View style={styles.nextCard}>
          <Text style={styles.nextTitle}>What happens next?</Text>
          {[
            "You'll receive an email notification once reviewed.",
            'Approved listings go live immediately on the marketplace.',
            'Rejected submissions get feedback and can be resubmitted.',
          ].map((s, i) => (
            <View key={i} style={styles.nextItem}>
              <Text style={styles.nextBullet}>→</Text>
              <Text style={styles.nextText}>{s}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={{ gap: Spacing.sm }}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/product/create' as any)}>
            <Text style={styles.primaryBtnText}>Submit Another Artwork</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backIcon: { color: Colors.gold, fontSize: 22 },
  title: { ...Typography.display, fontSize: 22 },
  statusHero: { alignItems: 'center', gap: Spacing.md },
  clockWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F6A72322', borderWidth: 2, borderColor: '#F6A723', alignItems: 'center', justifyContent: 'center' },
  clockIcon: { fontSize: 36 },
  statusTitle: { ...Typography.display, fontSize: 24, textAlign: 'center' },
  artworkTitle: { ...Typography.bodySemibold, fontSize: 16, color: Colors.gold, textAlign: 'center' },
  statusPill: { backgroundColor: '#F6A72322', borderRadius: Radius.full, borderWidth: 1, borderColor: '#F6A723', paddingHorizontal: Spacing.lg, paddingVertical: 6 },
  statusPillText: { ...Typography.bodySemibold, fontSize: 13, color: '#F6A723' },
  detailCard: { borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderGold, gap: Spacing.sm },
  detailGoldLine: { width: 32, height: 2, backgroundColor: Colors.gold, marginBottom: Spacing.xs },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailKey: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  detailVal: { ...Typography.bodySemibold, fontSize: 13, color: Colors.cream, textAlign: 'right', flex: 1, marginLeft: Spacing.md },
  sectionTitle: { ...Typography.heading, fontSize: 20, marginBottom: Spacing.md },
  timelineItem: { flexDirection: 'row', gap: Spacing.md },
  timelineLeft: { alignItems: 'center', width: 28 },
  timelineDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' },
  timelineDotDone: { backgroundColor: Colors.bg, borderColor: Colors.gold },
  timelineDotActive: { backgroundColor: Colors.bgCard, borderColor: Colors.cream },
  timelineCheck: { color: Colors.gold, fontSize: 13, fontWeight: '700' },
  timelineLiveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.cream },
  timelineLine: { width: 2, flex: 1, backgroundColor: Colors.border, marginVertical: 2 },
  timelineLineDone: { backgroundColor: Colors.gold },
  timelineBody: { flex: 1, paddingBottom: Spacing.lg },
  timelineLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  timelineLabel: { ...Typography.bodySemibold, fontSize: 14, color: Colors.creamDim },
  livePill: { backgroundColor: Colors.gold + '22', borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: Colors.borderGold },
  livePillText: { ...Typography.label, fontSize: 8, color: Colors.gold },
  timelineDetail: { ...Typography.caption, fontSize: 12, color: Colors.creamFaint, marginTop: 2 },
  nextCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: Spacing.sm },
  nextTitle: { ...Typography.heading, fontSize: 17, marginBottom: Spacing.xs },
  nextItem: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  nextBullet: { color: Colors.gold, fontSize: 14, width: 18 },
  nextText: { ...Typography.body, fontSize: 13, color: Colors.creamDim, flex: 1, lineHeight: 19 },
  primaryBtn: { backgroundColor: Colors.gold, borderRadius: Radius.full, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { ...Typography.bodyBold, fontSize: 15, color: Colors.bg },
  ghostBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  ghostBtnText: { ...Typography.bodySemibold, fontSize: 14, color: Colors.gold },
});
