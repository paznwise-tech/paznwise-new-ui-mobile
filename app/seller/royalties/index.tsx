import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { ProductService, type MerchandiseRoyalty } from '@/services/productService';
import { MEDIA_BASE_URL } from '@/services/api';

function resolveImg(url: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${MEDIA_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Merchandise royalties.
 *
 * Read-only by design — the payout and rate are both computed server-side.
 * The rate steps down once an artwork passes a cumulative-payout threshold,
 * so showing the current rate alongside the total is the only way an artist
 * can tell which side of that line a piece is on.
 */
export default function MerchandiseRoyalties() {
  const { data: royalties = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['merchandise-royalties'],
    queryFn: ProductService.getMerchandiseRoyalties,
  });

  const total = royalties.reduce((sum, r) => sum + r.cumulativePayout, 0);

  const renderItem = ({ item }: { item: MerchandiseRoyalty }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => item.productId && router.push(`/product/${item.productId}` as any)}
    >
      {resolveImg(item.thumbnailUrl) ? (
        <Image source={{ uri: resolveImg(item.thumbnailUrl) }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, { backgroundColor: Colors.bgInput }]} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.rate}>{Math.round(item.currentRate * 100)}% royalty rate</Text>
      </View>
      <Text style={styles.payout}>₹{item.cumulativePayout.toLocaleString('en-IN')}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Merchandise Royalties</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.gold} size="large" /></View>
      ) : (
        <FlatList
          data={royalties}
          keyExtractor={r => r.productId}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.gold} />
          }
          ListHeaderComponent={
            royalties.length > 0 ? (
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Total earned from merchandise</Text>
                <Text style={styles.totalValue}>₹{total.toLocaleString('en-IN')}</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 44 }}>🧢</Text>
              <Text style={styles.emptyTitle}>No royalties yet</Text>
              <Text style={styles.emptyText}>
                When your artwork is licensed onto merchandise, your share of each sale appears here.
              </Text>
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
  headerTitle: { ...Typography.display, fontSize: 18 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  totalCard: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.gold + '55',
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, alignItems: 'center',
  },
  totalLabel: { ...Typography.caption, fontSize: 12 },
  totalValue: { ...Typography.display, fontSize: 28, color: Colors.gold, marginTop: 4 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  thumb: { width: 48, height: 48, borderRadius: Radius.sm },
  title: { ...Typography.bodySemibold, fontSize: 14 },
  rate: { ...Typography.caption, fontSize: 12, marginTop: 2 },
  payout: { ...Typography.bodySemibold, fontSize: 15, color: Colors.gold },

  empty: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyTitle: { ...Typography.heading, fontSize: 18, marginTop: Spacing.md },
  emptyText: { ...Typography.caption, fontSize: 13, marginTop: 4, textAlign: 'center', paddingHorizontal: Spacing.lg },
});
