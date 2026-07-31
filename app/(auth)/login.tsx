import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { useUser } from '@/context/AppContext';
import { AuthService } from '@/services/authService';
import { AuthStorage } from '@/services/authStorage';

WebBrowser.maybeCompleteAuthSession();

type Panel = 'phone' | 'email';

function mapApiUser(user: any) {
  return {
    id: user.id ?? '',
    name: user.name ?? user.phone ?? user.email ?? 'User',
    username: user.username ?? '',
    email: user.email ?? '',
    avatar: user.avatar ?? '',
    bio: user.bio ?? '',
    isVerified: user.isVerified ?? false,
    isArtist: user.isArtist ?? false,
    isPerformer: user.isPerformer ?? false,
    location: user.location,
    followersCount: user.followersCount ?? 0,
    followingCount: user.followingCount ?? 0,
    postsCount: user.postsCount ?? 0,
  };
}

export default function Login() {
  const { loginWithProfile, loadProfile } = useUser();
  const [panel, setPanel] = useState<Panel>('phone');

  // ── Phone OTP state ─────────────────────────────────────
  const [phone, setPhone] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  // ── Email / Password state ───────────────────────────────
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  // ── Google OAuth state ───────────────────────────────────
  const [googleLoading, setGoogleLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '1029384756-preview.apps.googleusercontent.com',
  });

  const handleGoogleAuthSuccess = useCallback(async (token: string) => {
    setGoogleLoading(true);
    try {
      let userInfo: any = {};
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        });
        userInfo = await userInfoRes.json();
      } catch (e) {
        console.warn('Failed to fetch google userinfo:', e);
      }

      const { user: apiUser, accessToken, refreshToken } = await AuthService.socialAuth({
        provider: 'google',
        token,
        name: userInfo.name,
        email: userInfo.email,
      });

      await AuthStorage.setAccessToken(accessToken);
      if (refreshToken) await AuthStorage.setRefreshToken(refreshToken);
      loginWithProfile(mapApiUser(apiUser));
      loadProfile();
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Google Sign-In', err?.data?.message || err?.message || 'Google Authentication completed');
    } finally {
      setGoogleLoading(false);
    }
  }, [loginWithProfile, loadProfile]);

  useEffect(() => {
    if (response?.type === 'success' && response.authentication?.accessToken) {
      handleGoogleAuthSuccess(response.authentication.accessToken);
    }
  }, [response, handleGoogleAuthSuccess]);

  const handleGoogleSignIn = useCallback(async () => {
    if (googleLoading) return;
    if (request) {
      promptAsync();
    } else {
      handleGoogleAuthSuccess('demo_google_access_token');
    }
  }, [request, promptAsync, googleLoading, handleGoogleAuthSuccess]);

  const switchPanel = (p: Panel) => {
    setPanel(p);
    setPhoneError('');
    setEmailError('');
  };

  // ── Send OTP ─────────────────────────────────────────────
  const handleSendOtp = useCallback(async () => {
    const raw = phone.trim();
    if (!raw) {
      setPhoneError('Please enter your phone number');
      return;
    }
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 10) {
      setPhoneError('Please enter a valid 10-digit phone number');
      return;
    }
    const formattedPhone = raw.startsWith('+') ? raw.replace(/\s/g, '') : `+91${digits.slice(-10)}`;
    setPhoneLoading(true);
    setPhoneError('');
    try {
      const { otp: devOtp } = await AuthService.sendOtp(formattedPhone);
      router.push({
        pathname: '/(auth)/otp',
        params: { identifier: formattedPhone, mode: 'phone', ...(devOtp ? { devOtp } : {}) },
      } as any);
    } catch (err: any) {
      setPhoneError(err?.data?.message ?? err?.message ?? 'Failed to send OTP. Please try again.');
    } finally {
      setPhoneLoading(false);
    }
  }, [phone]);

  // ── Email / Password login ───────────────────────────────
  const handleEmailSignIn = useCallback(async () => {
    if (!identifier.trim()) {
      setEmailError('Please enter your email, phone, or username');
      return;
    }
    if (!password) {
      setEmailError('Please enter your password');
      return;
    }
    setEmailLoading(true);
    setEmailError('');
    try {
      const { user: apiUser, accessToken, refreshToken } = await AuthService.login(identifier.trim(), password);
      await AuthStorage.setAccessToken(accessToken);
      if (refreshToken) await AuthStorage.setRefreshToken(refreshToken);
      loginWithProfile(mapApiUser(apiUser));
      loadProfile();
      router.replace('/(tabs)');
    } catch (err: any) {
      setEmailError(err?.data?.message ?? err?.message ?? 'Login failed. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  }, [identifier, password, loginWithProfile]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.decorLine} />
          <Text style={styles.eyebrow}>Welcome back</Text>
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.sub}>Access your collection, bookings & more</Text>
        </View>

        {/* ── Tab Toggle ───────────────────────────────────── */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, panel === 'phone' && styles.tabActive]}
            onPress={() => switchPanel('phone')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, panel === 'phone' && styles.tabTextActive]}>
              Phone OTP
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, panel === 'email' && styles.tabActive]}
            onPress={() => switchPanel('email')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, panel === 'email' && styles.tabTextActive]}>
              Email / Password
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Phone OTP Panel ──────────────────────────────── */}
        {panel === 'phone' && (
          <View style={styles.panel}>
            <Text style={styles.panelHint}>
              New here? We'll create your account automatically.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                value={phone}
                onChangeText={t => { setPhone(t); setPhoneError(''); }}
                placeholder="+91 98765 43210"
                placeholderTextColor={Colors.creamFaint}
                autoCapitalize="none"
                keyboardType="phone-pad"
                style={styles.input}
              />
            </View>

            {!!phoneError && <Text style={styles.errorText}>{phoneError}</Text>}

            <GoldButton
              label="Send OTP"
              onPress={handleSendOtp}
              size="lg"
              fullWidth
              loading={phoneLoading}
              disabled={phoneLoading}
            />
          </View>
        )}

        {/* ── Email / Password Panel ───────────────────────── */}
        {panel === 'email' && (
          <View style={styles.panel}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email, Phone, or Username</Text>
              <TextInput
                value={identifier}
                onChangeText={t => { setIdentifier(t); setEmailError(''); }}
                placeholder="Enter email, phone, or username"
                placeholderTextColor={Colors.creamFaint}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputRow}>
                <TextInput
                  value={password}
                  onChangeText={t => { setPassword(t); setEmailError(''); }}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.creamFaint}
                  secureTextEntry={!showPw}
                  style={[styles.input, { flex: 1 }]}
                />
                <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
                  <Text style={styles.eyeText}>{showPw ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.forgotRow} onPress={() => router.push('/(auth)/forgot-password')}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}

            <GoldButton
              label="Sign In"
              onPress={handleEmailSignIn}
              size="lg"
              fullWidth
              loading={emailLoading}
              disabled={emailLoading}
            />
          </View>
        )}

        {/* ── Social ───────────────────────────────────────── */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.social}>
          <TouchableOpacity
            style={styles.socialBtn}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color={Colors.gold} />
            ) : (
              <Text style={styles.socialText}>🔍 Google</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialBtn}>
            <Text style={styles.socialText}>📘 Facebook</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialBtn}>
            <Text style={styles.socialText}>🍎 Apple</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.signupRow}>
          <Text style={styles.signupPrompt}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => switchPanel('phone')}>
            <Text style={styles.signupLink}>Use phone OTP</Text>
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

  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: 4,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: Colors.gold },
  tabText: { ...Typography.bodySemibold, fontSize: 13, color: Colors.creamFaint },
  tabTextActive: { color: Colors.bg },

  panel: { gap: Spacing.md, marginBottom: Spacing.xl },
  panelHint: {
    ...Typography.caption,
    fontSize: 13,
    color: Colors.creamDim,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
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
  forgotRow: { alignItems: 'flex-end' },
  forgotText: { ...Typography.caption, fontSize: 13, color: Colors.gold },
  errorText: { ...Typography.caption, fontSize: 13, color: Colors.error, textAlign: 'center' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { ...Typography.caption, fontSize: 12 },
  social: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  socialBtn: {
    flex: 1, height: 48,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  socialText: { ...Typography.bodySemibold, fontSize: 14, color: Colors.cream },
  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  signupPrompt: { ...Typography.caption, fontSize: 14, color: Colors.creamDim },
  signupLink: { ...Typography.bodySemibold, fontSize: 14, color: Colors.gold },
});
