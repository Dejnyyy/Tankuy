import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/context/ThemeContext";
import { AnimatedPressable } from "@/components/AnimatedComponents";

function getIconName(routeName: string): string {
  switch (routeName) {
    case "index":   return "home";
    case "find":    return "map-marker";
    case "scan":    return "camera";
    case "history": return "list";
    case "profile": return "user";
    default:        return "circle";
  }
}

interface TabItemProps {
  route: any;
  isFocused: boolean;
  options: any;
  navigation: any;
  colors: any;
}

// ─── Mobile Tab Item ───────────────────────────────────────────────────────────
function MobileTabItem({ route, isFocused, options, navigation, colors }: TabItemProps) {
  const isScan = route.name === "scan";
  const iconName = getIconName(route.name);
  const label = options.title ?? route.name;
  const color = isFocused ? colors.tint : colors.tabIconDefault;

  // Icon scale animation on active state change
  const iconScale = useSharedValue(isFocused ? 1.15 : 1);

  useEffect(() => {
    iconScale.value = withSpring(isFocused ? 1.15 : 1, {
      damping: 14,
      stiffness: 260,
    });
  }, [isFocused]);

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const onPress = () => {
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  // ── Scan FAB ──────────────────────────────────────────────────────────────
  if (isScan) {
    return (
      <AnimatedPressable
        style={styles.scanItem}
        onPress={onPress}
        scaleValue={0.88}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel}
      >
        <View
          style={[
            styles.scanCircle,
            { backgroundColor: colors.tint, shadowColor: colors.tint },
          ]}
        >
          <FontAwesome name="camera" size={22} color="#FFFFFF" />
        </View>
        <Text style={[styles.scanLabel, { color: colors.tint }]}>
          {label as string}
        </Text>
      </AnimatedPressable>
    );
  }

  // ── Regular Tab ───────────────────────────────────────────────────────────
  return (
    <AnimatedPressable
      style={styles.bottomBarItem}
      onPress={onPress}
      scaleValue={0.9}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
    >
      <Animated.View style={iconAnimStyle}>
        <FontAwesome name={iconName as any} size={22} color={color} />
      </Animated.View>
      <Text
        style={[
          styles.bottomBarLabel,
          { color, fontWeight: isFocused ? "700" : "500" },
        ]}
      >
        {label as string}
      </Text>
    </AnimatedPressable>
  );
}

// ─── Desktop Sidebar Item ──────────────────────────────────────────────────────
function SidebarItem({ route, isFocused, options, navigation, colors }: TabItemProps) {
  const iconName = getIconName(route.name);
  const label = options.title ?? route.name;
  const color = isFocused ? colors.tint : colors.tabIconDefault;

  const bgOpacity = useSharedValue(isFocused ? 1 : 0);
  const accentOpacity = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    bgOpacity.value = withTiming(isFocused ? 1 : 0, { duration: 200 });
    accentOpacity.value = withTiming(isFocused ? 1 : 0, { duration: 200 });
  }, [isFocused]);

  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));
  const accentStyle = useAnimatedStyle(() => ({
    opacity: accentOpacity.value,
    transform: [{ scaleY: accentOpacity.value }],
  }));

  const onPress = () => {
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  return (
    <AnimatedPressable
      style={styles.sidebarItem}
      onPress={onPress}
      scaleValue={0.98}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
    >
      {/* Animated background */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          styles.sidebarItemBg,
          { backgroundColor: colors.primaryLight },
          bgStyle,
        ]}
      />
      {/* Left accent bar */}
      <Animated.View
        style={[
          styles.sidebarAccent,
          { backgroundColor: colors.tint },
          accentStyle,
        ]}
      />
      <View style={styles.sidebarIconContainer}>
        <FontAwesome name={iconName as any} size={19} color={color} />
      </View>
      <Text
        style={[
          styles.sidebarLabel,
          {
            color: isFocused ? colors.text : colors.textSecondary,
            fontWeight: isFocused ? "600" : "400",
          },
        ]}
      >
        {label as string}
      </Text>
    </AnimatedPressable>
  );
}

// ─── Main Tab Bar ──────────────────────────────────────────────────────────────
export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 768;

  // ── Desktop Sidebar ──────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View
        style={[
          styles.sidebar,
          {
            backgroundColor: colors.card,
            borderRightColor: colors.border,
            // Fixed to viewport on web so content offset works independently
            position: (Platform.OS === "web" ? "fixed" : "absolute") as any,
          },
        ]}
      >
        <View style={styles.sidebarHeader}>
          <FontAwesome name="tint" size={22} color={colors.tint} />
          <Text style={[styles.sidebarLogoText, { color: colors.text }]}>
            Tankuy<Text style={{ color: colors.tint }}>.</Text>
          </Text>
        </View>

        <View style={styles.sidebarContent}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            if ((options as any).href === null || route.name === "two") return null;
            return (
              <SidebarItem
                key={route.key}
                route={route}
                isFocused={state.index === index}
                options={options}
                navigation={navigation}
                colors={colors}
              />
            );
          })}
        </View>
      </View>
    );
  }

  // ── Mobile Bottom Bar ────────────────────────────────────────────────────
  return (
    <View
      style={[
        styles.bottomBar,
        { backgroundColor: colors.card, borderTopColor: colors.border },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        if ((options as any).href === null || route.name === "two") return null;
        return (
          <MobileTabItem
            key={route.key}
            route={route}
            isFocused={state.index === index}
            options={options}
            navigation={navigation}
            colors={colors}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Desktop Sidebar ────────────────────────────────────────────────────
  sidebar: {
    width: 240,
    height: "100%",
    position: "absolute",
    left: 0,
    top: 0,
    borderRightWidth: 1,
    paddingTop: 36,
    zIndex: 10,
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 36,
    gap: 10,
  },
  sidebarLogoText: {
    fontSize: 22,
    fontWeight: "700",
  },
  sidebarContent: {
    paddingHorizontal: 12,
    flex: 1,
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  sidebarItemBg: {
    borderRadius: 12,
  },
  sidebarAccent: {
    position: "absolute",
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  sidebarIconContainer: {
    width: 32,
    alignItems: "center",
    marginRight: 12,
  },
  sidebarLabel: {
    fontSize: 15,
  },

  // ── Mobile Bottom Bar ─────────────────────────────────────────────────
  bottomBar: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 10,
  },
  bottomBarItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
    gap: 5,
  },
  bottomBarLabel: {
    fontSize: 10,
    letterSpacing: 0.1,
  },

  // ── Scan FAB ─────────────────────────────────────────────────────────
  scanItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingTop: 2,
  },
  scanCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
    elevation: 8,
  },
  scanLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
});