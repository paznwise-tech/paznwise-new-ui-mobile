import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { ReviewService, type Review } from '@/services/reviewService';

export default function MyReviewsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const data = await ReviewService.getMyReviews();
      setReviews(data);
    } catch (err: any) {
      console.warn('[MyReviews] Error fetching reviews:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text key={i} style={styles.starText}>
          {i <= rating ? '★' : '☆'}
        </Text>
      );
    }
    return <View style={styles.starsRow}>{stars}</View>;
  };

  const handleDelete = (item: Review) => {
    Alert.alert('Delete review', `Remove your review of "${item.productTitle}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await ReviewService.deleteReview(item.id);
            setReviews(prev => prev.filter(r => r.id !== item.id));
          } catch (e: any) {
            Alert.alert('Could not delete', e?.message ?? 'Please try again.');
          }
        },
      },
    ]);
  };

  const renderReviewItem = ({ item }: { item: Review }) => {
    const dateStr = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.productTitle}>{item.productTitle}</Text>
          <Text style={styles.dateText}>{dateStr}</Text>
        </View>

        {renderStars(item.rating)}

        <Text style={styles.reviewComment}>{item.comment}</Text>

        {/* Moderation state matters here: a pending or rejected review is
            not visible on the product, and the author should know. */}
        {item.status && item.status.toUpperCase() !== 'APPROVED' ? (
          <Text style={styles.pending}>
            {item.status.toUpperCase() === 'REJECTED' ? 'Rejected by moderation' : 'Awaiting approval'}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/reviews/write',
                params: {
                  productId: item.productId,
                  productTitle: item.productTitle,
                  reviewId: item.id,
                  rating: String(item.rating),
                  comment: item.comment,
                },
              } as any)
            }
          >
            <Text style={styles.action}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)}>
            <Text style={[styles.action, { color: Colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Reviews</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.gold} />
          <Text style={styles.loadingText}>Loading Reviews...</Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item, index) => (item.id || index).toString()}
          renderItem={renderReviewItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.gold} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No Reviews Written</Text>
              <Text style={styles.emptySub}>Reviews you leave on purchased artworks and artist profiles will appear here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm,
  },
  action: { ...Typography.bodySemibold, fontSize: 13, color: Colors.gold },
  pending: { ...Typography.caption, fontSize: 12, color: Colors.gold, marginTop: 6 },
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
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  productTitle: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: Colors.cream,
    flex: 1,
  },
  dateText: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.creamDim,
  },
  starsRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  starText: {
    color: Colors.gold,
    fontSize: 14,
    marginRight: 2,
  },
  reviewComment: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.creamDim,
    lineHeight: 18,
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
    lineHeight: 18,
  },
});
