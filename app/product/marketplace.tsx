import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Typography, Spacing } from '@/constants/theme';
import ProductCard from '@/components/product/ProductCard';
import { useMarketplaceProducts } from '@/hooks/useProducts';

const CATEGORIES = ['All', 'Art', 'Handicraft', 'Digital', 'Clothing'];

export default function Marketplace() {
  const [activeCategory, setActiveCategory] = useState('All');
  
  const {
    products,
    loading,
    error,
    loadMore,
    refresh
  } = useMarketplaceProducts(10, activeCategory === 'All' ? undefined : activeCategory.toLowerCase());

  const handleCategoryPress = (category: string) => {
    setActiveCategory(category);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bgCard }} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Marketplace</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/product/cart' as any)}>
          <Text style={styles.headerIcon}>🛒</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterStrip}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={item => item}
          contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.sm }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.filterChip, activeCategory === item && styles.filterChipActive]}
              onPress={() => handleCategoryPress(item)}
            >
              <Text style={[styles.filterText, activeCategory === item && styles.filterTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {error && !products.length ? (
        <View style={styles.center}>
          <Text style={{ color: Colors.error }}>{error}</Text>
          <TouchableOpacity onPress={refresh} style={{ marginTop: Spacing.md }}>
            <Text style={{ color: Colors.gold }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
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
          ListEmptyComponent={
            !loading ? (
              <View style={styles.center}>
                <Text style={styles.emptyText}>No products found in this category.</Text>
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
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { padding: Spacing.xs },
  backIcon: { color: Colors.gold, fontSize: 22 },
  headerTitle: { ...Typography.heading, fontSize: 20 },
  iconBtn: { padding: Spacing.xs },
  headerIcon: { fontSize: 20 },
  filterStrip: {
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgElevated,
  },
  filterChipActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  filterText: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.creamDim,
  },
  filterTextActive: {
    ...Typography.bodySemibold,
    color: Colors.bg,
  },
  grid: {
    padding: Spacing.sm,
  },
  row: {
    justifyContent: 'space-between',
  },
  cardWrapper: {
    flex: 1,
    maxWidth: '48.5%',
    marginBottom: Spacing.md,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.creamDim,
    textAlign: 'center',
    marginTop: 40,
  }
});
