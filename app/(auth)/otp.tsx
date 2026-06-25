import { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/GoldButton';
import { useUser } from '@/context/AppContext';

export default function OTP() {
  const { name, email } = useLocalSearchParams<{ name: string; email: string }>();
  const { login } = useUser();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const refs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, idx: number) => {
    const next = [...otp];
    next[idx] = text;
    setOtp(next);
    if (text && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleVerify = useCallback(() => {
    login(name || 'Amit Kumar', email || 'amit@example.com');
    alert('Account created and verified successfully!');
    router.replace('/(tabs)');
  }, [name, email, login]);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.decorLine} />
        <Text style={styles.eyebrow}>Verification</Text>
        <Text style={styles.title}>Enter OTP</Text>
        <Text style={styles.sub}>We sent a 6-digit code to your phone/email</Text>
      </View>

      <View style={styles.otpRow}>
        {otp.map((digit, i) => (
          <TextInput
            key={i}
            ref={r => { refs.current[i] = r; }}
            value={digit}
            onChangeText={t => handleChange(t.slice(-1), i)}
            keyboardType="number-pad"
            maxLength={1}
            style={[styles.otpInput, digit ? styles.otpFilled : {}]}
            selectionColor={Colors.gold}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.resend}>
        <Text style={styles.resendText}>Didn't receive? <Text style={{ color: Colors.gold }}>Resend OTP</Text></Text>
      </TouchableOpacity>

      <GoldButton
        label="Verify & Continue"
        onPress={handleVerify}
        size="lg"
        fullWidth
        disabled={otp.some(d => !d)}
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
  sub: { ...Typography.caption, fontSize: 14, color: Colors.creamDim },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.xl, justifyContent: 'center' },
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
  resend: { alignItems: 'center', marginBottom: Spacing.xl },
  resendText: { ...Typography.caption, fontSize: 14, color: Colors.creamDim },
});
