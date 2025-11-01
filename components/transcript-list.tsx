/**
 * TranscriptList Component
 * 
 * Displays a scrollable list of transcript history with timestamps.
 * Shows most recent transcripts at the top with relative time formatting.
 */

import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AVPlaybackStatus } from 'expo-av';
import { AudioService } from '../services/audio';
import type { Transcript } from '../store/voice-store';

export interface TranscriptListProps {
  transcripts: Transcript[];
}

/**
 * Format timestamp as relative time (e.g., "2 minutes ago")
 */
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  }
}

/**
 * Format duration in milliseconds to MM:SS
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Individual transcript card component (memoized for performance)
 */
const TranscriptCard = React.memo(({ transcript }: { transcript: Transcript }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      AudioService.stopAudio();
    };
  }, []);

  const handlePlayPause = async () => {
    if (!transcript.audioUri) return;

    try {
      if (isPlaying) {
        await AudioService.pauseAudio();
        setIsPlaying(false);
      } else {
        if (position === 0 || position >= duration) {
          // Start from beginning
          await AudioService.playAudio(transcript.audioUri, (status: AVPlaybackStatus) => {
            if (status.isLoaded) {
              setPosition(status.positionMillis);
              setDuration(status.durationMillis || 0);
              setIsPlaying(status.isPlaying);
              
              // Auto-stop when finished
              if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(0);
              }
            }
          });
        } else {
          // Resume
          await AudioService.resumeAudio();
        }
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.transcriptText}>{transcript.text}</Text>
      </View>
      {transcript.audioUri && (
        <View style={styles.audioControls}>
          <TouchableOpacity
            onPress={handlePlayPause}
            style={styles.playButton}
            accessibilityLabel={isPlaying ? 'Pause audio' : 'Play audio'}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={20}
              color="#007AFF"
            />
          </TouchableOpacity>
          <Text style={styles.audioTimer}>
            {formatDuration(position)} / {formatDuration(duration)}
          </Text>
        </View>
      )}
      <Text style={styles.timestamp}>{formatRelativeTime(transcript.timestamp)}</Text>
    </View>
  );
});

TranscriptCard.displayName = 'TranscriptCard';

/**
 * TranscriptList Component
 */
export function TranscriptList({ transcripts }: TranscriptListProps) {
  // Show empty state if no transcripts
  if (transcripts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          No transcripts yet. Press and hold the button to start.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={true}
    >
      {transcripts.map((transcript) => (
        <TranscriptCard key={transcript.id} transcript={transcript} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Nunito-Regular',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 8,
  },
  transcriptText: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 22,
    fontFamily: 'Nunito-Regular',
  },
  audioControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  audioTimer: {
    fontSize: 14,
    color: '#8E8E93',
    fontFamily: 'Nunito-Regular',
  },
  timestamp: {
    fontSize: 13,
    color: '#8E8E93',
    fontFamily: 'Nunito-Regular',
  },
});
