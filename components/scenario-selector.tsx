/**
 * ScenarioSelector Component
 * 
 * Allows developers to switch between different API scenarios at runtime
 * for testing purposes. Persists selection using AsyncStorage.
 * 
 * Scenarios:
 * - Success: Returns successful transcript
 * - Clarification: Requests clarification on first call
 * - Network Error: Simulates network connectivity issues
 * - Server Error: Simulates server processing failures
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ApiScenario } from '../services/voice-api/types';

const STORAGE_KEY = '@ptt_scenario_selection';

export interface ScenarioSelectorProps {
  currentScenario: ApiScenario;
  onScenarioChange: (scenario: ApiScenario) => void;
}

const SCENARIOS: Array<{ value: ApiScenario; label: string }> = [
  { value: 'success', label: 'Success' },
  { value: 'clarification', label: 'Clarification' },
  { value: 'networkError', label: 'Network Error' },
  { value: 'serverError', label: 'Server Error' },
];

export function ScenarioSelector({ currentScenario, onScenarioChange }: ScenarioSelectorProps) {
  // Load persisted scenario on mount
  useEffect(() => {
    loadPersistedScenario();
  }, []);

  // Load scenario from AsyncStorage
  const loadPersistedScenario = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored && isValidScenario(stored)) {
        onScenarioChange(stored as ApiScenario);
      }
    } catch (error) {
      console.error('Error loading persisted scenario:', error);
    }
  };

  // Validate scenario string
  const isValidScenario = (value: string): boolean => {
    return SCENARIOS.some((s) => s.value === value);
  };

  // Handle scenario selection
  const handleScenarioPress = async (scenario: ApiScenario) => {
    try {
      // Persist to AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEY, scenario);
      // Update state
      onScenarioChange(scenario);
    } catch (error) {
      console.error('Error persisting scenario:', error);
      // Still update state even if persistence fails
      onScenarioChange(scenario);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Test Scenario:</Text>
      <View style={styles.segmentedControl}>
        {SCENARIOS.map((scenario) => {
          const isSelected = currentScenario === scenario.value;
          return (
            <Pressable
              key={scenario.value}
              onPress={() => handleScenarioPress(scenario.value)}
              style={({ pressed }) => [
                styles.segment,
                isSelected && styles.segmentSelected,
                pressed && styles.segmentPressed,
              ]}
              accessibilityLabel={`${scenario.label} scenario`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.segmentText,
                  isSelected && styles.segmentTextSelected,
                ]}
              >
                {scenario.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F2F2F7', // iOS light gray background
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3C3C43',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    minHeight: 44, // Minimum touch target size
  },
  segmentSelected: {
    backgroundColor: '#007AFF', // iOS blue
  },
  segmentPressed: {
    opacity: 0.7,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3C3C43',
    textAlign: 'center',
  },
  segmentTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
