/**
 * Main PTT Voice Capture Screen
 * 
 * Integrates all components for the press-to-talk voice capture system:
 * - ScenarioSelector: Test scenario switching (top)
 * - TranscriptList: Scrollable transcript history (middle)
 * - ClarificationBanner: Clarification prompts (above PTT button)
 * - PTTButton: Press-to-talk recording button (bottom center)
 * - ErrorBanner: Error messages (overlay at top)
 * - CaptureOverlay: Recording modal (full screen overlay)
 * - PermissionDeniedModal: Permission request UI
 */

import { CaptureOverlay } from '@/components/capture-overlay';
import { ClarificationBanner } from '@/components/clarification-banner';
import { ErrorBanner } from '@/components/error-banner';
import { PTTButton } from '@/components/ptt-button';
import { ScenarioSelector } from '@/components/scenario-selector';
import { TranscriptList } from '@/components/transcript-list';
import { AudioService } from '@/services/audio';
import { useVoiceStore } from '@/store/voice-store';
import { logger } from '@/utils/logger';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import React, { useEffect } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  Linking as RNLinking,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function HomeScreen() {
  const {
    state,
    transcripts,
    currentScenario,
    startRecording,
    stopRecording,
    cancelRecording,
    dismissError,
    dismissPermissionDenied,
    retryPermission,
    setScenario,
  } = useVoiceStore();

  // Initialize audio service and cleanup on mount
  useEffect(() => {
    logger.info('Home screen mounted');
    
    // Cleanup old audio files on app start
    AudioService.cleanupOldFiles().catch((error) => {
      logger.error('Error cleaning up old files on screen mount', error);
    });
    
    return () => {
      logger.debug('Home screen unmounting');
    };
  }, []);

  // Determine PTT button state
  const getPTTButtonState = (): 'idle' | 'listening' | 'processing' => {
    if (state.status === 'listening') return 'listening';
    if (state.status === 'processing') return 'processing';
    return 'idle';
  };

  // Determine if PTT button should be disabled
  const isPTTButtonDisabled = (): boolean => {
    return (
      state.status === 'checkingPermission' ||
      state.status === 'processing' ||
      state.status === 'permissionDenied'
    );
  };

  // Handle opening device settings
  const handleOpenSettings = () => {
    logger.userAction('Open device settings for permissions');
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      RNLinking.openSettings();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Scenario Selector at top */}
      <ScenarioSelector
        currentScenario={currentScenario}
        onScenarioChange={setScenario}
      />

      {/* Main content area with transcript list */}
      <View style={styles.contentArea}>
        <TranscriptList transcripts={transcripts} />
      </View>

      {/* Bottom section with clarification banner and PTT button */}
      <View style={styles.bottomSection}>
        {/* Clarification Banner (shown when in clarification state) */}
        {state.status === 'clarification' && (
          <ClarificationBanner
            prompt={state.prompt}
            visible={true}
          />
        )}

        {/* PTT Button */}
        <View style={styles.pttButtonContainer}>
          <PTTButton
            onPressIn={startRecording}
            onPressOut={stopRecording}
            disabled={isPTTButtonDisabled()}
            state={getPTTButtonState()}
          />
        </View>
      </View>

      {/* Error Banner Overlay */}
      {state.status === 'error' && (
        <ErrorBanner
          message={state.message}
          type={state.errorType}
          visible={true}
          onDismiss={dismissError}
        />
      )}

      {/* Capture Overlay Modal */}
      <CaptureOverlay
        visible={state.status === 'listening'}
        duration={state.status === 'listening' ? state.duration : 0}
        onCancel={cancelRecording}
      />

      {/* Permission Denied Modal */}
      <Modal
        visible={state.status === 'permissionDenied'}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.permissionModal}>
            {/* Icon */}
            <View style={styles.permissionIconContainer}>
              <Ionicons name="mic-off" size={48} color="#DC2626" />
            </View>

            {/* Title */}
            <Text style={styles.permissionTitle}>Microphone Access Required</Text>

            {/* Message */}
            <Text style={styles.permissionMessage}>
              {state.status === 'permissionDenied' ? state.message : ''}
            </Text>

            {/* Buttons */}
            <View style={styles.permissionButtons}>
              {/* Open Settings Button */}
              <Pressable
                onPress={handleOpenSettings}
                style={({ pressed }) => [
                  styles.permissionButton,
                  styles.permissionButtonPrimary,
                  pressed && styles.permissionButtonPressed,
                ]}
                accessibilityLabel="Open Settings"
                accessibilityRole="button"
              >
                <Text style={styles.permissionButtonTextPrimary}>
                  Open Settings
                </Text>
              </Pressable>

              {/* Retry Button */}
              <Pressable
                onPress={retryPermission}
                style={({ pressed }) => [
                  styles.permissionButton,
                  styles.permissionButtonSecondary,
                  pressed && styles.permissionButtonPressed,
                ]}
                accessibilityLabel="Try Again"
                accessibilityRole="button"
              >
                <Text style={styles.permissionButtonTextSecondary}>
                  Try Again
                </Text>
              </Pressable>

              {/* Cancel Button */}
              <Pressable
                onPress={dismissPermissionDenied}
                style={({ pressed }) => [
                  styles.permissionButton,
                  styles.permissionButtonTertiary,
                  pressed && styles.permissionButtonPressed,
                ]}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
              >
                <Text style={styles.permissionButtonTextTertiary}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7', // iOS light gray background
  },
  contentArea: {
    flex: 1,
  },
  bottomSection: {
    paddingBottom: 32,
    backgroundColor: '#F2F2F7',
  },
  pttButtonContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  // Permission Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  permissionIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2', // Red-100
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937', // Gray-800
    textAlign: 'center',
    marginBottom: 12,
  },
  permissionMessage: {
    fontSize: 15,
    color: '#6B7280', // Gray-500
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  permissionButtons: {
    width: '100%',
    gap: 12,
  },
  permissionButton: {
    width: '100%',
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionButtonPrimary: {
    backgroundColor: '#007AFF', // iOS blue
  },
  permissionButtonSecondary: {
    backgroundColor: '#E5E7EB', // Gray-200
  },
  permissionButtonTertiary: {
    backgroundColor: 'transparent',
  },
  permissionButtonPressed: {
    opacity: 0.7,
  },
  permissionButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  permissionButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937', // Gray-800
  },
  permissionButtonTextTertiary: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280', // Gray-500
  },
});
