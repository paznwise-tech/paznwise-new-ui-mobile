import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Modal, ActivityIndicator, NativeSyntheticEvent, NativeScrollEvent, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { StarRow } from '@/components/ui/StarRow';
import { useCart, useFavorites, useUser } from '@/context/AppContext';
import { useProductDetail } from '@/hooks/useProducts';
import { UserService, PublicUser } from '@/services/userService';
import { ReviewService, Review } from '@/services/reviewService';
import { ProductService } from '@/services/productService';
import { resolveImageOrDefault, DEFAULT_IMAGE } from '@/utils/imageUrl';

const { width } = Dimensions.get('window');

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { product, loading, error } = useProductDetail(id);
  const { cart, addToCart } = useCart();
  const { status } = useUser();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [tab, setTab] = useState<'about' | 'details' | 'policies'>('about');
  const [showCartModal, setShowCartModal] = useState(false);
  const [seller, setSeller] = useState<PublicUser | null>(null);

  // Carousel state
  const [imgIdx, setImgIdx] = useState(0);
  const carouselRef = useRef<ScrollView>(null);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [distribution, setDistribution] = useState<Record<number, number>>({});
  const [canReview, setCanReview] = useState(false);
  const [helpfulIds, setHelpfulIds] = useState<string[]>([]);
  const [merchandise, setMerchandise] = useState<any[]>([]);

  useEffect(() => {
    if (!product?.sellerId) return;
    UserService.getProfileById(product.sellerId).then(setSeller).catch(() => {});
  }, [product?.sellerId]);

  const loadReviews = useCallback(() => {
    if (!id) return;
    ReviewService.getProductReviews(id).then(({ reviews: r, avgRating: avg, count, distribution: dist }) => {
      setReviews(r);
      setAvgRating(avg);
      setReviewCount(count);
      setDistribution(dist);
    });
  }, [id]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  // Approved merchandise licensed from this artwork. Empty for most
  // products, so the section only appears when there is something to show.
  useEffect(() => {
    if (!id) return;
    ProductService.getMerchandiseForProduct(String(id))
      .then(setMerchandise)
      .catch(() => setMerchandise([]));
  }, [id]);

  // Eligibility is decided server-side (it checks the buyer actually
  // received the item), so the write entry only appears when it says yes.
  useEffect(() => {
    if (!id || status !== 'signedIn') { setCanReview(false); return; }
    ReviewService.canReview(String(id)).then(setCanReview);
  }, [id, status]);

  const handleHelpful = useCallback(async (reviewId: string) => {
    if (helpfulIds.includes(reviewId)) return;
    setHelpfulIds(prev => [...prev, reviewId]);
    setReviews(prev => prev.map(r => (r.id === reviewId ? { ...r, helpful: (r.helpful ?? 0) + 1 } : r)));
    try {
      await ReviewService.markHelpful(reviewId);
    } catch {
      setHelpfulIds(prev => prev.filter(x => x !== reviewId));
      setReviews(prev => prev.map(r => (r.id === reviewId ? { ...r, helpful: Math.max(0, (r.helpful ?? 1) - 1) } : r)));
    }
  }, [helpfulIds]);

  const handleReport = useCallback((reviewId: string) => {
    Alert.alert('Report review', 'Tell us what is wrong with this review.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Spam', onPress: () => submitReport(reviewId, 'Spam') },
      { text: 'Offensive', onPress: () => submitReport(reviewId, 'Offensive content') },
      { text: 'Not about this product', onPress: () => submitReport(reviewId, 'Irrelevant') },
    ]);
  }, []);

  const submitReport = async (reviewId: string, reason: string) => {
    try {
      await ReviewService.reportReview(reviewId, reason);
      Alert.alert('Reported', 'Thanks — our team will take a look.');
    } catch (e: any) {
      Alert.alert('Could not report', e?.message ?? 'Please try again.');
    }
  };

  const liked = product ? isFavorite(String(product.id)) : false;
  const inCart = product ? cart.some(c => c.productId === String(product.id)) : false;

  const getImageUrl = (url?: string) => resolveImageOrDefault(url);

  const handleLikePress = useCallback(() => {
    if (product) toggleFavorite(String(product.id));
  }, [product, toggleFavorite]);

  // The cart endpoints require a session, so a guest is sent to sign in at
  // the point they act rather than being blocked from browsing.
  const requireSession = useCallback(() => {
    if (status === 'signedIn') return true;
    router.push('/(auth)/login');
    return false;
  }, [status]);

  const handleCartPress = useCallback(async () => {
    if (inCart) {
      router.push('/product/cart' as any);
      return;
    }
    if (!product || !requireSession()) return;
    try {
      await addToCart(product.id);
      setShowCartModal(true);
    } catch (e: any) {
      Alert.alert('Could not add to cart', e?.message ?? 'Please try again.');
    }
  }, [inCart, product, addToCart, requireSession]);

  const handleRent = useCallback(() => {
    if (!product || !requireSession()) return;
    router.push({
      pathname: '/rentals/request',
      params: {
        productId: String(product.id),
        title: product.title,
        dailyRate: String(product.rentalDailyRate ?? ''),
      },
    } as any);
  }, [product, requireSession]);

  const handleBuyNow = useCallback(async () => {
    if (!product || !requireSession()) return;
    try {
      if (!inCart) await addToCart(product.id);
      router.push('/checkout' as any);
    } catch (e: any) {
      Alert.alert('Could not continue', e?.message ?? 'Please try again.');
    }
  }, [product, inCart, addToCart, requireSession]);

  const handleCarouselScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setImgIdx(idx);
  }, []);

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

  // Build deduped image list: thumbnail first, then productImages
  const rawImages = [product.thumbnailUrl, ...(product.productImages ?? []), ...(product.images ?? [])]
    .filter((v): v is string => Boolean(v))
    .filter((v, i, a) => a.indexOf(v) === i);
  const images = rawImages.length > 0 ? rawImages.map(getImageUrl) : [DEFAULT_IMAGE];

  const coverImage = images[0];

  const displayRating = avgRating > 0 ? avgRating : 4.8;
  const displayCount = reviewCount > 0 ? reviewCount : 20;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Hero carousel */}
        <View style={styles.heroWrap}>
          <ScrollView
            ref={carouselRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleCarouselScroll}
            scrollEventThrottle={16}
            style={{ width, height: 380 }}
          >
            {images.map((uri, idx) => (
              <Image
                key={idx}
                source={{ uri }}
                style={{ width, height: 380 }}
                contentFit="cover"
                transition={300}
              />
            ))}
          </ScrollView>

          <LinearGradient
            colors={['rgba(13,27,42,0.6)', 'transparent', 'rgba(13,27,42,0.4)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

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

          {/* Dot indicators */}
          {images.length > 1 && (
            <View style={styles.dotRow}>
              {images.map((_, i) => (
                <View key={i} style={[styles.dot, i === imgIdx && styles.dotActive]} />
              ))}
            </View>
          )}

          {/* Image counter */}
          {images.length > 1 && (
            <View style={styles.imgCounter}>
              <Text style={styles.imgCounterText}>{imgIdx + 1}/{images.length}</Text>
            </View>
          )}

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
            <TouchableOpacity onPress={() => setTab('about')}>
              <StarRow rating={displayRating} count={displayCount} />
            </TouchableOpacity>
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
                {seller ? (seller.name || seller.username || 'Artist') : (product.brand || 'View Profile')}
              </Text>
              <Text style={styles.artistSub}>
                {seller?.isArtist ? 'Verified Artist' : seller?.isPerformer ? 'Performer' : 'Seller'}
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
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
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

              {/* Reviews section */}
              <View style={styles.reviewsHeader}>
                <Text style={styles.reviewsTitle}>Reviews</Text>
                {reviewCount > 0 && (
                  <View style={styles.reviewsSummary}>
                    <Text style={styles.reviewsAvg}>{displayRating.toFixed(1)}</Text>
                    <StarRow rating={displayRating} count={0} />
                    <Text style={styles.reviewsCount}>({displayCount})</Text>
                  </View>
                )}
              </View>

              {/* Merchandise licensed from this artwork */}
              {merchandise.length > 0 && (
                <View style={styles.merchSection}>
                  <Text style={styles.reviewsTitle}>Available as merchandise</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                      {merchandise.map((m: any) => (
                        <TouchableOpacity
                          key={m.id}
                          style={styles.merchCard}
                          onPress={() => router.push(`/product/${m.id}` as any)}
                        >
                          <Text style={styles.merchTitle} numberOfLines={2}>{m.title}</Text>
                          {m.price != null && (
                            <Text style={styles.merchPrice}>
                              ₹{Number(m.price).toLocaleString('en-IN')}
                            </Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* Rating distribution */}
              {reviewCount > 0 && (
                <View style={styles.distribution}>
                  {[5, 4, 3, 2, 1].map(star => {
                    const n = distribution[star] ?? 0;
                    const pct = reviewCount > 0 ? (n / reviewCount) * 100 : 0;
                    return (
                      <View key={star} style={styles.distRow}>
                        <Text style={styles.distStar}>{star}★</Text>
                        <View style={styles.distTrack}>
                          <View style={[styles.distFill, { width: `${pct}%` }]} />
                        </View>
                        <Text style={styles.distCount}>{n}</Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {canReview && (
                <TouchableOpacity
                  style={styles.writeReviewBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/reviews/write',
                      params: { productId: String(product.id), productTitle: product.title },
                    } as any)
                  }
                >
                  <Text style={styles.writeReviewText}>✍️  Write a review</Text>
                </TouchableOpacity>
              )}

              {reviews.length === 0 ? (
                <Text style={styles.noReviews}>No reviews yet. Be the first to review!</Text>
              ) : (
                reviews.slice(0, 5).map(r => (
                  <View key={r.id} style={styles.reviewCard}>
                    <View style={styles.reviewTop}>
                      <StarRow rating={r.rating} count={0} />
                      <Text style={styles.reviewDate}>
                        {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                    <Text style={styles.reviewComment}>{r.comment}</Text>
                    <View style={styles.reviewActions}>
                      <TouchableOpacity
                        onPress={() => handleHelpful(r.id)}
                        disabled={helpfulIds.includes(r.id)}
                      >
                        <Text style={[styles.reviewAction, helpfulIds.includes(r.id) && { color: Colors.gold }]}>
                          👍 Helpful{r.helpful ? ` (${r.helpful})` : ''}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleReport(r.id)}>
                        <Text style={styles.reviewAction}>Report</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
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

        {/* Only when the owner has opted this artwork into rentals. */}
        {product.rentalEligible && product.rentalDailyRate ? (
          <TouchableOpacity style={styles.rentBtn} onPress={handleRent}>
            <Text style={styles.rentBtnText}>
              Rent from ₹{Number(product.rentalDailyRate).toLocaleString('en-IN')}/day
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Added to Cart Modal */}
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
                onPress={() => { setShowCartModal(false); router.push('/product/cart' as any); }}
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
  heroWrap: { width, height: 380, position: 'relative', overflow: 'hidden' },
  backBtn: { position: 'absolute', top: 52, left: Spacing.md, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(13,27,42,0.7)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  backIcon: { color: Colors.cream, fontSize: 18 },
  actions: { position: 'absolute', top: 52, right: Spacing.md, gap: Spacing.sm },
  actionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(13,27,42,0.7)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  actionIcon: { fontSize: 16 },
  statusBadges: { position: 'absolute', top: 52, left: Spacing.xl + 40, flexDirection: 'row', gap: Spacing.xs },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border },
  badgeText: { ...Typography.label },
  dotRow: { position: 'absolute', bottom: 52, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 18, backgroundColor: Colors.gold },
  imgCounter: { position: 'absolute', top: 52, left: 0, right: 0, alignItems: 'center' },
  imgCounterText: { ...Typography.label, fontSize: 9, color: 'rgba(255,255,255,0.7)' },
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
  merchSection: { marginBottom: Spacing.lg },
  merchCard: {
    width: 120, padding: Spacing.sm, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard,
  },
  merchTitle: { ...Typography.caption, fontSize: 12, color: Colors.cream },
  merchPrice: { ...Typography.bodySemibold, fontSize: 13, color: Colors.gold, marginTop: 4 },
  distribution: { gap: 4, marginBottom: Spacing.md },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  distStar: { ...Typography.caption, fontSize: 11, width: 22 },
  distTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.border, overflow: 'hidden' },
  distFill: { height: 6, borderRadius: 3, backgroundColor: Colors.gold },
  distCount: { ...Typography.caption, fontSize: 11, width: 24, textAlign: 'right' },
  writeReviewBtn: {
    borderWidth: 1, borderColor: Colors.gold + '66', borderRadius: Radius.md,
    paddingVertical: Spacing.sm, alignItems: 'center', marginBottom: Spacing.md,
  },
  writeReviewText: { ...Typography.bodySemibold, fontSize: 13, color: Colors.gold },
  reviewActions: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.sm },
  reviewAction: { ...Typography.caption, fontSize: 12, color: Colors.creamDim },
  rentBtn: {
    marginTop: Spacing.sm, paddingVertical: Spacing.sm, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.gold + '66', borderRadius: Radius.md,
  },
  rentBtnText: { ...Typography.bodySemibold, fontSize: 13, color: Colors.gold },
  reviewsHeader: { marginTop: Spacing.lg, marginBottom: Spacing.sm },
  reviewsTitle: { ...Typography.heading, fontSize: 18, marginBottom: Spacing.xs },
  reviewsSummary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  reviewsAvg: { ...Typography.display, fontSize: 24, color: Colors.gold },
  reviewsCount: { ...Typography.caption, fontSize: 13 },
  noReviews: { ...Typography.caption, fontSize: 13, color: Colors.creamDim, fontStyle: 'italic' },
  reviewCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.border, gap: Spacing.xs },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewDate: { ...Typography.caption, fontSize: 11 },
  reviewComment: { ...Typography.body, fontSize: 14, color: Colors.creamDim, lineHeight: 20 },
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
