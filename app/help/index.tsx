import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { FaqService } from '@/services/cmsService';

/**
 * Help centre.
 *
 * FAQs come from the admin-managed `/faqs` endpoint, so support content is
 * edited in one place and stays in step with the web app rather than being
 * shipped inside the bundle and going stale on its own schedule.
 *
 * The API's Faq model has no category field, so there are no category pills
 * — search covers both question and answer instead.
 */
export default function HelpCenter() {
  const [searchQ, setSearchQ]   = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: faqs = [], isLoading, error } = useQuery({
    queryKey: ['faqs'],
    queryFn: FaqService.getFaqs,
    staleTime: 30 * 60_000,
  });

  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter(
      f => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q),
    );
  }, [searchQ, faqs]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Help Center</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search FAQs…"
            placeholderTextColor={Colors.creamFaint}
            value={searchQ}
            onChangeText={setSearchQ}
          />
        </View>

      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {isLoading ? (
          <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
            <ActivityIndicator color={Colors.gold} />
          </View>
        ) : error ? (
          <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
            <Text style={styles.noResultText}>Could not load help articles.</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
            <Text style={{ fontSize: 36 }}>🤔</Text>
            <Text style={styles.noResultText}>
              {searchQ.trim() ? 'No results found' : 'No help articles yet'}
            </Text>
          </View>
        ) : (
          filtered.map(faq => {
            const open = expanded === faq.id;
            return (
              <TouchableOpacity
                key={faq.id}
                style={[styles.faqCard, open && styles.faqCardOpen]}
                onPress={() => setExpanded(open ? null : faq.id)}
                activeOpacity={0.8}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQ}>{faq.question}</Text>
                  <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
                </View>
                {open && (
                  <Text style={styles.faqA}>{faq.answer}</Text>
                )}
              </TouchableOpacity>
            );
          })
        )}

        {/* Contact CTA */}
        <View style={styles.contactCTA}>
          <Text style={styles.ctaTitle}>Still need help?</Text>
          <Text style={styles.ctaText}>Our support team is available Mon–Sat, 9 AM – 6 PM</Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/contact' as any)}>
            <Text style={styles.ctaBtnText}>Contact Support</Text>
          </TouchableOpacity>
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
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: Colors.bgCard, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
  },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, ...Typography.body, fontSize: 14, color: Colors.cream },
  catList: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  catChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 7,
    borderRadius: Radius.full, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.bgCard,
  },
  catChipActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '22' },
  catText: { ...Typography.caption, fontSize: 12, color: Colors.creamDim },
  catTextActive: { color: Colors.gold },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 100, gap: Spacing.sm },
  faqCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
  },
  faqCardOpen: { borderColor: Colors.gold },
  faqHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  faqQ: { ...Typography.bodySemibold, fontSize: 15, flex: 1, lineHeight: 22 },
  chevron: { color: Colors.gold, fontSize: 12, marginTop: 2 },
  faqA: { ...Typography.body, fontSize: 14, color: Colors.creamDim, lineHeight: 22, marginTop: Spacing.sm },
  noResultText: { ...Typography.heading, fontSize: 18, marginTop: Spacing.md },
  contactCTA: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.borderGold,
    padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md,
  },
  ctaTitle: { ...Typography.heading, fontSize: 20 },
  ctaText: { ...Typography.caption, fontSize: 13, textAlign: 'center' },
  ctaBtn: {
    backgroundColor: Colors.gold, borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl, paddingVertical: 10, marginTop: 4,
  },
  ctaBtnText: { ...Typography.bodyBold, fontSize: 14, color: Colors.bg },
});
