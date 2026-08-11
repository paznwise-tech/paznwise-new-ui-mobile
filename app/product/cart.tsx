import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { useCart } from '@/context/AppContext';
import { OrderService } from '@/services/orderService';
import { CouponService, AppliedCoupon } from '@/services/couponService';
import type { CartItem } from '@/types';

// ── Types ────────────────────────────────────────────────────────────────────

type CheckoutStep = 'cart' | 'checkout' | 'confirmed';

interface DeliveryAddress {
  name: string;
  phone: string;
  line1: string;
  city: string;
  pincode: string;
}

interface PlacedOrder {
  id: string;
  items: CartItem[];
  subtotal: number;
  platformFee: number;
  total: number;
  estimatedDelivery: Date;
  address: DeliveryAddress;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const PLATFORM_FEE = 49;

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDeliveryDate(d: Date) {
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'numeric';
  maxLength?: number;
  multiline?: boolean;
  last?: boolean;
}

function FormField({ label, value, onChangeText, placeholder, keyboardType = 'default', maxLength, multiline, last }: FormFieldProps) {
  return (
    <View style={[styles.formField, !last && styles.formFieldBorder]}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        style={[styles.formInput, multiline && styles.formInputMulti]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.creamFaint}
        keyboardType={keyboardType}
        maxLength={maxLength}
        multiline={multiline}
        returnKeyType={last ? 'done' : 'next'}
      />
    </View>
  );
}

interface CheckoutScreenProps {
  addr: DeliveryAddress;
  setAddr: React.Dispatch<React.SetStateAction<DeliveryAddress>>;
  subtotal: number;
  grandTotal: number;
  itemCount: number;
  submitting: boolean;
  onBack: () => void;
  onPlaceOrder: () => void;
}

function CheckoutScreen({ addr, setAddr, subtotal, grandTotal, itemCount, submitting, onBack, onPlaceOrder }: CheckoutScreenProps) {
  const u = (k: keyof DeliveryAddress) => (v: string) => setAddr(a => ({ ...a, [k]: v }));

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Checkout</Text>
          <Text style={styles.count}>{itemCount} {itemCount === 1 ? 'item' : 'items'}</Text>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 150 }}>

        {/* Delivery Details */}
        <Text style={styles.sectionTitle}>Delivery Details</Text>
        <View style={styles.formCard}>
          <FormField label="Full Name" value={addr.name} onChangeText={u('name')} placeholder="Enter your full name" />
          <FormField label="Phone Number" value={addr.phone} onChangeText={u('phone')} placeholder="10-digit mobile number" keyboardType="phone-pad" maxLength={10} />
          <FormField label="Address" value={addr.line1} onChangeText={u('line1')} placeholder="House / flat, street, area" multiline />
          <FormField label="City" value={addr.city} onChangeText={u('city')} placeholder="City / District" />
          <FormField label="Pincode" value={addr.pincode} onChangeText={u('pincode')} placeholder="6-digit pincode" keyboardType="numeric" maxLength={6} last />
        </View>

        {/* Payment Method */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Payment Method</Text>
        <View style={styles.codCard}>
          <LinearGradient colors={[Colors.gold, '#A07828']} style={styles.codBadge}>
            <Text style={styles.codBadgeText}>COD</Text>
          </LinearGradient>
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Text style={styles.codTitle}>Cash on Delivery</Text>
            <Text style={styles.codSubtitle}>Pay ₹{grandTotal.toLocaleString('en-IN')} when your order arrives</Text>
          </View>
          <View style={styles.codCheck}>
            <Text style={styles.codCheckText}>✓</Text>
          </View>
        </View>

        <View style={styles.codNote}>
          <Text style={styles.codNoteText}>
            💡  Keep the exact amount ready at delivery. Our partner will collect the payment at your doorstep.
          </Text>
        </View>

        {/* Mini summary */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Order Total</Text>
        <LinearGradient colors={['#1C2F45', '#152236']} style={styles.summaryCard}>
          <View style={styles.summaryGoldLine} />
          {[['Subtotal', `₹${subtotal.toLocaleString('en-IN')}`], ['Shipping', 'Free'], ['Platform fee', `₹${PLATFORM_FEE}`]].map(([k, v]) => (
            <View key={k} style={styles.summaryRow}>
              <Text style={styles.summaryKey}>{k}</Text>
              <Text style={styles.summaryVal}>{v}</Text>
            </View>
          ))}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalKey}>Total (COD)</Text>
            <Text style={styles.summaryTotal}>₹{grandTotal.toLocaleString('en-IN')}</Text>
          </View>
        </LinearGradient>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomTotal}>
          <Text style={styles.bottomLabel}>Pay on Delivery</Text>
          <Text style={styles.bottomPrice}>₹{grandTotal.toLocaleString('en-IN')}</Text>
        </View>
        <GoldButton label={submitting ? 'Placing Order…' : 'Place Order'} onPress={onPlaceOrder} size="lg" />
      </View>
    </KeyboardAvoidingView>
  );
}

interface ConfirmedScreenProps {
  order: PlacedOrder;
}

