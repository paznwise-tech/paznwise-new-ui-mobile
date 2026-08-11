import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Clipboard, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { CouponService, Coupon } from '@/services/couponService';

function formatExpiry(iso?: string): string {
  if (!iso) return '';
  return `Expires ${new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function isExpired(iso?: string): boolean {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

export default function Coupons() {
  const [coupons, setCoupons]       = useState<Coupon[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied]         = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await CouponService.getCoupons();
      setCoupons(list.filter(c => c.isActive && !isExpired(c.expiresAt)));
    } catch (e: any) {
      console.warn('[Coupons]', e.message);
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  const handleCopy = useCallback((code: string) => {
    Clipboard.setString(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const renderItem = useCallback(({ item }: { item: Coupon }) => {
    const expired = isExpired(item.expiresAt);
    const discountLabel = item.discountType === 'percentage'
      ? `${item.discount}% OFF`
      : `₹${item.discount} OFF`;

    return (
      <View style={[styles.card, expired && styles.cardExpired]}>
        {/* Stub perforations */}
        <View style={styles.stubLine}>
          <View style={styles.stubDot} />
          <View style={styles.stubDash} />
          <View style={styles.stubDot} />
        </View>

        <View style={styles.cardLeft}>
          <Text style={[styles.discount, expired && { color: Colors.creamDim }]}>{discountLabel}</Text>
          <Text style={styles.description}>{item.description}</Text>
          {item.minOrderAmount !== undefined && (
            <Text style={styles.minOrder}>Min. order ₹{item.minOrderAmount.toLocaleString('en-IN')}</Text>
          )}
          {item.expiresAt && (
            <Text style={[styles.expiry, expired && { color: Colors.error }]}>{formatExpiry(item.expiresAt)}</Text>
          )}
          {item.usageLimit !== undefined && (
            <Text style={styles.usage}>{item.usedCount ?? 0}/{item.usageLimit} used</Text>
          )}
        </View>

        <View style={styles.codeSection}>
          <Text style={[styles.code, expired && { color: Colors.creamDim }]}>{item.code}</Text>
          <TouchableOpacity
            style={[styles.copyBtn, expired && styles.copyBtnDisabled]}
            onPress={() => !expired && handleCopy(item.code)}
            disabled={expired}
          >
            <Text style={styles.copyBtnText}>
              {copied === item.code ? '✓ Copied!' : 'Copy'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [copied, handleCopy]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Coupons</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : (
        <FlatList
          data={coupons}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.gold} />
          }
          ListHeaderComponent={
            coupons.length > 0 ? (
              <Text style={styles.listNote}>
                Tap to copy a code and apply it at checkout
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
              <Text style={{ fontSize: 48 }}>🎟️</Text>
              <Text style={styles.emptyTitle}>No coupons available</Text>
              <Text style={styles.emptyText}>Check back later for offers and discounts</Text>
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
  listNote: { ...Typography.caption, fontSize: 13, marginBottom: Spacing.sm },
  card: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.borderGold, overflow: 'hidden',
    flexDirection: 'column',
  },
  cardExpired: { borderColor: Colors.border, opacity: 0.6 },
  stubLine: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm },
  stubDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.bg },
  stubDash: { flex: 1, height: 1, borderWidth: 1, borderColor: Colors.borderGold, borderStyle: 'dashed', marginHorizontal: Spacing.sm },
  cardLeft: { padding: Spacing.md, gap: 4 },
  discount: { ...Typography.display, fontSize: 28, color: Colors.gold },
  description: { ...Typography.bodySemibold, fontSize: 15 },
  minOrder: { ...Typography.caption, fontSize: 12 },
  expiry: { ...Typography.caption, fontSize: 11, color: Colors.creamDim },
  usage: { ...Typography.caption, fontSize: 11 },
  codeSection: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: Colors.borderGold, borderStyle: 'dashed',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgElevated,
  },
  code: { ...Typography.display, fontSize: 18, color: Colors.gold, letterSpacing: 3 },
  copyBtn: {
    backgroundColor: Colors.gold, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
  },
  copyBtnDisabled: { backgroundColor: Colors.border },
  copyBtnText: { ...Typography.bodyBold, fontSize: 12, color: Colors.bg },
  emptyTitle: { ...Typography.heading, fontSize: 20, marginTop: Spacing.md },
  emptyText: { ...Typography.caption, fontSize: 14, marginTop: 4, textAlign: 'center' },
});
