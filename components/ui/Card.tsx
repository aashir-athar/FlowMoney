// components/ui/Card.tsx
// Base card surface — wraps content in the correct surface color with border

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useColors } from '../../hooks/useTheme';
import { RADIUS, SPACING, SHADOWS } from '../../constants/design';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  padded?: boolean;
  noBorder?: boolean;
}

export const Card = React.memo(function Card({
  children,
  style,
  elevated = false,
  padded = true,
  noBorder = false,
}: CardProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: elevated ? colors.surfaceElevated : colors.surface,
          borderColor: noBorder ? 'transparent' : colors.border,
          borderWidth: noBorder ? 0 : 1,
        },
        padded && styles.padded,
        elevated && SHADOWS.soft,
        style,
      ]}
    >
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  padded: {
    padding: SPACING.l,
  },
});
