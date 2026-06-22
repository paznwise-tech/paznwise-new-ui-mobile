import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

const MENU_ITEMS = [
  { icon: '🖼', label: 'My Orders',        sub: 'Track your artwork purchases',    route: '/cart' },
  { icon: '🎵', label: 'My Bookings',      sub: 'Performer bookings & events',     route: '/my-bookings' },
  { icon: '💬', label: 'Messages',          sub: 'Chat with artists & sellers',     route: '/messages' },
  { icon: '🎨', label: 'Sell Artwork',      sub: 'List your original pieces',       route: '/sell' },
  { icon: '🎤', label: 'Register as Performer', sub: 'Get booked for events',      route: '/register-artist' },
  { icon: '⚙️', label: 'Settings',          sub: 'Account, privacy & more',        route: null },
  { icon: '❓', label: 'Help & Support',    sub: 'FAQs, contact us',               route: null },
];

export default function Profile() {
  const isLoggedIn = false; // TODO: connect auth context

  if (!isLoggedIn) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }} />
        <View style={styles.guestContainer}>
          <View style={styles.guestDecor}>
            <View style={styles.guestDecorInner} />
          </View>
          <Text style={styles.guestTitle}>Your Profile</Text>
          <Text style={styles.guestSub}>Sign in to access your collection,{'\n'}bookings and messages</Text>
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
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop' }}
            style={styles.avatar}
            contentFit="cover"
          />
          <Text style={styles.name}>Amit Kumar</Text>
          <Text style={styles.email}>amit@example.com · Buyer</Text>
          <View style={styles.stats}>
            {[['12', 'Artworks'], ['3', 'Bookings'], ['5', 'Events']].map(([v, l]) => (
              <View key={l} style={styles.stat}>
                <Text style={styles.statVal}>{v}</Text>
                <Text style={styles.statLabel}>{l}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Menu */}
        <View style={styles.menu}>
          {MENU_ITEMS.map(item => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuItem}
              onPress={() => item.route && router.push(item.route as any)}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <View style={styles.menuText}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSub}>{item.sub}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logout}>
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
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: Colors.gold, marginBottom: Spacing.md },
  name: { ...Typography.heading, fontSize: 22, marginBottom: 4 },
  email: { ...Typography.caption, fontSize: 13, marginBottom: Spacing.lg },
  stats: { flexDirection: 'row', gap: Spacing.xl },
  stat: { alignItems: 'center' },
  statVal: { ...Typography.bodyBold, fontSize: 18, color: Colors.gold },
  statLabel: { ...Typography.caption, fontSize: 11 },
  menu: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, gap: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, marginBottom: 2, borderWidth: 1, borderColor: Colors.border },
  menuIcon: { fontSize: 20, width: 32 },
  menuText: { flex: 1 },
  menuLabel: { ...Typography.bodySemibold, fontSize: 14 },
  menuSub: { ...Typography.caption, fontSize: 11, marginTop: 2 },
  menuArrow: { color: Colors.creamDim, fontSize: 20 },
  logout: { margin: Spacing.lg, padding: Spacing.md, alignItems: 'center' },
  logoutText: { ...Typography.bodySemibold, fontSize: 14, color: Colors.error },
});
