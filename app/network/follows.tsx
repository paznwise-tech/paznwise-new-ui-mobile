import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserService, FollowUser } from '@/services/userService';

export default function FollowsList() {
  const { type, userId } = useLocalSearchParams<{ type: 'followers' | 'following'; userId: string }>();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const fetch = type === 'followers'
      ? UserService.getFollowers(userId)
      : UserService.getFollowing(userId);
    fetch
      .then(setUsers)
      .catch(err => setError(err?.message ?? 'Failed to load users'))
      .finally(() => setLoading(false));
  }, [type, userId]);

  const toggleFollow = useCallback(async (id: string, current: boolean) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isFollowing: !current } : u));
    try {
      if (current) await UserService.unfollow(id);
      else await UserService.follow(id);
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      const alreadyFollowing = msg.toLowerCase().includes('already following');
      const notFollowing = msg.toLowerCase().includes('not following');
      if (!alreadyFollowing && !notFollowing) {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, isFollowing: current } : u));
      }
    }
  }, []);

  const renderItem = ({ item }: { item: FollowUser }) => (
    <TouchableOpacity style={styles.userCard} onPress={() => router.push({
      pathname: '/profile/[id]',
      params: {
        id: item.id,
        name: item.name,
        username: item.username,
        avatar: item.avatar ?? '',
        bio: item.bio ?? '',
        isVerified: item.isVerified ? '1' : '0',
      },
    } as any)}>
      <Image
        source={{ uri: item.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop' }}
        style={styles.avatar}
        contentFit="cover"
      />
      <View style={styles.userInfo}>
        <Text style={styles.name}>{item.name}{item.isVerified ? <Text style={{ color: Colors.gold }}> ✓</Text> : null}</Text>
        <Text style={styles.username}>{item.username}</Text>
      </View>
      <TouchableOpacity
        style={[styles.followBtn, item.isFollowing && styles.followingBtn]}
        onPress={() => toggleFollow(item.id, item.isFollowing)}
      >
        <Text style={[styles.followBtnText, item.isFollowing && styles.followingBtnText]}>
          {item.isFollowing ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{type === 'followers' ? 'Followers' : 'Following'}</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.gold} /></View>
      ) : error ? (
        <View style={styles.center}><Text style={styles.empty}>{error}</Text></View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No users found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { padding: Spacing.xs },
  backIcon: { color: Colors.gold, fontSize: 22 },
  headerTitle: { ...Typography.bodyBold, fontSize: 16, textTransform: 'capitalize' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: Spacing.md },
  empty: { ...Typography.caption, textAlign: 'center', marginTop: Spacing.xl },
  userCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.bgCard, marginRight: Spacing.md },
  userInfo: { flex: 1 },
  name: { ...Typography.bodyBold, fontSize: 15 },
  username: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  followBtn: { backgroundColor: Colors.gold, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.gold },
  followBtnText: { ...Typography.bodySemibold, fontSize: 13, color: Colors.bg },
  followingBtn: { backgroundColor: 'transparent', borderColor: Colors.border },
  followingBtnText: { color: Colors.cream },
});
