import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTheme } from "@/context/ThemeContext";

export function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  // Only show sidebar on web if width >= 768px (tablet/desktop)
  const isDesktop = Platform.OS === "web" && width >= 768;

  if (isDesktop) {
    return (
      <View
        style={[
          styles.sidebar,
          { backgroundColor: colors.card, borderRightColor: colors.border },
        ]}
      >
        <View style={styles.sidebarHeader}>
          <Text style={[styles.sidebarLogoText, { color: colors.text }]}>
            Tankuy<Text style={{ color: colors.primary }}>.</Text>
          </Text>
        </View>

        <View style={styles.sidebarContent}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const expoOptions = options as any;
            if (expoOptions.href === null || route.name === "two") return null;

            const label =
              options.title !== undefined ? options.title : route.name;
            const isFocused = state.index === index;

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

            const color = isFocused ? colors.primary : colors.tabIconDefault;
            const bgColor = isFocused ? colors.primaryLight : "transparent";

            // Extract icon name from options if provided, fallback to circle
            // Note: Since we use TabBarIcon in _layout.tsx, we need to map names manually or pass them through options.tabBarAccessibilityLabel temporarily
            let iconName = "circle";
            if (route.name === "index") iconName = "home";
            if (route.name === "find") iconName = "map-marker";
            if (route.name === "scan") iconName = "camera";
            if (route.name === "history") iconName = "list";
            if (route.name === "profile") iconName = "user";

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={(options as any).tabBarTestID}
                onPress={onPress}
                style={[styles.sidebarItem, { backgroundColor: bgColor }]}
              >
                <View style={styles.sidebarIconContainer}>
                  <FontAwesome name={iconName as any} size={20} color={color} />
                </View>
                <Text
                  style={[
                    styles.sidebarLabel,
                    { color: isFocused ? colors.text : colors.textSecondary },
                  ]}
                >
                  {label as string}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  // Mobile Bottom Bar
  return (
    <View
      style={[
        styles.bottomBar,
        { backgroundColor: colors.card, borderTopColor: colors.border },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const expoOptions = options as any;
        if (expoOptions.href === null || route.name === "two") return null;

        const label = options.title !== undefined ? options.title : route.name;
        const isFocused = state.index === index;

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

        const color = isFocused ? colors.primary : colors.tabIconDefault;

        let iconName = "circle";
        if (route.name === "index") iconName = "home";
        if (route.name === "find") iconName = "map-marker";
        if (route.name === "scan") iconName = "camera";
        if (route.name === "history") iconName = "list";
        if (route.name === "profile") iconName = "user";

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={(options as any).tabBarTestID}
            onPress={onPress}
            style={styles.bottomBarItem}
          >
            <View style={styles.bottomBarIconContainer}>
              <FontAwesome name={iconName as any} size={22} color={color} />
            </View>
            <Text style={[styles.bottomBarLabel, { color: color }]}>
              {label as string}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Desktop Sidebar Styles
  sidebar: {
    width: 240,
    height: "100%",
    position: "absolute",
    left: 0,
    top: 0,
    borderRightWidth: 1,
    paddingTop: 32,
    zIndex: 10,
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  sidebarLogoIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  sidebarLogoText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  sidebarContent: {
    paddingHorizontal: 16,
    flex: 1,
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  sidebarIconContainer: {
    width: 32,
    alignItems: "center",
    marginRight: 12,
  },
  sidebarLabel: {
    fontSize: 16,
    fontWeight: "500",
  },

  // Mobile Bottom Bar Styles
  bottomBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
    height: Platform.OS === "ios" ? 85 : 65,
  },
  bottomBarItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBarIconContainer: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomBarLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 4,
  },
});
