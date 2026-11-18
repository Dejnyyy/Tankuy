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
import { Stack } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui';
import { fonts, spacing, radii, typography } from '@/constants/Theme';
import { FadeInView, AnimatedPressable } from '@/components/AnimatedComponents';

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
      setError(err.message || 'Guest login failed');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Tankuy – Fuel Expense Tracker | Scan Receipts & Find Gas Stations', headerShown: false }} />
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.content}>
        <FadeInView>
          <View style={styles.brandingContainer}>
            <Text role="heading" aria-level={1} style={[styles.appName, { color: colors.text }]}>
              tankuy
            </Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>
              Fuel spending, consumption and prices from your receipts.
            </Text>
          </View>
        </FadeInView>

        <View style={styles.featuresContainer}>
          {['Scan a receipt, check, save', 'Spending, price per litre, consumption', 'Every fill-up in one list'].map((text, i) => (
            <View key={text} style={[styles.featureItem, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <Text style={[styles.featureText, { color: colors.text }]}>{text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.signInContainer}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <AnimatedPressable
            style={[styles.googleButton, { backgroundColor: colors.buttonPrimary }]}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            scaleValue={0.98}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.buttonPrimaryText} size="small" />
            ) : (
              <>
                <Image source={{ uri: 'https://www.google.com/favicon.ico' }} style={styles.googleIcon} />
                <Text style={[styles.googleButtonText, { color: colors.buttonPrimaryText }]}>Continue with Google</Text>
              </>
            )}
          </AnimatedPressable>

          <Button title="Continue as Guest" onPress={handleGuestSignIn} variant="secondary" size="lg" disabled={isLoading} />

          <Text style={styles.termsText}>By signing in, you agree to our Terms of Service and Privacy Policy</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flex: 1,
      width: '100%',
      maxWidth: 440,
      alignSelf: 'center',
      paddingHorizontal: spacing.xxl,
      justifyContent: 'space-between',
      paddingTop: spacing.giant,
      paddingBottom: spacing.xxxl,
    },
    brandingContainer: {
      gap: spacing.md,
    },
    appName: {
      fontFamily: fonts.heavy,
      fontSize: 64,
      lineHeight: 68,
      letterSpacing: -3,
    },
    tagline: {
      ...typography.body,
      fontSize: 18,
      lineHeight: 26,
      maxWidth: 320,
    },
    featuresContainer: {
      borderTopWidth: 2,
      borderTopColor: colors.text,
    },
    featureItem: {
      paddingVertical: spacing.md,
    },
    featureText: {
      ...typography.bodyBold,
    },
    signInContainer: {
      gap: spacing.md,
    },
    errorContainer: {
      paddingVertical: spacing.sm,
    },
    errorText: {
      ...typography.caption,
      color: colors.error,
    },
    googleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 56,
      paddingHorizontal: spacing.xxl,
      borderRadius: radii.md,
      gap: spacing.md,
    },
    googleIcon: {
      width: 18,
      height: 18,
    },
    googleButtonText: {
      fontFamily: fonts.semi,
      fontSize: 16,
    },
    termsText: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textMuted,
    },
  });
