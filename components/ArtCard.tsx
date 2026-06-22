import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Radius, Spacing } from '@/constants/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.md * 2 - Spacing.sm) / 2;

interface ArtCardProps {
  item: {
    id: number;
    title: string;
    price: number;
    artist: string;
    img: string;
    medium?: string;
    tag?: string;
  };
  onPress: () => void;
  fullWidth?: boolean;
}

export function ArtCard({ item, onPress, fullWidth }: ArtCardProps) {
  const cardWidth = fullWidth ? width - Spacing.md * 2 : CARD_WIDTH;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.card, { width: cardWidth }]}
      activeOpacity={0.85}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.img }}
          style={styles.image}
          contentFit="cover"
          transition={300}
        />
        <LinearGradient
          colors={['transparent', 'rgba(13,27,42,0.9)']}
          style={styles.gradient}
        />
        {item.tag && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>{item.tag}</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.artist} numberOfLines={1}>{item.artist}</Text>
        <Text style={styles.price}>₹{item.price.toLocaleString('en-IN')}</Text>
      </View>

      {/* Gold border accent */}
      <View style={styles.borderAccent} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  tag: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  tagText: {
    ...Typography.label,
    color: Colors.bg,
    fontSize: 8,
  },
  info: {
    padding: Spacing.sm,
    paddingTop: 10,
    paddingBottom: 10,
  },
  title: {
    ...Typography.bodySemibold,
    fontSize: 13,
    marginBottom: 2,
  },
  artist: {
    ...Typography.caption,
    fontSize: 11,
    marginBottom: 4,
  },
  price: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: Colors.gold,
  },
  borderAccent: {
    position: 'absolute',
    bottom: 0,
    left: Spacing.md,
    right: Spacing.md,
    height: 1,
    backgroundColor: Colors.goldDim,
  },
});
