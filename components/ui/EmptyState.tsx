// components/ui/EmptyState.tsx
// Zero-state component — renders when a list has no data
// Designed to feel calm and helpful, not broken

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useColors } from '../../hooks/useTheme';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../constants/design';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = React.memo(function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const colors = useColors();

  return (
    <Animated.View entering={FadeIn.delay(200)} style={styles.container}>
      {/* Abstract geometry mark */}
      <View style={styles.iconArea}>
        <View style={[styles.iconOuter, { borderColor: colors.border }]}>
          <View style={[styles.iconInner, { backgroundColor: colors.accentSubtle }]}>
            <View style={[styles.iconCore, { backgroundColor: colors.accent }]} />
          </View>
        </View>
      </View>

      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {description}
      </Text>

      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          size="sm"
          style={styles.action}
        />
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.m,
  },
  iconArea: {
    marginBottom: SPACING.s,
  },
  iconOuter: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.l,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCore: {
    width: 16,
    height: 16,
    borderRadius: RADIUS.s,
  },
  title: {
    ...TYPOGRAPHY.h2,
    textAlign: 'center',
  },
  description: {
    ...TYPOGRAPHY.bodyM,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 260,
  },
  action: {
    marginTop: SPACING.s,
  },
});
