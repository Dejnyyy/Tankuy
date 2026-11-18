import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import "react-native-reanimated";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { ToastProvider } from "@/components/ui/Toast";
import { Archivo_600SemiBold } from "@expo-google-fonts/archivo/600SemiBold";
import { Archivo_700Bold } from "@expo-google-fonts/archivo/700Bold";
import { Archivo_800ExtraBold } from "@expo-google-fonts/archivo/800ExtraBold";
import { JetBrainsMono_500Medium } from "@expo-google-fonts/jetbrains-mono/500Medium";
import { View, ActivityIndicator, StyleSheet } from "react-native";

import {
  ThemeProvider as CustomThemeProvider,
  useTheme,
} from "@/context/ThemeContext";
import {
  DefaultTheme as NavigationDefaultTheme,
  DarkTheme as NavigationDarkTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";

function RootLayoutNav() {
  const { colors, isDark } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Define navigation theme based on our context
  const baseTheme = isDark ? NavigationDarkTheme : NavigationDefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
    },
  };

  useEffect(() => {
    // ... (auth logic same as before)
    if (isLoading) return;

    const inAuthGroup = segments[0] === "login";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="(legal)"
          options={{
            headerShown: false,
            gestureEnabled: true,
            gestureDirection: "horizontal",
            fullScreenGestureEnabled: true,
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="entry"
          options={{ presentation: "modal", headerShown: false, animation: "slide_from_bottom" }}
        />
      </Stack>
    </NavigationThemeProvider>
  );
}

import { initI18n } from "@/i18n";

export default function RootLayout() {
  // ... (fonts loading logic same as before)
  const [loaded, error] = useFonts({
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    JetBrainsMono_500Medium,
    ...FontAwesome.font,
  });
  const [i18nInitialized, setI18nInitialized] = useState(false);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initI18n();
        setI18nInitialized(true);
      } catch (e) {
        console.warn("Failed to initialize i18n", e);
        setI18nInitialized(true); // Proceed anyway
      }
    };
    initializeApp();
  }, []);

  useEffect(() => {
    if (loaded && i18nInitialized) {
      SplashScreen.hideAsync();
    }
  }, [loaded, i18nInitialized]);

  if (!loaded || !i18nInitialized) {
    return null;
  }

  return (
    <CustomThemeProvider>
      <AuthProvider>
        <DataProvider>
          <ToastProvider>
            <ThemedStatusBar />
            <RootLayoutNav />
          </ToastProvider>
        </DataProvider>
      </AuthProvider>
    </CustomThemeProvider>
  );
}

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} translucent backgroundColor="transparent" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
