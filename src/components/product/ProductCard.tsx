import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { ProductResponse } from '@/types';
import { router } from 'expo-router';
import { getProductImageUrl } from '@/utils/imageUrl';

interface ProductCardProps {
  product: ProductResponse;
  style?: ViewStyle;
  onPress?: () => void;
}

export default function ProductCard({ product, style, onPress }: ProductCardProps) {
  // Format price
  const formattedPrice = `₹${product.price.toLocaleString('en-IN')}`;
  
  // Calculate discount if applicable
  let discountPercentage = 0;
  if (product.comparePrice && product.comparePrice > product.price) {
    discountPercentage = Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100);
  }

  // Checks images, productImages and thumbnailUrl in turn, and resolves
  // relative values as S3 keys rather than paths on the API host.
  const coverImage = getProductImageUrl(product);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/product/${product.id}` as any);
    }
  };

  return (
    <TouchableOpacity style={[styles.card, style]} onPress={handlePress} activeOpacity={0.8}>
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: coverImage }} 
          style={styles.image} 
          contentFit="cover"
          transition={200}
        />
        
        {/* Badges Overlay */}
        <View style={styles.badgesTopLeft}>
          {product.productType === 'DIGITAL' && (
            <View style={[styles.badge, { backgroundColor: Colors.bgElevated }]}>
              <Text style={styles.badgeText}>DIGITAL</Text>
            </View>
          )}
          {product.status === 'OUT_OF_STOCK' && (
            <View style={[styles.badge, { backgroundColor: Colors.error }]}>
              <Text style={[styles.badgeText, { color: '#FFF' }]}>OUT OF STOCK</Text>
            </View>
          )}
          {product.status === 'DRAFT' && (
            <View style={[styles.badge, { backgroundColor: Colors.warning }]}>
              <Text style={[styles.badgeText, { color: '#000' }]}>DRAFT</Text>
            </View>
          )}
        </View>

        {discountPercentage > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discountPercentage}% OFF</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{product.title}</Text>

        {(product.medium || product.brand) ? (
          <Text style={styles.brand} numberOfLines={1}>{product.medium || product.brand}</Text>
        ) : (
          <View style={{ height: Spacing.sm }} />
        )}

        <View style={styles.priceRow}>
          <Text style={styles.price}>{formattedPrice}</Text>
          {product.comparePrice && product.comparePrice > product.price && (
            <Text style={styles.comparePrice}>₹{product.comparePrice.toLocaleString('en-IN')}</Text>
          )}
        </View>

        {product.stock > 0 && product.stock <= 5 && (
          <Text style={styles.lowStockText}>Only {product.stock} left!</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.card,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1, // Square image
    position: 'relative',
    backgroundColor: Colors.bgElevated,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badgesTopLeft: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    gap: Spacing.xs,
    alignItems: 'flex-start',
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeText: {
    ...Typography.label,
  },
  discountBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  discountText: {
    ...Typography.label,
    color: Colors.bg, // Dark text on gold
  },
  content: {
    padding: Spacing.md,
  },
  title: {
    ...Typography.bodySemibold,
    fontSize: 15,
    marginBottom: Spacing.xs,
  },
  brand: {
    ...Typography.caption,
    marginBottom: Spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  price: {
    ...Typography.bodyBold,
    fontSize: 16,
    color: Colors.gold,
  },
  comparePrice: {
    ...Typography.caption,
    textDecorationLine: 'line-through',
  },
  lowStockText: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: Spacing.xs,
    fontSize: 11,
  },
});
