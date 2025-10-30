/**
 * Voice Store - Zustand State Management
 * 
 * Manages the application state for the PTT voice capture system.
 * Handles recording lifecycle, API interactions, and transcript history.
 */

import { logger } from '@/utils/logger';
import { create } from 'zustand';
import { AudioService } from '../services/audio';
import { StubVoiceApi } from '../services/voice-api/stub-voice-api';
import type { ApiScenario } from '../services/voice-api/types';

/**
 * Discriminated union of all possible app states
 */
export type AppState =
  | { status: 'idle' }
  | { status: 'checkingPermission' }
  | { status: 'permissionDenied'; message: string }
  | { status: 'listening'; duration: number }
  | { status: 'processing' }
  | { status: 'result'; transcript: string }
  | { status: 'clarification'; prompt: string; clarificationId: string }
  | { status: 'error'; message: string; errorType: 'network' | 'server' };

/**
 * Transcript entry in history
 */
export interface Transcript {
  id: string;
  text: string;
  timestamp: string;
}

/**
 * Voice Store Interface
 */
export interface VoiceStore {
  // State
  state: AppState;
  transcripts: Transcript[];
  currentScenario: ApiScenario;
  
  // Recording actions
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => void;
  
  // Error handling actions
  dismissError: () => void;
  dismissPermissionDenied: () => void;
  retryPermission: () => Promise<void>;
  
  // Scenario management
  setScenario: (scenario: ApiScenario) => void;
}

// Initialize Voice API instance
const voiceApi = new StubVoiceApi({ delay: 1000 });

// Store for clarification context
let clarificationContext: { clarificationId: string; previousPrompt: string } | null = null;

// Duration update interval
let durationInterval: NodeJS.Timeout | null = null;

/**
 * Generate UUID for transcript IDs
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Create the Zustand store
 */
