/**
 * Voice API Types
 * 
 * Type definitions for the Voice API interface that processes audio recordings
 * and returns transcripts, clarifications, or errors.
 */

/**
 * Input for voice processing request
 */
export type ProcessVoiceInput = {
  audioUri: string;
  mimeType: string;
  clientTs: string;
  context?: {
    clarificationId?: string;
    previousPrompt?: string;
  };
};

/**
 * Successful voice processing result
 * Can be either a transcript or a clarification request
 */
export type ProcessVoiceResult =
  | { kind: 'ok'; transcript: string }
  | { kind: 'clarification'; prompt: string; clarificationId: string };

/**
 * Voice processing error
 */
export type ProcessVoiceError = {
  kind: 'error';
  code: 'NETWORK' | 'SERVER';
  message: string;
};

/**
 * API scenario for testing different response types
 */
export type ApiScenario = 'success' | 'clarification' | 'networkError' | 'serverError';

/**
 * Voice API interface
 */
export interface VoiceApi {
  processVoice(input: ProcessVoiceInput): Promise<ProcessVoiceResult>;
  setScenario(scenario: ApiScenario): void;
  getScenario(): ApiScenario;
}
