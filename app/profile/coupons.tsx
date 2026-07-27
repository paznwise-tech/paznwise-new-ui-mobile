import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { couponService } from '@/services/couponService';
import type { Coupon } from '@/types';

export default function CouponsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const data = await couponService.getPublicCoupons();
      setCoupons(data);
    } catch (err: any) {
      console.warn('[Coupons] Error fetching coupons:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCoupons();
  };

  const renderCouponCard = ({ item }: { item: Coupon }) => {
    return (
      <View style={styles.card}>
        <View style={styles.badgeRow}>
          <View style={styles.codeBadge}>
            <Text style={styles.codeText}>{item.code}</Text>
          </View>
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={() => Alert.alert('Code Saved!', `Use coupon code "${item.code}" at checkout.`)}
          >
            <Text style={styles.copyBtnText}>Use Code</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>
          {item.title || (item.discountType === 'PERCENTAGE' ? `${item.value}% Discount` : `₹${item.value} Flat Off`)}
        </Text>
        {item.description && <Text style={styles.description}>{item.description}</Text>}

        {item.minOrderValue && Number(item.minOrderValue) > 0 && (
          <Text style={styles.minOrderText}>
            Min. Order Value: ₹{Number(item.minOrderValue).toLocaleString('en-IN')}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Coupons & Offers</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.gold} />
          <Text style={styles.loadingText}>Loading Offers...</Text>
        </View>
      ) : (
        <FlatList
          data={coupons}
          keyExtractor={(item, index) => (item.id || index).toString()}
          renderItem={renderCouponCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.gold} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No Active Coupons</Text>
              <Text style={styles.emptySub}>Check back soon for new seasonal discounts and exclusive promo codes.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gold + '44',
    borderStyle: 'dashed',
    marginBottom: Spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  codeBadge: {
    backgroundColor: Colors.gold + '22',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  codeText: {
    ...Typography.bodyBold,
    fontSize: 13,
    color: Colors.gold,
    fontFamily: 'monospace',
  },
  copyBtn: {
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  copyBtnText: {
    ...Typography.bodyBold,
    fontSize: 11,
    color: '#0D1B2A',
  },
  title: {
    ...Typography.bodyBold,
    fontSize: 15,
    color: Colors.cream,
    marginTop: 4,
  },
  description: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.creamDim,
    marginTop: 2,
  },
  minOrderText: {
    ...Typography.caption,
    fontSize: 11,
    color: '#E65100',
    marginTop: 6,
    fontWeight: '600',
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
    lineHeight: 18,
  },
});
