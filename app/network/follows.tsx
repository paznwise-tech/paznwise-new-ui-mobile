import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

type FollowUser = {
  id: string;
  username: string;
  name: string;
  avatar: string;
  isVerified: boolean;
  isFollowing: boolean;
};

export default function FollowsList() {
  const { type, userId } = useLocalSearchParams<{ type: 'followers' | 'following'; userId: string }>();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock fetching GET /api/users/{id}/followers or /following
    setTimeout(() => {
      setUsers([
        {
          id: 'u-2',
          username: '@rahi_arts',
          name: 'Rahi Designs',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop',
          isVerified: true,
          isFollowing: true,
        },
        {
          id: 'u-3',
          username: '@collect_india',
          name: 'Indian Heritage',
          avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&h=120&fit=crop',
          isVerified: false,
          isFollowing: false,
        },
      ]);
      setLoading(false);
    }, 500);
  }, [type, userId]);

  const toggleFollow = (id: string, currentStatus: boolean) => {
    // Mock POST /api/users/follow/{id} or DELETE /api/users/unfollow/{id}
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isFollowing: !currentStatus } : u));
  };

  const renderItem = ({ item }: { item: FollowUser }) => (
    <TouchableOpacity style={styles.userCard} onPress={() => router.push(`/profile/${item.id}`)}>
      <Image source={{ uri: item.avatar }} style={styles.avatar} contentFit="cover" />
      <View style={styles.userInfo}>
        <Text style={styles.name}>{item.name} {item.isVerified && <Text style={{ color: Colors.gold }}>✓</Text>}</Text>
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
        <View style={styles.center}>
          <ActivityIndicator color={Colors.gold} />
        </View>
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
