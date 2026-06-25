import { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { PerformerCard } from '@/components/PerformerCard';
import { PERFORMER_TYPES } from '@/constants/data';
import { useAppData } from '@/context/AppContext';
import { Performer } from '@/types';

export default function Hire() {
  const { performers } = useAppData();
  const [active, setActive] = useState('All');

  const filtered = useMemo(() => {
    if (active === 'All') return performers;
    return performers.filter(p => p.type.toLowerCase().includes(active.toLowerCase()) || active.toLowerCase().includes(p.type.toLowerCase()));
  }, [performers, active]);

  const handlePerformerPress = useCallback((id: number) => {
    router.push(`/book/${id}` as any);
  }, []);

  const renderPerformerItem = useCallback(({ item }: { item: Performer }) => (
    <PerformerCard item={item} onPress={() => handlePerformerPress(item.id)} />
  ), [handlePerformerPress]);

  const renderTypeItem = useCallback(({ item }: { item: typeof PERFORMER_TYPES[0] | { key: string; label: string; emoji: string } }) => (
    <TouchableOpacity
      style={[styles.typeChip, active === item.key && styles.typeChipActive]}
      onPress={() => setActive(item.key)}
    >
      <Text style={styles.typeEmoji}>{item.emoji}</Text>
      <Text style={[styles.typeLabel, active === item.key && { color: Colors.gold }]}>{item.label}</Text>
    </TouchableOpacity>
  ), [active]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.accent} />
            <Text style={styles.title}>Hire a Performer</Text>
          </View>
          <Text style={styles.sub}>For weddings, events & celebrations</Text>
        </View>

        {/* Performer type grid */}
        <FlatList
          data={[{ key: 'All', label: 'All', emoji: '✦' }, ...PERFORMER_TYPES]}
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeList}
          keyExtractor={i => i.key}
          renderItem={renderTypeItem}
          initialNumToRender={8}
        />
      </SafeAreaView>

      <FlatList
        data={filtered}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        keyExtractor={i => String(i.id)}
        renderItem={renderPerformerItem}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={4}
        removeClippedSubviews={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  accent: { width: 3, height: 28, backgroundColor: Colors.gold, borderRadius: 2 },
  title: { ...Typography.display, fontSize: 24 },
  sub: { ...Typography.caption, fontSize: 12 },
  typeList: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  typeChip: { alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, minWidth: 70 },
  typeChipActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '15' },
  typeEmoji: { fontSize: 18 },
  typeLabel: { ...Typography.caption, fontSize: 11, color: Colors.creamDim },
  grid: { paddingHorizontal: Spacing.md, paddingBottom: 100, gap: Spacing.sm },
  row: { gap: Spacing.sm, justifyContent: 'space-between' },
});
