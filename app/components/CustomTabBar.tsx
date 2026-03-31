import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
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

// ─── Main Tab Bar (mobile only — desktop sidebar lives in _layout.tsx) ─────────
export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();

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