import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";
import Constants, { ExecutionEnvironment } from "expo-constants";
import api, { User } from "../services/api";

// Complete auth session for web
WebBrowser.maybeCompleteAuthSession();

// Conditionally import native Google Sign-In (not available on web)
let GoogleSignin: any = null;
let statusCodes: any = {};

// Check if running in Expo Go
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.appOwnership === "expo";

try {
  if (Platform.OS !== "web" && !isExpoGo) {
    const nativeGoogle = require("@react-native-google-signin/google-signin");
    GoogleSignin = nativeGoogle.GoogleSignin;
    statusCodes = nativeGoogle.statusCodes;

    // Initialize native Google Sign-In
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      offlineAccess: true,
    });
  }
} catch (e) {
  console.log("Native Google Sign-In not available (Expo Go detected):", e);
  GoogleSignin = null;
}

const STORAGE_KEYS = {
  ACCESS_TOKEN: "@tankuy_access_token",
  REFRESH_TOKEN: "@tankuy_refresh_token",
  DEVICE_ID: "@tankuy_device_id",
  USER: "@tankuy_user",
};

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Web OAuth configuration - uses Expo auth proxy automatically when logged into Expo
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  // Handle web OAuth response
  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      if (authentication?.accessToken) {
        handleWebAuthSuccess(authentication.accessToken);
      }
    } else if (response?.type === "error") {
      setError("Google sign-in failed");
      setIsLoading(false);
    }
  }, [response]);

  const handleWebAuthSuccess = async (accessToken: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Get user info from Google
      const userInfoResponse = await fetch(
        "https://www.googleapis.com/userinfo/v2/me",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const googleUser = await userInfoResponse.json();

      const deviceId = await getDeviceId();
      const deviceName = getDeviceName();

      // For web, we'll use a different auth endpoint that accepts Google access token
      const {
        user: authUser,
        accessToken: serverToken,
        refreshToken,
      } = await api.signInWithGoogleWeb(
        accessToken,
        googleUser,
        "web",
        deviceId,
        deviceName,
      );

      // Store tokens and user data
      api.setAccessToken(serverToken);
      setUser(authUser);

      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, serverToken],
        [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
        [STORAGE_KEYS.USER, JSON.stringify(authUser)],
      ]);
    } catch (err: any) {
      console.error("Web auth error:", err);
      setError(err.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate or get device ID
  const getDeviceId = useCallback(async (): Promise<string> => {
    let deviceId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);

    if (!deviceId) {
      deviceId = `${Device.modelName || "device"}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
    }

    return deviceId;
  }, []);

  // Get device name for display
  const getDeviceName = useCallback(() => {
    if (Platform.OS === "web") {
      return "Web Browser";
    }
    return Device.modelName || `${Platform.OS} Device`;
  }, []);

  // Try to restore session on app load
  const restoreSession = useCallback(async () => {
    try {
      const [accessToken, refreshToken, storedUser] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER),
      ]);

      if (accessToken && storedUser) {
        api.setAccessToken(accessToken);
        setUser(JSON.parse(storedUser));

        // Verify token is still valid by making a request
        try {
          const freshUser = await api.getMe();
          setUser(freshUser);
          await AsyncStorage.setItem(
            STORAGE_KEYS.USER,
            JSON.stringify(freshUser),
          );
        } catch (err) {
          // Token expired, try to refresh
          if (refreshToken) {
            const deviceId = await getDeviceId();
            try {
              const { accessToken: newToken } = await api.refreshToken(
                refreshToken,
                deviceId,
              );
              api.setAccessToken(newToken);
              await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newToken);

              const freshUser = await api.getMe();
              setUser(freshUser);
              await AsyncStorage.setItem(
                STORAGE_KEYS.USER,
                JSON.stringify(freshUser),
              );
            } catch {
              // Refresh failed, clear session
              await clearSession();
            }
          } else {
            await clearSession();
          }
        }
      }
    } catch (err) {
      console.error("Failed to restore session:", err);
      await clearSession();
    } finally {
      setIsLoading(false);
    }
  }, [getDeviceId]);

  const clearSession = async () => {
    api.setAccessToken(null);
    setUser(null);
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER,
    ]);
  };

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const signInWithGoogle = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (Platform.OS === "web" || isExpoGo) {
        // Use web OAuth flow
        await promptAsync();
        // The response will be handled by the useEffect above
        return;
      }

      // Native platforms: use native Google Sign-In SDK
      if (!GoogleSignin) {
        throw new Error("Google Sign-In not available");
      }

      // Check if Google Play Services are available
      await GoogleSignin.hasPlayServices();

      // Perform Google Sign-In
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;

      if (!idToken) {
        throw new Error("No ID token received from Google");
      }

      const deviceId = await getDeviceId();
      const deviceName = getDeviceName();
      const platform = Platform.OS;

      // Authenticate with our backend
      const {
        user: authUser,
        accessToken,
        refreshToken,
      } = await api.signInWithGoogle(idToken, platform, deviceId, deviceName);

      // Store tokens and user data
      api.setAccessToken(accessToken);
      setUser(authUser);

      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
        [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
        [STORAGE_KEYS.USER, JSON.stringify(authUser)],
      ]);
    } catch (err: any) {
      if (err.code === statusCodes?.SIGN_IN_CANCELLED) {
        console.log("User cancelled sign-in");
      } else if (err.code === statusCodes?.IN_PROGRESS) {
        console.log("Sign-in in progress");
      } else if (err.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
        setError("Play services not available");
      } else {
        console.error("Sign-in error:", err);
        setError(err.message || "Sign-in failed");
      }
      throw err;
    } finally {
      if (Platform.OS !== "web" && !isExpoGo) {
        setIsLoading(false);
      }
    }
  }, [getDeviceId, getDeviceName, promptAsync]);

  const signInAsGuest = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const deviceId = await getDeviceId();
      const deviceName = getDeviceName();

      const { user: authUser, accessToken, refreshToken } = await api.signInAsGuest(
        deviceId,
        deviceName
      );

      api.setAccessToken(accessToken);
      setUser(authUser);

      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
        [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
        [STORAGE_KEYS.USER, JSON.stringify(authUser)],
      ]);
    } catch (err: any) {
      console.error('Guest sign-in error:', err);
      setError(err.message || 'Guest sign-in failed');
    } finally {
      setIsLoading(false);
    }
  }, [getDeviceId, getDeviceName]);

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);

      const deviceId = await getDeviceId();

      // Sign out from Google (native only)
      if (Platform.OS !== "web" && !isExpoGo && GoogleSignin) {
        try {
          await GoogleSignin.signOut();
        } catch (err) {
          console.error("Google sign out failed:", err);
        }
      }

      // Logout from our backend
      try {
        await api.logout(deviceId);
      } catch (err) {
        console.error("Backend logout failed:", err);
      }

      // Clear local session
      await clearSession();
    } catch (err) {
      console.error("Sign out error:", err);
      // Still clear session even if sign out fails
      await clearSession();
    } finally {
      setIsLoading(false);
    }
  }, [getDeviceId]);

  const refreshAuth = useCallback(async (): Promise<boolean> => {
    try {
      const refreshToken = await AsyncStorage.getItem(
        STORAGE_KEYS.REFRESH_TOKEN,
      );

      if (!refreshToken) {
        return false;
      }

      const deviceId = await getDeviceId();
      const { accessToken } = await api.refreshToken(refreshToken, deviceId);

      api.setAccessToken(accessToken);
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);

      return true;
    } catch (err) {
      console.error("Token refresh failed:", err);
      return false;
    }
  }, [getDeviceId]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signInWithGoogle,
        signInAsGuest,
        signOut,
        refreshAuth,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};

export default AuthContext;
