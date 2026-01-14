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
import { SvgXml } from 'react-native-svg';
import { colors, spacing, borderRadius, typography } from '../styles';
import { useAuthStore } from '../store';
import { authApi } from '../api';

// Web Client ID from Google Cloud Console
const WEB_CLIENT_ID =
  '885524758632-lb169e569kh5mt7o9i26r67rolomp5a9.apps.googleusercontent.com';

// Logo SVG (with dark background for login screen)
const logoSvg = `<svg width="100" height="100" viewBox="0 0 1000 1000" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="1000" height="1000" rx="200" fill="#1E1E1E"/>
<circle cx="314" cy="328" r="93" fill="#FFFCFC"/>
<path d="M203 590C321.736 794.349 630.361 853.15 774 590" stroke="#FFFCFC" stroke-width="90" stroke-linecap="round"/>
<g clip-path="url(#clip0_1_2)">
<circle cx="659.39" cy="373.007" r="89" transform="rotate(12.6607 659.39 373.007)" stroke="white" stroke-width="53"/>
</g>
<defs>
<clipPath id="clip0_1_2">
<rect width="231" height="105" fill="white" transform="translate(572.014 235) rotate(12.6607)"/>
</clipPath>
</defs>
</svg>`;

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
      console.log('[Login] Starting Google Sign-In...');

      await GoogleSignin.hasPlayServices();
      console.log('[Login] Play Services available');

      const userInfo = await GoogleSignin.signIn();
      console.log('[Login] Google Sign-In successful:', userInfo.data?.user?.email);

      if (!userInfo.data?.idToken) {
        console.error('[Login] No ID token received from Google');
        throw new Error('No ID token received from Google');
      }
      console.log('[Login] ID Token received, length:', userInfo.data.idToken.length);

      // Authenticate with backend
      console.log('[Login] Sending token to backend...');
      const response = await authApi.googleAuth(userInfo.data.idToken);
      console.log('[Login] Backend response:', response);

      login(response.user, response.tokens);
      console.log('[Login] Login successful!');
    } catch (err: unknown) {
      console.error('[Login] Error:', err);
      const error = err as { code?: string; message?: string };
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        setError('Sign in cancelled');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        setError('Sign in already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Play services not available');
      } else {
        const errorMsg = error.message || 'Failed to sign in';
        console.error('[Login] Setting error:', errorMsg);
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Temporary: Skip login for demo purposes (remove in production)
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
      {/* Background gradient effect */}
      <View style={styles.gradientOverlay} />

      {/* Logo and branding */}
      <View style={styles.brandingContainer}>
        <View style={styles.logoContainer}>
          <SvgXml xml={logoSvg} width={100} height={100} />
        </View>
        <Text style={styles.appName}>Smile</Text>
        <Text style={styles.tagline}>Smart expense sharing made simple</Text>
      </View>

      {/* Features preview */}
      <View style={styles.featuresContainer}>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>💰</Text>
          <Text style={styles.featureText}>Track expenses</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>👥</Text>
          <Text style={styles.featureText}>Split bills</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>📊</Text>
          <Text style={styles.featureText}>Visualize spending</Text>
        </View>
      </View>

      {/* Sign in button */}
      <View style={styles.authContainer}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleSignIn}
          disabled={loading}
          activeOpacity={0.8}
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

        {/* Demo button - remove in production */}
        <TouchableOpacity
          style={styles.demoButton}
          onPress={handleDemoLogin}
          activeOpacity={0.8}
        >
          <Text style={styles.demoButtonText}>Try Demo (Skip Login)</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: colors.surface,
    opacity: 0.5,
  },
  brandingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  appName: {
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: typography.sizes.lg,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.xl,
  },
  featureItem: {
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  featureText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  authContainer: {
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
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
  demoButton: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  demoButtonText: {
    color: colors.primary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
  },
  disclaimer: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default LoginScreen;
