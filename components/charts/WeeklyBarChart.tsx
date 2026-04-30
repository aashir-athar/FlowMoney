// components/charts/WeeklyBarChart.tsx
// Animated bar chart — 7-day spending view.
//
// A reference line for the 7-day average sits behind the bars so individual
// days have something to be compared against. Without it, two weeks with very
// different totals look identical because the y-scale is normalized to that
// week's max — the chart was decorative, not informative.

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants/design';
import { formatCompact } from '../../utils/analytics';

interface BarData {
  label: string;
  value: number;
}

interface WeeklyBarChartProps {
  data: BarData[];
  accentColor: string;
  textColor: string;
  barColor: string;
  /** When provided, overrides the in-data computed average. */
  averageOverride?: number;
}

const CHART_HEIGHT = 100;

export const WeeklyBarChart = React.memo(function WeeklyBarChart({
  data,
  accentColor,
  textColor,
  barColor,
  averageOverride,
}: WeeklyBarChartProps) {
  // Average reference: ignore zero-spend days so a single off-day doesn't
  // pull the line down to the floor and erase all signal.
  const spendingDays = data.filter((d) => d.value > 0);
  const computedAverage =
    spendingDays.length > 0
      ? spendingDays.reduce((s, d) => s + d.value, 0) / spendingDays.length
      : 0;
  const average = averageOverride ?? computedAverage;

  // Scale: include the average line in the max calc so it sits inside the
  // chart frame even on a low-spending week.
  const maxValue = Math.max(...data.map((d) => d.value), average, 1);
  const todayIndex = data.length - 1;
  const averagePercent = average > 0 ? average / maxValue : 0;

  return (
    <View style={styles.container}>
      <View style={styles.barsArea}>
        {/* Average reference line — sits behind the bars. */}
        {average > 0 && (
          <View
            style={[
              styles.averageLine,
              {
                bottom: CHART_HEIGHT * averagePercent + 24,
                borderColor: textColor,
              },
            ]}
            pointerEvents="none"
          >
            <View style={[styles.averageDashRow]}>
              {Array.from({ length: 24 }).map((_, idx) => (
                <View
                  key={idx}
                  style={[styles.averageDash, { backgroundColor: textColor }]}
                />
              ))}
            </View>
            <Text style={[styles.averageLabel, { color: textColor }]}>
              Avg {formatCompact(average)}
            </Text>
          </View>
        )}
        <View style={styles.barsRow}>
          {data.map((item, i) => {
            const isToday = i === todayIndex;
            const heightPercent = item.value / maxValue;
            return (
              <AnimatedBar
                key={item.label}
                item={item}
                heightPercent={heightPercent}
                isToday={isToday}
                color={isToday ? accentColor : barColor}
                textColor={textColor}
                accentColor={accentColor}
                delay={i * 60}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
});

function AnimatedBar({
  item,
  heightPercent,
  isToday,
  color,
  textColor,
  accentColor,
  delay,
}: {
  item: BarData;
  heightPercent: number;
  isToday: boolean;
  color: string;
  textColor: string;
  accentColor: string;
  delay: number;
}) {
  const scaleY = useSharedValue(0);

  useEffect(() => {
    scaleY.value = withDelay(
      delay,
      withTiming(heightPercent, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
  }, [heightPercent, delay]);

  const barStyle = useAnimatedStyle(() => ({
    height: CHART_HEIGHT * scaleY.value,
  }));

  return (
    <View style={styles.barWrapper}>
      {/* Value label on today */}
      {isToday && item.value > 0 && (
        <Text style={[styles.valueLabel, { color: accentColor }]}>
          {formatCompact(item.value)}
        </Text>
      )}
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.bar,
            barStyle,
            {
              backgroundColor: color,
              opacity: isToday ? 1 : 0.45,
              borderRadius: RADIUS.xs,
            },
          ]}
        />
      </View>
      <Text style={[styles.dayLabel, { color: isToday ? accentColor : textColor }]}>
        {item.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: CHART_HEIGHT + 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barsArea: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    height: CHART_HEIGHT + 40,
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: '100%',
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
    paddingHorizontal: 2,
  },
  bar: {
    width: '100%',
    minHeight: 2,
  },
  dayLabel: {
    ...TYPOGRAPHY.labelS,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  valueLabel: {
    ...TYPOGRAPHY.labelS,
    position: 'absolute',
    top: 0,
  },
  averageLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    opacity: 0.6,
  },
  averageDashRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    opacity: 0.5,
  },
  averageDash: {
    flex: 1,
    height: 1,
    borderRadius: 0.5,
  },
  averageLabel: {
    ...TYPOGRAPHY.labelS,
    fontSize: 9,
    letterSpacing: 0.5,
  },
});
