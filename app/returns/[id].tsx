import { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useReturnDetail, useCancelReturn } from '@/hooks/useReturns';
import {
  returnStatusLabel, CANCELLABLE_RETURN_STATUSES, REASON_CATEGORIES,
} from '@/services/returnsService';

function reasonLabel(value: string): string {
  return REASON_CATEGORIES.find(r => r.value === value)?.label ?? returnStatusLabel(value);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function ReturnDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useReturnDetail(String(id));
  const cancelReturn = useCancelReturn();

  const handleCancel = useCallback(() => {
    if (!data) return;
    Alert.alert('Withdraw return', 'This will cancel your return request. Continue?', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelReturn.mutateAsync(data.id);
          } catch (e: any) {
            Alert.alert('Could not withdraw', e?.message ?? 'Please try again.');
          }
        },
      },
    ]);
  }, [data, cancelReturn]);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: Colors.bg }]}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.center, { backgroundColor: Colors.bg }]}>
        <Text style={styles.muted}>Could not load this return.</Text>
        <TouchableOpacity onPress={() => refetch()} style={{ marginTop: Spacing.md }}>
          <Text style={{ color: Colors.gold }}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canCancel = CANCELLABLE_RETURN_STATUSES.includes(data.status);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>#{data.requestRef}</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 80 }}>
        {/* Status */}
        <View style={styles.card}>
          <Text style={styles.status}>{returnStatusLabel(data.status)}</Text>
          <Text style={styles.muted}>
            {data.resolutionType === 'REFUND' ? 'Refund requested' :
             data.resolutionType === 'REPLACEMENT' ? 'Replacement requested' : 'Exchange requested'}
            {' · '}
            {new Date(data.requestedAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </Text>
          {data.rejectionReason ? (
            <Text style={styles.rejection}>{data.rejectionReason}</Text>
          ) : null}
        </View>

        {/* Items */}
        <Text style={styles.sectionTitle}>Items</Text>
        {data.items?.map(item => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.itemTitle}>
              {item.orderItem?.productName ?? item.orderItem?.title ?? 'Item'}
            </Text>
            <Text style={styles.muted}>
              Qty {item.quantity} · {reasonLabel(item.reasonCategory)}
            </Text>
            {item.reasonNote ? <Text style={styles.note}>“{item.reasonNote}”</Text> : null}

            {item.customerImages && item.customerImages.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.sm }}>
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  {item.customerImages.map(url => (
                    <Image key={url} source={{ uri: url }} style={styles.photo} contentFit="cover" />
                  ))}
                </View>
              </ScrollView>
            )}

            {item.refundAmount != null && (
              <Text style={styles.refundLine}>
                Refund approved: ₹{Number(item.refundAmount).toLocaleString('en-IN')}
              </Text>
            )}
          </View>
        ))}

        {/* Pickup */}
        {data.pickup ? (
          <>
            <Text style={styles.sectionTitle}>Pickup</Text>
            <View style={styles.card}>
              {data.pickup.courierProvider ? <Row label="Courier" value={data.pickup.courierProvider} /> : null}
              {data.pickup.awbNumber ? <Row label="Tracking number" value={data.pickup.awbNumber} /> : null}
              {data.pickup.scheduledDate ? (
                <Row
                  label="Scheduled"
                  value={new Date(data.pickup.scheduledDate).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                />
              ) : null}
              {data.pickup.status ? <Row label="Status" value={returnStatusLabel(data.pickup.status)} /> : null}
            </View>
          </>
        ) : null}

        {/* Refunds */}
        {data.refundTransactions && data.refundTransactions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Refunds</Text>
            <View style={styles.card}>
              {data.refundTransactions.map(t => (
                <Row
                  key={t.id}
                  label={returnStatusLabel(t.status)}
                  value={`₹${Number(t.amount).toLocaleString('en-IN')}`}
                />
              ))}
            </View>
          </>
        )}

        {/* Replacement */}
        {data.replacementOrder ? (
          <>
            <Text style={styles.sectionTitle}>Replacement</Text>
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/orders/${data.replacementOrder!.id}` as any)}
            >
              <Row label="Replacement order" value={data.replacementOrder.status ?? 'Created'} />
              <Text style={{ color: Colors.gold, marginTop: 4 }}>View order →</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {/* History */}
        {data.statusHistory && data.statusHistory.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>History</Text>
            <View style={styles.card}>
              {data.statusHistory.map((h, i) => (
                <View key={`${h.status}-${i}`} style={styles.historyRow}>
                  <View style={styles.dot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyStatus}>{returnStatusLabel(h.status)}</Text>
                    <Text style={styles.muted}>
                      {new Date(h.createdAt).toLocaleString('en-IN', {
                        day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
                      })}
                    </Text>
                    {h.note ? <Text style={styles.note}>{h.note}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {canCancel && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancel}
            disabled={cancelReturn.isPending}
          >
            <Text style={styles.cancelText}>
              {cancelReturn.isPending ? 'Withdrawing…' : 'Withdraw this return'}
            </Text>
          </TouchableOpacity>
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
  title: { ...Typography.display, fontSize: 18, flex: 1, textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },

  card: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  sectionTitle: { ...Typography.label, fontSize: 10, color: Colors.gold, marginTop: Spacing.md, marginBottom: 6 },
  status: { ...Typography.heading, fontSize: 18, color: Colors.gold },
  muted: { ...Typography.caption, fontSize: 12, marginTop: 2 },
  rejection: { ...Typography.body, fontSize: 13, color: Colors.error, marginTop: Spacing.sm },

  itemTitle: { ...Typography.bodySemibold, fontSize: 14 },
  note: { ...Typography.body, fontSize: 13, color: Colors.creamDim, marginTop: 4, fontStyle: 'italic' },
  photo: { width: 72, height: 72, borderRadius: Radius.sm },
  refundLine: { ...Typography.bodySemibold, fontSize: 13, color: Colors.success, marginTop: Spacing.sm },

  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  rowValue: { ...Typography.bodySemibold, fontSize: 13 },

  historyRow: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.gold, marginTop: 6 },
  historyStatus: { ...Typography.bodySemibold, fontSize: 13 },

  cancelBtn: {
    marginTop: Spacing.lg, paddingVertical: Spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.error + '66', borderRadius: Radius.md,
  },
  cancelText: { ...Typography.bodySemibold, fontSize: 14, color: Colors.error },
});
