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
  | { status: 'recorded'; duration: number; audioUri: string }
  | { status: 'processing' }
  | { status: 'result'; transcript: string }
  | { status: 'clarification'; prompt: string; clarificationId: string }
  | { status: 'error'; message: string; errorType: 'network' | 'server'; audioUri?: string; duration?: number };

/**
 * Transcript entry in history
 */
export interface Transcript {
  id: string;
  text: string;
  timestamp: string;
  audioUri?: string;
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
  saveRecording: () => Promise<void>;
  cancelRecording: () => void;
  
  // Error handling actions
  dismissError: () => void;
  dismissPermissionDenied: () => void;
  retryPermission: () => Promise<void>;
  retrySendRecording: () => Promise<void>;
  
  // Scenario management
  setScenario: (scenario: ApiScenario) => void;
}

// Initialize Voice API instance
const voiceApi = new StubVoiceApi({ delay: 1000 });

// Store for clarification context
let clarificationContext: { clarificationId: string; previousPrompt: string } | null = null;

// Duration update interval
let durationInterval: ReturnType<typeof setInterval> | null = null;

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
   * Stops recording and shows Save/Cancel options
   */
  stopRecording: async () => {
    const startTime = Date.now();
    logger.userAction('Stop recording button released');
    
    // Check if actually recording
    const currentState = get().state;
    if (currentState.status !== 'listening') {
      logger.warn('Stop recording called but not in listening state', { status: currentState.status });
      return;
    }

    // Check if AudioService has an active recording
    if (!AudioService.isRecording()) {
      logger.warn('Stop recording called but AudioService has no active recording');
      // Clear duration interval if running
      if (durationInterval) {
        clearInterval(durationInterval);
        durationInterval = null;
      }
      set({ state: { status: 'idle' } });
      return;
    }
    
    let audioUri: string | null = null;
    
    try {
      // Clear duration interval
      if (durationInterval) {
        clearInterval(durationInterval);
        durationInterval = null;
      }

      // Stop recording and get audio file
      logger.info('Stopping audio recording');
      const recording = await AudioService.stopRecording();
      audioUri = recording.uri;
      logger.debug('Recording stopped', {
        uri: recording.uri,
        duration: recording.duration,
        mimeType: recording.mimeType,
      });

      // Set recorded state - show Save/Cancel options
      logger.stateTransition('listening', 'recorded');
      set({ state: { status: 'recorded', duration: recording.duration, audioUri: recording.uri } });
    } catch (error) {
      logger.error('Error stopping recording', error);

      // Clear duration interval if still running
      if (durationInterval) {
        clearInterval(durationInterval);
        durationInterval = null;
      }

      // Delete audio file on error
      if (audioUri) {
        try {
          await AudioService.deleteFile(audioUri);
        } catch (deleteError) {
          logger.error('Error deleting audio file after error', deleteError);
        }
      }

      logger.stateTransition('listening', 'error');
      set({
        state: {
          status: 'error',
          message: 'Failed to stop recording. Please try again.',
          errorType: 'server',
        },
      });
    }
  },

  /**
   * Save recording action
   * Processes the recorded audio through Voice API
   */
  saveRecording: async () => {
    const startTime = Date.now();
    logger.userAction('Save recording');
    
    const currentState = get().state;
    if (currentState.status !== 'recorded') {
      logger.warn('Save recording called but not in recorded state', { status: currentState.status });
      return;
    }

    const { audioUri, duration } = currentState;
    
    try {
      // Set processing state
      logger.stateTransition('recorded', 'processing');
      set({ state: { status: 'processing' } });

      // Prepare API input
      const input = {
        audioUri,
        mimeType: 'audio/m4a',
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

      // Handle result based on kind
      if (result.kind === 'ok') {
        // Success - add transcript and show result
        logger.info('Voice processing successful', { transcript: result.transcript });
        logger.stateTransition('processing', 'result');
        
        const transcript: Transcript = {
          id: generateUUID(),
          text: result.transcript,
          timestamp: new Date().toISOString(),
          audioUri, // Keep audio file for playback
        };

        set((state) => ({
          transcripts: [transcript, ...state.transcripts],
          state: { status: 'result', transcript: result.transcript },
        }));

        // Clear clarification context
        clarificationContext = null;

        const totalDuration = Date.now() - startTime;
        logger.performance('Complete save recording flow', totalDuration);

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

      // Keep audio file on network error, delete on server error
      if (errorType === 'server') {
        try {
          await AudioService.deleteFile(audioUri);
        } catch (deleteError) {
          logger.error('Error deleting audio file after error', deleteError);
        }
      }

      logger.stateTransition('processing', 'error', { errorType });
      set({
        state: {
          status: 'error',
          message: errorMessage,
          errorType,
          audioUri: errorType === 'network' ? audioUri : undefined,
          duration: errorType === 'network' ? duration : undefined,
        },
      });
    }
  },

  /**
   * Cancel recording action
   * Discards recording and returns to idle without processing
   */
  cancelRecording: () => {
    logger.userAction('Cancel recording');
    
    const currentState = get().state;
    
    // Handle cancel from listening state
    if (currentState.status === 'listening') {
      // Clear duration interval
      if (durationInterval) {
        clearInterval(durationInterval);
        durationInterval = null;
      }

      // Cancel recording (async but we don't wait)
      AudioService.cancelRecording().catch((error) => {
        logger.error('Error cancelling recording', error);
      });

      logger.stateTransition('listening', 'idle', { reason: 'user cancelled' });
      set({ state: { status: 'idle' } });
    }
    // Handle cancel from recorded state
    else if (currentState.status === 'recorded') {
      const { audioUri } = currentState;
      
      // Delete the recorded file
      AudioService.deleteFile(audioUri).catch((error) => {
        logger.error('Error deleting cancelled recording', error);
      });

      logger.stateTransition('recorded', 'idle', { reason: 'user cancelled' });
      set({ state: { status: 'idle' } });
    }
  },

  /**
   * Dismiss error and return to idle
   */
  dismissError: () => {
    logger.userAction('Dismiss error');
    const currentState = get().state;
    
    // Clean up audio file if present
    if (currentState.status === 'error' && currentState.audioUri) {
      AudioService.deleteFile(currentState.audioUri).catch((error) => {
        logger.error('Error deleting audio file on dismiss', error);
      });
    }
    
    logger.stateTransition('error', 'idle', { reason: 'user dismissed' });
    set({ state: { status: 'idle' } });
  },

  /**
   * Retry sending the recorded audio after network error
   */
  retrySendRecording: async () => {
    logger.userAction('Retry send recording');
    const currentState = get().state;
    
    if (currentState.status !== 'error' || !currentState.audioUri) {
      logger.warn('Retry send called but no audio to retry');
      return;
    }

    const { audioUri, duration } = currentState;
    
    try {
      // Set processing state
      logger.stateTransition('error', 'processing');
      set({ state: { status: 'processing' } });

      // Prepare API input
      const input = {
        audioUri,
        mimeType: 'audio/m4a',
        clientTs: new Date().toISOString(),
        context: clarificationContext ? {
          clarificationId: clarificationContext.clarificationId,
          previousPrompt: clarificationContext.previousPrompt,
        } : undefined,
      };

      logger.debug('Retrying voice processing through API');

      // Process through Voice API
      const result = await voiceApi.processVoice(input);

      // Handle result based on kind
      if (result.kind === 'ok') {
        logger.info('Voice processing successful on retry', { transcript: result.transcript });
        logger.stateTransition('processing', 'result');
        
        const transcript: Transcript = {
          id: generateUUID(),
          text: result.transcript,
          timestamp: new Date().toISOString(),
          audioUri,
        };

        set((state) => ({
          transcripts: [transcript, ...state.transcripts],
          state: { status: 'result', transcript: result.transcript },
        }));

        clarificationContext = null;

        // Auto-transition to idle after 2 seconds
        setTimeout(() => {
          const currentState = get().state;
          if (currentState.status === 'result') {
            logger.stateTransition('result', 'idle', { reason: 'auto-transition' });
            set({ state: { status: 'idle' } });
          }
        }, 2000);
      } else if (result.kind === 'clarification') {
        logger.info('Voice processing requires clarification on retry', {
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
      logger.error('Error retrying voice processing', error);

      let errorType: 'network' | 'server' = 'server';
      let errorMessage = 'Something went wrong. Please try again.';

      if (error?.kind === 'error') {
        errorType = error.code === 'NETWORK' ? 'network' : 'server';
        errorMessage = error.message;
      }

      // Keep audio file on network error, delete on server error
      if (errorType === 'server') {
        try {
          await AudioService.deleteFile(audioUri);
        } catch (deleteError) {
          logger.error('Error deleting audio file after retry error', deleteError);
        }
      }

      logger.stateTransition('processing', 'error', { errorType });
      set({
        state: {
          status: 'error',
          message: errorMessage,
          errorType,
          audioUri: errorType === 'network' ? audioUri : undefined,
          duration: errorType === 'network' ? duration : undefined,
        },
      });
    }
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
