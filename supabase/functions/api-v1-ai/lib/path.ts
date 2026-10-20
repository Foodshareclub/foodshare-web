/**
 * AI Sub-Path Helper
 *
 * Extracts the route suffix after the `/api-v1-ai` marker.
 * Extracted from `api-v1-ai/index.ts` — no changes.
 */

export function getSubPath(url: URL): string {
  const marker = "/api-v1-ai";
  const idx = url.pathname.indexOf(marker);
  if (idx === -1) return "";
  const sub = url.pathname.slice(idx + marker.length);
  return sub.startsWith("/") ? sub.slice(1) : sub;
}
