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
import { Button } from '@/components/ui';
import { spacing, radii, typography } from '@/constants/Theme';
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
                  <Text style={[styles.googleButtonText, { color: colors.background }]}>
                    Continue with Google
                  </Text>
                </>
              )}
            </AnimatedPressable>

            <Button
              title="Continue as Guest"
              onPress={handleGuestSignIn}
              variant="secondary"
              disabled={isLoading}
              icon={<FontAwesome name="user-secret" size={20} color={colors.text} />}
            />

            <Text style={styles.termsText}>
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

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.xxxl,
      justifyContent: 'space-between',
      // Screen-specific vertical rhythm (not on the spacing scale) — keeps
      // branding/features/sign-in evenly spread across the safe area.
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
      // Large hero logo — deliberately off the size/radius scale.
      width: 120,
      height: 120,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.xxl,
    },
    appName: {
      ...typography.title,
      fontSize: 42,
      lineHeight: 50,
      letterSpacing: 1,
    },
    tagline: {
      ...typography.body,
      fontSize: 18,
      lineHeight: 26,
      textAlign: 'center',
      marginTop: spacing.md,
    },
    featuresContainer: {
      gap: spacing.lg,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
    },
    featureIconContainer: {
      // 46/14 sit between the sm/md and md/lg tokens; kept literal rather
      // than forcing a visible size/radius shift.
      width: 46,
      height: 46,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    featureText: {
      ...typography.body,
      fontWeight: '500',
    },
    signInContainer: {
      gap: 14,
    },
    errorContainer: {
      backgroundColor: `${colors.error}26`, // ~15% alpha, matches Badge convention
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: `${colors.error}4D`, // ~30% alpha
    },
    errorText: {
      ...typography.caption,
      fontSize: 14,
      color: colors.error,
      textAlign: 'center',
    },
    googleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xxl,
      borderRadius: radii.lg,
      gap: spacing.md,
    },
    googleIcon: {
      // Matches Google's favicon dimensions; not on the design-system scale.
      width: 20,
      height: 20,
    },
    googleButtonText: {
      ...typography.bodyBold,
      fontSize: 17, // off-scale to match original Google button proportions
    },
    termsText: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });
