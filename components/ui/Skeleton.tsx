// components/ui/Skeleton.tsx
// Shimmer skeleton loader — shows while data is loading
// Creates the perception of speed through progressive disclosure

import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, useTheme } from '../../hooks/useTheme';
import { RADIUS } from '../../constants/design';

interface SkeletonProps {
  width?: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton = React.memo(function Skeleton({
  width = '100%',
  height,
  borderRadius = RADIUS.m,
  style,
}: SkeletonProps) {
  const colors = useColors();
  const { isDark } = useTheme();

  const translateX = useSharedValue(-200);

  useEffect(() => {
    translateX.value = withRepeat(
      withSequence(
        withTiming(400, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        withTiming(-200, { duration: 0 })
      ),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const baseColor = isDark
    ? colors.surface
    : colors.backgroundSecondary;

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: baseColor,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle]}>
        <LinearGradient
          colors={[
            'transparent',
            isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)',
            'transparent',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, width: 200 }}
        />
      </Animated.View>
    </View>
  );
});

// ─── Pre-built Skeleton Layouts ───────────────────────────────────────────────

export function TransactionRowSkeleton() {
  const colors = useColors();
  return (
    <View style={skeletonStyles.row}>
      <Skeleton width={40} height={40} borderRadius={RADIUS.m} />
      <View style={skeletonStyles.rowContent}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={11} />
      </View>
      <Skeleton width={64} height={14} />
    </View>
  );
}

export function DashboardHeroSkeleton() {
  return (
    <View style={skeletonStyles.hero}>
      <View style={skeletonStyles.heroTop}>
        <View style={skeletonStyles.heroLeft}>
          <Skeleton width={100} height={12} />
          <Skeleton width={160} height={42} borderRadius={RADIUS.l} />
        </View>
        <Skeleton width={72} height={72} borderRadius={36} />
      </View>
      <View style={skeletonStyles.heroPills}>
        <Skeleton width="45%" height={40} borderRadius={RADIUS.m} />
        <Skeleton width="45%" height={40} borderRadius={RADIUS.m} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {},
});

const skeletonStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowContent: {
    flex: 1,
    gap: 6,
  },
  hero: {
    padding: 20,
    gap: 16,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLeft: {
    gap: 8,
  },
  heroPills: {
    flexDirection: 'row',
    gap: 12,
  },
});
