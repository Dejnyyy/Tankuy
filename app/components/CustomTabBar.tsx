import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useWindowDimensions } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { AnimatedPressable } from "@/components/AnimatedComponents";

// react-native-svg Path wrapped as a Reanimated animated component
const AnimatedPath = Animated.createAnimatedComponent(Path);

// ─── Layout constants ──────────────────────────────────────────────────────────
const BUMP_H  = 28;  // how far the bump rises above the flat bar
const FAB_R   = 26;  // FAB circle radius
const NOTCH_W = 36;  // half-width of the curve on each side of centre
const BAR_H   = 58;  // flat bar height (without safe area)
const PEAK_Y  = 2;   // peak of curve (small gap from container top)

// ─── Helpers ──────────────────────────────────────────────────────────────────
function tabCenterX(visibleIdx: number, w: number, count: number): number {
  const tabW = w / count;
  return tabW * visibleIdx + tabW / 2;
}

function iconForRoute(name: string): string {
  switch (name) {
    case "index":   return "home";
    case "find":    return "map-marker";
    case "scan":    return "camera";
    case "history": return "list";
    case "profile": return "user";
    default:        return "circle";
  }
}

// ─── Single tab item ──────────────────────────────────────────────────────────
interface TabItemProps {
  route: any;
  isFocused: boolean;
  options: any;
  onPress: () => void;
  colors: any;
}

function TabItem({ route, isFocused, options, onPress, colors }: TabItemProps) {
  const label = options.title ?? route.name;
  const color = isFocused ? colors.tint : colors.tabIconDefault;

  // Fade icon out when focused (FAB shows it instead)
  const iconOpacity = useSharedValue(isFocused ? 0 : 1);
  useEffect(() => {
    iconOpacity.value = withTiming(isFocused ? 0 : 1, { duration: 180 });
  }, [isFocused]);
  const iconStyle = useAnimatedStyle(() => ({ opacity: iconOpacity.value }));

  return (
    <AnimatedPressable
      style={styles.tabItem}
      onPress={onPress}
      scaleValue={0.88}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
    >
      <Animated.View style={iconStyle}>
        <FontAwesome name={iconForRoute(route.name) as any} size={21} color={color} />
      </Animated.View>
      <Text style={[styles.tabLabel, { color, fontWeight: isFocused ? "700" : "500" }]}>
        {label as string}
      </Text>
    </AnimatedPressable>
  );
}

// ─── Main tab bar ─────────────────────────────────────────────────────────────
export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const { width }  = useWindowDimensions();
  const insets     = useSafeAreaInsets();

  const totalH = BUMP_H + BAR_H + insets.bottom;

  // Visible routes (exclude hidden ones)
  const visibleRoutes = state.routes.filter(
    (r) => !((descriptors[r.key].options as any).href === null || r.name === "two"),
  );
  const TAB_COUNT = visibleRoutes.length; // 5

  const activeVisIdx = visibleRoutes.findIndex(
    (r) => r.key === state.routes[state.index]?.key,
  );
  const activeRoute = visibleRoutes[activeVisIdx];

  // ── Shared values (need to be readable inside Reanimated worklets) ─────────
  const bumpX  = useSharedValue(tabCenterX(activeVisIdx, width, TAB_COUNT));
  const svgW   = useSharedValue(width);
  const svgTH  = useSharedValue(totalH);

  useEffect(() => { svgW.value  = width;  }, [width]);
  useEffect(() => { svgTH.value = totalH; }, [totalH]);

  // Animate bump to active tab when tab or screen width changes
  useEffect(() => {
    bumpX.value = withSpring(tabCenterX(activeVisIdx, width, TAB_COUNT), {
      damping: 16,
      stiffness: 180,
      mass: 0.8,
    });
  }, [activeVisIdx, width, TAB_COUNT]);

  // ── Animated SVG path (rebuilds string on every frame from bumpX) ──────────
  const animatedPathProps = useAnimatedProps(() => {
    const cx = bumpX.value;
    const w  = svgW.value;
    const tH = svgTH.value;
    const d =
      `M 0,${BUMP_H} ` +
      `L ${cx - NOTCH_W},${BUMP_H} ` +
      `C ${cx - NOTCH_W * 0.5},${BUMP_H} ` +
      `  ${cx - NOTCH_W * 0.5},${PEAK_Y} ` +
      `  ${cx},${PEAK_Y} ` +
      `C ${cx + NOTCH_W * 0.5},${PEAK_Y} ` +
      `  ${cx + NOTCH_W * 0.5},${BUMP_H} ` +
      `  ${cx + NOTCH_W},${BUMP_H} ` +
      `L ${w},${BUMP_H} ` +
      `L ${w},${tH} ` +
      `L 0,${tH} Z`;
    return { d };
  }) as any;

  // ── Animated FAB position (follows the same spring as the bump) ───────────
  const fabStyle = useAnimatedStyle(() => ({
    left: bumpX.value - FAB_R,
  }));

  // ── Navigation ───────────────────────────────────────────────────────────
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
      {/* ── Animated curved SVG background ── */}
      <Svg width={width} height={totalH} style={StyleSheet.absoluteFillObject}>
        <AnimatedPath animatedProps={animatedPathProps} fill={colors.card} />
        <AnimatedPath
          animatedProps={animatedPathProps}
          fill="none"
          stroke={colors.border}
          strokeWidth={StyleSheet.hairlineWidth * 1.5}
        />
      </Svg>

      {/* ── Tab row ── */}
      <View style={[styles.tabRow, { top: BUMP_H, height: BAR_H }]}>
        {visibleRoutes.map((r) => (
          <TabItem
            key={r.key}
            route={r}
            isFocused={r.key === state.routes[state.index]?.key}
            options={descriptors[r.key].options}
            onPress={makePress(r)}
            colors={colors}
          />
        ))}
      </View>

      {/* ── Animated FAB — purely visual, pointerEvents none so taps go to TabItems ── */}
      <Animated.View
        style={[styles.fabWrap, { top: BUMP_H - FAB_R }, fabStyle]}
        pointerEvents="none"
      >
        <View
          style={[
            styles.fabCircle,
            { backgroundColor: colors.tint, shadowColor: colors.tint },
          ]}
        >
          <FontAwesome
            name={(activeRoute ? iconForRoute(activeRoute.name) : "circle") as any}
            size={22}
            color="#FFF"
          />
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tabRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingTop: 6,
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.1,
  },
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