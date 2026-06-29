import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

type Suggestion = {
  id: string;
  username: string;
  name: string;
  avatar: string;
  isVerified: boolean;
  bio: string;
  followersCount: number;
  mutualFollowersCount: number;
  isFollowing: boolean;
};

export default function Suggestions() {
  const [users, setUsers] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const fetchSuggestions = useCallback((cursor?: string) => {
    // Mock GET /api/users/suggestions?cursor={cursor}
    setLoading(true);
    setTimeout(() => {
      const mockData: Suggestion[] = [
        {
          id: 'u-4',
          username: '@rohan_creative',
          name: 'Rohan Sharma',
          avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop',
          isVerified: true,
          bio: 'Digital illustrator and concept artist.',
          followersCount: 3402,
          mutualFollowersCount: 12,
          isFollowing: false,
        },
        {
          id: 'u-5',
          username: '@priya_dance',
          name: 'Priya Iyer',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop',
          isVerified: false,
          bio: 'Classical dancer | Kathak | Event performer',
          followersCount: 890,
          mutualFollowersCount: 3,
          isFollowing: false,
        },
        {
          id: 'u-6',
          username: '@vikram_sculpts',
          name: 'Vikram Singh',
          avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&h=120&fit=crop',
          isVerified: true,
          bio: 'Metal and clay sculptor based in Jaipur.',
          followersCount: 12050,
          mutualFollowersCount: 45,
          isFollowing: false,
        }
      ];
      setUsers(prev => cursor ? [...prev, ...mockData] : mockData);
      setNextCursor(null); // No more data in mock
      setLoading(false);
    }, 600);
  }, []);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const toggleFollow = (id: string, currentStatus: boolean) => {
    // Mock POST /api/users/follow/{id} or DELETE /api/users/unfollow/{id}
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isFollowing: !currentStatus } : u));
  };

  const renderItem = ({ item }: { item: Suggestion }) => (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => router.push(`/profile/${item.id}`)} style={styles.cardHeader}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} contentFit="cover" />
        <View style={styles.userInfo}>
          <Text style={styles.name}>{item.name} {item.isVerified && <Text style={{ color: Colors.gold }}>✓</Text>}</Text>
          <Text style={styles.username}>{item.username}</Text>
        </View>
      </TouchableOpacity>
      
      <Text style={styles.bio} numberOfLines={2}>{item.bio}</Text>
      
      <View style={styles.meta}>
        <Text style={styles.metaText}>{item.mutualFollowersCount} mutual followers</Text>
      </View>
      
      <TouchableOpacity 
        style={[styles.followBtn, item.isFollowing && styles.followingBtn]}
        onPress={() => toggleFollow(item.id, item.isFollowing)}
      >
        <Text style={[styles.followBtnText, item.isFollowing && styles.followingBtnText]}>
          {item.isFollowing ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find People</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && users.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.gold} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No suggestions at this time.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { padding: Spacing.xs },
  backIcon: { color: Colors.gold, fontSize: 22 },
  headerTitle: { ...Typography.bodyBold, fontSize: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: Spacing.md },
  empty: { ...Typography.caption, textAlign: 'center', marginTop: Spacing.xl },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: Spacing.md },
  userInfo: { flex: 1 },
  name: { ...Typography.bodyBold, fontSize: 15 },
  username: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  bio: { ...Typography.body, fontSize: 13, color: Colors.cream, marginBottom: Spacing.sm },
  meta: { marginBottom: Spacing.md },
  metaText: { ...Typography.caption, fontSize: 12, color: Colors.creamDim },
  followBtn: { backgroundColor: Colors.gold, paddingVertical: 10, borderRadius: Radius.md, alignItems: 'center' },
  followBtnText: { ...Typography.bodyBold, fontSize: 14, color: Colors.bg },
  followingBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.border },
  followingBtnText: { color: Colors.cream },
});
