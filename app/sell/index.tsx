import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';

const STATS = [
  { val: '10K+', label: 'Collectors' },
  { val: '₹0', label: 'Commission\non first sale' },
  { val: '48h', label: 'Avg.\napproval' },
];

const STEPS = [
  { num: '01', title: 'Artist Profile', desc: 'Set up your seller profile with bio, specialisations and portfolio links.' },
  { num: '02', title: 'Terms & Fee', desc: '₹499 one-time registration fee. 12% commission per sale. No hidden charges.' },
  { num: '03', title: 'Upload Artwork', desc: 'Add high-quality photos, pricing, dimensions and artwork details.' },
  { num: '04', title: 'Admin Review', desc: 'Our team reviews your listing in 24–48 hours and notifies you via email.' },
];

export default function SellIntro() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Sell on Paznwise</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero */}
        <LinearGradient colors={['#1C3A58', '#0D1B2A']} style={styles.hero}>
          <View style={styles.heroGoldLine} />
          <Text style={styles.heroTitle}>List your artwork.{'\n'}Reach thousands of collectors.</Text>
          <View style={styles.statsRow}>
            {STATS.map(s => (
              <View key={s.label} style={styles.stat}>
                <Text style={styles.statVal}>{s.val}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Steps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How it works</Text>
          {STEPS.map((step, i) => (
            <View key={step.num} style={styles.step}>
              <View style={styles.stepNumWrap}>
                <View style={styles.stepNumCircle}>
                  <Text style={styles.stepNum}>{step.num}</Text>
                </View>
                {i < STEPS.length - 1 && <View style={styles.stepLine} />}
              </View>
              <View style={styles.stepBody}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTAs */}
        <View style={styles.ctaWrap}>
          <GoldButton
            label="Start — Set up your profile"
            onPress={() => router.push('/seller/setup' as any)}
            fullWidth
            size="lg"
          />
          <TouchableOpacity style={styles.skipBtn} onPress={() => router.push('/sell/terms' as any)}>
            <Text style={styles.skipText}>View terms & fees →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => router.push('/product/create' as any)}>
            <Text style={styles.ghostBtnText}>Skip to upload artwork</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backIcon: { color: Colors.gold, fontSize: 22 },
  title: { ...Typography.display, fontSize: 20 },
  hero: { padding: Spacing.xl, paddingBottom: Spacing.xxl, borderBottomWidth: 1, borderBottomColor: Colors.borderGold },
  heroGoldLine: { width: 40, height: 2, backgroundColor: Colors.gold, marginBottom: Spacing.md },
  heroTitle: { ...Typography.display, fontSize: 26, lineHeight: 33, marginBottom: Spacing.xl },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', gap: 4, flex: 1 },
  statVal: { ...Typography.display, fontSize: 22, color: Colors.gold },
  statLabel: { ...Typography.caption, fontSize: 11, color: Colors.creamDim, textAlign: 'center' },
  section: { padding: Spacing.lg, gap: Spacing.sm },
  sectionTitle: { ...Typography.heading, fontSize: 22, marginBottom: Spacing.md },
  step: { flexDirection: 'row', gap: Spacing.md },
  stepNumWrap: { alignItems: 'center', width: 44 },
  stepNumCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  stepNum: { fontFamily: 'Inter_700Bold', fontSize: 13, color: Colors.bg },
  stepLine: { width: 2, flex: 1, backgroundColor: Colors.borderGold, marginVertical: 6 },
  stepBody: { flex: 1, paddingBottom: Spacing.xl },
  stepTitle: { ...Typography.heading, fontSize: 17, marginBottom: 4 },
  stepDesc: { ...Typography.body, fontSize: 14, color: Colors.creamDim, lineHeight: 20 },
  ctaWrap: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  skipBtn: { alignSelf: 'center', paddingVertical: Spacing.sm },
  skipText: { ...Typography.bodySemibold, fontSize: 14, color: Colors.gold },
  ghostBtn: { alignSelf: 'center', paddingVertical: Spacing.xs },
  ghostBtnText: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
});
