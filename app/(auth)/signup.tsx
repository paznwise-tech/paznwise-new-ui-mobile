import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { useUser } from '@/context/AppContext';
import { AuthService } from '@/services/authService';
import { AuthStorage } from '@/services/authStorage';

export default function Signup() {
  const { identifier, registrationToken } = useLocalSearchParams<{
    identifier?: string;
    registrationToken?: string;
  }>();
  const { loginWithProfile } = useUser();

  const [name, setName]                   = useState('');
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPw]   = useState('');
  const [showPw, setShowPw]               = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  const handleCreateAccount = useCallback(async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill out all required fields');
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
    if (!registrationToken) {
      router.replace('/(auth)/login');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { user: apiUser, accessToken, refreshToken } = await AuthService.register(
        name.trim(),
        email.trim(),
        password,
        confirmPassword,
        registrationToken,
      );
      await AuthStorage.setAccessToken(accessToken);
      if (refreshToken) await AuthStorage.setRefreshToken(refreshToken);
      loginWithProfile({
        id: apiUser.id ?? '',
        name: apiUser.name ?? name.trim(),
        username: apiUser.username ?? '',
        email: apiUser.email ?? email.trim(),
        avatar: apiUser.avatar ?? '',
        bio: apiUser.bio ?? '',
        isVerified: apiUser.isVerified ?? false,
        isArtist: apiUser.isArtist ?? false,
        isPerformer: apiUser.isPerformer ?? false,
        location: apiUser.location,
        followersCount: apiUser.followersCount ?? 0,
        followingCount: apiUser.followingCount ?? 0,
        postsCount: apiUser.postsCount ?? 0,
      });
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err?.data?.message ?? err?.message ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [name, email, password, confirmPassword, registrationToken, loginWithProfile]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.decorLine} />
          <Text style={styles.eyebrow}>Almost there</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.sub}>
            {identifier ? `Verified: ${identifier}` : 'Complete your profile to get started'}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              value={name}
              onChangeText={t => { setName(t); setError(''); }}
              placeholder="Amit Kumar"
              placeholderTextColor={Colors.creamFaint}
              autoCapitalize="words"
              style={styles.input}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address <Text style={styles.required}>*</Text></Text>
            <TextInput
              value={email}
              onChangeText={t => { setEmail(t); setError(''); }}
              placeholder="amit@example.com"
              placeholderTextColor={Colors.creamFaint}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password <Text style={styles.required}>*</Text></Text>
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
            <Text style={styles.label}>Confirm Password <Text style={styles.required}>*</Text></Text>
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

        <Text style={styles.terms}>
          By creating an account you agree to our{' '}
          <Text style={{ color: Colors.gold }}>Terms of Service</Text> and{' '}
          <Text style={{ color: Colors.gold }}>Privacy Policy</Text>
        </Text>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <GoldButton
          label="Create Account"
          onPress={handleCreateAccount}
          size="lg"
          fullWidth
          loading={loading}
          disabled={loading}
        />

        <View style={styles.loginRow}>
          <Text style={styles.loginPrompt}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.loginLink}>Sign in</Text>
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
  form: { gap: Spacing.md, marginBottom: Spacing.md },
  fieldGroup: { gap: Spacing.xs },
  label: { ...Typography.label, fontSize: 10, color: Colors.creamDim },
  required: { color: Colors.gold },
  input: {
    backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md,
    ...Typography.body, fontSize: 15, color: Colors.cream,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  eyeBtn: { padding: Spacing.sm },
  eyeText: { fontSize: 16 },
  terms: { ...Typography.caption, fontSize: 12, lineHeight: 18, marginBottom: Spacing.md, color: Colors.creamDim },
  errorText: { ...Typography.caption, fontSize: 13, color: Colors.error, marginBottom: Spacing.md, textAlign: 'center' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: Spacing.lg },
  loginPrompt: { ...Typography.caption, fontSize: 14, color: Colors.creamDim },
  loginLink: { ...Typography.bodySemibold, fontSize: 14, color: Colors.gold },
});
