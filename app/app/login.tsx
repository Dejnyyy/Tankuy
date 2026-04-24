import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import {
  FadeInView,
  ScaleInView,
  SlideInView,
  AnimatedPressable,
} from '@/components/AnimatedComponents';

export default function LoginScreen() {
  const { signInWithGoogle, signInAsGuest, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const gradientColors = isDark
    ? (['rgba(255,149,0,0.13)', 'rgba(255,149,0,0.04)', colors.background] as const)
    : (['rgba(255,149,0,0.07)', 'rgba(255,149,0,0.02)', colors.background] as const);

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
      setError(err.message || 'Guest login failed');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Tankuy – Fuel Expense Tracker | Scan Receipts & Find Gas Stations', headerShown: false }} />
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Gradient background */}
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
      />

      <View style={styles.content}>
        {/* ── Branding ─────────────────────────────────────── */}
        <View style={styles.brandingContainer}>
          <ScaleInView delay={0} initialScale={0.65} duration={600}>
            <View style={[styles.logoContainer, { backgroundColor: colors.primaryLight }]}>
              <FontAwesome name="tint" size={64} color={colors.tint} />
            </View>
          </ScaleInView>

          <FadeInView delay={160} translateY={12} duration={500}>
            <View style={styles.brandingText}>
              <Text role="heading" aria-level={1} style={[styles.appName, { color: colors.text }]}>Tankuy</Text>
              <Text style={[styles.tagline, { color: colors.textSecondary }]}>
                Track your fuel expenses{'\n'}with ease
              </Text>
            </View>
          </FadeInView>
        </View>

        {/* ── Feature highlights ───────────────────────────── */}
        <View style={styles.featuresContainer}>
          <FadeInView delay={320} translateY={14} duration={450}>
            <FeatureItem icon="camera" text="Scan receipts instantly" colors={colors} styles={styles} />
          </FadeInView>
          <FadeInView delay={420} translateY={14} duration={450}>
            <FeatureItem icon="line-chart" text="Track spending over time" colors={colors} styles={styles} />
          </FadeInView>
          <FadeInView delay={520} translateY={14} duration={450}>
            <FeatureItem icon="map-marker" text="Find nearby gas stations" colors={colors} styles={styles} />
          </FadeInView>
        </View>

        {/* ── Sign-in section ──────────────────────────────── */}
        <SlideInView direction="up" delay={220} distance={50}>
          <View style={styles.signInContainer}>
            {error && (
              <FadeInView delay={0} translateY={0}>
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              </FadeInView>
            )}

            <AnimatedPressable
              style={[styles.googleButton, { backgroundColor: colors.text }]}
              onPress={handleGoogleSignIn}
              disabled={isLoading}
              scaleValue={0.96}
            >
              {isLoading ? (
                <ActivityIndicator color={isDark ? '#1F1F1F' : '#FFFFFF'} size="small" />
              ) : (
                <>
                  <Image
                    source={{ uri: 'https://www.google.com/favicon.ico' }}
                    style={styles.googleIcon}
                  />
                  <Text style={[styles.buttonText, { color: colors.background }]}>
                    Continue with Google
                  </Text>
                </>
              )}
            </AnimatedPressable>

            <AnimatedPressable
              style={[styles.guestButton, { backgroundColor: colors.elevated }]}
              onPress={handleGuestSignIn}
              disabled={isLoading}
              scaleValue={0.96}
            >
              <FontAwesome name="user-secret" size={20} color={colors.text} />
              <Text style={[styles.buttonText, { color: colors.text }]}>
                Continue as Guest
              </Text>
            </AnimatedPressable>

            <Text style={[styles.termsText, { color: colors.textMuted }]}>
              By signing in, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </SlideInView>
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({
  icon,
  text,
  colors,
  styles,
}: {
  icon: string;
  text: string;
  colors: any;
  styles: any;
}) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIconContainer, { backgroundColor: colors.primaryLight }]}>
        <FontAwesome name={icon as any} size={18} color={colors.tint} />
      </View>
      <Text style={[styles.featureText, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

const getStyles = (_colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
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
    brandingText: {
      alignItems: 'center',
    },
    logoContainer: {
      width: 120,
      height: 120,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    appName: {
      fontSize: 42,
      fontWeight: '700',
      letterSpacing: 1,
    },
    tagline: {
      fontSize: 18,
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
      width: 46,
      height: 46,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    featureText: {
      fontSize: 16,
      fontWeight: '500',
    },
    signInContainer: {
      gap: 14,
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 16,
      gap: 12,
    },
    googleIcon: {
      width: 20,
      height: 20,
    },
    guestButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 16,
      gap: 12,
    },
    buttonText: {
      fontSize: 17,
      fontWeight: '600',
    },
    termsText: {
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 18,
    },
  });