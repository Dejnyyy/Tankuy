import React from "react";
import { Tabs } from "expo-router";
import { View, Platform, useWindowDimensions } from "react-native";

import { useTheme } from "@/context/ThemeContext";
import { CustomTabBar } from "@/components/CustomTabBar";

export default function TabLayout() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  const isDesktop = Platform.OS === "web" && width >= 768;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/*
        On desktop the sidebar uses position:fixed (web-only) so it sits
        anchored to the viewport. The content wrapper is offset by 240px
        so nothing hides behind the sidebar.
      */}
      <View style={{ flex: 1, marginLeft: isDesktop ? 240 : 0 }}>
        <Tabs
          tabBar={(props) => <CustomTabBar {...props} />}
          screenOptions={{ headerShown: false }}
        >
          <Tabs.Screen name="index" options={{ title: "Home" }} />
          <Tabs.Screen name="find" options={{ title: "Find" }} />
          <Tabs.Screen name="scan" options={{ title: "Scan" }} />
          <Tabs.Screen name="history" options={{ title: "History" }} />
          <Tabs.Screen name="profile" options={{ title: "Profile" }} />
          <Tabs.Screen name="two" options={{ href: null } as any} />
        </Tabs>
      </View>
    </View>
  );
}