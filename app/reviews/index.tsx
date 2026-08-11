import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { ReviewService, Review } from '@/services/reviewService';

function StarRating({ rating, onRate }: { rating: number; onRate?: (r: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <TouchableOpacity key={s} onPress={() => onRate?.(s)} disabled={!onRate}>
          <Text style={{ fontSize: 20, color: s <= rating ? Colors.gold : Colors.border }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MyReviews() {
  const [reviews, setReviews]       = useState<Review[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await ReviewService.getMyReviews();
      setReviews(data);
    } catch (e: any) {
      console.warn('[Reviews]', e.message);
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  const handleSubmitReview = useCallback(async () => {
    if (!newComment.trim() || newComment.trim().length < 10) {
      Alert.alert('Error', 'Review must be at least 10 characters');
      return;
    }
    setSubmitting(true);
    try {
      const review = await ReviewService.submitReview({
        productId: '',
        rating: newRating,
        comment: newComment,
      });
      setReviews(prev => [review, ...prev]);
      setShowModal(false);
      setNewComment('');
      setNewRating(5);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  }, [newRating, newComment]);

  const renderItem = useCallback(({ item }: { item: Review }) => (
    <View style={styles.card}>
      {item.productImage && (
        <Image source={{ uri: item.productImage }} style={styles.productImg} contentFit="cover" transition={200} />
      )}
      <View style={styles.cardBody}>
        <Text style={styles.productTitle}>{item.productTitle}</Text>
        <View style={styles.ratingRow}>
          <StarRating rating={item.rating} />
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>
        <Text style={styles.comment}>{item.comment}</Text>
        {item.helpful !== undefined && item.helpful > 0 && (
          <Text style={styles.helpful}>{item.helpful} people found this helpful</Text>
        )}
      </View>
    </View>
  ), []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>My Reviews</Text>
          <TouchableOpacity onPress={() => setShowModal(true)}>
            <Text style={styles.writeBtn}>+ Write</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.gold} />
          }
          ListEmptyComponent={
            <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
              <Text style={{ fontSize: 48 }}>⭐</Text>
              <Text style={styles.emptyTitle}>No reviews yet</Text>
              <Text style={styles.emptyText}>Reviews you write will appear here</Text>
              <TouchableOpacity style={{ marginTop: Spacing.md }} onPress={() => setShowModal(true)}>
                <Text style={{ color: Colors.gold, fontSize: 14 }}>Write a Review →</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Write Review Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write a Review</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>Rating</Text>
            <StarRating rating={newRating} onRate={setNewRating} />
            <Text style={[styles.modalLabel, { marginTop: Spacing.md }]}>Your Review</Text>
            <TextInput
              style={styles.textarea}
              placeholder="Share your experience with this artwork…"
              placeholderTextColor={Colors.creamFaint}
              multiline numberOfLines={5}
              textAlignVertical="top"
              value={newComment}
              onChangeText={setNewComment}
            />
            <GoldButton
              label={submitting ? 'Submitting…' : 'Submit Review'}
              onPress={handleSubmitReview}
              fullWidth size="lg"
              disabled={submitting}
            />
          </View>
        </View>
      </Modal>
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
  writeBtn: { ...Typography.bodySemibold, fontSize: 14, color: Colors.gold },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 100, gap: Spacing.md },
  card: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  productImg: { width: '100%', height: 120 },
  cardBody: { padding: Spacing.md, gap: Spacing.sm },
  productTitle: { ...Typography.heading, fontSize: 16 },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { ...Typography.caption, fontSize: 11 },
  comment: { ...Typography.body, fontSize: 14, color: Colors.creamDim, lineHeight: 22 },
  helpful: { ...Typography.caption, fontSize: 11, color: Colors.gold },
  emptyTitle: { ...Typography.heading, fontSize: 20, marginTop: Spacing.md },
  emptyText: { ...Typography.caption, fontSize: 14, marginTop: 4, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.bgElevated, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    padding: Spacing.lg, gap: Spacing.md, paddingBottom: 40,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { ...Typography.heading, fontSize: 22 },
  modalClose: { color: Colors.creamDim, fontSize: 20 },
  modalLabel: { ...Typography.label, fontSize: 10 },
  textarea: {
    backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md,
    ...Typography.body, fontSize: 14, color: Colors.cream, height: 120, textAlignVertical: 'top',
  },
});
