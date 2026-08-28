import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { useUser } from '@/context/AppContext';
import { ArtistProfileService } from '@/services/artistProfileService';

const PERFORMER_TYPES = [
  { key: 'painter',    label: 'Visual Artist',    emoji: '🎨', from: '#E65100', to: '#FF7043' },
  { key: 'musician',   label: 'Musician / Band',  emoji: '🎵', from: '#4527A0', to: '#7B1FA2' },
  { key: 'dancer',     label: 'Dancer',           emoji: '💃', from: '#C2185B', to: '#E91E63' },
  { key: 'magician',   label: 'Magician',         emoji: '🎩', from: '#1A1A2E', to: '#283593' },
  { key: 'dj',         label: 'DJ',               emoji: '🎧', from: '#01579B', to: '#0288D1' },
  { key: 'mehendi',    label: 'Mehendi Artist',   emoji: '🌿', from: '#880E4F', to: '#AD1457' },
  { key: 'standup',    label: 'Stand-up Comic',   emoji: '🎤', from: '#B71C1C', to: '#D32F2F' },
  { key: 'theatre',    label: 'Theatre Artist',   emoji: '🎭', from: '#4A148C', to: '#6A1B9A' },
  { key: 'photographer', label: 'Photographer',  emoji: '📷', from: '#263238', to: '#37474F' },
  { key: 'yoga',       label: 'Yoga & Wellness',  emoji: '🧘', from: '#1B5E20', to: '#2E7D32' },
  { key: 'circus',     label: 'Circus / Acrobat', emoji: '🤸', from: '#BF360C', to: '#E64A19' },
  { key: 'caricature', label: 'Caricaturist',     emoji: '✏️', from: '#F57F17', to: '#F9A825' },
];

export default function RegisterArtist() {
  const { user, updateUserProfile } = useUser();
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = useCallback(async () => {
    if (!selected || submitting) return;
    const item = PERFORMER_TYPES.find(p => p.key === selected);
    const typeLabel = item?.label || 'Live Performer';

    setSubmitting(true);
    try {
      await ArtistProfileService.createProfile({
        displayName: user.name?.trim() || user.username?.trim() || 'Performer',
        bio: user.bio || undefined,
        city: user.location || undefined,
        artStyles: [typeLabel],
      });
      updateUserProfile({ isPerformer: true });

      // Deliberately does not claim registration is complete: the profile
      // still has to be paid for and approved, and neither step is built
      // yet, so the copy stops at what actually happened.
      Alert.alert(
        'Profile created',
        `Your ${typeLabel} profile has been created and is pending review.`,
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }],
      );
    } catch (e: any) {
      Alert.alert('Could not create profile', e?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [selected, submitting, user.name, user.username, user.bio, user.location, updateUserProfile]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Register as Performer</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.intro}>
          <View style={styles.introGoldLine} />
          <Text style={styles.introEyebrow}>Get Booked for Events</Text>
          <Text style={styles.introTitle}>What best describes{'\n'}your performance?</Text>
          <Text style={styles.introSub}>Select your primary performer type. You can add more later.</Text>
        </View>

        <View style={styles.grid}>
          {PERFORMER_TYPES.map(p => (
            <TouchableOpacity
              key={p.key}
              style={[styles.card, selected === p.key && styles.cardSelected]}
              onPress={() => setSelected(p.key)}
              activeOpacity={0.8}
            >
              <View style={[styles.cardBg, { backgroundColor: p.from + (selected === p.key ? 'ff' : '44') }]}>
                <Text style={styles.cardEmoji}>{p.emoji}</Text>
                <Text style={styles.cardLabel}>{p.label}</Text>
                {selected === p.key && <View style={styles.checkmark}><Text style={styles.checkmarkText}>✓</Text></View>}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <GoldButton
          label={submitting ? 'Creating…' : 'Continue →'}
          onPress={handleRegister}
          size="lg" fullWidth
          disabled={!selected || submitting}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backIcon: { color: Colors.gold, fontSize: 22 },
  title: { ...Typography.heading, fontSize: 18 },
  intro: { padding: Spacing.lg, paddingBottom: Spacing.md },
  introGoldLine: { width: 32, height: 2, backgroundColor: Colors.gold, marginBottom: Spacing.md },
  introEyebrow: { ...Typography.label, marginBottom: Spacing.xs },
  introTitle: { ...Typography.display, fontSize: 28, lineHeight: 32, marginBottom: Spacing.sm },
  introSub: { ...Typography.caption, fontSize: 14, color: Colors.creamDim, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.md, gap: Spacing.sm },
  card: { width: '30.5%', borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1.5, borderColor: Colors.border },
  cardSelected: { borderColor: Colors.gold },
  cardBg: { padding: Spacing.md, alignItems: 'center', gap: Spacing.sm, minHeight: 90, justifyContent: 'center' },
  cardEmoji: { fontSize: 26 },
  cardLabel: { ...Typography.bodySemibold, fontSize: 11, color: Colors.cream, textAlign: 'center' },
  checkmark: { position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  checkmarkText: { color: Colors.bg, fontSize: 9, fontFamily: 'Inter_700Bold' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.bgElevated, borderTopWidth: 1, borderTopColor: Colors.borderGold, padding: Spacing.md, paddingBottom: 28 },
});
