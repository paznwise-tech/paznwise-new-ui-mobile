import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { StarRow } from '@/components/ui/StarRow';
import { useCart, useFavorites } from '@/context/AppContext';
import { useProductDetail } from '@/hooks/useProducts';
import { UserService, PublicUser } from '@/services/userService';
import { API_BASE_URL } from '@/services/api';

const { width } = Dimensions.get('window');

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { product, loading, error } = useProductDetail(id);
  const { cart, addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [tab, setTab] = useState<'about' | 'details' | 'policies'>('about');
  const [showCartModal, setShowCartModal] = useState(false);
  const [seller, setSeller] = useState<PublicUser | null>(null);

  // Fetch seller profile once we have the product's sellerId
  useEffect(() => {
    if (!product?.sellerId) return;
    UserService.getProfileById(product.sellerId)
      .then(setSeller)
      .catch(() => {});
  }, [product?.sellerId]);

  // We are still using local context for favorites and cart until those APIs are integrated
  const liked = product ? isFavorite(Number(product.id)) : false; // Note: if ID is uuid this needs string matching in context later
  const inCart = product ? cart.some(c => c.id === Number(product.id)) : false;

  const handleLikePress = useCallback(() => {
    if (product) toggleFavorite(Number(product.id));
  }, [product, toggleFavorite]);

  const handleCartPress = useCallback(() => {
    if (inCart) {
      router.push('/product/cart' as any);
    } else if (product) {
      // Mock converting ProductResponse to CartItem/Artwork for local context
      addToCart({
        id: Number(product.id) || Date.now(),
        title: product.title,
        price: product.price,
        artist: product.brand || 'Artist',
        location: 'Global',
        img: getImageUrl(product.thumbnailUrl ?? product.productImages?.[0] ?? product.images?.[0]),
      });
      setShowCartModal(true);
    }
  }, [inCart, product, addToCart]);

  const handleBuyNow = useCallback(() => {
    if (product) {
      addToCart({
        id: Number(product.id) || Date.now(),
        title: product.title,
        price: product.price,
        artist: product.brand || 'Artist',
        location: 'Global',
        img: getImageUrl(product.thumbnailUrl ?? product.productImages?.[0] ?? product.images?.[0]),
      });
      router.push('/product/cart' as any);
    }
  }, [product, addToCart]);

  const getImageUrl = (url?: string) => {
    if (!url) return 'https://via.placeholder.com/400?text=No+Image';
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: Colors.bg }]}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={[styles.center, { backgroundColor: Colors.bg }]}>
        <Text style={{ color: Colors.error, marginBottom: Spacing.md }}>{error || 'Product not found'}</Text>
        <GoldButton label="Go Back" onPress={() => router.back()} />
      </View>
    );
  }

  const coverImage = getImageUrl(product.thumbnailUrl ?? product.productImages?.[0] ?? product.images?.[0]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Hero image */}
        <View style={styles.heroWrap}>
          <Image source={{ uri: coverImage }} style={styles.heroImg} contentFit="cover" transition={300} />
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

          {/* Status Badges */}
          <View style={styles.statusBadges}>
            {product.productType === 'DIGITAL' && (
              <View style={[styles.badge, { backgroundColor: Colors.bgElevated }]}>
                <Text style={styles.badgeText}>DIGITAL</Text>
              </View>
            )}
            {product.status === 'OUT_OF_STOCK' && (
              <View style={[styles.badge, { backgroundColor: Colors.error }]}>
                <Text style={[styles.badgeText, { color: '#FFF' }]}>OUT OF STOCK</Text>
              </View>
            )}
          </View>

          {/* Price overlay */}
          <View style={styles.priceOverlay}>
            <Text style={styles.priceLabel}>Price</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={styles.price}>₹{product.price.toLocaleString('en-IN')}</Text>
              {product.comparePrice && product.comparePrice > product.price && (
                <Text style={styles.comparePrice}>₹{product.comparePrice.toLocaleString('en-IN')}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* Title & rating */}
          <Text style={styles.title}>{product.title}</Text>
          <View style={styles.ratingRow}>
            <StarRow rating={4.8} count={20} />
            {(product.medium || product.artStyle || product.brand) && (
              <Text style={styles.medium}>
                {[product.medium, product.artStyle].filter(Boolean).join(' · ') || product.brand}
              </Text>
            )}
          </View>

          {/* Seller strip */}
          <TouchableOpacity style={styles.artistStrip} onPress={() => router.push(`/profile/${product.sellerId}` as any)}>
            {seller?.avatar ? (
              <Image source={{ uri: seller.avatar }} style={styles.artistAvatar} contentFit="cover" />
            ) : (
              <View style={[styles.artistAvatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>
                  {seller?.name ? seller.name.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            )}
            <View style={styles.artistInfo}>
              <Text style={styles.artistName}>
                {seller
                  ? (seller.name || seller.username || 'Artist')
                  : (product.brand || 'View Profile')}
              </Text>
              <Text style={styles.artistSub}>
                {seller?.isArtist
                  ? 'Verified Artist'
                  : seller?.isPerformer
                  ? 'Performer'
                  : 'Seller'}
              </Text>
            </View>
            {seller?.isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Verified</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Tabs */}
          <View style={styles.tabs}>
            {(['about', 'details', 'policies'] as const).map(t => (
              <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {tab === 'about' && (
            <View style={styles.tabContent}>
              <Text style={styles.desc}>{product.description || 'No description provided.'}</Text>
              
              {product.tags && product.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {product.tags.map(tag => (
                    <View key={tag} style={styles.tagBadge}>
                      <Text style={styles.tagText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {tab === 'details' && (
            <View style={styles.tabContent}>
              {[
                ['Type', product.productType],
                product.medium ? ['Medium', product.medium] : null,
                product.artStyle ? ['Art Style', product.artStyle] : null,
                product.yearCreated ? ['Year Created', String(product.yearCreated)] : null,
                product.editionType ? ['Edition', product.editionType.replace(/_/g, ' ')] : null,
                ['Category', product.categoryId || 'Uncategorized'],
                ['SKU', product.sku],
                ['Stock', `${product.stock} available`],
                product.weight ? ['Weight', `${product.weight} kg`] : null,
                product.dimensions ? ['Dimensions', `${product.dimensions.length}×${product.dimensions.width}×${product.dimensions.height} ${product.dimensions.unit ?? 'cm'}`] : null,
                product.includeCertificate ? ['Certificate', 'Included'] : null,
              ].filter(Boolean).map(([k, v]: any) => (
                <View key={k as string} style={styles.detailRow}>
                  <Text style={styles.detailKey}>{k as string}</Text>
                  <Text style={styles.detailVal}>{v as string}</Text>
                </View>
              ))}
            </View>
          )}

          {tab === 'policies' && (
            <View style={styles.tabContent}>
              {[
                ['Shipping', product.requiresShipping ? (product.shippingCharge ? `₹${product.shippingCharge}` : 'Free Shipping') : 'Digital / No Shipping'],
                ['Delivery Type', product.deliveryType],
                ['Cash on Delivery', product.cashOnDelivery ? 'Available' : 'Not Available'],
                ['Returns', product.returnPolicy || 'Not specified'],
                ['Warranty', product.warranty || 'Not specified'],
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
            {[['🔒', 'Secure Payment'], ['✅', 'Verified Listing'], ['↩️', product.returnPolicy ? 'Returns Allowed' : 'Final Sale']].map(([icon, label]) => (
              <View key={label} style={styles.trustItem}>
                <Text style={styles.trustIcon}>{icon}</Text>
                <Text style={styles.trustLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomCta}>
        <View style={styles.bottomTop}>
          <Text style={styles.bottomPrice}>₹{product.price.toLocaleString('en-IN')}</Text>
          <Text style={styles.bottomShipping}>
            {product.requiresShipping ? (product.shippingCharge ? `+₹${product.shippingCharge} shipping` : 'Free shipping') : 'Digital download'}
          </Text>
        </View>
        <View style={styles.bottomBtns}>
          <View style={{ flex: 1 }}>
            <GoldButton
              label={inCart ? 'Go to Cart' : 'Add to Cart'}
              onPress={handleCartPress}
              variant="outline"
              size="md"
              fullWidth
            />
          </View>
          <View style={{ flex: 1 }}>
            <GoldButton
              label="Buy Now"
              onPress={handleBuyNow}
              size="md"
              fullWidth
              disabled={product.status === 'OUT_OF_STOCK' || product.stock <= 0}
            />
          </View>
        </View>
      </View>

      {/* Added to Cart Success Modal */}
      <Modal visible={showCartModal} transparent animationType="fade" onRequestClose={() => setShowCartModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalGoldLine} />
            <Text style={styles.modalSuccessIcon}>✓</Text>
            <Text style={styles.modalHeading}>Added to Cart</Text>
            <Text style={styles.modalSubheading}>This product has been added to your cart.</Text>
            
            <View style={styles.modalItem}>
              <Image source={{ uri: coverImage }} style={styles.modalItemImg} contentFit="cover" />
              <View style={styles.modalItemBody}>
                <Text style={styles.modalItemTitle} numberOfLines={1}>{product.title}</Text>
                <Text style={styles.modalItemPrice}>₹{product.price.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <GoldButton
                label="View Cart"
                onPress={() => {
                  setShowCartModal(false);
                  router.push('/product/cart' as any);
                }}
                fullWidth
                size="md"
              />
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowCartModal(false)}>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroWrap: { width, height: 380, position: 'relative' },
  heroImg: { width: '100%', height: '100%' },
  backBtn: { position: 'absolute', top: 52, left: Spacing.md, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(13,27,42,0.7)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  backIcon: { color: Colors.cream, fontSize: 18 },
  actions: { position: 'absolute', top: 52, right: Spacing.md, gap: Spacing.sm },
  actionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(13,27,42,0.7)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  actionIcon: { fontSize: 16 },
  statusBadges: { position: 'absolute', top: 52, left: Spacing.xl + 40, flexDirection: 'row', gap: Spacing.xs },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border },
  badgeText: { ...Typography.label },
  priceOverlay: { position: 'absolute', bottom: Spacing.md, right: Spacing.md, backgroundColor: 'rgba(13,27,42,0.85)', padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderGold },
  priceLabel: { ...Typography.label, fontSize: 9, color: Colors.creamDim },
  price: { ...Typography.display, fontSize: 22, color: Colors.gold },
  comparePrice: { ...Typography.caption, fontSize: 12, textDecorationLine: 'line-through' },
  content: { padding: Spacing.md },
  title: { ...Typography.display, fontSize: 30, lineHeight: 34, marginBottom: Spacing.sm },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  medium: { ...Typography.caption, fontSize: 12 },
  artistStrip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  artistAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: Colors.gold },
  avatarPlaceholder: { backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { ...Typography.bodyBold, fontSize: 18, color: Colors.gold },
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
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  tagBadge: { backgroundColor: Colors.bgCard, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border },
  tagText: { ...Typography.caption, color: Colors.cream },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailKey: { ...Typography.label, fontSize: 10, color: Colors.creamDim },
  detailVal: { ...Typography.bodySemibold, fontSize: 13, color: Colors.cream },
  trust: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  trustItem: { flex: 1, alignItems: 'center', gap: 4, padding: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  trustIcon: { fontSize: 18 },
  trustLabel: { ...Typography.caption, fontSize: 10, textAlign: 'center' },
  bottomCta: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.bgElevated, borderTopWidth: 1, borderTopColor: Colors.borderGold, flexDirection: 'column', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 28, gap: Spacing.sm },
  bottomTop: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm },
  bottomPrice: { ...Typography.bodyBold, fontSize: 22, color: Colors.gold },
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
  modalItemPrice: { ...Typography.bodyBold, fontSize: 14, color: Colors.gold },
  modalActions: { width: '100%', gap: Spacing.sm },
  modalCancelBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  modalCancelText: { ...Typography.caption, fontSize: 13, color: Colors.gold },
});
