import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { useUser } from '@/context/AppContext';
import { AuthService } from '@/services/authService';
import { AuthStorage } from '@/services/authStorage';

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

export default function OTP() {
  const { identifier, mode, devOtp } = useLocalSearchParams<{ identifier?: string; mode?: string; devOtp?: string }>();
  const { loginWithProfile, loadProfile } = useUser();
  const [otp, setOtp] = useState(() =>
    devOtp && devOtp.length === 6 ? devOtp.split('') : ['', '', '', '', '', '']
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  // A cooldown stops repeat taps burning through the server's OTP rate
  // limit, which then rejects the legitimate retry too.
  const [cooldown, setCooldown] = useState(0);
  const refs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  /**
   * Resend.
   *
   * The button previously had no onPress at all, so "Didn't receive?
   * Resend OTP" did nothing — anyone whose first code went missing was
   * stuck.
   */
  const handleResend = useCallback(async () => {
    if (!identifier || resending || cooldown > 0) return;
    setResending(true);
    setError('');
    try {
      await AuthService.resendOtp(identifier);
      setOtp(['', '', '', '', '', '']);
      refs.current[0]?.focus();
      setCooldown(30);
    } catch (e: any) {
      setError(e?.message ?? 'Could not resend the code. Please try again.');
    } finally {
      setResending(false);
    }
  }, [identifier, resending, cooldown]);

  const handleChange = (text: string, idx: number) => {
    const next = [...otp];
    next[idx] = text;
    setOtp(next);
    setError('');
    if (text && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleBackspace = (key: string, idx: number) => {
    if (key === 'Backspace' && !otp[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = useCallback(async () => {
    const otpCode = otp.join('');
    if (otpCode.length < 6) return;

    setLoading(true);
    setError('');
    try {
      const result = await AuthService.verifyOtp(identifier ?? '', otpCode);

      if (result.isNewUser) {
        // PATH B — new user: go to registration form
        router.replace({
          pathname: '/(auth)/signup',
          params: { identifier, registrationToken: result.registrationToken },
        } as any);
      } else {
        // PATH A — existing user: store tokens + log in
        await AuthStorage.setAccessToken(result.accessToken);
        if (result.refreshToken) await AuthStorage.setRefreshToken(result.refreshToken);
        loginWithProfile(mapApiUser(result.user));
        loadProfile();
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setError(err?.data?.message ?? err?.message ?? 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [otp, identifier, mode, loginWithProfile]);

  const eyebrow = 'Verification';
  const maskedContact = identifier
    ? `${'*'.repeat(Math.max(0, identifier.length - 4))}${identifier.slice(-4)}`
    : 'your phone number';

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.decorLine} />
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>Enter OTP</Text>
        <Text style={styles.sub}>
          We sent a 6-digit code to{'\n'}
          <Text style={{ color: Colors.gold }}>{maskedContact}</Text>
        </Text>
      </View>

      {!!devOtp && (
        <View style={styles.devBanner}>
          <Text style={styles.devBannerText}>DEV — OTP: {devOtp}</Text>
        </View>
      )}

      <View style={styles.otpRow}>
        {otp.map((digit, i) => (
          <TextInput
            key={i}
            ref={r => { refs.current[i] = r; }}
            value={digit}
            onChangeText={t => handleChange(t.slice(-1), i)}
            onKeyPress={({ nativeEvent }) => handleBackspace(nativeEvent.key, i)}
            keyboardType="number-pad"
            maxLength={1}
            style={[styles.otpInput, digit ? styles.otpFilled : {}]}
            selectionColor={Colors.gold}
          />
        ))}
      </View>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={styles.resend}
        onPress={handleResend}
        disabled={resending || cooldown > 0}
      >
        <Text style={styles.resendText}>
          Didn't receive?{' '}
          <Text style={{ color: cooldown > 0 ? Colors.creamFaint : Colors.gold }}>
            {resending
              ? 'Sending…'
              : cooldown > 0
                ? `Resend in ${cooldown}s`
                : 'Resend OTP'}
          </Text>
        </Text>
      </TouchableOpacity>

      <GoldButton
        label="Verify & Continue"
        onPress={handleVerify}
        size="lg"
        fullWidth
        loading={loading}
        disabled={otp.some(d => !d) || loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, padding: Spacing.lg, paddingTop: 60 },
  back: { marginBottom: Spacing.xl },
  backIcon: { color: Colors.gold, fontSize: 22 },
  header: { marginBottom: Spacing.xxl },
  decorLine: { width: 40, height: 2, backgroundColor: Colors.gold, marginBottom: Spacing.md },
  eyebrow: { ...Typography.label, marginBottom: Spacing.xs },
  title: { ...Typography.display, fontSize: 36, marginBottom: Spacing.sm },
  sub: { ...Typography.caption, fontSize: 14, color: Colors.creamDim, lineHeight: 22 },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.md, justifyContent: 'center' },
  otpInput: {
    width: 48, height: 56,
    backgroundColor: Colors.bgCard,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md,
    textAlign: 'center',
    ...Typography.display,
    fontSize: 22,
    color: Colors.cream,
  },
  otpFilled: { borderColor: Colors.gold },
  errorText: { ...Typography.caption, fontSize: 13, color: Colors.error, textAlign: 'center', marginBottom: Spacing.md },
  resend: { alignItems: 'center', marginBottom: Spacing.xl },
  resendText: { ...Typography.caption, fontSize: 14, color: Colors.creamDim },
  devBanner: {
    backgroundColor: '#1a3a1a',
    borderWidth: 1,
    borderColor: '#4caf50',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  devBannerText: { ...Typography.bodySemibold, fontSize: 13, color: '#4caf50' },
});
