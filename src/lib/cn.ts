import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes with proper precedence (`clsx` + `tailwind-merge`).
 *
 * Single source of truth for class-name merging. Import from `@/lib/cn`
 * in new code; `@/lib/utils` re-exports this for backward compatibility.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
