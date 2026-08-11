import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { EventCard } from '@/components/events/EventCard';
import { EventService } from '@/services/eventService';
import { Event } from '@/types';

const CATS   = ['All', 'Exhibition', 'Performance', 'Workshop', 'Live'];
const CITIES = ['All Cities', 'Mumbai', 'Delhi', 'Bangalore', 'Goa'];

export default function Events() {
  const [cat, setCat]       = useState('All');
  const [city, setCity]     = useState('All Cities');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await EventService.getEvents({ category: cat, city });
      setEvents(data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [cat, city]);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.accent} />
            <Text style={styles.title}>Events</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.sub}>
              {loading ? 'Loading…' : `${events.length} events`}
            </Text>
            <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/events/create' as any)}>
              <Text style={styles.createBtnText}>+ Create</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Category filter */}
        <FlatList
          data={CATS}
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          keyExtractor={i => i}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, cat === item && styles.chipActive]}
              onPress={() => setCat(item)}
            >
              <Text style={[styles.chipText, cat === item && styles.chipTextActive]}>{item}</Text>
            </TouchableOpacity>
          )}
        />

        {/* City filter */}
        <FlatList
          data={CITIES}
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          keyExtractor={i => i}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.cityChip, city === item && styles.cityChipActive]}
              onPress={() => setCity(item)}
            >
              <Text style={[styles.cityText, city === item && styles.cityTextActive]}>📍 {item}</Text>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>


        <View style={styles.center}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load} style={{ marginTop: Spacing.md }}>
            <Text style={{ ...Typography.bodySemibold, color: Colors.gold, fontSize: 14 }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={events}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyExtractor={(i, index) => `${i.id}-${index}`}
          renderItem={({ item }) => (
            <EventCard item={item} onPress={() => router.push(`/events/${item.id}` as any)} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No events found</Text>
              <TouchableOpacity onPress={() => { setCat('All'); setCity('All Cities'); }}>
                <Text style={{ ...Typography.bodySemibold, color: Colors.gold, fontSize: 14 }}>Clear filters</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  headerRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accent: { width: 3, height: 28, backgroundColor: Colors.gold, borderRadius: 2 },
  title: { ...Typography.display, fontSize: 26 },
  sub: { ...Typography.caption, fontSize: 12 },
  createBtn: { backgroundColor: Colors.gold, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  createBtnText: { ...Typography.bodyBold, fontSize: 13, color: Colors.bg },
  filterList: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard },
  chipActive: { backgroundColor: Colors.gold + '22', borderColor: Colors.gold },
  chipText: { ...Typography.caption, fontSize: 12, color: Colors.creamDim },
  chipTextActive: { color: Colors.gold },
  cityChip: { paddingHorizontal: Spacing.sm, paddingVertical: 5, borderRadius: Radius.md, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  cityChipActive: { borderColor: Colors.gold },
  cityText: { ...Typography.caption, fontSize: 11, color: Colors.creamDim },
  cityTextActive: { color: Colors.gold },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 100, gap: Spacing.sm },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  errorText: { ...Typography.body, fontSize: 14, color: Colors.error, textAlign: 'center' },
  empty: { padding: Spacing.xxl, alignItems: 'center', gap: Spacing.md },
  emptyTitle: { ...Typography.heading, fontSize: 18 },
});
