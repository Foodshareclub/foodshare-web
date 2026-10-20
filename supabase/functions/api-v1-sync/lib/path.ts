/**
 * Sync Sub-Path Helper
 *
 * Extracted from `api-v1-sync/index.ts` — no changes.
 */

export function getSubPath(url: URL): string {
  const pathname = url.pathname;
  const idx = pathname.indexOf("/api-v1-sync");
  if (idx === -1) return "";
  const subPath = pathname.slice(idx + 12); // Remove "/api-v1-sync"
  return subPath.startsWith("/") ? subPath.slice(1) : subPath;
}
