import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useUser } from '@/context/AppContext';
import { useCallback, useMemo, useEffect, useState } from 'react';
import { MessageService } from '@/services/messageService';
import { FullPhotoModal } from '@/components/ui/FullPhotoModal';

const MENU_ITEMS = [
  { icon: '🖼', label: 'My Orders',        sub: 'Track your artwork purchases',    route: '/product/cart' },
  { icon: '🎨', label: 'Sell Artwork',      sub: 'List, manage & sell your art',   route: '/sell' },
  { icon: '📸', label: 'My Posts',           sub: 'Manage, edit & share your artwork',     route: '/feed/my-posts' },
  { icon: '🎵', label: 'My Bookings',      sub: 'Performer bookings & events',     route: '/booking/my-bookings' },
  { icon: '💬', label: 'Messages',          sub: 'Chat with artists & sellers',     route: '/messages' },
  { icon: '🎤', label: 'Register as Performer', sub: 'Get booked for events',      route: '/artist/register-artist' },
  { icon: '⚙️', label: 'Settings',          sub: 'Account, privacy & more',        route: null },
  { icon: '❓', label: 'Help & Support',    sub: 'FAQs, contact us',               route: null },
];

export default function Profile() {
  const { user, logout, loadProfile } = useUser();
  const [photoVisible, setPhotoVisible] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);

  const isLoggedIn = user.isLoggedIn;

  useEffect(() => {
    if (isLoggedIn) loadProfile();
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    MessageService.getConversations()
      .then(convos => setTotalUnread(convos.reduce((s, c) => s + (c.unreadCount ?? 0), 0)))
      .catch(() => {});
  }, [isLoggedIn]);

  const roleText = useMemo(() => {
    const map: Record<string, string> = { ARTIST: 'Artist', BUYER: 'Buyer', ORGANIZER: 'Organizer', ADMIN: 'Admin' };
    return user.role ? (map[user.role] ?? user.role) : 'Member';
  }, [user.role]);

  const handleSignOut = useCallback(async () => {
    await logout();
    router.replace('/(auth)/login');
  }, [logout]);

  if (!isLoggedIn) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }} />
        <View style={styles.guestContainer}>
          <View style={styles.guestDecor}>
            <View style={styles.guestDecorInner} />
          </View>
          <Text style={styles.guestTitle}>Your Profile</Text>
          <Text style={styles.guestSub}>Sign in to access your collection,{"\n"}bookings and messages</Text>
          <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/(auth)/login')}>
            <LinearGradient colors={['#E8C97A', '#C9A84C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.signInGradient}>
              <Text style={styles.signInText}>Sign In</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
            <Text style={styles.createText}>Create an account →</Text>
          </TouchableOpacity>

          {/* Guest quick links */}
          <View style={styles.guestMenu}>
            {[
              { icon: '🖼', label: 'Browse Art',      route: '/(tabs)/browse' },
              { icon: '🎭', label: 'Events',           route: '/(tabs)/events' },
              { icon: '🎵', label: 'Hire a Performer', route: '/(tabs)/hire'   },
            ].map(item => (
              <TouchableOpacity key={item.label} style={styles.guestMenuItem} onPress={() => router.push(item.route as any)}>
                <Text style={styles.guestMenuIcon}>{item.icon}</Text>
                <Text style={styles.guestMenuLabel}>{item.label}</Text>
                <Text style={styles.guestMenuArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile header */}
        <LinearGradient colors={['#1C2F45', Colors.bg]} style={styles.profileHeader}>
          <View style={styles.avatarWrapper}>
            <TouchableOpacity activeOpacity={0.9} onLongPress={() => setPhotoVisible(true)} delayLongPress={300}>
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>
                    {user.name?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.editAvatarBtn}
              onPress={() => router.push('/profile/edit' as any)}
            >
              <Text style={styles.editAvatarIcon}>✎</Text>
            </TouchableOpacity>
          </View>
          <FullPhotoModal uri={user.avatar} visible={photoVisible} onClose={() => setPhotoVisible(false)} />
          <Text style={styles.name}>{user.name} {user.isVerified && <Text style={{ color: Colors.gold }}>✓</Text>}</Text>
          <Text style={styles.email}>{user.username} · {roleText}</Text>
          <Text style={styles.bio}>{user.bio}</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/profile/edit' as any)}>
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.findBtn} onPress={() => router.push('/network/suggestions' as any)}>
              <Text style={styles.findBtnText}>Find People</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.stats}>
            <TouchableOpacity style={styles.stat} onPress={() => router.push({ pathname: '/network/follows', params: { type: 'followers', userId: user.id } } as any)}>
              <Text style={styles.statVal}>{user.followersCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stat} onPress={() => router.push({ pathname: '/network/follows', params: { type: 'following', userId: user.id } } as any)}>
              <Text style={styles.statVal}>{user.followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
            <View style={styles.stat}>
              <Text style={styles.statVal}>{user.postsCount}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Menu */}
        <View style={styles.menu}>
          {MENU_ITEMS.map(item => {
            const unreadBadge = item.label === 'Messages' && totalUnread > 0;
            return (
              <TouchableOpacity
                key={item.label}
                style={styles.menuItem}
                onPress={() => item.route && router.push(item.route as any)}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <View style={styles.menuText}>
                  <View style={styles.menuLabelRow}>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    {unreadBadge && (
                      <View style={styles.menuBadge}>
                        <Text style={styles.menuBadgeText}>{totalUnread > 99 ? '99+' : totalUnread}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.menuSub}>{item.sub}</Text>
                </View>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.logout} onPress={handleSignOut}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  guestContainer: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, alignItems: 'center' },
  guestDecor: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: Colors.gold + '40', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  guestDecorInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.gold + '60' },
  guestTitle: { ...Typography.display, fontSize: 28, marginBottom: Spacing.sm },
  guestSub: { ...Typography.caption, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.xl },
  signInBtn: { borderRadius: Radius.full, overflow: 'hidden', marginBottom: Spacing.md, width: '100%' },
  signInGradient: { paddingVertical: 14, alignItems: 'center', borderRadius: Radius.full },
  signInText: { ...Typography.bodyBold, fontSize: 16, color: Colors.bg },
  createText: { ...Typography.bodySemibold, fontSize: 14, color: Colors.gold, marginBottom: Spacing.xxl },
  guestMenu: { width: '100%', gap: Spacing.sm },
  guestMenuItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  guestMenuIcon: { fontSize: 20 },
  guestMenuLabel: { ...Typography.bodySemibold, fontSize: 14, flex: 1 },
  guestMenuArrow: { color: Colors.gold, fontSize: 20 },
  profileHeader: { alignItems: 'center', paddingVertical: Spacing.xl, paddingTop: Spacing.lg },
  avatarWrapper: { position: 'relative', marginBottom: Spacing.md },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: Colors.gold },
  avatarPlaceholder: { backgroundColor: Colors.bgCard, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { ...Typography.heading, fontSize: 32, color: Colors.gold },
  editAvatarBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.gold, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: Colors.bg,
  },
  editAvatarIcon: { fontSize: 13, color: Colors.bg },
  name: { ...Typography.heading, fontSize: 22, marginBottom: 4 },
  email: { ...Typography.caption, fontSize: 13, marginBottom: Spacing.sm },
  bio: { ...Typography.caption, fontSize: 13, textAlign: 'center', marginHorizontal: Spacing.xl, marginBottom: Spacing.md, color: Colors.creamDim, lineHeight: 20 },
  actionRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  editBtn: { backgroundColor: Colors.bgCard, paddingHorizontal: Spacing.lg, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  editBtnText: { ...Typography.bodySemibold, fontSize: 13, color: Colors.cream },
  findBtn: { backgroundColor: Colors.bgCard, paddingHorizontal: Spacing.lg, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.gold },
  findBtnText: { ...Typography.bodySemibold, fontSize: 13, color: Colors.gold },
  stats: { flexDirection: 'row', gap: Spacing.xl },
  stat: { alignItems: 'center' },
  statVal: { ...Typography.bodyBold, fontSize: 18, color: Colors.gold },
  statLabel: { ...Typography.caption, fontSize: 11 },
  menu: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, gap: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, marginBottom: 2, borderWidth: 1, borderColor: Colors.border },
  menuIcon: { fontSize: 20, width: 32 },
  menuText: { flex: 1 },
  menuLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuLabel: { ...Typography.bodySemibold, fontSize: 14 },
  menuBadge: { minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center' },
  menuBadgeText: { color: '#fff', fontSize: 10, fontFamily: 'Inter_700Bold' },
  menuSub: { ...Typography.caption, fontSize: 11, marginTop: 2 },
  menuArrow: { color: Colors.creamDim, fontSize: 20 },
  logout: { margin: Spacing.lg, padding: Spacing.md, alignItems: 'center' },
  logoutText: { ...Typography.bodySemibold, fontSize: 14, color: Colors.error },
});
