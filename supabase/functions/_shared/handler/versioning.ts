/**
 * API Version Negotiation
 *
 * Accept-header (`application/vnd.foodshare.v2+json`) + `?version=` resolution.
 * Extracted from `_shared/api-handler.ts` — no logic changes.
 */

/**
 * Get requested API version from Accept header or query param
 */
export function getRequestedVersion(request: Request): string {
  // Check Accept header: application/vnd.foodshare.v2+json
  const accept = request.headers.get("accept") || "";
  const versionMatch = accept.match(/vnd\.foodshare\.v(\d+)/);
  if (versionMatch) {
    return versionMatch[1];
  }

  // Check query param: ?version=2
  const url = new URL(request.url);
  const queryVersion = url.searchParams.get("version");
  if (queryVersion) {
    return queryVersion;
  }

  // Default to v1
  return "1";
}
