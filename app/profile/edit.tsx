import { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { FullPhotoModal } from '@/components/ui/FullPhotoModal';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { useUser } from '@/context/AppContext';
import { UserService } from '@/services/userService';
import { useCities } from '@/hooks/useTaxonomy';

const ROLES = ['ARTIST', 'BUYER', 'ORGANIZER'] as const;
type Role = typeof ROLES[number];

const ROLE_LABELS: Record<Role, string> = {
  ARTIST: 'Artist',
  BUYER: 'Buyer',
  ORGANIZER: 'Organizer',
};

export default function EditProfile() {
  const { user, updateUserProfile, logout } = useUser();

  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio);
  const [role, setRole] = useState<Role | ''>((user.role as Role) || '');
  // Accepted by PUT /user/profile all along, but the form never offered them.
  const [phone, setPhone] = useState(user.phone ?? '');
  const [cityId, setCityId] = useState(user.cityId ?? '');
  const [citySearch, setCitySearch] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const { data: cities = [] } = useCities();
  const cityName = cities.find(c => c.id === cityId)?.name ?? user.location ?? '';

  /** Matches first, capped — there are 249 cities. */
  const visibleCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    const matches = q ? cities.filter(c => c.name.toLowerCase().includes(q)) : cities;
    return matches.slice(0, 30);
  }, [cities, citySearch]);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [photoVisible, setPhotoVisible] = useState(false);
  const [avatarMime, setAvatarMime] = useState<string>('image/jpeg');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      setAvatarMime(result.assets[0].mimeType ?? 'image/jpeg');
    }
  }, []);

  const handleSave = useCallback(async () => {
    // Mirrors the server's rules so a bad value is caught before the request.
    const digits = phone.replace(/\D/g, '');
    if (phone.trim() && digits.length !== 10) {
      setError('Please enter a 10-digit phone number, or leave it blank.');
      return;
    }
    if (password && password.length < 8) {
      setError('A new password must be at least 8 characters.');
      return;
    }
    if (password && password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await UserService.updateProfile({
        name,
        username,
        bio,
        phone,
        preferredCityId: cityId,
        ...(password ? { password } : {}),
        ...(role ? { role } : {}),
        ...(avatarUri ? { avatarUri, avatarMimeType: avatarMime } : {}),
      });
      updateUserProfile(updated);
      router.back();
    } catch (err: any) {
      setError(err?.data?.message ?? err?.message ?? 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }, [name, username, bio, role, phone, cityId, password, confirm, avatarUri, avatarMime, updateUserProfile]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await UserService.deleteMyProfile();
          } catch {}
          // The root guard handles the redirect once the session flips.
          await logout();
        } },
      ]
    );
  }, [logout]);

  const displayAvatar = avatarUri ?? user.avatar;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Avatar picker */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={pickImage} onLongPress={() => setPhotoVisible(true)} delayLongPress={300} activeOpacity={0.8}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>
                  {user.name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <View style={styles.editAvatarBtn}>
              <Text style={styles.editAvatarIcon}>✎</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change · Hold to view</Text>
          <FullPhotoModal uri={displayAvatar ?? undefined} visible={photoVisible} onClose={() => setPhotoVisible(false)} />
        </View>

        <View style={styles.form}>
          {[
            { label: 'Name', value: name, set: setName, multiline: false },
            { label: 'Username', value: username, set: setUsername, multiline: false },
            { label: 'Bio', value: bio, set: setBio, multiline: true },
          ].map(f => (
            <View key={f.label} style={styles.fieldGroup}>
              <Text style={styles.label}>{f.label.toUpperCase()}</Text>
              <TextInput
                value={f.value}
                onChangeText={f.set}
                multiline={f.multiline}
                style={[styles.input, f.multiline && { height: 100, textAlignVertical: 'top' }]}
                placeholderTextColor={Colors.creamFaint}
              />
            </View>
          ))}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>PHONE</Text>
            <TextInput
              value={phone}
              onChangeText={t => setPhone(t.replace(/\D/g, '').slice(0, 10))}
              keyboardType="phone-pad"
              maxLength={10}
              placeholder="10-digit mobile number"
              placeholderTextColor={Colors.creamFaint}
              style={styles.input}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>CITY</Text>
            <TextInput
              value={citySearch}
              onChangeText={setCitySearch}
              placeholder={cityName || 'Search for your city'}
              placeholderTextColor={Colors.creamFaint}
              autoCorrect={false}
              style={styles.input}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.sm }}
            >
              {visibleCities.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.cityChip, cityId === c.id && styles.cityChipActive]}
                  onPress={() => { setCityId(c.id); setCitySearch(''); }}
                >
                  <Text style={[styles.cityChipText, cityId === c.id && { color: Colors.gold }]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>NEW PASSWORD</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Leave blank to keep your current password"
              placeholderTextColor={Colors.creamFaint}
              style={styles.input}
            />
            {!!password && (
              <TextInput
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                placeholder="Confirm new password"
                placeholderTextColor={Colors.creamFaint}
                style={[styles.input, { marginTop: Spacing.sm }]}
              />
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>ROLE</Text>
            <View style={styles.roleRow}>
              {ROLES.map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                  onPress={() => setRole(r)}
                >
                  <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                    {ROLE_LABELS[r]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}
        <GoldButton label="Save Changes" onPress={handleSave} size="lg" fullWidth loading={saving} disabled={saving} />

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Delete Account</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md, backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { padding: Spacing.xs },
  backIcon: { color: Colors.gold, fontSize: 22 },
  headerTitle: { ...Typography.bodyBold, fontSize: 18 },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', marginBottom: Spacing.xl },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: Colors.gold },
  avatarPlaceholder: { backgroundColor: Colors.bgCard, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { ...Typography.heading, fontSize: 36, color: Colors.gold },
  editAvatarBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.gold, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: Colors.bg,
  },
  editAvatarIcon: { fontSize: 14, color: Colors.bg },
  avatarHint: { ...Typography.caption, fontSize: 12, color: Colors.creamDim, marginTop: Spacing.sm },
  form: { gap: Spacing.md, marginBottom: Spacing.xxl },
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
  cityChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgInput,
  },
  cityChipActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '18' },
  cityChipText: { ...Typography.caption, fontSize: 12, color: Colors.creamDim },
  roleRow: { flexDirection: 'row', gap: Spacing.sm },
  roleBtn: { flex: 1, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.bgInput },
  roleBtnActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '20' },
  roleBtnText: { ...Typography.bodySemibold, fontSize: 13, color: Colors.creamDim },
  roleBtnTextActive: { color: Colors.gold },
  deleteBtn: { marginTop: Spacing.xxl, alignItems: 'center', padding: Spacing.md },
  deleteBtnText: { ...Typography.bodySemibold, fontSize: 14, color: Colors.error },
  errorText: { ...Typography.caption, fontSize: 13, color: Colors.error, marginBottom: Spacing.sm, textAlign: 'center' },
});
