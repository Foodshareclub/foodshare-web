/**
 * Mock Data Factories
 *
 * Factory functions for creating test data.
 * These are MSW-independent and can be used in any test environment.
 *
 * @module lib/testing/mock-factories
 */

// =============================================================================
// Types
// =============================================================================

export interface MockProduct {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  quantity: number;
  unit: string;
  expiresAt: string;
  location: { lat: number; lng: number };
  images: string[];
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MockUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
}

export interface MockRoom {
  id: string;
  productId: string;
  requesterId: string;
  ownerId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface MockMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  type: string;
  createdAt: string;
}

export interface MockResponseOptions {
  /** Delay in ms before responding */
  delay?: number;
  /** HTTP status code */
  status?: number;
  /** Custom headers */
  headers?: Record<string, string>;
}

export interface MockSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
    responseTime: number;
  };
}

export interface MockErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// =============================================================================
// Response Helpers
// =============================================================================

/**
 * Create a successful API response matching Edge Function format
 */
export function mockSuccess<T>(
  data: T,
  options: MockResponseOptions = {}
): MockSuccessResponse<T> {
  return {
    success: true,
    data,
    meta: {
      requestId: `test-${Date.now()}`,
      timestamp: new Date().toISOString(),
      responseTime: options.delay || 50,
    },
  };
}

/**
 * Create an error API response matching Edge Function format
 */
export function mockError(
  code: string,
  message: string,
  details?: unknown
): MockErrorResponse {
  return {
    success: false,
    error: { code, message, details },
  };
}

// =============================================================================
// Mock Data Factories
// =============================================================================

export const mockFactories = {
  product: (overrides: Partial<MockProduct> = {}): MockProduct => ({
    id: `prod-${Date.now()}`,
    title: "Test Product",
    description: "A test product description",
    category: "produce",
    status: "active",
    quantity: 1,
    unit: "item",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    location: { lat: 37.7749, lng: -122.4194 },
    images: [],
    userId: "user-123",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  user: (overrides: Partial<MockUser> = {}): MockUser => ({
    id: `user-${Date.now()}`,
    email: "test@example.com",
    displayName: "Test User",
    avatarUrl: null,
    role: "user",
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  room: (overrides: Partial<MockRoom> = {}): MockRoom => ({
    id: `room-${Date.now()}`,
    productId: "prod-123",
    requesterId: "user-456",
    ownerId: "user-123",
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  message: (overrides: Partial<MockMessage> = {}): MockMessage => ({
    id: `msg-${Date.now()}`,
    roomId: "room-123",
    senderId: "user-123",
    content: "Test message",
    type: "text",
    createdAt: new Date().toISOString(),
    ...overrides,
  }),
};
