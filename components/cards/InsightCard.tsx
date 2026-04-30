// components/cards/InsightCard.tsx
// Behavioural insight card — the visual home of "this app is reading me".
//
// Visual hierarchy:
//   1. Eyebrow chip (icon + role label like "HEADS UP" / "PATTERN") sets
//      tone instantly, even before the title is read.
//   2. Title is the headline — h3, two-line clamp.
//   3. Description sits in a secondary color with generous leading.
//   4. The card surface itself carries the severity: a faint tinted wash
//      for warning/alert, neutral surface for everything else. The earlier
//      "icon badge in the corner" looked like a placeholder — this version
//      treats severity as a property of the whole card, not a sticker.
//
// All severity color decisions live in `severityStyle` — single source of
// truth so a "warning" reads the same here as in WeeklyBarChart and
// SubscriptionAlert.

import { Feather } from '@expo/vector-icons';
import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { RADIUS, SPACING, SPRING, TYPOGRAPHY } from '../../constants/design';
import { useColors } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useTransactions';
import { useAppStore } from '../../store/useAppStore';
import { Insight, InsightSeverity } from '../../types/insight';

interface InsightCardProps {
  insight: Insight;
}

type FeatherName = React.ComponentProps<typeof Feather>['name'];

interface SeverityStyle {
  // Foreground accent — used for the eyebrow icon, eyebrow label, and the
  // unread dot. Saturated.
  color: string;
  // Subtle wash applied to the card background; pulled from the design
  // tokens so dark mode stays balanced.
  background: string;
  // Faintly tinted border — deepens the wash without shouting.
  border: string;
  // Lucide-style Feather icon for the eyebrow.
  icon: FeatherName;
  // Short eyebrow label. Small caps, all uppercase.
  label: string;
}

function severityStyle(severity: InsightSeverity, colors: any): SeverityStyle {
  switch (severity) {
    case 'positive':
      return {
        color: colors.positive,
        background: colors.positiveSubtle,
        border: colors.positive + '33',
        icon: 'trending-up',
        label: 'Good news',
      };
    case 'warning':
      return {
        color: colors.warning,
        background: colors.warningSubtle,
        border: colors.warning + '33',
        icon: 'alert-triangle',
        label: 'Heads up',
      };
    case 'alert':
      return {
        color: colors.danger,
        background: colors.dangerSubtle,
        border: colors.danger + '40',
        icon: 'alert-octagon',
        label: 'Take a look',
      };
    default:
      return {
        color: colors.accent,
        background: colors.accentSubtle,
        border: colors.accent + '2A',
        icon: 'activity',
        label: 'Pattern',
      };
  }
}

export const InsightCard = memo(function InsightCard({ insight }: InsightCardProps) {
  const colors = useColors();
  const markRead = useAppStore((s) => s.markInsightRead);
  const { light } = useHaptics();

  const sev = severityStyle(insight.severity, colors);

  // Per-card press scale via Reanimated — runs on the UI thread, no JS bridge.
  const scale = useSharedValue(1);
  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.985, SPRING.press);
  }, [scale]);
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING.press);
  }, [scale]);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    light();
    if (!insight.isRead) markRead(insight.id);
  }, [light, markRead, insight.id, insight.isRead]);

  // Neutral severity stays on the regular surface; the tinted wash is
  // reserved for opinionated cards (positive/warning/alert) so the eye
  // can sort signal from texture at a glance.
  const isOpinionated = insight.severity !== 'neutral';
  const cardBackground = isOpinionated ? sev.background : colors.surface;
  const cardBorder = isOpinionated ? sev.border : colors.border;

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          {
            backgroundColor: cardBackground,
            borderColor: cardBorder,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${sev.label}. ${insight.title}`}
      >
        {/* Eyebrow row: severity chip + unread dot */}
        <View style={styles.eyebrowRow}>
          <View
            style={[
              styles.eyebrowChip,
              {
                backgroundColor: isOpinionated
                  ? colors.surface + 'CC'
                  : colors.backgroundSecondary,
                borderColor: sev.border,
              },
            ]}
          >
            <Feather name={sev.icon} size={11} color={sev.color} />
            <Text style={[styles.eyebrowLabel, { color: sev.color }]}>
              {sev.label.toUpperCase()}
            </Text>
          </View>
          {!insight.isRead && (
            <View style={[styles.unreadDot, { backgroundColor: sev.color }]} />
          )}
        </View>

        <Text
          style={[styles.title, { color: colors.textPrimary }]}
          numberOfLines={2}
        >
          {insight.title}
        </Text>
        <Text
          style={[styles.description, { color: colors.textSecondary }]}
          numberOfLines={4}
        >
          {insight.description}
        </Text>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: SPACING.sm,
    padding: SPACING.m,
    gap: SPACING.s,
    overflow: 'hidden',
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrowChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.s,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  eyebrowLabel: {
    ...TYPOGRAPHY.labelS,
    fontSize: 9,
    letterSpacing: 1,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  title: {
    ...TYPOGRAPHY.h3,
    lineHeight: 24,
  },
  description: {
    ...TYPOGRAPHY.bodyS,
    lineHeight: 20,
  },
});
