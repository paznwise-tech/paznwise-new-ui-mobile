import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, FlatList, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { UserService, PublicUser } from '@/services/userService';
import { FeedService, FeedPost } from '@/services/feedService';
import { ProductService } from '@/services/productService';
import { useUser } from '@/context/AppContext';
import { FullPhotoModal } from '@/components/ui/FullPhotoModal';

const { width } = Dimensions.get('window');
const POST_SIZE = (width - Spacing.md * 2 - Spacing.xs) / 2;

type Tab = 'posts' | 'about';

export default function PublicProfile() {
  const { id, name: seedName, username: seedUsername, avatar: seedAvatar, bio: seedBio, isVerified: seedVerified } = useLocalSearchParams<{
    id: string; name?: string; username?: string; avatar?: string; bio?: string; isVerified?: string;
  }>();
  const { followUser, unfollowUser } = useUser();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const [tab, setTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [photoVisible, setPhotoVisible] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const seed = {
      name: seedName,
      username: seedUsername,
      avatar: seedAvatar || undefined,
      bio: seedBio,
      isVerified: seedVerified === '1',
    };
    Promise.all([
      UserService.getProfileById(id, seed),
      UserService.getFollowStatus(id).catch(() => ({ isFollowing: false, isFollowedBy: false })),
    ]).then(([p, status]) => {
      setProfile(p);
      setIsFollowing(status.isFollowing);
    }).catch(console.warn).finally(() => setLoading(false));
  }, [id]);

  // Fetch this user's posts and products from the API
  useEffect(() => {
    if (!id || !profile) return;
    setPostsLoading(true);
    
    ProductService.getMarketplaceProducts().then(productsRes => {
      const userPosts = profile.posts || [];
      const userProducts = ((productsRes as any)?.data || []).filter((p: any) => p.sellerId === id);
      
      const mappedProducts = userProducts.map((prod: any) => ({
        id: prod.id,
        isProduct: true,
        imageUrls: prod.productImages?.length ? prod.productImages : prod.thumbnailUrl ? [prod.thumbnailUrl] : [],
        likesCount: 0,
        commentsCount: 0,
      }));
      
      setPosts([...userPosts, ...mappedProducts] as any[]);
    })
    .catch(console.warn)
    .finally(() => setPostsLoading(false));
  }, [id, profile]);

  const toggleFollow = useCallback(async () => {
    if (!profile || followLoading) return;
    setFollowLoading(true);
    const next = !isFollowing;
    setIsFollowing(next);
    setProfile(prev => prev ? { ...prev, followersCount: (Number(prev.followersCount) || 0) + (next ? 1 : -1) } : prev);
    try {
      if (next) {
        await UserService.follow(profile.id);
        followUser(profile.id);
      } else {
        await UserService.unfollow(profile.id);
        unfollowUser(profile.id);
      }
      // Sync accurate counts from server after the API succeeds
      UserService.getCounts(profile.id).then(counts => {
        setProfile(prev => prev ? { ...prev, followersCount: counts.followers, followingCount: counts.following } : prev);
      }).catch(() => {});
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      const alreadyFollowing = msg.toLowerCase().includes('already following');
      const notFollowing = msg.toLowerCase().includes('not following');
      if (!alreadyFollowing && !notFollowing) {
        setIsFollowing(!next);
        setProfile(prev => prev ? { ...prev, followersCount: (Number(prev.followersCount) || 0) + (next ? -1 : 1) } : prev);
      }
    } finally {
      setFollowLoading(false);
    }
  }, [profile, isFollowing, followLoading, followUser, unfollowUser]);

  const ROLE_MAP: Record<string, string> = {
    ARTIST: 'Artist', BUYER: 'Buyer', ORGANIZER: 'Organizer', ADMIN: 'Admin',
  };
  const roleText = profile?.role ? (ROLE_MAP[profile.role] ?? profile.role) : 'Member';

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.gold} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: Colors.creamDim }}>Profile not found.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{profile.username}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <LinearGradient colors={['#1C2F45', Colors.bg]} style={styles.profileHeader}>
          <TouchableOpacity activeOpacity={0.9} onLongPress={() => setPhotoVisible(true)} delayLongPress={300}>
            {profile.avatar ? (
              <Image source={{ uri: profile.avatar }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>
                  {profile.name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <FullPhotoModal uri={profile.avatar} visible={photoVisible} onClose={() => setPhotoVisible(false)} />
          <Text style={styles.name}>
            {profile.name}{profile.isVerified ? <Text style={{ color: Colors.gold }}> ✓</Text> : null}
          </Text>
          <Text style={styles.sub}>{profile.username} · {roleText}</Text>
          {!!profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followingBtn]}
              onPress={toggleFollow}
              disabled={followLoading}
            >
              <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.messageBtn}
              onPress={() => router.push('/messages' as any)}
            >
              <Text style={styles.messageBtnText}>Message</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.stats}>
            <TouchableOpacity
              style={styles.stat}
              onPress={() => router.push({ pathname: '/network/follows', params: { type: 'followers', userId: profile.id } } as any)}
            >
              <Text style={styles.statVal}>{profile.followersCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stat}
              onPress={() => router.push({ pathname: '/network/follows', params: { type: 'following', userId: profile.id } } as any)}
            >
              <Text style={styles.statVal}>{profile.followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
            <View style={styles.stat}>
              <Text style={styles.statVal}>{profile.postsCount}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['posts', 'about'] as Tab[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Posts tab */}
        {tab === 'posts' && (
          postsLoading ? (
            <View style={styles.tabCenter}>
              <ActivityIndicator color={Colors.gold} />
            </View>
          ) : posts.length === 0 ? (
            <View style={styles.tabCenter}>
              <Text style={styles.emptyText}>No posts yet.</Text>
            </View>
          ) : (
            <FlatList
              data={posts}
              numColumns={2}
              scrollEnabled={false}
              keyExtractor={i => String(i.id)}
              columnWrapperStyle={styles.postRow}
              contentContainerStyle={styles.postGrid}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.postTile} activeOpacity={0.85} onPress={() => {
                  if (item.isProduct) {
                    router.push(`/product/${item.id}` as any);
                  } else {
                    router.push(`/feed/${item.id}` as any);
                  }
                }}>
                  {item.imageUrls?.[0] ? (
                    <Image source={{ uri: item.imageUrls[0] }} style={styles.postImage} contentFit="cover" transition={200} />
                  ) : (
                    <View style={[styles.postImage, { backgroundColor: Colors.bgCard, justifyContent: 'center', alignItems: 'center' }]}>
                      <Text style={{ color: Colors.creamFaint, fontSize: 24 }}>🖼</Text>
                    </View>
                  )}
                  <LinearGradient
                    colors={['transparent', 'rgba(13,27,42,0.7)']}
                    style={styles.postOverlay}
                  >
                    <View style={styles.postMeta}>
                      {item.isProduct ? (
                        <Text style={styles.postMetaText}>🛒 Product</Text>
                      ) : (
                        <>
                          <Text style={styles.postMetaText}>♥ {item.likesCount}</Text>
                          <Text style={styles.postMetaText}>💬 {item.commentsCount}</Text>
                        </>
                      )}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            />
          )
        )}

        {/* About tab */}
        {tab === 'about' && (
          <View style={styles.aboutSection}>
            {profile.bio ? (
              <>
                <Text style={styles.aboutLabel}>BIO</Text>
                <Text style={styles.aboutText}>{profile.bio}</Text>
              </>
            ) : null}

            {profile.location ? (
              <View style={styles.aboutRow}>
                <Text style={styles.aboutRowIcon}>📍</Text>
                <Text style={styles.aboutRowText}>{profile.location}</Text>
              </View>
            ) : null}

            {profile.role ? (
              <View style={styles.aboutRow}>
                <Text style={styles.aboutRowIcon}>🎨</Text>
                <Text style={styles.aboutRowText}>{roleText}</Text>
              </View>
            ) : null}

            <View style={styles.aboutStatsCard}>
              {[
                ['Total Likes', profile.totalLikes ?? 0],
                ['Posts', profile.postsCount],
                ['Followers', profile.followersCount],
                ['Following', profile.followingCount],
              ].map(([label, val]) => (
                <View key={label as string} style={styles.aboutStatRow}>
                  <Text style={styles.aboutStatLabel}>{label}</Text>
                  <Text style={styles.aboutStatVal}>{val}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: Spacing.xs },
  backIcon: { color: Colors.gold, fontSize: 22 },
  headerTitle: { ...Typography.bodyBold, fontSize: 16 },
  profileHeader: { alignItems: 'center', paddingVertical: Spacing.xl },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: Colors.gold, marginBottom: Spacing.md },
  avatarPlaceholder: { backgroundColor: Colors.bgCard, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { ...Typography.heading, fontSize: 32, color: Colors.gold },
  name: { ...Typography.heading, fontSize: 22, marginBottom: 4 },
  sub: { ...Typography.caption, fontSize: 13, marginBottom: Spacing.sm },
  bio: { ...Typography.caption, fontSize: 13, textAlign: 'center', marginHorizontal: Spacing.xl, marginBottom: Spacing.md, color: Colors.creamDim, lineHeight: 20 },
  actionRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  followBtn: { backgroundColor: Colors.gold, paddingHorizontal: Spacing.xxl, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.gold },
  followBtnText: { ...Typography.bodyBold, fontSize: 13, color: Colors.bg },
  followingBtn: { backgroundColor: 'transparent', borderColor: Colors.border },
  followingBtnText: { color: Colors.cream },
  messageBtn: { backgroundColor: Colors.bgCard, paddingHorizontal: Spacing.lg, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  messageBtnText: { ...Typography.bodySemibold, fontSize: 13, color: Colors.cream },
  stats: { flexDirection: 'row', gap: Spacing.xl },
  stat: { alignItems: 'center' },
  statVal: { ...Typography.bodyBold, fontSize: 18, color: Colors.gold },
  statLabel: { ...Typography.caption, fontSize: 11 },
  tabs: {
    flexDirection: 'row', marginHorizontal: Spacing.md, marginBottom: Spacing.md,
    backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  tab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.sm },
  tabActive: { backgroundColor: Colors.bgElevated },
  tabText: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  tabTextActive: { color: Colors.cream, fontFamily: 'Inter_600SemiBold' },
  tabCenter: { paddingVertical: Spacing.xxl, alignItems: 'center' },
  emptyText: { ...Typography.caption, color: Colors.creamDim },
  postGrid: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  postRow: { gap: Spacing.xs, marginBottom: Spacing.xs },
  postTile: { width: POST_SIZE, height: POST_SIZE, borderRadius: Radius.md, overflow: 'hidden', position: 'relative' },
  postImage: { width: '100%', height: '100%' },
  postOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: Spacing.xs },
  postMeta: { flexDirection: 'row', gap: Spacing.sm },
  postMetaText: { ...Typography.caption, fontSize: 10, color: '#fff' },
  aboutSection: { paddingHorizontal: Spacing.md, gap: Spacing.md },
  aboutLabel: { ...Typography.label, fontSize: 9, color: Colors.creamDim },
  aboutText: { ...Typography.body, fontSize: 14, color: Colors.cream, lineHeight: 22 },
  aboutRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  aboutRowIcon: { fontSize: 16 },
  aboutRowText: { ...Typography.body, fontSize: 14, color: Colors.creamDim },
  aboutStatsCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, marginTop: Spacing.sm,
  },
  aboutStatRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  aboutStatLabel: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  aboutStatVal: { ...Typography.bodyBold, fontSize: 15, color: Colors.gold },
});
