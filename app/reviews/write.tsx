import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { ReviewService } from '@/services/reviewService';

const RATING_WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

/**
 * Write or edit a review.
 *
 * Always entered with a productId — the previous "My Reviews" screen had a
 * rating modal that submitted `productId: ''` with no way to choose a
 * product, so nothing it sent could succeed.
 *
 * Eligibility is checked server-side via /can-review, which enforces that
 * the reviewer actually bought the item.
 */
export default function WriteReview() {
  const { productId, productTitle, reviewId, rating: initialRating, comment: initialComment } =
    useLocalSearchParams<{
      productId: string;
      productTitle?: string;
      reviewId?: string;
      rating?: string;
      comment?: string;
    }>();

  const isEdit = !!reviewId;
  const qc = useQueryClient();

  const [rating, setRating] = useState(Number(initialRating) || 0);
  const [comment, setComment] = useState(initialComment ?? '');
  const [checking, setChecking] = useState(!isEdit);
  const [eligible, setEligible] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Editing an existing review needs no purchase check — it already passed.
    if (isEdit || !productId) return;
    ReviewService.canReview(String(productId))
      .then(setEligible)
      .finally(() => setChecking(false));
  }, [isEdit, productId]);

  const handleSubmit = useCallback(async () => {
    if (rating < 1) {
      Alert.alert('Rating required', 'Tap a star to rate this product.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await ReviewService.updateReview(String(reviewId), { rating, comment: comment.trim() });
      } else {
        await ReviewService.submitReview({
          productId: String(productId),
          rating,
          comment: comment.trim(),
        });
      }
      qc.invalidateQueries({ queryKey: ['my-reviews'] });
      qc.invalidateQueries({ queryKey: ['product-reviews', String(productId)] });
      Alert.alert(
        isEdit ? 'Review updated' : 'Review submitted',
        isEdit ? 'Your changes have been saved.' : 'Thanks — your review may take a moment to appear.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e: any) {
      Alert.alert('Could not save review', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  }, [isEdit, reviewId, productId, rating, comment, qc]);

  if (checking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  if (!eligible) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 44 }}>✍️</Text>
        <Text style={styles.blockTitle}>You can't review this yet</Text>
        <Text style={styles.blockText}>
          Reviews can only be written for products you have bought and received.
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: Spacing.lg }}>
          <Text style={{ color: Colors.gold }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{isEdit ? 'Edit review' : 'Write a review'}</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: Spacing.md }} keyboardShouldPersistTaps="handled">
        {productTitle ? <Text style={styles.product} numberOfLines={2}>{productTitle}</Text> : null}

        <Text style={styles.label}>Your rating</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map(n => (
            <TouchableOpacity key={n} onPress={() => setRating(n)} hitSlop={6}>
              <Text style={[styles.star, n <= rating && styles.starOn]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
        {rating > 0 && <Text style={styles.ratingWord}>{RATING_WORDS[rating]}</Text>}

        <Text style={[styles.label, { marginTop: Spacing.lg }]}>Your review</Text>
        <TextInput
          style={styles.input}
          value={comment}
          onChangeText={setComment}
          placeholder="What stood out? How was the quality and packaging?"
          placeholderTextColor={Colors.creamFaint}
          multiline
          maxLength={2000}
        />
        <Text style={styles.counter}>{comment.length}/2000</Text>

        <GoldButton
          label={saving ? 'Saving…' : isEdit ? 'Save changes' : 'Submit review'}
          onPress={handleSubmit}
          size="lg"
          fullWidth
          disabled={saving || rating < 1}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  backIcon: { color: Colors.gold, fontSize: 22 },
  title: { ...Typography.display, fontSize: 20 },
  center: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  blockTitle: { ...Typography.heading, fontSize: 18, marginTop: Spacing.md },
  blockText: { ...Typography.body, fontSize: 14, color: Colors.creamDim, textAlign: 'center', marginTop: 6 },

  product: { ...Typography.bodySemibold, fontSize: 15, marginBottom: Spacing.lg },
  label: { ...Typography.label, fontSize: 10, marginBottom: 8 },
  stars: { flexDirection: 'row', gap: Spacing.sm },
  star: { fontSize: 38, color: Colors.border },
  starOn: { color: Colors.gold },
  ratingWord: { ...Typography.bodySemibold, fontSize: 14, color: Colors.gold, marginTop: 6 },

  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    padding: Spacing.md, minHeight: 140, textAlignVertical: 'top',
    color: Colors.cream, fontFamily: 'Inter_400Regular', fontSize: 14,
    backgroundColor: Colors.bgCard,
  },
  counter: { ...Typography.caption, fontSize: 11, textAlign: 'right', marginTop: 4, marginBottom: Spacing.lg },
});
