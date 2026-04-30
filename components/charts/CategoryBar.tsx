// components/charts/CategoryBar.tsx
// Animated horizontal bar for category spending breakdown

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../constants/design';
import { formatCurrency } from '../../utils/analytics';

interface CategoryBarProps {
  label: string;
  amount: number;
  percentage: number;
  color: string;
  colors: any;
  delay?: number;
}

export const CategoryBar = React.memo(function CategoryBar({
  label,
  amount,
  percentage,
  color,
  colors,
  delay = 0,
}: CategoryBarProps) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withDelay(
      delay,
      withTiming(percentage / 100, { duration: 700, easing: Easing.out(Easing.cubic) })
    );
  }, [percentage, delay]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[styles.amount, { color: colors.textSecondary }]}>
          {formatCurrency(amount)}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: color + '20' }]}>
        <Animated.View style={[styles.fill, barStyle, { backgroundColor: color }]} />
      </View>
      <Text style={[styles.percentage, { color: colors.textTertiary }]}>
        {percentage.toFixed(0)}%
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: SPACING.xs,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...TYPOGRAPHY.labelL,
  },
  amount: {
    ...TYPOGRAPHY.monoS,
  },
  track: {
    height: 6,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  percentage: {
    ...TYPOGRAPHY.labelS,
  },
});