export const useVoiceStore = create<VoiceStore>((set, get) => ({
  // Initial state
  state: { status: 'idle' },
  transcripts: [],
  currentScenario: 'success',

  /**
   * Start recording action
   * Checks permissions and starts audio recording
   */
  startRecording: async () => {
    const startTime = Date.now();
    logger.userAction('Start recording button pressed');
    
    try {
      // Set checking permission state
      logger.stateTransition('idle', 'checkingPermission');
      set({ state: { status: 'checkingPermission' } });

      // Check if permission is already granted
      logger.debug('Checking microphone permission');
      const hasPermission = await AudioService.checkPermission();
      logger.debug('Permission check result', { hasPermission });
      
      if (!hasPermission) {
        // Request permission
        logger.info('Requesting microphone permission');
        const granted = await AudioService.requestPermission();
        logger.info('Permission request result', { granted });
        
        if (!granted) {
          // Permission denied
          logger.warn('Microphone permission denied by user');
          logger.stateTransition('checkingPermission', 'permissionDenied');
          set({
            state: {
              status: 'permissionDenied',
              message: 'Microphone access is required to record audio. Please grant permission in your device settings.',
            },
          });
          return;
        }
      }

      // Permission granted - start recording
      logger.info('Starting audio recording');
      await AudioService.startRecording();
      
      // Set listening state
      logger.stateTransition('checkingPermission', 'listening');
      set({ state: { status: 'listening', duration: 0 } });

      const duration = Date.now() - startTime;
      logger.performance('Start recording flow', duration);

      // Start duration tracking
      durationInterval = setInterval(() => {
        const duration = AudioService.getRecordingDuration();
        const currentState = get().state;
        if (currentState.status === 'listening') {
          set({ state: { status: 'listening', duration } });
        }
      }, 100);
    } catch (error) {
      logger.error('Error starting recording', error);
      logger.stateTransition('checkingPermission', 'error');
      set({
        state: {
          status: 'error',
          message: 'Failed to start recording. Please try again.',
          errorType: 'server',
        },
      });
    }
  },

  /**
   * Stop recording action
   * Stops recording and processes audio through Voice API
   */
  stopRecording: async () => {
    const startTime = Date.now();
    logger.userAction('Stop recording button released');
    
    try {
      // Clear duration interval
      if (durationInterval) {
        clearInterval(durationInterval);
        durationInterval = null;
      }

      // Stop recording and get audio file
      logger.info('Stopping audio recording');
      const recording = await AudioService.stopRecording();
      logger.debug('Recording stopped', {
        uri: recording.uri,
        duration: recording.duration,
        mimeType: recording.mimeType,
      });

      // Set processing state
      logger.stateTransition('listening', 'processing');
      set({ state: { status: 'processing' } });

      // Prepare API input
      const input = {
        audioUri: recording.uri,
        mimeType: recording.mimeType,
        clientTs: new Date().toISOString(),
        context: clarificationContext ? {
          clarificationId: clarificationContext.clarificationId,
          previousPrompt: clarificationContext.previousPrompt,
        } : undefined,
      };

      logger.debug('Processing voice through API', {
        hasClarificationContext: !!clarificationContext,
      });

      // Process through Voice API
      const apiStartTime = Date.now();
      const result = await voiceApi.processVoice(input);
      const apiDuration = Date.now() - apiStartTime;
      logger.performance('Voice API processing', apiDuration);

      // Delete the audio file after processing
      try {
        logger.debug('Deleting audio file', { uri: recording.uri });
        await AudioService.deleteFile(recording.uri);
        logger.debug('Audio file deleted successfully');
      } catch (deleteError) {
        logger.error('Error deleting audio file', deleteError, { uri: recording.uri });
        // Continue even if deletion fails
      }

      // Handle result based on kind
      if (result.kind === 'ok') {
        // Success - add transcript and show result
        logger.info('Voice processing successful', { transcript: result.transcript });
        logger.stateTransition('processing', 'result');
        
        const transcript: Transcript = {
          id: generateUUID(),
          text: result.transcript,
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          transcripts: [transcript, ...state.transcripts],
          state: { status: 'result', transcript: result.transcript },
        }));

        // Clear clarification context
        clarificationContext = null;

        const totalDuration = Date.now() - startTime;
        logger.performance('Complete stop recording flow', totalDuration);

        // Auto-transition to idle after 2 seconds
        setTimeout(() => {
          const currentState = get().state;
          if (currentState.status === 'result') {
            logger.stateTransition('result', 'idle', { reason: 'auto-transition' });
            set({ state: { status: 'idle' } });
          }
        }, 2000);
      } else if (result.kind === 'clarification') {
        // Clarification needed - store context and show prompt
        logger.info('Voice processing requires clarification', {
          prompt: result.prompt,
          clarificationId: result.clarificationId,
        });
        logger.stateTransition('processing', 'clarification');
        
        clarificationContext = {
          clarificationId: result.clarificationId,
          previousPrompt: result.prompt,
        };

        set({
          state: {
            status: 'clarification',
            prompt: result.prompt,
            clarificationId: result.clarificationId,
          },
        });

        // Auto-transition to idle immediately
        setTimeout(() => {
          const currentState = get().state;
          if (currentState.status === 'clarification') {
            logger.stateTransition('clarification', 'idle', { reason: 'auto-transition' });
            set({ state: { status: 'idle' } });
          }
        }, 0);
      }
    } catch (error: any) {
      // Handle API errors
      logger.error('Error processing voice', error);

      // Clear duration interval if still running
      if (durationInterval) {
        clearInterval(durationInterval);
        durationInterval = null;
      }

      // Determine error type and message
      let errorType: 'network' | 'server' = 'server';
      let errorMessage = 'Something went wrong. Please try again.';

      if (error?.kind === 'error') {
        errorType = error.code === 'NETWORK' ? 'network' : 'server';
        errorMessage = error.message;
        logger.warn('Voice API returned error', {
          errorType,
          errorCode: error.code,
          errorMessage,
        });
      }

      logger.stateTransition('processing', 'error', { errorType });
      set({
        state: {
          status: 'error',
          message: errorMessage,
          errorType,
        },
      });
    }
  },

  /**
   * Cancel recording action
   * Stops recording and returns to idle without processing
   */
  cancelRecording: () => {
    logger.userAction('Cancel recording');
    
    // Clear duration interval
    if (durationInterval) {
      clearInterval(durationInterval);
      durationInterval = null;
    }

    // Cancel recording (async but we don't wait)
    AudioService.cancelRecording().catch((error) => {
      logger.error('Error cancelling recording', error);
    });

    // Return to idle state immediately
    logger.stateTransition('listening', 'idle', { reason: 'user cancelled' });
    set({ state: { status: 'idle' } });
  },

  /**
   * Dismiss error and return to idle
   */
  dismissError: () => {
    logger.userAction('Dismiss error');
    logger.stateTransition('error', 'idle', { reason: 'user dismissed' });
    set({ state: { status: 'idle' } });
  },

  /**
   * Dismiss permission denied and return to idle
   */
  dismissPermissionDenied: () => {
    logger.userAction('Dismiss permission denied');
    logger.stateTransition('permissionDenied', 'idle', { reason: 'user dismissed' });
    set({ state: { status: 'idle' } });
  },

  /**
   * Retry permission request
   */
  retryPermission: async () => {
    logger.userAction('Retry permission request');
    const { startRecording } = get();
    await startRecording();
  },

  /**
   * Set API scenario for testing
   */
  setScenario: (scenario: ApiScenario) => {
    logger.info('Scenario changed', { scenario });
    voiceApi.setScenario(scenario);
    set({ currentScenario: scenario });
  },
}));
