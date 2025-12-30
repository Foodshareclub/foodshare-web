import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Date format options
 * - "short": Dec 29, 2025 (default)
 * - "long": December 29, 2025
 * - "relative": Today, Yesterday, 3 days ago, 2 weeks ago
 * - "relative-short": Just now, 5m ago, 2h ago, 3d ago
 */
export type DateFormat = "short" | "long" | "relative" | "relative-short";

export interface FormatDateOptions {
  format?: DateFormat;
}

/**
 * Format a date for display with various format options
 */
export function formatDate(date: Date | string, options?: FormatDateOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const format = options?.format || "short";

  switch (format) {
    case "long":
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

    case "relative":
      return formatRelativeDate(d);

    case "relative-short":
      return formatRelativeDateShort(d);

    case "short":
    default:
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
  }
}

/**
 * Format date as relative time (Today, Yesterday, X days ago, X weeks ago)
 */
function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Format date as short relative time (Just now, 5m ago, 2h ago, 3d ago)
 */
function formatRelativeDateShort(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

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
