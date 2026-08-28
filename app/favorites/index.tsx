import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { ArtCard } from '@/components/product/ArtCard';
import { FavoritesService, FavoriteItem } from '@/services/favoritesService';

export default function Favorites() {
  const [items, setItems]         = useState<FavoriteItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await FavoritesService.getFavorites();
      setItems(data);
    } catch (e: any) {
      console.warn('[Favorites]', e.message);
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  const handleRemove = useCallback((item: FavoriteItem) => {
    Alert.alert('Remove from Saved', `Remove "${item.title}" from your saved items?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setRemoving(item.favoriteId);
          try {
            await FavoritesService.removeFavorite(item.productId);
            setItems(prev => prev.filter(i => i.favoriteId !== item.favoriteId));
          } catch (e: any) {
            Alert.alert('Error', e.message ?? 'Failed to remove');
          } finally {
            setRemoving(null);
          }
        },
      },
    ]);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Saved</Text>
            {items.length > 0 && (
              <Text style={styles.count}>{items.length} items</Text>
            )}
          </View>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.favoriteId}
          numColumns={2}
          columnWrapperStyle={{ gap: Spacing.sm, paddingHorizontal: Spacing.md }}
          contentContainerStyle={{ paddingTop: Spacing.sm, paddingBottom: 100, gap: Spacing.sm }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.gold} />
          }
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <ArtCard
                item={item}
                onPress={() => router.push(`/product/${item.id}` as any)}
              />
              <TouchableOpacity
                style={[styles.removeBtn, removing === item.favoriteId && { opacity: 0.5 }]}
                onPress={() => handleRemove(item)}
                disabled={removing === item.favoriteId}
              >
                <Text style={styles.removeBtnText}>♡ Remove</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
              <Text style={{ fontSize: 48 }}>❤️</Text>
              <Text style={styles.emptyTitle}>Nothing saved yet</Text>
              <Text style={styles.emptyText}>
                Tap the heart icon on any artwork to save it here
              </Text>
              <TouchableOpacity
                style={{ marginTop: Spacing.md }}
                onPress={() => router.push('/(tabs)/browse' as any)}
              >
                <Text style={{ color: Colors.gold, fontSize: 14 }}>Explore Art →</Text>
              </TouchableOpacity>
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
  cardWrap: { flex: 1 },
  removeBtn: {
    marginTop: -Spacing.sm, marginHorizontal: Spacing.xs,
    paddingVertical: 7, alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderWidth: 1, borderColor: Colors.error + '44', borderRadius: Radius.sm,
    borderTopLeftRadius: 0, borderTopRightRadius: 0,
  },
  removeBtnText: { ...Typography.label, fontSize: 9, color: Colors.error },
  emptyTitle: { ...Typography.heading, fontSize: 20, marginTop: Spacing.md },
  emptyText: { ...Typography.caption, fontSize: 14, textAlign: 'center', marginTop: 4 },
});
