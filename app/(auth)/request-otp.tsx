import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { AuthService } from '@/services/authService';

export default function RequestOTP() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = useCallback(async () => {
    const raw = identifier.trim();
    if (!raw) {
      setError('Please enter your phone number');
      return;
    }
    const digits = raw.replace(/\D/g, '');
    // Exactly 10. `slice(-10)` below silently drops leading digits, so a
    // longer number would be sent as a different one than was typed.
    if (digits.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    const formattedPhone = raw.startsWith('+') ? raw.replace(/\s/g, '') : `+91${digits.slice(-10)}`;
    setLoading(true);
    setError('');
    try {
      const { otp: devOtp } = await AuthService.sendOtp(formattedPhone);
      router.push({
        pathname: '/(auth)/otp',
        params: { identifier: formattedPhone, mode: 'login', ...(devOtp ? { devOtp } : {}) },
      } as any);
    } catch (err: any) {
      setError(err?.data?.message ?? err?.message ?? 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [identifier]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.decorLine} />
          <Text style={styles.eyebrow}>Login Verification</Text>
          <Text style={styles.title}>Sign In with OTP</Text>
          <Text style={styles.sub}>Enter your phone number to receive a one-time password</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              value={identifier}
              onChangeText={t => { setIdentifier(t); setError(''); }}
              placeholder="+91 98765 43210"
              placeholderTextColor={Colors.creamFaint}
              autoCapitalize="none"
              keyboardType="phone-pad"
              maxLength={10}
              style={styles.input}
            />
          </View>
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <GoldButton label="Send OTP" onPress={handleSendOTP} size="lg" fullWidth loading={loading} disabled={loading} />

        <View style={styles.loginRow}>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginLink}>Use password instead</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingTop: 60, paddingBottom: 40 },
  back: { marginBottom: Spacing.xl },
  backIcon: { color: Colors.gold, fontSize: 22 },
  header: { marginBottom: Spacing.xl },
  decorLine: { width: 40, height: 2, backgroundColor: Colors.gold, marginBottom: Spacing.md },
  eyebrow: { ...Typography.label, marginBottom: Spacing.xs },
  title: { ...Typography.display, fontSize: 36, marginBottom: Spacing.sm },
  sub: { ...Typography.caption, fontSize: 14, color: Colors.creamDim },
  form: { gap: Spacing.md, marginBottom: Spacing.xl },
  fieldGroup: { gap: Spacing.xs },
  label: { ...Typography.label, fontSize: 10, color: Colors.creamDim },
  input: {
    backgroundColor: Colors.bgInput,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Typography.body,
    fontSize: 15,
    color: Colors.cream,
  },
  errorText: { ...Typography.caption, fontSize: 13, color: Colors.error, marginBottom: Spacing.md, textAlign: 'center' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: Spacing.xl },
  loginLink: { ...Typography.bodySemibold, fontSize: 14, color: Colors.gold },
});
