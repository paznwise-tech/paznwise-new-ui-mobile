import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Radius, Spacing } from '@/constants/theme';

interface GoldButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'filled' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function GoldButton({
  label, onPress, variant = 'filled', size = 'md',
  loading, disabled, fullWidth,
}: GoldButtonProps) {
  const height = size === 'sm' ? 36 : size === 'lg' ? 56 : 46;
  const fontSize = size === 'sm' ? 12 : size === 'lg' ? 16 : 14;

  if (variant === 'filled') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        style={[styles.wrapper, fullWidth && styles.full, { opacity: disabled ? 0.5 : 1 }]}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#E8C97A', '#C9A84C', '#A8883A']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.gradient, { height }]}
        >
          {loading
            ? <ActivityIndicator color={Colors.bg} size="small" />
            : <Text style={[styles.filledLabel, { fontSize }]}>{label}</Text>
          }
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        style={[styles.outline, { height }, fullWidth && styles.full, { opacity: disabled ? 0.5 : 1 }]}
        activeOpacity={0.8}
      >
        <Text style={[styles.outlineLabel, { fontSize }]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.7}>
      <Text style={[styles.ghost, { fontSize }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  full: { width: '100%' },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
  },
  filledLabel: {
    ...Typography.bodyBold,
    color: Colors.bg,
    letterSpacing: 0.5,
  },
  outline: {
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  outlineLabel: {
    ...Typography.bodySemibold,
    color: Colors.gold,
    letterSpacing: 0.5,
  },
  ghost: {
    ...Typography.bodySemibold,
    color: Colors.gold,
  },
});
