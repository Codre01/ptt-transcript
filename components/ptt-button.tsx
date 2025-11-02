/**
 * PTTButton Component
 * 
 * Hold-to-record button with action options on release:
 * - Hold: Start recording
 * - Release: Show Save/Cancel options
 * - Save: Process recording
 * - Cancel: Discard recording
 */

import { Ionicons } from '@expo/vector-icons';
import { AVPlaybackStatus } from 'expo-av';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AudioService } from '../services/audio';

export interface PTTButtonProps {
  onPressIn: () => void;
  onPressOut: () => void;
  onSave: () => void;
  onCancel: () => void;
  disabled: boolean;
  state: 'idle' | 'listening' | 'processing' | 'recorded';
  duration?: number;
  audioLevel?: number;
  audioUri?: string;
}

export function PTTButton({ onPressIn, onPressOut: onPressOutProp, onSave, onCancel, disabled, state, duration = 0, audioLevel, audioUri }: PTTButtonProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const actionsSlideAnim = useRef(new Animated.Value(0)).current;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (state === 'listening') {
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
      ).start();
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

  useEffect(() => {
    if (state === 'listening' && audioLevel !== undefined) {
      // Assuming audioLevel is in dB, e.g., -160 to 0
      const normalized = Math.max(0, Math.min(1, (audioLevel + 100) / 100));
      const threshold = 0.2;
      const speaking = normalized > threshold;
      setIsSpeaking(speaking);

      Animated.timing(pulseAnim, {
        toValue: 1 + normalized * 0.2,
        duration: 100,
        useNativeDriver: true,
      }).start();
    } else {
      pulseAnim.setValue(1);
      setIsSpeaking(false);
    }
  }, [audioLevel, state]);

  useEffect(() => {
    if (state === 'recorded') {
      Animated.spring(actionsSlideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
    } else {
      actionsSlideAnim.setValue(0);
      // Stop playback when leaving recorded state
      if (isPlaying) {
        AudioService.stopAudio().catch(console.error);
        setIsPlaying(false);
      }
    }
  }, [state]);

  const handlePressIn = () => {
    if (!disabled && state === 'idle') {
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
    onPressOutProp();
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSave();
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isPlaying) {
      AudioService.stopAudio().catch(console.error);
      setIsPlaying(false);
    }
    onCancel();
  };

  const handlePlayPause = async () => {
    if (!audioUri) return;

    try {
      if (isPlaying) {
        await AudioService.pauseAudio();
        setIsPlaying(false);
      } else {
        await AudioService.playAudio(audioUri, (status: AVPlaybackStatus) => {
          if (status.isLoaded) {
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) {
              setIsPlaying(false);
            }
          }
        });
        setIsPlaying(true);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  };

  const getButtonStyle = () => {
    switch (state) {
      case 'listening':
      case 'recorded':
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
        return formatDuration(duration);
      case 'recorded':
        return formatDuration(duration);
      case 'processing':
        return 'Processing...';
      default:
        return 'Hold to Talk';
    }
  };

  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
      {state !== 'recorded' && (
        <>
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
              accessibilityLabel="Hold to record"
              accessibilityRole="button"
              accessibilityHint="Hold down to record audio, release to see options"
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
                  <View style={[styles.recordingDot, { backgroundColor: isSpeaking ? '#FF3B30' : '#8E8E93' }]} />
                </View>
              )}
            </Pressable>
          </Animated.View>
          <Text style={[styles.label, state === 'listening' && styles.labelActive]}>
            {getLabel()}
          </Text>
        </>
      )}

      {/* Action buttons on release */}
      {state === 'recorded' && (
        <Animated.View
          style={[
            styles.actionsWrapper,
            {
              opacity: actionsSlideAnim,
              transform: [
                {
                  translateY: actionsSlideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Action buttons */}
          <View style={styles.actionsContainer}>
            {/* Play button */}
            <TouchableOpacity
              onPress={handlePlayPause}
              activeOpacity={0.7}
              accessibilityLabel={isPlaying ? 'Pause preview' : 'Play preview'}
              accessibilityRole="button"
            >
              <View style={styles.playButton}>
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={28}
                  color="#007AFF"
                />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={styles.actionButton}
              activeOpacity={0.7}
              accessibilityLabel="Transcribe recording"
              accessibilityRole="button"
            >
              <View style={styles.saveButton}>
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Transcribe</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCancel}
              style={styles.actionButton}
              activeOpacity={0.7}
              accessibilityLabel="Cancel recording"
              accessibilityRole="button"
            >
              <View style={styles.cancelButton}>
                <Ionicons name="close-circle" size={24} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Cancel</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 0,
    paddingBottom: 20,
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
  actionsWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 32,
    // backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    // shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // elevation: 3,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    width: '100%',
  },
  actionButton: {
    flex: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 120,
    justifyContent: 'center',
    backgroundColor: '#34C759',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 120,
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Nunito-SemiBold',
  },
});