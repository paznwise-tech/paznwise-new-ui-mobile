import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { orderService } from '@/services/orderService';

/**
 * Shipment tracking.
 *
 * The stage list, courier and delivery estimate all come from
 * `GET /orders/:id/tracking`. This screen previously rendered a hardcoded
 * six-stage array that always claimed "In Transit" with a literal courier
 * of "Blue Dart Express", regardless of the order — a delivered or
 * cancelled order looked identical to one in transit.
 */
export default function OrderTracking() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const id = orderId ?? '';

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['order-tracking', id],
    queryFn: () => orderService.getTracking(id),
    enabled: !!id,
  });

  const stages = data?.stages ?? [];
  const delivery = data?.deliveryRange ?? data?.estimatedDelivery ?? 'Being scheduled';

  const handleShare = async () => {
    if (!data) return;
    try {
      await Share.share({
        title: 'Track my order',
        message:
          `Order ${data.orderRef} — ${data.currentStage}` +
          (data.courier?.awb ? `\nAWB: ${data.courier.awb}` : '') +
          `\nExpected: ${delivery}`,
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
          <TouchableOpacity onPress={handleShare} disabled={!data}>
            <Text style={[styles.shareIcon, !data && { opacity: 0.4 }]}>↗</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.gold} size="large" /></View>
      ) : error || !data ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load tracking for this order.</Text>
          <TouchableOpacity onPress={() => refetch()} style={{ marginTop: Spacing.md }}>
            <Text style={{ color: Colors.gold }}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 60, gap: Spacing.xl }}>

        {/* Courier banner */}
        <View style={styles.courierCard}>
          <View style={styles.courierRow}>
            <View>
              <Text style={styles.courierOrderId}>{data.orderRef}</Text>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>{data.currentStage}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={styles.deliveryLabel}>Expected Delivery</Text>
              <Text style={styles.deliveryDate}>{delivery}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          {data.courier?.name ? (
            <View style={styles.courierInfo}>
              <Text style={styles.courierLabel}>Courier Partner</Text>
              <Text style={styles.courierVal}>{data.courier.name}</Text>
            </View>
          ) : null}
          {data.courier?.awb ? (
            <View style={styles.courierInfo}>
              <Text style={styles.courierLabel}>Tracking number</Text>
              <Text style={styles.courierVal}>{data.courier.awb}</Text>
            </View>
          ) : null}
        </View>

        {/* Tracking timeline */}
        <View>
          <Text style={styles.sectionTitle}>Live Tracking</Text>
          <View>
            {stages.map((stage, i) => (
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
                  {i < stages.length - 1 && (
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
                  {stage.sub ? <Text style={styles.stageSub}>{stage.sub}</Text> : null}
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
          <TouchableOpacity
            style={styles.issueBtn}
            onPress={() => router.push({ pathname: '/contact', params: { subject: `Issue with order ${data.orderRef}` } } as any)}
          >
            <Text style={styles.issueBtnText}>Report an Issue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backIcon: { color: Colors.gold, fontSize: 22 },
  title: { ...Typography.display, fontSize: 22 },
  shareIcon: { color: Colors.gold, fontSize: 22 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  errorText: { ...Typography.body, fontSize: 14, color: Colors.creamDim, textAlign: 'center' },
  stageSub: { ...Typography.caption, fontSize: 11, marginTop: 2 },
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
