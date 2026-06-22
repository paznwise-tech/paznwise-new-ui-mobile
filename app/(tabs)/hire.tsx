import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { PerformerCard } from '@/components/PerformerCard';
import { PERFORMERS, PERFORMER_TYPES } from '@/constants/data';

export default function Hire() {
  const [active, setActive] = useState('All');

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
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.typeChip, active === item.key && styles.typeChipActive]}
              onPress={() => setActive(item.key)}
            >
              <Text style={styles.typeEmoji}>{item.emoji}</Text>
              <Text style={[styles.typeLabel, active === item.key && { color: Colors.gold }]}>{item.label}</Text>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>

      <FlatList
        data={PERFORMERS}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        keyExtractor={i => String(i.id)}
        renderItem={({ item }) => (
          <PerformerCard item={item} onPress={() => router.push(`/book/${item.id}` as any)} />
        )}
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
