/**
 * Type definitions for Web APIs not included in TypeScript's standard lib
 * These extend the global Window and Performance interfaces
 */

// ============================================================================
// Web Speech API Types
// ============================================================================

export interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

export interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

export interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

export interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  grammars: SpeechGrammarList;

  start(): void;
  stop(): void;
  abort(): void;

  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((event: Event) => void) | null;
  onstart: ((event: Event) => void) | null;
  onspeechstart: ((event: Event) => void) | null;
  onspeechend: ((event: Event) => void) | null;
  onaudiostart: ((event: Event) => void) | null;
  onaudioend: ((event: Event) => void) | null;
  onsoundstart: ((event: Event) => void) | null;
  onsoundend: ((event: Event) => void) | null;
  onnomatch: ((event: Event) => void) | null;
}

export interface SpeechGrammarList {
  readonly length: number;
  item(index: number): SpeechGrammar;
  addFromString(string: string, weight?: number): void;
  addFromURI(src: string, weight?: number): void;
}

export interface SpeechGrammar {
  src: string;
  weight: number;
}

export interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

// ============================================================================
// Performance Memory API Types
// ============================================================================

export interface PerformanceMemory {
  readonly jsHeapSizeLimit: number;
  readonly totalJSHeapSize: number;
  readonly usedJSHeapSize: number;
}

export interface ExtendedPerformance extends Performance {
  memory?: PerformanceMemory;
}

// ============================================================================
// Extended Window Interface
// ============================================================================

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the SpeechRecognition constructor, handling vendor prefixes
 */
export function getSpeechRecognition(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

/**
 * Check if Speech Recognition is supported
 */
export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognition() !== undefined;
}

/**
 * Get performance memory info if available (Chrome only)
 */
export function getPerformanceMemory(): PerformanceMemory | undefined {
  if (typeof window === "undefined") return undefined;
  return (window.performance as ExtendedPerformance).memory;
}
