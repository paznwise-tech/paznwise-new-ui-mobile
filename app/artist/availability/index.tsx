import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { ArtistServiceApi } from '@/services/artistService';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TIME_SLOTS = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function ManageAvailability() {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [availableSlots, setAvailableSlots] = useState<string[]>(['09:00 AM', '10:00 AM', '02:00 PM', '06:00 PM']);
  const [saving, setSaving] = useState(false);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay    = getFirstDayOfMonth(year, month);
  const calendarDays = useMemo(() => {
    const blanks = Array(firstDay).fill(null);
    const days   = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    return [...blanks, ...days];
  }, [daysInMonth, firstDay]);

  const prevMonth = useCallback(() => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }, [month]);

  const nextMonth = useCallback(() => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }, [month]);

  const toggleDate = useCallback((day: number) => {
    const key = dateKey(year, month, day);
    const today = new Date();
    const d = new Date(year, month, day);
    if (d < today) return;
    setBlockedDates(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, [year, month]);

  const toggleSlot = useCallback((slot: string) => {
    setAvailableSlots(prev =>
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    );
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await ArtistServiceApi.setAvailability(Array.from(blockedDates), availableSlots);
      Alert.alert('Saved', 'Your availability has been updated');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [blockedDates, availableSlots]);

  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Availability</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.hint}>Tap a date to mark it as unavailable (blocked dates shown in red)</Text>

        {/* Month navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity style={styles.monthBtn} onPress={prevMonth}>
            <Text style={styles.monthBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{MONTHS[month]} {year}</Text>
          <TouchableOpacity style={styles.monthBtn} onPress={nextMonth}>
            <Text style={styles.monthBtnText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Calendar */}
        <View style={styles.calendar}>
          {/* Day headers */}
          {DAYS.map(d => (
            <View key={d} style={styles.dayHeader}>
              <Text style={styles.dayHeaderText}>{d}</Text>
            </View>
          ))}
          {/* Calendar cells */}
          {calendarDays.map((day, idx) => {
            if (!day) return <View key={`blank-${idx}`} style={styles.dayCell} />;
            const key = dateKey(year, month, day);
            const isBlocked = blockedDates.has(key);
            const isToday = key === todayKey;
            const isPast = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.dayCell,
                  isToday && styles.dayCellToday,
                  isBlocked && styles.dayCellBlocked,
                  isPast && styles.dayCellPast,
                ]}
                onPress={() => !isPast && toggleDate(day)}
                disabled={isPast}
              >
                <Text style={[
                  styles.dayCellText,
                  isToday && styles.dayCellTextToday,
                  isBlocked && styles.dayCellTextBlocked,
                  isPast && styles.dayCellTextPast,
                ]}>
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.bgCard }]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.error }]} />
            <Text style={styles.legendText}>Blocked</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.gold }]} />
            <Text style={styles.legendText}>Today</Text>
          </View>
        </View>

        {/* Time slots */}
        <Text style={styles.sectionTitle}>Available Time Slots</Text>
        <Text style={styles.sectionSubtext}>Select which hours you're open for bookings</Text>
        <View style={styles.slotGrid}>
          {TIME_SLOTS.map(slot => {
            const active = availableSlots.includes(slot);
            return (
              <TouchableOpacity
                key={slot}
                style={[styles.slotChip, active && styles.slotChipActive]}
                onPress={() => toggleSlot(slot)}
              >
                <Text style={[styles.slotText, active && styles.slotTextActive]}>{slot}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ marginTop: Spacing.md }}>
          <GoldButton
            label={saving ? 'Saving…' : 'Save Availability'}
            onPress={handleSave}
            size="lg"
            fullWidth
            disabled={saving}
          />
        </View>
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
  content: { padding: Spacing.md, paddingBottom: 100, gap: Spacing.md },
  hint: { ...Typography.caption, fontSize: 13, textAlign: 'center' },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthBtn: { padding: Spacing.md },
  monthBtnText: { color: Colors.gold, fontSize: 28, fontFamily: 'Inter_600SemiBold' },
  monthLabel: { ...Typography.heading, fontSize: 20 },
  calendar: {
    flexDirection: 'row', flexWrap: 'wrap',
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.sm,
  },
  dayHeader: { width: '14.28%', alignItems: 'center', paddingVertical: 6 },
  dayHeaderText: { ...Typography.label, fontSize: 9 },
  dayCell: {
    width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.sm, margin: 0,
  },
  dayCellToday: { backgroundColor: Colors.gold + '33', borderWidth: 1, borderColor: Colors.gold },
  dayCellBlocked: { backgroundColor: Colors.error + '33', borderWidth: 1, borderColor: Colors.error },
  dayCellPast: { opacity: 0.3 },
  dayCellText: { ...Typography.body, fontSize: 14, color: Colors.cream },
  dayCellTextToday: { color: Colors.gold, fontFamily: 'Inter_700Bold' },
  dayCellTextBlocked: { color: Colors.error },
  dayCellTextPast: { color: Colors.creamDim },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { ...Typography.caption, fontSize: 12 },
  sectionTitle: { ...Typography.heading, fontSize: 20 },
  sectionSubtext: { ...Typography.caption, fontSize: 13, marginTop: -Spacing.sm },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  slotChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  slotChipActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '22' },
  slotText: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  slotTextActive: { color: Colors.gold, fontFamily: 'Inter_600SemiBold' },
});
