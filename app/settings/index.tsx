import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { AuthService } from '@/services/authService';
import { AuthStorage } from '@/services/authStorage';

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
  const [pushEnabled, setPushEnabled]     = useState(true);
  const [emailEnabled, setEmailEnabled]   = useState(true);
  const [orderNotifs, setOrderNotifs]     = useState(true);
  const [bookingNotifs, setBookingNotifs] = useState(true);
  const [followNotifs, setFollowNotifs]   = useState(true);

  const [changingPwd, setChangingPwd]     = useState(false);
  const [currentPwd, setCurrentPwd]       = useState('');
  const [newPwd, setNewPwd]               = useState('');
  const [confirmPwd, setConfirmPwd]       = useState('');
  const [pwdLoading, setPwdLoading]       = useState(false);

  const handleChangePassword = useCallback(async () => {
    if (!currentPwd || !newPwd) { Alert.alert('Error', 'Please fill in all fields'); return; }
    if (newPwd !== confirmPwd) { Alert.alert('Error', 'New passwords do not match'); return; }
    if (newPwd.length < 8) { Alert.alert('Error', 'Password must be at least 8 characters'); return; }
    setPwdLoading(true);
    try {
      await AuthService.changePassword(currentPwd, newPwd);
      Alert.alert('Success', 'Password changed successfully');
      setChangingPwd(false); setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to change password');
    } finally {
      setPwdLoading(false);
    }
  }, [currentPwd, newPwd, confirmPwd]);

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
              await AuthStorage.clearTokens();
              router.replace('/(auth)' as any);
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Failed to delete account');
            }
          },
        },
      ]
    );
  }, []);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await AuthStorage.clearTokens();
          router.replace('/(auth)' as any);
        },
      },
    ]);
  }, []);

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
            icon="🔒" label="Change Password"
            sublabel="Update your login credentials"
            onPress={() => setChangingPwd(v => !v)}
          />
          {changingPwd && (
            <View style={styles.pwdForm}>
              <TextInput
                style={styles.pwdInput}
                placeholder="Current password"
                placeholderTextColor={Colors.creamFaint}
                secureTextEntry value={currentPwd}
                onChangeText={setCurrentPwd}
              />
              <TextInput
                style={styles.pwdInput}
                placeholder="New password"
                placeholderTextColor={Colors.creamFaint}
                secureTextEntry value={newPwd}
                onChangeText={setNewPwd}
              />
              <TextInput
                style={styles.pwdInput}
                placeholder="Confirm new password"
                placeholderTextColor={Colors.creamFaint}
                secureTextEntry value={confirmPwd}
                onChangeText={setConfirmPwd}
              />
              <TouchableOpacity
                style={styles.pwdBtn}
                onPress={handleChangePassword}
                disabled={pwdLoading}
              >
                {pwdLoading
                  ? <ActivityIndicator color={Colors.bg} size="small" />
                  : <Text style={styles.pwdBtnText}>Update Password</Text>
                }
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Support */}
        <SectionHeader title="Support" />
        <View style={styles.card}>
          <SettingRow icon="❓" label="Help Center" onPress={() => router.push('/help' as any)} />
          <View style={styles.rowDivider} />
          <SettingRow icon="✉️" label="Contact Us" onPress={() => router.push('/contact' as any)} />
          <View style={styles.rowDivider} />
          <SettingRow icon="📄" label="Privacy Policy" onPress={() => {}} />
          <View style={styles.rowDivider} />
          <SettingRow icon="📜" label="Terms of Service" onPress={() => {}} />
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
  pwdForm: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: Spacing.sm },
  pwdInput: {
    backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md, ...Typography.body, fontSize: 14, color: Colors.cream,
  },
  pwdBtn: {
    backgroundColor: Colors.gold, borderRadius: Radius.full,
    padding: Spacing.md, alignItems: 'center',
  },
  pwdBtnText: { ...Typography.bodyBold, fontSize: 14, color: Colors.bg },
  signOutRow: { padding: Spacing.md, alignItems: 'center' },
  signOutText: { ...Typography.bodySemibold, fontSize: 15, color: Colors.gold },
  deleteRow: { padding: Spacing.md, alignItems: 'center' },
  deleteText: { ...Typography.bodySemibold, fontSize: 15, color: Colors.error },
  versionText: { ...Typography.caption, fontSize: 12, textAlign: 'center', marginTop: Spacing.xl, marginBottom: Spacing.lg },
});
