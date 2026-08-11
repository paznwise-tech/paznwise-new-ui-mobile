import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { SellerService } from '@/services/sellerService';

const STEPS = ['Shop Info', 'Bank Details', 'Review'];

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
  const [step, setStep]           = useState(0);
  const [shopName, setShopName]   = useState('');
  const [shopDesc, setShopDesc]   = useState('');
  const [gst, setGst]             = useState('');
  const [bankName, setBankName]   = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [ifsc, setIfsc]           = useState('');
  const [holderName, setHolderName] = useState('');
  const [loading, setLoading]     = useState(false);

  const handleNext = useCallback(() => {
    if (step === 0) {
      if (!shopName.trim()) { Alert.alert('Required', 'Please enter your shop name'); return; }
    }
    if (step === 1) {
      if (!bankName.trim() || !accountNo.trim() || !ifsc.trim() || !holderName.trim()) {
        Alert.alert('Required', 'Please fill in all bank details'); return;
      }
    }
    setStep(s => s + 1);
  }, [step, shopName, bankName, accountNo, ifsc, holderName]);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    try {
      await SellerService.setup({
        shopName,
        shopDescription: shopDesc,
        gstNumber: gst,
        bankDetails: { bankName, accountNumber: accountNo, ifscCode: ifsc, accountHolderName: holderName },
      });
      Alert.alert('Success', 'Seller account set up successfully!', [
        { text: 'Go to Dashboard', onPress: () => router.push('/seller/dashboard' as any) },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [shopName, shopDesc, gst, bankName, accountNo, ifsc, holderName]);

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
            <Text style={styles.stepDesc}>Tell buyers about your shop and the art you create.</Text>
            <Field label="Shop Name">
              <TextInput
                style={styles.input}
                placeholder="e.g. Priya's Canvas Studio"
                placeholderTextColor={Colors.creamFaint}
                value={shopName} onChangeText={setShopName}
              />
            </Field>
            <Field label="Shop Description">
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Describe your art style, specializations, and what makes your work unique…"
                placeholderTextColor={Colors.creamFaint}
                multiline numberOfLines={4}
                textAlignVertical="top"
                value={shopDesc} onChangeText={setShopDesc}
              />
            </Field>
            <Field label="GST Number (optional)">
              <TextInput
                style={styles.input}
                placeholder="22AAAAA0000A1Z5"
                placeholderTextColor={Colors.creamFaint}
                autoCapitalize="characters"
                value={gst} onChangeText={setGst}
              />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.stepDesc}>Your bank details for receiving payments from sales.</Text>
            <View style={styles.secureNote}>
              <Text style={{ fontSize: 16 }}>🔒</Text>
              <Text style={styles.secureText}>Your bank information is encrypted and secure</Text>
            </View>
            <Field label="Bank Name">
              <TextInput style={styles.input} placeholder="e.g. State Bank of India" placeholderTextColor={Colors.creamFaint} value={bankName} onChangeText={setBankName} />
            </Field>
            <Field label="Account Holder Name">
              <TextInput style={styles.input} placeholder="As per bank records" placeholderTextColor={Colors.creamFaint} value={holderName} onChangeText={setHolderName} />
            </Field>
            <Field label="Account Number">
              <TextInput style={styles.input} placeholder="10-digit account number" placeholderTextColor={Colors.creamFaint} keyboardType="numeric" value={accountNo} onChangeText={setAccountNo} />
            </Field>
            <Field label="IFSC Code">
              <TextInput style={styles.input} placeholder="e.g. SBIN0001234" placeholderTextColor={Colors.creamFaint} autoCapitalize="characters" value={ifsc} onChangeText={setIfsc} />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.stepDesc}>Review your details before submitting.</Text>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewSection}>Shop Information</Text>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewKey}>Shop Name</Text>
                <Text style={styles.reviewVal}>{shopName}</Text>
              </View>
              {shopDesc ? (
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>Description</Text>
                  <Text style={[styles.reviewVal, { flex: 1 }]} numberOfLines={3}>{shopDesc}</Text>
                </View>
              ) : null}
              {gst ? (
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>GST</Text>
                  <Text style={styles.reviewVal}>{gst}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewSection}>Bank Details</Text>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewKey}>Bank</Text>
                <Text style={styles.reviewVal}>{bankName}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewKey}>Account</Text>
                <Text style={styles.reviewVal}>••••{accountNo.slice(-4)}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewKey}>IFSC</Text>
                <Text style={styles.reviewVal}>{ifsc}</Text>
              </View>
            </View>
          </>
        )}

        {step < 2 ? (
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
  secureNote: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.success + '11', borderWidth: 1, borderColor: Colors.success + '44',
    borderRadius: Radius.md, padding: Spacing.md,
  },
  secureText: { ...Typography.caption, fontSize: 13, color: Colors.success, flex: 1 },
  reviewCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: Spacing.sm,
  },
  reviewSection: { ...Typography.heading, fontSize: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: Spacing.sm },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.sm },
  reviewKey: { ...Typography.caption, fontSize: 13, width: 80 },
  reviewVal: { ...Typography.bodySemibold, fontSize: 14, textAlign: 'right' },
});
