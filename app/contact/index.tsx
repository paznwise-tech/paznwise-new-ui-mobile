import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { ContactService } from '@/services/contactService';

const SUBJECTS = ['General Inquiry', 'Order Issue', 'Booking Problem', 'Payment Issue', 'Report Content', 'Other'];

export default function ContactUs() {
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) { Alert.alert('Required', 'Please enter your name'); return; }
    if (!email.trim() || !email.includes('@')) { Alert.alert('Required', 'Please enter a valid email'); return; }
    if (!subject) { Alert.alert('Required', 'Please select a subject'); return; }
    if (!message.trim() || message.trim().length < 20) {
      Alert.alert('Required', 'Message must be at least 20 characters');
      return;
    }

    setLoading(true);
    try {
      await ContactService.submit({ name, email, subject, message });
      setSent(true);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [name, email, subject, message]);

  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }}>
        <Text style={{ fontSize: 64 }}>✉️</Text>
        <Text style={[styles.title, { marginTop: Spacing.lg, textAlign: 'center' }]}>
          Message Sent!
        </Text>
        <Text style={[styles.subtext, { textAlign: 'center', marginTop: Spacing.sm }]}>
          We'll get back to you within 24 hours at {email}
        </Text>
        <TouchableOpacity style={{ marginTop: Spacing.xl }} onPress={() => router.back()}>
          <Text style={{ color: Colors.gold, fontSize: 15 }}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Contact Us</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>We're here to help</Text>
          <Text style={styles.infoText}>
            Our support team responds within 24 hours on business days.
          </Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoItem}>📧 support@paznwise.com</Text>
            <Text style={styles.infoItem}>🕐 Mon–Sat, 9 AM – 6 PM</Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.field}>
          <Text style={styles.label}>Your Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor={Colors.creamFaint}
            value={name} onChangeText={setName}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={Colors.creamFaint}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email} onChangeText={setEmail}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Subject</Text>
          <View style={styles.subjectGrid}>
            {SUBJECTS.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.subjectChip, subject === s && styles.subjectChipActive]}
                onPress={() => setSubject(s)}
              >
                <Text style={[styles.subjectText, subject === s && styles.subjectTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Message</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Describe your issue in detail…"
            placeholderTextColor={Colors.creamFaint}
            multiline numberOfLines={6}
            textAlignVertical="top"
            value={message} onChangeText={setMessage}
          />
          <Text style={styles.charCount}>{message.length} characters</Text>
        </View>

        <GoldButton
          label={loading ? 'Sending…' : 'Send Message'}
          onPress={handleSubmit}
          size="lg"
          fullWidth
          disabled={loading}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  backIcon: { color: Colors.gold, fontSize: 22 },
  title: { ...Typography.display, fontSize: 22 },
  content: { padding: Spacing.md, paddingBottom: 100, gap: Spacing.md },
  infoCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.borderGold, padding: Spacing.md, gap: Spacing.sm,
  },
  infoTitle: { ...Typography.heading, fontSize: 18 },
  infoText: { ...Typography.body, fontSize: 14, color: Colors.creamDim, lineHeight: 22 },
  infoRow: { gap: 4 },
  infoItem: { ...Typography.caption, fontSize: 13 },
  field: { gap: Spacing.xs },
  label: { ...Typography.label, fontSize: 10 },
  input: {
    backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md,
    ...Typography.body, fontSize: 15, color: Colors.cream,
  },
  textarea: { height: 130, textAlignVertical: 'top' },
  charCount: { ...Typography.caption, fontSize: 11, textAlign: 'right' },
  subtext: { ...Typography.body, fontSize: 15, color: Colors.creamDim, lineHeight: 24 },
  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  subjectChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 7,
    borderRadius: Radius.full, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.bgCard,
  },
  subjectChipActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '22' },
  subjectText: { ...Typography.caption, fontSize: 12, color: Colors.creamDim },
  subjectTextActive: { color: Colors.gold },
});
