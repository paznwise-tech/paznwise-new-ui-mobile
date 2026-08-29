import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { AuthService } from '@/services/authService';
import { useUser } from '@/context/AppContext';

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function SettingRow({
  icon, label, sublabel, onPress, right,
}: {
  icon: string; label: string; sublabel?: string; onPress?: () => void; right?: React.ReactNode;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={styles.rowIcon}><Text style={{ fontSize: 18 }}>{icon}</Text></View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
      </View>
      {right ?? (onPress ? <Text style={styles.rowChevron}>›</Text> : null)}
    </TouchableOpacity>
  );
}

export default function Settings() {
  const { user, logout, switchRole, activeRole } = useUser();
  const [switching, setSwitching] = useState(false);
  const [pushEnabled, setPushEnabled]     = useState(true);
  const [emailEnabled, setEmailEnabled]   = useState(true);
  const [orderNotifs, setOrderNotifs]     = useState(true);
  const [bookingNotifs, setBookingNotifs] = useState(true);
  const [followNotifs, setFollowNotifs]   = useState(true);

  const [pwdLoading, setPwdLoading]       = useState(false);

  /**
   * The API has no change-password endpoint — only forgot-password and
   * reset-password, which work by emailed link. The screen previously
   * collected the current and new password and posted them to
   * /auth/change-password, which does not exist, so every attempt failed
   * with a network error after the user had typed their credentials.
   */
  /**
   * Role switching.
   *
   * The client is not told which roles a user actually holds, so all three
   * are offered and the server decides — its rejection names the role,
   * which is more accurate than any list guessed from profile flags.
   */
  const handleSwitchRole = useCallback(() => {
    const roles: Array<'BUYER' | 'ARTIST' | 'ORGANIZER'> = ['BUYER', 'ARTIST', 'ORGANIZER'];
    const current = String(activeRole ?? user.role ?? '').toUpperCase();

    Alert.alert('Switch role', 'Choose how you want to use Paznwise.', [
      { text: 'Cancel', style: 'cancel' },
      ...roles
        .filter(r => r !== current)
        .map(r => ({
          text: r.charAt(0) + r.slice(1).toLowerCase(),
          onPress: async () => {
            setSwitching(true);
            try {
              await switchRole(r);
              Alert.alert('Switched', `You are now using Paznwise as ${r.toLowerCase()}.`);
            } catch (e: any) {
              Alert.alert('Could not switch', e?.message ?? 'Please try again.');
            } finally {
              setSwitching(false);
            }
          },
        })),
    ]);
  }, [activeRole, user.role, switchRole]);

  const handleResetPassword = useCallback(() => {
    if (!user.email) {
      Alert.alert('No email on file', 'Add an email address to your profile to reset your password.');
      return;
    }
    Alert.alert(
      'Reset password',
      `We'll email a reset link to ${user.email}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send link',
          onPress: async () => {
            setPwdLoading(true);
            try {
              await AuthService.forgotPassword(user.email);
              Alert.alert('Check your email', 'We have sent you a link to reset your password.');
            } catch (e: any) {
              Alert.alert('Could not send link', e?.message ?? 'Please try again.');
            } finally {
              setPwdLoading(false);
            }
          },
        },
      ],
    );
  }, [user.email]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'This is permanent and cannot be undone. All your data will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.deleteAccount();
              // Goes through the context so the session state flips and the
              // root guard unmounts the authenticated stack.
              await logout();
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Failed to delete account');
            }
          },
        },
      ]
    );
  }, [logout]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  }, [logout]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <View style={styles.card}>
          <SettingRow
            icon="📲" label="Push Notifications"
            sublabel="Receive alerts on your device"
            right={<Switch value={pushEnabled} onValueChange={setPushEnabled} trackColor={{ true: Colors.gold, false: Colors.border }} thumbColor={Colors.cream} />}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="📧" label="Email Notifications"
            sublabel="Receive updates via email"
            right={<Switch value={emailEnabled} onValueChange={setEmailEnabled} trackColor={{ true: Colors.gold, false: Colors.border }} thumbColor={Colors.cream} />}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="🛍️" label="Order Updates"
            right={<Switch value={orderNotifs} onValueChange={setOrderNotifs} trackColor={{ true: Colors.gold, false: Colors.border }} thumbColor={Colors.cream} />}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="🎵" label="Booking Alerts"
            right={<Switch value={bookingNotifs} onValueChange={setBookingNotifs} trackColor={{ true: Colors.gold, false: Colors.border }} thumbColor={Colors.cream} />}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="👤" label="New Followers"
            right={<Switch value={followNotifs} onValueChange={setFollowNotifs} trackColor={{ true: Colors.gold, false: Colors.border }} thumbColor={Colors.cream} />}
          />
        </View>

        {/* Account */}
        <SectionHeader title="Account" />
        <View style={styles.card}>
          <SettingRow
            icon="🔄"
            label="Switch Role"
            sublabel={switching ? 'Switching…' : `Currently ${String(activeRole ?? 'Buyer').toLowerCase()}`}
            onPress={handleSwitchRole}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="🔒" label="Reset Password"
            sublabel={pwdLoading ? 'Sending…' : 'We email you a secure reset link'}
            onPress={handleResetPassword}
          />
        </View>

        {/* Support */}
        <SectionHeader title="Support" />
        <View style={styles.card}>
          <SettingRow icon="❓" label="Help Center" onPress={() => router.push('/help' as any)} />
          <View style={styles.rowDivider} />
          <SettingRow icon="✉️" label="Contact Us" onPress={() => router.push('/contact' as any)} />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="📄"
            label="Privacy Policy"
            onPress={() => router.push('/legal/privacy-policy' as any)}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="📜"
            label="Terms of Service"
            onPress={() => router.push('/legal/terms-conditions' as any)}
          />
        </View>

        {/* Danger zone */}
        <SectionHeader title="Account Actions" />
        <View style={styles.card}>
          <TouchableOpacity style={styles.signOutRow} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.deleteRow} onPress={handleDeleteAccount}>
            <Text style={styles.deleteText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>Paznwise v1.0.0</Text>
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
  sectionHeader: {
    ...Typography.label, fontSize: 10, color: Colors.gold,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.bgCard, marginHorizontal: Spacing.md,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  rowIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowLabel: { ...Typography.bodySemibold, fontSize: 15 },
  rowSublabel: { ...Typography.caption, fontSize: 12, marginTop: 1 },
  rowChevron: { color: Colors.creamDim, fontSize: 22 },
  rowDivider: { height: 1, backgroundColor: Colors.border, marginLeft: 68 },
  signOutRow: { padding: Spacing.md, alignItems: 'center' },
  signOutText: { ...Typography.bodySemibold, fontSize: 15, color: Colors.gold },
  deleteRow: { padding: Spacing.md, alignItems: 'center' },
  deleteText: { ...Typography.bodySemibold, fontSize: 15, color: Colors.error },
  versionText: { ...Typography.caption, fontSize: 12, textAlign: 'center', marginTop: Spacing.xl, marginBottom: Spacing.lg },
});
