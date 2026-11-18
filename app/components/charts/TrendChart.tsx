import React, { useEffect, useId, useMemo, useState } from 'react';
import { Platform, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { radii } from '@/constants/Theme';
import { AppText } from '@/components/ui/AppText';
import { haptics } from '@/lib/haptics';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface ChartPoint {
  label: string;
  /** Tooltip title */
  longLabel?: string;
  value: number | null;
}

interface Props {
  points: ChartPoint[];
  kind?: 'bar' | 'line';
  height?: number;
  color?: string;
  formatAxis: (v: number) => string;
  formatValue: (v: number | null) => string;
  /** Extra tooltip line (e.g. "3 tankování") */
  formatMeta?: (i: number) => string | null;
  /** Always show the tooltip (not only after interaction). */
  alwaysTooltip?: boolean;
  onSelect?: (index: number | null) => void;
  /** Show dashed average line */
  showAverage?: boolean;
  averageLabel?: string;
  /** Change to replay the entry animation (e.g. metric key). */
  animationKey?: string;
  /** Line charts: zero-based Y axis instead of fitting min..max. */
  zeroBased?: boolean;
}

const PAD_L = 44;
const PAD_R = 8;
const PAD_T = 14;
const PAD_B = 24;
const SVG_FONT = Platform.OS === 'web' ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : undefined;

function niceStep(range: number, ticks: number) {
  const raw = range / Math.max(1, ticks);
  const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const n = raw / mag;
  const step = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10;
  return step * mag;
}

function scaleY(values: number[], zeroBased: boolean) {
  if (!values.length) return { min: 0, max: 1, ticks: [0, 1] };
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (zeroBased || min >= 0 && max > 0 && min / max < 0.35) min = 0;
  if (max === min) {
    max = max + (Math.abs(max) * 0.1 || 1);
    min = zeroBased ? 0 : min - (Math.abs(min) * 0.1 || 1);
  }
  const step = niceStep(max - min, 4);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(+t.toFixed(6));
  return { min: lo, max: hi, ticks };
}

/** Monotone cubic (Fritsch–Carlson) path through points. */
function monotonePath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  const n = pts.length;
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1].x - pts[i].x);
    m.push((pts[i + 1].y - pts[i].y) / (dx[i] || 1));
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) {
    t.push(m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]));
  }
  t.push(m[n - 2]);
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${pts[i].x + h},${pts[i].y + t[i] * h} ${pts[i + 1].x - h},${pts[i + 1].y - t[i + 1] * h} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
}

function lastIndex(points: ChartPoint[]) {
  for (let i = points.length - 1; i >= 0; i--) if (points[i].value !== null) return i;
  return null;
}

