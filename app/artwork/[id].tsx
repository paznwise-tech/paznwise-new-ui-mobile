import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { GoldButton } from '@/components/GoldButton';
import { StarRow } from '@/components/StarRow';
import { useAppData, useCart, useFavorites } from '@/context/AppContext';

const { width } = Dimensions.get('window');

export default function ArtworkDetail() {
  const { id } = useLocalSearchParams();
  const { artworks } = useAppData();
  const { cart, addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();

  const item = artworks.find(a => a.id === Number(id)) ?? artworks[0];
  const [tab, setTab] = useState<'about' | 'artist' | 'details'>('about');
  const [showCartModal, setShowCartModal] = useState(false);

  const liked = isFavorite(item.id);
  const inCart = cart.some(c => c.id === item.id);

  const handleLikePress = useCallback(() => {
    toggleFavorite(item.id);
  }, [item.id, toggleFavorite]);

  const handleCartPress = useCallback(() => {
    if (inCart) {
      router.push('/cart');
    } else {
      addToCart(item);
      setShowCartModal(true);
    }
  }, [inCart, item, addToCart]);

  const handleBuyNow = useCallback(() => {
    addToCart(item);
    router.push('/cart');
  }, [item, addToCart]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Hero image */}
        <View style={styles.heroWrap}>
          <Image source={{ uri: item.img }} style={styles.heroImg} contentFit="cover" transition={300} />
          <LinearGradient colors={['rgba(13,27,42,0.6)', 'transparent', 'rgba(13,27,42,0.4)']} style={StyleSheet.absoluteFill} />

          {/* Back */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleLikePress}>
              <Text style={styles.actionIcon}>{liked ? '❤️' : '🤍'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Text style={styles.actionIcon}>⬆️</Text>
            </TouchableOpacity>
          </View>

          {/* Price overlay */}
          <View style={styles.priceOverlay}>
            <Text style={styles.priceLabel}>Starting at</Text>
            <Text style={styles.price}>₹{item.price.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Title & rating */}
          <Text style={styles.title}>{item.title}</Text>
          <View style={styles.ratingRow}>
            <StarRow rating={item.rating ?? 4.8} count={item.reviews ?? 20} />
            <Text style={styles.medium}>{item.medium}</Text>
          </View>

          {/* Artist strip */}
          <TouchableOpacity style={styles.artistStrip} onPress={() => router.push(`/artist/1` as any)}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop' }}
              style={styles.artistAvatar}
              contentFit="cover"
            />
            <View style={styles.artistInfo}>
              <Text style={styles.artistName}>{item.artist}</Text>
              <Text style={styles.artistSub}>Verified Artist · {item.location}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Verified</Text>
            </View>
          </TouchableOpacity>

          {/* Tabs */}
          <View style={styles.tabs}>
            {(['about', 'artist', 'details'] as const).map(t => (
              <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {tab === 'about' && (
            <View style={styles.tabContent}>
              <Text style={styles.desc}>
                {item.title} is an original {item.medium?.toLowerCase()} work by {item.artist}, based in {item.location}. This piece explores themes of Indian cultural heritage through a contemporary lens, with meticulous attention to texture and composition.
              </Text>
            </View>
          )}
          {tab === 'artist' && (
            <View style={styles.tabContent}>
              <Text style={styles.desc}>{item.artist} is a celebrated Indian artist known for exceptional technique and storytelling through {item.medium?.toLowerCase()}. With over a decade of practice, their works are held in private collections across the world.</Text>
            </View>
          )}
          {tab === 'details' && (
            <View style={styles.tabContent}>
              {[
                ['Medium',    item.medium ?? 'Oil on Canvas'],
                ['Category',  item.category ?? 'Paintings'],
                ['Location',  item.location],
                ['Edition',   'Original — 1 of 1'],
                ['Shipping',  'Free · 7–10 days'],
                ['Returns',   '7-day return window'],
              ].map(([k, v]) => (
                <View key={k} style={styles.detailRow}>
                  <Text style={styles.detailKey}>{k}</Text>
                  <Text style={styles.detailVal}>{v}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Trust */}
          <View style={styles.trust}>
            {[['🔒', 'Secure Payment'], ['✅', 'Verified Original'], ['↩️', '7-Day Returns']].map(([icon, label]) => (
              <View key={label as string} style={styles.trustItem}>
                <Text style={styles.trustIcon}>{icon as string}</Text>
                <Text style={styles.trustLabel}>{label as string}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomCta}>
        <View style={styles.bottomLeft}>
          <Text style={styles.bottomPrice}>₹{item.price.toLocaleString('en-IN')}</Text>
          <Text style={styles.bottomShipping}>Free shipping</Text>
        </View>
        <View style={styles.bottomBtns}>
          <GoldButton
            label={inCart ? 'Go to Cart' : 'Add to Cart'}
            onPress={handleCartPress}
            variant="outline"
            size="md"
          />
          <GoldButton label="Buy Now" onPress={handleBuyNow} size="md" />
        </View>
      </View>

      {/* Added to Cart Success Modal */}
      <Modal
        visible={showCartModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCartModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalGoldLine} />
            <Text style={styles.modalSuccessIcon}>✓</Text>
            <Text style={styles.modalHeading}>Added to Cart</Text>
            <Text style={styles.modalSubheading}>This original work has been reserved for you.</Text>
            
            <View style={styles.modalItem}>
              <Image source={{ uri: item.img }} style={styles.modalItemImg} contentFit="cover" />
              <View style={styles.modalItemBody}>
                <Text style={styles.modalItemTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.modalItemArtist}>{item.artist}</Text>
                <Text style={styles.modalItemPrice}>₹{item.price.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <GoldButton
                label="View Cart"
                onPress={() => {
                  setShowCartModal(false);
                  router.push('/cart');
                }}
                fullWidth
                size="md"
              />
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowCartModal(false)}
              >
                <Text style={styles.modalCancelText}>Continue Browsing</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: { width, height: 380, position: 'relative' },
  heroImg: { width: '100%', height: '100%' },
  backBtn: { position: 'absolute', top: 52, left: Spacing.md, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(13,27,42,0.7)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  backIcon: { color: Colors.cream, fontSize: 18 },
  actions: { position: 'absolute', top: 52, right: Spacing.md, gap: Spacing.sm },
  actionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(13,27,42,0.7)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  actionIcon: { fontSize: 16 },
  priceOverlay: { position: 'absolute', bottom: Spacing.md, right: Spacing.md, backgroundColor: 'rgba(13,27,42,0.85)', padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderGold },
  priceLabel: { ...Typography.label, fontSize: 9, color: Colors.creamDim },
  price: { ...Typography.display, fontSize: 22, color: Colors.gold },
  content: { padding: Spacing.md },
  title: { ...Typography.display, fontSize: 30, lineHeight: 34, marginBottom: Spacing.sm },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  medium: { ...Typography.caption, fontSize: 12 },
  artistStrip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  artistAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: Colors.gold },
  artistInfo: { flex: 1 },
  artistName: { ...Typography.bodySemibold, fontSize: 14 },
  artistSub: { ...Typography.caption, fontSize: 11 },
  verifiedBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.sm, backgroundColor: Colors.gold + '22', borderWidth: 1, borderColor: Colors.gold },
  verifiedText: { ...Typography.label, fontSize: 9, color: Colors.gold },
  tabs: { flexDirection: 'row', gap: 2, marginBottom: Spacing.lg, backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: 4 },
  tab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.sm },
  tabActive: { backgroundColor: Colors.bgElevated },
  tabText: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  tabTextActive: { color: Colors.cream, fontFamily: 'Inter_600SemiBold' },
  tabContent: { marginBottom: Spacing.xl },
  desc: { ...Typography.body, fontSize: 15, lineHeight: 24, color: Colors.creamDim },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailKey: { ...Typography.label, fontSize: 10, color: Colors.creamDim },
  detailVal: { ...Typography.bodySemibold, fontSize: 13, color: Colors.cream },
  trust: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  trustItem: { flex: 1, alignItems: 'center', gap: 4, padding: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  trustIcon: { fontSize: 18 },
  trustLabel: { ...Typography.caption, fontSize: 10, textAlign: 'center' },
  bottomCta: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.bgElevated, borderTopWidth: 1, borderTopColor: Colors.borderGold, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, paddingBottom: 28, gap: Spacing.md },
  bottomLeft: { flex: 1 },
  bottomPrice: { ...Typography.bodyBold, fontSize: 20, color: Colors.gold },
  bottomShipping: { ...Typography.caption, fontSize: 11 },
  bottomBtns: { flexDirection: 'row', gap: Spacing.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(13,27,42,0.85)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  modalContent: { width: '100%', maxWidth: 340, backgroundColor: Colors.bgCard, borderRadius: Radius.xl, padding: Spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: Colors.borderGold, ...Shadow.card },
  modalGoldLine: { width: 40, height: 3, backgroundColor: Colors.gold, borderRadius: 2, marginBottom: Spacing.md },
  modalSuccessIcon: { fontSize: 32, color: Colors.gold, marginBottom: Spacing.sm, fontWeight: 'bold' },
  modalHeading: { ...Typography.heading, fontSize: 20, marginBottom: 4 },
  modalSubheading: { ...Typography.caption, fontSize: 12, color: Colors.creamDim, textAlign: 'center', marginBottom: Spacing.lg },
  modalItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.bgInput, borderRadius: Radius.md, padding: Spacing.sm, width: '100%', marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  modalItemImg: { width: 60, height: 60, borderRadius: Radius.sm },
  modalItemBody: { flex: 1, gap: 2 },
  modalItemTitle: { ...Typography.bodySemibold, fontSize: 14, color: Colors.cream },
  modalItemArtist: { ...Typography.caption, fontSize: 11, color: Colors.creamDim },
  modalItemPrice: { ...Typography.bodyBold, fontSize: 14, color: Colors.gold },
  modalActions: { width: '100%', gap: Spacing.sm },
  modalCancelBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  modalCancelText: { ...Typography.caption, fontSize: 13, color: Colors.gold },
});
