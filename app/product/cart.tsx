import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { useCart } from '@/context/AppContext';
import { CouponService, AppliedCoupon } from '@/services/couponService';

const PLATFORM_FEE = 49;


export default function Cart() {
  const { cart, removeFromCart, updateQuantity, cartTotal, cartLoading } = useCart();

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const subtotal = cartTotal;
  const discount = appliedCoupon?.discountAmount ?? 0;
  const grandTotal = subtotal + PLATFORM_FEE - discount;
  const isEmpty = cart.length === 0;


  const handleApplyCoupon = useCallback(async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const result = await CouponService.validateCoupon(code, subtotal);
      setAppliedCoupon(result);
      setCouponError(null);
    } catch (e: any) {
      setCouponError(e.message ?? 'Invalid coupon');
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  }, [couponCode, subtotal]);

  const handleRemoveCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  }, []);


  // ── Cart step ────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>My Cart</Text>
          <Text style={styles.count}>{cart.length} {cart.length === 1 ? 'item' : 'items'}</Text>
        </View>
      </SafeAreaView>

      {cartLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : isEmpty ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🖼️</Text>
          <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
          <Text style={styles.emptySubtitle}>Explore original artworks from verified Indian masters and start collecting.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.replace('/(tabs)/browse' as any)}>
            <Text style={styles.emptyBtnText}>Browse Artworks</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
            <View style={styles.items}>
              {cart.map(item => (
                <View key={item.id} style={styles.cartItem}>
                  <Image source={{ uri: item.img }} style={styles.itemImg} contentFit="cover" transition={200} />
                  <View style={styles.itemBody}>
                    <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.itemPrice}>
                      ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      {item.quantity > 1 && (
                        <Text style={styles.itemUnitPrice}>
                          {'  '}₹{item.price.toLocaleString('en-IN')} each
                        </Text>
                      )}
                    </Text>
                    <View style={styles.itemFooter}>
                      <View style={styles.qtyRow}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Text style={styles.qtyBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyValue}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={[
                            styles.qtyBtn,
                            item.stock !== undefined && item.quantity >= item.stock && styles.qtyBtnDisabled,
                          ]}
                          disabled={item.stock !== undefined && item.quantity >= item.stock}
                          onPress={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Text style={styles.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                        <Text style={styles.removeText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Coupon input */}
            <View style={styles.couponWrap}>
              {appliedCoupon ? (
                <View style={styles.couponApplied}>
                  <View style={styles.couponAppliedLeft}>
                    <Text style={styles.couponAppliedIcon}>🎟️</Text>
                    <View>
                      <Text style={styles.couponAppliedCode}>{appliedCoupon.code}</Text>
                      <Text style={styles.couponAppliedSaving}>
                        You save ₹{appliedCoupon.discountAmount.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={handleRemoveCoupon}>
                    <Text style={styles.couponRemove}>✕ Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.couponRow}>
                    <TextInput
                      style={styles.couponInput}
                      placeholder="Enter coupon code"
                      placeholderTextColor={Colors.creamFaint}
                      autoCapitalize="characters"
                      value={couponCode}
                      onChangeText={v => { setCouponCode(v); setCouponError(null); }}
                      onSubmitEditing={handleApplyCoupon}
                    />
                    <TouchableOpacity
                      style={[styles.couponBtn, (!couponCode.trim() || couponLoading) && styles.couponBtnDisabled]}
                      onPress={handleApplyCoupon}
                      disabled={!couponCode.trim() || couponLoading}
                    >
                      <Text style={styles.couponBtnText}>{couponLoading ? '…' : 'Apply'}</Text>
                    </TouchableOpacity>
                  </View>
                  {couponError ? (
                    <Text style={styles.couponError}>{couponError}</Text>
                  ) : null}
                </>
              )}
            </View>

            {/* Order summary */}
            <View style={styles.summaryWrap}>
              <LinearGradient colors={['#1C2F45', '#152236']} style={styles.summaryCard}>
                <View style={styles.summaryGoldLine} />
                <Text style={styles.summaryTitle}>Order Summary</Text>
                {[
                  ['Subtotal', `₹${subtotal.toLocaleString('en-IN')}`],
                  ['Shipping', 'Free'],
                  ['Platform fee', `₹${PLATFORM_FEE}`],
                  ...(discount > 0 ? [['Coupon discount', `-₹${discount.toLocaleString('en-IN')}`]] : []),
                ].map(([k, v]) => (
                  <View key={k} style={styles.summaryRow}>
                    <Text style={[styles.summaryKey, k === 'Coupon discount' && { color: Colors.success }]}>{k}</Text>
                    <Text style={[styles.summaryVal, k === 'Coupon discount' && { color: Colors.success }]}>{v}</Text>
                  </View>
                ))}
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryTotalKey}>Total</Text>
                  <Text style={styles.summaryTotal}>₹{grandTotal.toLocaleString('en-IN')}</Text>
                </View>
              </LinearGradient>
            </View>

            {/* Trust */}
            <View style={styles.trust}>
              {[['🔒', 'Secure Checkout'], ['✅', 'Buyer Protection'], ['↩️', '7-Day Returns']].map(([i, l]) => (
                <View key={l as string} style={styles.trustItem}>
                  <Text>{i}</Text>
                  <Text style={styles.trustText}>{l as string}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.bottomBar}>
            <View style={styles.bottomTotal}>
              <Text style={styles.bottomLabel}>{discount > 0 ? `Total (saved ₹${discount.toLocaleString('en-IN')})` : 'Total'}</Text>
              <Text style={styles.bottomPrice}>₹{grandTotal.toLocaleString('en-IN')}</Text>
            </View>
            <GoldButton label="Proceed to Checkout" onPress={() => router.push('/checkout' as any)} size="lg" />
          </View>
        </>
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Shared header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backIcon: { color: Colors.gold, fontSize: 22 },
  title: { ...Typography.display, fontSize: 22 },
  count: { ...Typography.caption, fontSize: 13 },

  // Cart items
  items: { padding: Spacing.md, gap: Spacing.sm },
  cartItem: { flexDirection: 'row', gap: Spacing.md, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  itemImg: { width: 110, height: 110 },
  itemBody: { flex: 1, padding: Spacing.md, gap: 3 },
  itemTitle: { ...Typography.heading, fontSize: 16, lineHeight: 20 },
  itemUnitPrice: { ...Typography.caption, fontSize: 11, color: Colors.creamDim },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  qtyBtn: {
    width: 28, height: 28, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnDisabled: { opacity: 0.35 },
  qtyBtnText: { ...Typography.bodySemibold, fontSize: 16, color: Colors.gold, lineHeight: 18 },
  qtyValue: { ...Typography.bodySemibold, fontSize: 14, minWidth: 18, textAlign: 'center' },
  itemArtist: { ...Typography.caption, fontSize: 12 },
  itemMedium: { ...Typography.caption, fontSize: 11, color: Colors.creamFaint },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xs },
  itemPrice: { ...Typography.bodyBold, fontSize: 16, color: Colors.gold },
  removeText: { ...Typography.caption, fontSize: 12, color: Colors.error },

  // Order summary card
  summaryWrap: { paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  summaryCard: { borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderGold },
  summaryGoldLine: { width: 32, height: 2, backgroundColor: Colors.gold, marginBottom: Spacing.md },
  summaryTitle: { ...Typography.heading, fontSize: 20, marginBottom: Spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  summaryKey: { ...Typography.caption, fontSize: 13 },
  summaryVal: { ...Typography.bodySemibold, fontSize: 13 },
  summaryDivider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  summaryTotalKey: { ...Typography.bodyBold, fontSize: 16 },
  summaryTotal: { ...Typography.display, fontSize: 22, color: Colors.gold },

  // Trust
  trust: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: Spacing.md, marginBottom: Spacing.lg },
  trustItem: { alignItems: 'center', gap: 4 },
  trustText: { ...Typography.caption, fontSize: 10, textAlign: 'center' },

  // Bottom bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.bgElevated, borderTopWidth: 1, borderTopColor: Colors.borderGold, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, paddingBottom: 28, gap: Spacing.md },
  bottomTotal: { flex: 1 },
  bottomLabel: { ...Typography.label, fontSize: 9, color: Colors.creamDim },
  bottomPrice: { ...Typography.bodyBold, fontSize: 18, color: Colors.gold },

  // Empty
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.sm, marginTop: -40 },
  emptyIcon: { fontSize: 64 },
  emptyTitle: { ...Typography.display, fontSize: 24, color: Colors.cream },
  emptySubtitle: { ...Typography.body, fontSize: 14, color: Colors.creamDim, textAlign: 'center', lineHeight: 20, paddingHorizontal: Spacing.md },
  emptyBtn: { marginTop: Spacing.md, borderBottomWidth: 1.5, borderBottomColor: Colors.gold, paddingVertical: Spacing.xs },
  emptyBtnText: { ...Typography.bodySemibold, fontSize: 14, color: Colors.gold },

  // Section title (checkout + confirmed)
  sectionTitle: { ...Typography.label, fontSize: 11, color: Colors.gold, marginBottom: Spacing.sm },

  // Form card
  formCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginBottom: Spacing.sm },
  formField: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  formFieldBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  formLabel: { ...Typography.caption, fontSize: 11, color: Colors.gold, marginBottom: 2 },
  formInput: { ...Typography.body, fontSize: 15, color: Colors.cream, paddingVertical: Spacing.xs },
  formInputMulti: { minHeight: 64, textAlignVertical: 'top' },

  // COD card
  codCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.gold, padding: Spacing.md, marginBottom: Spacing.sm },
  codBadge: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  codBadgeText: { ...Typography.bodyBold, fontSize: 13, color: '#0D1B2A' },
  codTitle: { ...Typography.bodySemibold, fontSize: 15, color: Colors.cream },
  codSubtitle: { ...Typography.caption, fontSize: 12, color: Colors.creamDim, marginTop: 2 },
  codCheck: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  codCheckText: { color: '#0D1B2A', fontWeight: '700', fontSize: 14 },
  codNote: { backgroundColor: Colors.bgInput, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  codNoteText: { ...Typography.caption, fontSize: 13, lineHeight: 19, color: Colors.creamDim },

  // Order card (confirmed)
  orderCard: { marginBottom: 0 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs },
  orderKey: { ...Typography.caption, fontSize: 13 },
  orderVal: { ...Typography.bodySemibold, fontSize: 13 },
  codPill: { backgroundColor: Colors.gold + '22', borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.gold, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  codPillText: { ...Typography.label, fontSize: 9, color: Colors.gold },
  deliveryBox: { alignItems: 'center', paddingTop: Spacing.sm, gap: 4 },
  deliveryLabel: { ...Typography.label, fontSize: 10, color: Colors.creamDim },
  deliveryDate: { ...Typography.display, fontSize: 22, color: Colors.gold, textAlign: 'center' },
  deliveryNote: { ...Typography.caption, fontSize: 12, color: Colors.creamDim },

  // Success header (confirmed)
  successHeader: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  successCircle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.gold },
  successCheckmark: { fontSize: 40, color: Colors.gold, fontWeight: '700' },
  successTitle: { ...Typography.display, fontSize: 28, color: Colors.cream },
  successSubtitle: { ...Typography.body, fontSize: 14, color: Colors.creamDim, textAlign: 'center', lineHeight: 20, paddingHorizontal: Spacing.lg },

  // Confirmed items
  confirmedItems: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  confirmedItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  confirmedItemImg: { width: 56, height: 56, borderRadius: Radius.sm },
  confirmedItemTitle: { ...Typography.bodySemibold, fontSize: 14, color: Colors.cream },
  confirmedItemArtist: { ...Typography.caption, fontSize: 12 },
  confirmedItemPrice: { ...Typography.bodyBold, fontSize: 14, color: Colors.gold },

  // Address card
  addressCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: 4 },
  addressName: { ...Typography.bodySemibold, fontSize: 15, color: Colors.cream },
  addressLine: { ...Typography.body, fontSize: 13, color: Colors.creamDim },

  // Home button
  homeBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  homeBtnText: { ...Typography.caption, fontSize: 14, color: Colors.gold },

  // Coupon
  couponWrap: { marginHorizontal: Spacing.md, marginBottom: Spacing.md },
  couponRow: { flexDirection: 'row', gap: Spacing.sm },
  couponInput: {
    flex: 1, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    ...Typography.body, fontSize: 14, color: Colors.cream, letterSpacing: 1,
  },
  couponBtn: {
    backgroundColor: Colors.gold, borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, justifyContent: 'center',
  },
  couponBtnDisabled: { backgroundColor: Colors.border },
  couponBtnText: { ...Typography.bodyBold, fontSize: 13, color: Colors.bg },
  couponError: { ...Typography.caption, fontSize: 12, color: Colors.error, marginTop: 4 },
  couponApplied: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.success + '11', borderWidth: 1, borderColor: Colors.success + '44',
    borderRadius: Radius.md, padding: Spacing.md,
  },
  couponAppliedLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  couponAppliedIcon: { fontSize: 22 },
  couponAppliedCode: { ...Typography.bodyBold, fontSize: 14, color: Colors.success, letterSpacing: 1 },
  couponAppliedSaving: { ...Typography.caption, fontSize: 12, color: Colors.success },
  couponRemove: { ...Typography.caption, fontSize: 12, color: Colors.error },
});
