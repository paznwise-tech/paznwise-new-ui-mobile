import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const FAQS: FAQ[] = [
  // Buying
  { id: '1', category: 'Buying', question: 'How do I purchase artwork?', answer: 'Browse the marketplace, add items to your cart, and complete checkout. We accept Cash on Delivery and various online payment methods.' },
  { id: '2', category: 'Buying', question: 'Is the artwork authentic?', answer: 'All artworks on Paznwise are verified by our team. Each piece comes with a certificate of authenticity from the artist.' },
  { id: '3', category: 'Buying', question: 'What is your return policy?', answer: 'You can return artwork within 7 days of delivery if it arrives damaged or significantly differs from the listing. Contact our support team to initiate a return.' },
  { id: '4', category: 'Buying', question: 'How long does delivery take?', answer: 'Standard delivery takes 5–10 business days across India. For fragile or large pieces, we use specialist art handlers.' },
  // Hiring
  { id: '5', category: 'Hiring', question: 'How do I hire a performer?', answer: 'Go to the Hire tab, browse performers by category, and tap on one to create a booking request. Fill in your event details and submit.' },
  { id: '6', category: 'Hiring', question: 'How is pricing determined for performers?', answer: 'Performers set their own base rates. The final price includes the artist fee, travel & hospitality, and a 10% platform fee.' },
  { id: '7', category: 'Hiring', question: 'Can I cancel a booking?', answer: 'Bookings can be cancelled up to 48 hours before the event. Cancellations within 48 hours may be subject to a fee. Check the cancellation policy when booking.' },
  // Events
  { id: '8', category: 'Events', question: 'How do I register for an event?', answer: 'Tap on any event card, review the details, select your ticket type, and tap "Get Tickets". Your ticket will be saved under My Tickets.' },
  { id: '9', category: 'Events', question: 'Are event tickets refundable?', answer: 'This depends on the organizer\'s policy, which is shown on the event detail page. Some events offer full refunds up to 24 hours before the event.' },
  // Account
  { id: '10', category: 'Account', question: 'How do I change my password?', answer: 'Go to Settings → Change Password. You\'ll need your current password to set a new one.' },
  { id: '11', category: 'Account', question: 'How do I become a verified artist?', answer: 'Go to your Profile and tap "Register as Artist". Our team will review your portfolio and verify your account within 3–5 business days.' },
  { id: '12', category: 'Account', question: 'How do I sell my artwork?', answer: 'Complete seller setup in Settings, then go to your Profile → My Listings → Create Listing. Set your price, upload photos, and publish.' },
  // Payments
  { id: '13', category: 'Payments', question: 'What payment methods are accepted?', answer: 'We accept Cash on Delivery, UPI, credit/debit cards, and net banking for most transactions.' },
  { id: '14', category: 'Payments', question: 'When do sellers receive payment?', answer: 'Seller payouts are processed within 7 business days after the buyer confirms delivery.' },
];

const CATEGORIES = ['All', ...Array.from(new Set(FAQS.map(f => f.category)))];

export default function HelpCenter() {
  const [searchQ, setSearchQ]     = useState('');
  const [activeCat, setActiveCat] = useState('All');
  const [expanded, setExpanded]   = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = FAQS;
    if (activeCat !== 'All') list = list.filter(f => f.category === activeCat);
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      list = list.filter(f => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
    }
    return list;
  }, [searchQ, activeCat]);

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

        {/* Category pills */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catList}
        >
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, activeCat === cat && styles.catChipActive]}
              onPress={() => setActiveCat(cat)}
            >
              <Text style={[styles.catText, activeCat === cat && styles.catTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {filtered.length === 0 ? (
          <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
            <Text style={{ fontSize: 36 }}>🤔</Text>
            <Text style={styles.noResultText}>No results found</Text>
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
