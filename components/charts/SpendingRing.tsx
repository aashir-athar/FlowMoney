// components/charts/SpendingRing.tsx
// Animated SVG circular progress ring showing today's spend vs limit

import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface SpendingRingProps {
  spent: number;
  limit: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}

export const SpendingRing = React.memo(function SpendingRing({
  spent,
  limit,
  color,
  size = 72,
  strokeWidth = 5,
}: SpendingRingProps) {
  const progress = Math.min(spent / Math.max(limit, 1), 1);
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  // Color shifts red as spending approaches limit
  const ringColor = progress > 0.85 ? '#FF6B6B' : progress > 0.65 ? '#F5A623' : color;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color + '20'}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
});
