import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/GoldButton';
import { useUser } from '@/context/AppContext';

export default function EditProfile() {
  const { user, updateUserProfile, deleteProfile } = useUser();

  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio);
  const [location, setLocation] = useState(user.location || '');

  const handleSave = useCallback(() => {
    // PUT /api/user/profile mock
    updateUserProfile({ name, username, bio, location });
    alert('Profile updated successfully!');
    router.back();
  }, [name, username, bio, location, updateUserProfile]);

  const handleDelete = useCallback(() => {
    // DELETE /api/user/profile mock
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
          deleteProfile();
          router.replace('/(auth)/login');
        } },
      ]
    );
  }, [deleteProfile]);

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
        
        <View style={styles.form}>
          {[
            { label: 'Name', value: name, set: setName, multiline: false },
            { label: 'Username', value: username, set: setUsername, multiline: false },
            { label: 'Bio', value: bio, set: setBio, multiline: true },
            { label: 'Location', value: location, set: setLocation, multiline: false },
          ].map(f => (
            <View key={f.label} style={styles.fieldGroup}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                value={f.value}
                onChangeText={f.set}
                multiline={f.multiline}
                style={[styles.input, f.multiline && { height: 100, textAlignVertical: 'top' }]}
                placeholderTextColor={Colors.creamFaint}
              />
            </View>
          ))}
        </View>

        <GoldButton label="Save Changes" onPress={handleSave} size="lg" fullWidth />

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
  deleteBtn: { marginTop: Spacing.xxl, alignItems: 'center', padding: Spacing.md },
  deleteBtnText: { ...Typography.bodySemibold, fontSize: 14, color: Colors.error },
});
