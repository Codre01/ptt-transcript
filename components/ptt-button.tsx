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
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

export interface PTTButtonProps {
  onPressIn: () => void;
  onPressOut: () => void;
  disabled: boolean;
  state: 'idle' | 'listening' | 'processing';
}

export function PTTButton({ onPressIn, onPressOut, disabled, state }: PTTButtonProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (state === 'listening') {
      Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.15,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(rippleAnim, {
              toValue: 1,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(rippleAnim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
    } else if (state === 'processing') {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      ).start();
    } else {
      pulseAnim.stopAnimation();
      rippleAnim.stopAnimation();
      rotateAnim.stopAnimation();
      pulseAnim.setValue(1);
      rippleAnim.setValue(0);
      rotateAnim.setValue(0);
    }
  }, [state]);

  const handlePressIn = () => {
    if (!disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Animated.spring(scaleAnim, {
        toValue: 0.92,
        useNativeDriver: true,
        tension: 100,
      }).start();
      onPressIn();
    }
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
    }).start();
    onPressOut();
  };

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

  const getLabel = () => {
    switch (state) {
      case 'listening':
        return 'Recording...';
      case 'processing':
        return 'Processing...';
      default:
        return 'Hold to Talk';
    }
  };

  const rippleScale = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.8],
  });

  const rippleOpacity = rippleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 0.3, 0],
  });

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {state === 'listening' && (
        <Animated.View
          style={[
            styles.ripple,
            {
              transform: [{ scale: rippleScale }],
              opacity: rippleOpacity,
            },
          ]}
        />
      )}
      <Animated.View
        style={[
          styles.buttonWrapper,
          {
            transform: [
              { scale: Animated.multiply(scaleAnim, pulseAnim) },
            ],
          },
        ]}
      >
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          style={[styles.button, getButtonStyle()]}
          accessibilityLabel="Press and hold to record"
          accessibilityRole="button"
          accessibilityHint="Hold down to record audio, release to process"
        >
          <View style={styles.iconContainer}>
            {state === 'processing' ? (
              <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                <Ionicons name="sync" size={36} color="#FFFFFF" />
              </Animated.View>
            ) : (
              <Ionicons
                name={state === 'listening' ? 'mic' : 'mic-outline'}
                size={36}
                color="#FFFFFF"
              />
            )}
          </View>
          {state === 'listening' && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
            </View>
          )}
        </Pressable>
      </Animated.View>
      <Text style={[styles.label, state === 'listening' && styles.labelActive]}>
        {getLabel()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  buttonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonIdle: {
    backgroundColor: '#007AFF',
  },
  buttonListening: {
    backgroundColor: '#FF3B30',
  },
  buttonProcessing: {
    backgroundColor: '#5856D6',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FF3B30',
  },
  recordingIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  label: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 0.3,
    fontFamily: 'Nunito-SemiBold',
  },
  labelActive: {
    color: '#FF3B30',
  },
});
