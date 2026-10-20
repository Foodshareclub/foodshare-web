/**
 * The Edge Function API surface, as mock routes.
 *
 * Each route says which method and path the API client will call, and what
 * comes back. That is the part worth keeping: it is a written-down contract
 * for the endpoints the app talks to, and a test that asserts on it is a test
 * that fails when the contract changes.
 *
 * The routes are plain objects. Nothing here starts a server or touches the
 * network — a route can be called directly, and `mock-server.ts` is the
 * optional adapter that puts one behind `Bun.serve`.
 *
 * The paths are relative to the API client's base URL. The client builds
 * `${SUPABASE_URL}/functions/v1/<edge-function>`, so pointing the client at a
 * mock server's origin is all it takes to route it here.
 *
 * @module lib/testing/mock-routes
 */

import { mockError, mockFactories, mockSuccess } from "./mock-factories";
import type { MockProduct, MockRoom, MockUser } from "./mock-factories";
import { NativeResponse } from "./native";

export type MockMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type MockRequestContext = {
  /** Path parameters captured from `:name` placeholders. */
  params: Record<string, string>;
  /** The incoming request. */
  request: Request;
  /** The request's URL. */
  url: URL;
};

export type MockRoute = {
  /** The HTTP method the route answers. */
  method: MockMethod;
  /** The path pattern, with `:name` placeholders for parameters. */
  path: string;
  /** What to answer with. */
  respond: (ctx: MockRequestContext) => Response | Promise<Response>;
};

/**
 * A JSON response, built with Bun's own `Response`.
 *
 * The global `Response` is happy-dom's under the test runner, and
 * `Bun.serve` rejects that — see `native.ts`.
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new NativeResponse(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** An empty response, for the endpoints that answer 204. */
export function noContentResponse(): Response {
  return new NativeResponse(null, { status: 204 });
}

/** Wait, the way a slow network would. */
function delay(ms: number): Promise<void> {
  return Bun.sleep(ms);
}

/** The path an edge function is served at. */
const EDGE = "/functions/v1";

// =============================================================================
// Default routes — the endpoints the app calls
// =============================================================================

export const defaultRoutes: MockRoute[] = [
  // Products
  {
    method: "GET",
    path: `${EDGE}/api-v1-products`,
    respond: async () => {
      await delay(50);
      return jsonResponse(mockSuccess([mockFactories.product(), mockFactories.product()]));
    },
  },
  {
    method: "GET",
    path: `${EDGE}/api-v1-products/:id`,
    respond: async ({ params }) => {
      await delay(50);
      return jsonResponse(mockSuccess(mockFactories.product({ id: params.id ?? "" })));
    },
  },
  {
    method: "POST",
    path: `${EDGE}/api-v1-products`,
    respond: async ({ request }) => {
      await delay(100);
      const body = (await request.json()) as Partial<MockProduct>;
      return jsonResponse(mockSuccess(mockFactories.product(body)), 201);
    },
  },
  {
    method: "PUT",
    path: `${EDGE}/api-v1-products/:id`,
    respond: async ({ params, request }) => {
      await delay(100);
      const body = (await request.json()) as Partial<MockProduct>;
      return jsonResponse(mockSuccess(mockFactories.product({ id: params.id ?? "", ...body })));
    },
  },
  {
    method: "DELETE",
    path: `${EDGE}/api-v1-products/:id`,
    respond: async () => {
      await delay(50);
      return noContentResponse();
    },
  },

  // Chat rooms
  {
    method: "GET",
    path: `${EDGE}/api-v1-chat/rooms`,
    respond: async () => {
      await delay(50);
      return jsonResponse(mockSuccess([mockFactories.room()]));
    },
  },
  {
    method: "POST",
    path: `${EDGE}/api-v1-chat/rooms`,
    respond: async ({ request }) => {
      await delay(100);
      const body = (await request.json()) as Partial<MockRoom>;
      return jsonResponse(mockSuccess(mockFactories.room(body)), 201);
    },
  },

  // Messages
  {
    method: "GET",
    path: `${EDGE}/api-v1-chat/rooms/:roomId/messages`,
    respond: async () => {
      await delay(50);
      return jsonResponse(mockSuccess([mockFactories.message(), mockFactories.message()]));
    },
  },
  {
    method: "POST",
    path: `${EDGE}/api-v1-chat/rooms/:roomId/messages`,
    respond: async ({ request }) => {
      await delay(100);
      const body = (await request.json()) as Record<string, unknown>;
      return jsonResponse(mockSuccess(mockFactories.message(body)), 201);
    },
  },

  // Profile
  {
    method: "GET",
    path: `${EDGE}/api-v1-profile`,
    respond: async () => {
      await delay(50);
      return jsonResponse(mockSuccess(mockFactories.user()));
    },
  },
  {
    method: "PUT",
    path: `${EDGE}/api-v1-profile`,
    respond: async ({ request }) => {
      await delay(100);
      const body = (await request.json()) as Partial<MockUser>;
      return jsonResponse(mockSuccess(mockFactories.user(body)));
    },
  },
];

