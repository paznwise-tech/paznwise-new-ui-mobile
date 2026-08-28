import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import ProductCard from '@/components/product/ProductCard';
import { useCategories, ALL_CATEGORY } from '@/hooks/useTaxonomy';
import { useDebounced } from '@/hooks/useDebounced';
import { useMarketplaceProducts } from '@/hooks/useProducts';

const SORT_OPTIONS = [
  { label: 'Newest',   value: 'newest' },
  { label: 'Price ↑',  value: 'price-asc' },
  { label: 'Price ↓',  value: 'price-desc' },
  { label: 'Popular',  value: 'popular' },
  { label: 'Rating',   value: 'rating' },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]['value'];

export default function Browse() {
  const [q, setQ]               = useState('');
  const [activeCategory, setCat] = useState(ALL_CATEGORY);
  const [sort, setSort]          = useState<SortValue>('newest');
  const [showSort, setShowSort]  = useState(false);

  const { categories } = useCategories();
  // Typing must not fire a request per keystroke.
  const debouncedQ = useDebounced(q, 350);

  const {
    products,
    loading,
    error,
    loadMore,
    refresh,
  } = useMarketplaceProducts(20, {
    categoryId: activeCategory.id === ALL_CATEGORY.id ? undefined : activeCategory.id,
    search: debouncedQ || undefined,
    sort,
  });

  // Search and sort are applied by the API, so the list is already the result.
  const filtered = products;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <Text style={styles.title}>Browse Products</Text>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Text style={styles.count}>{filtered.length} items</Text>
            <TouchableOpacity onPress={() => router.push('/discover' as any)}>
              <Text style={styles.marketplaceLink}>Discover →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              value={q} onChangeText={setQ}
              placeholder="Search products, brands…"
              placeholderTextColor={Colors.creamFaint}
              style={styles.searchInput}
            />
            {q ? <TouchableOpacity onPress={() => setQ('')}><Text style={styles.clearIcon}>✕</Text></TouchableOpacity> : null}
          </View>
          <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSort(!showSort)}>
            <Text style={styles.sortIcon}>⇅</Text>
          </TouchableOpacity>
        </View>

        {/* Sort dropdown */}
        {showSort && (
          <View style={styles.sortDropdown}>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.sortOption, sort === opt.value && styles.sortOptionActive]}
                onPress={() => { setSort(opt.value); setShowSort(false); }}
              >
                <Text style={[styles.sortOptionText, sort === opt.value && { color: Colors.gold }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Category chips */}
        <FlatList
          data={categories}
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catList}
          keyExtractor={i => i.id}
          renderItem={({ item }) => {
            const active = activeCategory.id === item.id;
            return (
              <TouchableOpacity
                style={[styles.catChip, active && { backgroundColor: item.color + '22', borderColor: item.color }]}
                onPress={() => setCat(item)}
              >
                <Text style={[styles.catText, active && { color: item.color }]}>{item.label}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>

      {error && !products.length ? (
        <View style={styles.center}>
          <Text style={{ color: Colors.error, marginBottom: Spacing.md }}>{error}</Text>
          <TouchableOpacity onPress={refresh}>
            <Text style={{ color: Colors.gold }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <ProductCard product={item} />
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={loading && products.length === 0}
              onRefresh={refresh}
              tintColor={Colors.gold}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            loading && products.length === 0 ? (
              <View style={styles.center}>
                <ActivityIndicator color={Colors.gold} size="large" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No products found</Text>
                <Text style={styles.emptyText}>Try a different search or category</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            loading && products.length > 0 ? (
              <ActivityIndicator color={Colors.gold} style={{ padding: Spacing.lg }} />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.xs, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { ...Typography.display, fontSize: 26 },
  count: { ...Typography.caption, fontSize: 12 },
  marketplaceLink: { ...Typography.caption, fontSize: 12, color: Colors.gold },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, minHeight: 200 },
  searchRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.bgInput, borderRadius: Radius.full, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, height: 44 },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, ...Typography.body, fontSize: 14, color: Colors.cream },
  clearIcon: { color: Colors.creamDim, fontSize: 14 },
  sortBtn: { width: 44, height: 44, backgroundColor: Colors.bgCard, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  sortIcon: { color: Colors.gold, fontSize: 18 },
  sortDropdown: { marginHorizontal: Spacing.md, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm, overflow: 'hidden' },
  sortOption: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sortOptionActive: { backgroundColor: Colors.bgCard },
  sortOptionText: { ...Typography.body, fontSize: 14, color: Colors.creamDim },
  catList: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  catChip: { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard },
  catText: { ...Typography.caption, fontSize: 12, color: Colors.creamDim },
  grid: { paddingHorizontal: Spacing.md, paddingBottom: 100 },
  row: { gap: Spacing.sm, justifyContent: 'space-between' },
  cardWrapper: { flex: 1, maxWidth: '48.5%', marginBottom: Spacing.sm },
  empty: { padding: Spacing.xxl, alignItems: 'center' },
  emptyTitle: { ...Typography.heading, fontSize: 18, marginBottom: Spacing.sm },
  emptyText: { ...Typography.caption, fontSize: 14 },
});
