import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { OrderService, ApiOrder } from '@/services/orderService';

const STATUS_COLORS: Record<string, string> = {
  processing: Colors.warning,
  confirmed:  Colors.success,
  shipped:    '#3B82F6',
  delivered:  Colors.gold,
  cancelled:  Colors.error,
  returned:   Colors.creamDim,
};

const STATUS_ICON: Record<string, string> = {
  processing: '⏳',
  confirmed:  '✅',
  shipped:    '🚚',
  delivered:  '📦',
  cancelled:  '❌',
  returned:   '↩️',
};

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function OrderHistory() {
  const [orders, setOrders]       = useState<ApiOrder[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await OrderService.getMyOrders();
      setOrders(data);
    } catch (e: any) {
      console.warn('[Orders]', e.message);
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  const handleCancel = useCallback((orderId: string) => {
    Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await OrderService.cancelOrder(orderId);
            setOrders(prev => prev.map(o =>
              o.id === orderId ? { ...o, status: 'cancelled' } : o
            ));
          } catch (e: any) {
            Alert.alert('Error', e.message ?? 'Failed to cancel order');
          }
        },
      },
    ]);
  }, []);

  const renderItem = useCallback(({ item }: { item: ApiOrder }) => {
    const status = (item.status ?? 'processing').toLowerCase();
    const color  = STATUS_COLORS[status] ?? STATUS_COLORS.processing;
    const icon   = STATUS_ICON[status] ?? '📦';
    const canCancel = status === 'processing' || status === 'confirmed';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderId}>#{item.id.slice(-8).toUpperCase()}</Text>
            <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: color + '22', borderColor: color }]}>
            <Text style={styles.statusIcon}>{icon}</Text>
            <Text style={[styles.statusText, { color }]}>{status}</Text>
          </View>
        </View>

        {item.items && item.items.length > 0 && (
          <View style={styles.itemsList}>
            {item.items.slice(0, 2).map((it, idx) => (
              <Text key={idx} style={styles.itemLine} numberOfLines={1}>
                • {it.title ?? `Product #${it.productId.slice(-6)}`} × {it.quantity}
              </Text>
            ))}
            {item.items.length > 2 && (
              <Text style={styles.moreItems}>+{item.items.length - 2} more items</Text>
            )}
          </View>
        )}

        <View style={styles.cardFooter}>
          <View>
            {item.totalAmount !== undefined && (
              <Text style={styles.total}>₹{item.totalAmount.toLocaleString('en-IN')}</Text>
            )}
            {item.estimatedDelivery && !['delivered', 'cancelled', 'returned'].includes(status) && (
              <Text style={styles.delivery}>Est. by {item.estimatedDelivery}</Text>
            )}
            {item.paymentMethod && (
              <Text style={styles.payMethod}>{item.paymentMethod}</Text>
            )}
          </View>
          {canCancel && (
            <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item.id)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [handleCancel]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>My Orders</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.gold} />
          }
          ListEmptyComponent={
            <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
              <Text style={{ fontSize: 48 }}>🛍️</Text>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptyText}>Your art purchases will appear here</Text>
              <TouchableOpacity
                style={{ marginTop: Spacing.md }}
                onPress={() => router.push('/(tabs)/browse' as any)}
              >
                <Text style={{ color: Colors.gold, fontSize: 14 }}>Shop Now →</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  backIcon: { color: Colors.gold, fontSize: 22 },
  title: { ...Typography.display, fontSize: 22 },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 100, gap: Spacing.md },
  card: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: Spacing.md,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderId: { ...Typography.bodySemibold, fontSize: 16, fontFamily: 'Inter_700Bold' },
  orderDate: { ...Typography.caption, fontSize: 12, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: Radius.sm, borderWidth: 1,
  },
  statusIcon: { fontSize: 12 },
  statusText: { ...Typography.label, fontSize: 9 },
  itemsList: {
    backgroundColor: Colors.bgElevated, borderRadius: Radius.sm,
    padding: Spacing.sm, gap: 2,
  },
  itemLine: { ...Typography.caption, fontSize: 12 },
  moreItems: { ...Typography.caption, fontSize: 11, color: Colors.gold },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  total: { ...Typography.bodyBold, fontSize: 18, color: Colors.gold },
  delivery: { ...Typography.caption, fontSize: 11, marginTop: 2 },
  payMethod: { ...Typography.caption, fontSize: 11, marginTop: 1 },
  cancelBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.error,
  },
  cancelText: { ...Typography.label, fontSize: 10, color: Colors.error },
  emptyTitle: { ...Typography.heading, fontSize: 20, marginTop: Spacing.md },
  emptyText: { ...Typography.caption, fontSize: 14, marginTop: 4, textAlign: 'center' },
});
