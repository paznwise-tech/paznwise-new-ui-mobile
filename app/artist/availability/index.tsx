import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import {
  ArtistServiceApi, type ArtistSlot, type ApiArtistService,
} from '@/services/artistService';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** "HH:MM" — the exact format the server's slot pattern requires. */
function toHHMM(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isoDate(d: Date): string {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

/**
 * Availability for one bookable service.
 *
 * Slots belong to a service, not to the artist, so a service has to be
 * chosen first. This screen previously never read existing availability:
 * it started from an empty set of blocked dates and four hardcoded times,
 * then wrote those over whatever the artist actually had.
 */
export default function Availability() {
  const [services, setServices] = useState<ApiArtistService[]>([]);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [slots, setSlots] = useState<ArtistSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // New-slot draft
  const [date, setDate] = useState<Date>(new Date(Date.now() + 86400000));
  const [start, setStart] = useState<Date>(() => { const d = new Date(); d.setHours(10, 0, 0, 0); return d; });
  const [end, setEnd] = useState<Date>(() => { const d = new Date(); d.setHours(13, 0, 0, 0); return d; });
  const [picking, setPicking] = useState<'date' | 'start' | 'end' | null>(null);
  const [recurring, setRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [capacity, setCapacity] = useState(1);

  useEffect(() => {
    ArtistServiceApi.getMyServices()
      .then(list => {
        setServices(list);
        if (list.length > 0) setServiceId(String(list[0].id));
      })
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  const loadSlots = useCallback(async (id: string) => {
    setSlotsLoading(true);
    try {
      setSlots(await ArtistServiceApi.getSlots(id));
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (serviceId) loadSlots(serviceId);
  }, [serviceId, loadSlots]);

  const toggleDay = (d: number) =>
    setRecurringDays(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]));

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

  const handleAdd = useCallback(async () => {
    if (!serviceId) return;
    if (recurring && recurringDays.length === 0) {
      Alert.alert('Pick days', 'Choose which days this slot repeats on.');
      return;
    }
    setSaving(true);
    try {
      await ArtistServiceApi.addSlots(serviceId, [{
        date: isoDate(date),
        startTime: toHHMM(start),
        endTime: toHHMM(end),
        isRecurring: recurring,
        recurringDays: recurring ? recurringDays : [],
        maxBookings: capacity,
      }]);
      await loadSlots(serviceId);
    } catch (e: any) {
      Alert.alert('Could not add slot', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  }, [serviceId, date, start, end, recurring, recurringDays, capacity, loadSlots]);

  const handleDelete = useCallback((slot: ArtistSlot) => {
    if (!serviceId) return;
    // A slot someone has already booked cannot simply vanish.
    if (slot.bookedCount > 0) {
      Alert.alert(
        'Slot has bookings',
        `${slot.bookedCount} booking${slot.bookedCount === 1 ? '' : 's'} exist for this slot. Cancel those first.`,
      );
      return;
    }
    Alert.alert('Remove slot', `Remove ${formatDate(slot.date)} ${slot.startTime}–${slot.endTime}?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await ArtistServiceApi.deleteSlot(serviceId, slot.id);
            await loadSlots(serviceId);
          } catch (e: any) {
            Alert.alert('Could not remove', e?.message ?? 'Please try again.');
          }
        },
      },
    ]);
  }, [serviceId, loadSlots]);

  const upcoming = useMemo(
    () => [...slots].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [slots],
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.gold} size="large" /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>My Availability</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      {services.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 44 }}>🗓</Text>
          <Text style={styles.emptyTitle}>No services yet</Text>
          <Text style={styles.emptyText}>
            Availability belongs to a service. Create one before adding slots.
          </Text>
          <TouchableOpacity style={{ marginTop: Spacing.md }} onPress={() => router.push('/artist/services/create' as any)}>
            <Text style={{ color: Colors.gold }}>Create a service →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 80 }}>
          {services.length > 1 && (
            <>
              <Text style={styles.label}>Service</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  {services.map(s => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.chip, serviceId === String(s.id) && styles.chipActive]}
                      onPress={() => setServiceId(String(s.id))}
                    >
                      <Text style={[styles.chipText, serviceId === String(s.id) && { color: Colors.gold }]}>
                        {s.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          <Text style={styles.label}>Add a slot</Text>
          <View style={styles.card}>
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

            <TouchableOpacity style={styles.toggleRow} onPress={() => setRecurring(v => !v)}>
              <View style={[styles.checkbox, recurring && styles.checkboxOn]}>
                {recurring && <Text style={styles.tick}>✓</Text>}
              </View>
              <Text style={styles.toggleText}>Repeat weekly</Text>
            </TouchableOpacity>

            {recurring && (
              <View style={styles.dayRow}>
                {DAYS.map((d, i) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dayChip, recurringDays.includes(i) && styles.chipActive]}
                    onPress={() => toggleDay(i)}
                  >
                    <Text style={[styles.dayText, recurringDays.includes(i) && { color: Colors.gold }]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.capacityRow}>
              <Text style={styles.toggleText}>Bookings allowed</Text>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setCapacity(c => Math.max(1, c - 1))}>
                  <Text style={styles.stepText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepValue}>{capacity}</Text>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setCapacity(c => c + 1)}>
                  <Text style={styles.stepText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <GoldButton
              label={saving ? 'Adding…' : 'Add slot'}
              onPress={handleAdd}
              size="md"
              fullWidth
              disabled={saving}
            />
          </View>

          <Text style={styles.label}>Your slots</Text>
          {slotsLoading ? (
            <ActivityIndicator color={Colors.gold} style={{ marginTop: Spacing.md }} />
          ) : upcoming.length === 0 ? (
            <Text style={styles.emptyText}>No slots yet. Add one above so people can book you.</Text>
          ) : (
            upcoming.map(slot => (
              <View key={slot.id} style={styles.slotRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.slotDate}>{formatDate(slot.date)}</Text>
                  <Text style={styles.slotTime}>
                    {slot.startTime}–{slot.endTime}
                    {slot.isRecurring ? ` · repeats ${slot.recurringDays.map(d => DAYS[d]).join(', ')}` : ''}
                  </Text>
                  <Text style={styles.slotMeta}>
                    {slot.bookedCount} of {slot.maxBookings} booked
                    {slot.isBlocked ? ' · blocked' : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(slot)}>
                  <Text style={styles.remove}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  backIcon: { color: Colors.gold, fontSize: 22 },
  title: { ...Typography.display, fontSize: 20 },
  center: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },

  label: { ...Typography.label, fontSize: 10, marginBottom: 8, marginTop: Spacing.md },
  card: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.md,
  },

  pickRow: { flexDirection: 'row', gap: Spacing.sm },
  pickBox: {
    flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  pickCaption: { ...Typography.caption, fontSize: 10 },
  pickValue: { ...Typography.bodySemibold, fontSize: 14, marginTop: 2 },

  chip: {
    paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '18' },
  chipText: { ...Typography.caption, fontSize: 12, color: Colors.creamDim },

  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  tick: { color: Colors.bg, fontSize: 13, fontWeight: '700' },
  toggleText: { ...Typography.body, fontSize: 13, color: Colors.creamDim },

  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  dayText: { ...Typography.caption, fontSize: 11, color: Colors.creamDim },

  capacityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepBtn: {
    width: 28, height: 28, borderRadius: Radius.sm, borderWidth: 1,
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  stepText: { ...Typography.bodySemibold, fontSize: 16, color: Colors.gold, lineHeight: 18 },
  stepValue: { ...Typography.bodySemibold, fontSize: 14, minWidth: 20, textAlign: 'center' },

  slotRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  slotDate: { ...Typography.bodySemibold, fontSize: 14 },
  slotTime: { ...Typography.caption, fontSize: 12, marginTop: 2 },
  slotMeta: { ...Typography.caption, fontSize: 11, marginTop: 2 },
  remove: { ...Typography.bodySemibold, fontSize: 13, color: Colors.error },

  emptyTitle: { ...Typography.heading, fontSize: 18, marginTop: Spacing.md },
  emptyText: { ...Typography.caption, fontSize: 13, marginTop: 4, textAlign: 'center' },
});
