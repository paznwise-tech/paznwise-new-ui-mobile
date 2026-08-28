import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { useAddresses, useAddAddress, useUpdateAddress, useDeleteAddress } from '@/hooks/useAddresses';
import type { Address, AddressPayload } from '@/types';

const EMPTY: AddressPayload = {
  name: '', phone: '', street: '', city: '', state: '', country: 'India', zipCode: '', isDefault: false,
};

function Field({
  label, value, onChangeText, placeholder, keyboardType, maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad';
  maxLength?: number;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.creamFaint}
        keyboardType={keyboardType ?? 'default'}
        maxLength={maxLength}
      />
    </View>
  );
}

/**
 * Address book.
 *
 * Addresses were only editable inside checkout, so they could not be
 * managed except while buying something, and deletion was unreachable
 * despite the endpoint existing.
 */
export default function Addresses() {
  const { data: addresses = [], isLoading } = useAddresses();
  const addMutation = useAddAddress();
  const updateMutation = useUpdateAddress();
  const deleteMutation = useDeleteAddress();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddressPayload>(EMPTY);

  const set = (k: keyof AddressPayload) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const openNew = useCallback(() => {
    setForm(EMPTY);
    setEditingId(null);
    setShowForm(true);
  }, []);

  const openEdit = useCallback((addr: Address) => {
    setForm({
      name: addr.name, phone: addr.phone, street: addr.street, city: addr.city,
      state: addr.state, country: addr.country || 'India', zipCode: addr.zipCode,
      isDefault: addr.isDefault,
    });
    setEditingId(addr.id);
    setShowForm(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.street.trim() || !form.city.trim() || !form.zipCode.trim()) {
      Alert.alert('Required fields', 'Please fill in name, phone, street, city and PIN code.');
      return;
    }
    if (form.phone.trim().length < 10) {
      Alert.alert('Invalid phone', 'Please enter a valid 10-digit phone number.');
      return;
    }
    try {
      if (editingId) await updateMutation.mutateAsync({ id: editingId, payload: form });
      else await addMutation.mutateAsync(form);
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY);
    } catch (e: any) {
      Alert.alert('Could not save address', e?.message ?? 'Please try again.');
    }
  }, [form, editingId, addMutation, updateMutation]);

  const handleDelete = useCallback((addr: Address) => {
    Alert.alert('Delete address', `Remove "${addr.name}, ${addr.city}" from your saved addresses?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync({ id: addr.id });
          } catch (e: any) {
            Alert.alert('Could not delete', e?.message ?? 'Please try again.');
          }
        },
      },
    ]);
  }, [deleteMutation]);

  const handleSetDefault = useCallback(async (addr: Address) => {
    if (addr.isDefault) return;
    try {
      await updateMutation.mutateAsync({
        id: addr.id,
        payload: {
          name: addr.name, phone: addr.phone, street: addr.street, city: addr.city,
          state: addr.state, country: addr.country, zipCode: addr.zipCode, isDefault: true,
        },
      });
    } catch (e: any) {
      Alert.alert('Could not update', e?.message ?? 'Please try again.');
    }
  }, [updateMutation]);

  const saving = addMutation.isPending || updateMutation.isPending;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (showForm ? setShowForm(false) : router.back())}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{showForm ? (editingId ? 'Edit Address' : 'New Address') : 'Addresses'}</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.gold} size="large" /></View>
      ) : showForm ? (
        <ScrollView contentContainerStyle={styles.formWrap} keyboardShouldPersistTaps="handled">
          <Field label="Full name" value={form.name} onChangeText={set('name')} placeholder="Priya Sharma" />
          <Field label="Phone" value={form.phone} onChangeText={set('phone')} placeholder="9876543210" keyboardType="phone-pad" maxLength={10} />
          <Field label="Street address" value={form.street} onChangeText={set('street')} placeholder="Flat, building, area" />
          <Field label="City" value={form.city} onChangeText={set('city')} placeholder="Mumbai" />
          <Field label="State" value={form.state} onChangeText={set('state')} placeholder="Maharashtra" />
          <Field label="PIN code" value={form.zipCode} onChangeText={set('zipCode')} placeholder="400001" keyboardType="number-pad" maxLength={6} />

          <TouchableOpacity
            style={styles.defaultToggle}
            onPress={() => setForm(f => ({ ...f, isDefault: !f.isDefault }))}
          >
            <View style={[styles.checkbox, form.isDefault && styles.checkboxOn]}>
              {form.isDefault && <Text style={styles.checkboxTick}>✓</Text>}
            </View>
            <Text style={styles.defaultToggleText}>Use as my default delivery address</Text>
          </TouchableOpacity>

          <GoldButton
            label={saving ? 'Saving…' : editingId ? 'Save changes' : 'Add address'}
            onPress={handleSave}
            size="lg"
            fullWidth
            disabled={saving}
          />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}>
          {addresses.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 44 }}>📍</Text>
              <Text style={styles.emptyTitle}>No saved addresses</Text>
              <Text style={styles.emptyText}>Add one to speed up checkout.</Text>
            </View>
          ) : (
            addresses.map(addr => (
              <View key={addr.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardName}>{addr.name}</Text>
                  {addr.isDefault && (
                    <View style={styles.defaultPill}><Text style={styles.defaultPillText}>Default</Text></View>
                  )}
                </View>
                <Text style={styles.cardLine}>{addr.street}</Text>
                <Text style={styles.cardLine}>
                  {addr.city}{addr.state ? `, ${addr.state}` : ''} — {addr.zipCode}
                </Text>
                <Text style={styles.cardPhone}>{addr.phone}</Text>

                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => openEdit(addr)}>
                    <Text style={styles.action}>Edit</Text>
                  </TouchableOpacity>
                  {!addr.isDefault && (
                    <TouchableOpacity onPress={() => handleSetDefault(addr)}>
                      <Text style={styles.action}>Set default</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => handleDelete(addr)}>
                    <Text style={[styles.action, { color: Colors.error }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          <TouchableOpacity style={styles.addBtn} onPress={openNew}>
            <Text style={styles.addBtnText}>+ Add a new address</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  backIcon: { color: Colors.gold, fontSize: 22 },
  title: { ...Typography.display, fontSize: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  cardName: { ...Typography.bodySemibold, fontSize: 15 },
  defaultPill: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full,
    backgroundColor: Colors.gold + '22', borderWidth: 1, borderColor: Colors.gold + '55',
  },
  defaultPillText: { ...Typography.label, fontSize: 9, color: Colors.gold },
  cardLine: { ...Typography.body, fontSize: 13, color: Colors.creamDim, lineHeight: 19 },
  cardPhone: { ...Typography.caption, fontSize: 12, marginTop: 4 },
  cardActions: {
    flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm,
  },
  action: { ...Typography.bodySemibold, fontSize: 13, color: Colors.gold },

  addBtn: {
    borderWidth: 1, borderColor: Colors.gold + '66', borderRadius: Radius.md,
    paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm,
  },
  addBtnText: { ...Typography.bodySemibold, fontSize: 14, color: Colors.gold },

  empty: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyTitle: { ...Typography.heading, fontSize: 18, marginTop: Spacing.md },
  emptyText: { ...Typography.caption, fontSize: 13, marginTop: 4 },

  formWrap: { padding: Spacing.md, paddingBottom: 120 },
  field: { marginBottom: Spacing.md },
  fieldLabel: { ...Typography.label, fontSize: 10, marginBottom: 6 },
  input: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    color: Colors.cream, fontFamily: 'Inter_400Regular', fontSize: 14,
  },
  defaultToggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  checkboxTick: { color: Colors.bg, fontSize: 13, fontWeight: '700' },
  defaultToggleText: { ...Typography.body, fontSize: 13, color: Colors.creamDim, flex: 1 },
});
