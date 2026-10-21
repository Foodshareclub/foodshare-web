/**
 * The template's placeholder values.
 *
 * The estate's environment files are copied from the templates, and the
 * templates carry example values: "https://your-instance.upstash.io",
 * "your-upstash-rest-token", "your-twilio-account-sid". A value like
 * that is not a configuration. A service that is configured with one is
 * not configured at all, and saying otherwise turns a missing
 * integration into a red health check that looks like an outage -- and
 * sends people hunting a network problem that does not exist, because
 * the request fails to resolve a host that was never there.
 *
 * The two questions are kept apart on purpose:
 *
 *   isMissing(value)     -- the value is empty, so nothing was configured
 *   isPlaceholder(value) -- the value is the template's example, so what
 *                           was configured is an example
 *
 * A missing value and a placeholder are both "not configured", and both
 * are different from a value that is set and wrong.
 */

/**
 * Is this value one of the templates' example values?
 *
 * The templates use the "your-" prefix and the "your-instance" host for
 * every service they carry, so those are what this looks for.
 */
export function isPlaceholderValue(value: string | null | undefined): boolean {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return false;
  const lowered = trimmed.toLowerCase();
  return (
    lowered.startsWith("your-") ||
    lowered.includes("your-instance") ||
    lowered.includes("your-upstash")
  );
}

/**
 * Is this value absent?
 *
 * Empty, and nothing but whitespace, counts as absent.
 */
export function isMissingValue(value: string | null | undefined): boolean {
  return (value ?? "").trim() === "";
}

/**
 * Is this service configured at all?
 *
 * A service with a missing value is not configured, and a service whose
 * value is the template's example is not configured either -- the second
 * one is the case that hides, because the value is there and it looks
 * real.
 */
export function isConfigured(
  url: string | null | undefined,
  token: string | null | undefined,
): boolean {
  if (isMissingValue(url) || isMissingValue(token)) return false;
  return !isPlaceholderValue(url) && !isPlaceholderValue(token);
}

/**
 * Why a service is not configured, in a sentence a person can act on.
 */
export function notConfiguredReason(
  url: string | null | undefined,
  token: string | null | undefined,
): string {
  if (isMissingValue(url) || isMissingValue(token)) {
    return "Not configured (skipped)";
  }
  if (isPlaceholderValue(url) || isPlaceholderValue(token)) {
    return "Not configured (skipped): the value is the template's placeholder, not a real one";
  }
  return "Configured";
}
