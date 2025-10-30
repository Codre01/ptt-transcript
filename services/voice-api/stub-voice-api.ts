/**
 * Stubbed Voice API Implementation
 * 
 * Simulates voice processing with configurable scenarios for testing.
 * Supports success, clarification, network error, and server error scenarios.
 */

import { logger } from '@/utils/logger';
import {
  ApiScenario,
  ProcessVoiceError,
  ProcessVoiceInput,
  ProcessVoiceResult,
  VoiceApi,
} from './types';

export class StubVoiceApi implements VoiceApi {
  private scenario: ApiScenario = 'success';
  private delay: number = 1000;
  private clarificationState: Map<string, number> = new Map();

  constructor(options?: { delay?: number; scenario?: ApiScenario }) {
    if (options?.delay !== undefined) {
      this.delay = Math.max(500, Math.min(2000, options.delay));
    }
    if (options?.scenario) {
      this.scenario = options.scenario;
    }
  }

  /**
   * Set the API scenario for testing different response types
   */
  setScenario(scenario: ApiScenario): void {
    logger.debug('Voice API scenario changed', { from: this.scenario, to: scenario });
    this.scenario = scenario;
    // Reset clarification state when scenario changes
    this.clarificationState.clear();
  }

  /**
   * Get the current API scenario
   */
  getScenario(): ApiScenario {
    return this.scenario;
  }

  /**
   * Process voice input and return result based on current scenario
   */
  async processVoice(input: ProcessVoiceInput): Promise<ProcessVoiceResult> {
    const startTime = Date.now();
    
    logger.debug('Voice API processing started', {
      scenario: this.scenario,
      audioUri: input.audioUri,
      hasClarificationContext: !!input.context?.clarificationId,
    });

    // Simulate network delay
    await this.simulateDelay();

    try {
      // Handle based on current scenario
      let result: ProcessVoiceResult;
      
      switch (this.scenario) {
        case 'success':
          result = this.handleSuccess(input);
          break;

        case 'clarification':
          result = this.handleClarification(input);
          break;

        case 'networkError':
          logger.warn('Voice API simulating network error');
          throw this.createNetworkError();

        case 'serverError':
          logger.warn('Voice API simulating server error');
          throw this.createServerError();

        default:
          result = this.handleSuccess(input);
      }
      
      const duration = Date.now() - startTime;
      logger.performance('Voice API processing', duration);
      logger.debug('Voice API processing completed', {
        resultKind: result.kind,
        duration,
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Voice API processing failed', error, { duration });
      throw error;
    }
  }

  /**
   * Handle success scenario - return a transcript
   */
  private handleSuccess(input: ProcessVoiceInput): ProcessVoiceResult {
    return {
      kind: 'ok',
      transcript: "Added 'milk' to your shopping list.",
    };
  }

  /**
   * Handle clarification scenario
   * First call: return clarification prompt
   * Second call (with clarificationId): return success
   */
  private handleClarification(input: ProcessVoiceInput): ProcessVoiceResult {
    // Check if this is a follow-up to a clarification
    if (input.context?.clarificationId) {
      const clarificationId = input.context.clarificationId;
      const callCount = this.clarificationState.get(clarificationId) || 0;
      
      // Second call with clarification context - return success
      if (callCount > 0) {
        logger.debug('Clarification follow-up detected, returning success', { clarificationId });
        this.clarificationState.delete(clarificationId);
        return {
          kind: 'ok',
          transcript: "Alarm set for 7:00 AM.",
        };
      }
    }

    // First call - return clarification prompt
    const clarificationId = this.generateClarificationId();
    this.clarificationState.set(clarificationId, 1);
    logger.debug('Returning clarification prompt', { clarificationId });
    
    return {
      kind: 'clarification',
      prompt: 'What time should I set it for?',
      clarificationId,
    };
  }

  /**
   * Create a network error
   */
  private createNetworkError(): ProcessVoiceError {
    return {
      kind: 'error',
      code: 'NETWORK',
      message: 'Network error. Please try again.',
    };
  }

  /**
   * Create a server error
   */
  private createServerError(): ProcessVoiceError {
    return {
      kind: 'error',
      code: 'SERVER',
      message: 'Something went wrong. Please try again.',
    };
  }

  /**
   * Simulate network delay
   */
  private async simulateDelay(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, this.delay);
    });
  }

  /**
   * Generate a unique clarification ID
   */
  private generateClarificationId(): string {
    return `clarification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
