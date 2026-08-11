import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { orderService } from '@/services/orderService';
import type { Order } from '@/types';

export default function OrderConfirmedScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    if (!orderId || orderId === 'unknown') {
      try {
        const orders = await orderService.getMyOrders();
        if (orders.length > 0) {
          setOrder(orders[0]);
        } else {
          setError('Order details not found.');
        }
      } catch (err: any) {
        setError('Could not load latest order.');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const data = await orderService.getOrderById(orderId);
      setOrder(data);
    } catch (err: any) {
      console.warn('[Confirmed] Error fetching order:', err.message);
      setError('Could not load order details.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.gold} />
        <Text style={styles.loadingText}>Fetching Order Details...</Text>
      </SafeAreaView>
    );
  }

  const items = order?.products || order?.items || order?.orderItems || [];
  const estDate = order?.estimatedDelivery
    ? new Date(order.estimatedDelivery).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '5–7 Business Days';

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Success Icon */}
        <View style={styles.successIconBox}>
          <LinearGradient colors={[Colors.gold + '44', Colors.gold + '11']} style={styles.circle}>
            <Text style={styles.checkmark}>✓</Text>
          </LinearGradient>
        </View>

        <Text style={styles.title}>Order Placed Successfully! 🎉</Text>
        <Text style={styles.orderNumber}>
          Order #{order?.invoiceNumber || order?.orderId || order?.id || '—'}
        </Text>
        <Text style={styles.deliveryEst}>Estimated Delivery: {estDate}</Text>

        {/* Order Items Card */}
        {items.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ordered Artworks</Text>
            {items.map((item, idx) => {
              const imgUrl = item.productImage || item.imageUrl || item.product?.productImages?.[0] || item.product?.images?.[0];
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
        )}

        {/* Payment & Invoice Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Invoice Breakdown</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Subtotal</Text>
            <Text style={styles.summaryVal}>₹{(order?.subtotal || order?.totalAmount || 0).toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Shipping</Text>
            <Text style={[styles.summaryVal, (!order?.shippingCharge || order?.shippingCharge === 0) && { color: '#2E7D32' }]}>
              {!order?.shippingCharge || order?.shippingCharge === 0 ? 'FREE' : `₹${order.shippingCharge}`}
            </Text>
          </View>
          {order?.discount && order.discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryKey, { color: '#2E7D32' }]}>Discount</Text>
              <Text style={[styles.summaryVal, { color: '#2E7D32' }]}>-₹{order.discount.toLocaleString('en-IN')}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalKey}>Grand Total</Text>
            <Text style={styles.totalVal}>₹{(order?.totalAmount || 0).toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Delivery Address Card */}
        {order?.shippingAddress && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Delivery Address</Text>
            <Text style={styles.addrName}>{order.shippingAddress.name}</Text>
            <Text style={styles.addrText}>{order.shippingAddress.street}</Text>
            <Text style={styles.addrText}>
              {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.zipCode}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionColumn}>
          <GoldButton
            label="Track Order Status"
            onPress={() =>
              router.push({
                pathname: '/profile/orders/[id]' as any,
                params: { id: (order?.orderId || order?.id || orderId || '').toString() },
              })
            }
            size="lg"
          />

          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => router.push('/messages')}
          >
            <Text style={styles.outlineBtnText}>Message Artist</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.textBtn}
            onPress={() => router.replace('/(tabs)/browse')}
          >
            <Text style={styles.textBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 60,
    alignItems: 'center',
  },
  successIconBox: {
    marginVertical: Spacing.md,
  },
  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  checkmark: {
    fontSize: 38,
    color: Colors.gold,
    fontWeight: 'bold',
  },
  title: {
    ...Typography.display,
    fontSize: 22,
    color: Colors.cream,
    textAlign: 'center',
    marginBottom: 4,
  },
  orderNumber: {
    ...Typography.bodySemibold,
    fontSize: 14,
    color: Colors.gold,
    marginBottom: 2,
  },
  deliveryEst: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.creamDim,
    marginBottom: Spacing.lg,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: Colors.cream,
    marginBottom: Spacing.sm,
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
    width: 48,
    height: 48,
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryKey: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.creamDim,
  },
  summaryVal: {
    ...Typography.bodySemibold,
    fontSize: 13,
    color: Colors.cream,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs,
  },
  totalKey: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: Colors.cream,
  },
  totalVal: {
    ...Typography.bodyBold,
    fontSize: 15,
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
  actionColumn: {
    width: '100%',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  outlineBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gold,
    alignItems: 'center',
  },
  outlineBtnText: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: Colors.gold,
  },
  textBtn: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
  },
  textBtnText: {
    ...Typography.bodySemibold,
    fontSize: 13,
    color: Colors.creamDim,
  },
});
