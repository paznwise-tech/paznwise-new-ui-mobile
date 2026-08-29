import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { ArtCard } from '@/components/product/ArtCard';
import { EventCard } from '@/components/events/EventCard';
import { ProductService } from '@/services/productService';
import { useCategories } from '@/hooks/useTaxonomy';
import { EventService } from '@/services/eventService';
import { Artwork, Event } from '@/types';
import { getProductImageUrl } from '@/utils/imageUrl';

const { width } = Dimensions.get('window');

// No icon per category exists on the API, so one is chosen by name with a
// neutral fallback — the tiles are decorative, the labels are the data.
const CATEGORY_EMOJI: Record<string, string> = {
  paint: '🎨', sculpt: '🗿', photo: '📷', digital: '💻',
  print: '🖼️', textile: '🧵', craft: '🪡', jewel: '💍',
};

function emojiFor(label: string): string {
  const lower = label.toLowerCase();
  for (const [needle, emoji] of Object.entries(CATEGORY_EMOJI)) {
    if (lower.includes(needle)) return emoji;
  }
  return '🖌️';
}

const resolveProductImg = (p: any): string => getProductImageUrl(p);

function normalizeArtwork(p: any): Artwork {
  return {
    id: typeof p.id === 'number' ? p.id : parseInt(p.id ?? '0') || 0,
    title: p.title ?? 'Untitled',
    price: p.price ?? 0,
    artist: p.artist?.name ?? p.createdBy?.name ?? p.seller?.name ?? '',
    location: p.location ?? '',
    img: resolveProductImg(p),
    category: p.category ?? undefined,
  };
}

function SectionHeader({ title, subtitle, onSeeAll }: { title: string; subtitle?: string; onSeeAll?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAll}>See all →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function Discover() {
  const { categories } = useCategories();
  const [newArrivals, setNewArrivals] = useState<Artwork[]>([]);
  const [featured, setFeatured]       = useState<Artwork[]>([]);
  const [events, setEvents]           = useState<Event[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    // These two rails used to issue the identical request, so "New Arrivals"
    // and "Featured" showed the same items in the same order.
    Promise.allSettled([
      ProductService.getMarketplaceProducts({ limit: 8, sort: 'newest' }),
      ProductService.getMarketplaceProducts({ limit: 8, sort: 'popular' }),
      EventService.getEvents({ limit: 5 }),
    ]).then(([newRes, featuredRes, eventsRes]) => {
      if (newRes.status === 'fulfilled') {
        const raw = newRes.value as any;
        const list: any[] = Array.isArray(raw.data) ? raw.data : (raw.data?.products ?? raw.data?.items ?? []);
        setNewArrivals(list.slice(0, 6).map(normalizeArtwork));
      }
      if (featuredRes.status === 'fulfilled') {
        const raw = featuredRes.value as any;
        const list: any[] = Array.isArray(raw.data) ? raw.data : (raw.data?.products ?? raw.data?.items ?? []);
        setFeatured(list.slice(0, 6).map(normalizeArtwork));
      }
      if (eventsRes.status === 'fulfilled') setEvents(eventsRes.value);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Discover</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/search' as any)}>
            <Text style={styles.searchIcon}>🔍</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Hero banner */}
        <View style={styles.heroBanner}>
          <LinearGradient
            colors={['rgba(201,168,76,0.15)', 'transparent']}
            style={styles.heroBanner}
          >
            <View style={styles.heroContent}>
              <Text style={styles.heroLabel}>PAZNWISE CURATED</Text>
              <Text style={styles.heroTitle}>Art that tells{'\n'}a story</Text>
              <TouchableOpacity style={styles.heroBtn} onPress={() => router.push('/(tabs)/browse' as any)}>
                <Text style={styles.heroBtnText}>Explore Collection →</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Browse by category */}
        <SectionHeader title="Browse by Category" />
        <View style={styles.catGrid}>
          {categories
            .filter(cat => cat.slug)
            .map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catCard, { borderColor: cat.color + '66' }]}
                onPress={() => router.push(`/product/category/${cat.slug}` as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.catEmoji}>{emojiFor(cat.label)}</Text>
                <Text style={styles.catLabel}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
        </View>

        {/* New Arrivals */}
        {newArrivals.length > 0 && (
          <>
            <SectionHeader
              title="New Arrivals"
              subtitle="Fresh works just listed"
              onSeeAll={() => router.push('/(tabs)/browse' as any)}
            />
            <FlatList
              data={newArrivals}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              keyExtractor={i => String(i.id)}
              renderItem={({ item }) => (
                <View style={{ width: 160 }}>
                  <ArtCard item={item} onPress={() => router.push(`/product/${item.id}` as any)} />
                </View>
              )}
            />
          </>
        )}

        {/* Featured Works */}
        {featured.length > 0 && (
          <>
            <SectionHeader
              title="Featured Works"
              subtitle="Handpicked by our curators"
              onSeeAll={() => router.push('/(tabs)/browse' as any)}
            />
            <FlatList
              data={featured}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              keyExtractor={i => `f-${i.id}`}
              renderItem={({ item }) => (
                <View style={{ width: 160 }}>
                  <ArtCard item={item} onPress={() => router.push(`/product/${item.id}` as any)} />
                </View>
              )}
            />
          </>
        )}

        {/* Events */}
        {events.length > 0 && (
          <>
            <SectionHeader
              title="Upcoming Events"
              subtitle="Don't miss these"
              onSeeAll={() => router.push('/(tabs)/events' as any)}
            />
            <FlatList
              data={events}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              keyExtractor={i => String(i.id)}
              renderItem={({ item }) => (
                <EventCard
                  item={item}
                  onPress={() => router.push(`/events/${item.id}` as any)}
                  horizontal
                />
              )}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  backIcon: { color: Colors.gold, fontSize: 22 },
  title: { ...Typography.display, fontSize: 24 },
  searchIcon: { fontSize: 22 },
  heroBanner: { height: 200, margin: Spacing.md, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.borderGold },
  heroContent: { flex: 1, justifyContent: 'center', padding: Spacing.lg, gap: Spacing.sm },
  heroLabel: { ...Typography.label, fontSize: 10, color: Colors.gold },
  heroTitle: { ...Typography.display, fontSize: 32, lineHeight: 38 },
  heroBtn: {
    alignSelf: 'flex-start', backgroundColor: Colors.gold,
    borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: 10,
  },
  heroBtnText: { ...Typography.bodyBold, fontSize: 13, color: Colors.bg },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  sectionTitle: { ...Typography.heading, fontSize: 20 },
  sectionSubtitle: { ...Typography.caption, fontSize: 12, marginTop: 2 },
  seeAll: { ...Typography.caption, fontSize: 13, color: Colors.gold },
  catGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm,
  },
  catCard: {
    width: (width - Spacing.md * 2 - Spacing.sm * 2) / 3,
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    borderWidth: 1, padding: Spacing.md,
    alignItems: 'center', gap: Spacing.xs,
  },
  catEmoji: { fontSize: 28 },
  catLabel: { ...Typography.caption, fontSize: 12, textAlign: 'center' },
  horizontalList: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
});
