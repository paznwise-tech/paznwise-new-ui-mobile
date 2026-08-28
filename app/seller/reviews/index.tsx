import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { ReviewService, type Review } from '@/services/reviewService';

/**
 * Reviews on the seller's own products.
 *
 * The reply endpoint existed with no caller, so a seller could see
 * criticism of their work with no way to answer it publicly.
 */
export default function SellerReviews() {
  const qc = useQueryClient();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const { data: reviews = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['seller-reviews'],
    queryFn: ReviewService.getSellerReviews,
  });

  const handleReply = useCallback(async (reviewId: string) => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await ReviewService.replyToReview(reviewId, replyText.trim());
      setReplyingTo(null);
      setReplyText('');
      qc.invalidateQueries({ queryKey: ['seller-reviews'] });
      Alert.alert('Reply posted', 'Your reply is now visible on the product.');
    } catch (e: any) {
      Alert.alert('Could not post reply', e?.message ?? 'Please try again.');
    } finally {
      setSending(false);
    }
  }, [replyText, qc]);

  const renderItem = useCallback(({ item }: { item: Review }) => {
    const open = replyingTo === item.id;
    return (
      <View style={styles.card}>
        <TouchableOpacity
          onPress={() => item.productId && router.push(`/product/${item.productId}` as any)}
          disabled={!item.productId}
        >
          <Text style={styles.product} numberOfLines={1}>{item.productTitle}</Text>
        </TouchableOpacity>

        <View style={styles.headRow}>
          <Text style={styles.stars}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</Text>
          <Text style={styles.date}>
            {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </Text>
        </View>

        {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}

        {open ? (
          <View style={styles.replyBox}>
            <TextInput
              style={styles.replyInput}
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Reply publicly to this review"
              placeholderTextColor={Colors.creamFaint}
              multiline
              autoFocus
            />
            <View style={styles.replyActions}>
              <TouchableOpacity onPress={() => { setReplyingTo(null); setReplyText(''); }}>
                <Text style={styles.cancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleReply(item.id)} disabled={sending || !replyText.trim()}>
                <Text style={[styles.send, (!replyText.trim() || sending) && { opacity: 0.4 }]}>
                  {sending ? 'Posting…' : 'Post reply'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity onPress={() => { setReplyingTo(item.id); setReplyText(''); }}>
            <Text style={styles.replyLink}>Reply</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [replyingTo, replyText, sending, handleReply]);

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
          <Text style={styles.title}>Product Reviews</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.gold} size="large" /></View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={r => r.id}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.gold} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 44 }}>⭐</Text>
              <Text style={styles.emptyTitle}>No reviews yet</Text>
              <Text style={styles.emptyText}>Reviews of your products will appear here.</Text>
            </View>
          }
        />
      )}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  product: { ...Typography.bodySemibold, fontSize: 14, color: Colors.gold },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  stars: { fontSize: 14, color: Colors.gold },
  date: { ...Typography.caption, fontSize: 11 },
  comment: { ...Typography.body, fontSize: 13, color: Colors.creamDim, marginTop: 6, lineHeight: 19 },
  replyLink: { ...Typography.bodySemibold, fontSize: 13, color: Colors.gold, marginTop: Spacing.sm },

  replyBox: { marginTop: Spacing.sm },
  replyInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    padding: Spacing.sm, minHeight: 64, textAlignVertical: 'top',
    color: Colors.cream, fontFamily: 'Inter_400Regular', fontSize: 13,
  },
  replyActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.lg, marginTop: Spacing.sm },
  cancel: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  send: { ...Typography.bodySemibold, fontSize: 13, color: Colors.gold },

  empty: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyTitle: { ...Typography.heading, fontSize: 18, marginTop: Spacing.md },
  emptyText: { ...Typography.caption, fontSize: 13, marginTop: 4, textAlign: 'center' },
});
