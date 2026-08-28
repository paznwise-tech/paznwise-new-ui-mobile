import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { orderService } from '@/services/orderService';
import {
  ReturnsService, REASON_CATEGORIES,
  type ReasonCategory, type ResolutionType, type ReturnItemInput,
} from '@/services/returnsService';
import { useCreateReturn } from '@/hooks/useReturns';
import type { Order, OrderItem } from '@/types';

const RESOLUTIONS: Array<{ value: ResolutionType; label: string; sub: string }> = [
  { value: 'REFUND',      label: 'Refund',      sub: 'Money back to your original payment method' },
  { value: 'REPLACEMENT', label: 'Replacement', sub: 'Same item sent again' },
  { value: 'EXCHANGE',    label: 'Exchange',    sub: 'Swap for a different item' },
];

/** Per-line state while the form is being filled in. */
interface LineState {
  selected: boolean;
  quantity: number;
  reasonCategory: ReasonCategory | null;
  reasonNote: string;
  /** Local file URIs; uploaded to S3 only on submit. */
  photos: string[];
}

export default function CreateReturn() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolution, setResolution] = useState<ResolutionType>('REFUND');
  const [lines, setLines] = useState<Record<string, LineState>>({});
  const [uploading, setUploading] = useState(false);

  const createReturn = useCreateReturn();

  useEffect(() => {
    if (!orderId) return;
    orderService
      .getOrderById(orderId)
      .then(o => {
        setOrder(o);
        const items = (o.items ?? o.orderItems ?? o.products ?? []) as OrderItem[];
        const initial: Record<string, LineState> = {};
        for (const it of items) {
          initial[String(it.id)] = {
            selected: false, quantity: 1, reasonCategory: null, reasonNote: '', photos: [],
          };
        }
        setLines(initial);
      })
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [orderId]);

  const items = (order?.items ?? order?.orderItems ?? order?.products ?? []) as OrderItem[];

  const patch = (id: string, next: Partial<LineState>) =>
    setLines(prev => ({ ...prev, [id]: { ...prev[id], ...next } }));

  const addPhoto = useCallback(async (id: string) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach evidence.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 4,
    });
    if (res.canceled) return;
    patch(id, { photos: [...(lines[id]?.photos ?? []), ...res.assets.map(a => a.uri)].slice(0, 4) });
  }, [lines]);

  const removePhoto = (id: string, uri: string) =>
    patch(id, { photos: (lines[id]?.photos ?? []).filter(p => p !== uri) });

  const selectedIds = Object.keys(lines).filter(id => lines[id].selected);

  const handleSubmit = useCallback(async () => {
    if (!orderId) return;
    if (selectedIds.length === 0) {
      Alert.alert('Nothing selected', 'Choose at least one item to return.');
      return;
    }
    const missingReason = selectedIds.find(id => !lines[id].reasonCategory);
    if (missingReason) {
      Alert.alert('Reason required', 'Pick a reason for every item you are returning.');
      return;
    }

    setUploading(true);
    try {
      // Photos are uploaded first and submitted as URLs — the create
      // endpoint takes URI strings, not binary.
      const payloadItems: ReturnItemInput[] = [];
      for (const id of selectedIds) {
        const line = lines[id];
        const urls: string[] = [];
        for (const uri of line.photos) {
          urls.push(await ReturnsService.uploadImage(uri, `return-${id}-${urls.length}.jpg`));
        }
        payloadItems.push({
          orderItemId: id,
          quantity: line.quantity,
          reasonCategory: line.reasonCategory!,
          reasonNote: line.reasonNote.trim() || undefined,
          customerImages: urls,
        });
      }

      const created = await createReturn.mutateAsync({
        orderId,
        resolutionType: resolution,
        items: payloadItems,
      });

      router.replace(`/returns/${created.id}` as any);
    } catch (e: any) {
      Alert.alert('Could not raise return', e?.message ?? 'Please try again.');
    } finally {
      setUploading(false);
    }
  }, [orderId, selectedIds, lines, resolution, createReturn]);

  const busy = uploading || createReturn.isPending;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: Colors.bg }]}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  if (!order || items.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: Colors.bg }]}>
        <Text style={styles.errorText}>Could not load this order.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: Spacing.md }}>
          <Text style={{ color: Colors.gold }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Return items</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>What would you like?</Text>
        <View style={{ gap: Spacing.sm, marginBottom: Spacing.lg }}>
          {RESOLUTIONS.map(r => (
            <TouchableOpacity
              key={r.value}
              style={[styles.resolution, resolution === r.value && styles.resolutionActive]}
              onPress={() => setResolution(r.value)}
            >
              <Text style={styles.resolutionLabel}>{r.label}</Text>
              <Text style={styles.resolutionSub}>{r.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Which items?</Text>
        {items.map(it => {
          const id = String(it.id);
          const line = lines[id];
          if (!line) return null;
          const maxQty = Number(it.quantity ?? 1);

          return (
            <View key={id} style={[styles.itemCard, line.selected && styles.itemCardActive]}>
              <TouchableOpacity
                style={styles.itemHead}
                onPress={() => patch(id, { selected: !line.selected })}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, line.selected && styles.checkboxOn]}>
                  {line.selected && <Text style={styles.tick}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {it.productName ?? it.title ?? 'Item'}
                  </Text>
                  <Text style={styles.itemMeta}>
                    Qty {maxQty}
                    {it.price != null ? ` · ₹${Number(it.price).toLocaleString('en-IN')}` : ''}
                  </Text>
                </View>
              </TouchableOpacity>

              {line.selected && (
                <View style={styles.itemBody}>
                  {maxQty > 1 && (
                    <View style={styles.qtyRow}>
                      <Text style={styles.fieldLabel}>Quantity to return</Text>
                      <View style={styles.qtyControls}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => patch(id, { quantity: Math.max(1, line.quantity - 1) })}
                        >
                          <Text style={styles.qtyBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyValue}>{line.quantity}</Text>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => patch(id, { quantity: Math.min(maxQty, line.quantity + 1) })}
                        >
                          <Text style={styles.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <Text style={styles.fieldLabel}>Reason</Text>
                  <View style={styles.reasonWrap}>
                    {REASON_CATEGORIES.map(r => (
                      <TouchableOpacity
                        key={r.value}
                        style={[styles.reasonChip, line.reasonCategory === r.value && styles.reasonChipActive]}
                        onPress={() => patch(id, { reasonCategory: r.value })}
                      >
                        <Text style={[styles.reasonText, line.reasonCategory === r.value && { color: Colors.gold }]}>
                          {r.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.fieldLabel}>Anything else? (optional)</Text>
                  <TextInput
                    style={styles.noteInput}
                    value={line.reasonNote}
                    onChangeText={v => patch(id, { reasonNote: v })}
                    placeholder="Describe the problem"
                    placeholderTextColor={Colors.creamFaint}
                    multiline
                  />

                  <Text style={styles.fieldLabel}>Photos (optional, up to 4)</Text>
                  <View style={styles.photoRow}>
                    {line.photos.map(uri => (
                      <TouchableOpacity key={uri} onPress={() => removePhoto(id, uri)}>
                        <Image source={{ uri }} style={styles.photo} contentFit="cover" />
                        <View style={styles.photoRemove}><Text style={styles.photoRemoveText}>✕</Text></View>
                      </TouchableOpacity>
                    ))}
                    {line.photos.length < 4 && (
                      <TouchableOpacity style={styles.photoAdd} onPress={() => addPhoto(id)}>
                        <Text style={styles.photoAddText}>＋</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.bottomBar}>
        <GoldButton
          label={
            busy
              ? uploading ? 'Uploading photos…' : 'Submitting…'
              : `Request ${resolution.toLowerCase()}${selectedIds.length ? ` (${selectedIds.length})` : ''}`
          }
          onPress={handleSubmit}
          size="lg"
          fullWidth
          disabled={busy || selectedIds.length === 0}
        />
      </View>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  errorText: { ...Typography.body, fontSize: 14, color: Colors.creamDim },

  sectionTitle: { ...Typography.heading, fontSize: 16, marginBottom: Spacing.sm },

  resolution: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    padding: Spacing.md, backgroundColor: Colors.bgCard,
  },
  resolutionActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '11' },
  resolutionLabel: { ...Typography.bodySemibold, fontSize: 14 },
  resolutionSub: { ...Typography.caption, fontSize: 12, marginTop: 2 },

  itemCard: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    backgroundColor: Colors.bgCard, marginBottom: Spacing.sm, overflow: 'hidden',
  },
  itemCardActive: { borderColor: Colors.gold + '88' },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
  checkbox: {
    width: 22, height: 22, borderRadius: 5, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  tick: { color: Colors.bg, fontSize: 14, fontWeight: '700' },
  itemTitle: { ...Typography.bodySemibold, fontSize: 14 },
  itemMeta: { ...Typography.caption, fontSize: 12, marginTop: 2 },

  itemBody: {
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md, gap: Spacing.sm,
  },
  fieldLabel: { ...Typography.label, fontSize: 10, marginBottom: 4 },

  qtyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  qtyBtn: {
    width: 28, height: 28, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnText: { ...Typography.bodySemibold, fontSize: 16, color: Colors.gold, lineHeight: 18 },
  qtyValue: { ...Typography.bodySemibold, fontSize: 14, minWidth: 18, textAlign: 'center' },

  reasonWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reasonChip: {
    paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  reasonChipActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '18' },
  reasonText: { ...Typography.caption, fontSize: 11, color: Colors.creamDim },

  noteInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    padding: Spacing.sm, minHeight: 64, textAlignVertical: 'top',
    color: Colors.cream, fontFamily: 'Inter_400Regular', fontSize: 13,
  },

  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  photo: { width: 64, height: 64, borderRadius: Radius.sm },
  photoRemove: {
    position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center',
  },
  photoRemoveText: { color: Colors.cream, fontSize: 11, fontWeight: '700' },
  photoAdd: {
    width: 64, height: 64, borderRadius: Radius.sm, borderWidth: 1, borderStyle: 'dashed',
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  photoAddText: { color: Colors.gold, fontSize: 22 },

  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    padding: Spacing.md, paddingBottom: Spacing.lg,
    backgroundColor: Colors.bg, borderTopWidth: 1, borderTopColor: Colors.border,
  },
});
