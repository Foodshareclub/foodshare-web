/**
 * Redirect target validation.
 *
 * Login and the OAuth callback both accept a destination from the URL. Without
 * validation `?next=https://evil.example` survives `new URL(next, origin)` (an
 * absolute URL ignores the base) and `router.replace(from)`, turning the app
 * into a launch pad for phishing right after a successful sign-in.
 */

const BACKSLASH = /\\/;
const SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * Returns `path` when it is a safe in-app path, otherwise `fallback`.
 *
 * Rejects absolute URLs, protocol-relative (`//host`), backslash variants that
 * browsers normalise to `//host`, and control characters that allow header or
 * path splitting.
 */
export function safeInternalPath(path: string | null | undefined, fallback = "/"): string {
  if (!path) return fallback;

  const value = path.trim();
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (BACKSLASH.test(value)) return fallback;
  if (hasControlCharacter(value)) return fallback;
  if (SCHEME.test(value)) return fallback;

  return value;
}
