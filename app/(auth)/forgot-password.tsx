import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { AuthService } from '@/services/authService';

export default function ForgotPassword() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [sent, setSent]       = useState(false);

  const handleSend = useCallback(async () => {
    const raw = email.trim();
    if (!raw) {
      setError('Please enter your email address');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
      setError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await AuthService.forgotPassword(raw);
      setSent(true);
    } catch (err: any) {
      setError(err?.data?.message ?? err?.message ?? 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.decorLine} />
          <Text style={styles.eyebrow}>Account Recovery</Text>
          <Text style={styles.title}>Forgot Password?</Text>
          {!sent ? (
            <Text style={styles.sub}>Enter your email and we'll send you a password reset link.</Text>
          ) : (
            <Text style={styles.sub}>Check your inbox for the reset link. Paste the token from the link on the next screen.</Text>
          )}
        </View>

        {!sent ? (
          <>
            <View style={styles.form}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  value={email}
                  onChangeText={t => { setEmail(t); setError(''); }}
                  placeholder="you@example.com"
                  placeholderTextColor={Colors.creamFaint}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
              </View>
            </View>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <GoldButton label="Send Reset Link" onPress={handleSend} size="lg" fullWidth loading={loading} disabled={loading} />
          </>
        ) : (
          <>
            <View style={styles.sentBox}>
              <Text style={styles.sentIcon}>✉️</Text>
              <Text style={styles.sentTitle}>Email Sent</Text>
              <Text style={styles.sentText}>
                If an account with <Text style={{ color: Colors.gold }}>{email}</Text> exists, a reset link has been sent.
              </Text>
            </View>

            <GoldButton
              label="Enter Reset Token"
              onPress={() => router.push('/(auth)/reset-password')}
              size="lg"
              fullWidth
            />

            <TouchableOpacity style={styles.retryRow} onPress={() => setSent(false)}>
              <Text style={styles.retryText}>Didn't receive it? Try again</Text>
            </TouchableOpacity>
          </>
        )}
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
  sub: { ...Typography.caption, fontSize: 14, color: Colors.creamDim, lineHeight: 22 },
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
  sentBox: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xl, padding: Spacing.lg, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  sentIcon: { fontSize: 40 },
  sentTitle: { ...Typography.bodySemibold, fontSize: 18, color: Colors.cream },
  sentText: { ...Typography.caption, fontSize: 14, color: Colors.creamDim, textAlign: 'center', lineHeight: 20 },
  retryRow: { alignItems: 'center', marginTop: Spacing.lg },
  retryText: { ...Typography.caption, fontSize: 14, color: Colors.gold },
});
