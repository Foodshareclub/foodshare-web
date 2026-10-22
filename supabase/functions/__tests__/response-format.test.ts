/**
 * Response Format Tests
 *
 * Ensures consistent response format across all endpoints.
 * Covers: success/error structure, pagination, cache, versioning,
 *         ETag/304, security headers, correlation ID, retryable flag,
 *         204 No Content, SSE streaming, and deprecation headers.
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  buildErrorResponse,
  buildNoContentResponse,
  buildStreamResponse,
  buildSuccessResponse,
  generateETag,
  SECURITY_HEADERS,
} from "../_shared/response-adapter.ts";
import { AppError, RateLimitError, ValidationError } from "../_shared/errors.ts";

const mockCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// =============================================================================
// Success Response
// =============================================================================

Deno.test("Response Format - Success response structure", () => {
  const data = { id: "123", name: "Test" };
  const response = buildSuccessResponse(data, mockCorsHeaders);

  assertEquals(response.status, 200);
  assertEquals(response.headers.get("Content-Type"), "application/json");
});

Deno.test("Response Format - Success response body", async () => {
  const data = { id: "123", name: "Test" };
  const response = buildSuccessResponse(data, mockCorsHeaders);
  const body = await response.json();

  assertEquals(body.success, true);
  assertEquals(body.data, data);
  assertExists(body.meta);
  assertExists(body.meta.requestId);
  assertExists(body.meta.timestamp);
  assertExists(body.meta.responseTime);
});

Deno.test("Response Format - Custom status code", () => {
  const data = { created: true };
  const response = buildSuccessResponse(data, mockCorsHeaders, { status: 201 });

  assertEquals(response.status, 201);
});

// =============================================================================
// Error Response
// =============================================================================

Deno.test("Response Format - Error response structure", () => {
  const error = new ValidationError("Invalid input", { field: "email" });
  const response = buildErrorResponse(error, mockCorsHeaders);

  assertEquals(response.status, 400);
  assertEquals(response.headers.get("Content-Type"), "application/json");
});

Deno.test("Response Format - Error response body", async () => {
  const error = new ValidationError("Invalid input", { field: "email" });
  const response = buildErrorResponse(error, mockCorsHeaders);
  const body = await response.json();

  assertEquals(body.success, false);
  assertExists(body.error);
  assertEquals(body.error.code, "VALIDATION_ERROR");
  assertEquals(body.error.message, "Invalid input");
  assertExists(body.meta);
});

Deno.test("Response Format - Error with retry-after", () => {
  const error = new AppError("Rate limited", "RATE_LIMITED", 429);
  const response = buildErrorResponse(error, mockCorsHeaders, {
    retryAfterMs: 60000,
  });

  assertEquals(response.status, 429);
  assertEquals(response.headers.get("Retry-After"), "60");
});

// =============================================================================
// Pagination
// =============================================================================

Deno.test("Response Format - Pagination metadata", async () => {
  const items = [{ id: 1 }, { id: 2 }];
  const response = buildSuccessResponse(items, mockCorsHeaders, {
    pagination: {
      offset: 0,
      limit: 10,
      total: 50,
      hasMore: true,
      nextOffset: 10,
    },
  });

  const body = await response.json();
  assertExists(body.pagination);
  assertEquals(body.pagination.offset, 0);
  assertEquals(body.pagination.limit, 10);
  assertEquals(body.pagination.total, 50);
  assertEquals(body.pagination.hasMore, true);
  assertEquals(body.pagination.nextOffset, 10);
});

// =============================================================================
// Cache & Version Headers
// =============================================================================

Deno.test("Response Format - Cache headers", () => {
  const data = { cached: true };
  const response = buildSuccessResponse(data, mockCorsHeaders, {
    cacheTTL: 300,
  });

  assertEquals(response.headers.get("Cache-Control"), "public, max-age=300");
});

Deno.test("Response Format - Version header", () => {
  const data = { versioned: true };
  const response = buildSuccessResponse(data, mockCorsHeaders, {
    version: "2.0",
  });

  assertExists(response.headers.get("X-API-Version"));
});

// =============================================================================
// Security Headers
// =============================================================================

Deno.test("Response Format - Security headers present on success response", () => {
  const response = buildSuccessResponse({ ok: true }, mockCorsHeaders);

  assertEquals(
    response.headers.get("X-Content-Type-Options"),
    "nosniff",
  );
  assertEquals(
    response.headers.get("X-Frame-Options"),
    "DENY",
  );
  assertEquals(
    response.headers.get("Strict-Transport-Security"),
    "max-age=31536000; includeSubDomains",
  );
});

Deno.test("Response Format - Referrer-Policy header present", () => {
  const response = buildSuccessResponse({ ok: true }, mockCorsHeaders);

  assertEquals(
    response.headers.get("Referrer-Policy"),
    "strict-origin-when-cross-origin",
  );
});

Deno.test("Response Format - Permissions-Policy header present", () => {
  const response = buildSuccessResponse({ ok: true }, mockCorsHeaders);

  const policy = response.headers.get("Permissions-Policy");
  assertExists(policy);
  assertEquals(policy!.includes("camera=()"), true);
  assertEquals(policy!.includes("microphone=()"), true);
  assertEquals(policy!.includes("geolocation=()"), true);
  assertEquals(policy!.includes("payment=()"), true);
});

Deno.test("Response Format - Security headers present on error response", () => {
  const error = new AppError("Fail", "TEST_ERROR", 500);
  const response = buildErrorResponse(error, mockCorsHeaders);

  assertEquals(
    response.headers.get("X-Content-Type-Options"),
    "nosniff",
  );
  assertEquals(
    response.headers.get("Referrer-Policy"),
    "strict-origin-when-cross-origin",
  );
  assertExists(response.headers.get("Permissions-Policy"));
});

Deno.test("Response Format - SECURITY_HEADERS constant contains all expected keys", () => {
  const expected = [
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Strict-Transport-Security",
    "Referrer-Policy",
    "Permissions-Policy",
  ];
  for (const key of expected) {
    assertExists(SECURITY_HEADERS[key], `Missing security header: ${key}`);
  }
});

// =============================================================================
// ETag / 304 Not Modified
// =============================================================================

Deno.test("Response Format - ETag header is generated on success", () => {
  const response = buildSuccessResponse({ id: "abc" }, mockCorsHeaders);

  const etag = response.headers.get("ETag");
  assertExists(etag);
  assertEquals(etag!.startsWith('W/"'), true);
});

Deno.test("Response Format - Same data produces same ETag", () => {
  const data = { id: "deterministic-test", value: 42 };
  const r1 = buildSuccessResponse(data, mockCorsHeaders);
  const r2 = buildSuccessResponse(data, mockCorsHeaders);

  assertEquals(r1.headers.get("ETag"), r2.headers.get("ETag"));
});

Deno.test("Response Format - Different data produces different ETag", () => {
  const r1 = buildSuccessResponse({ id: "a" }, mockCorsHeaders);
  const r2 = buildSuccessResponse({ id: "b" }, mockCorsHeaders);

  const etag1 = r1.headers.get("ETag");
  const etag2 = r2.headers.get("ETag");
  assertExists(etag1);
  assertExists(etag2);
  assertEquals(etag1 !== etag2, true);
});

Deno.test("Response Format - 304 Not Modified when If-None-Match matches", () => {
  const data = { id: "cache-check" };

  // First request: get the ETag
  const firstResponse = buildSuccessResponse(data, mockCorsHeaders);
  const etag = firstResponse.headers.get("ETag")!;

  // Second request: send If-None-Match with matching ETag
  const conditionalRequest = new Request("https://example.com/api/test", {
    headers: { "If-None-Match": etag },
  });

  const secondResponse = buildSuccessResponse(data, mockCorsHeaders, {
    request: conditionalRequest,
  });

  assertEquals(secondResponse.status, 304);
});

Deno.test("Response Format - 200 OK when If-None-Match does not match", () => {
  const data = { id: "cache-miss" };

  const conditionalRequest = new Request("https://example.com/api/test", {
    headers: { "If-None-Match": 'W/"stale-etag"' },
  });

  const response = buildSuccessResponse(data, mockCorsHeaders, {
    request: conditionalRequest,
  });

  assertEquals(response.status, 200);
});

Deno.test("Response Format - generateETag async produces consistent output", async () => {
  const body = '{"test": "value"}';
  const etag1 = await generateETag(body);
  const etag2 = await generateETag(body);

  assertEquals(etag1, etag2);
  assertEquals(etag1.startsWith('W/"'), true);
  assertEquals(etag1.endsWith('"'), true);
});

Deno.test("Response Format - generateETag async produces different output for different input", async () => {
  const etag1 = await generateETag('{"a": 1}');
  const etag2 = await generateETag('{"b": 2}');

  assertEquals(etag1 !== etag2, true);
});

// =============================================================================
// Retryable Flag in Error Body
// =============================================================================

Deno.test("Response Format - Retryable flag surfaced for retryable errors", async () => {
  const error = new RateLimitError("Too many requests", 30000);
  const response = buildErrorResponse(error, mockCorsHeaders);
  const body = await response.json();

  assertEquals(body.error.retryable, true);
});

Deno.test("Response Format - Retryable flag surfaced as false for non-retryable errors", async () => {
  const error = new ValidationError("Bad input");
  const response = buildErrorResponse(error, mockCorsHeaders);
  const body = await response.json();

  assertEquals(body.error.retryable, false);
});

Deno.test("Response Format - Retryable flag undefined for plain Error", async () => {
  const error = new Error("Something broke");
  const response = buildErrorResponse(error, mockCorsHeaders);
  const body = await response.json();

  // Plain Error has no `retryable` property
  assertEquals(body.error.retryable, undefined);
});

// =============================================================================
// 204 No Content Response
// =============================================================================

Deno.test("Response Format - buildNoContentResponse returns 204", () => {
  const response = buildNoContentResponse(mockCorsHeaders);

  assertEquals(response.status, 204);
  assertEquals(response.body, null);
});

Deno.test("Response Format - buildNoContentResponse includes security headers", () => {
  const response = buildNoContentResponse(mockCorsHeaders);

  assertEquals(response.headers.get("X-Content-Type-Options"), "nosniff");
  assertEquals(response.headers.get("X-Frame-Options"), "DENY");
  assertExists(response.headers.get("Permissions-Policy"));
});

Deno.test("Response Format - buildNoContentResponse includes CORS headers", () => {
  const response = buildNoContentResponse(mockCorsHeaders);

  assertEquals(response.headers.get("Access-Control-Allow-Origin"), "*");
});

// =============================================================================
// SSE Streaming Response
// =============================================================================

Deno.test("Response Format - buildStreamResponse returns 200 with text/event-stream", () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("data: test\n\n"));
      controller.close();
    },
  });

  const response = buildStreamResponse(stream, mockCorsHeaders);

  assertEquals(response.status, 200);
  assertEquals(response.headers.get("Content-Type"), "text/event-stream");
  assertEquals(response.headers.get("Cache-Control"), "no-cache");
  assertEquals(response.headers.get("Connection"), "keep-alive");
  assertEquals(response.headers.get("X-Accel-Buffering"), "no");
});

Deno.test("Response Format - buildStreamResponse includes security headers", () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.close();
    },
  });

  const response = buildStreamResponse(stream, mockCorsHeaders);

  assertEquals(response.headers.get("X-Content-Type-Options"), "nosniff");
  assertExists(response.headers.get("Permissions-Policy"));
});

Deno.test("Response Format - buildStreamResponse body is readable", async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("data: hello\n\n"));
      controller.enqueue(new TextEncoder().encode("data: world\n\n"));
      controller.close();
    },
  });

  const response = buildStreamResponse(stream, mockCorsHeaders);
  const text = await response.text();

  assertEquals(text.includes("data: hello"), true);
  assertEquals(text.includes("data: world"), true);
});

// =============================================================================
// Deprecation Headers (RFC 8594)
// =============================================================================

Deno.test("Response Format - Deprecation header set when deprecation options provided", () => {
  const response = buildSuccessResponse({ ok: true }, mockCorsHeaders, {
    deprecation: {
      deprecatedAt: "2026-06-01",
      sunsetDate: "2027-01-01",
    },
  });

  assertEquals(response.headers.get("Deprecation"), "2026-06-01");
  assertEquals(response.headers.get("Sunset"), "2027-01-01");
});

Deno.test("Response Format - Deprecation Link header for migration guide", () => {
  const response = buildSuccessResponse({ ok: true }, mockCorsHeaders, {
    deprecation: {
      deprecatedAt: "2026-06-01",
      link: "https://docs.foodshare.app/migration/v2",
    },
  });

  const link = response.headers.get("Link");
  assertExists(link);
  assertEquals(link!.includes("https://docs.foodshare.app/migration/v2"), true);
  assertEquals(link!.includes('rel="deprecation"'), true);
});

Deno.test("Response Format - No deprecation headers when option is absent", () => {
  const response = buildSuccessResponse({ ok: true }, mockCorsHeaders);

  assertEquals(response.headers.get("Deprecation"), null);
  assertEquals(response.headers.get("Sunset"), null);
});
