/**
 * XSS Prevention — HTML Sanitization
 *
 * Escape/strip helpers plus recursive object sanitization.
 * Extracted from `_shared/validation-rules.ts` — no logic changes.
 */

/**
 * HTML entities to escape for XSS prevention
 */
const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
};

/**
 * Patterns that indicate potential XSS attacks
 */
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // onclick=, onerror=, etc.
  /data:\s*text\/html/gi,
  /vbscript:/gi,
  /expression\s*\(/gi,
];

/**
 * Sanitize a string by escaping HTML special characters
 * Prevents XSS attacks when user input is rendered in HTML context
 */
export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return "";

  return input.replace(/[&<>"'`=/]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

/**
 * Remove dangerous HTML/JS patterns from a string
 * More aggressive than sanitizeHtml - actually strips dangerous content
 */
export function stripDangerousContent(
  input: string | null | undefined,
): string {
  if (!input) return "";

  let result = input;

  // Remove script tags and their content
  for (const pattern of XSS_PATTERNS) {
    result = result.replace(pattern, "");
  }

  // Remove any remaining HTML tags
  result = result.replace(/<[^>]*>/g, "");

  return result.trim();
}

/**
 * Check if a string contains potential XSS patterns
 */
export function containsXssPatterns(input: string | null | undefined): boolean {
  if (!input) return false;

  return XSS_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(input);
  });
}

/**
 * Recursively sanitize all string values in an object
 * Useful for sanitizing entire request bodies
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: {
    stripDangerous?: boolean;
    excludeKeys?: string[];
  } = {},
): T {
  const { stripDangerous = false, excludeKeys = [] } = options;

  const sanitize = (value: unknown, key?: string): unknown => {
    // Skip excluded keys
    if (key && excludeKeys.includes(key)) {
      return value;
    }

    if (typeof value === "string") {
      return stripDangerous ? stripDangerousContent(value) : sanitizeHtml(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => sanitize(item));
    }

    if (value !== null && typeof value === "object") {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = sanitize(v, k);
      }
      return result;
    }

    return value;
  };

  return sanitize(obj) as T;
}
