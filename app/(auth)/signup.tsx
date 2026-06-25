import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/GoldButton';

export default function Signup() {
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [phone, setPhone]     = useState('');
  const [password, setPassword] = useState('');

  const handleCreateAccount = useCallback(() => {
    if (!name || !email || !password) {
      alert('Please fill out all required fields');
      return;
    }
    router.push({
      pathname: '/(auth)/otp',
      params: { name, email }
    } as any);
  }, [name, email, password]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.decorLine} />
          <Text style={styles.eyebrow}>Join Paznwise</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.sub}>Discover and collect India's finest art</Text>
        </View>

        <View style={styles.form}>
          {[
            { label: 'Full Name',     value: name,     set: setName,     placeholder: 'Amit Kumar',          keyboard: 'default' as const },
            { label: 'Email Address', value: email,    set: setEmail,    placeholder: 'amit@example.com',    keyboard: 'email-address' as const },
            { label: 'Phone Number',  value: phone,    set: setPhone,    placeholder: '+91 98765 43210',     keyboard: 'phone-pad' as const },
            { label: 'Password',      value: password, set: setPassword, placeholder: 'Min 8 characters',   keyboard: 'default' as const },
          ].map(f => (
            <View key={f.label} style={styles.fieldGroup}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                value={f.value}
                onChangeText={f.set}
                placeholder={f.placeholder}
                placeholderTextColor={Colors.creamFaint}
                keyboardType={f.keyboard}
                autoCapitalize={f.keyboard === 'default' && f.label !== 'Password' ? 'words' : 'none'}
                secureTextEntry={f.label === 'Password'}
                style={styles.input}
              />
            </View>
          ))}
        </View>

        <Text style={styles.terms}>
          By creating an account you agree to our{' '}
          <Text style={{ color: Colors.gold }}>Terms of Service</Text> and{' '}
          <Text style={{ color: Colors.gold }}>Privacy Policy</Text>
        </Text>

        <GoldButton label="Create Account" onPress={handleCreateAccount} size="lg" fullWidth />

        <View style={styles.loginRow}>
          <Text style={styles.loginPrompt}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
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
  input: {
    backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md,
    ...Typography.body, fontSize: 15, color: Colors.cream,
  },
  terms: { ...Typography.caption, fontSize: 12, lineHeight: 18, marginBottom: Spacing.xl, color: Colors.creamDim },
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: Spacing.lg },
  loginPrompt: { ...Typography.caption, fontSize: 14, color: Colors.creamDim },
  loginLink: { ...Typography.bodySemibold, fontSize: 14, color: Colors.gold },
});
