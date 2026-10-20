/**
 * Testing Infrastructure Module
 *
 * Provides comprehensive testing utilities for the FoodShare application:
 * - Mock data factories (MSW-independent)
 * - Contract testing with Zod schemas
 * - Custom render functions with providers
 * - Enterprise module test utilities
 *
 * NOTE: MSW handlers are in a separate file (msw-handlers.ts) to avoid
 * import issues in jsdom environments. Import them directly when needed:
 * import { defaultHandlers } from '@/lib/testing/msw-handlers';
 *
 * @module lib/testing
 */

// Mock Factories (MSW-independent)
export {
  mockSuccess,
  mockError,
  mockFactories,
} from "./mock-factories";
export type {
  MockResponseOptions,
  MockSuccessResponse,
  MockErrorResponse,
  MockProduct,
  MockUser,
  MockRoom,
  MockMessage,
} from "./mock-factories";

// Test Utilities
export {
  customRender,
  render,
  waitForCondition,
  waitForNetworkIdle,
  createMockFn,
  mockLocalStorage,
  mockIndexedDB,
  mockOnlineStatus,
  expectCalledWith,
  expectAsyncThrow,
} from "./test-utils";
export type { CustomRenderOptions } from "./test-utils";

// Contract Testing
export {
  validateRequest,
  validateResponse,
  runContractTests,
  generateContractDocs,
  toMatchContract,
  // Schemas
  apiResponseSchema,
  apiErrorSchema,
  paginatedSchema,
  productSchema,
  userSchema,
  roomSchema,
  messageSchema,
  // Contract definitions
  productContracts,
  chatContracts,
  profileContracts,
} from "./contract-testing";
export type {
  ContractDefinition,
  ContractTestResult,
  ContractTestSuite,
} from "./contract-testing";

// Enterprise Test Utilities
export {
  // Circuit Breaker
  createTestCircuitBreaker,
  forceCircuitState,
  waitForCircuitState,
  createFailingThenSucceedingFn,
  // Retry
  testRetryConfig,
  createRetryTracker,
  calculateRetryDelays,
  // Offline Queue
  MockIndexedDBStore,
  createNetworkSimulator,
  // Cache
  createMockCacheLayer,
  // Realtime
  createMockRealtimeChannel,
  createMockPresence,
  // Timing
  advanceTimersAndFlush,
  runAllTimersAndFlush,
  createDeferred,
  // Metrics
  createMetricsCapture,
} from "./enterprise-test-utils";

// =============================================================================
// MSW Exports (lazy-loaded to avoid jsdom issues)
// =============================================================================

/**
 * Get MSW handlers and utilities
 * Import directly from msw-handlers.ts for full MSW support:
 *
 * ```ts
 * import { defaultHandlers, errorHandlers } from '@/lib/testing/msw-handlers';
 * import { setupServer } from 'msw/node';
 *
 * const server = setupServer(...defaultHandlers);
 * ```
 */
export const getMSWHandlers = async () => {
  const handlers = await import("./msw-handlers");
  return handlers;
};
