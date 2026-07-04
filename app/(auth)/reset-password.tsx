import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { AuthService } from '@/services/authService';

export default function ResetPassword() {
  const [token, setToken]                   = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPw]     = useState('');
  const [showPw, setShowPw]                 = useState(false);
  const [showConfirmPw, setShowConfirmPw]   = useState(false);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');

  const handleReset = useCallback(async () => {
    if (!token.trim()) {
      setError('Please paste the reset token from your email');
      return;
    }
    if (!password || !confirmPassword) {
      setError('Please fill out all fields');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await AuthService.resetPassword(token.trim(), password);
      router.replace('/(auth)/login');
    } catch (err: any) {
      setError(err?.data?.message ?? err?.message ?? 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token, password, confirmPassword]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.decorLine} />
          <Text style={styles.eyebrow}>Account Recovery</Text>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.sub}>Paste the token from your reset email, then choose a new password.</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Reset Token (from email)</Text>
            <TextInput
              value={token}
              onChangeText={t => { setToken(t); setError(''); }}
              placeholder="Paste token here"
              placeholderTextColor={Colors.creamFaint}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              multiline={false}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                value={password}
                onChangeText={t => { setPassword(t); setError(''); }}
                placeholder="Min 8 characters"
                placeholderTextColor={Colors.creamFaint}
                secureTextEntry={!showPw}
                style={[styles.input, { flex: 1 }]}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
                <Text style={styles.eyeText}>{showPw ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm New Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                value={confirmPassword}
                onChangeText={t => { setConfirmPw(t); setError(''); }}
                placeholder="Re-enter password"
                placeholderTextColor={Colors.creamFaint}
                secureTextEntry={!showConfirmPw}
                style={[styles.input, { flex: 1 }]}
              />
              <TouchableOpacity onPress={() => setShowConfirmPw(!showConfirmPw)} style={styles.eyeBtn}>
                <Text style={styles.eyeText}>{showConfirmPw ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <GoldButton label="Reset Password" onPress={handleReset} size="lg" fullWidth loading={loading} disabled={loading} />
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
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  eyeBtn: { padding: Spacing.sm },
  eyeText: { fontSize: 16 },
  errorText: { ...Typography.caption, fontSize: 13, color: Colors.error, marginBottom: Spacing.md, textAlign: 'center' },
});
