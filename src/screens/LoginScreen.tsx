import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { SvgXml } from 'react-native-svg';
import { colors, spacing, borderRadius, typography } from '../styles';
import { useAuthStore } from '../store';
import { authApi } from '../api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// White logo SVG without background
const logoSvg = `<svg width="1000" height="1000" viewBox="0 0 1000 1000" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="314" cy="328" r="93" fill="#FFFCFC"/>
<path d="M203 590C321.736 794.349 630.361 853.15 774 590" stroke="#FFFCFC" stroke-width="90" stroke-linecap="round"/>
<g clip-path="url(#clip0_8_11)">
<circle cx="659.39" cy="373.007" r="89" transform="rotate(12.6607 659.39 373.007)" stroke="white" stroke-width="53"/>
</g>
<defs>
<clipPath id="clip0_8_11">
<rect width="231" height="105" fill="white" transform="translate(572.014 235) rotate(12.6607)"/>
</clipPath>
</defs>
</svg>`;

// Web Client ID from Google Cloud Console
const WEB_CLIENT_ID =
  '885524758632-lb169e569kh5mt7o9i26r67rolomp5a9.apps.googleusercontent.com';

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

  return (
    <View style={styles.container}>
      {/* Top section with logo and branding */}
      <View style={styles.topSection}>
        <SvgXml xml={logoSvg} width={120} height={120} />

        <Text style={styles.appName}>Smile</Text>
        <Text style={styles.tagline}>Track expenses, split bills, stay happy</Text>
      </View>

      {/* Bottom section with auth */}
      <View style={styles.bottomSection}>
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
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} size="small" />
          ) : (
            <>
              <View style={styles.googleIconContainer}>
                <Text style={styles.googleIconText}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Terms */}
        <Text style={styles.disclaimer}>
          By continuing, you agree to our{'\n'}
          <Text style={styles.link}>Terms of Service</Text> and{' '}
          <Text style={styles.link}>Privacy Policy</Text>
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
  topSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SCREEN_HEIGHT * 0.05,
  },
  appName: {
    fontSize: 48,
    fontWeight: typography.weights.bold,
    color: colors.text,
    letterSpacing: -1,
    marginTop: spacing.xl,
  },
  tagline: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  bottomSection: {
    paddingHorizontal: spacing.xl,
    paddingBottom: SCREEN_HEIGHT * 0.08,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
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
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  googleIconText: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  googleButtonText: {
    color: colors.background,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  disclaimer: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.xl,
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
