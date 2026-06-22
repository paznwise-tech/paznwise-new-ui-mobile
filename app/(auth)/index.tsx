// Onboarding — 3 slides showcasing Indian art heritage
import { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity, ViewToken } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/GoldButton';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    img: 'https://images.unsplash.com/photo-1719498481736-c125dfa45b03?w=800&h=1200&fit=crop',
    eyebrow: 'Discover',
    title: 'India\'s Finest\nOriginal Art',
    sub: 'From Madhubani to Pattachitra — 10,000+ verified artworks by Indian masters',
  },
  {
    id: '2',
    img: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=1200&fit=crop',
    eyebrow: 'Experience',
    title: 'Book Live\nPerformers',
    sub: 'Musicians, dancers, Mehendi artists & more for your weddings and events',
  },
  {
    id: '3',
    img: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=1200&fit=crop',
    eyebrow: 'Create & Earn',
    title: 'Sell Your\nArtwork',
    sub: 'Join 500+ artists reaching collectors across India and beyond',
  },
];

export default function Onboarding() {
  const [active, setActive] = useState(0);
  const listRef = useRef<FlatList>(null);

  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]) setActive(viewableItems[0].index ?? 0);
  }).current;

  const next = () => {
    if (active < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: active + 1 });
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Image source={{ uri: item.img }} style={styles.bg} contentFit="cover" />
            <LinearGradient
              colors={['rgba(13,27,42,0.2)', 'rgba(13,27,42,0.6)', Colors.bg]}
              locations={[0, 0.5, 1]}
              style={styles.overlay}
            />
          </View>
        )}
      />

      {/* Content — fixed over slides */}
      <View style={styles.content}>
        {/* Decorative line */}
        <View style={styles.decorLine} />

        <Text style={styles.eyebrow}>{SLIDES[active].eyebrow}</Text>
        <Text style={styles.title}>{SLIDES[active].title}</Text>
        <Text style={styles.sub}>{SLIDES[active].sub}</Text>

        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, active === i && styles.dotActive]} />
          ))}
        </View>

        {/* CTA */}
        <GoldButton label={active === SLIDES.length - 1 ? 'Get Started' : 'Continue'} onPress={next} size="lg" fullWidth />
        <TouchableOpacity style={styles.skip} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.skipText}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  slide: { width, height },
  bg: { ...StyleSheet.absoluteFillObject },
  overlay: { ...StyleSheet.absoluteFillObject },
  content: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 48,
  },
  decorLine: {
    width: 40, height: 2,
    backgroundColor: Colors.gold,
    marginBottom: Spacing.md,
  },
  eyebrow: {
    ...Typography.label,
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.display,
    fontSize: 42,
    lineHeight: 46,
    marginBottom: Spacing.md,
  },
  sub: {
    ...Typography.body,
    fontSize: 15,
    color: Colors.creamDim,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing.xl,
  },
  dot: {
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: Colors.creamFaint,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.gold,
  },
  skip: { marginTop: Spacing.md, alignItems: 'center' },
  skipText: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
});
