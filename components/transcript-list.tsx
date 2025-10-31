/**
 * TranscriptList Component
 * 
 * Displays a scrollable list of transcript history with timestamps.
 * Shows most recent transcripts at the top with relative time formatting.
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
 * Individual transcript card component (memoized for performance)
 */
const TranscriptCard = React.memo(({ transcript }: { transcript: Transcript }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.transcriptText}>{transcript.text}</Text>
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
  transcriptText: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 22,
    marginBottom: 8,
    fontFamily: 'Nunito-Regular',
  },
  timestamp: {
    fontSize: 13,
    color: '#8E8E93',
    fontFamily: 'Nunito-Regular',
  },
});
