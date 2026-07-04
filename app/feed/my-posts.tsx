import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { useMyPosts } from '@/hooks/usePosts';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.md * 2 - Spacing.sm) / 2;

const STATUS_COLOR: Record<string, string> = {
  APPROVED: Colors.success ?? '#4CAF50',
  PENDING:  Colors.warning ?? '#FFC107',
  REJECTED: Colors.error   ?? '#F44336',
};

export default function MyPosts() {
  const { posts, loading, error, refresh, deletePost } = useMyPosts();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = (id: number) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(id);
            await deletePost(id);
            setDeletingId(null);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bgCard }} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Posts</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/feed/create' as any)}
        >
          <Text style={styles.addBtnText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      {error && !posts.length ? (
        <View style={styles.center}>
          <Text style={{ color: Colors.error }}>{error}</Text>
          <TouchableOpacity onPress={refresh} style={{ marginTop: Spacing.md }}>
            <Text style={{ color: Colors.gold }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          refreshControl={
            <RefreshControl
              refreshing={loading && posts.length === 0}
              onRefresh={refresh}
              tintColor={Colors.gold}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image
                source={{ uri: item.imageUrls?.[0] ?? 'https://via.placeholder.com/400?text=No+Image' }}
                style={styles.image}
                contentFit="cover"
              />
              {item.imageUrls?.length > 1 && (
                <View style={styles.multiIcon}>
                  <Text style={styles.multiIconText}>⧉</Text>
                </View>
              )}
              <View style={styles.cardBody}>
                {item.title ? (
                  <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                ) : null}
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[item.status ?? ''] ?? Colors.creamDim }]} />
                  <Text style={styles.statusText}>{item.status ?? 'PENDING'}</Text>
                </View>
                <View style={styles.stats}>
                  <Text style={styles.stat}>♥ {item.likesCount}</Text>
                  <Text style={styles.stat}>💬 {item.commentsCount}</Text>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => router.push(`/feed/edit/${item.id}` as any)}
                  >
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteActionBtn]}
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
          ListEmptyComponent={
            !loading ? (
              <View style={styles.center}>
                <Text style={styles.emptyText}>You haven't posted anything yet.</Text>
                <TouchableOpacity
                  style={styles.emptyCta}
                  onPress={() => router.push('/feed/create' as any)}
                >
                  <Text style={styles.emptyCtaText}>Create your first post</Text>
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
    paddingBottom: 40,
  },
  row: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.card,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.bgElevated,
  },
  multiIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  multiIconText: { color: '#fff', fontSize: 11 },
  cardBody: {
    padding: Spacing.sm,
    gap: 4,
  },
  title: {
    ...Typography.bodySemibold,
    fontSize: 13,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.creamDim,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  stat: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.creamDim,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  deleteActionBtn: {
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  actionText: {
    ...Typography.label,
    fontSize: 11,
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
  },
});
