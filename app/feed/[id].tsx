import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, Dimensions, ActivityIndicator, TextInput,
  Platform, KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useFeed, useUser } from '@/context/AppContext';
import { FeedPost, FeedArtist, FeedService } from '@/services/feedService';
import { UserService } from '@/services/userService';
import { CommentService, Comment } from '@/services/commentService';
import { resolveImageUrl } from '@/utils/imageUrl';

function resolveUrl(url: string | undefined | null): string | undefined {
  return resolveImageUrl(url) || undefined;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const { width } = Dimensions.get('window');

type UserMini = { name: string; username: string; avatar?: string };

// ── ImageCarousel ─────────────────────────────────────────────────────────────

function ImageCarousel({ urls, onDoubleTap }: { urls: string[]; onDoubleTap?: () => void }) {
  const [active, setActive] = useState(0);
  const lastTapRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePress = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      clearTimeout(tapTimerRef.current!);
      lastTapRef.current = 0;
      onDoubleTap?.();
    } else {
      lastTapRef.current = now;
      tapTimerRef.current = setTimeout(() => { lastTapRef.current = 0; }, 300);
    }
  }, [onDoubleTap]);

  if (urls.length === 0) {
    return (
      <View style={styles.imagePlaceholder}>
        <Text style={{ color: Colors.creamFaint, fontSize: 40 }}>🖼</Text>
      </View>
    );
  }

  if (urls.length === 1) {
    return (
      <TouchableOpacity activeOpacity={1} onPress={handlePress}>
        <Image source={{ uri: urls[0] }} style={styles.heroImage} contentFit="cover" transition={300} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ position: 'relative' }}>
      <FlatList
        data={urls}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onScroll={e => setActive(Math.round(e.nativeEvent.contentOffset.x / width))}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={1} onPress={handlePress}>
            <Image source={{ uri: item }} style={styles.heroImage} contentFit="cover" transition={300} />
          </TouchableOpacity>
        )}
      />
      <View style={styles.dotRow}>
        {urls.map((_, i) => (
          <View key={i} style={[styles.dot, active === i && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

// ── CommentItem ───────────────────────────────────────────────────────────────

function CommentItem({
  comment,
  userMap,
  onReply,
  onToggleLike,
}: {
  comment: Comment;
  userMap: Record<string, UserMini>;
  onReply: (c: Comment) => void;
  onToggleLike: (commentId: string) => void;
}) {
  const u = userMap[comment.userId];
  const displayName = u?.name || 'User';
  const avatarUri = u?.avatar;
  const initial = displayName[0]?.toUpperCase() ?? '?';

  return (
    <View style={cStyles.item}>
      <TouchableOpacity onPress={() => router.push({ pathname: '/profile/[id]', params: { id: comment.userId, name: displayName, username: u?.username ?? '', avatar: avatarUri ?? '' } } as any)}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={cStyles.avatar} contentFit="cover" />
        ) : (
          <View style={[cStyles.avatar, cStyles.avatarFallback]}>
            <Text style={cStyles.avatarInitial}>{initial}</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <View style={cStyles.row}>
          <TouchableOpacity onPress={() => router.push({ pathname: '/profile/[id]', params: { id: comment.userId, name: displayName, username: u?.username ?? '', avatar: avatarUri ?? '' } } as any)}>
            <Text style={cStyles.name}>{displayName}</Text>
          </TouchableOpacity>
          <Text style={cStyles.time}>{timeAgo(comment.createdAt)}</Text>
        </View>
        <Text style={cStyles.content}>{comment.content}</Text>
        <View style={cStyles.actionRow}>
          <TouchableOpacity
            onPress={() => onReply(comment)}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text style={cStyles.replyBtn}>Reply</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={cStyles.likeBtn}
            onPress={() => onToggleLike(comment._id)}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text style={[cStyles.likeIcon, comment.isLiked && { color: Colors.error }]}>
              {comment.isLiked ? '♥' : '♡'}
            </Text>
            {(comment.likesCount ?? 0) > 0 && (
              <Text style={cStyles.likeCount}>{comment.likesCount}</Text>
            )}
          </TouchableOpacity>
        </View>

        {comment.replies && comment.replies.length > 0 && (
          <View style={cStyles.repliesWrap}>
            {comment.replies.map(reply => {
              const ru = userMap[reply.userId];
              const rName = ru?.name || 'User';
              const rInitial = rName[0]?.toUpperCase() ?? '?';
              return (
                <View key={reply._id} style={cStyles.replyItem}>
                  <TouchableOpacity onPress={() => router.push({ pathname: '/profile/[id]', params: { id: reply.userId, name: rName, username: ru?.username ?? '', avatar: ru?.avatar ?? '' } } as any)}>
                    {ru?.avatar ? (
                      <Image source={{ uri: ru.avatar }} style={cStyles.replyAvatar} contentFit="cover" />
                    ) : (
                      <View style={[cStyles.replyAvatar, cStyles.avatarFallback]}>
                        <Text style={cStyles.replyAvatarInitial}>{rInitial}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <View style={cStyles.row}>
                      <TouchableOpacity onPress={() => router.push({ pathname: '/profile/[id]', params: { id: reply.userId, name: rName, username: ru?.username ?? '', avatar: ru?.avatar ?? '' } } as any)}>
                        <Text style={cStyles.name}>{rName}</Text>
                      </TouchableOpacity>
                      <Text style={cStyles.time}>{timeAgo(reply.createdAt)}</Text>
                    </View>
                    <Text style={cStyles.content}>{reply.content}</Text>
                    <TouchableOpacity
                      style={cStyles.likeBtn}
                      onPress={() => onToggleLike(reply._id)}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    >
                      <Text style={[cStyles.likeIcon, reply.isLiked && { color: Colors.error }]}>
                        {reply.isLiked ? '♥' : '♡'}
                      </Text>
                      {(reply.likesCount ?? 0) > 0 && (
                        <Text style={cStyles.likeCount}>{reply.likesCount}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
            {comment.hasMoreReplies && (
              <Text style={cStyles.moreReplies}>
                +{(comment.totalReplies ?? 0) - (comment.replies?.length ?? 0)} more replies
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const cStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: { width: 34, height: 34, borderRadius: 17, flexShrink: 0 },
  avatarFallback: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { ...Typography.bodySemibold, fontSize: 14, color: Colors.gold },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  name: { ...Typography.bodySemibold, fontSize: 13, color: Colors.cream },
  time: { ...Typography.caption, fontSize: 11 },
  content: { ...Typography.body, fontSize: 13, color: Colors.creamDim, lineHeight: 19 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: 4 },
  replyBtn: { ...Typography.caption, fontSize: 12, color: Colors.gold },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  likeIcon: { fontSize: 14, color: Colors.creamFaint },
  likeCount: { ...Typography.caption, fontSize: 11 },
  repliesWrap: { marginTop: 8, gap: 8 },
  replyItem: { flexDirection: 'row', gap: 8 },
  replyAvatar: { width: 26, height: 26, borderRadius: 13, flexShrink: 0 },
  replyAvatarInitial: { ...Typography.bodySemibold, fontSize: 10, color: Colors.gold },
  moreReplies: { ...Typography.caption, fontSize: 12, color: Colors.gold },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function FeedPostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = Number(id);
  const { feedPosts, trendingPosts, followingPosts, togglePostLike, likePost } = useFeed();
  const { user } = useUser();

  const [post, setPost] = useState<FeedPost | null>(null);
  const [artist, setArtist] = useState<FeedArtist | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [comment, setComment] = useState('');

  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsNextCursor, setCommentsNextCursor] = useState<string | undefined>();
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [userMap, setUserMap] = useState<Record<string, UserMini>>({});

  const commentInputRef = useRef<TextInput>(null);

  // Find post from cached lists
  useEffect(() => {
    const found =
      feedPosts.find(p => p.id === postId) ??
      trendingPosts.find(p => p.id === postId) ??
      followingPosts.find(p => p.id === postId) ??
      null;
    setPost(found);
    if (found) {
      setIsSaved(found.isSaved ?? false);
      if (found.artist) setArtist(found.artist);
    }
  }, [postId, feedPosts, trendingPosts, followingPosts]);

  // Fetch artist profile if not attached to post
  useEffect(() => {
    if (artist || !post?.artistId) return;
    UserService.getProfileById(post.artistId)
      .then(p => setArtist({
        id: p.id,
        username: p.username,
        name: p.name,
        picture: resolveUrl(p.avatar),
        avatar: resolveUrl(p.avatar),
        isVerified: p.isVerified,
        role: p.role,
      }))
      .catch(() => {});
  }, [post?.artistId, artist]);

  // Fetch follow status
  useEffect(() => {
    if (!artist?.id || !user.isLoggedIn) return;
    UserService.getFollowStatus(artist.id)
      .then(s => setIsFollowing(s.isFollowing))
      .catch(() => {});
  }, [artist?.id, user.isLoggedIn]);

  // Record a view
  useEffect(() => {
    if (!postId || !user.isLoggedIn) return;
    FeedService.interact({ postId, action: 'view' }).catch(() => {});
  }, [postId, user.isLoggedIn]);

  // Seed userMap with current user
  useEffect(() => {
    if (!user.id) return;
    setUserMap(prev => ({
      ...prev,
      [user.id!]: { name: user.name || 'You', username: user.username || '', avatar: user.avatar },
    }));
  }, [user.id, user.name, user.username, user.avatar]);

  // Load comments (cursor = undefined → first page, else append)
  const loadComments = useCallback(async (cursor?: string) => {
    if (!postId) return;
    setCommentsLoading(true);
    try {
      const data = await CommentService.getComments(postId, { cursor, limit: 15, replyLimit: 3 });
      setComments(prev => cursor ? [...prev, ...data.comments] : data.comments);
      setCommentsNextCursor(data.nextCursor);

      // Batch-fetch commenter profiles
      const ids = new Set<string>();
      data.comments.forEach(c => {
        ids.add(c.userId);
        c.replies?.forEach(r => ids.add(r.userId));
      });
      const toFetch = [...ids].filter(Boolean).slice(0, 20);
      if (toFetch.length > 0) {
        const results = await Promise.allSettled(
          toFetch.map(uid => UserService.getProfileById(uid).then(p => ({ uid, p })))
        );
        setUserMap(prev => {
          const updated = { ...prev };
          results.forEach(r => {
            if (r.status === 'fulfilled' && !updated[r.value.uid]) {
              updated[r.value.uid] = {
                name: r.value.p.name || 'User',
                username: r.value.p.username || '',
                avatar: r.value.p.avatar,
              };
            }
          });
          return updated;
        });
      }
    } catch {
      // fail silently
    } finally {
      setCommentsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Double-tap image → like only
  const handleDoubleTapLike = useCallback(() => {
    if (post?.isLiked) return;
    likePost(postId);
    setPost(prev => prev && !prev.isLiked
      ? { ...prev, isLiked: true, likesCount: prev.likesCount + 1 }
      : prev
    );
  }, [postId, post?.isLiked, likePost]);

  // Heart button → toggle like/unlike
  const handleLike = useCallback(() => {
    togglePostLike(postId);
    setPost(prev => prev
      ? { ...prev, isLiked: !prev.isLiked, likesCount: prev.likesCount + (prev.isLiked ? -1 : 1) }
      : prev
    );
  }, [postId, togglePostLike]);

  const handleSave = useCallback(async () => {
    const next = !isSaved;
    setIsSaved(next);
    try {
      // `save` is a toggle server-side and reports the resulting state, so
      // the same action is sent both ways and the response is authoritative.
      // This previously sent 'view' in both branches, which recorded a view
      // and never saved anything.
      const res = await FeedService.interact({ postId, action: 'save' });
      if (typeof res.isSaved === 'boolean') setIsSaved(res.isSaved);
    } catch {
      setIsSaved(!next);
    }
  }, [postId, isSaved]);

  const handleFollow = useCallback(async () => {
    const targetId = post?.artistId ?? artist?.id;
    if (!targetId || followLoading) return;
    setFollowLoading(true);
    const next = !isFollowing;
    setIsFollowing(next);
    try {
      if (next) await UserService.follow(targetId);
      else await UserService.unfollow(targetId);
    } catch {
      setIsFollowing(!next);
    } finally {
      setFollowLoading(false);
    }
  }, [post?.artistId, artist?.id, isFollowing, followLoading]);

  const handleReply = useCallback((c: Comment) => {
    setReplyTo(c);
    commentInputRef.current?.focus();
  }, []);

  const applyCommentLike = useCallback((commentId: string, isLiked: boolean, likesCount: number) => {
    setComments(prev => prev.map(c => {
      if (c._id === commentId) return { ...c, isLiked, likesCount };
      if (c.replies?.some(r => r._id === commentId)) {
        return { ...c, replies: c.replies.map(r => r._id === commentId ? { ...r, isLiked, likesCount } : r) };
      }
      return c;
    }));
  }, []);

  const handleToggleCommentLike = useCallback((commentId: string) => {
    let target: Comment | undefined;
    for (const c of comments) {
      if (c._id === commentId) { target = c; break; }
      const reply = c.replies?.find(r => r._id === commentId);
      if (reply) { target = reply; break; }
    }
    if (!target) return;
    const wasLiked = target.isLiked ?? false;
    applyCommentLike(commentId, !wasLiked, (target.likesCount ?? 0) + (wasLiked ? -1 : 1));
  }, [comments, applyCommentLike]);

  const handleSubmitComment = useCallback(async () => {
    const content = comment.trim();
    if (!content || submitting || !user.id) return;
    setSubmitting(true);

    const optimistic: Comment = {
      _id: `optimistic-${Date.now()}`,
      postId,
      userId: user.id,
      parentCommentId: replyTo?._id ?? null,
      content,
      isDeleted: false,
      replyCount: 0,
      createdAt: new Date().toISOString(),
      replies: [],
      hasMoreReplies: false,
      totalReplies: 0,
    };

    const currentReplyTo = replyTo;
    setComment('');
    setReplyTo(null);

    if (currentReplyTo) {
      setComments(prev => prev.map(c =>
        c._id === currentReplyTo._id
          ? { ...c, replies: [...(c.replies ?? []), optimistic], replyCount: c.replyCount + 1 }
          : c
      ));
    } else {
      setComments(prev => [optimistic, ...prev]);
      setPost(prev => prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : prev);
    }

    try {
      if (currentReplyTo) {
        await CommentService.replyToComment(postId, currentReplyTo._id, content);
      } else {
        await CommentService.createComment(postId, content);
      }
    } catch {
      // Revert on failure
      if (currentReplyTo) {
        setComments(prev => prev.map(c =>
          c._id === currentReplyTo._id
            ? {
                ...c,
                replies: c.replies?.filter(r => r._id !== optimistic._id) ?? [],
                replyCount: c.replyCount - 1,
              }
            : c
        ));
      } else {
        setComments(prev => prev.filter(c => c._id !== optimistic._id));
        setPost(prev => prev ? { ...prev, commentsCount: prev.commentsCount - 1 } : prev);
      }
    } finally {
      setSubmitting(false);
    }
  }, [comment, submitting, replyTo, postId, user.id]);

  if (!post) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.gold} />
      </View>
    );
  }

  const resolvedArtist = artist ?? post.artist;
  const avatarUri = resolvedArtist?.profile?.avatar ?? resolvedArtist?.avatar ?? resolvedArtist?.picture ?? resolveUrl(post.picture);
  const displayName = resolvedArtist?.name ?? post.profileName ?? resolvedArtist?.username ?? '—';
  const username = resolvedArtist?.username;
  const isVerified = resolvedArtist?.profile?.isVerified ?? resolvedArtist?.isVerified ?? false;
  const artistId = post.artistId ?? resolvedArtist?.id;
  const commentPlaceholder = replyTo
    ? `Reply to ${userMap[replyTo.userId]?.name || 'user'}…`
    : 'Add a comment…';

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
          <Text style={styles.headerTitle}>Post</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
        {/* Image carousel — double-tap to like */}
        <ImageCarousel urls={post.imageUrls} onDoubleTap={handleDoubleTapLike} />

        {/* Artist row */}
        <View style={styles.artistRow}>
          <TouchableOpacity
            style={styles.artistLeft}
            onPress={() => artistId && router.push({ pathname: '/profile/[id]', params: { id: artistId, name: displayName, username: username ?? '', avatar: avatarUri ?? '', isVerified: isVerified ? '1' : '0' } } as any)}
            activeOpacity={0.75}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.artistAvatar} contentFit="cover" />
            ) : (
              <View style={[styles.artistAvatar, { backgroundColor: Colors.bgCard }]} />
            )}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.artistName}>{displayName}</Text>
                {isVerified && <Text style={{ color: Colors.gold, fontSize: 12 }}>✓</Text>}
              </View>
              {username ? <Text style={styles.artistUsername}>@{username}</Text> : null}
            </View>
          </TouchableOpacity>

          {artistId && artistId !== user.id && (
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followingBtn]}
              onPress={handleFollow}
              disabled={followLoading}
            >
              <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.divider} />

        {/* Title, description, meta, tags */}
        <View style={styles.body}>
          {post.title ? <Text style={styles.title}>{post.title}</Text> : null}
          {post.description ? <Text style={styles.description}>{post.description}</Text> : null}

          {(post.style || post.category) ? (
            <View style={styles.metaRow}>
              {post.style ? (
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipLabel}>STYLE</Text>
                  <Text style={styles.metaChipText}>{post.style}</Text>
                </View>
              ) : null}
              {post.category ? (
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipLabel}>CATEGORY</Text>
                  <Text style={styles.metaChipText}>{post.category}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {post.tags && post.tags.length > 0 ? (
            <View style={styles.tagsRow}>
              {post.tags.map(tag => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.divider} />

        {/* Actions + stats */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
            <Text style={[styles.actionIcon, post.isLiked && { color: Colors.error }]}>
              {post.isLiked ? '♥' : '♡'}
            </Text>
            <Text style={styles.actionCount}>{post.likesCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionCount}>{post.commentsCount}</Text>
          </TouchableOpacity>

          {post.savesCount !== undefined && (
            <TouchableOpacity style={styles.actionBtn} onPress={handleSave}>
              <Text style={[styles.actionIcon, isSaved && { color: Colors.gold }]}>
                {isSaved ? '🔖' : '🏷'}
              </Text>
              <Text style={styles.actionCount}>{isSaved ? post.savesCount + 1 : post.savesCount}</Text>
            </TouchableOpacity>
          )}

          {post.viewsCount !== undefined && (
            <View style={styles.actionBtn}>
              <Text style={styles.actionIcon}>👁</Text>
              <Text style={styles.actionCount}>{post.viewsCount}</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Comments */}
        <View style={styles.commentsSection}>
          <View style={styles.commentsSectionHeader}>
            <Text style={styles.commentsSectionTitle}>Comments</Text>
            <Text style={styles.commentsCountBadge}>{post.commentsCount}</Text>
          </View>

          {commentsLoading && comments.length === 0 ? (
            <ActivityIndicator size="small" color={Colors.gold} style={{ marginVertical: 24 }} />
          ) : comments.length === 0 ? (
            <View style={styles.commentsEmpty}>
              <Text style={styles.commentsEmptyText}>No comments yet. Be the first!</Text>
            </View>
          ) : (
            <>
              {comments.map(c => (
                <CommentItem
                  key={c._id}
                  comment={c}
                  userMap={userMap}
                  onReply={handleReply}
                  onToggleLike={handleToggleCommentLike}
                />
              ))}
              {commentsNextCursor && (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={() => loadComments(commentsNextCursor)}
                  disabled={commentsLoading}
                >
                  {commentsLoading ? (
                    <ActivityIndicator size="small" color={Colors.gold} />
                  ) : (
                    <Text style={styles.loadMoreText}>Load more comments</Text>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom bar: reply banner + input */}
      {user.isLoggedIn && (
        <SafeAreaView edges={['bottom']} style={styles.commentBarSafe}>
          {replyTo && (
            <View style={styles.replyBanner}>
              <Text style={styles.replyBannerText} numberOfLines={1}>
                Replying to {userMap[replyTo.userId]?.name || 'user'}
              </Text>
              <TouchableOpacity
                onPress={() => setReplyTo(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.replyBannerClose}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.commentBar}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.commentAvatar} contentFit="cover" />
            ) : (
              <View style={[styles.commentAvatar, { backgroundColor: Colors.bgCard }]}>
                <Text style={{ color: Colors.gold, fontSize: 14 }}>
                  {(user.name || 'Y')[0]?.toUpperCase()}
                </Text>
              </View>
            )}
            <TextInput
              ref={commentInputRef}
              value={comment}
              onChangeText={setComment}
              placeholder={commentPlaceholder}
              placeholderTextColor={Colors.creamFaint}
              style={styles.commentInput}
              returnKeyType="send"
              onSubmitEditing={handleSubmitComment}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[styles.commentSend, (!comment.trim() || submitting) && styles.commentSendDisabled]}
              disabled={!comment.trim() || submitting}
              onPress={handleSubmitComment}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.gold} />
              ) : (
                <Text style={[styles.commentSendText, (!comment.trim()) && { color: Colors.creamFaint }]}>
                  Send
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
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
  headerTitle: { ...Typography.display, fontSize: 20 },
  heroImage: { width, height: width * 0.85 },
  imagePlaceholder: {
    width, height: width * 0.85,
    backgroundColor: Colors.bgCard, justifyContent: 'center', alignItems: 'center',
  },
  dotRow: {
    position: 'absolute', bottom: Spacing.sm, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 18, backgroundColor: Colors.gold },
  artistRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, gap: Spacing.sm,
  },
  artistLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  artistAvatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: Colors.borderGold },
  artistName: { ...Typography.bodySemibold, fontSize: 14, color: Colors.cream },
  artistUsername: { ...Typography.caption, fontSize: 12, color: Colors.creamDim },
  followBtn: {
    backgroundColor: Colors.gold, paddingHorizontal: Spacing.md,
    paddingVertical: 6, borderRadius: Radius.full,
  },
  followBtnText: { ...Typography.bodyBold, fontSize: 12, color: Colors.bg },
  followingBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.border },
  followingBtnText: { color: Colors.cream },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },
  body: { padding: Spacing.md, gap: Spacing.md },
  title: { ...Typography.heading, fontSize: 24, lineHeight: 30 },
  description: { ...Typography.body, fontSize: 14, color: Colors.creamDim, lineHeight: 22 },
  metaRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  metaChip: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border, gap: 2,
  },
  metaChipLabel: { ...Typography.label, fontSize: 8 },
  metaChipText: { ...Typography.bodySemibold, fontSize: 13, color: Colors.cream },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tagChip: {
    backgroundColor: Colors.gold + '18', borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.borderGold,
  },
  tagText: { ...Typography.caption, fontSize: 12, color: Colors.gold },
  actionsRow: {
    flexDirection: 'row', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgCard, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  actionIcon: { fontSize: 16 },
  actionCount: { ...Typography.caption, fontSize: 12, color: Colors.creamDim },
  commentsSection: { paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  commentsSectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, marginBottom: Spacing.sm,
  },
  commentsSectionTitle: { ...Typography.heading, fontSize: 18 },
  commentsCountBadge: {
    ...Typography.bodySemibold, fontSize: 13, color: Colors.gold,
    backgroundColor: Colors.gold + '18', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: Radius.full,
  },
  commentsEmpty: { paddingVertical: Spacing.xl, alignItems: 'center' },
  commentsEmptyText: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  loadMoreBtn: { alignItems: 'center', paddingVertical: Spacing.md },
  loadMoreText: { ...Typography.bodySemibold, fontSize: 13, color: Colors.gold },
  commentBarSafe: {
    backgroundColor: Colors.bgElevated,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  replyBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  replyBannerText: { ...Typography.caption, fontSize: 12, color: Colors.creamDim, flex: 1 },
  replyBannerClose: { color: Colors.creamDim, fontSize: 14, paddingLeft: 8 },
  commentBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  commentAvatar: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  commentInput: {
    flex: 1, backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 8,
    ...Typography.body, fontSize: 13, color: Colors.cream,
  },
  commentSend: {
    backgroundColor: Colors.gold, paddingHorizontal: Spacing.md,
    paddingVertical: 8, borderRadius: Radius.full,
  },
  commentSendDisabled: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  commentSendText: { ...Typography.bodyBold, fontSize: 12, color: Colors.bg },
});
