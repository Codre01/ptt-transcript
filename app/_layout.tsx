import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import 'react-native-reanimated';
import './global.css';

import { ErrorBoundary } from '@/components/error-boundary';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AudioService } from '@/services/audio';
import { logger } from '@/utils/logger';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Initialize app on mount
    const initializeApp = async () => {
      const startTime = Date.now();
      logger.info('Initializing app...');
      
      try {
        // Set up audio mode for recording
        logger.debug('Setting up audio mode for recording');
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });

        // Clean up old audio files (older than 24 hours)
        logger.debug('Cleaning up old audio files');
        await AudioService.cleanupOldFiles();
        
        const duration = Date.now() - startTime;
        logger.performance('App initialization', duration);
        logger.info('App initialized successfully');
      } catch (error) {
        logger.error('Error initializing app', error);
      }
    };

    initializeApp();

    // Handle app state changes (background/foreground)
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      logger.debug('App state change', { 
        from: appState.current, 
        to: nextAppState 
      });
      
      // App is coming to foreground
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        logger.info('App has come to the foreground');
        
        try {
          // Re-setup audio mode when returning to foreground
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
          });
          logger.debug('Audio mode re-configured for foreground');
        } catch (error) {
          logger.error('Error setting audio mode on foreground', error);
        }
      }
      
      // App is going to background
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        logger.info('App has gone to the background');
        
        // Cancel any active recording when going to background
        if (AudioService.isRecording()) {
          try {
            await AudioService.cancelRecording();
            logger.info('Cancelled recording due to app backgrounding');
          } catch (error) {
            logger.error('Error cancelling recording on background', error);
          }
        }
      }

      appState.current = nextAppState;
    });

    // Cleanup on unmount
    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
