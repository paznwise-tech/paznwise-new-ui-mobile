import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { OrganizerService, type NewTier } from '@/services/organizerService';

function pad(n: number) { return String(n).padStart(2, '0'); }
function toHHMM(d: Date) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function isoDate(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString();
}

interface TierDraft {
  tierName: string;
  price: string;
  totalSeats: string;
}

/**
 * Create a ticketed event.
 *
 * The API requires at least one ticket tier, so tiers are built here rather
 * than added afterwards. Tier sale windows default to "now until the event"
 * — the schema requires both dates, and asking for them per tier before an
 * organizer has even published once is more friction than it earns.
 */
export default function CreateOrganizerEvent() {
  const qc = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ['organizer-categories'],
    queryFn: OrganizerService.getCategories,
    staleTime: 30 * 60_000,
  });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [venue, setVenue] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [cities, setCities] = useState('');
  const [capacity, setCapacity] = useState('');
  const [refundPolicy, setRefundPolicy] = useState('');
  const [banner, setBanner] = useState<string | null>(null);

  const [date, setDate] = useState<Date>(new Date(Date.now() + 7 * 86400000));
  const [start, setStart] = useState<Date>(() => { const d = new Date(); d.setHours(18, 0, 0, 0); return d; });
  const [end, setEnd] = useState<Date>(() => { const d = new Date(); d.setHours(21, 0, 0, 0); return d; });
  const [picking, setPicking] = useState<'date' | 'start' | 'end' | null>(null);

  const [tiers, setTiers] = useState<TierDraft[]>([{ tierName: 'General', price: '', totalSeats: '' }]);
  const [saving, setSaving] = useState(false);

  const toggleCategory = (id: string) =>
    setCategoryIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const patchTier = (i: number, patch: Partial<TierDraft>) =>
    setTiers(prev => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  const pickBanner = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to add a banner.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled && res.assets[0]) setBanner(res.assets[0].uri);
  }, []);

  const onPick = useCallback((_: unknown, picked?: Date) => {
    const which = picking;
    setPicking(null);
    if (!picked || !which) return;
    if (which === 'date') setDate(picked);
    else if (which === 'start') {
      setStart(picked);
      if (picked >= end) setEnd(new Date(picked.getTime() + 3600000));
    } else {
      setEnd(picked <= start ? new Date(start.getTime() + 3600000) : picked);
    }
  }, [picking, start, end]);

  const handleCreate = useCallback(async () => {
    // Bounds mirror the server's Joi schema so nothing is rejected after
    // the banner has already uploaded.
    if (title.trim().length < 5)        { Alert.alert('Title too short', 'Use at least 5 characters.'); return; }
    if (description.trim().length < 20) { Alert.alert('Add more detail', 'Describe the event in at least 20 characters.'); return; }
    if (categoryIds.length === 0)       { Alert.alert('Pick a category', 'Choose at least one.'); return; }
    if (!venue.trim() || !venueAddress.trim()) { Alert.alert('Venue needed', 'Enter the venue and its address.'); return; }
    if (!cities.trim())                 { Alert.alert('City needed', 'Enter at least one city.'); return; }
    if (!capacity || Number(capacity) < 1) { Alert.alert('Capacity needed', 'Enter the total capacity.'); return; }

    const validTiers: NewTier[] = [];
    for (const t of tiers) {
      if (!t.tierName.trim()) { Alert.alert('Tier needs a name', 'Name every ticket tier.'); return; }
      if (t.price === '' || Number(t.price) < 0) { Alert.alert('Tier needs a price', `Set a price for "${t.tierName}".`); return; }
      if (!t.totalSeats || Number(t.totalSeats) < 1) { Alert.alert('Tier needs seats', `Set how many "${t.tierName}" tickets exist.`); return; }
      validTiers.push({
        tierName: t.tierName.trim(),
        price: Number(t.price),
        totalSeats: Number(t.totalSeats),
        saleStartDate: new Date().toISOString(),
        saleEndDate: isoDate(date),
      });
    }

    const tierSeats = validTiers.reduce((n, t) => n + t.totalSeats, 0);
    if (tierSeats > Number(capacity)) {
      Alert.alert(
        'Too many tickets',
        `Your tiers add up to ${tierSeats} tickets but capacity is ${capacity}.`,
      );
      return;
    }

    setSaving(true);
    try {
      await OrganizerService.createEvent({
        title: title.trim(),
        description: description.trim(),
        categoryIds,
        venue: venue.trim(),
        venueAddress: venueAddress.trim(),
        cities: cities.split(',').map(c => c.trim()).filter(Boolean),
        eventDate: isoDate(date),
        startTime: toHHMM(start),
        endTime: toHHMM(end),
        totalCapacity: Number(capacity),
        refundPolicy: refundPolicy.trim() || undefined,
        ticketTiers: validTiers,
        banner: banner ? { uri: banner, name: 'banner.jpg' } : undefined,
      });
      qc.invalidateQueries({ queryKey: ['organizer-events'] });
      Alert.alert('Event created', 'Your event is live once it passes review.', [
        { text: 'Done', onPress: () => router.replace('/organizer/events' as any) },
      ]);
    } catch (e: any) {
      Alert.alert('Could not create event', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  }, [title, description, categoryIds, venue, venueAddress, cities, capacity, refundPolicy, tiers, date, start, end, banner, qc]);

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
          <Text style={styles.title}>New Event</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.banner} onPress={pickBanner}>
          {banner ? (
            <Image source={{ uri: banner }} style={styles.bannerImg} contentFit="cover" />
          ) : (
            <Text style={styles.bannerHint}>＋ Add a banner image</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Event title</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle}
          placeholder="e.g. Monsoon Art Festival" placeholderTextColor={Colors.creamFaint} />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.textarea]} value={description} onChangeText={setDescription}
          placeholder="What is happening, who is performing, what to expect"
          placeholderTextColor={Colors.creamFaint} multiline />

        <Text style={styles.label}>Category</Text>
        <View style={styles.chipWrap}>
          {categories.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, categoryIds.includes(c.id) && styles.chipActive]}
              onPress={() => toggleCategory(c.id)}
            >
              <Text style={[styles.chipText, categoryIds.includes(c.id) && { color: Colors.gold }]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>When</Text>
        <View style={styles.pickRow}>
          <TouchableOpacity style={styles.pickBox} onPress={() => setPicking('date')}>
            <Text style={styles.pickCaption}>Date</Text>
            <Text style={styles.pickValue}>
              {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pickBox} onPress={() => setPicking('start')}>
            <Text style={styles.pickCaption}>From</Text>
            <Text style={styles.pickValue}>{toHHMM(start)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pickBox} onPress={() => setPicking('end')}>
            <Text style={styles.pickCaption}>To</Text>
            <Text style={styles.pickValue}>{toHHMM(end)}</Text>
          </TouchableOpacity>
        </View>

        {picking && (
          <DateTimePicker
            value={picking === 'date' ? date : picking === 'start' ? start : end}
            mode={picking === 'date' ? 'date' : 'time'}
            is24Hour
            minimumDate={picking === 'date' ? new Date() : undefined}
            onChange={onPick}
          />
        )}

        <Text style={styles.label}>Venue</Text>
        <TextInput style={styles.input} value={venue} onChangeText={setVenue}
          placeholder="e.g. Jawahar Kala Kendra" placeholderTextColor={Colors.creamFaint} />

        <Text style={styles.label}>Venue address</Text>
        <TextInput style={styles.input} value={venueAddress} onChangeText={setVenueAddress}
          placeholder="Full address" placeholderTextColor={Colors.creamFaint} multiline />

        <Text style={styles.label}>City</Text>
        <TextInput style={styles.input} value={cities} onChangeText={setCities}
          placeholder="Jaipur" placeholderTextColor={Colors.creamFaint} />

        <Text style={styles.label}>Total capacity</Text>
        <TextInput style={styles.input} value={capacity} onChangeText={setCapacity}
          placeholder="200" placeholderTextColor={Colors.creamFaint} keyboardType="number-pad" />

        <Text style={styles.label}>Ticket tiers</Text>
        {tiers.map((t, i) => (
          <View key={i} style={styles.tierCard}>
            <View style={styles.tierHead}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={t.tierName}
                onChangeText={v => patchTier(i, { tierName: v })}
                placeholder="Tier name" placeholderTextColor={Colors.creamFaint}
              />
              {tiers.length > 1 && (
                <TouchableOpacity onPress={() => setTiers(prev => prev.filter((_, x) => x !== i))}>
                  <Text style={styles.removeTier}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.tierRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={t.price}
                onChangeText={v => patchTier(i, { price: v })}
                placeholder="Price ₹" placeholderTextColor={Colors.creamFaint}
                keyboardType="number-pad"
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={t.totalSeats}
                onChangeText={v => patchTier(i, { totalSeats: v })}
                placeholder="Tickets" placeholderTextColor={Colors.creamFaint}
                keyboardType="number-pad"
              />
            </View>
          </View>
        ))}
        <TouchableOpacity
          style={styles.addTier}
          onPress={() => setTiers(prev => [...prev, { tierName: '', price: '', totalSeats: '' }])}
        >
          <Text style={styles.addTierText}>+ Add another tier</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Refund policy (optional)</Text>
        <TextInput style={[styles.input, styles.textarea]} value={refundPolicy} onChangeText={setRefundPolicy}
          placeholder="e.g. Full refund up to 48 hours before the event"
          placeholderTextColor={Colors.creamFaint} multiline />
      </ScrollView>

      <View style={styles.bottomBar}>
        <GoldButton
          label={saving ? 'Creating…' : 'Create event'}
          onPress={handleCreate}
          size="lg"
          fullWidth
          disabled={saving}
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

  banner: {
    height: 140, borderRadius: Radius.md, borderWidth: 1, borderStyle: 'dashed',
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', backgroundColor: Colors.bgCard,
  },
  bannerImg: { width: '100%', height: '100%' },
  bannerHint: { ...Typography.caption, fontSize: 13, color: Colors.gold },

  label: { ...Typography.label, fontSize: 10, marginBottom: 6, marginTop: Spacing.md },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    padding: Spacing.md, color: Colors.cream, fontFamily: 'Inter_400Regular',
    fontSize: 14, backgroundColor: Colors.bgCard,
  },
  textarea: { minHeight: 90, textAlignVertical: 'top' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '18' },
  chipText: { ...Typography.caption, fontSize: 12, color: Colors.creamDim },

  pickRow: { flexDirection: 'row', gap: Spacing.sm },
  pickBox: {
    flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    padding: Spacing.sm, backgroundColor: Colors.bgCard,
  },
  pickCaption: { ...Typography.caption, fontSize: 10 },
  pickValue: { ...Typography.bodySemibold, fontSize: 14, marginTop: 2 },

  tierCard: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    padding: Spacing.sm, marginBottom: Spacing.sm, gap: Spacing.sm,
  },
  tierHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  tierRow: { flexDirection: 'row', gap: Spacing.sm },
  removeTier: { color: Colors.error, fontSize: 18, paddingHorizontal: 4 },
  addTier: {
    borderWidth: 1, borderColor: Colors.gold + '66', borderRadius: Radius.md,
    paddingVertical: Spacing.sm, alignItems: 'center',
  },
  addTierText: { ...Typography.bodySemibold, fontSize: 13, color: Colors.gold },

  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    padding: Spacing.md, paddingBottom: Spacing.lg,
    backgroundColor: Colors.bg, borderTopWidth: 1, borderTopColor: Colors.border,
  },
});
