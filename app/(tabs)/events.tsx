import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { EventCard } from '@/components/EventCard';
import { EVENTS } from '@/constants/data';

const CATS = ['All', 'Exhibition', 'Performance', 'Workshop', 'Live'];
const CITIES = ['All Cities', 'Mumbai', 'Delhi', 'Bangalore', 'Goa'];

export default function Events() {
  const [cat, setCat]   = useState('All');
  const [city, setCity] = useState('All Cities');

  const filtered = EVENTS.filter(e =>
    (cat === 'All' || e.category === cat) &&
    (city === 'All Cities' || e.city === city)
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.accent} />
            <Text style={styles.title}>Events</Text>
          </View>
          <Text style={styles.sub}>{filtered.length} events across India</Text>
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

      <FlatList
        data={filtered}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyExtractor={i => String(i.id)}
        renderItem={({ item }) => <EventCard item={item} onPress={() => {}} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No events found</Text>
            <TouchableOpacity onPress={() => { setCat('All'); setCity('All Cities'); }}>
              <Text style={{ color: Colors.gold, ...Typography.bodySemibold, fontSize: 14 }}>Clear filters</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  accent: { width: 3, height: 28, backgroundColor: Colors.gold, borderRadius: 2 },
  title: { ...Typography.display, fontSize: 26 },
  sub: { ...Typography.caption, fontSize: 12 },
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
  empty: { padding: Spacing.xxl, alignItems: 'center', gap: Spacing.md },
  emptyTitle: { ...Typography.heading, fontSize: 18 },
});
