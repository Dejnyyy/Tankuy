import React, { useState, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  GestureResponderEvent,
} from "react-native";
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Circle,
  G,
} from "react-native-svg";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/context/ThemeContext";

interface SpendingChartProps {
  labels: string[];
  data: number[];
  period: "week" | "month" | "year" | "all";
  currency?: string;
  onScrub?: (
    point: { index: number; value: number; label: string } | null,
  ) => void;
}

// Build smooth bezier curve path
const buildPath = (
  points: { x: number; y: number }[],
  close: boolean,
  chartHeight: number,
): string => {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const cpx1 = curr.x + (next.x - curr.x) * 0.4;
    const cpy1 = curr.y;
    const cpx2 = next.x - (next.x - curr.x) * 0.4;
    const cpy2 = next.y;
    d += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${next.x} ${next.y}`;
  }
  if (close) {
    d += ` L ${points[points.length - 1].x} ${chartHeight}`;
    d += ` L ${points[0].x} ${chartHeight}`;
    d += " Z";
  }
  return d;
};

const formatValue = (value: number): string => {
  if (value >= 10000) return `${(value / 1000).toFixed(0)}k`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return Math.round(value).toString();
};

export default function SpendingChart({
  labels,
  data,
  period,
  currency = "Kč",
  onScrub,
}: SpendingChartProps) {
  const { colors } = useTheme();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // Ref mirror of activeIndex so touch handlers can read the latest value
  // without stale closures or impure state updaters.
  const activeIndexRef = useRef<number | null>(null);
  const containerRef = useRef<View>(null);
  const containerXRef = useRef(0);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setActive = useCallback((idx: number | null) => {
    activeIndexRef.current = idx;
    setActiveIndex(idx);
  }, []);

  // Reset active tooltip when data changes
  React.useEffect(() => {
    setActive(null);
  }, [data, labels, setActive]);

  const { width: screenWidth } = useWindowDimensions();
  const PADDING_LEFT = 16;
  const PADDING_RIGHT = 16;
  const PADDING_TOP = 20;
  const CHART_DRAW_HEIGHT = 140;
  const CHART_BOTTOM = PADDING_TOP + CHART_DRAW_HEIGHT;
  const SVG_WIDTH = Math.min(screenWidth, 800) - 40; // max width 800 minus card margin
  const SVG_HEIGHT = CHART_BOTTOM + 28; // chart + x-labels
  const DRAW_WIDTH = SVG_WIDTH - PADDING_LEFT - PADDING_RIGHT;

  const maxVal = useMemo(() => Math.max(...data, 1), [data]);
  const minVal = useMemo(() => Math.min(...data, 0), [data]);
  const range = maxVal - minVal || 1;

  const points = useMemo(() => {
    return data.map((val, i) => ({
      x: PADDING_LEFT + (i / Math.max(data.length - 1, 1)) * DRAW_WIDTH,
      y: PADDING_TOP + (1 - (val - minVal) / range) * CHART_DRAW_HEIGHT,
    }));
  }, [data, DRAW_WIDTH, minVal, range]);

  // Grid lines (3 horizontal — top, middle, bottom)
  const gridLines = useMemo(() => {
    const lines = [];
    for (let i = 0; i <= 2; i++) {
      const y = PADDING_TOP + (i / 2) * CHART_DRAW_HEIGHT;
      const value = maxVal - (i / 2) * range;
      lines.push({ y, value });
    }
    return lines;
  }, [maxVal, range]);

  // X-axis labels — smart thinning
  const xLabels = useMemo(() => {
    if (labels.length <= 7)
      return labels.map((l, i) => ({ label: l, index: i }));
    const step = Math.ceil(labels.length / 5);
    return labels
      .map((l, i) => ({ label: l, index: i }))
      .filter((_, i) => i === 0 || i === labels.length - 1 || i % step === 0);
  }, [labels]);

  // Touch handling using onLayout + locationX
  const onContainerLayout = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.measureInWindow((x) => {
        containerXRef.current = x;
      });
    }
  }, []);

  const findNearest = useCallback(
    (pageX: number) => {
      const localX = pageX - containerXRef.current;
      if (localX < PADDING_LEFT - 10 || localX > SVG_WIDTH - PADDING_RIGHT + 10)
        return;

      let nearest = 0;
      let minDist = Infinity;
      points.forEach((p, i) => {
        const dist = Math.abs(p.x - localX);
        if (dist < minDist) {
          minDist = dist;
          nearest = i;
        }
      });

      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }

      if (nearest !== activeIndexRef.current) {
        setActive(nearest);
        if (onScrub) {
          Haptics.selectionAsync(); // light tick per data point — fire-and-forget
          onScrub({ index: nearest, value: data[nearest], label: labels[nearest] });
        }
      }
    },
    [points, SVG_WIDTH, data, labels, onScrub, setActive],
  );

  const onTouchStart = (e: GestureResponderEvent) => {
    findNearest(e.nativeEvent.pageX);
  };
  const onTouchMove = (e: GestureResponderEvent) => {
    findNearest(e.nativeEvent.pageX);
  };
  const onTouchEnd = () => {
    if (onScrub) {
      // Scrub consumers need the chart selection and the hero number to
      // agree — clear both immediately on release.
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      setActive(null);
      onScrub(null);
    } else {
      // Pre-existing behavior: tooltip lingers for 2s after release.
      hideTimeoutRef.current = setTimeout(() => setActive(null), 2000);
    }
  };

  if (data.length === 0 || data.every((d) => d === 0)) return null;

  const linePath = buildPath(points, false, CHART_BOTTOM);
  const areaPath = buildPath(points, true, CHART_BOTTOM);

  const accentColor = colors.tint;
  const labelColor = colors.textSecondary;

  // Safe active point (bounds check)
  const safeActive =
    activeIndex !== null && activeIndex >= 0 && activeIndex < points.length
      ? activeIndex
      : null;
  const activePoint = safeActive !== null ? points[safeActive] : null;

  // Tooltip position
  const tooltipWidth = 110;
  const tooltipLeft = activePoint
    ? Math.min(
        Math.max(activePoint.x - tooltipWidth / 2, 4),
        SVG_WIDTH - tooltipWidth - 4,
      )
    : 0;
  const tooltipTop = activePoint ? Math.max(activePoint.y - 58, -4) : 0;

  return (
    <View
      ref={containerRef}
      style={styles.container}
      onLayout={onContainerLayout}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={onTouchStart}
      onResponderMove={onTouchMove}
      onResponderRelease={onTouchEnd}
      onResponderTerminate={onTouchEnd}
    >
      {/* Y-axis labels above chart as RN Text for perfect readability */}
      <View style={styles.yLabels}>
        {gridLines.map((line, i) => (
          <Text
            key={`y-${i}`}
            style={[
              styles.yLabel,
              {
                color: labelColor,
                top: line.y - 14,
                left: PADDING_LEFT,
              },
            ]}
          >
            {formatValue(line.value)} {currency}
          </Text>
        ))}
      </View>

      <Svg width={SVG_WIDTH} height={SVG_HEIGHT}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={accentColor} stopOpacity="0.08" />
            <Stop offset="0.6" stopColor={accentColor} stopOpacity="0.02" />
            <Stop offset="1" stopColor={accentColor} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Bottom hairline only — Clean Minimal drops the interior gridlines */}
        <Line
          x1={PADDING_LEFT}
          y1={CHART_BOTTOM}
          x2={SVG_WIDTH - PADDING_RIGHT}
          y2={CHART_BOTTOM}
          stroke={colors.border}
          strokeWidth="1"
        />

        {/* Area fill */}
        <Path d={areaPath} fill="url(#areaGrad)" />

        {/* Line */}
        <Path
          d={linePath}
          fill="none"
          stroke={accentColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data dots — only for short datasets */}
        {data.length <= 14 &&
          points.map((p, i) => (
            <Circle
              key={`dot-${i}`}
              cx={p.x}
              cy={p.y}
              r={activeIndex === i ? 0 : 3}
              fill={colors.card}
              stroke={accentColor}
              strokeWidth={1.5}
            />
          ))}

        {/* Active vertical dashed line */}
        {activePoint && (
          <G>
            <Line
              x1={activePoint.x}
              y1={PADDING_TOP}
              x2={activePoint.x}
              y2={CHART_BOTTOM}
              stroke={accentColor}
              strokeWidth="1"
              strokeDasharray="4,3"
              opacity={0.4}
            />
            {/* Active dot — filled with a card-colored ring */}
            <Circle
              cx={activePoint.x}
              cy={activePoint.y}
              r={4}
              fill={accentColor}
              stroke={colors.card}
              strokeWidth={2}
            />
          </G>
        )}
      </Svg>

      {/* X-axis labels as RN Text — below the SVG */}
      <View style={[styles.xLabelsRow, { width: SVG_WIDTH }]}>
        {xLabels.map(({ label, index }) => (
          <Text
            key={`x-${index}`}
            style={[
              styles.xLabel,
              {
                color: labelColor,
                left: points[index]?.x || 0,
              },
            ]}
          >
            {label}
          </Text>
        ))}
      </View>

      {/* Floating tooltip */}
      {safeActive !== null && activePoint && (
        <View
          style={[
            styles.tooltip,
            {
              left: tooltipLeft,
              top: tooltipTop,
              backgroundColor: colors.elevated,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.tooltipValue, { color: accentColor }]}>
            {data[safeActive].toLocaleString()} {currency}
          </Text>
          <Text
            style={[styles.tooltipLabel, { color: colors.textSecondary }]}
          >
            {labels[safeActive]}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    marginTop: 4,
  },
  yLabels: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  yLabel: {
    position: "absolute",
    fontSize: 10,
    fontWeight: "500",
  },
  xLabelsRow: {
    position: "relative",
    height: 18,
  },
  xLabel: {
    position: "absolute",
    fontSize: 10,
    fontWeight: "500",
    transform: [{ translateX: -20 }],
    width: 40,
    textAlign: "center",
  },
  tooltip: {
    position: "absolute",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 110,
    alignItems: "center",
    zIndex: 20,
  },
  tooltipValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  tooltipLabel: {
    fontSize: 11,
    marginTop: 2,
  },
});
