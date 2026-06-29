import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

export default function PublicProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isFollowing, setIsFollowing] = useState(false);

  // Mock public profile fetch
  const profile = {
    id: id || 'u-mock',
    name: 'Ananya Sharma',
    username: '@ananya_art',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop',
    bio: 'Contemporary artist from New Delhi. Exploring colors and emotions through abstract paintings.',
    isVerified: true,
    followersCount: 1204,
    followingCount: 230,
    postsCount: 45,
    roleText: 'Artist',
  };

  // Mock follow status fetch
  useEffect(() => {
    // Check follow status between current user and target user
    setIsFollowing(false);
  }, [id]);

  const toggleFollow = useCallback(() => {
    setIsFollowing(prev => {
      const next = !prev;
      alert(next ? `Following ${profile.username}` : `Unfollowed ${profile.username}`);
      return next;
    });
  }, [profile.username]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{profile.username}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile header */}
        <LinearGradient colors={['#1C2F45', Colors.bg]} style={styles.profileHeader}>
          <Image
            source={{ uri: profile.avatar }}
            style={styles.avatar}
            contentFit="cover"
          />
          <Text style={styles.name}>{profile.name} {profile.isVerified && <Text style={{ color: Colors.gold }}>✓</Text>}</Text>
          <Text style={styles.email}>{profile.username} · {profile.roleText}</Text>
          <Text style={styles.bio}>{profile.bio}</Text>
          
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.followBtn, isFollowing && styles.followingBtn]} 
              onPress={toggleFollow}
            >
              <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.messageBtn}>
              <Text style={styles.messageBtnText}>Message</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.stats}>
            <TouchableOpacity style={styles.stat} onPress={() => router.push({ pathname: '/network/follows', params: { type: 'followers', userId: profile.id } } as any)}>
              <Text style={styles.statVal}>{profile.followersCount + (isFollowing ? 1 : 0)}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stat} onPress={() => router.push({ pathname: '/network/follows', params: { type: 'following', userId: profile.id } } as any)}>
              <Text style={styles.statVal}>{profile.followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
            <View style={styles.stat}>
              <Text style={styles.statVal}>{profile.postsCount}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
          </View>
        </LinearGradient>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { padding: Spacing.xs },
  backIcon: { color: Colors.gold, fontSize: 22 },
  headerTitle: { ...Typography.bodyBold, fontSize: 16 },
  profileHeader: { alignItems: 'center', paddingVertical: Spacing.xl },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: Colors.gold, marginBottom: Spacing.md },
  name: { ...Typography.heading, fontSize: 22, marginBottom: 4 },
  email: { ...Typography.caption, fontSize: 13, marginBottom: Spacing.sm },
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
});
