import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import {
  ArtistProfileService, REGISTRATION_FEE, isProfileComplete,
  type ArtistProfile, type ArtistPaymentInit,
} from '@/services/artistProfileService';
import { useRazorpayPayment } from '@/payments/useRazorpayPayment';
import { useUser } from '@/context/AppContext';

const ART_STYLES = [
  'Painting', 'Sculpture', 'Photography', 'Digital Art', 'Printmaking',
  'Textile', 'Ceramics', 'Illustration', 'Mixed Media', 'Folk Art',
];

/** The three server-side steps, in the order the profile records them. */
const STEPS = ['Your details', 'Registration fee', 'Review'] as const;

export default function RegisterArtist() {
  const { user, updateUserProfile } = useUser();

  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [artStyles, setArtStyles] = useState<string[]>([]);

  /**
   * Onboarding is resumable.
   *
   * Each step is recorded server-side, so someone who paid and then closed
   * the app must not be asked to pay again. The existing profile decides
   * which step to open on.
   */
  useEffect(() => {
    ArtistProfileService.getMyProfile()
      .then(p => {
        if (!p) return;
        setProfile(p);
        setDisplayName(p.displayName ?? '');
        setBio(p.bio ?? '');
        setCity(p.city ?? '');
        setArtStyles(p.artStyles ?? []);
        if (p.onboardingStatus === 'ADMIN_REVIEW' || p.onboardingStatus === 'COMPLETED') setStep(2);
        else if (p.paymentStatus === 'ACTIVE') setStep(2);
        else setStep(1);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleStyle = (s: string) =>
    setArtStyles(prev => (prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]));

  const handleSaveDetails = useCallback(async () => {
    // The server refuses submit-for-review unless all of these are present,
    // so they are required here rather than discovered at the last step.
    if (!displayName.trim()) { Alert.alert('Required', 'Please enter your display name.'); return; }
    if (!bio.trim())         { Alert.alert('Required', 'Please tell buyers about your work.'); return; }
    if (!city.trim())        { Alert.alert('Required', 'Please enter your city.'); return; }
    if (artStyles.length === 0) { Alert.alert('Required', 'Pick at least one art style.'); return; }

    setSaving(true);
    try {
      const payload = {
        displayName: displayName.trim(),
        bio: bio.trim(),
        city: city.trim(),
        artStyles,
      };
      const saved = profile
        ? await ArtistProfileService.updateProfile(profile.id, payload)
        : await ArtistProfileService.createProfile(payload);
      setProfile(saved);
      setStep(1);
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  }, [displayName, bio, city, artStyles, profile]);

  const initRef = useRef<ArtistPaymentInit | null>(null);

  const { pay, processing } = useRazorpayPayment<void>({
    createOrder: async () => {
      if (!profile) throw new Error('Save your details first.');
      const init = await ArtistProfileService.initiatePayment(profile.id);
      initRef.current = init;

      if (!init.razorpayOrderId || !init.keyId) return null;

      return {
        razorpayOrderId: init.razorpayOrderId,
        keyId: init.keyId,
        // `amount` is paise on this branch and rupees on the other, so it is
        // only trusted when an order actually exists.
        amountPaise: init.amount,
        currency: init.currency,
        description: 'Paznwise artist registration',
        internalId: profile.id,
        prefill: { name: user.name || undefined, email: user.email || undefined },
      };
    },
    verify: async (payment, internalId) => {
      await ArtistProfileService.verifyPayment(String(internalId), {
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: payment.razorpay_payment_id,
        razorpay_signature: payment.razorpay_signature,
      });
    },
    onFree: async () => {
      // No gateway configured server-side, so nothing can be charged here.
      Alert.alert(
        'Payment unavailable',
        'Online payment is not set up right now. Please contact support to complete your registration.',
      );
    },
    onSuccess: async () => {
      const refreshed = await ArtistProfileService.getMyProfile();
      if (refreshed) setProfile(refreshed);
      setStep(2);
    },
  });

  const handleSubmit = useCallback(async () => {
    if (!profile) return;
    setSubmitting(true);
    try {
      await ArtistProfileService.submitForReview(profile.id);
      updateUserProfile({ isArtist: true });
      const refreshed = await ArtistProfileService.getMyProfile();
      if (refreshed) setProfile(refreshed);
      Alert.alert(
        'Submitted for review',
        'Our team will verify your profile. You will be notified once it is approved.',
        [{ text: 'Done', onPress: () => router.replace('/(tabs)') }],
      );
    } catch (e: any) {
      Alert.alert('Could not submit', e?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [profile, updateUserProfile]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.gold} size="large" /></View>;
  }

  const paid = profile?.paymentStatus === 'ACTIVE';
  const inReview = profile?.onboardingStatus === 'ADMIN_REVIEW';
  const approved = profile?.verificationStatus === 'VERIFIED';
  const rejected = profile?.verificationStatus === 'REJECTED';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          {/* Once paid there is nothing to go back to — the fee is not undone
              by editing details, and stepping back would imply otherwise. */}
          <TouchableOpacity onPress={() => (step > 0 && !paid ? setStep(s => s - 1) : router.back())}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Become an Artist</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.steps}>
          {STEPS.map((label, i) => (
            <View key={label} style={styles.stepItem}>
              <View style={[styles.stepDot, i <= step && styles.stepDotActive]}>
                <Text style={[styles.stepNum, i <= step && { color: Colors.bg }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepLabel, i === step && { color: Colors.gold }]}>{label}</Text>
            </View>
          ))}
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <>
            <Text style={styles.label}>Display name</Text>
            <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName}
              placeholder="The name buyers will see" placeholderTextColor={Colors.creamFaint} />

            <Text style={styles.label}>About your work</Text>
            <TextInput style={[styles.input, styles.textarea]} value={bio} onChangeText={setBio}
              placeholder="Your practice, materials, and what makes your work yours"
              placeholderTextColor={Colors.creamFaint} multiline />

            <Text style={styles.label}>City</Text>
            <TextInput style={styles.input} value={city} onChangeText={setCity}
              placeholder="e.g. Jaipur" placeholderTextColor={Colors.creamFaint} />

            <Text style={styles.label}>Art styles</Text>
            <View style={styles.chipWrap}>
              {ART_STYLES.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, artStyles.includes(s) && styles.chipActive]}
                  onPress={() => toggleStyle(s)}
                >
                  <Text style={[styles.chipText, artStyles.includes(s) && { color: Colors.gold }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <View style={styles.feeCard}>
              <Text style={styles.feeAmount}>₹{REGISTRATION_FEE}</Text>
              <Text style={styles.feeLabel}>One-time registration fee</Text>
              <Text style={styles.feeBody}>
                Covers verification of your profile and listing your work on Paznwise.
                Commission on sales is charged separately, according to your plan.
              </Text>
            </View>
            {paid && <Text style={styles.paidNote}>✓ Payment received — continue to review.</Text>}
          </>
        )}

        {step === 2 && (
          <>
            {rejected ? (
              <View style={styles.statusCard}>
                <Text style={styles.statusTitle}>Not approved</Text>
                <Text style={styles.statusBody}>
                  {profile?.rejectionReason ??
                    'Your profile was not approved. Update your details and submit again.'}
                </Text>
              </View>
            ) : approved ? (
              <View style={styles.statusCard}>
                <Text style={styles.statusTitle}>You're a verified artist</Text>
                <Text style={styles.statusBody}>You can list artwork and take bookings.</Text>
              </View>
            ) : inReview ? (
              <View style={styles.statusCard}>
                <Text style={styles.statusTitle}>Under review</Text>
                <Text style={styles.statusBody}>
                  Our team is verifying your profile. You'll be notified once it's approved.
                </Text>
              </View>
            ) : (
              <View style={styles.statusCard}>
                <Text style={styles.statusTitle}>Ready to submit</Text>
                <Text style={styles.statusBody}>
                  Your details are saved and your fee is paid. Submit for verification to go live.
                </Text>
              </View>
            )}

            <View style={styles.summary}>
              <Text style={styles.summaryRow}>{displayName}</Text>
              {city ? <Text style={styles.summaryMuted}>{city}</Text> : null}
              {artStyles.length ? <Text style={styles.summaryMuted}>{artStyles.join(' · ')}</Text> : null}
            </View>

            {rejected && (
              <TouchableOpacity onPress={() => setStep(0)} style={{ marginTop: Spacing.lg }}>
                <Text style={styles.editLink}>Edit my details</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        {step === 0 && (
          <GoldButton label={saving ? 'Saving…' : 'Continue →'} onPress={handleSaveDetails}
            size="lg" fullWidth disabled={saving} />
        )}
        {step === 1 && (
          paid ? (
            <GoldButton label="Continue →" onPress={() => setStep(2)} size="lg" fullWidth />
          ) : (
            <GoldButton
              label={processing ? 'Processing…' : `Pay ₹${REGISTRATION_FEE}`}
              onPress={pay} size="lg" fullWidth disabled={processing}
            />
          )
        )}
        {step === 2 && !inReview && !approved && (
          <GoldButton
            label={submitting ? 'Submitting…' : 'Submit for verification'}
            onPress={handleSubmit}
            size="lg"
            fullWidth
            disabled={submitting || !profile || !isProfileComplete(profile)}
          />
        )}
        {step === 2 && (inReview || approved) && (
          <GoldButton label="Done" onPress={() => router.replace('/(tabs)')} size="lg" fullWidth />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  backIcon: { color: Colors.gold, fontSize: 22 },
  title: { ...Typography.display, fontSize: 20 },
  center: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },

  steps: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: Spacing.lg },
  stepItem: { alignItems: 'center', gap: 4 },
  stepDot: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  stepNum: { ...Typography.caption, fontSize: 11, color: Colors.creamDim },
  stepLabel: { ...Typography.caption, fontSize: 10, color: Colors.creamDim },

  label: { ...Typography.label, fontSize: 10, marginBottom: 6, marginTop: Spacing.md },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    padding: Spacing.md, color: Colors.cream, fontFamily: 'Inter_400Regular',
    fontSize: 14, backgroundColor: Colors.bgCard,
  },
  textarea: { minHeight: 100, textAlignVertical: 'top' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '18' },
  chipText: { ...Typography.caption, fontSize: 12, color: Colors.creamDim },

  feeCard: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.gold + '55',
    borderRadius: Radius.md, padding: Spacing.lg, alignItems: 'center',
  },
  feeAmount: { ...Typography.display, fontSize: 40, color: Colors.gold },
  feeLabel: { ...Typography.label, fontSize: 10, marginTop: 4 },
  feeBody: {
    ...Typography.body, fontSize: 13, color: Colors.creamDim,
    textAlign: 'center', marginTop: Spacing.md, lineHeight: 19,
  },
  paidNote: {
    ...Typography.bodySemibold, fontSize: 13, color: Colors.success,
    marginTop: Spacing.md, textAlign: 'center',
  },

  statusCard: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md,
  },
  statusTitle: { ...Typography.heading, fontSize: 18 },
  statusBody: { ...Typography.body, fontSize: 13, color: Colors.creamDim, marginTop: 6, lineHeight: 19 },
  summary: { marginTop: Spacing.lg, gap: 2 },
  summaryRow: { ...Typography.bodySemibold, fontSize: 15 },
  summaryMuted: { ...Typography.caption, fontSize: 13 },
  editLink: { ...Typography.bodySemibold, fontSize: 14, color: Colors.gold },

  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    padding: Spacing.md, paddingBottom: Spacing.lg,
    backgroundColor: Colors.bg, borderTopWidth: 1, borderTopColor: Colors.border,
  },
});
