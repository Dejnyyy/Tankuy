import React, { useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';

export default function LoginScreen() {
  const { signInWithGoogle, signInAsGuest, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

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
      <StatusBar barStyle="light-content" />
      
      {/* Background gradient */}
      <View style={styles.backgroundContainer}>
        <View style={styles.gradientOverlay} />
      </View>

      <View style={styles.content}>
        {/* Logo and branding */}
        <View style={styles.brandingContainer}>
          <View style={styles.logoContainer}>
            <FontAwesome name="tint" size={64} color="#FF9500" />
          </View>
          <Text style={styles.appName}>Tankuy</Text>
          <Text style={styles.tagline}>Track your fuel expenses{'\n'}with ease</Text>
        </View>

        {/* Features highlight */}
        <View style={styles.featuresContainer}>
          <FeatureItem icon="camera" text="Scan receipts instantly" />
          <FeatureItem icon="line-chart" text="Track spending over time" />
          <FeatureItem icon="map-marker" text="Find nearby gas stations" />
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
              <ActivityIndicator color="#1F1F1F" size="small" />
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
            style={[styles.googleButton, { backgroundColor: '#333333', marginTop: 12 }]}
            onPress={handleGuestSignIn}
            disabled={isLoading}
          >
            <FontAwesome name="user-secret" size={20} color="#FFFFFF" />
            <Text style={[styles.googleButtonText, { color: '#FFFFFF' }]}>Continue as Guest</Text>
          </TouchableOpacity>

          <Text style={styles.termsText}>
            By signing in, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIconContainer}>
        <FontAwesome name={icon as any} size={18} color="#FF9500" />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientOverlay: {
    flex: 1,
    backgroundColor: '#0D0D0D',
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
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  appName: {
    fontSize: 42,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 18,
    color: '#8E8E93',
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
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 16,
    color: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
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
    color: '#1F1F1F',
  },
  termsText: {
    fontSize: 12,
    color: '#6E6E73',
    textAlign: 'center',
    lineHeight: 18,
  },
});
