// components/ui/GlassSurface.tsx
// 2026 platform-true glass surface.
//
// iOS 26+: native Liquid Glass via expo-glass-effect's GlassView. Supports
//          'regular' / 'clear' styles, optional tint, interactive ripple.
// iOS  <26 / Android / Web: solid surface with hairline border + soft elevation.
//          We do NOT fake glass on Android — emulating blur on low-end devices
//          burns GPU and looks wrong. Material density is the right answer.
//
// API stays identical across platforms; the platform layer absorbs the difference.

import React from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { RADIUS, SHADOWS } from '../../constants/design';
import { useTheme } from '../../hooks/useTheme';

interface GlassSurfaceProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  borderRadius?: number;
  /** iOS GlassView style — 'regular' or 'clear' */
  glassStyle?: 'regular' | 'clear';
  /** Optional tint applied over the glass on iOS */
  tintColor?: string;
  /** Enables interactive glass-effect ripple on iOS */
  interactive?: boolean;
  /** When true, adds a soft floating shadow on every platform */
  elevated?: boolean;
}

const liquidGlassAvailable = isLiquidGlassAvailable();

export const GlassSurface = React.memo(function GlassSurface({
  children,
  style,
  borderRadius = RADIUS.xl,
  glassStyle = 'regular',
  tintColor,
  interactive = false,
  elevated = false,
}: GlassSurfaceProps) {
  const { colors, isDark } = useTheme();

  // iOS 26+: real Liquid Glass
  if (Platform.OS === 'ios' && liquidGlassAvailable) {
    return (
      <GlassView
        glassEffectStyle={glassStyle}
        tintColor={tintColor}
        isInteractive={interactive}
        style={[
          { borderRadius, overflow: 'hidden' },
          elevated && SHADOWS.floating,
          style,
        ]}
      >
        {children}
      </GlassView>
    );
  }

  // Everywhere else: solid surface, hairline edge, optional float shadow.
  // The look: opaque-but-luminous, not pretending to be glass.
  return (
    <View
      style={[
        styles.fallback,
        {
          borderRadius,
          backgroundColor: isDark ? colors.surface : colors.surface,
          borderColor: colors.border,
        },
        elevated && SHADOWS.floating,
        style,
      ]}
    >
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  fallback: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
