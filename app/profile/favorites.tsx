import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { userService } from '@/services/userService';

export default function FavoritesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<any[]>([]);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const data = await userService.getFavorites();
      setFavorites(data);
    } catch (err: any) {
      console.warn('[Favorites] Error fetching favorites:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFavorites();
  };

  const handleRemoveFavorite = async (productId: string | number) => {
    try {
      await userService.toggleFavorite(productId);
      setFavorites((prev) => prev.filter((item) => (item.product?.id || item.id) !== productId));
    } catch (err: any) {
      console.warn('[Favorites] Error toggling favorite:', err.message);
    }
  };

  const renderFavoriteItem = ({ item }: { item: any }) => {
    const product = item.product || item;
    const imgUrl = product.thumbnailUrl || product.productImages?.[0] || product.images?.[0] || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400&h=300&fit=crop';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: '/product/[id]' as any,
            params: { id: (product.id || item.id).toString() },
          })
        }
        activeOpacity={0.8}
      >
        <Image source={{ uri: imgUrl }} style={styles.artworkImg} contentFit="cover" />
        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <Text style={styles.productTitle} numberOfLines={1}>
              {product.title || 'Saved Artwork'}
            </Text>
            <TouchableOpacity
              onPress={() => handleRemoveFavorite(product.id || item.id)}
              style={styles.heartBtn}
            >
              <Text style={styles.heartIcon}>❤️</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.artistName}>{product.medium || product.category || 'Fine Art'}</Text>
          <Text style={styles.priceText}>
            ₹{(product.price || 0).toLocaleString('en-IN')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favorites</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.gold} />
          <Text style={styles.loadingText}>Loading Favorites...</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item, index) => (item.id || index).toString()}
          renderItem={renderFavoriteItem}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.gold} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No Favorites Saved</Text>
              <Text style={styles.emptySub}>Tap the heart icon on any artwork to save it to your personal wishlist.</Text>
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => router.replace('/(tabs)/browse')}
              >
                <Text style={styles.browseBtnText}>Explore Artworks</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backBtnText: {
    fontSize: 20,
    color: Colors.cream,
  },
  headerTitle: {
    ...Typography.display,
    fontSize: 18,
    color: Colors.cream,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...Typography.bodySemibold,
    color: Colors.cream,
    marginTop: Spacing.md,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  columnWrapper: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  artworkImg: {
    width: '100%',
    height: 140,
  },
  cardBody: {
    padding: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productTitle: {
    ...Typography.bodyBold,
    fontSize: 13,
    color: Colors.cream,
    flex: 1,
  },
  heartBtn: {
    padding: 2,
  },
  heartIcon: {
    fontSize: 14,
  },
  artistName: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.creamDim,
    marginTop: 2,
  },
  priceText: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: Colors.gold,
    marginTop: 4,
  },
  emptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.display,
    fontSize: 20,
    color: Colors.cream,
    marginBottom: 4,
  },
  emptySub: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.creamDim,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  browseBtn: {
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  browseBtnText: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: '#0D1B2A',
  },
});
