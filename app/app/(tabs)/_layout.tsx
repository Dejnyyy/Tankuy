import React, { useMemo } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import { StyleSheet, View, Platform, useWindowDimensions } from "react-native";

import { useTheme } from "@/context/ThemeContext";
import { CustomTabBar } from "@/components/CustomTabBar";

export default function TabLayout() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const dynamicStyles = useMemo(() => getStyles(colors), [colors]);

  const isDesktop = Platform.OS === "web" && width >= 768;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarStyle: isDesktop ? { display: "none" } : undefined, // fallback pattern
        }}
        // Using standard style prop. In React Navigation / Expo Router, custom style
        // can be passed to the underlying View
        // @ts-ignore
        style={isDesktop ? { marginLeft: 240 } : undefined}
      >
        <Tabs.Screen name="index" options={{ title: "Home" }} />
        <Tabs.Screen name="find" options={{ title: "Find" }} />
        <Tabs.Screen name="scan" options={{ title: "Scan" }} />
        <Tabs.Screen name="history" options={{ title: "History" }} />
        <Tabs.Screen name="profile" options={{ title: "Profile" }} />
        <Tabs.Screen name="two" options={{ href: null } as any} />
      </Tabs>
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    // legacy styles not used anymore because CustomTabBar handles it
  });

const styles = StyleSheet.create({
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 4,
  },
  iconContainer: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
});
