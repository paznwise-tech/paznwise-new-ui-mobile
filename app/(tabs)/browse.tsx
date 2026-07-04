import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import ProductCard from '@/components/product/ProductCard';
import { CATEGORIES } from '@/constants/data';
import { useMarketplaceProducts } from '@/hooks/useProducts';

const SORT_OPTIONS = ['Newest', 'Price ↑', 'Price ↓'];

export default function Browse() {
  const [q, setQ]             = useState('');
  const [activeCategory, setCat] = useState('All');
  const [sort, setSort]       = useState('Newest');
  const [showSort, setShowSort] = useState(false);

  const {
    products,
    loading,
    error,
    loadMore,
    refresh,
  } = useMarketplaceProducts(20, activeCategory === 'All' ? undefined : activeCategory.toLowerCase());

  const filtered = useMemo(() => {
    let result = products.filter(p => {
      if (!q) return true;
      const lower = q.toLowerCase();
      return (
        p.title.toLowerCase().includes(lower) ||
        (p.brand?.toLowerCase() ?? '').includes(lower)
      );
    });

    if (sort === 'Price ↑') result = [...result].sort((a, b) => a.price - b.price);
    else if (sort === 'Price ↓') result = [...result].sort((a, b) => b.price - a.price);
    return result;
  }, [products, q, sort]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <Text style={styles.title}>Browse Products</Text>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Text style={styles.count}>{filtered.length} items</Text>
            <TouchableOpacity onPress={() => router.push('/product/marketplace' as any)}>
              <Text style={styles.marketplaceLink}>Marketplace →</Text>
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
            {SORT_OPTIONS.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.sortOption, sort === s && styles.sortOptionActive]}
                onPress={() => { setSort(s); setShowSort(false); }}
              >
                <Text style={[styles.sortOptionText, sort === s && { color: Colors.gold }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Category chips */}
        <FlatList
          data={CATEGORIES}
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catList}
          keyExtractor={i => i.label}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.catChip, activeCategory === item.label && { backgroundColor: item.color + '22', borderColor: item.color }]}
              onPress={() => setCat(item.label)}
            >
              <Text style={[styles.catText, activeCategory === item.label && { color: item.color }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
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
