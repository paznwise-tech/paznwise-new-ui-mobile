import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { ArtCard } from '@/components/ArtCard';
import { ARTWORKS, CATEGORIES } from '@/constants/data';

const SORT_OPTIONS = ['Newest', 'Price ↑', 'Price ↓', 'Top Rated'];

export default function Browse() {
  const [q, setQ]             = useState('');
  const [activeCategory, setCat] = useState('All');
  const [sort, setSort]       = useState('Newest');
  const [showSort, setShowSort] = useState(false);

  const filtered = ARTWORKS.filter(a => {
    const matchQ = !q || a.title.toLowerCase().includes(q.toLowerCase()) || a.artist.toLowerCase().includes(q.toLowerCase());
    const matchCat = activeCategory === 'All' || a.category === activeCategory;
    return matchQ && matchCat;
  });

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <Text style={styles.title}>Browse Art</Text>
          <Text style={styles.count}>{filtered.length} artworks</Text>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              value={q} onChangeText={setQ}
              placeholder="Search artworks, artists…"
              placeholderTextColor={Colors.creamFaint}
              style={styles.searchInput}
            />
            {q ? <TouchableOpacity onPress={() => setQ('')}><Text style={styles.clearIcon}>✕</Text></TouchableOpacity> : null}
          </View>
          <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSort(!showSort)}>
            <Text style={styles.sortIcon}>⇅</Text>
          </TouchableOpacity>
        </View>

        {/* Sort dropdown */}
        {showSort && (
          <View style={styles.sortDropdown}>
            {SORT_OPTIONS.map(s => (
              <TouchableOpacity key={s} style={[styles.sortOption, sort === s && styles.sortOptionActive]} onPress={() => { setSort(s); setShowSort(false); }}>
                <Text style={[styles.sortOptionText, sort === s && { color: Colors.gold }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Category pills */}
        <FlatList
          data={CATEGORIES}
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catList}
          keyExtractor={i => i.label}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.catChip, activeCategory === item.label && { backgroundColor: item.color + '22', borderColor: item.color }]}
              onPress={() => setCat(item.label)}
            >
              <Text style={[styles.catText, activeCategory === item.label && { color: item.color }]}>{item.label}</Text>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>

      {/* Grid */}
      <FlatList
        data={filtered}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        keyExtractor={i => String(i.id)}
        renderItem={({ item }) => (
          <ArtCard item={item} onPress={() => router.push(`/artwork/${item.id}` as any)} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No artworks found</Text>
            <Text style={styles.emptyText}>Try a different search or category</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.xs, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { ...Typography.display, fontSize: 26 },
  count: { ...Typography.caption, fontSize: 12 },
  searchRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.bgInput, borderRadius: Radius.full, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, height: 44 },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, ...Typography.body, fontSize: 14, color: Colors.cream },
  clearIcon: { color: Colors.creamDim, fontSize: 14 },
  sortBtn: { width: 44, height: 44, backgroundColor: Colors.bgCard, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  sortIcon: { color: Colors.gold, fontSize: 18 },
  sortDropdown: { marginHorizontal: Spacing.md, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm, overflow: 'hidden' },
  sortOption: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sortOptionActive: { backgroundColor: Colors.bgCard },
  sortOptionText: { ...Typography.body, fontSize: 14, color: Colors.creamDim },
  catList: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  catChip: { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard },
  catText: { ...Typography.caption, fontSize: 12, color: Colors.creamDim },
  grid: { paddingHorizontal: Spacing.md, paddingBottom: 100 },
  row: { gap: Spacing.sm, justifyContent: 'space-between' },
  empty: { padding: Spacing.xxl, alignItems: 'center' },
  emptyTitle: { ...Typography.heading, fontSize: 18, marginBottom: Spacing.sm },
  emptyText: { ...Typography.caption, fontSize: 14 },
});
