import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/GoldButton';

const STEPS = ['Profile', 'Terms & Fee', 'Artwork', 'Review'];

export default function Sell() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Sell Artwork</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Step bar */}
        <View style={styles.stepBar}>
          {STEPS.map((s, i) => (
            <View key={s} style={styles.stepItem}>
              <View style={[styles.stepDot, i === 0 && styles.stepDotActive]}>
                <Text style={[styles.stepNum, i === 0 && styles.stepNumActive]}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepLabel, i === 0 && { color: Colors.gold }]}>{s}</Text>
              {i < STEPS.length - 1 && <View style={styles.stepLine} />}
            </View>
          ))}
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Hero card */}
        <LinearGradient colors={['#1C2F45', Colors.bg]} style={styles.heroCard}>
          <View style={styles.heroGoldLine} />
          <Text style={styles.heroEyebrow}>Artist Profile Setup</Text>
          <Text style={styles.heroTitle}>Step 1 of 4</Text>
          <Text style={styles.heroSub}>Tell collectors about yourself and your art practice</Text>
        </LinearGradient>

        <View style={styles.form}>
          {[
            { label: 'Display Name *',   placeholder: 'e.g. Priya Sharma'            },
            { label: 'City / Location *', placeholder: 'e.g. Mumbai, Maharashtra'     },
            { label: 'Your Art Style *',  placeholder: 'e.g. Contemporary Oil Painter' },
          ].map(f => (
            <View key={f.label} style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <TextInput placeholder={f.placeholder} placeholderTextColor={Colors.creamFaint} style={styles.input} />
            </View>
          ))}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Artist Bio *</Text>
            <TextInput
              placeholder="Tell collectors your story — your background, inspiration, and technique…"
              placeholderTextColor={Colors.creamFaint}
              multiline numberOfLines={5}
              style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
            />
          </View>

          {/* Specialisations */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Specialisations</Text>
            <View style={styles.tagRow}>
              {['Oil Painting', 'Watercolour', 'Acrylic', 'Sculpture', 'Digital Art', 'Photography'].map(tag => (
                <TouchableOpacity key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <GoldButton label="Continue →" onPress={() => {}} size="lg" fullWidth />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backIcon: { color: Colors.gold, fontSize: 22 },
  title: { ...Typography.display, fontSize: 22 },
  stepBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  stepItem: { alignItems: 'center', gap: 4, position: 'relative' },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  stepNum: { ...Typography.bodyBold, fontSize: 12, color: Colors.creamDim },
  stepNumActive: { color: Colors.bg },
  stepLabel: { ...Typography.caption, fontSize: 9, color: Colors.creamDim, textAlign: 'center', width: 60 },
  stepLine: { position: 'absolute', top: 14, left: 44, width: 30, height: 1.5, backgroundColor: Colors.border },
  heroCard: { margin: Spacing.md, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderGold },
  heroGoldLine: { width: 32, height: 2, backgroundColor: Colors.gold, marginBottom: Spacing.md },
  heroEyebrow: { ...Typography.label, marginBottom: Spacing.xs },
  heroTitle: { ...Typography.display, fontSize: 28, marginBottom: Spacing.sm },
  heroSub: { ...Typography.caption, fontSize: 14, color: Colors.creamDim, lineHeight: 20 },
  form: { paddingHorizontal: Spacing.md, gap: Spacing.md },
  fieldGroup: { gap: Spacing.xs },
  fieldLabel: { ...Typography.label, fontSize: 10, color: Colors.creamDim },
  input: { backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, ...Typography.body, fontSize: 14, color: Colors.cream },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard },
  tagText: { ...Typography.caption, fontSize: 12, color: Colors.creamDim },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.bgElevated, borderTopWidth: 1, borderTopColor: Colors.borderGold, padding: Spacing.md, paddingBottom: 28 },
});
