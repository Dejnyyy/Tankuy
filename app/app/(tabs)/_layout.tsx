import React, { useEffect } from "react";
import { Tabs, usePathname, useRouter } from "expo-router";
import { View, Text, StyleSheet, Platform, useWindowDimensions } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "@/context/ThemeContext";
import { CustomTabBar } from "@/components/CustomTabBar";
import { AnimatedPressable } from "@/components/AnimatedComponents";

// ─── Desktop sidebar ──────────────────────────────────────────────────────────
const SIDEBAR_ROUTES = [
  { name: "index",   title: "Home",    icon: "home",       href: "/"        },
  { name: "find",    title: "Find",    icon: "map-marker", href: "/find"    },
  { name: "scan",    title: "Scan",    icon: "camera",     href: "/scan"    },
  { name: "history", title: "History", icon: "list",       href: "/history" },
  { name: "profile", title: "Profile", icon: "user",       href: "/profile" },
] as const;

function SidebarNavItem({
  title,
  icon,
  href,
  isActive,
  colors,
  onPress,
}: {
  title: string;
  icon: string;
  href: string;
  isActive: boolean;
  colors: any;
  onPress: () => void;
}) {
  const bgOpacity = useSharedValue(isActive ? 1 : 0);
  const accentOpacity = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    bgOpacity.value = withTiming(isActive ? 1 : 0, { duration: 200 });
    accentOpacity.value = withTiming(isActive ? 1 : 0, { duration: 200 });
  }, [isActive]);

  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));
  const accentStyle = useAnimatedStyle(() => ({ opacity: accentOpacity.value }));

  return (
    <AnimatedPressable
      style={styles.sidebarItem}
      onPress={onPress}
      scaleValue={0.98}
      accessibilityRole="button"
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          styles.sidebarItemBg,
          { backgroundColor: colors.primaryLight },
          bgStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.sidebarAccent,
          { backgroundColor: colors.tint },
          accentStyle,
        ]}
      />
      <View style={styles.sidebarIconWrap}>
        <FontAwesome
          name={icon as any}
          size={19}
          color={isActive ? colors.tint : colors.tabIconDefault}
        />
      </View>
      <Text
        style={[
          styles.sidebarLabel,
          {
            color: isActive ? colors.text : colors.textSecondary,
            fontWeight: isActive ? "600" : "400",
          },
        ]}
      >
        {title}
      </Text>
    </AnimatedPressable>
  );
}

function DesktopSidebar({ colors }: { colors: any }) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (name: string, href: string) => {
    if (name === "index") return pathname === "/" || pathname === "";
    return pathname === href || pathname.startsWith(href);
  };

  return (
    <View
      style={[
        styles.sidebar,
        { backgroundColor: colors.card, borderRightColor: colors.border },
      ]}
    >
      <View style={styles.sidebarHeader}>
        <FontAwesome name="tint" size={22} color={colors.tint} />
        <Text style={[styles.sidebarLogoText, { color: colors.text }]}>
          Tankuy<Text style={{ color: colors.tint }}>.</Text>
        </Text>
      </View>

      <View style={styles.sidebarContent}>
        {SIDEBAR_ROUTES.map((route) => (
          <SidebarNavItem
            key={route.name}
            title={route.title}
            icon={route.icon}
            href={route.href}
            isActive={isActive(route.name, route.href)}
            colors={colors}
            onPress={() => router.push(route.href as any)}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Layout ────────────────────────────────────────────────────────────────────
export default function TabLayout() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 768;

  return (
    <View
      style={{
        flex: 1,
        flexDirection: isDesktop ? "row" : "column",
        backgroundColor: colors.background,
      }}
    >
      {/* Sidebar lives here as a proper flex sibling — no absolute/fixed needed */}
      {isDesktop && <DesktopSidebar colors={colors} />}

      {/* Content fills the remaining width */}
      <View style={{ flex: 1 }}>
        <Tabs
          tabBar={(props) =>
            isDesktop ? <></> : <CustomTabBar {...props} />
          }
          screenOptions={{ headerShown: false }}
        >
          <Tabs.Screen name="index"   options={{ title: "Home"    }} />
          <Tabs.Screen name="find"    options={{ title: "Find"    }} />
          <Tabs.Screen name="scan"    options={{ title: "Scan"    }} />
          <Tabs.Screen name="history" options={{ title: "History" }} />
          <Tabs.Screen name="profile" options={{ title: "Profile" }} />
          <Tabs.Screen name="two"     options={{ href: null } as any} />
        </Tabs>
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    borderRightWidth: 1,
    paddingTop: 36,
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
  sidebarIconWrap: {
    width: 32,
    alignItems: "center",
    marginRight: 12,
  },
  sidebarLabel: {
    fontSize: 15,
  },
});