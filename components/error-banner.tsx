/**
 * ErrorBanner Component
 * 
 * Banner displayed when errors occur during voice processing.
 * Features:
 * - Red background for errors
 * - User-friendly error message
 * - Dismiss button (X icon)
 * - Positioned at top of screen
 * - Auto-dismisses after 5 seconds
 * - Supports both network and server error types
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export interface ErrorBannerProps {
  message: string;
  type: 'network' | 'server';
  visible: boolean;
  onDismiss: () => void;
}

export function ErrorBanner({ message, type, visible, onDismiss }: ErrorBannerProps) {
  // Animation values for slide-in effect
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Track if component should be rendered
  const [shouldRender, setShouldRender] = React.useState(visible);

  // Auto-dismiss timer ref
  const autoDismissTimer = useRef<NodeJS.Timeout | null>(null);

  // Animate banner appearance/disappearance and handle auto-dismiss
  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      
      // Slide in and fade in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Set up auto-dismiss after 5 seconds
      autoDismissTimer.current = setTimeout(() => {
        onDismiss();
      }, 5000);
    } else {
      // Slide out and fade out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // After animation completes, stop rendering
        setShouldRender(false);
      });

      // Clear auto-dismiss timer
      if (autoDismissTimer.current) {
        clearTimeout(autoDismissTimer.current);
        autoDismissTimer.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (autoDismissTimer.current) {
        clearTimeout(autoDismissTimer.current);
      }
    };
  }, [visible, slideAnim, opacityAnim, onDismiss]);

  // Don't render if not visible (after animation completes)
  if (!shouldRender) {
    return null;
  }

  // Determine icon based on error type
  const getErrorIcon = () => {
    return type === 'network' ? 'cloud-offline' : 'alert-circle';
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.banner}>
        {/* Error Icon */}
        <View style={styles.iconContainer}>
          <Ionicons
            name={getErrorIcon()}
            size={24}
            color="#FFFFFF"
          />
        </View>

        {/* Error message */}
        <View style={styles.textContainer}>
          <Text style={styles.errorText}>{message}</Text>
        </View>

        {/* Dismiss button */}
        <Pressable
          onPress={onDismiss}
          style={({ pressed }) => [
            styles.dismissButton,
            pressed && styles.dismissButtonPressed,
          ]}
          accessibilityLabel="Dismiss error"
          accessibilityRole="button"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="close"
            size={20}
            color="#FFFFFF"
          />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 50, // Account for status bar
    zIndex: 1000,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626', // Red-600 - red background for errors
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  errorText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 20,
    fontFamily: 'Nunito-Medium',
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dismissButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
});
