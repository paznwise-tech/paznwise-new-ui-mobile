import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { router, Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { EventService } from '@/services/eventService';
import { useEventCategoryOptions, useCities } from '@/hooks/useTaxonomy';
import { useUser } from '@/context/AppContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_LABELS = ['Type', 'Details', 'Date & Venue', 'Tickets', 'Review'];

// Categories come from `/event-categories` — the API validates `categoryId`
// as a UUID, so a hardcoded list here cannot produce a submittable form.
// These are decoration only, matched by name with a generic fallback.
const CATEGORY_EMOJI: Record<string, string> = {
  music: '🎵',
  performance: '🎭',
  exhibition: '🖼',
  workshop: '🎨',
  'art fair': '🏪',
  talk: '🎤',
  theatre: '🎭',
  dance: '💃',
  comedy: '😂',
  festival: '🎪',
};

// Cities come from `/locations/cities` — 249 of them. The hardcoded list this
// replaced omitted cities that already have events (Bhubaneswar, Cuttack) and
// named one the API does not use ("Bangalore" for the API's "Bengaluru"), so a
// venue in an unlisted city simply could not be entered.

// ─── Date helpers ─────────────────────────────────────────────────────────────
//
// Dates and times are held as strings because that is what the API takes
// (`eventDate` as ISO, `startTime` as HH:MM). The pickers work in `Date`, so
// the two conversions live here rather than being repeated per field.

/** Midnight today, the earliest date any event field may hold. */
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** `Date` → `YYYY-MM-DD` in local time. `toISOString()` would shift the day. */
const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** `YYYY-MM-DD` → local midnight, or null when unset/unparseable. */
const fromYMD = (s: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
};

const toHHMM = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const fromHHMM = (s: string): Date => {
  const m = /^(\d{2}):(\d{2})$/.exec(s);
  const d = new Date();
  if (m) d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d;
};

/** Human-readable rendering for the picker buttons. */
const showDate = (s: string) => {
  const d = fromYMD(s);
  return d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
};

const showTime = (s: string) => {
  const m = /^(\d{2}):(\d{2})$/.exec(s);
  if (!m) return '';
  const h = Number(m[1]);
  const suffix = h < 12 ? 'AM' : 'PM';
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${suffix}`;
};

type PickField = 'dateFrom' | 'dateTo' | 'timeFrom' | 'timeTo' | 'bookingDeadline';

/**
 * Returns why `step` is not yet valid, or null when it is.
 *
 * Module-level and step-indexed so submit can re-check every step, not just
 * the one on screen: a draft can be edited backwards, and an event drafted
 * yesterday for "today" ages into the past while the form sits open.
 */
function stepErrorFor(step: number, form: FormState): string | null {
  if (step === 0) return form.categoryId ? null : 'Please choose an event type.';

  if (step === 1) {
    if (!form.title.trim()) return 'Please enter an event title.';
    if (form.title.trim().length < 3) return 'The title must be at least 3 characters.';
    if (!form.description.trim()) return 'Please add a description.';
    return null;
  }

  if (step === 2) {
    if (!form.dateFrom) return 'Please pick a start date.';
    const from = fromYMD(form.dateFrom);
    if (!from) return 'The start date is not valid.';
    if (from < startOfToday()) return 'The start date cannot be in the past.';
    const to = fromYMD(form.dateTo);
    if (form.dateTo && !to) return 'The end date is not valid.';
    if (to && to < from) return 'The end date must be on or after the start date.';
    if (!form.venue.trim()) return 'Please enter the venue name.';
    // The API requires `venueAddress` at 5+ characters; without it the whole
    // submission is rejected at the last step with a bare 400.
    if (form.address.trim().length < 5) return 'Please enter the full venue address.';
    if (!form.city) return 'Please choose a city.';
    return null;
  }

  if (step === 3) {
    if (!form.isFree && !(parseFloat(form.ticketPrice) > 0)) {
      return 'Please enter a ticket price greater than zero.';
    }
    if (form.capacity && !(parseInt(form.capacity, 10) >= 1)) {
      return 'Capacity must be at least 1.';
    }
    const deadline = fromYMD(form.bookingDeadline);
    if (form.bookingDeadline && !deadline) return 'The booking deadline is not valid.';
    if (deadline && deadline < startOfToday()) return 'The booking deadline cannot be in the past.';
    const from = fromYMD(form.dateFrom);
    if (deadline && from && deadline > from) {
      return 'Bookings must close on or before the event start date.';
    }
    return null;
  }

  return null;
}

// ─── Picker button ────────────────────────────────────────────────────────────

/** A read-only field that opens a native picker, styled to match `styles.input`. */
function PickerButton({
  value, placeholder, onPress, disabled,
}: { value: string; placeholder: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.input, styles.pickerBtn, disabled && styles.pickerBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={value ? styles.pickerValue : styles.pickerPlaceholder} numberOfLines={1}>
        {value || placeholder}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Step bar ─────────────────────────────────────────────────────────────────

function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <View style={sb.row}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={sb.item}>
          <View style={[sb.dot, i < step && sb.dotDone, i === step && sb.dotActive]}>
            {i < step
              ? <Text style={sb.check}>✓</Text>
              : <Text style={[sb.num, i === step && { color: Colors.bg }]}>{i + 1}</Text>}
          </View>
          {i < total - 1 && <View style={[sb.line, i < step && sb.lineDone]} />}
        </View>
      ))}
    </View>
  );
}

const sb = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' },
  dotDone: { borderColor: Colors.gold, backgroundColor: Colors.gold },
  dotActive: { borderColor: Colors.gold, backgroundColor: Colors.gold },
  check: { color: Colors.bg, fontSize: 11, fontWeight: '700' },
  num: { ...Typography.caption, fontSize: 11, color: Colors.creamDim },
  line: { flex: 1, height: 2, backgroundColor: Colors.border, marginHorizontal: 2 },
  lineDone: { backgroundColor: Colors.gold },
});

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface FormState {
  /** Display name of the chosen category, for the review step. */
  eventType: string;
  /** The UUID the API validates. `eventType` alone is rejected. */
  categoryId: string;
  title: string;
  description: string;
  organiserName: string;
  city: string;
  /** UUID; the API stores `cityId` and only falls back to the name. */
  cityId: string;
  venue: string;
  address: string;
  dateFrom: string;
  dateTo: string;
  timeFrom: string;
  timeTo: string;
  isFree: boolean;
  ticketPrice: string;
  capacity: string;
  bookingDeadline: string;
}

const EMPTY: FormState = {
  eventType: '', categoryId: '', title: '', description: '', organiserName: '',
  city: '', cityId: '', venue: '', address: '',
  dateFrom: '', dateTo: '', timeFrom: '', timeTo: '',
  isFree: true, ticketPrice: '', capacity: '', bookingDeadline: '',
};

export default function CreateEvent() {
  const { activeRole } = useUser();
  const { data: categories = [], isLoading: categoriesLoading } = useEventCategoryOptions();
  const { data: cities = [] } = useCities();
  const [citySearch, setCitySearch] = useState('');

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY);
  /** Matches first, capped — the full list is far too long to render. */
  const visibleCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    const matches = q ? cities.filter(c => c.name.toLowerCase().includes(q)) : cities;
    const chosen = cities.filter(c => c.name === form.city);
    const rest = matches.filter(c => c.name !== form.city);
    return [...chosen, ...rest].slice(0, 30);
  }, [cities, citySearch, form.city]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState('');

  const [picking, setPicking] = useState<PickField | null>(null);

  const set = useCallback(<K extends keyof FormState>(k: K) => (v: FormState[K]) => {
    setForm(f => ({ ...f, [k]: v }));
  }, []);

  /**
   * Commits a picked date or time, keeping the three dates mutually consistent.
   *
   * `minimumDate`/`maximumDate` stop an invalid *initial* pick, but not a later
   * edit: choosing an end date and then pushing the start date past it would
   * otherwise leave an event that ends before it begins. Moving the start date
   * therefore drags the dependent fields with it.
   */
  const commitPick = useCallback((field: PickField, picked: Date) => {
    setForm(f => {
      if (field === 'timeFrom' || field === 'timeTo') {
        return { ...f, [field]: toHHMM(picked) };
      }
      const ymd = toYMD(picked);
      const next: FormState = { ...f, [field]: ymd };

      if (field === 'dateFrom') {
        const end = fromYMD(next.dateTo);
        if (end && end < picked) next.dateTo = ymd;
        const deadline = fromYMD(next.bookingDeadline);
        if (deadline && deadline > picked) next.bookingDeadline = ymd;
      }
      return next;
    });
  }, []);

  const onPick = useCallback((event: any, picked?: Date) => {
    const field = picking;
    setPicking(null);
    if (event?.type === 'dismissed' || !picked || !field) return;
    commitPick(field, picked);
  }, [picking, commitPick]);

  /** Bounds for whichever picker is open, so past dates cannot be chosen. */
  const pickerBounds = useCallback((field: PickField) => {
    const today = startOfToday();
    const from = fromYMD(form.dateFrom);
    if (field === 'dateFrom') return { min: today, max: undefined };
    // An event cannot end before it starts.
    if (field === 'dateTo') return { min: from && from > today ? from : today, max: undefined };
    // Bookings must close on or before the day the event opens.
    if (field === 'bookingDeadline') return { min: today, max: from ?? undefined };
    return { min: undefined, max: undefined };
  }, [form.dateFrom]);

  const pickerValue = useCallback((field: PickField): Date => {
    if (field === 'timeFrom' || field === 'timeTo') return fromHHMM(form[field]);
    const existing = fromYMD(form[field]);
    if (existing) return existing;
    // Seed from the bound rather than "now", so opening the end-date picker
    // lands on the start date instead of a date the picker will not accept.
    return pickerBounds(field).min ?? startOfToday();
  }, [form, pickerBounds]);

  const stepError = useCallback(() => stepErrorFor(step, form), [step, form]);

  const handleNext = useCallback(() => {
    const err = stepError();
    if (err) {
      Alert.alert('Check this step', err);
      return;
    }
    setStep(s => s + 1);
  }, [stepError]);

  const handleSubmit = useCallback(async () => {
    // The review step is reachable after editing earlier steps, and a draft
    // left open overnight can age its own start date into the past.
    for (const s of [0, 1, 2, 3]) {
      const err = stepErrorFor(s, form);
      if (err) {
        Alert.alert('Check your event', err);
        setStep(s);
        return;
      }
    }
    setLoading(true);
    try {
      const result = await EventService.createEvent({
        eventType: form.eventType,
        categoryId: form.categoryId,
        title: form.title,
        description: form.description,
        organiserName: form.organiserName,
        city: form.city,
        cityId: form.cityId || undefined,
        venue: form.venue,
        address: form.address,
        dateFrom: form.dateFrom,
        dateTo: form.dateTo,
        timeFrom: form.timeFrom,
        timeTo: form.timeTo,
        isFree: form.isFree,
        ticketPrice: form.isFree ? undefined : parseFloat(form.ticketPrice),
        capacity: form.capacity ? parseInt(form.capacity) : undefined,
        bookingDeadline: form.bookingDeadline,
      });
      setSubmissionId(result.submissionId ?? `EVT-2025-${Math.floor(1000 + Math.random() * 9000)}`);
      setSubmitted(true);
    } catch (e: any) {
      Alert.alert('Submission Failed', e.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [form]);

  // ── Role gate ──────────────────────────────────────────────────────────────
  //
  // The entry points to this screen are hidden unless the session is acting
  // as an artist, so arriving here without that role means a stale link or a
  // role switch mid-flow. Send them back rather than offering a form the
  // server will refuse at the last step.

  if (activeRole && activeRole !== 'ARTIST') {
    return <Redirect href="/(tabs)/events" />;
  }

  // ── Success screen ─────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }} />
        <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 60 }}>
          <View style={styles.successHero}>
            <LinearGradient colors={[Colors.gold + '44', Colors.gold + '11']} style={styles.successCircle}>
              <Text style={styles.successCheck}>✓</Text>
            </LinearGradient>
            <Text style={styles.successTitle}>Event Submitted!</Text>
            <Text style={styles.successSub}>
              Your event "{form.title}" has been submitted for review.
            </Text>
          </View>

          <LinearGradient colors={['#1C2F45', '#152236']} style={styles.submissionCard}>
            <View style={styles.goldLine} />
            {[
              ['Submission ID', `#${submissionId}`],
              ['Event', form.title],
              ['Status', 'Under Review'],
              ['Estimated Approval', '24–48 hours'],
            ].map(([k, v]) => (
              <View key={k} style={styles.subRow}>
                <Text style={styles.subKey}>{k}</Text>
                <Text style={[styles.subVal, k === 'Status' && { color: '#F6A723' }]}>{v}</Text>
              </View>
            ))}
          </LinearGradient>

          <View style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(tabs)/events' as any)}>
              <Text style={styles.primaryBtnText}>Browse Events</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => { setSubmitted(false); setStep(0); setForm(EMPTY); }}>
              <Text style={styles.ghostBtnText}>Create Another Event</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Wizard ─────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => step > 0 ? setStep(s => s - 1) : router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Event</Text>
          <Text style={styles.stepCount}>{step + 1}/{STEP_LABELS.length}</Text>
        </View>
        <StepBar step={step} total={STEP_LABELS.length} />
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: 140, gap: Spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.stepTitle}>{STEP_LABELS[step]}</Text>

        {/* Step 0 — Event Type */}
        {step === 0 && (
          categoriesLoading ? (
            <ActivityIndicator color={Colors.gold} style={{ marginTop: Spacing.xl }} />
          ) : categories.length === 0 ? (
            <Text style={styles.typeEmpty}>
              Event categories could not be loaded. Please check your connection and try again.
            </Text>
          ) : (
            <View style={styles.typeGrid}>
              {categories.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.typeCard, form.categoryId === c.id && styles.typeCardActive]}
                  onPress={() => setForm(f => ({ ...f, categoryId: c.id, eventType: c.name }))}
                  activeOpacity={0.8}
                >
                  <Text style={styles.typeEmoji}>{CATEGORY_EMOJI[c.name.toLowerCase()] ?? '🎪'}</Text>
                  <Text style={[styles.typeLabel, form.categoryId === c.id && { color: Colors.gold }]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )
        )}

        {/* Step 1 — Details */}
        {step === 1 && (
          <>
            <Field label="EVENT TITLE *">
              <TextInput style={styles.input} value={form.title} onChangeText={set('title')} placeholder="e.g. Mumbai Art Week 2025" placeholderTextColor={Colors.creamFaint} />
            </Field>
            <Field label="DESCRIPTION *">
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={form.description}
                onChangeText={set('description')}
                placeholder="Describe your event, what attendees can expect…"
                placeholderTextColor={Colors.creamFaint}
                multiline
                maxLength={1000}
              />
              <Text style={styles.charCount}>{form.description.length}/1000</Text>
            </Field>
            <Field label="ORGANISER / ARTIST NAME">
              <TextInput style={styles.input} value={form.organiserName} onChangeText={set('organiserName')} placeholder="Your name or organisation" placeholderTextColor={Colors.creamFaint} />
            </Field>
          </>
        )}

        {/* Step 2 — Date, Time & Venue */}
        {step === 2 && (
          <>
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Field label="START DATE *">
                  <PickerButton
                    value={showDate(form.dateFrom)}
                    placeholder="Select date"
                    onPress={() => setPicking('dateFrom')}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="END DATE">
                  <PickerButton
                    value={showDate(form.dateTo)}
                    placeholder="Same day"
                    onPress={() => setPicking('dateTo')}
                  />
                </Field>
              </View>
            </View>
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Field label="OPENING TIME">
                  <PickerButton
                    value={showTime(form.timeFrom)}
                    placeholder="Select time"
                    onPress={() => setPicking('timeFrom')}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="CLOSING TIME">
                  <PickerButton
                    value={showTime(form.timeTo)}
                    placeholder="Select time"
                    onPress={() => setPicking('timeTo')}
                  />
                </Field>
              </View>
            </View>
            <Field label="VENUE / GALLERY NAME *">
              <TextInput style={styles.input} value={form.venue} onChangeText={set('venue')} placeholder="e.g. NGMA Mumbai" placeholderTextColor={Colors.creamFaint} />
            </Field>
            <Field label="FULL ADDRESS *">
              <TextInput style={[styles.input, styles.inputMulti]} value={form.address} onChangeText={set('address')} placeholder="Street, area, landmark" placeholderTextColor={Colors.creamFaint} multiline />
            </Field>
            {/* 249 cities cannot be a chip rail you scroll through, so the
                list is typed down. The chosen city stays pinned first. */}
            <Field label="CITY *">
              <TextInput
                style={styles.input}
                value={citySearch}
                onChangeText={setCitySearch}
                placeholder={form.city || 'Search for a city'}
                placeholderTextColor={Colors.creamFaint}
                autoCorrect={false}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.sm }}>
                {visibleCities.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.cityChip, form.city === c.name && styles.cityChipActive]}
                    onPress={() => {
                      setForm(f => ({ ...f, city: c.name, cityId: c.id }));
                      setCitySearch('');
                    }}
                  >
                    <Text style={[styles.cityChipText, form.city === c.name && { color: Colors.gold }]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
                {visibleCities.length === 0 && (
                  <Text style={styles.cityChipText}>No city matches “{citySearch}”.</Text>
                )}
              </ScrollView>
            </Field>
          </>
        )}

        {/* Step 3 — Tickets */}
        {step === 3 && (
          <>
            <View style={styles.freeToggleRow}>
              <Text style={styles.freeToggleLabel}>This is a free event</Text>
              <Switch
                value={form.isFree}
                onValueChange={set('isFree')}
                trackColor={{ true: Colors.gold, false: Colors.border }}
                thumbColor={Colors.cream}
              />
            </View>
            {!form.isFree && (
              <Field label="TICKET PRICE (₹) *">
                <TextInput
                  style={styles.input}
                  value={form.ticketPrice}
                  onChangeText={set('ticketPrice')}
                  placeholder="e.g. 500"
                  placeholderTextColor={Colors.creamFaint}
                  keyboardType="numeric"
                />
              </Field>
            )}
            <Field label="TOTAL CAPACITY">
              <TextInput style={styles.input} value={form.capacity} onChangeText={set('capacity')} placeholder="Max attendees" placeholderTextColor={Colors.creamFaint} keyboardType="numeric" />
            </Field>
            <Field label="BOOKING DEADLINE">
              <PickerButton
                value={showDate(form.bookingDeadline)}
                placeholder={form.dateFrom ? 'Closes when the event starts' : 'Pick a start date first'}
                disabled={!form.dateFrom}
                onPress={() => setPicking('bookingDeadline')}
              />
            </Field>
          </>
        )}

        {/* Step 4 — Review */}
        {step === 4 && (
          <View style={styles.reviewCard}>
            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>Event Type</Text>
              <Text style={styles.reviewVal}>{form.eventType || '—'}</Text>
            </View>
            <View style={styles.reviewDivider} />
            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>Details</Text>
              <Text style={styles.reviewLabel}>Title</Text>
              <Text style={styles.reviewVal}>{form.title || '—'}</Text>
              {!!form.organiserName && <>
                <Text style={[styles.reviewLabel, { marginTop: Spacing.sm }]}>Organiser</Text>
                <Text style={styles.reviewVal}>{form.organiserName}</Text>
              </>}
              <Text style={[styles.reviewLabel, { marginTop: Spacing.sm }]}>Description</Text>
              <Text style={[styles.reviewVal, { color: Colors.creamDim }]} numberOfLines={3}>{form.description || '—'}</Text>
            </View>
            <View style={styles.reviewDivider} />
            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>Date & Venue</Text>
              {[
                ['Dates', [showDate(form.dateFrom), showDate(form.dateTo)].filter(Boolean).join(' → ')],
                ['Time', [showTime(form.timeFrom), showTime(form.timeTo)].filter(Boolean).join(' – ')],
                ['Venue', form.venue],
                ['City', form.city],
              ].map(([k, v]) => !!v && (
                <View key={k} style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>{k}</Text>
                  <Text style={styles.reviewVal}>{v}</Text>
                </View>
              ))}
            </View>
            <View style={styles.reviewDivider} />
            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>Tickets</Text>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Type</Text>
                <Text style={styles.reviewVal}>{form.isFree ? 'Free' : `₹${form.ticketPrice}`}</Text>
              </View>
              {!!form.capacity && (
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Capacity</Text>
                  <Text style={styles.reviewVal}>{form.capacity}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {picking && (
        <DateTimePicker
          value={pickerValue(picking)}
          mode={picking === 'timeFrom' || picking === 'timeTo' ? 'time' : 'date'}
          minimumDate={pickerBounds(picking).min}
          maximumDate={pickerBounds(picking).max}
          onChange={onPick}
        />
      )}

      <View style={styles.bottomBar}>
        {step < 4 ? (
          <GoldButton label={`Continue → ${STEP_LABELS[step + 1]}`} onPress={handleNext} fullWidth size="lg" />
        ) : loading ? (
          <ActivityIndicator color={Colors.gold} size="large" />
        ) : (
          <GoldButton label="Submit Event for Review" onPress={handleSubmit} fullWidth size="lg" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backIcon: { color: Colors.gold, fontSize: 22 },
  headerTitle: { ...Typography.display, fontSize: 20 },
  stepCount: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  stepTitle: { ...Typography.heading, fontSize: 24 },
  // Type grid
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  typeCard: { width: '48%', backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.border, padding: Spacing.md, alignItems: 'center', gap: Spacing.sm },
  typeCardActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '11' },
  typeEmoji: { fontSize: 32 },
  typeLabel: { ...Typography.bodySemibold, fontSize: 13, color: Colors.creamDim, textAlign: 'center' },
  // Fields
  field: { gap: 6 },
  fieldLabel: { ...Typography.label, fontSize: 9, color: Colors.gold },
  input: { backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, ...Typography.body, fontSize: 15, color: Colors.cream },
  inputMulti: { minHeight: 100, textAlignVertical: 'top' },
  charCount: { ...Typography.caption, fontSize: 11, color: Colors.creamFaint, textAlign: 'right', marginTop: 2 },
  row2: { flexDirection: 'row', gap: Spacing.sm },
  // Date/time picker fields — sized to match a single-line TextInput.
  typeEmpty: { ...Typography.body, fontSize: 14, color: Colors.creamDim, textAlign: 'center', marginTop: Spacing.xl },
  gate: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
  gateTitle: { ...Typography.heading, fontSize: 20, marginTop: Spacing.sm },
  gateText: { ...Typography.body, fontSize: 14, color: Colors.creamDim, textAlign: 'center', marginBottom: Spacing.md },
  gateBack: { ...Typography.bodySemibold, fontSize: 14, color: Colors.creamDim },
  pickerBtn: { justifyContent: 'center', minHeight: 50 },
  pickerBtnDisabled: { opacity: 0.5 },
  pickerValue: { ...Typography.body, fontSize: 15, color: Colors.cream },
  pickerPlaceholder: { ...Typography.body, fontSize: 15, color: Colors.creamFaint },
  // City chips
  cityChip: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard },
  cityChipActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '18' },
  cityChipText: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  // Ticket toggle
  freeToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },
  freeToggleLabel: { ...Typography.bodySemibold, fontSize: 15 },
  // Review
  reviewCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  reviewSection: { padding: Spacing.md, gap: Spacing.xs },
  reviewSectionTitle: { ...Typography.heading, fontSize: 16, color: Colors.gold, marginBottom: Spacing.xs },
  reviewDivider: { height: 1, backgroundColor: Colors.border },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  reviewLabel: { ...Typography.caption, fontSize: 12, color: Colors.creamDim },
  reviewVal: { ...Typography.bodySemibold, fontSize: 13, color: Colors.cream, flex: 1, textAlign: 'right' },
  // Success screen
  successHero: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.md },
  successCircle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.gold },
  successCheck: { fontSize: 40, color: Colors.gold, fontWeight: '700' },
  successTitle: { ...Typography.display, fontSize: 28 },
  successSub: { ...Typography.body, fontSize: 14, color: Colors.creamDim, textAlign: 'center', lineHeight: 20, paddingHorizontal: Spacing.md },
  submissionCard: { borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderGold, gap: Spacing.sm },
  goldLine: { width: 32, height: 2, backgroundColor: Colors.gold, marginBottom: Spacing.xs },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  subKey: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  subVal: { ...Typography.bodySemibold, fontSize: 13, color: Colors.cream, flex: 1, textAlign: 'right', marginLeft: Spacing.md },
  primaryBtn: { backgroundColor: Colors.gold, borderRadius: Radius.full, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { ...Typography.bodyBold, fontSize: 15, color: Colors.bg },
  ghostBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  ghostBtnText: { ...Typography.bodySemibold, fontSize: 14, color: Colors.gold },
  // Bottom bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.bgElevated, borderTopWidth: 1, borderTopColor: Colors.borderGold, padding: Spacing.md, paddingBottom: 28 },
});
