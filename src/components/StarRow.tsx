import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '@/constants/theme';

export const StarRow = React.memo(function StarRow({ rating, count }: { rating: number; count: number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.star}>★</Text>
      <Text style={styles.rating}>{rating.toFixed(1)}</Text>
      <Text style={styles.count}>({count})</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  star: { color: Colors.gold, fontSize: 12 },
  rating: { ...Typography.bodySemibold, fontSize: 12, color: Colors.cream },
  count: { ...Typography.caption, fontSize: 11 },
});
