import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { ProductService } from '@/services/productService';
import { orderService } from '@/services/orderService';
import { MEDIA_BASE_URL } from '@/services/api';
import type { Order } from '@/types';

function resolveImg(p: any): string {
  const url = p.images?.[0]?.url ?? p.images?.[0] ?? p.image ?? '';
  if (!url) return 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=200';
  if (url.startsWith('http')) return url;
  return `${MEDIA_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function SellerDashboard() {
  const [products, setProducts]     = useState<any[]>([]);
  const [orders, setOrders]         = useState<Order[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [productsRes, ordersRes] = await Promise.allSettled([
      ProductService.getMyProducts(),
      orderService.getMyOrders(),
    ]);
    if (productsRes.status === 'fulfilled') {
      const raw = productsRes.value as any;
      const list = Array.isArray(raw.data) ? raw.data : (raw.data?.products ?? raw.data?.items ?? []);
      setProducts(list);
    }
    if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value);
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  const totalRevenue = orders.reduce((s, o) => s + (o.totalAmount ?? 0), 0);
  const delivered = orders.filter(o => o.status?.toLowerCase() === 'delivered').length;
  const activeListings = products.filter(p => p.status === 'active' || p.isActive).length;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Seller Dashboard</Text>
          <TouchableOpacity onPress={() => router.push('/product/create' as any)}>
            <Text style={styles.addBtn}>+ List</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.gold} />}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <StatBox label="Revenue" value={`₹${totalRevenue.toLocaleString('en-IN')}`} />
          <View style={styles.statDivider} />
          <StatBox label="Orders" value={String(orders.length)} sub={`${delivered} delivered`} />
          <View style={styles.statDivider} />
          <StatBox label="Listings" value={String(products.length)} sub={`${activeListings} active`} />
        </View>

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/product/create' as any)}>
            <Text style={styles.actionIcon}>🖼️</Text>
            <Text style={styles.actionLabel}>List Artwork</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/product/my-listings' as any)}>
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionLabel}>My Listings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/orders' as any)}>
            <Text style={styles.actionIcon}>📦</Text>
            <Text style={styles.actionLabel}>Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/seller/setup' as any)}>
            <Text style={styles.actionIcon}>⚙️</Text>
            <Text style={styles.actionLabel}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Recent orders */}
        <Text style={styles.sectionTitle}>Recent Orders</Text>
        {orders.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>No orders yet</Text>
          </View>
        ) : (
          orders.slice(0, 5).map(order => (
            <View key={order.id} style={styles.orderCard}>
              <View>
                <Text style={styles.orderId}>#{String(order.id).slice(-8).toUpperCase()}</Text>
                {order.items?.[0]?.title ? (
                  <Text style={styles.orderItem} numberOfLines={1}>{order.items[0].title}</Text>
                ) : null}
              </View>
              <View style={styles.orderRight}>
                {order.totalAmount !== undefined && (
                  <Text style={styles.orderAmt}>₹{order.totalAmount.toLocaleString('en-IN')}</Text>
                )}
                <Text style={[styles.orderStatus, { color: order.status === 'delivered' ? Colors.success : Colors.warning }]}>
                  {order.status}
                </Text>
              </View>
            </View>
          ))
        )}

        {/* My listings */}
        <Text style={styles.sectionTitle}>My Listings</Text>
        {products.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🖼️</Text>
            <Text style={styles.emptyText}>No listings yet</Text>
            <TouchableOpacity style={{ marginTop: Spacing.sm }} onPress={() => router.push('/product/create' as any)}>
              <Text style={{ color: Colors.gold, fontSize: 14 }}>+ List your first artwork</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm, paddingHorizontal: Spacing.md }}>
            {products.slice(0, 6).map((p, idx) => (
              <TouchableOpacity
                key={p.id ?? idx}
                style={styles.productCard}
                onPress={() => router.push(`/product/edit/${p.id}` as any)}
                activeOpacity={0.8}
              >
                <Image source={{ uri: resolveImg(p) }} style={styles.productImg} contentFit="cover" />
                <Text style={styles.productTitle} numberOfLines={1}>{p.title ?? 'Untitled'}</Text>
                <Text style={styles.productPrice}>₹{(p.price ?? 0).toLocaleString('en-IN')}</Text>
                <View style={[styles.productStatusBadge, { backgroundColor: p.status === 'active' || p.isActive ? Colors.success + '22' : Colors.warning + '22' }]}>
                  <Text style={[styles.productStatusText, { color: p.status === 'active' || p.isActive ? Colors.success : Colors.warning }]}>
                    {p.status ?? 'draft'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
  title: { ...Typography.display, fontSize: 22 },
  addBtn: { ...Typography.label, fontSize: 10, color: Colors.gold },
  content: { paddingBottom: 100 },
  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.borderGold,
    margin: Spacing.md, paddingVertical: Spacing.lg,
  },
  statBox: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { ...Typography.display, fontSize: 22, color: Colors.gold },
  statSub: { ...Typography.caption, fontSize: 10 },
  statLabel: { ...Typography.caption, fontSize: 12 },
  statDivider: { width: 1, backgroundColor: Colors.border },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  actionBtn: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.sm, alignItems: 'center', gap: 4,
  },
  actionIcon: { fontSize: 22 },
  actionLabel: { ...Typography.caption, fontSize: 11, textAlign: 'center' },
  sectionTitle: { ...Typography.heading, fontSize: 20, paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  orderCard: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  orderId: { ...Typography.bodySemibold, fontSize: 14 },
  orderItem: { ...Typography.caption, fontSize: 12, marginTop: 2, maxWidth: 160 },
  orderRight: { alignItems: 'flex-end' },
  orderAmt: { ...Typography.bodyBold, fontSize: 15, color: Colors.gold },
  orderStatus: { ...Typography.label, fontSize: 9, marginTop: 2 },
  emptyBox: { padding: Spacing.xl, alignItems: 'center', marginHorizontal: Spacing.md },
  emptyIcon: { fontSize: 36 },
  emptyText: { ...Typography.caption, fontSize: 14, marginTop: Spacing.sm },
  productCard: {
    width: 140, backgroundColor: Colors.bgCard,
    borderRadius: Radius.md, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border,
  },
  productImg: { width: '100%', height: 110 },
  productTitle: { ...Typography.bodySemibold, fontSize: 12, padding: Spacing.xs, paddingBottom: 0 },
  productPrice: { ...Typography.bodyBold, fontSize: 13, color: Colors.gold, paddingHorizontal: Spacing.xs },
  productStatusBadge: { margin: Spacing.xs, borderRadius: Radius.sm, padding: 2, alignItems: 'center' },
  productStatusText: { ...Typography.label, fontSize: 8 },
});
