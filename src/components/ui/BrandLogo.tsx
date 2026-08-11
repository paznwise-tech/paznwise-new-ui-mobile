import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Colors } from '@/constants/theme';

interface BrandLogoProps {
  size?: number;
  color?: string;
  textColor?: string;
}

export function BrandLogo({ size = 36, color = '#9DE7D7', textColor = '#FFFFFF' }: BrandLogoProps) {
  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <Rect x="0" y="0" width="28" height="28" rx="6" fill={color} />
        <Rect x="34" y="0" width="30" height="30" rx="7" fill={color} />
        <Rect x="70" y="0" width="30" height="30" rx="7" fill={color} />
        <Rect x="0" y="34" width="20" height="20" rx="5" fill={color} />
        <Rect x="34" y="34" width="24" height="24" rx="6" fill={color} />
        <Rect x="70" y="36" width="30" height="30" rx="7" fill={color} />
        <Rect x="24" y="58" width="10" height="10" rx="3" fill={color} />
        <Rect x="0" y="72" width="16" height="16" rx="4" fill={color} />
        <Rect x="34" y="70" width="20" height="20" rx="5" fill={color} />
        <Rect x="68" y="70" width="32" height="20" rx="5" fill={color} />
      </Svg>
      <View style={styles.textContainer}>
        <Text style={[styles.text, { color: textColor }]}>PAZN</Text>
        <Text style={[styles.text, { color: textColor }]}>WISE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textContainer: {
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: 0.5,
  },
});
