import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { orderService } from '@/services/orderService';
import { addressService } from '@/services/addressService';
import { CouponService, type Coupon } from '@/services/couponService';
import type { Address, AddressPayload, CheckoutSummary } from '@/types';
import { useCart } from '@/context/AppContext';

export default function CheckoutScreen() {
  const { cart, clearCart, cartTotal } = useCart();
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  // Session & Summary
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [summary, setSummary] = useState<CheckoutSummary | null>(null);

  // Address State
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<AddressPayload>({
    name: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    country: 'India',
    zipCode: '',
    isDefault: false,
  });

  // Coupons State
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [publicCoupons, setPublicCoupons] = useState<Coupon[]>([]);

  // Delivery option
  const [deliverySpeed, setDeliverySpeed] = useState<'free' | 'express'>('free');

  useEffect(() => {
    initCheckout();
  }, []);

  const initCheckout = async () => {
    setLoading(true);
    try {
      // 1. Create or get session
      const sess = await orderService.createCheckoutSession();
      if (sess && sess.id) {
        setSessionId(sess.id);
      }

      // 2. Fetch addresses
      const addrList = await addressService.getAddresses();
      setAddresses(addrList);
      if (addrList.length > 0) {
        const def = addrList.find((a) => a.isDefault) || addrList[0];
        setSelectedAddressId(def.id);
      }

      // 3. Fetch public coupons
      const coupons = await CouponService.getCoupons();
      setPublicCoupons(coupons);

      // 4. Fetch summary
      await fetchSummary();
    } catch (err: any) {
      console.warn('[Checkout] Initialization error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const sum = await orderService.getCheckoutSummary();
      if (sum) {
        setSummary(sum);
        if (sum.appliedCoupon) {
          setAppliedCoupon({
            code: sum.appliedCoupon.code,
            discount: sum.appliedCoupon.discountApplied,
          });
        } else {
          setAppliedCoupon(null);
        }
      }
    } catch (err: any) {
      console.warn('[Checkout] Error fetching summary:', err.message);
    }
  };

  const handleSaveAddress = async () => {
    if (!addressForm.name || !addressForm.phone || !addressForm.street || !addressForm.city || !addressForm.zipCode) {
      Alert.alert('Required Fields', 'Please fill in all address details.');
      return;
    }

    try {
      if (editingAddressId) {
        const updated = await addressService.updateAddress(editingAddressId, addressForm);
        setAddresses((prev) => prev.map((a) => (a.id === editingAddressId ? updated : a)));
      } else {
        const created = await addressService.addAddress(addressForm);
        setAddresses((prev) => [...prev, created]);
        setSelectedAddressId(created.id);
      }
      setShowAddressForm(false);
      setEditingAddressId(null);
      setAddressForm({
        name: '',
        phone: '',
        street: '',
        city: '',
        state: '',
        country: 'India',
        zipCode: '',
        isDefault: false,
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save address');
    }
  };

  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = (codeToApply || couponCode).trim();
    if (!code) return;
    if (!sessionId) {
      Alert.alert('Please wait', 'Checkout session is initializing...');
      return;
    }

    setApplyingCoupon(true);
    try {
      await orderService.applyCoupon(sessionId, code);
      Alert.alert('Success', `Coupon ${code.toUpperCase()} applied!`);
      setCouponCode('');
      await fetchSummary();
    } catch (err: any) {
      Alert.alert('Coupon Error', err.message || 'Invalid coupon code');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    if (!sessionId) return;
    try {
      await orderService.removeCoupon(sessionId);
      setAppliedCoupon(null);
      await fetchSummary();
      Alert.alert('Removed', 'Coupon removed.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to remove coupon');
    }
  };

  const handleProceedToPayment = async () => {
    if (!selectedAddressId) {
      Alert.alert('Delivery Address', 'Please select or add a delivery address to proceed.');
      return;
    }

    if (!sessionId) {
      Alert.alert('Error', 'Checkout session not initialized.');
      return;
    }

    setPlacing(true);
    try {
      // Attach address to session
      await orderService.attachAddressToSession(sessionId, selectedAddressId);

      // Navigate to payment screen with session params
      router.push({
        pathname: '/checkout/payment' as any,
        params: {
          sessionId,
          addressId: selectedAddressId,
          total: grandTotal.toString(),
        },
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to process address selection');
    } finally {
      setPlacing(false);
    }
  };

  const subtotal = summary?.subtotal ?? cartTotal;
  const shipping = summary?.shipping ?? (deliverySpeed === 'express' ? 299 : 0);
  const discount = summary?.discount ?? (appliedCoupon?.discount || 0);
  const grandTotal = summary?.grandTotal ?? (subtotal + shipping - discount);

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.gold} />
        <Text style={styles.loadingText}>Preparing Checkout...</Text>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.bg }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Delivery Address Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Delivery Address</Text>
              {!showAddressForm && (
                <TouchableOpacity
                  onPress={() => {
                    setEditingAddressId(null);
                    setAddressForm({
                      name: '',
                      phone: '',
                      street: '',
                      city: '',
                      state: '',
                      country: 'India',
                      zipCode: '',
                      isDefault: false,
                    });
                    setShowAddressForm(true);
                  }}
                >
                  <Text style={styles.addAddrText}>+ Add New</Text>
                </TouchableOpacity>
              )}
            </View>

            {showAddressForm ? (
              <View style={styles.addressFormContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor={Colors.creamDim}
                  value={addressForm.name}
                  onChangeText={(v) => setAddressForm((p) => ({ ...p, name: v }))}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  placeholderTextColor={Colors.creamDim}
                  keyboardType="phone-pad"
                  value={addressForm.phone}
                  onChangeText={(v) => setAddressForm((p) => ({ ...p, phone: v }))}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Street Address / Building"
                  placeholderTextColor={Colors.creamDim}
                  value={addressForm.street}
                  onChangeText={(v) => setAddressForm((p) => ({ ...p, street: v }))}
                />
                <View style={styles.formRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginRight: 8 }]}
                    placeholder="City"
                    placeholderTextColor={Colors.creamDim}
                    value={addressForm.city}
                    onChangeText={(v) => setAddressForm((p) => ({ ...p, city: v }))}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="State"
                    placeholderTextColor={Colors.creamDim}
                    value={addressForm.state}
                    onChangeText={(v) => setAddressForm((p) => ({ ...p, state: v }))}
                  />
                </View>
                <View style={styles.formRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginRight: 8 }]}
                    placeholder="Pincode / Zip"
                    placeholderTextColor={Colors.creamDim}
                    keyboardType="numeric"
                    value={addressForm.zipCode}
                    onChangeText={(v) => setAddressForm((p) => ({ ...p, zipCode: v }))}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Country"
                    placeholderTextColor={Colors.creamDim}
                    value={addressForm.country}
                    onChangeText={(v) => setAddressForm((p) => ({ ...p, country: v }))}
                  />
                </View>

                <View style={styles.formActionRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddressForm(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAddress}>
                    <Text style={styles.saveBtnText}>Save Address</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : addresses.length === 0 ? (
              <View style={styles.emptyAddrBox}>
                <Text style={styles.emptyAddrText}>No saved addresses found.</Text>
                <TouchableOpacity
                  style={styles.addFirstAddrBtn}
                  onPress={() => setShowAddressForm(true)}
                >
                  <Text style={styles.addFirstAddrText}>+ Add Shipping Address</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.addressList}>
                {addresses.map((addr) => {
                  const isSelected = selectedAddressId === addr.id;
                  return (
                    <TouchableOpacity
                      key={addr.id}
                      style={[styles.addressItemCard, isSelected && styles.addressItemCardSelected]}
                      onPress={() => setSelectedAddressId(addr.id)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.addrName}>{addr.name} • {addr.phone}</Text>
                        <Text style={styles.addrStreet}>{addr.street}</Text>
                        <Text style={styles.addrSub}>{addr.city}, {addr.state} - {addr.zipCode}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Delivery Speed Options */}
            <Text style={[styles.subSectionTitle, { marginTop: Spacing.md }]}>Delivery Speed</Text>
            <View style={styles.deliveryRow}>
              <TouchableOpacity
                style={[styles.deliveryOption, deliverySpeed === 'free' && styles.deliveryOptionActive]}
                onPress={() => setDeliverySpeed('free')}
              >
                <Text style={styles.deliveryTitle}>Standard (Free)</Text>
                <Text style={styles.deliverySub}>5–7 Business Days</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deliveryOption, deliverySpeed === 'express' && styles.deliveryOptionActive]}
                onPress={() => setDeliverySpeed('express')}
              >
                <Text style={styles.deliveryTitle}>Express (₹299)</Text>
                <Text style={styles.deliverySub}>2–3 Business Days</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Coupons Section */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Coupons & Promo Offers</Text>
            {appliedCoupon ? (
              <View style={styles.appliedCouponBox}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.appliedCouponCode}>✓ {appliedCoupon.code}</Text>
                  <Text style={styles.appliedCouponDiscount}>Saving ₹{appliedCoupon.discount.toLocaleString('en-IN')}</Text>
                </View>
                <TouchableOpacity onPress={handleRemoveCoupon}>
                  <Text style={styles.removeCouponText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.couponInputRow}>
                <TextInput
                  style={styles.couponInput}
                  placeholder="Enter Coupon Code"
                  placeholderTextColor={Colors.creamDim}
                  autoCapitalize="characters"
                  value={couponCode}
                  onChangeText={(v) => setCouponCode(v.toUpperCase())}
                />
                <TouchableOpacity
                  style={[styles.applyCouponBtn, (!couponCode.trim() || applyingCoupon) && { opacity: 0.5 }]}
                  onPress={() => handleApplyCoupon()}
                  disabled={!couponCode.trim() || applyingCoupon}
                >
                  {applyingCoupon ? (
                    <ActivityIndicator size="small" color="#0D1B2A" />
                  ) : (
                    <Text style={styles.applyCouponBtnText}>Apply</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {publicCoupons.length > 0 && !appliedCoupon && (
              <View style={{ marginTop: Spacing.sm }}>
                <Text style={styles.availableCouponsTitle}>Available Offers:</Text>
                {publicCoupons.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.publicCouponCard}
                    onPress={() => handleApplyCoupon(c.code)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.publicCouponCode}>{c.code}</Text>
                      <Text style={styles.publicCouponDesc}>
                        {c.description ||
                          (c.discountType === 'percentage'
                            ? `${c.discount}% Off`
                            : `₹${c.discount} Off`)}
                      </Text>
                    </View>
                    <Text style={styles.applyQuickText}>Apply Code</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Order Summary */}
          <LinearGradient colors={['#1C2F45', '#152236']} style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Price Details</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Subtotal</Text>
              <Text style={styles.summaryVal}>₹{subtotal.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Delivery</Text>
              <Text style={[styles.summaryVal, shipping === 0 && { color: '#2E7D32' }]}>
                {shipping === 0 ? 'FREE' : `₹${shipping}`}
              </Text>
            </View>
            {discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryKey, { color: '#2E7D32' }]}>Discount</Text>
                <Text style={[styles.summaryVal, { color: '#2E7D32' }]}>-₹{discount.toLocaleString('en-IN')}</Text>
              </View>
            )}
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalKey}>Grand Total</Text>
              <Text style={styles.totalVal}>₹{grandTotal.toLocaleString('en-IN')}</Text>
            </View>
          </LinearGradient>
        </ScrollView>

        {/* Fixed Bottom Bar */}
        <View style={styles.bottomBar}>
          <View style={styles.bottomTotalBox}>
            <Text style={styles.bottomLabel}>Total Payable</Text>
            <Text style={styles.bottomPrice}>₹{grandTotal.toLocaleString('en-IN')}</Text>
          </View>
          <GoldButton
            label={placing ? 'Processing...' : 'Proceed to Payment'}
            onPress={handleProceedToPayment}
            disabled={placing}
            size="lg"
          />
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
    fontWeight: '600',
  },
  headerTitle: {
    ...Typography.display,
    fontSize: 18,
    color: Colors.cream,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 120,
  },
  sectionCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.bodyBold,
    fontSize: 15,
    color: Colors.cream,
  },
  subSectionTitle: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.gold,
    fontWeight: '600',
  },
  addAddrText: {
    ...Typography.bodySemibold,
    fontSize: 13,
    color: Colors.gold,
  },
  emptyAddrBox: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  emptyAddrText: {
    ...Typography.caption,
    fontSize: 13,
    color: Colors.creamDim,
    marginBottom: Spacing.sm,
  },
  addFirstAddrBtn: {
    backgroundColor: Colors.gold + '22',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  addFirstAddrText: {
    ...Typography.bodyBold,
    fontSize: 13,
    color: Colors.gold,
  },
  addressList: {
    gap: Spacing.xs,
  },
  addressItemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgInput,
    gap: Spacing.sm,
  },
  addressItemCardSelected: {
    borderColor: Colors.gold,
    backgroundColor: Colors.gold + '11',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: Colors.creamDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioCircleSelected: {
    borderColor: Colors.gold,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.gold,
  },
  addrName: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: Colors.cream,
  },
  addrStreet: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.creamDim,
    marginTop: 2,
  },
  addrSub: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.creamDim,
  },
  addressFormContainer: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.bgInput,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    ...Typography.body,
    fontSize: 14,
    color: Colors.cream,
  },
  formRow: {
    flexDirection: 'row',
  },
  formActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  cancelBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
  },
  cancelBtnText: {
    ...Typography.bodySemibold,
    fontSize: 13,
    color: Colors.creamDim,
  },
  saveBtn: {
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
  },
  saveBtnText: {
    ...Typography.bodyBold,
    fontSize: 13,
    color: '#0D1B2A',
  },
  deliveryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  deliveryOption: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgInput,
  },
  deliveryOptionActive: {
    borderColor: Colors.gold,
    backgroundColor: Colors.gold + '11',
  },
  deliveryTitle: {
    ...Typography.bodyBold,
    fontSize: 13,
    color: Colors.cream,
  },
  deliverySub: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.creamDim,
    marginTop: 2,
  },
  couponInputRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  couponInput: {
    flex: 1,
    backgroundColor: Colors.bgInput,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    ...Typography.bodyBold,
    fontSize: 14,
    color: Colors.cream,
    letterSpacing: 1,
  },
  applyCouponBtn: {
    backgroundColor: Colors.gold,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyCouponBtnText: {
    ...Typography.bodyBold,
    fontSize: 13,
    color: '#0D1B2A',
  },
  appliedCouponBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D3222',
    borderWidth: 1,
    borderColor: '#2E7D32',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  appliedCouponCode: {
    ...Typography.bodyBold,
    fontSize: 13,
    color: '#4CAF50',
  },
  appliedCouponDiscount: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.creamDim,
  },
  removeCouponText: {
    ...Typography.bodyBold,
    fontSize: 12,
    color: '#FF5252',
  },
  availableCouponsTitle: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.gold,
    marginTop: Spacing.xs,
    marginBottom: 4,
  },
  publicCouponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    backgroundColor: Colors.bgInput,
    marginBottom: 4,
  },
  publicCouponCode: {
    ...Typography.bodyBold,
    fontSize: 12,
    color: Colors.gold,
  },
  publicCouponDesc: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.creamDim,
  },
  applyQuickText: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.gold,
    fontWeight: '700',
  },
  summaryCard: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryTitle: {
    ...Typography.bodyBold,
    fontSize: 15,
    color: Colors.cream,
    marginBottom: Spacing.sm,
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
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs,
  },
  totalKey: {
    ...Typography.bodyBold,
    fontSize: 15,
    color: Colors.cream,
  },
  totalVal: {
    ...Typography.display,
    fontSize: 18,
    color: Colors.gold,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  bottomTotalBox: {},
  bottomLabel: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.creamDim,
  },
  bottomPrice: {
    ...Typography.display,
    fontSize: 18,
    color: Colors.gold,
  },
});
