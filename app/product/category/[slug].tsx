import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { ArtCard } from '@/components/product/ArtCard';
import { ProductService } from '@/services/productService';
import { useCategoryBySlug } from '@/hooks/useTaxonomy';
import { Artwork } from '@/types';
import { getProductImageUrl } from '@/utils/imageUrl';

const SORT_OPTIONS = [
  { label: 'Newest',          value: 'newest' },
  { label: 'Price: Low–High', value: 'price-asc' },
  { label: 'Price: High–Low', value: 'price-desc' },
  { label: 'Popular',         value: 'popular' },
  { label: 'Rating',          value: 'rating' },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]['value'];

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
    medium: p.medium ?? undefined,
  };
}

export default function CategoryPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [artworks, setArtworks]     = useState<Artwork[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort]             = useState<SortValue>('newest');
  const [cursor, setCursor]         = useState<string | undefined>(undefined);
  const [hasMore, setHasMore]       = useState(true);

  // The slug is resolved to a real category id. This screen used to fetch the
  // entire catalogue and keep whatever happened to contain the slug in its
  // title or category name — so a category page showed unrelated products and
  // missed most of its own.
  const { data: category, isLoading: categoryLoading } = useCategoryBySlug(slug);
  const categoryName =
    category?.label ??
    (slug ? slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Category');

  const load = useCallback(async (reset = true) => {
    try {
      const res = await ProductService.getMarketplaceProducts({
        limit: 20,
        cursor: reset ? undefined : cursor,
        categoryId: category?.id,
        sort,
      }) as any;
      const list: any[] = Array.isArray(res.data)
        ? res.data
        : (res.data?.products ?? res.data?.items ?? []);
      const normalized = list.map(normalizeArtwork);

      if (reset) setArtworks(normalized);
      else setArtworks(prev => [...prev, ...normalized]);

      const nextCursor = res.nextCursor ?? res.data?.nextCursor;
      setCursor(nextCursor);
      setHasMore(!!nextCursor);
    } catch (e: any) {
      console.warn('[Category]', e.message);
    }
  }, [cursor, category?.id, sort]);

  // Refetch from the start whenever the category resolves or the sort changes;
  // sorting must come from the server or it only reorders the loaded page.
  useEffect(() => {
    if (categoryLoading) return;
    setLoading(true);
    setCursor(undefined);
    load(true).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category?.id, sort, categoryLoading]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    load(true).finally(() => setRefreshing(false));
  }, [load]);


  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>{categoryName}</Text>
            {artworks.length > 0 && (
              <Text style={styles.count}>{artworks.length} works</Text>
            )}
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Sort options */}
        <FlatList
          data={[...SORT_OPTIONS]}
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortList}
          keyExtractor={i => i.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.sortChip, sort === item.value && styles.sortChipActive]}
              onPress={() => setSort(item.value)}
            >
              <Text style={[styles.sortText, sort === item.value && styles.sortTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : (
        <FlatList
          data={artworks}
          keyExtractor={i => String(i.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: Spacing.sm, paddingHorizontal: Spacing.md }}
          contentContainerStyle={{ paddingTop: Spacing.sm, paddingBottom: 100, gap: Spacing.sm }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.gold} />
          }
          renderItem={({ item }) => (
            <ArtCard
              item={item}
              onPress={() => router.push(`/product/${item.id}` as any)}
            />
          )}
          onEndReached={() => { if (hasMore) load(false); }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={hasMore ? (
            <View style={{ padding: Spacing.md, alignItems: 'center' }}>
              <ActivityIndicator color={Colors.gold} />
            </View>
          ) : null}
          ListEmptyComponent={
            <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
              <Text style={{ fontSize: 48 }}>🖼️</Text>
              <Text style={styles.emptyTitle}>No works found</Text>
              <Text style={styles.emptyText}>Try a different category</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  backIcon: { color: Colors.gold, fontSize: 22 },
  title: { ...Typography.display, fontSize: 22 },
  count: { ...Typography.caption, fontSize: 12 },
  sortList: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  sortChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 7,
    borderRadius: Radius.full, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.bgCard,
  },
  sortChipActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '22' },
  sortText: { ...Typography.caption, fontSize: 12, color: Colors.creamDim },
  sortTextActive: { color: Colors.gold },
  emptyTitle: { ...Typography.heading, fontSize: 20, marginTop: Spacing.md },
  emptyText: { ...Typography.caption, fontSize: 14, marginTop: 4 },
});
