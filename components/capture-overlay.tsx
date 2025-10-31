/**
 * CaptureOverlay Component
 * 
 * Modal overlay displayed during active audio recording.
 * Features:
 * - Semi-transparent dark background
 * - Pulsing circle animation for recording indicator
 * - Duration timer in MM:SS format
 * - Cancel button with proper accessibility
 * - Slide-up animation on appear
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export interface CaptureOverlayProps {
  visible: boolean;
  duration: number;
  onStop: () => void;
  onCancel: () => void;
}

export function CaptureOverlay({ visible, duration, onStop, onCancel }: CaptureOverlayProps) {
  // Animation values
  const slideAnim = useRef(new Animated.Value(300)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Slide-up animation when overlay appears
  useEffect(() => {
    if (visible) {
      // Reset position
      slideAnim.setValue(300);
      
      // Animate slide up
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }).start();

      // Start pulse animation for recording indicator
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Stop animations
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [visible, slideAnim, pulseAnim]);

  // Format duration as MM:SS
  const formatDuration = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.content,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Pulsing circle recording indicator */}
          <Animated.View
            style={[
              styles.pulsingCircle,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <View style={styles.innerCircle}>
              <Ionicons name="mic" size={48} color="#FFFFFF" />
            </View>
          </Animated.View>

          {/* Duration timer */}
          <Text style={styles.durationText}>
            {formatDuration(duration)}
          </Text>

          {/* Recording label */}
          <Text style={styles.recordingLabel}>Recording...</Text>

          {/* Action buttons */}
          <View style={styles.buttonContainer}>
            {/* Stop button */}
            <Pressable
              onPress={onStop}
              style={({ pressed }) => [
                styles.stopButton,
                pressed && styles.stopButtonPressed,
              ]}
              accessibilityLabel="Stop recording"
              accessibilityRole="button"
              accessibilityHint="Tap to stop and process the recording"
            >
              <Ionicons name="stop-circle" size={24} color="#FFFFFF" />
              <Text style={styles.stopButtonText}>Stop</Text>
            </Pressable>

            {/* Cancel button */}
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.cancelButtonPressed,
              ]}
              accessibilityLabel="Cancel recording"
              accessibilityRole="button"
              accessibilityHint="Tap to cancel and discard the current recording"
            >
              <Ionicons name="close-circle" size={24} color="#FFFFFF" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)', // Semi-transparent dark background
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  pulsingCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 59, 48, 0.3)', // Red with transparency
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  innerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF3B30', // iOS red
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationText: {
    fontSize: 48,
    fontWeight: '300',
    color: '#FFFFFF',
    marginBottom: 8,
    fontVariant: ['tabular-nums'], // Monospaced numbers for stable width
    fontFamily: 'Nunito-Light',
  },
  recordingLabel: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 48,
    fontFamily: 'Nunito-Regular',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  stopButton: {
    minWidth: 100,
    minHeight: 44,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stopButtonPressed: {
    backgroundColor: '#2FB350',
  },
  stopButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Nunito-SemiBold',
  },
  cancelButton: {
    minWidth: 100,
    minHeight: 44,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Nunito-SemiBold',
  },
});
