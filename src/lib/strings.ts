/**
 * String utilities (XSS-safe escaping, query filters, slugs).
 *
 * Canonical home for `escapeHtml`, `escapeFilterValue`, `slugify`.
 * Re-exported from `@/lib/utils` for backward compatibility — import
 * from `@/lib/strings` in new code.
 */

/**
 * Escape HTML special characters to prevent XSS attacks
 * Use this when inserting user-provided text into HTML contexts
 */
export function escapeHtml(text: string): string {
  const htmlEscapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => htmlEscapeMap[char]);
}

/**
 * Escape special characters for Supabase/PostgreSQL ILIKE/LIKE filters
 * Prevents wildcards (%, _) and backslash from being interpreted
 * Use this when building .or() or .ilike() filters with user input
 */
export function escapeFilterValue(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

/**
 * Generate an SEO-friendly slug from text.
 * Lowercases, trims, replaces non-alphanumeric chars with '-',
 * limits to 60 chars, defaults to "item".
 * Matches the backend implementation in foodshare-backend.
 */
export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "item"
  );
}
