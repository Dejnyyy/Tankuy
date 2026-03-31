import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useWindowDimensions } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { AnimatedPressable } from "@/components/AnimatedComponents";

// ─── Layout constants ──────────────────────────────────────────────────────────
const BUMP_H   = 30;   // how far the curve rises above the flat bar
const FAB_R    = 28;   // Scan FAB circle radius
const NOTCH_W  = 56;   // half-width of the notch curve on each side
const BAR_H    = 58;   // flat bar height (exclusive of safe area)
const PILL_W   = 20;   // active indicator pill width
const PEAK_Y   = 2;    // top of curve (small gap from container top)

// ─── SVG path builder ─────────────────────────────────────────────────────────
function buildPath(w: number, totalH: number): string {
  const cx = w / 2;
  return (
    `M 0,${BUMP_H} ` +
    `L ${cx - NOTCH_W},${BUMP_H} ` +
    `C ${cx - NOTCH_W * 0.5},${BUMP_H} ` +
    `  ${cx - NOTCH_W * 0.5},${PEAK_Y} ` +
    `  ${cx},${PEAK_Y} ` +
    `C ${cx + NOTCH_W * 0.5},${PEAK_Y} ` +
    `  ${cx + NOTCH_W * 0.5},${BUMP_H} ` +
    `  ${cx + NOTCH_W},${BUMP_H} ` +
    `L ${w},${BUMP_H} ` +
    `L ${w},${totalH} ` +
    `L 0,${totalH} Z`
  );
}

// ─── Calculate x-center of each non-scan tab ──────────────────────────────────
function getIndicatorX(stateIndex: number, w: number): number {
  const groupW = (w - NOTCH_W * 2) / 2;
  const tabW   = groupW / 2;
  switch (stateIndex) {
    case 0: return tabW * 0.5;                           // Home
    case 1: return tabW * 1.5;                           // Find
    case 3: return groupW + NOTCH_W * 2 + tabW * 0.5;   // History
    case 4: return groupW + NOTCH_W * 2 + tabW * 1.5;   // Profile
    default: return w / 2;
  }
}

// ─── Icon map ──────────────────────────────────────────────────────────────────
function getIconName(name: string): string {
  switch (name) {
    case "index":   return "home";
    case "find":    return "map-marker";
    case "history": return "list";
    case "profile": return "user";
    default:        return "circle";
  }
}

// ─── Regular Tab ──────────────────────────────────────────────────────────────
interface RegularTabProps {
  route: any;
  isFocused: boolean;
  options: any;
  onPress: () => void;
  colors: any;
}

function RegularTab({ route, isFocused, options, onPress, colors }: RegularTabProps) {
  const label = options.title ?? route.name;
  const color = isFocused ? colors.tint : colors.tabIconDefault;
  const scale = useSharedValue(isFocused ? 1.18 : 1);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.18 : 1, { damping: 14, stiffness: 280 });
  }, [isFocused]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={styles.regularTab}
      onPress={onPress}
      scaleValue={0.88}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
    >
      <Animated.View style={iconStyle}>
        <FontAwesome name={getIconName(route.name) as any} size={21} color={color} />
      </Animated.View>
      <Text style={[styles.tabLabel, { color, fontWeight: isFocused ? "700" : "500" }]}>
        {label as string}
      </Text>
    </AnimatedPressable>
  );
}

