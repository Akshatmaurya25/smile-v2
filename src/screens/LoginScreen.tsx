import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { colors, spacing, borderRadius, typography } from '../styles';
import { useAuthStore } from '../store';
import { authApi } from '../api';
import { Logo } from '../components';

// Web Client ID from Google Cloud Console
const WEB_CLIENT_ID =
  '885524758632-lb169e569kh5mt7o9i26r67rolomp5a9.apps.googleusercontent.com';

// Feature icons as simple components
const TrackIcon = () => (
  <View style={[styles.featureIconBg, { backgroundColor: 'rgba(0, 255, 136, 0.15)' }]}>
    <Text style={[styles.featureIconText, { color: colors.primary }]}>|||</Text>
  </View>
);

const SplitIcon = () => (
  <View style={[styles.featureIconBg, { backgroundColor: 'rgba(255, 0, 255, 0.15)' }]}>
    <Text style={[styles.featureIconText, { color: colors.accent }]}>Y</Text>
  </View>
);

const VisualizeIcon = () => (
  <View style={[styles.featureIconBg, { backgroundColor: 'rgba(0, 212, 255, 0.15)' }]}>
    <Text style={[styles.featureIconText, { color: colors.secondary }]}>~</Text>
  </View>
);

const LoginScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuthStore();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      offlineAccess: true,
    });
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      if (!userInfo.data?.idToken) {
        throw new Error('No ID token received from Google');
      }

      const response = await authApi.googleAuth(userInfo.data.idToken);
      login(response.user, response.tokens);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        setError('Sign in cancelled');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        setError('Sign in already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Play services not available');
      } else {
        setError(error.message || 'Failed to sign in');
      }
    } finally {
      setLoading(false);
    }
  };

  // Demo login for testing
  const handleDemoLogin = () => {
    const demoUser = {
      id: 'demo-user-123',
      email: 'demo@smile.app',
      username: 'demo_user',
      displayName: 'Demo User',
      profileImage: null,
      googleId: 'demo-google-id',
      currency: 'INR' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const demoTokens = {
      accessToken: 'demo-access-token',
      refreshToken: 'demo-refresh-token',
    };
    login(demoUser, demoTokens);
  };

  return (
    <View style={styles.container}>
      {/* Gradient overlay */}
      <View style={styles.gradientTop} />

      {/* Logo and branding */}
      <View style={styles.brandingContainer}>
        <View style={styles.logoWrapper}>
          <Logo size={90} variant="withBackground" />
        </View>
        <Text style={styles.appName}>Smile</Text>
        <Text style={styles.tagline}>Finance that glows with you</Text>
      </View>

      {/* Feature cards */}
      <View style={styles.featuresContainer}>
        <View style={styles.featureCard}>
          <TrackIcon />
          <Text style={styles.featureLabel}>TRACK</Text>
        </View>
        <View style={styles.featureCard}>
          <SplitIcon />
          <Text style={styles.featureLabel}>SPLIT</Text>
        </View>
        <View style={styles.featureCard}>
          <VisualizeIcon />
          <Text style={styles.featureLabel}>VISUALIZE</Text>
        </View>
      </View>

      {/* Auth buttons */}
      <View style={styles.authContainer}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Google Sign-In Button */}
        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleSignIn}
          disabled={loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} size="small" />
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

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Demo buttons */}
        <View style={styles.demoButtonsRow}>
          <TouchableOpacity
            style={[styles.secondaryButton, styles.activeButton]}
            onPress={handleDemoLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>LOGIN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.8}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
              REGISTER
            </Text>
          </TouchableOpacity>
        </View>

        {/* Terms */}
        <Text style={styles.disclaimer}>
          BY CONTINUING, YOU AGREE TO OUR{'\n'}
          <Text style={styles.link}>TERMS OF SERVICE</Text> &{' '}
          <Text style={styles.link}>PRIVACY POLICY</Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(30, 20, 40, 0.5)',
  },
  brandingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl,
  },
  logoWrapper: {
    width: 110,
    height: 110,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  appName: {
    fontSize: 40,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: spacing.lg,
  },
  tagline: {
    fontSize: typography.sizes.lg,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  featureCard: {
    width: 100,
    height: 100,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  featureIconText: {
    fontSize: 20,
    fontWeight: typography.weights.bold,
  },
  featureLabel: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  authContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
  googleButton: {
    backgroundColor: colors.text,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: spacing.sm,
  },
  googleButtonText: {
    color: colors.background,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    marginHorizontal: spacing.md,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeButton: {
    backgroundColor: colors.surface,
    borderColor: colors.textSecondary,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    letterSpacing: 1,
  },
  disclaimer: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing.xl,
    letterSpacing: 0.5,
  },
  link: {
    color: colors.secondary,
  },
});

export default LoginScreen;
