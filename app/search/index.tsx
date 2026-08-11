import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { SearchService, SearchUser } from '@/services/searchService';
import { EventService } from '@/services/eventService';
import { ProductService } from '@/services/productService';
import { Event, Artwork } from '@/types';

const { width } = Dimensions.get('window');

const TABS = ['All', 'Art', 'Events', 'Artists'] as const;
type Tab = typeof TABS[number];

const PLACEHOLDER_AVATAR = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop';

function resolveProductImg(p: any): string {
  const url = p.images?.[0]?.url ?? p.images?.[0] ?? p.image ?? p.img ?? p.thumbnail ?? '';
  if (!url) return 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=200';
  if (url.startsWith('http')) return url;
  return `https://bucket-6ywfl4.s3.ap-south-1.amazonaws.com/${url}`;
}

function normalizeArtwork(p: any): Artwork {
  return {
    id: typeof p.id === 'number' ? p.id : parseInt(p.id ?? '0') || 0,
    title: p.title ?? p.name ?? 'Untitled',
    price: p.price ?? 0,
    artist: p.artist?.name ?? p.createdBy?.name ?? p.seller?.name ?? '',
    location: p.location ?? '',
    img: resolveProductImg(p),
    category: p.category ?? undefined,
  };
}

export default function GlobalSearch() {
  const [query, setQuery]             = useState('');
  const [tab, setTab]                 = useState<Tab>('All');
  const [loading, setLoading]         = useState(false);
  const [artists, setArtists]         = useState<SearchUser[]>([]);
  const [events, setEvents]           = useState<Event[]>([]);
  const [artworks, setArtworks]       = useState<Artwork[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setArtists([]); setEvents([]); setArtworks([]);
      return;
    }
    setLoading(true);
    try {
      const [usersRes, eventsRes, productsRes] = await Promise.allSettled([
        SearchService.searchUsers(q, { limit: 10 }),
        EventService.getEvents({ search: q, limit: 10 }),
        ProductService.getMarketplaceProducts({ limit: 10 }),
      ]);
      if (usersRes.status === 'fulfilled') setArtists(usersRes.value);
      if (eventsRes.status === 'fulfilled') setEvents(eventsRes.value);
      if (productsRes.status === 'fulfilled') {
        const raw = productsRes.value as any;
        const list: any[] = Array.isArray(raw.data) ? raw.data : (raw.data?.products ?? raw.data?.items ?? []);
        setArtworks(list.map(normalizeArtwork).filter(a => a.title.toLowerCase().includes(q.toLowerCase())));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, runSearch]);

  const hasResults = artists.length + events.length + artworks.length > 0;
  const isEmpty = query.trim().length >= 2 && !loading && !hasResults;

  const renderArtistItem = useCallback(({ item }: { item: SearchUser }) => (
    <TouchableOpacity
      style={styles.artistItem}
      onPress={() => router.push(`/artist/${item.id}` as any)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.avatar ?? PLACEHOLDER_AVATAR }}
        style={styles.artistAvatar}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.artistInfo}>
        <Text style={styles.artistName}>{item.name}</Text>
        {item.username ? <Text style={styles.artistHandle}>@{item.username}</Text> : null}
        {item.role ? <Text style={styles.artistRole}>{item.role}</Text> : null}
      </View>
      {item.isVerified && (
        <View style={styles.verifiedBadge}><Text style={{ color: Colors.bg, fontSize: 9 }}>✓</Text></View>
      )}
    </TouchableOpacity>
  ), []);

  const renderEventItem = useCallback(({ item }: { item: Event }) => (
    <TouchableOpacity
      style={styles.eventItem}
      onPress={() => router.push(`/events/${item.id}` as any)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.img }} style={styles.eventImg} contentFit="cover" transition={200} />
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.eventMeta}>📅 {item.date}</Text>
        {item.city ? <Text style={styles.eventMeta}>📍 {item.city}</Text> : null}
        <Text style={styles.eventPrice}>{item.price === 0 ? 'Free' : `₹${item.price}`}</Text>
      </View>
    </TouchableOpacity>
  ), []);

  const renderArtworkItem = useCallback(({ item }: { item: Artwork }) => (
    <TouchableOpacity
      style={styles.artworkItem}
      onPress={() => router.push(`/product/${item.id}` as any)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.img }} style={styles.artworkImg} contentFit="cover" transition={200} />
      <View style={styles.artworkInfo}>
        <Text style={styles.artworkTitle} numberOfLines={1}>{item.title}</Text>
        {item.artist ? <Text style={styles.artworkArtist}>{item.artist}</Text> : null}
        <Text style={styles.artworkPrice}>₹{item.price.toLocaleString('en-IN')}</Text>
      </View>
    </TouchableOpacity>
  ), []);

  const visibleArtists = (tab === 'All' || tab === 'Artists') ? artists : [];
  const visibleEvents  = (tab === 'All' || tab === 'Events')  ? events  : [];
  const visibleArtwork = (tab === 'All' || tab === 'Art')     ? artworks : [];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        {/* Search bar */}
        <View style={styles.searchBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Search art, events, artists…"
            placeholderTextColor={Colors.creamFaint}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {/* Empty / loading / results */}
      {query.trim().length < 2 ? (
        <View style={styles.promptWrap}>
          <Text style={{ fontSize: 48 }}>🔍</Text>
          <Text style={styles.promptText}>Search Paznwise</Text>
          <Text style={styles.promptSub}>Find artworks, events, and artists</Text>
        </View>
      ) : loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : isEmpty ? (
        <View style={styles.promptWrap}>
          <Text style={{ fontSize: 48 }}>😔</Text>
          <Text style={styles.promptText}>No results for "{query}"</Text>
          <Text style={styles.promptSub}>Try different keywords</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.results}
          showsVerticalScrollIndicator={false}
          data={[]}
          renderItem={null}
          keyExtractor={() => ''}
          ListHeaderComponent={
            <>
              {/* Artists section */}
              {visibleArtists.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Artists</Text>
                  {visibleArtists.map(a => (
                    <View key={a.id}>{renderArtistItem({ item: a } as any)}</View>
                  ))}
                </>
              )}

              {/* Events section */}
              {visibleEvents.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Events</Text>
                  {visibleEvents.map(e => (
                    <View key={e.id}>{renderEventItem({ item: e } as any)}</View>
                  ))}
                </>
              )}

              {/* Artworks section */}
              {visibleArtwork.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Artworks</Text>
                  {visibleArtwork.map(a => (
                    <View key={a.id}>{renderArtworkItem({ item: a } as any)}</View>
                  ))}
                </>
              )}
            </>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm,
  },
  backIcon: { color: Colors.gold, fontSize: 22 },
  input: {
    flex: 1, backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 10,
    ...Typography.body, fontSize: 15, color: Colors.cream,
  },
  clearBtn: { color: Colors.creamDim, fontSize: 16, paddingHorizontal: 4 },
  tabs: {
    flexDirection: 'row', marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: 4,
  },
  tab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.sm },
  tabActive: { backgroundColor: Colors.bgElevated },
  tabText: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  tabTextActive: { color: Colors.cream, fontFamily: 'Inter_600SemiBold' },
  promptWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  promptText: { ...Typography.heading, fontSize: 20 },
  promptSub: { ...Typography.caption, fontSize: 14, textAlign: 'center' },
  results: { paddingBottom: 100 },
  sectionTitle: {
    ...Typography.heading, fontSize: 18,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  artistItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  artistAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: Colors.borderGold },
  artistInfo: { flex: 1 },
  artistName: { ...Typography.bodySemibold, fontSize: 15 },
  artistHandle: { ...Typography.caption, fontSize: 12 },
  artistRole: { ...Typography.label, fontSize: 8, color: Colors.gold, marginTop: 2 },
  verifiedBadge: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  eventItem: {
    flexDirection: 'row', gap: Spacing.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  eventImg: { width: 80, height: 70, borderRadius: Radius.sm },
  eventInfo: { flex: 1, gap: 2 },
  eventTitle: { ...Typography.bodySemibold, fontSize: 14 },
  eventMeta: { ...Typography.caption, fontSize: 11 },
  eventPrice: { ...Typography.bodyBold, fontSize: 13, color: Colors.gold },
  artworkItem: {
    flexDirection: 'row', gap: Spacing.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  artworkImg: { width: 70, height: 70, borderRadius: Radius.sm },
  artworkInfo: { flex: 1, gap: 2, justifyContent: 'center' },
  artworkTitle: { ...Typography.bodySemibold, fontSize: 14 },
  artworkArtist: { ...Typography.caption, fontSize: 12 },
  artworkPrice: { ...Typography.bodyBold, fontSize: 13, color: Colors.gold },
});
