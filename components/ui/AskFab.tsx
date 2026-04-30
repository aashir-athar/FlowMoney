// components/ui/AskFab.tsx
// Floating "Ask" button for the Money Assistant.
//
// Why a FAB and not a header pill: the assistant is the single most powerful
// surface in the app and was being lost in the upper-right corner. A FAB keeps
// it discoverable from any scroll position and within thumb reach.
//
// Lives just above the floating tab bar. Tab bar height + bottom inset are
// derived from LAYOUT so the two never collide on different devices.

import { Feather } from '@expo/vector-icons';
import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LAYOUT, RADIUS, SHADOWS, SPACING, SPRING, TYPOGRAPHY } from '../../constants/design';
import { useColors } from '../../hooks/useTheme';

interface AskFabProps {
  onPress: () => void;
  label?: string;
}

export const AskFab = memo(function AskFab({ onPress, label = 'Ask' }: AskFabProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);

  const handleIn = useCallback(() => {
    scale.value = withSpring(0.94, SPRING.press);
  }, [scale]);

  const handleOut = useCallback(() => {
    scale.value = withSpring(1, SPRING.press);
  }, [scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Sit just above the floating tab bar. tabBarHeight + bottom gap + 12 breathing.
  const bottom =
    Math.max(insets.bottom, LAYOUT.tabBarBottomGap) + LAYOUT.tabBarHeight + SPACING.sm;

  return (
    <Animated.View
      entering={FadeIn.delay(200)}
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom }]}
    >
      <Animated.View style={[animStyle, SHADOWS.accent(colors.accent)]}>
        <Pressable
          onPress={onPress}
          onPressIn={handleIn}
          onPressOut={handleOut}
          accessibilityRole="button"
          accessibilityLabel="Ask Money Assistant"
          style={[styles.fab, { backgroundColor: colors.accent }]}
          hitSlop={6}
        >
          <Feather name="message-circle" size={18} color="#fff" />
          <Text style={styles.label}>{label}</Text>
          <View style={styles.dot} />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    right: LAYOUT.screenHorizontalPadding,
    alignItems: 'flex-end',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    minHeight: 44,
  },
  label: {
    ...TYPOGRAPHY.labelL,
    color: '#fff',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#52E5B0',
    marginLeft: 2,
  },
});