// ─── Main curved tab bar ───────────────────────────────────────────────────────
export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets  = useSafeAreaInsets();

  const totalH = BUMP_H + BAR_H + insets.bottom;
  const path   = useMemo(() => buildPath(width, totalH), [width, totalH]);

  // ── Sliding indicator ──────────────────────────────────────────────────────
  const isScanActive = state.routes[state.index]?.name === "scan";

  const indicatorX       = useSharedValue(getIndicatorX(state.index, width));
  const indicatorOpacity = useSharedValue(isScanActive ? 0 : 1);

  useEffect(() => {
    if (state.routes[state.index]?.name === "scan") {
      indicatorOpacity.value = withTiming(0, { duration: 150 });
    } else {
      indicatorOpacity.value = withTiming(1, { duration: 200 });
      indicatorX.value = withSpring(getIndicatorX(state.index, width), {
        damping: 18,
        stiffness: 220,
      });
    }
  }, [state.index, width]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity:   indicatorOpacity.value,
    transform: [{ translateX: indicatorX.value }],
  }));

  // ── Route grouping ─────────────────────────────────────────────────────────
  const routes = state.routes.filter(
    (r) => !((descriptors[r.key].options as any).href === null || r.name === "two"),
  );
  const scanIdx    = routes.findIndex((r) => r.name === "scan");
  const leftRoutes = routes.slice(0, scanIdx);
  const rightRoutes = routes.slice(scanIdx + 1);
  const scanRoute  = routes[scanIdx];

  const makePress = (route: any) => () => {
    const focused = state.routes[state.index]?.key === route.key;
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
  };

  return (
    <View style={{ height: totalH, width }}>
      {/* ── Curved SVG background ── */}
      <Svg width={width} height={totalH} style={StyleSheet.absoluteFillObject}>
        {/* Fill */}
        <Path d={path} fill={colors.card} />
        {/* Hairline border */}
        <Path
          d={path}
          fill="none"
          stroke={colors.border}
          strokeWidth={StyleSheet.hairlineWidth * 1.5}
        />
      </Svg>

      {/* ── Tab row (below the bump) ── */}
      <View style={[styles.tabRow, { top: BUMP_H, height: BAR_H }]}>
        {/* Left tabs */}
        <View style={styles.tabGroup}>
          {leftRoutes.map((r) => (
            <RegularTab
              key={r.key}
              route={r}
              isFocused={state.routes[state.index]?.key === r.key}
              options={descriptors[r.key].options}
              onPress={makePress(r)}
              colors={colors}
            />
          ))}
        </View>

        {/* Centre spacer for FAB */}
        <View style={{ width: NOTCH_W * 2 }} />

        {/* Right tabs */}
        <View style={styles.tabGroup}>
          {rightRoutes.map((r) => (
            <RegularTab
              key={r.key}
              route={r}
              isFocused={state.routes[state.index]?.key === r.key}
              options={descriptors[r.key].options}
              onPress={makePress(r)}
              colors={colors}
            />
          ))}
        </View>
      </View>

      {/* ── Sliding active indicator pill ── */}
      <Animated.View
        style={[
          styles.indicatorPill,
          { backgroundColor: colors.tint, bottom: insets.bottom + 5 },
          indicatorStyle,
        ]}
      />

      {/* ── Scan FAB (centred in the bump) ── */}
      {scanRoute && (
        <AnimatedPressable
          style={[
            styles.fabWrap,
            { top: BUMP_H - FAB_R, left: width / 2 - FAB_R },
          ]}
          onPress={makePress(scanRoute)}
          scaleValue={0.88}
          accessibilityRole="button"
          accessibilityState={isScanActive ? { selected: true } : {}}
          accessibilityLabel={
            (descriptors[scanRoute.key].options as any).tabBarAccessibilityLabel
          }
        >
          <View
            style={[
              styles.fabCircle,
              { backgroundColor: colors.tint, shadowColor: colors.tint },
            ]}
          >
            <FontAwesome name="camera" size={22} color="#FFF" />
          </View>
        </AnimatedPressable>
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tabRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
  },
  tabGroup: {
    flex: 1,
    flexDirection: "row",
  },
  regularTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.1,
  },

  // ── Active indicator pill ─────────────────────────────────────────────────
  indicatorPill: {
    position: "absolute",
    width: PILL_W,
    height: 3,
    borderRadius: 2,
    // x=0 at left edge; translateX centres it on the active tab
    left: -PILL_W / 2,
  },

  // ── Scan FAB ──────────────────────────────────────────────────────────────
  fabWrap: {
    position: "absolute",
    width: FAB_R * 2,
    height: FAB_R * 2,
  },
  fabCircle: {
    width: FAB_R * 2,
    height: FAB_R * 2,
    borderRadius: FAB_R,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});