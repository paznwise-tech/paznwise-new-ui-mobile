import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { EventService } from '@/services/eventService';

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_LABELS = ['Type', 'Details', 'Date & Venue', 'Tickets', 'Review'];

const EVENT_TYPES = [
  { key: 'Art Exhibition',      emoji: '🖼' },
  { key: 'Live Performance',    emoji: '🎵' },
  { key: 'Workshop / Class',    emoji: '🎨' },
  { key: 'Art Fair / Market',   emoji: '🏪' },
  { key: 'Artist Talk / Panel', emoji: '🎤' },
  { key: 'Open Studio',         emoji: '🚪' },
];

const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Goa', 'Kochi', 'Chandigarh', 'Lucknow', 'Indore', 'Bhopal'];

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
  eventType: string;
  title: string;
  description: string;
  organiserName: string;
  city: string;
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
  eventType: '', title: '', description: '', organiserName: '',
  city: '', venue: '', address: '',
  dateFrom: '', dateTo: '', timeFrom: '', timeTo: '',
  isFree: true, ticketPrice: '', capacity: '', bookingDeadline: '',
};

export default function CreateEvent() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState('');

  const set = useCallback(<K extends keyof FormState>(k: K) => (v: FormState[K]) => {
    setForm(f => ({ ...f, [k]: v }));
  }, []);

  const canNext = useCallback(() => {
    if (step === 0) return !!form.eventType;
    if (step === 1) return !!form.title.trim() && !!form.description.trim();
    if (step === 2) return !!form.dateFrom && !!form.venue.trim() && !!form.city;
    if (step === 3) return form.isFree || !!form.ticketPrice;
    return true;
  }, [step, form]);

  const handleNext = useCallback(() => {
    if (!canNext()) {
      Alert.alert('Required', 'Please fill in all required fields before continuing.');
      return;
    }
    setStep(s => s + 1);
  }, [canNext]);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    try {
      const result = await EventService.createEvent({
        eventType: form.eventType,
        title: form.title,
        description: form.description,
        organiserName: form.organiserName,
        city: form.city,
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
          <View style={styles.typeGrid}>
            {EVENT_TYPES.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.typeCard, form.eventType === t.key && styles.typeCardActive]}
                onPress={() => set('eventType')(t.key)}
                activeOpacity={0.8}
              >
                <Text style={styles.typeEmoji}>{t.emoji}</Text>
                <Text style={[styles.typeLabel, form.eventType === t.key && { color: Colors.gold }]}>{t.key}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
                  <TextInput style={styles.input} value={form.dateFrom} onChangeText={set('dateFrom')} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.creamFaint} />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="END DATE">
                  <TextInput style={styles.input} value={form.dateTo} onChangeText={set('dateTo')} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.creamFaint} />
                </Field>
              </View>
            </View>
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Field label="OPENING TIME">
                  <TextInput style={styles.input} value={form.timeFrom} onChangeText={set('timeFrom')} placeholder="e.g. 10:00 AM" placeholderTextColor={Colors.creamFaint} />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="CLOSING TIME">
                  <TextInput style={styles.input} value={form.timeTo} onChangeText={set('timeTo')} placeholder="e.g. 8:00 PM" placeholderTextColor={Colors.creamFaint} />
                </Field>
              </View>
            </View>
            <Field label="VENUE / GALLERY NAME *">
              <TextInput style={styles.input} value={form.venue} onChangeText={set('venue')} placeholder="e.g. NGMA Mumbai" placeholderTextColor={Colors.creamFaint} />
            </Field>
            <Field label="FULL ADDRESS">
              <TextInput style={[styles.input, styles.inputMulti]} value={form.address} onChangeText={set('address')} placeholder="Street, area, landmark" placeholderTextColor={Colors.creamFaint} multiline />
            </Field>
            <Field label="CITY *">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: Spacing.sm, paddingVertical: 4 }}>
                {CITIES.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.cityChip, form.city === c && styles.cityChipActive]}
                    onPress={() => set('city')(c)}
                  >
                    <Text style={[styles.cityChipText, form.city === c && { color: Colors.gold }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
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
              <TextInput style={styles.input} value={form.bookingDeadline} onChangeText={set('bookingDeadline')} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.creamFaint} />
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
                ['Dates', [form.dateFrom, form.dateTo].filter(Boolean).join(' → ')],
                ['Time', [form.timeFrom, form.timeTo].filter(Boolean).join(' – ')],
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
