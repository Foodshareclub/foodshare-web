/**
 * Request Body & Query Parsing
 *
 * Size-guarded body parsing (JSON + multipart) and query param extraction.
 * Extracted from `_shared/api-handler.ts` — no logic changes.
 */

import { PayloadTooLargeError, ValidationError } from "../errors.ts";

export const DEFAULT_MAX_BODY_SIZE = 1024 * 1024; // 1MB

export async function parseRequestBody(
  request: Request,
  maxBodySize?: number,
): Promise<unknown> {
  const limit = maxBodySize ?? DEFAULT_MAX_BODY_SIZE;
  const contentType = request.headers.get("content-type") || "";

  // Check Content-Length header before reading body
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > limit) {
    throw new PayloadTooLargeError(
      `Request body too large. Maximum size is ${Math.round(limit / 1024)}KB`,
      limit,
    );
  }

  if (contentType.includes("application/json")) {
    try {
      const text = await request.text();
      if (text.length > limit) {
        throw new PayloadTooLargeError(
          `Request body too large. Maximum size is ${Math.round(limit / 1024)}KB`,
          limit,
        );
      }
      return text ? JSON.parse(text) : {};
    } catch (e) {
      if (e instanceof PayloadTooLargeError) throw e;
      throw new ValidationError("Invalid JSON in request body");
    }
  }

  if (contentType.includes("multipart/form-data")) {
    // Bleeding edge: enforce 1 MB guard for multipart (R31) — prevents large file bypass
    const contentLengthHeader = request.headers.get("content-length");
    if (contentLengthHeader && parseInt(contentLengthHeader, 10) > limit) {
      throw new PayloadTooLargeError(
        `Request body too large. Maximum size is ${Math.round(limit / 1024)}KB`,
        limit,
      );
    }
    // Return the FormData itself, not a flattened object. Flattening lost
    // repeated file fields, and — more importantly — the caller then had to
    // call `request.formData()` a second time to read the upload, which throws
    // because the stream is already consumed. The body is still size-guarded
    // above by Content-Length and the stream is read exactly once.
    return await request.formData();
  }

  return {};
}

export function parseQueryParams(url: URL): Record<string, string> {
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}