// =============================================================================
// Error routes — the failure modes the app has to survive
// =============================================================================

/**
 * Routes that simulate a failure mode.
 *
 * Each takes the edge function's name and answers every method on it, which
 * is what a test wants: "when this endpoint times out, the client retries".
 */
export const errorRoutes = {
  /** The request never comes back. */
  timeout: (endpoint: string): MockRoute => ({
    method: "GET",
    path: `${EDGE}/${endpoint}`,
    respond: async () => {
      await delay(60_000);
      return jsonResponse(mockError("TIMEOUT", "Request timed out"));
    },
  }),

  /** The endpoint is rate limited. */
  rateLimit: (endpoint: string): MockRoute => ({
    method: "GET",
    path: `${EDGE}/${endpoint}`,
    respond: () => jsonResponse(mockError("RATE_LIMIT_EXCEEDED", "Too many requests"), 429),
  }),

  /** The endpoint fails. */
  serverError: (endpoint: string): MockRoute => ({
    method: "GET",
    path: `${EDGE}/${endpoint}`,
    respond: () => jsonResponse(mockError("INTERNAL_ERROR", "Internal server error"), 500),
  }),

  /** The endpoint wants credentials. */
  unauthorized: (endpoint: string): MockRoute => ({
    method: "GET",
    path: `${EDGE}/${endpoint}`,
    respond: () => jsonResponse(mockError("UNAUTHORIZED", "Authentication required"), 401),
  }),

  /** The endpoint has nothing at that path. */
  notFound: (endpoint: string): MockRoute => ({
    method: "GET",
    path: `${EDGE}/${endpoint}`,
    respond: () => jsonResponse(mockError("NOT_FOUND", "Resource not found"), 404),
  }),

  /** The endpoint rejects the request body. */
  validation: (endpoint: string, details?: unknown): MockRoute => ({
    method: "GET",
    path: `${EDGE}/${endpoint}`,
    respond: () => jsonResponse(mockError("VALIDATION_ERROR", "Validation failed", details), 400),
  }),

  /** The endpoint is behind a circuit that is open. */
  circuitOpen: (endpoint: string): MockRoute => ({
    method: "GET",
    path: `${EDGE}/${endpoint}`,
    respond: () => jsonResponse(mockError("CIRCUIT_OPEN", "Service temporarily unavailable"), 503),
  }),
};

// =============================================================================
// Route utilities
// =============================================================================

/**
 * A route that answers with a fixed payload.
 *
 * `response` may be a function, so a test can vary the answer per call.
 */
export function createRoute<T>(
  method: MockMethod,
  endpoint: string,
  response: T | (() => T | Promise<T>),
  options: { delay?: number; status?: number; headers?: Record<string, string> } = {},
): MockRoute {
  return {
    method,
    path: `${EDGE}/${endpoint}`,
    respond: async () => {
      if (options.delay) await delay(options.delay);
      const data = typeof response === "function" ? await (response as () => T | Promise<T>)() : response;
      const res = jsonResponse(mockSuccess(data), options.status ?? 200);
      if (options.headers) {
        for (const [name, value] of Object.entries(options.headers)) res.headers.set(name, value);
      }
      return res;
    },
  };
}

/**
 * A route that answers with a different payload on each call.
 *
 * The last entry repeats once the sequence is exhausted, so a test that
 * retries more times than it declared still gets a deterministic answer.
 */
export function createSequenceRoute(
  method: MockMethod,
  endpoint: string,
  responses: { response: Record<string, unknown>; status?: number; delay?: number }[],
): MockRoute {
  let callIndex = 0;

  return {
    method,
    path: `${EDGE}/${endpoint}`,
    respond: async () => {
      const current = responses[Math.min(callIndex, responses.length - 1)];
      callIndex += 1;
      if (current?.delay) await delay(current.delay);
      return jsonResponse(current?.response ?? {}, current?.status ?? 200);
    },
  };
}
