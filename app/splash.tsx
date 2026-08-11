import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius } from '@/constants/theme';

const STATS = [
  { val: '10K+', label: 'Artworks' },
  { val: '500+', label: 'Artists' },
  { val: '48h', label: 'Approval' },
];

export default function Splash() {
  return (
    <LinearGradient colors={['#154468', '#0e2d45', '#07192a']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.container}>
          <View style={[styles.circle, styles.circleL]} />
          <View style={[styles.circle, styles.circleR]} />

          <View style={styles.logoSection}>
            <Text style={styles.logo}>Paznwise</Text>
            <Text style={styles.tagline}>Where Art Meets Heart</Text>
            <Text style={styles.subtitle}>Discover and collect original Indian art</Text>
          </View>

          <View style={styles.statsRow}>
            {STATS.map(s => (
              <View key={s.label} style={styles.stat}>
                <Text style={styles.statVal}>{s.val}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.ctaSection}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(auth)/signup' as any)}>
              <Text style={styles.primaryBtnText}>Explore Art</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/(auth)/login' as any)}>
              <Text style={styles.secondaryBtnText}>Sign in to your account</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>10K+ artworks · 500+ artists · Pan-India delivery</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.xl, overflow: 'hidden' },
  circle: { position: 'absolute', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(157,231,215,0.15)', backgroundColor: 'rgba(157,231,215,0.04)' },
  circleL: { width: 260, height: 260, top: -60, left: -80 },
  circleR: { width: 200, height: 200, bottom: 80, right: -50 },
  logoSection: { alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xxl },
  logo: { fontSize: 42, fontFamily: 'Inter_700Bold', color: '#9DE7D7', letterSpacing: -1 },
  tagline: { ...Typography.heading, fontSize: 20, color: '#fff', textAlign: 'center' },
  subtitle: { ...Typography.caption, fontSize: 14, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: Spacing.xxl, paddingVertical: Spacing.xl },
  stat: { alignItems: 'center', gap: 4 },
  statVal: { fontSize: 28, fontFamily: 'Inter_700Bold', color: '#9DE7D7' },
  statLabel: { ...Typography.caption, fontSize: 12, color: 'rgba(255,255,255,0.55)' },
  ctaSection: { width: '100%', gap: Spacing.md },
  primaryBtn: { backgroundColor: '#9DE7D7', borderRadius: Radius.full, paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#07192a' },
  secondaryBtn: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)', borderRadius: Radius.full, paddingVertical: 14, alignItems: 'center' },
  secondaryBtnText: { ...Typography.bodySemibold, fontSize: 14, color: '#fff' },
  footer: { ...Typography.caption, fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center' },
});
