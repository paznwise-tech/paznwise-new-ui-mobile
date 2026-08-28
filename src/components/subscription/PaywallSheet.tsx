import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { authEvents } from '@/api/authEvents';

/**
 * Plan-limit prompt.
 *
 * Mounted once at the root and driven by the `plan-limit` event the HTTP
 * client emits on a 403 whose message matches the backend's subscription
 * wording. That means it opens wherever the user actually hit the limit —
 * creating a post, listing a product — rather than every screen having to
 * recognise the error itself. Until this existed the 403 surfaced as a raw
 * "limit exceeded" error with no way to act on it.
 */
export function PaywallSheet() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(
    () =>
      authEvents.on('plan-limit', msg => {
        setMessage(msg ?? 'You have reached the limit for your current plan.');
      }),
    [],
  );

  const close = () => setMessage(null);

  return (
    <Modal visible={!!message} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={close} activeOpacity={1} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.icon}>✦</Text>
          <Text style={styles.title}>You've hit your plan limit</Text>
          {/* The server's own wording names the exact quota — it is more
              specific than anything that could be written here. */}
          <Text style={styles.body}>{message}</Text>

          <TouchableOpacity
            style={styles.primary}
            onPress={() => {
              close();
              router.push('/subscription' as any);
            }}
          >
            <Text style={styles.primaryText}>See plans</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={close} style={styles.secondary}>
            <Text style={styles.secondaryText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    padding: Spacing.lg, paddingBottom: Spacing.xxl, alignItems: 'center',
    borderTopWidth: 1, borderColor: Colors.border,
  },
  grabber: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.border, marginBottom: Spacing.lg,
  },
  icon: { fontSize: 32, color: Colors.gold },
  title: { ...Typography.heading, fontSize: 20, marginTop: Spacing.sm, textAlign: 'center' },
  body: {
    ...Typography.body, fontSize: 14, color: Colors.creamDim,
    textAlign: 'center', marginTop: Spacing.sm, lineHeight: 20,
  },
  primary: {
    backgroundColor: Colors.gold, borderRadius: Radius.md,
    paddingVertical: Spacing.md, alignItems: 'center',
    alignSelf: 'stretch', marginTop: Spacing.lg,
  },
  primaryText: { ...Typography.bodyBold, fontSize: 15, color: Colors.bg },
  secondary: { paddingVertical: Spacing.md },
  secondaryText: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
});
