import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Radius, Spacing } from '@/constants/theme';
import { StarRow } from '@/components/StarRow';
import { Performer } from '@/types';

interface PerformerCardProps {
  item: Performer;
  onPress: () => void;
}

export const PerformerCard = React.memo(function PerformerCard({ item, onPress }: PerformerCardProps) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.card} activeOpacity={0.85}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: item.img }} style={styles.image} contentFit="cover" transition={300} />
        <LinearGradient colors={['transparent', 'rgba(13,27,42,0.9)']} style={styles.gradient} />
        <View style={styles.typeTag}>
          <Text style={styles.typeText}>{item.type}</Text>
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <StarRow rating={item.rating} count={item.reviews} />
        <Text style={styles.price}>{item.price}</Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    width: 160,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  imageWrap: { width: '100%', height: 140, position: 'relative' },
  image: { width: '100%', height: '100%' },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' },
  typeTag: {
    position: 'absolute', top: Spacing.sm, left: Spacing.sm,
    backgroundColor: 'rgba(13,27,42,0.7)',
    borderWidth: 1, borderColor: Colors.goldDim,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  typeText: { ...Typography.label, fontSize: 9, color: Colors.gold },
  info: { padding: 10 },
  name: { ...Typography.bodySemibold, fontSize: 13, marginBottom: 3 },
  price: { ...Typography.bodyBold, fontSize: 13, color: Colors.gold, marginTop: 4 },
});
