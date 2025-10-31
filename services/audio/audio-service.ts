import { logger } from '@/utils/logger';
import { Audio } from 'expo-av';
import { Directory, File, Paths } from 'expo-file-system';
import type { AudioRecording, PermissionState } from './types';

class AudioServiceImpl {
    private recording: Audio.Recording | null = null;
    private recordingDuration: number = 0;
    private durationInterval: ReturnType<typeof setInterval> | null = null;
    private recordingsDir: Directory;

    constructor() {
        this.recordingsDir = new Directory(Paths.cache, 'recordings');
        // Ensure recordings directory exists on initialization
        this.ensureRecordingsDirectory();
    }

    /**
     * Ensure the recordings directory exists
     */
    private async ensureRecordingsDirectory(): Promise<void> {
        try {
            if (!this.recordingsDir.exists) {
                this.recordingsDir.create();
                logger.debug('Created recordings directory', { path: this.recordingsDir.uri });
            }
        } catch (error) {
            logger.error('Error creating recordings directory', error);
        }
    }

    /**
     * Check if microphone permission is currently granted
     * @returns Promise<boolean> - true if permission is granted, false otherwise
     */
    async checkPermission(): Promise<boolean> {
        try {
            const { status } = await Audio.getPermissionsAsync();
            logger.debug('Checked microphone permission', { status });
            return status === 'granted';
        } catch (error) {
            logger.error('Error checking permission', error);
            return false;
        }
    }

    /**
     * Request microphone permission from the user
     * @returns Promise<boolean> - true if permission is granted, false otherwise
     */
    async requestPermission(): Promise<boolean> {
        try {
            logger.debug('Requesting microphone permission');
            const { status } = await Audio.requestPermissionsAsync();
            logger.info('Microphone permission request result', { status });
            return status === 'granted';
        } catch (error) {
            logger.error('Error requesting permission', error);
            return false;
        }
    }

    /**
     * Get detailed permission state including whether we can ask again
     * @returns Promise<PermissionState>
     */
    async getPermissionState(): Promise<PermissionState> {
        try {
            const { status, canAskAgain } = await Audio.getPermissionsAsync();

            let permissionStatus: 'undetermined' | 'granted' | 'denied';
            if (status === 'granted') {
                permissionStatus = 'granted';
            } else if (status === 'undetermined') {
                permissionStatus = 'undetermined';
            } else {
                permissionStatus = 'denied';
            }

            return {
                status: permissionStatus,
                canAskAgain,
            };
        } catch (error) {
            console.error('Error getting permission state:', error);
            return {
                status: 'denied',
                canAskAgain: false,
            };
        }
    }

    /**
     * Start audio recording
     */
    async startRecording(): Promise<void> {
        const startTime = Date.now();
        
        try {
            // Don't start if already recording
            if (this.recording) {
                logger.warn('Recording already in progress');
                return;
            }

            logger.debug('Setting audio mode for recording');
            // Set audio mode for recording
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            logger.debug('Creating audio recording instance');
            // Create new recording instance
            const { recording } = await Audio.Recording.createAsync({
                isMeteringEnabled: true,
                android: {
                    extension: '.m4a',
                    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
                    audioEncoder: Audio.AndroidAudioEncoder.AAC,
                    sampleRate: 44100,
                    numberOfChannels: 2,
                    bitRate: 128000,
                },
                ios: {
                    extension: '.m4a',
                    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
                    audioQuality: Audio.IOSAudioQuality.HIGH,
                    sampleRate: 44100,
                    numberOfChannels: 2,
                    bitRate: 128000,
                },
                web: {
                    mimeType: 'audio/webm',
                    bitsPerSecond: 128000,
                },
            });

            this.recording = recording;
            this.recordingDuration = 0;

            const duration = Date.now() - startTime;
            logger.performance('Start recording', duration);
            logger.info('Audio recording started successfully');

            // Start duration tracking with 100ms polling interval
            this.durationInterval = setInterval(async () => {
                if (this.recording) {
                    const status = await this.recording.getStatusAsync();
                    if (status.isRecording) {
                        this.recordingDuration = status.durationMillis;
                    }
                }
            }, 100);
        } catch (error) {
            logger.error('Error starting recording', error);
            this.recording = null;
            this.recordingDuration = 0;
            if (this.durationInterval) {
                clearInterval(this.durationInterval);
                this.durationInterval = null;
            }
            throw error;
        }
    }

