/**
 * Feature Flags Sub-Path Helper
 *
 * Extracted from `api-v1-feature-flags/index.ts` — no changes.
 */

export function getSubPath(url: URL): string {
  const pathname = url.pathname;
  // Match against function name in path
  const marker = "/api-v1-feature-flags";
  const idx = pathname.indexOf(marker);
  if (idx === -1) return "";
  const subPath = pathname.slice(idx + marker.length);
  return subPath.startsWith("/") ? subPath.slice(1) : subPath;
}
