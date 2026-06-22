import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { ArtCard } from '@/components/ArtCard';
import { StarRow } from '@/components/StarRow';
import { ARTWORKS } from '@/constants/data';

const { width } = Dimensions.get('window');

export default function ArtistProfile() {
  const [tab, setTab] = useState<'works' | 'about' | 'events'>('works');
  const [following, setFollowing] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Cover banner */}
        <View style={styles.cover}>
          <Image source={{ uri: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=300&fit=crop' }} style={styles.coverImg} contentFit="cover" transition={300} />
          <LinearGradient colors={['rgba(13,27,42,0.3)', 'rgba(13,27,42,0.9)']} style={StyleSheet.absoluteFill} />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar + info */}
        <View style={styles.profileSection}>
          <Image source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop' }} style={styles.avatar} contentFit="cover" />
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>Priya Sharma</Text>
              <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>✓</Text></View>
            </View>
            <Text style={styles.tagline}>Contemporary painter · Nature & urban sublime</Text>
            <Text style={styles.location}>📍 Mumbai, Maharashtra</Text>
            <StarRow rating={4.9} count={47} />
          </View>
          <View style={styles.followRow}>
            <TouchableOpacity style={[styles.followBtn, following && styles.followingBtn]} onPress={() => setFollowing(!following)}>
              <Text style={[styles.followText, following && { color: Colors.creamDim }]}>{following ? 'Following' : 'Follow'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.msgBtn} onPress={() => router.push('/messages')}>
              <Text style={styles.msgIcon}>💬</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[['23', 'Works'], ['1.2K', 'Followers'], ['84', 'Sales'], ['8', 'Exhibitions']].map(([v, l]) => (
            <View key={l} style={styles.stat}>
              <Text style={styles.statVal}>{v}</Text>
              <Text style={styles.statLabel}>{l}</Text>
            </View>
          ))}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['works', 'about', 'events'] as const).map(t => (
            <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'works' && (
          <FlatList
            data={ARTWORKS.slice(0, 6)}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={{ gap: Spacing.sm, paddingHorizontal: Spacing.md }}
            contentContainerStyle={{ gap: Spacing.sm, paddingBottom: Spacing.md }}
            keyExtractor={i => String(i.id)}
            renderItem={({ item }) => <ArtCard item={item} onPress={() => router.push(`/artwork/${item.id}` as any)} />}
          />
        )}

        {tab === 'about' && (
          <View style={styles.aboutSection}>
            <Text style={styles.bio}>Priya Sharma is a Mumbai-based contemporary artist whose work explores the liminal spaces between nature and urbanity. With over 10 years of practice, her paintings have been exhibited across India and internationally, and are held in private collections in the UK, UAE, and Singapore.</Text>

            <Text style={styles.sectionTitle}>Education</Text>
            {[
              { year: '2013–15', deg: 'MFA in Fine Arts', school: 'Sarojini Naidu School of Arts, Hyderabad' },
              { year: '2010–13', deg: 'BFA in Visual Arts', school: 'Sir J. J. School of Art, Mumbai' },
            ].map(e => (
              <View key={e.year} style={styles.eduRow}>
                <Text style={styles.eduYear}>{e.year}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eduDeg}>{e.deg}</Text>
                  <Text style={styles.eduSchool}>{e.school}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {tab === 'events' && (
          <View style={styles.aboutSection}>
            {[
              { year: '2024', title: 'Fluid Borders', venue: 'Chemould Prescott Road, Mumbai', type: 'Solo' },
              { year: '2023', title: 'India Art Fair', venue: 'NSIC Grounds, New Delhi', type: 'Fair' },
              { year: '2022', title: 'Breathing Spaces', venue: 'CIMA Gallery, Kolkata', type: 'Solo' },
            ].map(ex => (
              <View key={ex.title} style={styles.exRow}>
                <Text style={styles.exYear}>{ex.year}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exTitle}>{ex.title}</Text>
                  <Text style={styles.exVenue}>{ex.venue}</Text>
                </View>
                <View style={styles.exTypeBadge}><Text style={styles.exType}>{ex.type}</Text></View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { width, height: 180, position: 'relative' },
  coverImg: { width: '100%', height: '100%' },
  backBtn: { position: 'absolute', top: 48, left: Spacing.md, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(13,27,42,0.7)', alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: Colors.cream, fontSize: 18 },
  profileSection: { padding: Spacing.md, paddingTop: 0, marginTop: -44 },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: Colors.gold, marginBottom: Spacing.md },
  profileInfo: { marginBottom: Spacing.md, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  name: { ...Typography.display, fontSize: 26 },
  verifiedBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  verifiedText: { color: Colors.bg, fontSize: 10, fontFamily: 'Inter_700Bold' },
  tagline: { ...Typography.bodyItalic, fontSize: 14, color: Colors.creamDim, fontFamily: 'CormorantGaramond_500Medium_Italic' },
  location: { ...Typography.caption, fontSize: 12 },
  followRow: { flexDirection: 'row', gap: Spacing.sm },
  followBtn: { flex: 1, paddingVertical: Spacing.sm, backgroundColor: Colors.gold, borderRadius: Radius.full, alignItems: 'center' },
  followingBtn: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  followText: { ...Typography.bodyBold, fontSize: 14, color: Colors.bg },
  msgBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  msgIcon: { fontSize: 18 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: Spacing.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md },
  stat: { alignItems: 'center' },
  statVal: { ...Typography.bodyBold, fontSize: 18, color: Colors.gold },
  statLabel: { ...Typography.caption, fontSize: 11 },
  tabs: { flexDirection: 'row', marginHorizontal: Spacing.md, marginBottom: Spacing.md, backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: 4 },
  tab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.sm },
  tabActive: { backgroundColor: Colors.bgElevated },
  tabText: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  tabTextActive: { color: Colors.cream, fontFamily: 'Inter_600SemiBold' },
  aboutSection: { paddingHorizontal: Spacing.md, gap: Spacing.md },
  bio: { ...Typography.body, fontSize: 15, lineHeight: 24, color: Colors.creamDim },
  sectionTitle: { ...Typography.heading, fontSize: 18, marginTop: Spacing.sm },
  eduRow: { flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  eduYear: { ...Typography.label, fontSize: 9, color: Colors.gold, width: 50 },
  eduDeg: { ...Typography.bodySemibold, fontSize: 13 },
  eduSchool: { ...Typography.caption, fontSize: 11 },
  exRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  exYear: { ...Typography.label, fontSize: 9, color: Colors.gold, width: 40 },
  exTitle: { ...Typography.bodySemibold, fontSize: 13 },
  exVenue: { ...Typography.caption, fontSize: 11 },
  exTypeBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.borderGold },
  exType: { ...Typography.label, fontSize: 9, color: Colors.gold },
});
