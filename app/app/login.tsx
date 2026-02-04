import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

export default function LoginScreen() {
  const { signInWithGoogle, signInAsGuest, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (err: any) {
      if (err.code !== 'SIGN_IN_CANCELLED') {
        setError('Failed to sign in. Please try again.');
      }
    }
  };

  const handleGuestSignIn = async () => {
    try {
      setError(null);
      await signInAsGuest();
    } catch (err: any) {
      console.log('Guest login error:', err);
      setError(err.message || 'Guest login failed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Background gradient */}
      <View style={styles.backgroundContainer}>
        <View style={styles.gradientOverlay} />
      </View>

      <View style={styles.content}>
        {/* Logo and branding */}
        <View style={styles.brandingContainer}>
          <View style={styles.logoContainer}>
            <FontAwesome name="tint" size={64} color={colors.tint} />
          </View>
          <Text style={styles.appName}>Tankuy</Text>
          <Text style={styles.tagline}>Track your fuel expenses{'\n'}with ease</Text>
        </View>

        {/* Features highlight */}
        <View style={styles.featuresContainer}>
          <FeatureItem icon="camera" text="Scan receipts instantly" colors={colors} styles={styles} />
          <FeatureItem icon="line-chart" text="Track spending over time" colors={colors} styles={styles} />
          <FeatureItem icon="map-marker" text="Find nearby gas stations" colors={colors} styles={styles} />
        </View>

        {/* Sign in section */}
        <View style={styles.signInContainer}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={isDark ? "#1F1F1F" : "#FFFFFF"} size="small" />
            ) : (
              <>
                <Image
                  source={{ uri: 'https://www.google.com/favicon.ico' }}
                  style={styles.googleIcon}
                />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.guestButton, { marginTop: 12 }]}
            onPress={handleGuestSignIn}
            disabled={isLoading}
          >
            <FontAwesome name="user-secret" size={20} color={colors.text} />
            <Text style={[styles.googleButtonText, { color: colors.text }]}>Continue as Guest</Text>
          </TouchableOpacity>

          <Text style={styles.termsText}>
            By signing in, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, text, colors, styles }: { icon: string; text: string; colors: any; styles: any }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIconContainer}>
        <FontAwesome name={icon as any} size={18} color={colors.tint} />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientOverlay: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
  },
  brandingContainer: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  appName: {
    fontSize: 42,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 26,
  },
  featuresContainer: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  signInContainer: {
    gap: 16,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
  },
  errorText: {
    color: '#FF453A',
    fontSize: 14,
    textAlign: 'center',
  },
  googleButton: {
    backgroundColor: colors.text, // Reverse for contrast (White on Dark, Black on Light)
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 12,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.background, // Reverse contrast
  },
  guestButton: {
    backgroundColor: colors.elevated,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 12,
  },
  termsText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
