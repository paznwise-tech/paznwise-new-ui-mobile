import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/GoldButton';
import { useUser } from '@/context/AppContext';

export default function Login() {
  const { login } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const handleSignIn = useCallback(() => {
    if (!email) {
      alert('Please enter your email address');
      return;
    }
    // Mock user login
    login('Amit Kumar', email);
    alert('Logged in successfully!');
    router.replace('/(tabs)');
  }, [email, login]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.decorLine} />
          <Text style={styles.eyebrow}>Welcome back</Text>
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.sub}>Access your collection, bookings & more</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={Colors.creamFaint}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                value={password}
                onChangeText={setPassword}
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

          <TouchableOpacity style={styles.forgotRow}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        <GoldButton label="Sign In" onPress={handleSignIn} size="lg" fullWidth />

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social */}
        <View style={styles.social}>
          {['Google', 'Phone'].map(s => (
            <TouchableOpacity key={s} style={styles.socialBtn}>
              <Text style={styles.socialText}>{s === 'Google' ? '🔍' : '📱'} {s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.signupRow}>
          <Text style={styles.signupPrompt}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
            <Text style={styles.signupLink}>Create one</Text>
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
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  eyeBtn: { padding: Spacing.sm },
  eyeText: { fontSize: 16 },
  forgotRow: { alignItems: 'flex-end' },
  forgotText: { ...Typography.caption, fontSize: 13, color: Colors.gold },
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginVertical: Spacing.lg },
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
