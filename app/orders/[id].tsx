import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { orderService } from '@/services/orderService';
import { useQueryClient } from '@tanstack/react-query';
import { cartKeys } from '@/hooks/useCartQueries';
import { downloadInvoice } from '@/utils/invoice';
import type { Order } from '@/types';

const ORDER_STEPS = [
  { key: 'PLACED', label: 'Order Placed', desc: 'Received & verified by Paznwise' },
  { key: 'CONFIRMED', label: 'Confirmed by Artist', desc: 'Artwork being carefully packed' },
  { key: 'SHIPPED', label: 'In Transit / Shipped', desc: 'Dispatched via courier' },
  { key: 'DELIVERED', label: 'Delivered', desc: 'Safely delivered to your address' },
];

export default function OrderDetailTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    if (!id) return;
    try {
      const data = await orderService.getOrderById(id);
      setOrder(data);
    } catch (err: any) {
      console.warn('[OrderDetail] Error fetching order:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const getActiveStepIndex = (status?: string) => {
    const s = status?.toUpperCase() || 'PLACED';
    if (s === 'DELIVERED' || s === 'COMPLETED') return 3;
    if (s === 'SHIPPED' || s === 'DISPATCHED') return 2;
    if (s === 'CONFIRMED' || s === 'PROCESSING') return 1;
    return 0;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.gold} />
        <Text style={styles.loadingText}>Loading Order Tracking...</Text>
      </SafeAreaView>
    );
  }

  const items = order?.products || order?.items || order?.orderItems || [];
  const currentStep = getActiveStepIndex(order?.status);

  const handleCancel = useCallback(() => {
    if (!order) return;
    Alert.alert('Cancel order', 'This cannot be undone. Cancel this order?', [
      { text: 'Keep order', style: 'cancel' },
      {
        text: 'Cancel order',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await orderService.cancelOrder(order.id);
            await fetchOrderDetails();
            qc.invalidateQueries({ queryKey: ['orders'] });
          } catch (e: any) {
            Alert.alert('Could not cancel', e?.message ?? 'Please try again.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }, [order, qc]);

  const handleReorder = useCallback(async () => {
    if (!order) return;
    setBusy(true);
    try {
      await orderService.reorder(order.id);
      // The server puts the items back in the cart, so the cached cart is stale.
      qc.invalidateQueries({ queryKey: cartKeys.all });
      Alert.alert('Added to cart', 'These items are back in your cart.', [
        { text: 'Keep browsing' },
        { text: 'View cart', onPress: () => router.push('/product/cart' as any) },
      ]);
    } catch (e: any) {
      Alert.alert('Could not reorder', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }, [order, qc]);

  const handleInvoice = useCallback(async () => {
    if (!order) return;
    setBusy(true);
    try {
      await downloadInvoice(order.id);
    } catch (e: any) {
      Alert.alert('Could not open invoice', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }, [order]);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Tracking</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Top Info Banner */}
        <View style={styles.bannerCard}>
          <Text style={styles.invoiceNum}>Order #{order?.invoiceNumber || order?.orderId || id}</Text>
          <Text style={styles.orderStatusText}>Status: {order?.status || 'Processing'}</Text>
          {order?.createdAt && (
            <Text style={styles.orderDateText}>
              Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          )}
        </View>

        {/* Tracking Timeline */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Delivery Timeline</Text>
          <View style={styles.timelineContainer}>
            {ORDER_STEPS.map((step, idx) => {
              const isDone = idx <= currentStep;
              const isCurrent = idx === currentStep;
              return (
                <View key={step.key} style={styles.timelineItem}>
                  <View style={styles.leftColumn}>
                    <View
                      style={[
                        styles.timelineDot,
                        isDone && styles.timelineDotDone,
                        isCurrent && styles.timelineDotCurrent,
                      ]}
                    >
                      {isDone && <Text style={styles.timelineCheck}>✓</Text>}
                    </View>
                    {idx < ORDER_STEPS.length - 1 && (
                      <View style={[styles.timelineLine, isDone && styles.timelineLineDone]} />
                    )}
                  </View>
                  <View style={styles.rightColumn}>
                    <Text style={[styles.stepLabel, isDone && styles.stepLabelDone]}>
                      {step.label}
                    </Text>
                    <Text style={styles.stepDesc}>{step.desc}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Products in Order */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {items.map((item, idx) => {
            const imgUrl = item.productImage || item.imageUrl || item.product?.productImages?.[0];
            return (
              <View key={idx} style={[styles.itemRow, idx < items.length - 1 && styles.itemBorder]}>
                {imgUrl ? (
                  <Image source={{ uri: imgUrl }} style={styles.itemImg} />
                ) : (
                  <View style={[styles.itemImg, { backgroundColor: Colors.bgInput }]} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{item.productName || item.title || item.product?.title || 'Artwork'}</Text>
                  <Text style={styles.itemSub}>Qty: {item.quantity || 1}</Text>
                </View>
                <Text style={styles.itemPrice}>₹{(item.totalPrice || item.price || 0).toLocaleString('en-IN')}</Text>
              </View>
            );
          })}
        </View>

        {/* Shipping Address */}
        {order?.shippingAddress && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
            <Text style={styles.addrName}>{order.shippingAddress.name} ({order.shippingAddress.phone})</Text>
            <Text style={styles.addrText}>{order.shippingAddress.street}</Text>
            <Text style={styles.addrText}>
              {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.zipCode}
            </Text>
          </View>
        )}

        {/* Actions */}
        {order && (
          <View style={styles.actions}>
            {CANCELLABLE.includes(String(order.status).toUpperCase()) && (
              <TouchableOpacity style={styles.actionBtn} onPress={handleCancel} disabled={busy}>
                <Text style={[styles.actionText, { color: Colors.error }]}>Cancel order</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push(`/order-tracking/${order.id}` as any)}
            >
              <Text style={styles.actionText}>Track shipment</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleReorder} disabled={busy}>
              <Text style={styles.actionText}>Buy these again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleInvoice} disabled={busy}>
              <Text style={styles.actionText}>Download invoice</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Statuses the API still allows a buyer to cancel. */
const CANCELLABLE = ['PENDING', 'CONFIRMED', 'PROCESSING'];

const styles = StyleSheet.create({
  actions: {
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.bgCard,
  },
  actionBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionText: { ...Typography.bodySemibold, fontSize: 14, color: Colors.gold },
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...Typography.bodySemibold,
    color: Colors.cream,
    marginTop: Spacing.md,
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
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  bannerCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gold + '44',
    marginBottom: Spacing.md,
  },
  invoiceNum: {
    ...Typography.bodyBold,
    fontSize: 16,
    color: Colors.gold,
  },
  orderStatusText: {
    ...Typography.bodySemibold,
    fontSize: 13,
    color: Colors.cream,
    marginTop: 4,
  },
  orderDateText: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.creamDim,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: Colors.cream,
    marginBottom: Spacing.sm,
  },
  timelineContainer: {
    marginTop: Spacing.xs,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  leftColumn: {
    alignItems: 'center',
    width: 24,
    marginRight: Spacing.sm,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: {
    borderColor: Colors.gold,
    backgroundColor: Colors.gold,
  },
  timelineDotCurrent: {
    borderColor: Colors.gold,
  },
  timelineCheck: {
    color: '#0D1B2A',
    fontWeight: 'bold',
    fontSize: 10,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },
  timelineLineDone: {
    backgroundColor: Colors.gold,
  },
  rightColumn: {
    flex: 1,
  },
  stepLabel: {
    ...Typography.bodyBold,
    fontSize: 13,
    color: Colors.creamDim,
  },
  stepLabelDone: {
    color: Colors.cream,
  },
  stepDesc: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.creamDim,
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemImg: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
  },
  itemTitle: {
    ...Typography.bodyBold,
    fontSize: 13,
    color: Colors.cream,
  },
  itemSub: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.creamDim,
    marginTop: 2,
  },
  itemPrice: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: Colors.gold,
  },
  addrName: {
    ...Typography.bodyBold,
    fontSize: 13,
    color: Colors.cream,
  },
  addrText: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.creamDim,
    marginTop: 2,
  },
});
