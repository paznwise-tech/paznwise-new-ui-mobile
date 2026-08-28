import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useMyReturns } from '@/hooks/useReturns';
import { returnStatusLabel, type ReturnRequest } from '@/services/returnsService';

/** Colour by outcome, so a rejected return does not read as an in-progress one. */
function statusColor(status: string): string {
  if (status === 'COMPLETED' || status === 'QC_PASSED') return Colors.success;
  if (status === 'REJECTED' || status === 'CANCELLED' || status === 'QC_FAILED') return Colors.error;
  return Colors.gold;
}

export default function MyReturns() {
  const { data: returns = [], isLoading, isRefetching, refetch } = useMyReturns();

  const renderItem = ({ item }: { item: ReturnRequest }) => {
    const color = statusColor(item.status);
    const itemCount = item.items?.length ?? 0;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => router.push(`/returns/${item.id}` as any)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.ref}>#{item.requestRef}</Text>
          <View style={[styles.badge, { borderColor: color, backgroundColor: color + '18' }]}>
            <Text style={[styles.badgeText, { color }]}>{returnStatusLabel(item.status)}</Text>
          </View>
        </View>

        <Text style={styles.line}>
          {itemCount} {itemCount === 1 ? 'item' : 'items'} · {item.resolutionType.toLowerCase()}
        </Text>
        <Text style={styles.date}>
          Raised {new Date(item.requestedAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </Text>

        {item.rejectionReason ? (
          <Text style={styles.rejection} numberOfLines={2}>{item.rejectionReason}</Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Returns</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.gold} size="large" /></View>
      ) : (
        <FlatList
          data={returns}
          keyExtractor={r => r.id}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.gold} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 44 }}>📦</Text>
              <Text style={styles.emptyTitle}>No returns</Text>
              <Text style={styles.emptyText}>
                You can raise a return from any delivered order.
              </Text>
              <TouchableOpacity style={{ marginTop: Spacing.md }} onPress={() => router.push('/orders' as any)}>
                <Text style={{ color: Colors.gold }}>Go to my orders →</Text>
              </TouchableOpacity>
            </View>
          }
        />
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
  title: { ...Typography.display, fontSize: 22 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  ref: { ...Typography.bodySemibold, fontSize: 14 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1 },
  badgeText: { ...Typography.label, fontSize: 9 },
  line: { ...Typography.body, fontSize: 13, color: Colors.creamDim, textTransform: 'capitalize' },
  date: { ...Typography.caption, fontSize: 12, marginTop: 2 },
  rejection: { ...Typography.caption, fontSize: 12, color: Colors.error, marginTop: 6 },

  empty: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyTitle: { ...Typography.heading, fontSize: 18, marginTop: Spacing.md },
  emptyText: { ...Typography.caption, fontSize: 13, marginTop: 4, textAlign: 'center' },
});
