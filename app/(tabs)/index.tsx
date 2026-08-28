// Home — Discovery feed with hero slider, categories, artworks, performers, events
import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, Dimensions, TouchableOpacity, ActivityIndicator, Share } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import ProductCard from '@/components/product/ProductCard';
import { PerformerCard } from '@/components/artist/PerformerCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { useCategories, useHeroSlides } from '@/hooks/useTaxonomy';
import type { HeroSlide, Category } from '@/services/taxonomyService';
import { useCart, useUser, useFeed } from '@/context/AppContext';
import { Performer } from '@/types';
import { FeedPost } from '@/services/feedService';
import { useMarketplaceProducts } from '@/hooks/useProducts';
import { ArtistServiceApi } from '@/services/artistService';
const { width } = Dimensions.get('window');

function HeroSlider() {
  const [active, setActive] = useState(0);
  const { data: slides = [], isLoading } = useHeroSlides();

  const renderHeroItem = useCallback(({ item }: { item: HeroSlide }) => (
    <View style={{ width }}>
      <Image source={{ uri: item.img }} style={styles.heroImg} contentFit="cover" transition={400} />
      <LinearGradient colors={['rgba(13,27,42,0.1)', 'rgba(13,27,42,0.7)', Colors.bg]} locations={[0, 0.6, 1]} style={styles.heroOverlay} />
      <View style={styles.heroContent}>
        <Text style={styles.heroEyebrow}>Featured Collection</Text>
        <Text style={styles.heroTitle}>{item.title}</Text>
        <Text style={styles.heroCaption}>{item.caption}</Text>
        <TouchableOpacity
          style={styles.heroBtn}
          onPress={() =>
            item.targetSlug
              ? router.push(`/product/category/${item.targetSlug}` as any)
              : router.push('/(tabs)/browse')
          }
        >
          <Text style={styles.heroBtnText}>Explore →</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), []);

  const onScroll = useCallback((e: any) => {
    setActive(Math.round(e.nativeEvent.contentOffset.x / width));
  }, []);

  // The carousel is promotional, so an empty or failed fetch collapses it
  // rather than leaving a blank band at the top of the screen.
  if (isLoading) {
    return (
      <View style={[styles.hero, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={Colors.gold} />
      </View>
    );
  }
  if (slides.length === 0) return null;

  return (
    <View style={styles.hero}>
      <FlatList
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={i => i.id}
        renderItem={renderHeroItem}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={2}
      />
      <View style={styles.heroDots}>
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, active === i && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

function CategoryBar() {
  const { categories } = useCategories();

  // These chips used to only restyle themselves. They now navigate, which is
  // the only reason a category filter exists on a home screen.
  const renderCatItem = useCallback(({ item }: { item: Category }) => (
    <TouchableOpacity
      onPress={() =>
        item.slug
          ? router.push(`/product/category/${item.slug}` as any)
          : router.push('/(tabs)/browse')
      }
      style={[styles.catChip, { borderColor: item.color + '66' }]}
    >
      <Text style={[styles.catText, { color: item.color }]}>{item.label}</Text>
    </TouchableOpacity>
  ), []);

  if (categories.length <= 1) return null;

  return (
    <FlatList
      data={categories}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.catList}
      keyExtractor={i => i.id}
      renderItem={renderCatItem}
      initialNumToRender={7}
    />
  );
}

export default function Home() {
  const [performers, setPerformers] = useState<Array<Performer & { serviceId: string }>>([]);
  const [performersLoading, setPerformersLoading] = useState(true);
  const { cartCount } = useCart();
  const { user } = useUser();
  const { feedPosts, trendingPosts, feedLoading, feedError, fetchPersonalisedFeed, fetchTrendingFeed, togglePostLike, likePost } = useFeed();

  const lastTapRef = useRef<{ postId: number; time: number } | null>(null);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleImagePress = useCallback((id: number) => {
    const now = Date.now();
    if (lastTapRef.current?.postId === id && now - lastTapRef.current.time < 300) {
      clearTimeout(tapTimerRef.current!);
      lastTapRef.current = null;
      likePost(id);
    } else {
      lastTapRef.current = { postId: id, time: now };
      tapTimerRef.current = setTimeout(() => {
        lastTapRef.current = null;
        router.push(`/feed/${id}` as any);
      }, 280);
    }
  }, [likePost]);
  const { products: freshProducts } = useMarketplaceProducts(6);

  // Fetch feed data — personalized only once a real user is loaded
  useEffect(() => {
    fetchTrendingFeed();
  }, [fetchTrendingFeed]);

  // Fetch bookable performers (artist-services) for the "Live Performers" section
  useEffect(() => {
    ArtistServiceApi.getServices({ limit: 10 })
      .then(setPerformers)
      .catch(() => setPerformers([]))
      .finally(() => setPerformersLoading(false));
  }, []);

  useEffect(() => {
    if (user.isLoggedIn && user.id) {
      fetchPersonalisedFeed(user.id);
    }
  }, [user.isLoggedIn, user.id, fetchPersonalisedFeed]);

  const handleSharePost = useCallback(async (item: FeedPost) => {
    try {
      await Share.share({
        title: item.title || 'Check out this post on Paznwise!',
        message: [item.title, item.description].filter(Boolean).join('\n\n') || 'Check out this post on Paznwise!',
      });
    } catch {}
  }, []);

  const handlePerformerPress = useCallback((serviceId: string) => {
    router.push(`/booking/${serviceId}` as any);
  }, []);

  const renderPerformerItem = useCallback(({ item }: { item: Performer & { serviceId: string } }) => (
    <PerformerCard item={item} onPress={() => handlePerformerPress(item.serviceId)} />
  ), [handlePerformerPress]);

  // Render a feed post card
  const renderFeedPost = useCallback(({ item }: { item: FeedPost }) => {
    const imageUri = item.imageUrls?.[0];
    const avatarUri =
      item.artist?.profile?.avatar ??
      item.artist?.avatar ??
      item.artist?.picture ??
      item.picture;
    const displayName =
      item.artist?.name ??
      item.artist?.username ??
      item.profileName ??
      null;
    const initial = displayName ? displayName.charAt(0).toUpperCase() : '?';
    const hasImage = !!imageUri;
    const label = item.title || item.description || item.style || item.category || '';

    return (
      <View style={styles.feedCard}>
        {/* Image — double-tap to like, single-tap to navigate */}
        <TouchableOpacity activeOpacity={0.9} onPress={() => handleImagePress(item.id)}>
          <View style={styles.feedImageWrap}>
            {hasImage ? (
              <Image source={{ uri: imageUri }} style={styles.feedImage} contentFit="cover" transition={300} />
            ) : (
              <View style={styles.feedImagePlaceholder}>
                <Text style={styles.feedImagePlaceholderIcon}>🖼</Text>
              </View>
            )}
            {/* Like badge — always toggles */}
            <View style={styles.feedLikeBadge}>
              <TouchableOpacity onPress={() => togglePostLike(item.id)}>
                <Text style={[styles.feedLikeBadgeText, item.isLiked && { color: '#ff6b6b' }]}>
                  {item.isLiked ? '♥' : '♡'} {item.likesCount ?? 0}
                </Text>
              </TouchableOpacity>
            </View>
            {/* Share badge */}
            <View style={styles.feedShareBadge}>
              <TouchableOpacity onPress={() => handleSharePost(item)}>
                <Text style={styles.feedShareBadgeText}>↗</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>

        {/* Card body — tap to navigate */}
        <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`/feed/${item.id}` as any)}>
          <View style={styles.feedContent}>
            {(avatarUri || displayName) && (
              <View style={styles.feedUserRow}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.feedAvatar} contentFit="cover" />
                ) : (
                  <View style={styles.feedAvatarPlaceholder}>
                    <Text style={styles.feedAvatarInitial}>{initial}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  {displayName ? (
                    <Text style={styles.feedUsername} numberOfLines={1}>{displayName}</Text>
                  ) : null}
                  {item.artist?.isVerified && (
                    <Text style={styles.feedVerified}>✓ Verified</Text>
                  )}
                </View>
                {item.commentsCount > 0 && (
                  <Text style={styles.feedCommentCount}>💬 {item.commentsCount}</Text>
                )}
              </View>
            )}
            {label ? (
              <Text style={styles.feedLabel} numberOfLines={2}>{label}</Text>
            ) : null}
            {(item.style || item.category) ? (
              <View style={styles.feedTagRow}>
                {item.style ? <View style={styles.feedTag}><Text style={styles.feedTagText}>{item.style}</Text></View> : null}
                {item.category ? <View style={styles.feedTag}><Text style={styles.feedTagText}>{item.category}</Text></View> : null}
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      </View>
    );
  }, [togglePostLike, handleImagePress, handleSharePost]);
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <BrandLogo size={28} />
          </View>
          <View style={styles.headerRight}>
            <NotificationBell />
            <TouchableOpacity style={styles.searchBtn} onPress={() => router.push('/(tabs)/browse')}>
              <Text style={styles.searchIcon}>🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cartBtn} onPress={() => router.push('/product/cart' as any)}>
              <Text style={styles.cartIcon}>🛒</Text>
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <HeroSlider />
        <CategoryBar />

        {/* Feed Loading State */}
        {feedLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.gold} />
            <Text style={styles.loadingText}>Loading feed…</Text>
          </View>
        )}

        {/* Feed Error State */}
        {feedError && !feedLoading && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠ {feedError}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => { fetchTrendingFeed(); if (user.id) fetchPersonalisedFeed(user.id); }}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Trending Now (Products) */}
        {freshProducts.length > 0 && (
          <>
            <SectionHeader title="Trending Now" subtitle="What's popular on Paznwise" onSeeAll={() => router.push('/(tabs)/browse')} />
            <FlatList
              data={freshProducts}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
              keyExtractor={i => i.id}
              renderItem={({ item }) => (
                <View style={{ width: 160 }}>
                  <ProductCard product={item} />
                </View>
              )}
              initialNumToRender={3}
              maxToRenderPerBatch={3}
              windowSize={3}
            />
          </>
        )}

        {/* Buzz Posts */}
        {trendingPosts.length > 0 && (
          <>
            <SectionHeader title="Buzz Posts" subtitle="What's happening in the community" onSeeAll={() => router.push('/feed')} />
            <FlatList
              data={trendingPosts.slice(0, 10)}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
              keyExtractor={i => String(i.id)}
              renderItem={renderFeedPost}
              initialNumToRender={3}
              maxToRenderPerBatch={3}
              windowSize={3}
            />
          </>
        )}

        {/* Personalised Feed Posts */}
        {feedPosts.length > 0 && (
          <>
            <SectionHeader title="For You" subtitle="Personalised picks" />
            <FlatList
              data={feedPosts.slice(0, 10)}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
              keyExtractor={i => String(i.id)}
              renderItem={renderFeedPost}
              initialNumToRender={3}
              maxToRenderPerBatch={3}
              windowSize={3}
            />
          </>
        )}

        {/* Performers */}
        <SectionHeader title="Live Performers" subtitle="For events & weddings" onSeeAll={() => router.push('/(tabs)/hire')} />
        {performersLoading ? (
          <ActivityIndicator color={Colors.gold} style={{ marginVertical: Spacing.lg }} />
        ) : (
          <FlatList
            data={performers}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
            keyExtractor={i => i.serviceId}
            renderItem={renderPerformerItem}
            initialNumToRender={3}
            maxToRenderPerBatch={3}
            windowSize={3}
            removeClippedSubviews={true}
            ListEmptyComponent={
              <Text style={{ ...Typography.body, fontSize: 13, color: Colors.creamDim, paddingHorizontal: Spacing.md }}>
                No performers available yet
              </Text>
            }
          />
        )}

        {/* Sell / Register CTA */}
        <View style={styles.ctaSection}>
          <LinearGradient colors={['#1C2F45', '#0D1B2A']} style={styles.ctaCard}>
            <View style={styles.ctaGoldLine} />
            <Text style={styles.ctaEyebrow}>For Creators</Text>
            <Text style={styles.ctaTitle}>Share Your Art{'\n'}With the World</Text>
            <View style={styles.ctaBtns}>
              <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/product/create' as any)}>
                <Text style={styles.ctaBtnText}>Sell Artwork</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.ctaBtn, styles.ctaBtnOutline]} onPress={() => router.push('/artist/register-artist')}>
                <Text style={[styles.ctaBtnText, { color: Colors.gold }]}>Register as Performer</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeTop: { backgroundColor: Colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  headerEyebrow: { ...Typography.label, fontSize: 9, color: Colors.creamDim },
  headerTitle: { ...Typography.display, fontSize: 24 },
  headerRight: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  searchBtn: { width: 38, height: 38, backgroundColor: Colors.bgCard, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  searchIcon: { fontSize: 16 },
  cartBtn: { width: 38, height: 38, backgroundColor: Colors.bgCard, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, position: 'relative' },
  cartIcon: { fontSize: 16 },
  cartBadge: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { color: '#fff', fontSize: 9, fontFamily: 'Inter_700Bold' },
  hero: { position: 'relative', height: 300 },
  heroImg: { width, height: 300 },
  heroOverlay: { ...StyleSheet.absoluteFillObject },
  heroContent: { position: 'absolute', bottom: Spacing.xl, left: Spacing.lg, right: Spacing.lg },
  heroEyebrow: { ...Typography.label, marginBottom: Spacing.xs },
  heroTitle: { ...Typography.display, fontSize: 28, lineHeight: 32, marginBottom: Spacing.sm },
  heroCaption: { ...Typography.caption, fontSize: 13, marginBottom: Spacing.md, color: Colors.creamDim },
  heroBtn: { alignSelf: 'flex-start', borderWidth: 1, borderColor: Colors.gold, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full },
  heroBtnText: { ...Typography.label, fontSize: 11, color: Colors.gold },
  heroDots: { position: 'absolute', bottom: Spacing.sm, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.creamFaint },
  dotActive: { width: 18, backgroundColor: Colors.gold },
  catList: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, gap: Spacing.sm },
  catChip: { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard },
  catText: { ...Typography.caption, fontSize: 12, color: Colors.creamDim },
  hList: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  ctaSection: { padding: Spacing.md },
  ctaCard: { borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderGold },
  ctaGoldLine: { width: 36, height: 2, backgroundColor: Colors.gold, marginBottom: Spacing.md },
  ctaEyebrow: { ...Typography.label, marginBottom: Spacing.xs },
  ctaTitle: { ...Typography.display, fontSize: 26, lineHeight: 30, marginBottom: Spacing.lg },
  ctaBtns: { gap: Spacing.sm },
  ctaBtn: { backgroundColor: Colors.gold, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center' },
  ctaBtnOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.gold },
  ctaBtnText: { ...Typography.bodyBold, fontSize: 14, color: Colors.bg },
  // Feed styles
  loadingContainer: { padding: Spacing.xxl, alignItems: 'center', gap: Spacing.md },
  loadingText: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  errorContainer: { padding: Spacing.lg, margin: Spacing.md, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', gap: Spacing.sm },
  errorText: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  retryBtn: { backgroundColor: Colors.gold, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.full },
  retryBtnText: { ...Typography.bodyBold, fontSize: 13, color: Colors.bg },
  feedCard: { width: 220, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  feedImageWrap: { position: 'relative' },
  feedImage: { width: 220, height: 160 },
  feedImagePlaceholder: { width: 220, height: 160, backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  feedImagePlaceholderIcon: { fontSize: 32 },
  feedLikeBadge: { position: 'absolute', bottom: Spacing.xs, right: Spacing.xs, backgroundColor: 'rgba(13,27,42,0.75)', borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  feedLikeBadgeText: { ...Typography.caption, fontSize: 11, color: Colors.cream },
  feedShareBadge: { position: 'absolute', bottom: Spacing.xs, left: Spacing.xs, backgroundColor: 'rgba(13,27,42,0.75)', borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  feedShareBadgeText: { ...Typography.caption, fontSize: 11, color: Colors.cream },
  feedContent: { padding: Spacing.sm, gap: Spacing.xs },
  feedUserRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  feedAvatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: Colors.borderGold },
  feedAvatarPlaceholder: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.borderGold, alignItems: 'center', justifyContent: 'center' },
  feedAvatarInitial: { ...Typography.bodyBold, fontSize: 11, color: Colors.gold },
  feedUsername: { ...Typography.bodySemibold, fontSize: 12, color: Colors.cream },
  feedVerified: { ...Typography.caption, fontSize: 9, color: Colors.gold },
  feedCommentCount: { ...Typography.caption, fontSize: 11, color: Colors.creamFaint },
  feedLabel: { ...Typography.caption, fontSize: 12, color: Colors.creamDim, lineHeight: 17 },
  feedTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  feedTag: { backgroundColor: Colors.gold + '18', borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: Colors.borderGold },
  feedTagText: { ...Typography.caption, fontSize: 10, color: Colors.gold },
  feedText: { ...Typography.caption, fontSize: 12, color: Colors.creamDim, lineHeight: 18 },
  feedMeta: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  feedLikeBtn: { flexDirection: 'row', alignItems: 'center' },
  feedMetaText: { ...Typography.caption, fontSize: 11, color: Colors.creamFaint },
});
