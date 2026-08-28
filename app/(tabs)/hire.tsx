import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { PerformerCard } from '@/components/artist/PerformerCard';
import { usePerformerCategories } from '@/hooks/useTaxonomy';
import { Performer } from '@/types';
import { ArtistServiceApi } from '@/services/artistService';

const ALL_TYPE = { key: 'All', label: 'All', emoji: '✦' };

// The API has no icon per service category, so one is chosen by name and
// falls back to a neutral mask rather than leaving the chip bare.
const TYPE_EMOJI: Record<string, string> = {
  paint: '🎨', art: '🎨', music: '🎵', musician: '🎵', sing: '🎤',
  danc: '💃', magic: '🎩', dj: '🎧', mehendi: '🌿', henna: '🌿',
  comedy: '😂', standup: '🎤', theatre: '🎭', drama: '🎭', photo: '📷',
};

function emojiFor(label: string): string {
  const lower = label.toLowerCase();
  for (const [needle, emoji] of Object.entries(TYPE_EMOJI)) {
    if (lower.includes(needle)) return emoji;
  }
  return '🎭';
}

export default function Hire() {
  const [services, setServices] = useState<Array<Performer & { serviceId: string }>>([]);
  const [loading, setLoading]   = useState(true);
  const [active, setActive]     = useState(ALL_TYPE.key);

  const { data: apiCategories = [] } = usePerformerCategories();

  const types = useMemo(
    () => [ALL_TYPE, ...apiCategories.map(c => ({ key: c.key, label: c.label, emoji: emojiFor(c.label) }))],
    [apiCategories],
  );

  // Filtering is done by the API. The previous fuzzy substring match over a
  // hardcoded type list both missed real categories and matched wrong ones.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    ArtistServiceApi.getServices({ limit: 50, category: active })
      .then(data => { if (!cancelled) setServices(data); })
      .catch(() => { if (!cancelled) setServices([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [active]);

  const filtered = services;

  const handlePerformerPress = useCallback((serviceId: string) => {
    router.push(`/booking/${serviceId}` as any);
  }, []);

  const renderPerformerItem = useCallback(({ item }: { item: Performer & { serviceId: string } }) => (
    <PerformerCard item={item} onPress={() => handlePerformerPress(item.serviceId)} />
  ), [handlePerformerPress]);

  const renderTypeItem = useCallback(({ item }: { item: { key: string; label: string; emoji: string } }) => (
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

        <FlatList
          data={types}
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeList}
          keyExtractor={i => i.key}
          renderItem={renderTypeItem}
          initialNumToRender={8}
        />
      </SafeAreaView>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          keyExtractor={i => i.serviceId}
          renderItem={renderPerformerItem}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={4}
          removeClippedSubviews={true}
          ListEmptyComponent={
            <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
              <Text style={{ ...Typography.body, fontSize: 14, color: Colors.creamDim }}>
                No performers found
              </Text>
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
