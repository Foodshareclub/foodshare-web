/**
 * Testing Infrastructure Module
 *
 * Provides comprehensive testing utilities for the FoodShare application:
 * - Mock data factories
 * - Contract testing with Zod schemas
 * - Custom render functions with providers
 * - Enterprise module test utilities
 * - A mock Edge Function server, on Bun's own `Bun.serve`
 *
 * @module lib/testing
 */

// Mock Factories
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
// Mock Edge Function server
// =============================================================================

// The routes: the API surface, as plain objects that can be called directly.
export {
  defaultRoutes,
  errorRoutes,
  createRoute,
  createSequenceRoute,
  jsonResponse,
  noContentResponse,
} from "./mock-routes";
export type { MockMethod, MockRequestContext, MockRoute } from "./mock-routes";

// The server: the routes behind `Bun.serve`.
export { startMockServer, startEmptyMockServer } from "./mock-server";
export type { MockServer } from "./mock-server";

// The lifecycle.
export { setupMockServer, teardownMockServer, getMockServer } from "./setup";
