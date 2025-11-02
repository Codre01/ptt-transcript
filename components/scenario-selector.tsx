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
import React, { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ApiScenario } from '../services/voice-api/types';

const STORAGE_KEY = '@ptt_scenario_selection';

export interface ScenarioSelectorProps {
  currentScenario: ApiScenario;
  onScenarioChange: (scenario: ApiScenario) => void;
}

const SCENARIOS: { value: ApiScenario; label: string; icon: string; color: string }[] = [
  { value: 'success', label: 'Success', icon: '✓', color: '#34C759' },
  { value: 'clarification', label: 'Clarify', icon: '?', color: '#FF9500' },
  { value: 'networkError', label: 'Network', icon: '⚠', color: '#FF3B30' },
  { value: 'serverError', label: 'Server', icon: '✕', color: '#AF52DE' },
];

export function ScenarioSelector({ currentScenario, onScenarioChange }: ScenarioSelectorProps) {
  const [scaleAnims] = useState(() => SCENARIOS.map(() => new Animated.Value(1)));

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

  const handleScenarioPress = async (scenario: ApiScenario, index: number) => {
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 0.92,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[index], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      await AsyncStorage.setItem(STORAGE_KEY, scenario);
      onScenarioChange(scenario);
    } catch (error) {
      console.error('Error persisting scenario:', error);
      onScenarioChange(scenario);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>🧪 Test Scenario</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>DEV</Text>
        </View>
      </View>
      <View style={styles.grid}>
        {SCENARIOS.map((scenario, index) => {
          const isSelected = currentScenario === scenario.value;
          return (
            <Animated.View
              key={scenario.value}
              style={[styles.cardWrapper, { transform: [{ scale: scaleAnims[index] }] }]}
            >
              <Pressable
                onPress={() => handleScenarioPress(scenario.value, index)}
                style={[
                  styles.card,
                  isSelected && [styles.cardSelected, { borderColor: scenario.color }],
                ]}
                accessibilityLabel={`${scenario.label} scenario`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <View style={[styles.iconContainer, { backgroundColor: scenario.color + '15' }]}>
                  <Text style={[styles.icon, { color: scenario.color }]}>{scenario.icon}</Text>
                </View>
                <Text style={[styles.cardText, isSelected && { color: scenario.color }]}>
                  {scenario.label}
                </Text>
                {isSelected && (
                  <View style={[styles.checkmark, { backgroundColor: scenario.color }]}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 18,
    color: '#1C1C1E',
    letterSpacing: -0.3,
    fontFamily: 'Nunito-Bold',
  },
  badge: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    color: '#8E8E93',
    letterSpacing: 0.5,
    fontFamily: 'Nunito-Bold',
  },
  grid: {
    flexDirection: 'row',
    gap: 8,
  },
  cardWrapper: {
    flex: 1,
  },
  card: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 88,
    justifyContent: 'center',
  },
  cardSelected: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  icon: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3C3C43',
    textAlign: 'center',
    fontFamily: 'Nunito-SemiBold',
  },
  checkmark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: 'Nunito-Bold',
  },
});
