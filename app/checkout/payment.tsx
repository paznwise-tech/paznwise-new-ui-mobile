import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { orderService } from '@/services/orderService';
import { useCart } from '@/context/AppContext';

type PaymentMethod = 'UPI' | 'CARD' | 'NET_BANKING' | 'COD';

export default function PaymentScreen() {
  const params = useLocalSearchParams<{ sessionId: string; addressId: string; total: string }>();
  const { clearCart } = useCart();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [upiId, setUpiId] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [placing, setPlacing] = useState(false);

  const handlePlaceOrder = async () => {
    if (!agreed) {
      Alert.alert('Terms & Policy', 'Please agree to the Terms of Service to place your order.');
      return;
    }

    if (!params.sessionId) {
      Alert.alert('Session Missing', 'Checkout session error. Please go back and try again.');
      return;
    }

    setPlacing(true);
    try {
      const res = await orderService.completeCheckout(params.sessionId, paymentMethod);
      clearCart();

      const orderId = res.orderId || res.id || 'unknown';
      router.replace({
        pathname: '/checkout/confirmed' as any,
        params: { orderId },
      });
    } catch (err: any) {
      console.error('[Payment] Place order failed:', err);
      Alert.alert('Payment Failed', err.message || 'Could not complete checkout. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Payment</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Total Banner */}
        <LinearGradient colors={['#1C2F45', '#152236']} style={styles.totalBanner}>
          <Text style={styles.totalLabel}>Total Payable Amount</Text>
          <Text style={styles.totalAmount}>₹{Number(params.total || 0).toLocaleString('en-IN')}</Text>
        </LinearGradient>

        {/* Payment Method Selector */}
        <Text style={styles.sectionTitle}>Choose Payment Method</Text>

        <View style={styles.methodTabs}>
          {(
            [
              { key: 'UPI', label: 'UPI' },
              { key: 'CARD', label: 'Card' },
              { key: 'NET_BANKING', label: 'Banking' },
              { key: 'COD', label: 'COD' },
            ] as const
          ).map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.methodTab, paymentMethod === m.key && styles.methodTabActive]}
              onPress={() => setPaymentMethod(m.key)}
            >
              <Text
                style={[
                  styles.methodTabText,
                  paymentMethod === m.key && styles.methodTabTextActive,
                ]}
              >
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* UPI Details */}
        {paymentMethod === 'UPI' && (
          <View style={styles.methodCard}>
            <Text style={styles.methodTitle}>Instant UPI Payment</Text>
            <View style={styles.upiAppsRow}>
              {[
                { name: 'GPay', bg: '#4285F4' },
                { name: 'PhonePe', bg: '#5F259F' },
                { name: 'Paytm', bg: '#00B9F1' },
              ].map((app) => (
                <TouchableOpacity key={app.name} style={styles.upiAppBtn}>
                  <View style={[styles.upiAppIcon, { backgroundColor: app.bg }]}>
                    <Text style={styles.upiAppIconText}>{app.name[0]}</Text>
                  </View>
                  <Text style={styles.upiAppName}>{app.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.orText}>— OR ENTER VPA —</Text>
            <TextInput
              style={styles.input}
              placeholder="username@upi"
              placeholderTextColor={Colors.creamDim}
              value={upiId}
              onChangeText={setUpiId}
            />
          </View>
        )}

        {/* Card Details */}
        {paymentMethod === 'CARD' && (
          <View style={styles.methodCard}>
            <Text style={styles.methodTitle}>Credit or Debit Card</Text>
            <TextInput
              style={styles.input}
              placeholder="Card Number (16-digits)"
              placeholderTextColor={Colors.creamDim}
              keyboardType="numeric"
              maxLength={16}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="MM/YY"
                placeholderTextColor={Colors.creamDim}
                keyboardType="numeric"
                maxLength={5}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="CVV"
                placeholderTextColor={Colors.creamDim}
                keyboardType="numeric"
                secureTextEntry
                maxLength={4}
              />
            </View>
          </View>
        )}

        {/* Net Banking */}
        {paymentMethod === 'NET_BANKING' && (
          <View style={styles.methodCard}>
            <Text style={styles.methodTitle}>Popular Indian Banks</Text>
            <View style={styles.banksGrid}>
              {['SBI', 'HDFC', 'ICICI', 'Axis', 'Kotak', 'PNB'].map((bank) => (
                <TouchableOpacity key={bank} style={styles.bankItem}>
                  <Text style={styles.bankItemText}>{bank}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Cash on Delivery */}
        {paymentMethod === 'COD' && (
          <View style={styles.methodCard}>
            <Text style={styles.methodTitle}>Cash on Delivery</Text>
            <Text style={styles.methodSub}>
              Pay the exact amount of ₹{Number(params.total || 0).toLocaleString('en-IN')} in cash at your doorstep upon delivery.
            </Text>
          </View>
        )}

        {/* Terms agreement */}
        <TouchableOpacity
          style={styles.agreedRow}
          onPress={() => setAgreed((p) => !p)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
            {agreed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.agreedText}>
            I accept Paznwise Terms of Service & Buyer Protection Policy.
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Place Order Bar */}
      <View style={styles.bottomBar}>
        <GoldButton
          label={placing ? 'Placing Order...' : 'Pay & Confirm Order'}
          onPress={handlePlaceOrder}
          disabled={placing}
          size="lg"
        />
      </View>
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
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  totalBanner: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gold + '44',
    marginBottom: Spacing.lg,
  },
  totalLabel: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.creamDim,
  },
  totalAmount: {
    ...Typography.display,
    fontSize: 26,
    color: Colors.gold,
    marginTop: 4,
  },
  sectionTitle: {
    ...Typography.bodyBold,
    fontSize: 15,
    color: Colors.cream,
    marginBottom: Spacing.sm,
  },
  methodTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: 4,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  methodTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  methodTabActive: {
    backgroundColor: Colors.gold,
  },
  methodTabText: {
    ...Typography.bodyBold,
    fontSize: 12,
    color: Colors.creamDim,
  },
  methodTabTextActive: {
    color: '#0D1B2A',
  },
  methodCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  methodTitle: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: Colors.cream,
    marginBottom: Spacing.sm,
  },
  methodSub: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.creamDim,
    lineHeight: 18,
  },
  upiAppsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.sm,
  },
  upiAppBtn: {
    alignItems: 'center',
  },
  upiAppIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upiAppIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  upiAppName: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.creamDim,
    marginTop: 4,
  },
  orText: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.creamDim,
    textAlign: 'center',
    marginVertical: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.bgInput,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    ...Typography.body,
    fontSize: 14,
    color: Colors.cream,
  },
  banksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  bankItem: {
    width: '31%',
    backgroundColor: Colors.bgInput,
    paddingVertical: 10,
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bankItemText: {
    ...Typography.bodySemibold,
    fontSize: 12,
    color: Colors.cream,
  },
  agreedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.creamDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
  },
  checkboxActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  checkmark: {
    color: '#0D1B2A',
    fontWeight: 'bold',
    fontSize: 12,
  },
  agreedText: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.creamDim,
    flex: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.md,
  },
});
