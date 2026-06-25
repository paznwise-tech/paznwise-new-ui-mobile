import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Radius, Spacing } from '@/constants/theme';
import { Event } from '@/types';

const { width } = Dimensions.get('window');

interface EventCardProps {
  item: Event;
  onPress: () => void;
  horizontal?: boolean;
}

export const EventCard = React.memo(function EventCard({ item, onPress, horizontal }: EventCardProps) {
  const cardWidth = horizontal ? width * 0.72 : width - Spacing.md * 2;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.card, { width: cardWidth }]}
      activeOpacity={0.85}
    >
      <View style={styles.imageWrap}>
        <Image source={{ uri: item.img }} style={styles.image} contentFit="cover" transition={300} />
        <LinearGradient colors={['transparent', 'rgba(13,27,42,0.95)']} style={styles.gradient} />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.category}</Text>
        </View>
        <View style={styles.overlay}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <View style={styles.meta}>
            <Text style={styles.metaText}>📅 {item.date}</Text>
            <Text style={styles.metaText}>📍 {item.city}</Text>
          </View>
          <View style={styles.footer}>
            <Text style={styles.price}>{item.price === 0 ? 'Free' : `₹${item.price}`}</Text>
            <Text style={styles.going}>{item.going} going</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  imageWrap: { width: '100%', height: 200, position: 'relative' },
  image: { width: '100%', height: '100%' },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '75%' },
  badge: {
    position: 'absolute', top: Spacing.sm, left: Spacing.sm,
    backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: Colors.gold,
    paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.sm,
  },
  badgeText: { ...Typography.label, fontSize: 9, color: Colors.gold },
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.md },
  title: { ...Typography.heading, fontSize: 16, lineHeight: 20, marginBottom: Spacing.xs },
  meta: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xs },
  metaText: { ...Typography.caption, fontSize: 11 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { ...Typography.bodyBold, color: Colors.gold, fontSize: 15 },
  going: { ...Typography.caption, fontSize: 11 },
});