function ConfirmedScreen({ order }: ConfirmedScreenProps) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 60 }}>

        {/* Success header */}
        <View style={styles.successHeader}>
          <LinearGradient colors={[Colors.gold + '44', Colors.gold + '11']} style={styles.successCircle}>
            <Text style={styles.successCheckmark}>✓</Text>
          </LinearGradient>
          <Text style={styles.successTitle}>Order Confirmed!</Text>
          <Text style={styles.successSubtitle}>Your order has been placed successfully. Pay cash when it arrives.</Text>
        </View>

        {/* Order ID + Delivery */}
        <LinearGradient colors={['#1C2F45', '#152236']} style={[styles.summaryCard, styles.orderCard]}>
          <View style={styles.summaryGoldLine} />

          <View style={styles.orderRow}>
            <Text style={styles.orderKey}>Order ID</Text>
            <Text style={styles.orderVal}>{order.id}</Text>
          </View>
          <View style={styles.orderRow}>
            <Text style={styles.orderKey}>Payment</Text>
            <View style={styles.codPill}>
              <Text style={styles.codPillText}>Cash on Delivery</Text>
            </View>
          </View>
          <View style={styles.orderRow}>
            <Text style={styles.orderKey}>Amount Due</Text>
            <Text style={styles.orderVal}>₹{order.total.toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.deliveryBox}>
            <Text style={styles.deliveryLabel}>Estimated Delivery</Text>
            <Text style={styles.deliveryDate}>{formatDeliveryDate(order.estimatedDelivery)}</Text>
            <Text style={styles.deliveryNote}>Your package will arrive by this date</Text>
          </View>
        </LinearGradient>

        {/* Items */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Items Ordered</Text>
        <View style={styles.confirmedItems}>
          {order.items.map((item, idx) => (
            <View key={idx} style={styles.confirmedItem}>
              <Image source={{ uri: item.img }} style={styles.confirmedItemImg} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.confirmedItemTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.confirmedItemArtist}>{item.artist}</Text>
              </View>
              <Text style={styles.confirmedItemPrice}>₹{item.price.toLocaleString('en-IN')}</Text>
            </View>
          ))}
        </View>

        {/* Delivery address */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Delivering To</Text>
        <View style={styles.addressCard}>
          <Text style={styles.addressName}>{order.address.name}</Text>
          <Text style={styles.addressLine}>{order.address.phone}</Text>
          <Text style={styles.addressLine}>{order.address.line1}</Text>
          <Text style={styles.addressLine}>{order.address.city} – {order.address.pincode}</Text>
        </View>

        {/* CTAs */}
        <View style={{ gap: Spacing.sm, marginTop: Spacing.xl }}>
          <GoldButton
            label="Track My Order"
            onPress={() => router.push({
              pathname: '/order-tracking',
              params: { orderId: order.id, estimatedDelivery: formatDeliveryDate(order.estimatedDelivery) },
            } as any)}
            fullWidth
            size="lg"
          />
          <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(tabs)/browse' as any)}>
            <Text style={styles.homeBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Main Cart Screen ─────────────────────────────────────────────────────────

export default function Cart() {
  const { cart, removeFromCart, cartTotal, clearCart } = useCart();

  const [step, setStep] = useState<CheckoutStep>('cart');
  const [addr, setAddr] = useState<DeliveryAddress>({ name: '', phone: '', line1: '', city: '', pincode: '' });
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const subtotal = cartTotal;
  const discount = appliedCoupon?.discountAmount ?? 0;
  const grandTotal = subtotal + PLATFORM_FEE - discount;
  const isEmpty = cart.length === 0;

  const handlePlaceOrder = useCallback(async () => {
    if (!addr.name.trim() || !addr.phone.trim() || !addr.line1.trim() || !addr.city.trim() || !addr.pincode.trim()) {
      alert('Please fill in all delivery details.');
      return;
    }
    if (addr.phone.trim().length < 10) {
      alert('Please enter a valid 10-digit phone number.');
      return;
    }
    if (addr.pincode.trim().length !== 6) {
      alert('Please enter a valid 6-digit pincode.');
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    const fallbackDelivery = new Date();
    fallbackDelivery.setDate(fallbackDelivery.getDate() + 7);

    try {
      const order = await OrderService.createOrder(cart, addr, PLATFORM_FEE);
      const estimatedDelivery = order.estimatedDelivery
        ? new Date(order.estimatedDelivery)
        : fallbackDelivery;

      setPlacedOrder({
        id: order.id,
        items: [...cart],
        subtotal,
        platformFee: PLATFORM_FEE,
        total: grandTotal,
        estimatedDelivery,
        address: { ...addr },
      });
    } catch {
      // Fall back to a local order ID if the API is unavailable
      setPlacedOrder({
        id: `ORD-${Math.floor(10000000 + Math.random() * 90000000)}`,
        items: [...cart],
        subtotal,
        platformFee: PLATFORM_FEE,
        total: grandTotal,
        estimatedDelivery: fallbackDelivery,
        address: { ...addr },
      });
    } finally {
      setSubmitting(false);
      clearCart();
      setStep('confirmed');
    }
  }, [addr, cart, subtotal, grandTotal, clearCart, submitting]);

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

  if (step === 'confirmed' && placedOrder) {
    return <ConfirmedScreen order={placedOrder} />;
  }

  if (step === 'checkout') {
    return (
      <CheckoutScreen
        addr={addr}
        setAddr={setAddr}
        subtotal={subtotal}
        grandTotal={grandTotal}
        itemCount={cart.length}
        submitting={submitting}
        onBack={() => setStep('cart')}
        onPlaceOrder={handlePlaceOrder}
      />
    );
  }

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

      {isEmpty ? (
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
                    <Text style={styles.itemArtist}>{item.artist}</Text>
                    {item.medium && <Text style={styles.itemMedium}>{item.medium}</Text>}
                    <View style={styles.itemFooter}>
                      <Text style={styles.itemPrice}>₹{item.price.toLocaleString('en-IN')}</Text>
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
