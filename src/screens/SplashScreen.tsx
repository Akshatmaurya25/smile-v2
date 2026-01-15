import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { colors, typography } from '../styles';
import { Logo } from '../components';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Logo animation
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Glow pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.6,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Navigate after splash
    const timer = setTimeout(() => {
      onFinish();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/* Glow effect behind logo */}
      <Animated.View
        style={[
          styles.glowCircle,
          { opacity: glowOpacity },
        ]}
      />

      {/* Logo container with border */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [{ scale: logoScale }],
            opacity: logoOpacity,
          },
        ]}
      >
        <View style={styles.logoBorder}>
          <Logo size={80} variant="withBackground" />
        </View>
      </Animated.View>

      {/* App name and tagline */}
      <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
        <Text style={styles.appName}>Smile</Text>
        <Text style={styles.tagline}>PERSONAL FINANCE</Text>
      </Animated.View>

      {/* Bottom loading indicator */}
      <View style={styles.loadingContainer}>
        <View style={styles.loadingBar}>
          <Animated.View
            style={[
              styles.loadingProgress,
              { opacity: glowOpacity },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 60,
    elevation: 20,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoBorder: {
    width: 120,
    height: 120,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  textContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  appName: {
    fontSize: 42,
    fontWeight: typography.weights.bold,
    color: colors.text,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 12,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    letterSpacing: 4,
    marginTop: 8,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
    width: width * 0.3,
  },
  loadingBar: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingProgress: {
    height: '100%',
    width: '60%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});

export default SplashScreen;
