import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { spacing } from '@/constants/Theme';
import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';

function useGrow(delay: number) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
  }, [p, delay]);
  return p;
}

function VBar({ ratio, color, delay, height }: { ratio: number; color: string; delay: number; height: number }) {
  const p = useGrow(delay);
  const s = useAnimatedStyle(() => ({ height: Math.max(ratio > 0 ? 3 : 1, ratio * height * p.value) }), [ratio, height]);
  return <Animated.View style={[{ width: '100%', borderTopLeftRadius: 1, borderTopRightRadius: 1, backgroundColor: color }, s]} />;
}

interface DistProps {
  labels: string[];
  values: number[];
  height?: number;
  /** Text above the bar for the selected/top value */
  format?: (v: number) => string;
  highlight?: number | null;
}

/** Column distribution (weekday / time of day). Tap a column to read it. */
export function DistributionBars({ labels, values, height = 110, format = (v) => String(v), highlight }: DistProps) {
  const { colors } = useTheme();
  const max = Math.max(1, ...values);
  const [sel, setSel] = useState<number | null>(highlight ?? null);
  useEffect(() => setSel(highlight ?? null), [highlight]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
      {values.map((v, i) => {
        const active = i === sel;
        return (
          <PressableScale key={i} scaleTo={1} onPress={() => setSel(i)} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <AppText variant={active ? 'captionBold' : 'caption'} tone={active ? 'primary' : 'muted'} style={{ fontSize: 12, fontVariant: ['tabular-nums'] }}>
              {active || values.length <= 7 ? format(v) : ' '}
            </AppText>
            <View style={{ height, width: '100%', justifyContent: 'flex-end' }}>
              <VBar ratio={v / max} color={active ? colors.text : colors.chartBar} delay={i * 12} height={height} />
            </View>
            <AppText variant={active ? 'captionBold' : 'caption'} tone={active ? 'primary' : 'secondary'} style={{ fontSize: 12 }} numberOfLines={1}>
              {labels[i]}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

function HBar({ ratio, color, delay }: { ratio: number; color: string; delay: number }) {
  const p = useGrow(delay);
  const s = useAnimatedStyle(() => ({ width: `${Math.max(1, ratio * 100 * p.value)}%` }), [ratio]);
  return (
    <View style={{ height: 8, overflow: 'hidden' }}>
      <Animated.View style={[{ height: 8, backgroundColor: color }, s]} />
    </View>
  );
}

export interface RankRow {
  key: string;
  title: string;
  right: string;
  sub?: string;
  value: number;
  badge?: React.ReactNode;
  /** Bar colour (station brand); defaults to ink. */
  color?: string;
}

/** Ranked list with proportional bars (stations). */
export function RankList({ rows, max }: { rows: RankRow[]; max?: number; accentFirst?: boolean }) {
  const { colors } = useTheme();
  const m = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <View>
      {rows.map((r, i) => (
        <View key={r.key} style={{ gap: spacing.sm, paddingVertical: spacing.md, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AppText variant="bodyBold" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {r.title}
                </AppText>
                {r.badge}
              </View>
              {r.sub ? (
                <AppText variant="caption" tone="muted" numberOfLines={1}>
                  {r.sub}
                </AppText>
              ) : null}
            </View>
            <AppText variant="statSm">{r.right}</AppText>
          </View>
          <View style={{ backgroundColor: colors.sunken }}>
            <HBar ratio={r.value / m} color={r.color ?? colors.text} delay={40 + i * 30} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Tiny inline sparkline made from Views (no SVG) for KPI tiles. */
export function SparkBars({ values, color, height = 26 }: { values: (number | null)[]; color?: string; height?: number }) {
  const { colors } = useTheme();
  const nums = values.map((v) => v ?? 0);
  const max = Math.max(1, ...nums);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height }}>
      {nums.map((v, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: Math.max(2, (v / max) * height),
            borderRadius: 1,
            backgroundColor: i === nums.length - 1 ? color ?? colors.text : colors.chartBar,
          }}
        />
      ))}
    </View>
  );
}
