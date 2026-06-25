// Home — Discovery feed with hero slider, categories, artworks, performers, events
import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, Dimensions, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { ArtCard } from '@/components/ArtCard';
import { PerformerCard } from '@/components/PerformerCard';
import { EventCard } from '@/components/EventCard';
import { SectionHeader } from '@/components/SectionHeader';
import { EVENTS, HERO_SLIDES, CATEGORIES } from '@/constants/data';
import { useAppData, useCart } from '@/context/AppContext';
import { Artwork, Performer, Event } from '@/types';

const { width } = Dimensions.get('window');

function HeroSlider() {
  const [active, setActive] = useState(0);

  const renderHeroItem = useCallback(({ item }: { item: typeof HERO_SLIDES[0] }) => (
    <View style={{ width }}>
      <Image source={{ uri: item.img }} style={styles.heroImg} contentFit="cover" transition={400} />
      <LinearGradient colors={['rgba(13,27,42,0.1)', 'rgba(13,27,42,0.7)', Colors.bg]} locations={[0, 0.6, 1]} style={styles.heroOverlay} />
      <View style={styles.heroContent}>
        <Text style={styles.heroEyebrow}>Featured Collection</Text>
        <Text style={styles.heroTitle}>{item.title}</Text>
        <Text style={styles.heroCaption}>{item.caption}</Text>
        <TouchableOpacity style={styles.heroBtn} onPress={() => router.push('/(tabs)/browse')}>
          <Text style={styles.heroBtnText}>Explore →</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), []);

  const onScroll = useCallback((e: any) => {
    setActive(Math.round(e.nativeEvent.contentOffset.x / width));
  }, []);

  return (
    <View style={styles.hero}>
      <FlatList
        data={HERO_SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={i => String(i.id)}
        renderItem={renderHeroItem}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={2}
      />
      <View style={styles.heroDots}>
        {HERO_SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, active === i && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

function CategoryBar() {
  const [active, setActive] = useState('All');

  const renderCatItem = useCallback(({ item }: { item: typeof CATEGORIES[0] }) => (
    <TouchableOpacity
      onPress={() => setActive(item.label)}
      style={[styles.catChip, active === item.label && { borderColor: item.color, backgroundColor: item.color + '22' }]}
    >
      <Text style={[styles.catText, active === item.label && { color: item.color }]}>{item.label}</Text>
    </TouchableOpacity>
  ), [active]);

  return (
    <FlatList
      data={CATEGORIES}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.catList}
      keyExtractor={i => i.label}
      renderItem={renderCatItem}
      initialNumToRender={7}
    />
  );
}

export default function Home() {
  const { artworks, performers } = useAppData();
  const { cart } = useCart();

  const handleArtPress = useCallback((id: number) => {
    router.push(`/artwork/${id}` as any);
  }, []);

  const handlePerformerPress = useCallback((id: number) => {
    router.push(`/book/${id}` as any);
  }, []);

  const handleEventPress = useCallback(() => {
    router.push('/(tabs)/events');
  }, []);

  const renderArtItem = useCallback(({ item }: { item: Artwork }) => (
    <ArtCard item={item} onPress={() => handleArtPress(item.id)} />
  ), [handleArtPress]);

  const renderPerformerItem = useCallback(({ item }: { item: Performer }) => (
    <PerformerCard item={item} onPress={() => handlePerformerPress(item.id)} />
  ), [handlePerformerPress]);

  const renderEventItem = useCallback(({ item }: { item: Event }) => (
    <EventCard item={item} onPress={handleEventPress} horizontal />
  ), [handleEventPress]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerEyebrow}>Good morning</Text>
            <Text style={styles.headerTitle}>Paznwise</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.searchBtn} onPress={() => router.push('/(tabs)/browse')}>
              <Text style={styles.searchIcon}>🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cartBtn} onPress={() => router.push('/cart')}>
              <Text style={styles.cartIcon}>🛒</Text>
              {cart.length > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cart.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <HeroSlider />
        <CategoryBar />

        {/* Fresh Artworks */}
        <SectionHeader title="Fresh Artworks" subtitle="Newly listed originals" onSeeAll={() => router.push('/(tabs)/browse')} />
        <FlatList
          data={artworks.slice(0, 6)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hList}
          keyExtractor={i => String(i.id)}
          renderItem={renderArtItem}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={3}
          removeClippedSubviews={true}
        />

        {/* Performers */}
        <SectionHeader title="Live Performers" subtitle="For events & weddings" onSeeAll={() => router.push('/(tabs)/hire')} />
        <FlatList
          data={performers}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hList}
          keyExtractor={i => String(i.id)}
          renderItem={renderPerformerItem}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={3}
          removeClippedSubviews={true}
        />

        {/* Events */}
        <SectionHeader title="Upcoming Events" subtitle="Exhibitions, workshops & shows" onSeeAll={() => router.push('/(tabs)/events')} />
        <FlatList
          data={EVENTS}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hList}
          keyExtractor={i => String(i.id)}
          renderItem={renderEventItem}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          windowSize={2}
          removeClippedSubviews={true}
        />

        {/* Sell / Register CTA */}
        <View style={styles.ctaSection}>
          <LinearGradient colors={['#1C2F45', '#0D1B2A']} style={styles.ctaCard}>
            <View style={styles.ctaGoldLine} />
            <Text style={styles.ctaEyebrow}>For Creators</Text>
            <Text style={styles.ctaTitle}>Share Your Art{"\n"}With the World</Text>
            <View style={styles.ctaBtns}>
              <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/sell')}>
                <Text style={styles.ctaBtnText}>Sell Artwork</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.ctaBtn, styles.ctaBtnOutline]} onPress={() => router.push('/register-artist')}>
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
});
