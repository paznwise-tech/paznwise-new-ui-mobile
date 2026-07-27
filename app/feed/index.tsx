import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Dimensions, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { useFeed, useUser } from '@/context/AppContext';
import { FeedPost } from '@/services/feedService';

const { width } = Dimensions.get('window');

export default function FeedIndex() {
  const { trendingPosts, feedLoading, feedError, fetchTrendingFeed, togglePostLike } = useFeed();
  const { user } = useUser();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTrendingFeed();
  }, [fetchTrendingFeed]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTrendingFeed();
    setRefreshing(false);
  }, [fetchTrendingFeed]);

  // Filter posts based on search query
  const filteredPosts = trendingPosts.filter(post => {
    const query = search.toLowerCase();
    const title = post.title?.toLowerCase() || '';
    const desc = post.description?.toLowerCase() || '';
    const authorName = post.artist?.name?.toLowerCase() || post.profileName?.toLowerCase() || '';
    const style = post.style?.toLowerCase() || '';
    const cat = post.category?.toLowerCase() || '';
    return title.includes(query) || desc.includes(query) || authorName.includes(query) || style.includes(query) || cat.includes(query);
  });

  const renderPostItem = ({ item }: { item: FeedPost }) => {
    const imageUri = item.imageUrls?.[0];
    const avatarUri = item.artist?.profile?.avatar ?? item.artist?.avatar ?? item.artist?.picture ?? item.picture;
    const displayName = item.artist?.name ?? item.profileName ?? item.artist?.username ?? 'User';
    const initial = displayName.charAt(0).toUpperCase();

    return (
      <View style={styles.card}>
        {/* Author details */}
        <View style={styles.cardHeader}>
          <TouchableOpacity 
            style={styles.authorRow}
            onPress={() => item.artistId && router.push({ pathname: '/profile/[id]', params: { id: item.artistId, name: displayName, avatar: avatarUri ?? '' } } as any)}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
            <View>
              <Text style={styles.authorName}>{displayName}</Text>
              {item.artist?.isVerified && <Text style={styles.verifiedText}>Verified Creator</Text>}
            </View>
          </TouchableOpacity>
        </View>

        {/* Post Image */}
        <TouchableOpacity activeOpacity={0.9} onPress={() => router.push(`/feed/${item.id}` as any)}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} contentFit="cover" transition={200} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderIcon}>🖼</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Content details */}
        <View style={styles.cardBody}>
          {item.title ? <Text style={styles.title}>{item.title}</Text> : null}
          {item.description ? <Text style={styles.caption} numberOfLines={3}>{item.description}</Text> : null}
          
          {/* Tags */}
          <View style={styles.tagRow}>
            {item.style ? <View style={styles.tag}><Text style={styles.tagText}>{item.style}</Text></View> : null}
            {item.category ? <View style={styles.tag}><Text style={styles.tagText}>{item.category}</Text></View> : null}
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => togglePostLike(item.id)}>
              <Text style={[styles.actionIcon, item.isLiked && { color: '#ff6b6b' }]}>
                {item.isLiked ? '♥' : '♡'}
              </Text>
              <Text style={styles.actionText}>{item.likesCount ?? 0} Likes</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/feed/${item.id}` as any)}>
              <Text style={styles.actionIcon}>💬</Text>
              <Text style={styles.actionText}>{item.commentsCount ?? 0} Comments</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bgCard }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community Feed</Text>
        <TouchableOpacity 
          style={styles.createBtn}
          onPress={() => router.push('/feed/create' as any)}
        >
          <Text style={styles.createBtnText}>+ Post</Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchBarContainer}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search community posts, styles, creators..."
          placeholderTextColor={Colors.creamFaint}
          style={styles.searchInput}
        />
      </View>

      {feedLoading && filteredPosts.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.gold} />
          <Text style={styles.loadingText}>Loading feed posts...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPosts}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.gold}
            />
          }
          renderItem={renderPostItem}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No posts found matching search</Text>
            </View>
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
  headerTitle: { ...Typography.heading, fontSize: 18 },
  createBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: Colors.gold,
    borderRadius: Radius.full,
  },
  createBtnText: {
    ...Typography.bodyBold,
    fontSize: 12,
    color: Colors.bg,
  },
  searchBarContainer: {
    padding: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInput: {
    height: 40,
    backgroundColor: Colors.bgInput,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  list: {
    padding: Spacing.md,
    paddingBottom: 40,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.card,
  },
  cardHeader: {
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: Colors.borderGold,
  },
  avatarFallback: {
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...Typography.bodyBold,
    color: Colors.gold,
    fontSize: 14,
  },
  authorName: {
    ...Typography.bodySemibold,
    color: Colors.cream,
    fontSize: 14,
  },
  verifiedText: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.gold,
  },
  image: {
    width: '100%',
    height: 260,
  },
  imagePlaceholder: {
    width: '100%',
    height: 260,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
  },
  cardBody: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  title: {
    ...Typography.heading,
    fontSize: 16,
    color: Colors.cream,
  },
  caption: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.creamDim,
    lineHeight: 18,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.xs,
  },
  tag: {
    backgroundColor: Colors.gold + '15',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.borderGold,
  },
  tagText: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.gold,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionIcon: {
    fontSize: 18,
    color: Colors.creamFaint,
  },
  actionText: {
    ...Typography.bodySemibold,
    fontSize: 12,
    color: Colors.creamDim,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    marginTop: 60,
  },
  loadingText: {
    ...Typography.caption,
    color: Colors.creamDim,
    marginTop: Spacing.md,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.creamDim,
    textAlign: 'center',
  },
});