    /**
     * Stop audio recording and return recording metadata
     */
    async stopRecording(): Promise<AudioRecording> {
        const startTime = Date.now();
        
        try {
            if (!this.recording) {
                logger.error('Attempted to stop recording but no recording in progress');
                throw new Error('No recording in progress');
            }

            logger.debug('Stopping audio recording');

            // Stop duration tracking
            if (this.durationInterval) {
                clearInterval(this.durationInterval);
                this.durationInterval = null;
            }

            // Stop the recording
            await this.recording.stopAndUnloadAsync();

            // Get the recording URI
            const uri = this.recording.getURI();
            if (!uri) {
                logger.error('Failed to get recording URI');
                throw new Error('Failed to get recording URI');
            }

            // Get final duration
            const duration = this.recordingDuration;

            // Determine MIME type based on platform
            const mimeType = 'audio/m4a';

            // Reset audio mode
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
            });

            // Clear recording reference
            this.recording = null;
            this.recordingDuration = 0;

            const stopDuration = Date.now() - startTime;
            logger.performance('Stop recording', stopDuration);
            logger.info('Audio recording stopped successfully', {
                uri,
                duration,
                mimeType,
            });

            return {
                uri,
                duration,
                mimeType,
            };
        } catch (error) {
            logger.error('Error stopping recording', error);
            // Clean up on error
            this.recording = null;
            this.recordingDuration = 0;
            if (this.durationInterval) {
                clearInterval(this.durationInterval);
                this.durationInterval = null;
            }
            throw error;
        }
    }

    /**
     * Cancel current recording and delete the file
     */
    async cancelRecording(): Promise<void> {
        try {
            if (!this.recording) {
                logger.warn('No recording to cancel');
                return;
            }

            logger.debug('Cancelling audio recording');

            // Stop duration tracking
            if (this.durationInterval) {
                clearInterval(this.durationInterval);
                this.durationInterval = null;
            }

            // Get URI before stopping
            const uri = this.recording.getURI();

            // Stop and unload the recording
            await this.recording.stopAndUnloadAsync();

            // Reset audio mode
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
            });

            // Delete the file if URI exists
            if (uri) {
                try {
                    const file = new File(uri);
                    file.delete();
                    logger.debug('Deleted cancelled recording file', { uri });
                } catch (deleteError) {
                    logger.error('Error deleting cancelled recording file', deleteError, { uri });
                    // Don't throw - cancellation succeeded even if file deletion failed
                }
            }

            // Clear recording reference
            this.recording = null;
            this.recordingDuration = 0;
            
            logger.info('Audio recording cancelled successfully');
        } catch (error) {
            logger.error('Error cancelling recording', error);
            // Clean up on error
            this.recording = null;
            this.recordingDuration = 0;
            if (this.durationInterval) {
                clearInterval(this.durationInterval);
                this.durationInterval = null;
            }
            throw error;
        }
    }

    /**
     * Delete audio files older than 24 hours
     */
    async cleanupOldFiles(): Promise<void> {
        const startTime = Date.now();
        
        try {
            logger.debug('Starting cleanup of old audio files');
            
            // Ensure recordings directory exists
            if (!this.recordingsDir.exists) {
                this.recordingsDir.create();
                logger.debug('Created recordings directory during cleanup');
                return; // No files to clean up in a new directory
            }

            // Get all files in the recordings directory
            const items = this.recordingsDir.list();
            
            // Calculate cutoff time (24 hours ago)
            const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
            
            let deletedCount = 0;
            let errorCount = 0;

            // Check each item and delete files older than 24 hours
            for (const item of items) {
                try {
                    // Only process files, not directories
                    if (item instanceof File) {
                        const modTime = item.modificationTime;
                        
                        // Delete if modification time is older than 24 hours
                        if (modTime !== null && modTime < cutoffTime) {
                            item.delete();
                            deletedCount++;
                            logger.debug('Deleted old recording', { uri: item.uri, age: Date.now() - modTime });
                        }
                    }
                } catch (fileError) {
                    // Log error but continue with other files
                    errorCount++;
                    logger.error('Error processing file during cleanup', fileError, { uri: item.uri });
                }
            }
            
            const duration = Date.now() - startTime;
            logger.performance('Cleanup old files', duration);
            logger.info('Cleanup completed', { deletedCount, errorCount, totalItems: items.length });
        } catch (error) {
            logger.error('Error cleaning up old files', error);
            // Don't throw - cleanup is best-effort
        }
    }

    /**
     * Delete a specific audio file
     */
    async deleteFile(uri: string): Promise<void> {
        try {
            logger.debug('Deleting audio file', { uri });
            const file = new File(uri);
            
            // Check if file exists before attempting to delete
            if (file.exists) {
                file.delete();
                logger.info('File deleted successfully', { uri });
            } else {
                logger.warn('File not found for deletion', { uri });
            }
        } catch (error) {
            logger.error('Error deleting file', error, { uri });
            throw error;
        }
    }

    /**
     * Check if currently recording
     */
    isRecording(): boolean {
        return this.recording !== null;
    }

    /**
     * Get current recording duration in milliseconds
     */
    getRecordingDuration(): number {
        return this.recordingDuration;
    }
}

// Export singleton instance
export const AudioService = new AudioServiceImpl();
