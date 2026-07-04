import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { useMyProducts } from '@/hooks/useProducts';
import { API_BASE_URL } from '@/services/api';

export default function MyListings() {
  const { products, loading, error, refresh, deleteProduct } = useMyProducts();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this product? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setDeletingId(id);
            await deleteProduct(id);
            setDeletingId(null);
          }
        }
      ]
    );
  };

  const getImageUrl = (url?: string) => {
    if (!url) return 'https://via.placeholder.com/400?text=No+Image';
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bgCard }} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Listings</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/product/create' as any)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
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
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image
                source={{ uri: getImageUrl((item.productImages?.[0] ?? item.images?.[0])) }}
                style={styles.image}
                contentFit="cover"
              />
              <View style={styles.cardContent}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.price}>₹{item.price.toLocaleString('en-IN')}</Text>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Status:</Text>
                  <Text style={[styles.statusValue, item.status === 'PUBLISHED' ? { color: Colors.success } : { color: Colors.warning }]}>
                    {item.status}
                  </Text>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity 
                    style={styles.actionBtn} 
                    onPress={() => router.push(`/product/edit/${item.id}` as any)}
                  >
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.deleteBtn]} 
                    onPress={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? (
                      <ActivityIndicator size="small" color={Colors.error} />
                    ) : (
                      <Text style={[styles.actionText, { color: Colors.error }]}>Delete</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          refreshControl={
            <RefreshControl 
              refreshing={loading && products.length === 0} 
              onRefresh={refresh}
              tintColor={Colors.gold}
            />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.center}>
                <Text style={styles.emptyText}>You haven't listed any products yet.</Text>
                <TouchableOpacity 
                  style={styles.emptyCta}
                  onPress={() => router.push('/product/create' as any)}
                >
                  <Text style={styles.emptyCtaText}>Create your first listing</Text>
                </TouchableOpacity>
              </View>
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
    marginTop: 60,
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
  addBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: Colors.gold + '22',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  addBtnText: {
    ...Typography.label,
    color: Colors.gold,
  },
  list: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.card,
  },
  image: {
    width: 100,
    height: '100%',
    backgroundColor: Colors.bgElevated,
  },
  cardContent: {
    flex: 1,
    padding: Spacing.md,
  },
  title: {
    ...Typography.bodySemibold,
    fontSize: 15,
    marginBottom: 4,
  },
  price: {
    ...Typography.bodyBold,
    fontSize: 16,
    color: Colors.gold,
    marginBottom: Spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.md,
  },
  statusLabel: {
    ...Typography.caption,
  },
  statusValue: {
    ...Typography.label,
    fontSize: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  deleteBtn: {
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  actionText: {
    ...Typography.bodySemibold,
    fontSize: 13,
    color: Colors.gold,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.creamDim,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  emptyCta: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.gold,
    borderRadius: Radius.full,
  },
  emptyCtaText: {
    ...Typography.bodyBold,
    color: Colors.bg,
  }
});
