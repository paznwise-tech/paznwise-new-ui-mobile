import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { ArtistProfileService } from '@/services/artistProfileService';
import { useUser } from '@/context/AppContext';

/**
 * Two steps, not three.
 *
 * There was a "Bank Details" step collecting a bank name, account number,
 * IFSC and account-holder name. No endpoint on the API accepts any of it —
 * POST /api/sellers/setup, which this screen called, does not exist. The
 * data was gathered and discarded, which for a bank account number is worse
 * than not asking. Payouts are handled outside the app.
 */
const STEPS = ['Your Details', 'Review'];

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.stepRow}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={styles.stepItem}>
          <View style={[styles.stepDot, i <= step && styles.stepDotActive]}>
            {i < step
              ? <Text style={styles.stepCheck}>✓</Text>
              : <Text style={[styles.stepNum, i === step && { color: Colors.bg }]}>{i + 1}</Text>
            }
          </View>
          {i < total - 1 && (
            <View style={[styles.stepLine, i < step && styles.stepLineActive]} />
          )}
        </View>
      ))}
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

export default function SellerSetup() {
  const { updateUserProfile } = useUser();
  const [step, setStep]           = useState(0);
  const [shopName, setShopName]   = useState('');
  const [shopDesc, setShopDesc]   = useState('');
  const [city, setCity]           = useState('');
  const [loading, setLoading]     = useState(false);

  const handleNext = useCallback(() => {
    if (step === 0) {
      if (!shopName.trim()) { Alert.alert('Required', 'Please enter your display name'); return; }
    }
    setStep(s => s + 1);
  }, [step, shopName]);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    try {
      // Selling is gated by the artist profile, not a separate seller
      // record — that is where a display name, bio and city belong.
      await ArtistProfileService.createProfile({
        displayName: shopName.trim(),
        bio: shopDesc.trim() || undefined,
        city: city.trim() || undefined,
      });
      updateUserProfile({ isArtist: true });
      Alert.alert(
        'Profile created',
        'Your seller profile has been created and is pending review. You can start preparing listings now.',
        [{ text: 'Continue', onPress: () => router.replace('/seller/dashboard' as any) }],
      );
    } catch (e: any) {
      Alert.alert('Could not create profile', e?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [shopName, shopDesc, city, updateUserProfile]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => step > 0 ? setStep(s => s - 1) : router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Seller Setup</Text>
          <View style={{ width: 24 }} />
        </View>
        <StepIndicator step={step} total={STEPS.length} />
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.stepTitle}>{STEPS[step]}</Text>

        {step === 0 && (
          <>
            <Text style={styles.stepDesc}>Tell buyers who you are and what you make.</Text>
            <Field label="Display Name">
              <TextInput
                style={styles.input}
                placeholder="e.g. Priya Sharma"
                placeholderTextColor={Colors.creamFaint}
                value={shopName} onChangeText={setShopName}
              />
            </Field>
            <Field label="About your work">
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Describe your art style, specializations, and what makes your work unique…"
                placeholderTextColor={Colors.creamFaint}
                multiline numberOfLines={4}
                textAlignVertical="top"
                value={shopDesc} onChangeText={setShopDesc}
              />
            </Field>
            <Field label="City (optional)">
              <TextInput
                style={styles.input}
                placeholder="e.g. Jaipur"
                placeholderTextColor={Colors.creamFaint}
                value={city} onChangeText={setCity}
              />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.stepDesc}>Review your details before submitting.</Text>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewSection}>Your Details</Text>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewKey}>Display Name</Text>
                <Text style={styles.reviewVal}>{shopName}</Text>
              </View>
              {shopDesc ? (
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>Description</Text>
                  <Text style={[styles.reviewVal, { flex: 1 }]} numberOfLines={3}>{shopDesc}</Text>
                </View>
              ) : null}
              {city ? (
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>City</Text>
                  <Text style={styles.reviewVal}>{city}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.stepDesc}>
              Your profile is reviewed before your listings go live. You can start
              preparing them straight away.
            </Text>
          </>
        )}

        {step < STEPS.length - 1 ? (
          <GoldButton label="Continue →" onPress={handleNext} size="lg" fullWidth />
        ) : (
          <GoldButton
            label={loading ? 'Submitting…' : 'Complete Setup'}
            onPress={handleSubmit}
            size="lg"
            fullWidth
            disabled={loading}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  backIcon: { color: Colors.gold, fontSize: 22 },
  title: { ...Typography.display, fontSize: 22 },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
  stepItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.bgCard,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { borderColor: Colors.gold, backgroundColor: Colors.gold },
  stepNum: { ...Typography.bodySemibold, fontSize: 12, color: Colors.creamDim },
  stepCheck: { ...Typography.bodyBold, fontSize: 12, color: Colors.bg },
  stepLine: { flex: 1, height: 2, backgroundColor: Colors.border, marginHorizontal: 2 },
  stepLineActive: { backgroundColor: Colors.gold },
  content: { padding: Spacing.md, paddingBottom: 100, gap: Spacing.md },
  stepTitle: { ...Typography.display, fontSize: 24 },
  stepDesc: { ...Typography.body, fontSize: 15, color: Colors.creamDim, lineHeight: 22, marginTop: -Spacing.sm },
  field: { gap: Spacing.xs },
  fieldLabel: { ...Typography.label, fontSize: 10 },
  input: {
    backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md,
    ...Typography.body, fontSize: 15, color: Colors.cream,
  },
  textarea: { height: 100, textAlignVertical: 'top' },
  reviewCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: Spacing.sm,
  },
  reviewSection: { ...Typography.heading, fontSize: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: Spacing.sm },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.sm },
  reviewKey: { ...Typography.caption, fontSize: 13, width: 80 },
  reviewVal: { ...Typography.bodySemibold, fontSize: 14, textAlign: 'right' },
});
