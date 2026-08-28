import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { orderService } from '@/services/orderService';

const STATUS_GROUPS: Record<string, string[]> = {
  Active: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY'],
  Delivered: ['DELIVERED', 'COMPLETED'],
  Cancelled: ['CANCELLED', 'REJECTED', 'FAILED'],
};

const FILTERS = ['All', 'Active', 'Delivered', 'Cancelled'];
import type { Order } from '@/types';

export default function MyOrdersScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('All');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await orderService.getMyOrders();
      setOrders(data);
    } catch (err: any) {
      console.warn('[MyOrders] Error fetching orders:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  // Filtering is local: the list endpoint returns the buyer's orders in one
  // page, and the set is small enough that a round trip per tab is not worth
  // it. If pagination is added this must move to the `status` query param.
  const visibleOrders =
    statusFilter === 'All'
      ? orders
      : orders.filter(o => STATUS_GROUPS[statusFilter]?.includes(String(o.status).toUpperCase()));

  const renderOrderItem = ({ item }: { item: Order }) => {
    const items = item.products || item.items || item.orderItems || [];
    const firstItem = items[0];
    const imgUrl = firstItem?.productImage || firstItem?.imageUrl || firstItem?.product?.productImages?.[0];
    const dateStr = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '';

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() =>
          router.push({
            pathname: '/orders/[id]' as any,
            params: { id: (item.orderId || item.id).toString() },
          })
        }
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>Order #{item.invoiceNumber || item.orderId || item.id}</Text>
          <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
            <Text style={styles.statusText}>{item.status || 'PROCESSING'}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          {imgUrl ? (
            <Image source={{ uri: imgUrl }} style={styles.artworkImg} />
          ) : (
            <View style={[styles.artworkImg, { backgroundColor: Colors.bgInput }]} />
          )}

          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {firstItem?.productName || firstItem?.title || firstItem?.product?.title || 'Purchased Artwork'}
            </Text>
            {items.length > 1 && (
              <Text style={styles.moreItemsText}>+{items.length - 1} more item(s)</Text>
            )}
            <Text style={styles.orderDate}>{dateStr}</Text>
          </View>

          <Text style={styles.totalPrice}>₹{(item.totalAmount || 0).toLocaleString('en-IN')}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        keyExtractor={f => f}
        renderItem={({ item: f }) => (
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
            onPress={() => setStatusFilter(f)}
          >
            <Text style={[styles.filterText, statusFilter === f && { color: Colors.gold }]}>{f}</Text>
          </TouchableOpacity>
        )}
        style={{ flexGrow: 0 }}
      />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.gold} />
          <Text style={styles.loadingText}>Loading Orders...</Text>
        </View>
      ) : (
        <FlatList
          data={visibleOrders}
          keyExtractor={(item) => (item.orderId || item.id).toString()}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.gold} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No Orders Yet</Text>
              <Text style={styles.emptySub}>When you buy original artworks or merchandise, your order tracking will appear here.</Text>
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => router.replace('/(tabs)/browse')}
              >
                <Text style={styles.browseBtnText}>Explore Marketplace</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function getStatusStyle(status?: string) {
  switch (status?.toUpperCase()) {
    case 'DELIVERED':
    case 'COMPLETED':
      return { backgroundColor: '#2E7D3222', borderColor: '#2E7D32' };
    case 'SHIPPED':
      return { backgroundColor: '#0288D122', borderColor: '#0288D1' };
    case 'CANCELLED':
      return { backgroundColor: '#D32F2F22', borderColor: '#D32F2F' };
    default:
      return { backgroundColor: '#F57C0022', borderColor: '#F57C00' };
  }
}

const styles = StyleSheet.create({
  filterList: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm },
  filterChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard,
  },
  filterChipActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '18' },
  filterText: { ...Typography.caption, fontSize: 12, color: Colors.creamDim },
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...Typography.bodySemibold,
    color: Colors.cream,
    marginTop: Spacing.md,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  orderCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  orderId: {
    ...Typography.bodyBold,
    fontSize: 13,
    color: Colors.gold,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  statusText: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: Colors.cream,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  artworkImg: {
    width: 50,
    height: 50,
    borderRadius: Radius.md,
  },
  itemTitle: {
    ...Typography.bodyBold,
    fontSize: 13,
    color: Colors.cream,
  },
  moreItemsText: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.gold,
  },
  orderDate: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.creamDim,
    marginTop: 2,
  },
  totalPrice: {
    ...Typography.bodyBold,
    fontSize: 15,
    color: Colors.cream,
  },
  emptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.display,
    fontSize: 20,
    color: Colors.cream,
    marginBottom: 4,
  },
  emptySub: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.creamDim,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  browseBtn: {
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  browseBtnText: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: '#0D1B2A',
  },
});
