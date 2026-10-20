/**
 * Path Parameter Extraction
 *
 * Pattern-based (`/products/:id`) path param matching for edge routes.
 * Extracted from `_shared/api-handler.ts` — no logic changes.
 */

/**
 * Extract path parameters from URL based on pattern
 *
 * @example
 * extractPathParams(new URL("https://example.com/products/123/reviews/456"), "/products/:productId/reviews/:reviewId")
 * // => { productId: "123", reviewId: "456" }
 */
export function extractPathParams(url: URL, pattern: string): Record<string, string> {
  const params: Record<string, string> = {};

  // Extract the path from the URL (handle edge function paths)
  // Edge functions might be at /products or /api/products
  const urlPath = url.pathname;

  // Split pattern and URL path into segments
  const patternSegments = pattern.split("/").filter(Boolean);
  const urlSegments = urlPath.split("/").filter(Boolean);

  // Find where the pattern starts in the URL
  // This handles cases like URL: /api/products/123 and pattern: /products/:id
  let startIndex = 0;
  for (let i = 0; i <= urlSegments.length - patternSegments.length; i++) {
    let matches = true;
    for (let j = 0; j < patternSegments.length; j++) {
      const patternSeg = patternSegments[j];
      const urlSeg = urlSegments[i + j];

      // Parameter segments always match
      if (patternSeg.startsWith(":")) continue;

      // Static segments must match exactly
      if (patternSeg !== urlSeg) {
        matches = false;
        break;
      }
    }
    if (matches) {
      startIndex = i;
      break;
    }
  }

  // Extract parameters
  for (let i = 0; i < patternSegments.length; i++) {
    const patternSeg = patternSegments[i];
    const urlSeg = urlSegments[startIndex + i];

    if (patternSeg.startsWith(":") && urlSeg) {
      const paramName = patternSeg.slice(1);
      params[paramName] = decodeURIComponent(urlSeg);
    }
  }

  return params;
}
