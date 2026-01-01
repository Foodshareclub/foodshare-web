/**
 * MSW Request Handlers
 *
 * Mock Service Worker handlers for API testing.
 * Matches Edge Function response format for consistency.
 *
 * @module lib/testing/msw-handlers
 */

import { http, HttpResponse, delay } from "msw";

// =============================================================================
// Types
// =============================================================================

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

// =============================================================================
// Mock Types
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

// =============================================================================
// Default Handlers
// =============================================================================

const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321";

/**
 * Default MSW handlers for common API endpoints
 */
export const defaultHandlers = [
  // Products
  http.get(`${BASE_URL}/functions/v1/api-v1-products`, async () => {
    await delay(50);
    return HttpResponse.json(
      mockSuccess([mockFactories.product(), mockFactories.product()])
    );
  }),

  http.get(`${BASE_URL}/functions/v1/api-v1-products/:id`, async ({ params }) => {
    await delay(50);
    return HttpResponse.json(
      mockSuccess(mockFactories.product({ id: params.id as string }))
    );
  }),

  http.post(`${BASE_URL}/functions/v1/api-v1-products`, async ({ request }) => {
    await delay(100);
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(
      mockSuccess(mockFactories.product(body as Partial<MockProduct>)),
      { status: 201 }
    );
  }),

  http.put(`${BASE_URL}/functions/v1/api-v1-products/:id`, async ({ params, request }) => {
    await delay(100);
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(
      mockSuccess(mockFactories.product({ id: params.id as string, ...body as Partial<MockProduct> }))
    );
  }),

  http.delete(`${BASE_URL}/functions/v1/api-v1-products/:id`, async () => {
    await delay(50);
    return new HttpResponse(null, { status: 204 });
  }),

  // Chat Rooms
  http.get(`${BASE_URL}/functions/v1/api-v1-food-chat/rooms`, async () => {
    await delay(50);
    return HttpResponse.json(mockSuccess([mockFactories.room()]));
  }),

  http.post(`${BASE_URL}/functions/v1/api-v1-food-chat/rooms`, async ({ request }) => {
    await delay(100);
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(
      mockSuccess(mockFactories.room(body as Partial<MockRoom>)),
      { status: 201 }
    );
  }),

  // Messages
  http.get(`${BASE_URL}/functions/v1/api-v1-food-chat/rooms/:roomId/messages`, async () => {
    await delay(50);
    return HttpResponse.json(
      mockSuccess([mockFactories.message(), mockFactories.message()])
    );
  }),

  http.post(`${BASE_URL}/functions/v1/api-v1-food-chat/rooms/:roomId/messages`, async ({ request }) => {
    await delay(100);
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(
      mockSuccess(mockFactories.message(body as Partial<MockMessage>)),
      { status: 201 }
    );
  }),

  // Profile
  http.get(`${BASE_URL}/functions/v1/api-v1-profile`, async () => {
    await delay(50);
    return HttpResponse.json(mockSuccess(mockFactories.user()));
  }),

  http.put(`${BASE_URL}/functions/v1/api-v1-profile`, async ({ request }) => {
    await delay(100);
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(mockSuccess(mockFactories.user(body as Partial<MockUser>)));
  }),
];

// =============================================================================
// Error Handlers (for testing error scenarios)
// =============================================================================

/**
 * Handlers that simulate various error conditions
 */
export const errorHandlers = {
  /** Simulate network timeout */
  timeout: (endpoint: string) =>
    http.all(`${BASE_URL}/functions/v1/${endpoint}`, async () => {
      await delay(60000); // 60 second delay
      return HttpResponse.json(mockError("TIMEOUT", "Request timed out"));
    }),

  /** Simulate rate limiting */
  rateLimit: (endpoint: string) =>
    http.all(`${BASE_URL}/functions/v1/${endpoint}`, () =>
      HttpResponse.json(
        mockError("RATE_LIMIT_EXCEEDED", "Too many requests"),
        { status: 429 }
      )
    ),

  /** Simulate server error */
  serverError: (endpoint: string) =>
    http.all(`${BASE_URL}/functions/v1/${endpoint}`, () =>
      HttpResponse.json(
        mockError("INTERNAL_ERROR", "Internal server error"),
        { status: 500 }
      )
    ),

  /** Simulate authentication error */
  unauthorized: (endpoint: string) =>
    http.all(`${BASE_URL}/functions/v1/${endpoint}`, () =>
      HttpResponse.json(
        mockError("UNAUTHORIZED", "Authentication required"),
        { status: 401 }
      )
    ),

  /** Simulate not found */
  notFound: (endpoint: string) =>
    http.all(`${BASE_URL}/functions/v1/${endpoint}`, () =>
      HttpResponse.json(
        mockError("NOT_FOUND", "Resource not found"),
        { status: 404 }
      )
    ),

  /** Simulate validation error */
  validation: (endpoint: string, details: unknown) =>
    http.all(`${BASE_URL}/functions/v1/${endpoint}`, () =>
      HttpResponse.json(
        mockError("VALIDATION_ERROR", "Validation failed", details),
        { status: 400 }
      )
    ),

  /** Simulate circuit breaker open */
  circuitOpen: (endpoint: string) =>
    http.all(`${BASE_URL}/functions/v1/${endpoint}`, () =>
      HttpResponse.json(
        mockError("CIRCUIT_OPEN", "Service temporarily unavailable"),
        { status: 503 }
      )
    ),
};

// =============================================================================
// Handler Utilities
// =============================================================================

/**
 * Create a custom handler for a specific endpoint
 */
export function createHandler<T>(
  method: "get" | "post" | "put" | "patch" | "delete",
  endpoint: string,
  response: T | (() => T | Promise<T>),
  options: MockResponseOptions = {}
) {
  const httpMethod = http[method];
  return httpMethod(`${BASE_URL}/functions/v1/${endpoint}`, async () => {
    if (options.delay) {
      await delay(options.delay);
    }
    const data = typeof response === "function" ? await (response as () => T | Promise<T>)() : response;
    return HttpResponse.json(mockSuccess(data), {
      status: options.status || 200,
      headers: options.headers,
    });
  });
}

/**
 * Create a sequence of responses for testing retry behavior
 */
export function createSequenceHandler(
  method: "get" | "post" | "put" | "patch" | "delete",
  endpoint: string,
  responses: Array<{ response: Record<string, unknown>; status?: number; delay?: number }>
) {
  let callIndex = 0;
  const httpMethod = http[method];

  return httpMethod(`${BASE_URL}/functions/v1/${endpoint}`, async () => {
    const current = responses[Math.min(callIndex, responses.length - 1)];
    callIndex++;

    if (current.delay) {
      await delay(current.delay);
    }

    return HttpResponse.json(current.response, {
      status: current.status || 200,
    });
  });
}
