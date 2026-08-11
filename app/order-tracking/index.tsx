import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

const STAGES = [
  { label: 'Order Placed', detail: 'Your order has been received', done: true },
  { label: 'Artwork Packed', detail: 'Artist is preparing your artwork', done: true },
  { label: 'Picked Up', detail: 'Picked up by courier partner', done: true },
  { label: 'In Transit', detail: 'Your package is on its way', done: false, active: true },
  { label: 'Out for Delivery', detail: 'Will be delivered today', done: false },
  { label: 'Delivered', detail: 'Package delivered successfully', done: false },
];

export default function OrderTracking() {
  const { orderId, estimatedDelivery } = useLocalSearchParams<{ orderId?: string; estimatedDelivery?: string }>();

  const id = orderId ?? '';
  const delivery = estimatedDelivery ?? 'In 5–7 business days';

  const handleShare = async () => {
    try {
      await Share.share({
        title: 'Track my order',
        message: `Order ${id || 'details'} — In Transit, delivery expected ${delivery}`,
      });
    } catch {}
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Track Order</Text>
          <TouchableOpacity onPress={handleShare}>
            <Text style={styles.shareIcon}>↗</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 60, gap: Spacing.xl }}>

        {/* Courier banner */}
        <View style={styles.courierCard}>
          <View style={styles.courierRow}>
            <View>
              {!!id && <Text style={styles.courierOrderId}>{id}</Text>}
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>In Transit</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={styles.deliveryLabel}>Expected Delivery</Text>
              <Text style={styles.deliveryDate}>{delivery}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.courierInfo}>
            <Text style={styles.courierLabel}>Courier Partner</Text>
            <Text style={styles.courierVal}>Blue Dart Express</Text>
          </View>
        </View>

        {/* Tracking timeline */}
        <View>
          <Text style={styles.sectionTitle}>Live Tracking</Text>
          <View>
            {STAGES.map((stage, i) => (
              <View key={stage.label} style={styles.stageRow}>
                <View style={styles.stageLeft}>
                  <View style={[
                    styles.stageDot,
                    stage.done && styles.stageDotDone,
                    stage.active && styles.stageDotActive,
                  ]}>
                    {stage.done
                      ? <Text style={styles.stageCheck}>✓</Text>
                      : stage.active
                        ? <View style={styles.stageLiveDot} />
                        : null}
                  </View>
                  {i < STAGES.length - 1 && (
                    <View style={[styles.stageLine, stage.done && styles.stageLineDone]} />
                  )}
                </View>
                <View style={styles.stageBody}>
                  <View style={styles.stageLabelRow}>
                    <Text style={[
                      styles.stageLabel,
                      stage.done && { color: Colors.cream },
                      stage.active && { color: Colors.gold },
                    ]}>
                      {stage.label}
                    </Text>
                    {stage.active && (
                      <View style={styles.livePill}>
                        <Text style={styles.livePillText}>LIVE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.stageDetail}>{stage.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={{ gap: Spacing.sm }}>
          <TouchableOpacity style={styles.messageBtn} onPress={() => router.push('/messages' as any)}>
            <Text style={styles.messageBtnText}>💬 Message the Artist</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.issueBtn}>
            <Text style={styles.issueBtnText}>Report an Issue</Text>
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
  shareIcon: { color: Colors.gold, fontSize: 22 },
  courierCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md },
  courierRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  courierOrderId: { ...Typography.bodySemibold, fontSize: 14, color: Colors.cream, marginBottom: 6 },
  statusPill: { backgroundColor: '#3B82F622', borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: '#3B82F6', alignSelf: 'flex-start' },
  statusPillText: { ...Typography.label, fontSize: 10, color: '#3B82F6' },
  deliveryLabel: { ...Typography.caption, fontSize: 11, color: Colors.creamDim },
  deliveryDate: { ...Typography.bodySemibold, fontSize: 13, color: Colors.gold },
  divider: { height: 1, backgroundColor: Colors.border },
  courierInfo: { flexDirection: 'row', justifyContent: 'space-between' },
  courierLabel: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  courierVal: { ...Typography.bodySemibold, fontSize: 13, color: Colors.cream },
  sectionTitle: { ...Typography.heading, fontSize: 20, marginBottom: Spacing.md },
  stageRow: { flexDirection: 'row', gap: Spacing.md },
  stageLeft: { alignItems: 'center', width: 28 },
  stageDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' },
  stageDotDone: { borderColor: Colors.gold, backgroundColor: Colors.bg },
  stageDotActive: { borderColor: Colors.cream, backgroundColor: Colors.bgCard },
  stageCheck: { color: Colors.gold, fontSize: 13, fontWeight: '700' },
  stageLiveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.cream },
  stageLine: { width: 2, flex: 1, backgroundColor: Colors.border, marginVertical: 2 },
  stageLineDone: { backgroundColor: Colors.gold },
  stageBody: { flex: 1, paddingBottom: Spacing.lg },
  stageLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stageLabel: { ...Typography.bodySemibold, fontSize: 14, color: Colors.creamDim },
  livePill: { backgroundColor: Colors.gold + '22', borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: Colors.borderGold },
  livePillText: { ...Typography.label, fontSize: 8, color: Colors.gold },
  stageDetail: { ...Typography.caption, fontSize: 12, color: Colors.creamFaint, marginTop: 2 },
  messageBtn: { backgroundColor: Colors.bgCard, borderRadius: Radius.full, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  messageBtnText: { ...Typography.bodySemibold, fontSize: 15, color: Colors.cream },
  issueBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  issueBtnText: { ...Typography.caption, fontSize: 14, color: Colors.creamDim },
});
