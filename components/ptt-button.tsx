/**
 * PTTButton Component
 * 
 * Press-to-talk button with three visual states:
 * - Idle: Blue background, ready to record
 * - Listening: Red background with pulse animation, actively recording
 * - Processing: Gray background, disabled during API processing
 */

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

export interface PTTButtonProps {
  onPressIn: () => void;
  onPressOut: () => void;
  disabled: boolean;
  state: 'idle' | 'listening' | 'processing';
}

export function PTTButton({ onPressIn, onPressOut, disabled, state }: PTTButtonProps) {
  // Animation value for pulse effect
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Start pulse animation when in listening state
  useEffect(() => {
    if (state === 'listening') {
      // Create looping pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Stop animation and reset
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [state, pulseAnim]);

  // Handle press in with haptic feedback
  const handlePressIn = () => {
    if (!disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPressIn();
    }
  };

  // Determine button style based on state
  const getButtonStyle = () => {
    switch (state) {
      case 'listening':
        return styles.buttonListening;
      case 'processing':
        return styles.buttonProcessing;
      default:
        return styles.buttonIdle;
    }
  };

  // Determine icon color based on state
  const getIconColor = () => {
    return '#FFFFFF'; // White for all states
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.animatedContainer,
          state === 'listening' && {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={onPressOut}
          disabled={disabled}
          style={({ pressed }) => [
            styles.button,
            getButtonStyle(),
            pressed && !disabled && styles.buttonPressed,
          ]}
          accessibilityLabel="Press and hold to record"
          accessibilityRole="button"
          accessibilityHint="Hold down to record audio, release to process"
        >
          <Ionicons
            name="mic"
            size={32}
            color={getIconColor()}
          />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  animatedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonIdle: {
    backgroundColor: '#007AFF', // iOS blue
  },
  buttonListening: {
    backgroundColor: '#FF3B30', // iOS red
  },
  buttonProcessing: {
    backgroundColor: '#8E8E93', // iOS gray
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.8,
  },
});
