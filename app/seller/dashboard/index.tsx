import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { ProductService, type SellerDashboard as SellerDashboardData } from '@/services/productService';
import { getProductImageUrl } from '@/utils/imageUrl';

const resolveImg = (p: any): string => getProductImageUrl(p);

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
  const [data, setData]             = useState<SellerDashboardData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // One server-computed payload. Revenue and order counts previously came
  // from summing the signed-in user's own order history, so anything they
  // had bought was counted as money they had earned.
  const load = useCallback(async () => {
    try {
      setData(await ProductService.getSellerDashboard());
    } catch (e: any) {
      console.warn('[SellerDashboard]', e?.message);
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  const stats = data?.stats;
  const recentOrders = data?.recentOrders ?? [];
  const topProducts = data?.topProducts ?? [];

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
          <StatBox label="Revenue" value={`₹${(stats?.totalRevenue ?? 0).toLocaleString('en-IN')}`} />
          <View style={styles.statDivider} />
          <StatBox label="Orders" value={String(stats?.totalOrders ?? 0)} />
          <View style={styles.statDivider} />
          <StatBox
            label="Listings"
            value={String(stats?.activeListings ?? 0)}
            sub={stats?.pendingApproval ? `${stats.pendingApproval} in review` : undefined}
          />
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
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/seller/reviews' as any)}>
            <Text style={styles.actionIcon}>⭐</Text>
            <Text style={styles.actionLabel}>Reviews</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/seller/royalties' as any)}>
            <Text style={styles.actionIcon}>🧢</Text>
            <Text style={styles.actionLabel}>Royalties</Text>
          </TouchableOpacity>
        </View>

        {/* Needs attention — the states a seller has to act on. */}
        {stats && (stats.rejectedProducts > 0 || stats.outOfStock > 0 || stats.draftProducts > 0) && (
          <>
            <Text style={styles.sectionTitle}>Needs attention</Text>
            <TouchableOpacity style={styles.attentionCard} onPress={() => router.push('/product/my-listings' as any)}>
              {stats.rejectedProducts > 0 && (
                <Text style={styles.attentionText}>
                  {stats.rejectedProducts} rejected listing{stats.rejectedProducts === 1 ? '' : 's'} — fix and resubmit
                </Text>
              )}
              {stats.outOfStock > 0 && (
                <Text style={styles.attentionText}>{stats.outOfStock} out of stock</Text>
              )}
              {stats.draftProducts > 0 && (
                <Text style={styles.attentionText}>{stats.draftProducts} draft{stats.draftProducts === 1 ? '' : 's'} not published</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Top products */}
        {topProducts.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Best sellers</Text>
            {topProducts.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.orderCard}
                onPress={() => router.push(`/product/${p.id}` as any)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderItem} numberOfLines={1}>{p.title}</Text>
                  <Text style={styles.orderMeta}>{p.unitsSold} sold</Text>
                </View>
                <Text style={styles.orderAmt}>₹{p.revenue.toLocaleString('en-IN')}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Recent orders — of this seller's products, not the user's own */}
        <Text style={styles.sectionTitle}>Recent Orders</Text>
        {recentOrders.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>No orders yet</Text>
          </View>
        ) : (
          recentOrders.map(order => (
            <View key={`${order.orderId}-${order.productId}`} style={styles.orderCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.orderId}>#{String(order.orderId).slice(-8).toUpperCase()}</Text>
                <Text style={styles.orderItem} numberOfLines={1}>
                  {order.productName}{order.quantity > 1 ? ` × ${order.quantity}` : ''}
                </Text>
              </View>
              <View style={styles.orderRight}>
                <Text style={styles.orderAmt}>₹{order.amount.toLocaleString('en-IN')}</Text>
                <Text style={styles.orderMeta}>{order.status}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  attentionCard: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.warning + '66',
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, gap: 4,
  },
  attentionText: { ...Typography.body, fontSize: 13, color: Colors.warning },
  orderMeta: { ...Typography.caption, fontSize: 11, marginTop: 2 },
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
