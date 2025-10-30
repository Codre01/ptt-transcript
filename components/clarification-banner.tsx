/**
 * ClarificationBanner Component
 * 
 * Banner displayed when the Voice API requests clarification from the user.
 * Features:
 * - Yellow/amber background for visibility
 * - Clarification prompt text with icon
 * - Positioned above PTT button
 * - Visibility toggle based on state
 * - Auto-dismisses when new result arrives
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export interface ClarificationBannerProps {
  prompt: string;
  visible: boolean;
}

export function ClarificationBanner({ prompt, visible }: ClarificationBannerProps) {
  // Animation value for slide-in effect
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Animate banner appearance/disappearance
  useEffect(() => {
    if (visible) {
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
      ]).start();
    }
  }, [visible, slideAnim, opacityAnim]);

  // Track if component should be rendered
  const [shouldRender, setShouldRender] = React.useState(visible);

  // Update render state when visibility changes
  useEffect(() => {
    if (visible) {
      setShouldRender(true);
    } else {
      // Delay unmounting until animation completes
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // Don't render if not visible (after animation completes)
  if (!shouldRender) {
    return null;
  }

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
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons
            name="help-circle"
            size={24}
            color="#B45309" // Amber-700 for contrast
          />
        </View>

        {/* Prompt text */}
        <View style={styles.textContainer}>
          <Text style={styles.promptText}>{prompt}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCD34D', // Amber-300 - yellow/amber background
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FBB040', // Slightly darker amber for border
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  promptText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#78350F', // Amber-900 for high contrast text
    lineHeight: 22,
  },
});
