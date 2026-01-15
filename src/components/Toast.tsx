import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../styles';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onHide: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type = 'success',
  duration = 2500,
  onHide,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  if (!visible) return null;

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return colors.primary;
      case 'error':
        return colors.error;
      case 'info':
        return colors.secondary;
      default:
        return colors.primary;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'info':
        return 'ℹ';
      default:
        return '✓';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: getBackgroundColor() } as ViewStyle,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={styles.icon}>{getIcon()}</Text>
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  icon: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: colors.background,
    marginRight: spacing.sm,
  },
  message: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.background,
    fontWeight: typography.weights.medium,
  },
});

export default Toast;
