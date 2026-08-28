import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserService, UserSuggestion } from '@/services/userService';

export default function Suggestions() {
  const [users, setUsers] = useState<UserSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [followed, setFollowed] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadUsers = () => {
    setLoading(true);
    setError('');
    UserService.getAllUsers()
      .then(data => {
        for (let i = data.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [data[i], data[j]] = [data[j], data[i]];
        }
        setUsers(data);
      })
      .catch(err => setError(err?.message ?? 'Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  const toggleFollow = async (id: string) => {
    const isFollowing = followed.includes(id);
    setBusyId(id);
    // Optimistic: the row flips immediately and rolls back if the call
    // fails, so a slow network does not make the button feel dead.
    setFollowed(prev => (isFollowing ? prev.filter(x => x !== id) : [...prev, id]));
    try {
      if (isFollowing) await UserService.unfollow(id);
      else await UserService.follow(id);
    } catch {
      setFollowed(prev => (isFollowing ? [...prev, id] : prev.filter(x => x !== id)));
    } finally {
      setBusyId(null);
    }
  };

  const renderItem = ({ item }: { item: UserSuggestion }) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push({
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
        <Text style={styles.name}>
          {item.name}{item.isVerified ? <Text style={{ color: Colors.gold }}> ✓</Text> : null}
        </Text>
        <Text style={styles.username}>{item.username}</Text>
        {!!item.bio && <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text>}
      </View>

      {/* The point of a suggestions list is to follow from it. Tapping a
          card only opened the profile, so following meant a round trip. */}
      <TouchableOpacity
        style={[styles.followBtn, followed.includes(item.id) && styles.followBtnDone]}
        onPress={() => toggleFollow(item.id)}
        disabled={busyId === item.id}
      >
        <Text style={[styles.followText, followed.includes(item.id) && { color: Colors.creamDim }]}>
          {busyId === item.id ? '…' : followed.includes(item.id) ? 'Following' : 'Follow'}
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
        <Text style={styles.headerTitle}>Find People</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadUsers} disabled={loading}>
          <Text style={[styles.refreshIcon, loading && { opacity: 0.4 }]}>↻</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.gold} size="large" /></View>
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
  followBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.gold,
  },
  followBtnDone: { borderColor: Colors.border },
  followText: { ...Typography.bodySemibold, fontSize: 12, color: Colors.gold },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border },
  refreshBtn: { padding: Spacing.xs },
  refreshIcon: { color: Colors.gold, fontSize: 22 },
  back: { padding: Spacing.xs },
  backIcon: { color: Colors.gold, fontSize: 22 },
  headerTitle: { ...Typography.bodyBold, fontSize: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: Spacing.md, paddingBottom: 100 },
  empty: { ...Typography.caption, textAlign: 'center', marginTop: Spacing.xl },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: Spacing.md, backgroundColor: Colors.bgCard },
  userInfo: { flex: 1 },
  name: { ...Typography.bodyBold, fontSize: 15 },
  username: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  bio: { ...Typography.body, fontSize: 12, color: Colors.creamDim, marginTop: 2 },
});
