/**
 * Pagination Utilities
 *
 * Cursor encoding/decoding and limit normalization for the
 * timestamp + ID composite-cursor protocol used by the listings
 * endpoints (`api-v1-products`).
 *
 * The larger cursor-pagination query-builder surface that used to live
 * here (applyCursorPagination, processCursorResult, the offset helpers
 * and the SQL-fragment helper) had no call sites anywhere in the estate —
 * edge functions deploy from this repo, so dead here means dead in
 * production too — and its `getCursorWhere` interpolated client-supplied
 * cursor values into a SQL string. It was removed rather than kept
 * annotated: a booby trap is a trap even with a sign on it.
 */

/**
 * Composite cursor for precise pagination
 * Uses timestamp + ID to handle items created at the same second
 */
export interface CompositeCursor {
  timestamp: string;
  id: string;
}

/**
 * Default and maximum limits
 */
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Encode a composite cursor to a string
 */
export function encodeCursor(cursor: CompositeCursor): string {
  const json = JSON.stringify(cursor);
  return btoa(json);
}

/**
 * Decode a cursor string to composite cursor
 */
export function decodeCursor(cursorString: string): CompositeCursor | null {
  try {
    const json = atob(cursorString);
    const parsed = JSON.parse(json);

    if (typeof parsed.timestamp === "string" && typeof parsed.id === "string") {
      return parsed as CompositeCursor;
    }

    // Handle legacy single-value cursors (just timestamp)
    if (typeof parsed === "string") {
      return { timestamp: parsed, id: "" };
    }

    return null;
  } catch {
    // Try to handle raw timestamp strings (legacy format)
    if (/^\d{4}-\d{2}-\d{2}/.test(cursorString)) {
      return { timestamp: cursorString, id: "" };
    }
    return null;
  }
}

/**
 * Normalize limit value to be within bounds
 */
export function normalizeLimit(limit?: number | string): number {
  if (limit === undefined || limit === null) {
    return DEFAULT_LIMIT;
  }

  const parsed = typeof limit === "string" ? parseInt(limit, 10) : limit;

  if (isNaN(parsed) || parsed < 1) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsed, MAX_LIMIT);
}
