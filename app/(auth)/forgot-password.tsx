import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/GoldButton';

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState('');

  const handleSendReset = useCallback(() => {
    if (!identifier) {
      alert('Please enter your email or phone number');
      return;
    }
    // Mock sending reset OTP
    alert('Password reset OTP sent!');
    router.push({
      pathname: '/(auth)/otp',
      params: { email: identifier, mode: 'reset_password' }
    } as any);
  }, [identifier]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.decorLine} />
          <Text style={styles.eyebrow}>Account Recovery</Text>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.sub}>Enter your email or phone number and we'll send you an OTP to reset your password.</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email or Phone</Text>
            <TextInput
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="you@example.com or +91 98765..."
              placeholderTextColor={Colors.creamFaint}
              autoCapitalize="none"
              style={styles.input}
            />
          </View>
        </View>

        <GoldButton label="Send Reset Code" onPress={handleSendReset} size="lg" fullWidth />
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
});
