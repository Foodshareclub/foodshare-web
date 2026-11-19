/**
 * Handler Response Helpers
 *
 * `ok` / `created` / `noContent` / `paginated` shortcuts for route handlers.
 * Extracted from `_shared/api-handler.ts` — no logic changes.
 */

import { buildSuccessResponse, type UIHints } from "../response-adapter.ts";
import type { HandlerContext } from "./types.ts";

/**
 * Create a success response from a handler
 */
export function ok<T>(
  data: T,
  ctx: HandlerContext,
  statusOrOptions?: number | {
    status?: number;
    cacheTTL?: number;
    uiHints?: Record<string, unknown>;
  },
): Response {
  const options = typeof statusOrOptions === "number"
    ? { status: statusOrOptions }
    : statusOrOptions || {};
  return buildSuccessResponse(data, ctx.corsHeaders, {
    status: options.status || 200,
    cacheTTL: options.cacheTTL,
    uiHints: options.uiHints as UIHints | undefined,
  });
}

/**
 * Create a created response (201)
 */
export function created<T>(data: T, ctx: HandlerContext): Response {
  return buildSuccessResponse(data, ctx.corsHeaders, { status: 201 });
}

/**
 * Create a no content response (204)
 */
export function noContent(ctx: HandlerContext): Response {
  return new Response(null, {
    status: 204,
    headers: ctx.corsHeaders,
  });
}

/**
 * Create a paginated response
 */
export function paginated<T>(
  items: T[],
  ctx: HandlerContext,
  pagination: {
    offset: number;
    limit: number;
    total: number;
    /** Next cursor for cursor-based pagination */
    nextCursor?: string | null;
  },
): Response {
  // Support both offset-based and cursor-based pagination
  const hasMore = pagination.nextCursor !== undefined
    ? pagination.nextCursor !== null
    : pagination.offset + items.length < pagination.total;

  return buildSuccessResponse(items, ctx.corsHeaders, {
    pagination: {
      offset: pagination.offset,
      limit: pagination.limit,
      total: pagination.total,
      hasMore,
      nextOffset: hasMore && pagination.nextCursor === undefined
        ? pagination.offset + pagination.limit
        : undefined,
      nextCursor: pagination.nextCursor ?? undefined,
    },
  });
}
