import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';

const COMMISSION_ROWS: [string, string, boolean?][] = [
  ['Registration fee', '₹499 (one-time)', false],
  ['Commission per sale', '12%', false],
  ['Payment gateway', '2%', false],
  ['You receive on ₹10,000 sale', '~₹8,600', true],
];

const CLAUSES = [
  'Only original artworks — no reproductions or copies.',
  'Accurate, high-quality photos representing the actual piece.',
  '12% commission + 2% payment gateway fee per sale.',
  'Dispatch within 3 business days of order confirmation.',
  'Paznwise reserves the right to reject listings that violate guidelines.',
];

export default function SellTerms() {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToFee, setAgreedToFee] = useState(false);
  const canProceed = agreedToTerms && agreedToFee;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Terms & Fee</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 140, gap: Spacing.lg }}
      >
        {/* Fee card */}
        <LinearGradient colors={['#1C3A58', '#0D1B2A']} style={styles.feeCard}>
          <View style={styles.feeGoldLine} />
          <Text style={styles.feeAmount}>₹499</Text>
          <Text style={styles.feeNote}>One-time registration fee (non-refundable)</Text>
          <View style={styles.perks}>
            {['Profile verification badge', 'Seller dashboard access', 'New-seller spotlight'].map(p => (
              <View key={p} style={styles.perk}>
                <Text style={styles.perkIcon}>✓</Text>
                <Text style={styles.perkText}>{p}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Commission table */}
        <View>
          <Text style={styles.sectionTitle}>Commission Structure</Text>
          <View style={styles.commissionCard}>
            {COMMISSION_ROWS.map(([label, val, green], i) => (
              <View key={label} style={[styles.commRow, i < COMMISSION_ROWS.length - 1 && styles.commRowBorder]}>
                <Text style={styles.commLabel}>{label}</Text>
                <Text style={[styles.commVal, green && { color: Colors.success }]}>{val}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Agreement clauses */}
        <View>
          <Text style={styles.sectionTitle}>Seller Agreement</Text>
          <View style={styles.clauseCard}>
            {CLAUSES.map((clause, i) => (
              <View key={i} style={styles.clause}>
                <Text style={styles.clauseBullet}>•</Text>
                <Text style={styles.clauseText}>{clause}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Checkboxes */}
        <View style={{ gap: Spacing.md }}>
          <TouchableOpacity style={styles.checkRow} onPress={() => setAgreedToTerms(v => !v)} activeOpacity={0.8}>
            <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
              {agreedToTerms && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <Text style={styles.checkLabel}>
              I agree to the Seller Agreement and confirm all my artworks are original.
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.checkRow} onPress={() => setAgreedToFee(v => !v)} activeOpacity={0.8}>
            <View style={[styles.checkbox, agreedToFee && styles.checkboxChecked]}>
              {agreedToFee && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <Text style={styles.checkLabel}>
              I understand the ₹499 registration fee is non-refundable and my listing goes live only after approval.
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <GoldButton
          label={canProceed ? 'Agree & Upload Artwork →' : 'Accept both to continue'}
          onPress={() => canProceed && router.push('/product/create' as any)}
          fullWidth
          size="lg"
          disabled={!canProceed}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backIcon: { color: Colors.gold, fontSize: 22 },
  title: { ...Typography.display, fontSize: 22 },
  feeCard: { borderRadius: Radius.xl, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.borderGold, alignItems: 'center' },
  feeGoldLine: { width: 36, height: 2, backgroundColor: Colors.gold, marginBottom: Spacing.md },
  feeAmount: { fontSize: 52, fontFamily: 'Inter_700Bold', color: Colors.gold, letterSpacing: -2 },
  feeNote: { ...Typography.caption, fontSize: 13, color: Colors.creamDim, marginTop: 4, marginBottom: Spacing.lg, textAlign: 'center' },
  perks: { gap: Spacing.sm, width: '100%' },
  perk: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  perkIcon: { color: Colors.gold, fontSize: 14, width: 18 },
  perkText: { ...Typography.body, fontSize: 14, color: Colors.cream },
  sectionTitle: { ...Typography.heading, fontSize: 20, marginBottom: Spacing.sm },
  commissionCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  commRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md },
  commRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  commLabel: { ...Typography.body, fontSize: 14, color: Colors.creamDim, flex: 1 },
  commVal: { ...Typography.bodyBold, fontSize: 14, color: Colors.cream },
  clauseCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: Spacing.sm },
  clause: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  clauseBullet: { color: Colors.gold, fontSize: 14, lineHeight: 20, width: 14 },
  clauseText: { ...Typography.body, fontSize: 13, color: Colors.creamDim, flex: 1, lineHeight: 20 },
  checkRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  checkboxChecked: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  checkMark: { color: Colors.bg, fontSize: 13, fontWeight: '700' },
  checkLabel: { ...Typography.body, fontSize: 13, color: Colors.creamDim, flex: 1, lineHeight: 20 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.bgElevated, borderTopWidth: 1, borderTopColor: Colors.borderGold, padding: Spacing.md, paddingBottom: 28 },
});