export function TrendChart({
  points,
  kind = 'line',
  height = 220,
  color,
  formatAxis,
  formatValue,
  formatMeta,
  onSelect,
  showAverage = true,
  averageLabel = 'ø',
  animationKey,
  zeroBased,
  alwaysTooltip,
}: Props) {
  const { colors } = useTheme();
  const c = color ?? colors.chartLine;
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(() => lastIndex(points));
  const [touched, setTouched] = useState(false);
  const progress = useSharedValue(0);
  const gradId = `area${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const dataSig = `${animationKey ?? ''}|${points.length}|${kind}`;
  useEffect(() => {
    const li = lastIndex(points);
    setSel(li);
    setTouched(false);
    onSelect?.(li);
    progress.value = 0;
    progress.value = withDelay(60, withTiming(1, { duration: 750, easing: Easing.out(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSig]);

  const values = points.map((p) => p.value).filter((v): v is number => v !== null);
  const yS = useMemo(() => scaleY(kind === 'bar' ? [0, ...values] : values, !!zeroBased || kind === 'bar'), [values.join(','), kind, zeroBased]);
  const plotW = Math.max(0, w - PAD_L - PAD_R);
  const plotH = height - PAD_T - PAD_B;
  const n = points.length;
  const slot = n > 0 ? plotW / n : 0;
  const xAt = (i: number) => PAD_L + slot * i + slot / 2;
  const yAt = (v: number) => PAD_T + plotH - ((v - yS.min) / (yS.max - yS.min || 1)) * plotH;

  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

  // Line geometry (null values break the line)
  const lineGeo = useMemo(() => {
    if (kind !== 'line' || !w) return { d: '', area: '', length: 0, dots: [] as { x: number; y: number; i: number }[] };
    const runs: { x: number; y: number; i: number }[][] = [];
    let cur: { x: number; y: number; i: number }[] = [];
    points.forEach((p, i) => {
      if (p.value === null) {
        if (cur.length) runs.push(cur);
        cur = [];
      } else cur.push({ x: xAt(i), y: yAt(p.value), i });
    });
    if (cur.length) runs.push(cur);
    let d = '';
    let area = '';
    let length = 0;
    const base = PAD_T + plotH;
    for (const r of runs) {
      const seg = monotonePath(r);
      d += (d ? ' ' : '') + seg;
      if (r.length > 1) area += `${seg} L${r[r.length - 1].x},${base} L${r[0].x},${base} Z `;
      for (let k = 1; k < r.length; k++) length += Math.hypot(r[k].x - r[k - 1].x, r[k].y - r[k - 1].y);
    }
    return { d, area, length: length * 1.08 + 4, dots: runs.flat() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, w, yS, kind, height]);

  const lineProps = useAnimatedProps(() => ({
    strokeDashoffset: lineGeo.length * (1 - progress.value),
  }));
  const areaProps = useAnimatedProps(() => ({ fillOpacity: progress.value }));

  const pickAt = (x: number) => {
    if (!slot) return;
    if (!touched) setTouched(true);
    let i = Math.floor((x - PAD_L) / slot);
    i = Math.max(0, Math.min(n - 1, i));
    if (points[i]?.value === null) {
      // snap to nearest non-null
      let best: number | null = null;
      for (let k = 0; k < n; k++) if (points[k].value !== null && (best === null || Math.abs(k - i) < Math.abs(best - i))) best = k;
      if (best === null) return;
      i = best;
    }
    if (i !== sel) {
      haptics.tap();
      setSel(i);
      onSelect?.(i);
    }
  };

  const onTouch = (e: GestureResponderEvent) => pickAt(e.nativeEvent.locationX);
  const webHover =
    Platform.OS === 'web'
      ? ({
          onPointerMove: (e: any) => {
            if (e.nativeEvent?.pointerType === 'mouse') pickAt(e.nativeEvent.offsetX ?? e.nativeEvent.locationX);
          },
        } as any)
      : {};

  // X labels: fit ~ one per 46px
  const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(plotW / 46))));
  const selPoint = sel !== null ? points[sel] : null;
  const tipX = sel !== null ? xAt(sel) : 0;
  const tipY = selPoint?.value != null ? yAt(selPoint.value) : 0;
  const TIP_W = 132;
  const tipLeft = Math.max(0, Math.min(w - TIP_W, tipX - TIP_W / 2));

  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ height, width: '100%' }}>
      {w > 0 && (
        <>
          <Svg width={w} height={height}>
            <Defs>
              <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={c} stopOpacity={0.28} />
                <Stop offset="1" stopColor={c} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {/* grid + y labels */}
            {yS.ticks.map((t) => (
              <React.Fragment key={t}>
                <Line x1={PAD_L} x2={w - PAD_R} y1={yAt(t)} y2={yAt(t)} stroke={colors.chartGrid} strokeWidth={1} />
                <SvgText fontFamily={SVG_FONT} x={PAD_L - 8} y={yAt(t) + 4} fontSize={10} fill={colors.textMuted} textAnchor="end">
                  {formatAxis(t)}
                </SvgText>
              </React.Fragment>
            ))}
            {/* x labels */}
            {points.map((p, i) =>
              (n - 1 - i) % every === 0 ? (
                <SvgText
                  fontFamily={SVG_FONT}
                  key={`x${i}`}
                  x={xAt(i)}
                  y={height - 6}
                  fontSize={10}
                  fontWeight={i === sel ? '700' : '400'}
                  fill={i === sel ? colors.text : colors.textMuted}
                  textAnchor="middle"
                >
                  {p.label}
                </SvgText>
              ) : null,
            )}
            {/* selection guide */}
            {sel !== null && selPoint?.value != null && (
              <Line x1={tipX} x2={tipX} y1={PAD_T} y2={PAD_T + plotH} stroke={colors.borderStrong} strokeWidth={1} strokeDasharray="3,3" />
            )}
            {kind === 'line' && (
              <>
                {lineGeo.area ? <AnimatedPath d={lineGeo.area} fill={`url(#${gradId})`} animatedProps={areaProps} /> : null}
                <AnimatedPath
                  d={lineGeo.d}
                  stroke={c}
                  strokeWidth={2.5}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={`${lineGeo.length},${lineGeo.length}`}
                  animatedProps={lineProps}
                />
                {lineGeo.dots.map((d) =>
                  d.i === sel ? null : <Circle key={d.i} cx={d.x} cy={d.y} r={n > 30 ? 0 : 2.5} fill={colors.card} stroke={c} strokeWidth={1.5} />,
                )}
                {sel !== null && selPoint?.value != null && (
                  <>
                    <Circle cx={tipX} cy={tipY} r={9} fill={c} opacity={0.18} />
                    <Circle cx={tipX} cy={tipY} r={4.5} fill={c} stroke={colors.card} strokeWidth={2} />
                  </>
                )}
              </>
            )}
            {showAverage && avg !== null && values.length > 1 && (
              <>
                <Line x1={PAD_L} x2={w - PAD_R} y1={yAt(avg)} y2={yAt(avg)} stroke={colors.textMuted} strokeWidth={1} strokeDasharray="5,4" opacity={0.7} />
                <SvgText fontFamily={SVG_FONT} x={w - PAD_R - 2} y={yAt(avg) - 4} fontSize={9} fontWeight="700" fill={colors.textMuted} textAnchor="end">
                  {`${averageLabel} ${formatAxis(avg)}`}
                </SvgText>
              </>
            )}
          </Svg>

          {kind === 'bar' &&
            points.map((p, i) => (
              <Bar
                key={`${dataSig}-${i}`}
                x={PAD_L + slot * i + slot * 0.18}
                width={Math.max(2, slot * 0.64)}
                bottom={PAD_B}
                h={p.value ? ((p.value - yS.min) / (yS.max - yS.min || 1)) * plotH : 0}
                color={i === sel ? c : colors.chartBar}
                delay={i * 22}
              />
            ))}

          {/* touch layer (leaf view so locationX is relative to it) */}
          <View
            style={{ position: 'absolute', left: 0, top: 0, width: w, height }}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={onTouch}
            onResponderMove={onTouch}
            onResponderTerminationRequest={() => true}
            {...webHover}
          />

          {(touched || alwaysTooltip) && selPoint && selPoint.value !== null && (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: tipLeft,
                top: Math.max(0, (kind === 'bar' ? yAt(selPoint.value) : tipY) - 58),
                width: TIP_W,
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  backgroundColor: colors.buttonPrimary,
                  borderRadius: radii.sm,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  alignItems: 'center',
                }}
              >
                <AppText variant="label" style={{ color: colors.buttonPrimaryText, opacity: 0.7, fontSize: 9 }} numberOfLines={1}>
                  {selPoint.longLabel ?? selPoint.label}
                </AppText>
                <AppText variant="statSm" style={{ color: colors.buttonPrimaryText, fontSize: 14, lineHeight: 18 }} numberOfLines={1}>
                  {formatValue(selPoint.value)}
                </AppText>
                {formatMeta && sel !== null && formatMeta(sel) ? (
                  <AppText style={{ color: colors.buttonPrimaryText, opacity: 0.7, fontSize: 10 }} numberOfLines={1}>
                    {formatMeta(sel)}
                  </AppText>
                ) : null}
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

function Bar({ x, width, bottom, h, color, delay }: { x: number; width: number; bottom: number; h: number; color: string; delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) }));
  }, [p, delay]);
  const style = useAnimatedStyle(() => ({ height: Math.max(h > 0 ? 3 : 0, h * p.value) }), [h]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: x,
          bottom,
          width,
          backgroundColor: color,
          borderTopLeftRadius: Math.min(6, width / 2),
          borderTopRightRadius: Math.min(6, width / 2),
          borderBottomLeftRadius: 2,
          borderBottomRightRadius: 2,
        },
        style,
      ]}
    />
  );
}
