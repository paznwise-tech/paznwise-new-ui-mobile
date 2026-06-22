import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

const BOOKINGS = [
  { id: 'BK-001', performer: 'Priya Sharma', type: 'Live Painting', date: 'Jul 24, 2026', venue: 'Taj Falaknuma', total: '₹9,350', status: 'confirmed', img: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=300&h=200&fit=crop' },
  { id: 'BK-002', performer: 'Ananya Krishnan', type: 'Dance', date: 'Aug 15, 2026', venue: 'ITC Grand Chola', total: '₹11,800', status: 'pending', img: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=300&h=200&fit=crop' },
  { id: 'BK-003', performer: 'Kavya Menon', type: 'Mehendi', date: 'Jun 2, 2026', venue: 'Bandra, Mumbai', total: '₹4,200', status: 'completed', img: 'https://images.unsplash.com/photo-1583467875522-d48a15d26c55?w=300&h=200&fit=crop' },
];

const STATUS_COLORS: Record<string, string> = {
  confirmed: '#4CAF7D',
  pending:   '#F6A723',
  completed: Colors.gold,
  cancelled: '#E05252',
};

const TABS = ['All', 'Upcoming', 'Completed'];

export default function MyBookings() {
  const [tab, setTab] = useState('All');

  const filtered = BOOKINGS.filter(b => {
    if (tab === 'Upcoming')  return b.status === 'confirmed' || b.status === 'pending';
    if (tab === 'Completed') return b.status === 'completed';
    return true;
  });

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>My Bookings</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.tabs}>
          {TABS.map(t => (
            <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      <FlatList
        data={filtered}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.85}>
            <Image source={{ uri: item.img }} style={styles.cardImg} contentFit="cover" transition={300} />
            <View style={styles.cardBody}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.performer}</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '22', borderColor: STATUS_COLORS[item.status] }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.cardType}>{item.type}</Text>
              <View style={styles.cardMeta}>
                <Text style={styles.cardMetaText}>📅 {item.date}</Text>
                <Text style={styles.cardMetaText}>📍 {item.venue}</Text>
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.cardTotal}>{item.total}</Text>
                <TouchableOpacity style={styles.viewBtn}>
                  <Text style={styles.viewBtnText}>View details →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backIcon: { color: Colors.gold, fontSize: 22 },
  title: { ...Typography.display, fontSize: 22 },
  tabs: { flexDirection: 'row', marginHorizontal: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: 4 },
  tab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.sm },
  tabActive: { backgroundColor: Colors.bgElevated },
  tabText: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  tabTextActive: { color: Colors.cream, fontFamily: 'Inter_600SemiBold' },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 100, gap: Spacing.sm },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  cardImg: { width: '100%', height: 120 },
  cardBody: { padding: Spacing.md, gap: Spacing.xs },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { ...Typography.heading, fontSize: 17 },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.sm, borderWidth: 1 },
  statusText: { ...Typography.label, fontSize: 9 },
  cardType: { ...Typography.caption, fontSize: 12 },
  cardMeta: { flexDirection: 'row', gap: Spacing.md },
  cardMetaText: { ...Typography.caption, fontSize: 11 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  cardTotal: { ...Typography.bodyBold, fontSize: 16, color: Colors.gold },
  viewBtn: {},
  viewBtnText: { ...Typography.label, fontSize: 10, color: Colors.gold },
});
