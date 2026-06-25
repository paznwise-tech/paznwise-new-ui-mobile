import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/GoldButton';
import { useCart } from '@/context/AppContext';
import { useCallback } from 'react';

export default function Cart() {
  const { cart, removeFromCart, cartTotal, clearCart } = useCart();

  const handleCheckout = useCallback(() => {
    // Perform mock checkout
    alert('Thank you for your order! Your luxury art pieces are secured.');
    clearCart();
    router.replace('/(tabs)');
  }, [clearCart]);

  const isEmpty = cart.length === 0;
  const platformFee = isEmpty ? 0 : 850;
  const grandTotal = isEmpty ? 0 : cartTotal + platformFee;

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
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.replace('/(tabs)/browse')}>
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
                    <Text style={styles.itemMedium}>{item.medium}</Text>
                    <View style={styles.itemFooter}>
                      <Text style={styles.itemPrice}>₹{item.price.toLocaleString('en-IN')}</Text>
                      <TouchableOpacity style={styles.removeBtn} onPress={() => removeFromCart(item.id)}>
                        <Text style={styles.removeText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Summary */}
            <View style={styles.summary}>
              <LinearGradient colors={['#1C2F45', '#152236']} style={styles.summaryCard}>
                <View style={styles.summaryGoldLine} />
                <Text style={styles.summaryTitle}>Order Summary</Text>
                {[
                  ['Subtotal', `₹${cartTotal.toLocaleString('en-IN')}`],
                  ['Shipping', 'Free'],
                  ['Platform fee', `₹${platformFee}`],
                ].map(([k, v]) => (
                  <View key={k} style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>{k}</Text>
                    <Text style={styles.summaryVal}>{v}</Text>
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
              <Text style={styles.bottomLabel}>Total</Text>
              <Text style={styles.bottomPrice}>₹{grandTotal.toLocaleString('en-IN')}</Text>
            </View>
            <GoldButton label="Proceed to Checkout" onPress={handleCheckout} size="lg" />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backIcon: { color: Colors.gold, fontSize: 22 },
  title: { ...Typography.display, fontSize: 22 },
  count: { ...Typography.caption, fontSize: 13 },
  items: { padding: Spacing.md, gap: Spacing.sm },
  cartItem: { flexDirection: 'row', gap: Spacing.md, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  itemImg: { width: 110, height: 110 },
  itemBody: { flex: 1, padding: Spacing.md, gap: 3 },
  itemTitle: { ...Typography.heading, fontSize: 16, lineHeight: 20 },
  itemArtist: { ...Typography.caption, fontSize: 12 },
  itemMedium: { ...Typography.caption, fontSize: 11, color: Colors.creamFaint },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xs },
  itemPrice: { ...Typography.bodyBold, fontSize: 16, color: Colors.gold },
  removeBtn: {},
  removeText: { ...Typography.caption, fontSize: 12, color: Colors.error },
  summary: { paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  summaryCard: { borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderGold },
  summaryGoldLine: { width: 32, height: 2, backgroundColor: Colors.gold, marginBottom: Spacing.md },
  summaryTitle: { ...Typography.heading, fontSize: 20, marginBottom: Spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  summaryKey: { ...Typography.caption, fontSize: 13 },
  summaryVal: { ...Typography.bodySemibold, fontSize: 13 },
  summaryDivider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  summaryTotalKey: { ...Typography.bodyBold, fontSize: 16 },
  summaryTotal: { ...Typography.display, fontSize: 22, color: Colors.gold },
  trust: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: Spacing.md },
  trustItem: { alignItems: 'center', gap: 4 },
  trustText: { ...Typography.caption, fontSize: 10, textAlign: 'center' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.bgElevated, borderTopWidth: 1, borderTopColor: Colors.borderGold, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, paddingBottom: 28, gap: Spacing.md },
  bottomTotal: { flex: 1 },
  bottomLabel: { ...Typography.label, fontSize: 9, color: Colors.creamDim },
  bottomPrice: { ...Typography.bodyBold, fontSize: 18, color: Colors.gold },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.sm, marginTop: -40 },
  emptyIcon: { fontSize: 64 },
  emptyTitle: { ...Typography.display, fontSize: 24, color: Colors.cream },
  emptySubtitle: { ...Typography.body, fontSize: 14, color: Colors.creamDim, textAlign: 'center', lineHeight: 20, paddingHorizontal: Spacing.md },
  emptyBtn: { marginTop: Spacing.md, borderBottomWidth: 1.5, borderBottomColor: Colors.gold, paddingVertical: Spacing.xs },
  emptyBtnText: { ...Typography.bodySemibold, fontSize: 14, color: Colors.gold },
});
