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
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { ArtistServiceApi } from '@/services/artistService';
import { usePerformerCategories } from '@/hooks/useTaxonomy';

const PRICING = [
  { value: 'HOURLY',       label: 'Per hour' },
  { value: 'PER_SESSION',  label: 'Per session' },
  { value: 'FIXED',        label: 'Fixed price' },
  { value: 'CUSTOM_QUOTE', label: 'Custom quote' },
] as const;

const LOCATIONS = [
  { value: 'HOME_VISIT', label: 'I travel to them', hint: 'You go to the customer’s venue' },
  { value: 'VENUE',      label: 'They come to me',  hint: 'Bookings happen at your own space' },
] as const;

function pad(n: number) { return String(n).padStart(2, '0'); }
function toHHMM(d: Date) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function isoDate(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString();
}

/**
 * Create a bookable service.
 *
 * The API requires at least one time slot to create a service at all — it
 * will not accept one nobody can book — so availability is collected here
 * rather than left for a later screen.
 */
export default function CreateService() {
  const { data: categories = [] } = usePerformerCategories();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [pricingType, setPricingType] = useState<(typeof PRICING)[number]['value']>('PER_SESSION');
  const [basePrice, setBasePrice] = useState('');
  const [location, setLocation] = useState<(typeof LOCATIONS)[number]['value']>('HOME_VISIT');
  const [venueAddress, setVenueAddress] = useState('');
  const [cities, setCities] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const [date, setDate] = useState<Date>(new Date(Date.now() + 86400000));
  const [start, setStart] = useState<Date>(() => { const d = new Date(); d.setHours(10, 0, 0, 0); return d; });
  const [end, setEnd] = useState<Date>(() => { const d = new Date(); d.setHours(13, 0, 0, 0); return d; });
  const [picking, setPicking] = useState<'date' | 'start' | 'end' | null>(null);

  const [saving, setSaving] = useState(false);

  const toggleCategory = (id: string) =>
    setCategoryIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const pickImages = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to add cover images.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: true, selectionLimit: 5,
    });
    if (res.canceled) return;
    setImages(prev => [...prev, ...res.assets.map(a => a.uri)].slice(0, 5));
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
    // These bounds match the server's Joi schema, so a rejection here is
    // never a surprise after the upload has already started.
    if (title.trim().length < 5)        { Alert.alert('Title too short', 'Use at least 5 characters.'); return; }
    if (description.trim().length < 20) { Alert.alert('Add more detail', 'Describe your service in at least 20 characters.'); return; }
    if (categoryIds.length === 0)       { Alert.alert('Pick a category', 'Choose at least one.'); return; }
    if (!basePrice || Number(basePrice) < 0) { Alert.alert('Price needed', 'Enter your base price.'); return; }
    if (location === 'VENUE' && !venueAddress.trim()) {
      Alert.alert('Venue needed', 'Enter the address where bookings take place.');
      return;
    }

    setSaving(true);
    try {
      const created = await ArtistServiceApi.createService({
        title: title.trim(),
        description: description.trim(),
        categoryIds,
        pricingType,
        basePrice: Number(basePrice),
        serviceLocation: location,
        venueAddress: location === 'VENUE' ? venueAddress.trim() : undefined,
        cities: cities.split(',').map(c => c.trim()).filter(Boolean),
        timeSlots: [{
          date: isoDate(date),
          startTime: toHHMM(start),
          endTime: toHHMM(end),
          maxBookings: 1,
        }],
        coverImages: images.map((uri, i) => ({ uri, name: `cover-${i}.jpg` })),
      });
      Alert.alert('Service created', 'People can now book you for this.', [
        { text: 'Add more slots', onPress: () => router.replace('/artist/availability' as any) },
        { text: 'Done', onPress: () => router.replace('/artist/dashboard' as any) },
      ]);
      void created;
    } catch (e: any) {
      Alert.alert('Could not create service', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  }, [title, description, categoryIds, pricingType, basePrice, location, venueAddress, cities, date, start, end, images]);

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
          <Text style={styles.title}>New Service</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>What are you offering?</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle}
          placeholder="e.g. Live wedding sitar performance" placeholderTextColor={Colors.creamFaint} />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.textarea]} value={description} onChangeText={setDescription}
          placeholder="What you do, how long it runs, what you bring, what you need from the venue"
          placeholderTextColor={Colors.creamFaint} multiline />

        <Text style={styles.label}>Category</Text>
        <View style={styles.chipWrap}>
          {categories.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, categoryIds.includes(c.id) && styles.chipActive]}
              onPress={() => toggleCategory(c.id)}
            >
              <Text style={[styles.chipText, categoryIds.includes(c.id) && { color: Colors.gold }]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>How do you charge?</Text>
        <View style={styles.chipWrap}>
          {PRICING.map(p => (
            <TouchableOpacity
              key={p.value}
              style={[styles.chip, pricingType === p.value && styles.chipActive]}
              onPress={() => setPricingType(p.value)}
            >
              <Text style={[styles.chipText, pricingType === p.value && { color: Colors.gold }]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Base price (₹)</Text>
        <TextInput style={styles.input} value={basePrice} onChangeText={setBasePrice}
          placeholder="8000" placeholderTextColor={Colors.creamFaint} keyboardType="number-pad" />

        <Text style={styles.label}>Where do you perform?</Text>
        <View style={{ gap: Spacing.sm }}>
          {LOCATIONS.map(l => (
            <TouchableOpacity
              key={l.value}
              style={[styles.optionCard, location === l.value && styles.optionCardActive]}
              onPress={() => setLocation(l.value)}
            >
              <Text style={styles.optionLabel}>{l.label}</Text>
              <Text style={styles.optionHint}>{l.hint}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {location === 'VENUE' ? (
          <>
            <Text style={styles.label}>Your venue address</Text>
            <TextInput style={styles.input} value={venueAddress} onChangeText={setVenueAddress}
              placeholder="Where bookings take place" placeholderTextColor={Colors.creamFaint} multiline />
          </>
        ) : (
          <>
            <Text style={styles.label}>Cities you travel to</Text>
            <TextInput style={styles.input} value={cities} onChangeText={setCities}
              placeholder="Jaipur, Delhi, Agra" placeholderTextColor={Colors.creamFaint} />
          </>
        )}

        <Text style={styles.label}>Cover images (up to 5)</Text>
        <View style={styles.photoRow}>
          {images.map(uri => (
            <TouchableOpacity key={uri} onPress={() => setImages(p => p.filter(x => x !== uri))}>
              <Image source={{ uri }} style={styles.photo} contentFit="cover" />
              <View style={styles.photoRemove}><Text style={styles.photoRemoveText}>✕</Text></View>
            </TouchableOpacity>
          ))}
          {images.length < 5 && (
            <TouchableOpacity style={styles.photoAdd} onPress={pickImages}>
              <Text style={styles.photoAddText}>＋</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Required by the API: a service cannot exist without a slot. */}
        <Text style={styles.label}>First available slot</Text>
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
        <Text style={styles.hint}>You can add more slots after creating the service.</Text>

        {picking && (
          <DateTimePicker
            value={picking === 'date' ? date : picking === 'start' ? start : end}
            mode={picking === 'date' ? 'date' : 'time'}
            is24Hour
            minimumDate={picking === 'date' ? new Date() : undefined}
            onChange={onPick}
          />
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <GoldButton
          label={saving ? 'Creating…' : 'Create service'}
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

  label: { ...Typography.label, fontSize: 10, marginBottom: 6, marginTop: Spacing.md },
  hint: { ...Typography.caption, fontSize: 11, marginTop: 6 },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    padding: Spacing.md, color: Colors.cream, fontFamily: 'Inter_400Regular',
    fontSize: 14, backgroundColor: Colors.bgCard,
  },
  textarea: { minHeight: 110, textAlignVertical: 'top' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '18' },
  chipText: { ...Typography.caption, fontSize: 12, color: Colors.creamDim },

  optionCard: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    padding: Spacing.md, backgroundColor: Colors.bgCard,
  },
  optionCardActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '11' },
  optionLabel: { ...Typography.bodySemibold, fontSize: 14 },
  optionHint: { ...Typography.caption, fontSize: 12, marginTop: 2 },

  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  photo: { width: 72, height: 72, borderRadius: Radius.sm },
  photoRemove: {
    position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center',
  },
  photoRemoveText: { color: Colors.cream, fontSize: 11, fontWeight: '700' },
  photoAdd: {
    width: 72, height: 72, borderRadius: Radius.sm, borderWidth: 1, borderStyle: 'dashed',
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  photoAddText: { color: Colors.gold, fontSize: 24 },

  pickRow: { flexDirection: 'row', gap: Spacing.sm },
  pickBox: {
    flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    padding: Spacing.sm, backgroundColor: Colors.bgCard,
  },
  pickCaption: { ...Typography.caption, fontSize: 10 },
  pickValue: { ...Typography.bodySemibold, fontSize: 14, marginTop: 2 },

  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    padding: Spacing.md, paddingBottom: Spacing.lg,
    backgroundColor: Colors.bg, borderTopWidth: 1, borderTopColor: Colors.border,
  },
});
