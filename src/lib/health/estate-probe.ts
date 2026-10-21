/**
 * The probes the estate's health route makes.
 *
 * A health route is an instrument, and an instrument that reports the
 * wrong thing is worse than no instrument: the estate's database was
 * reported as down while it was serving data, and the site answered 503
 * and showed its maintenance banner to everybody.
 *
 * The database probe is the one that was wrong. It asked PostgREST for
 * "/rest/v1/?select=1", and "1" is not a column: PostgREST cannot parse
 * the select and answers 400, so the route reported the database as
 * down. The same key read the same data through the same service
 * everywhere else, and the deployment's own smoke test asked PostgREST
 * for "/rest/v1/" and got 200.
 *
 * So the probe asks for one row of one view, with a column that exists.
 * The view is the one the product feed reads, so a failure of it is a
 * failure of the estate rather than of the probe.
 */

/** One row of the view the product feed reads. */
export const DATABASE_PROBE_PATH = "/rest/v1/posts_with_location?select=id&limit=1";

/** The auth service, behind Kong. */
export const AUTH_PROBE_PATH = "/auth/v1/health";

/** The storage service, behind Kong. */
export const STORAGE_PROBE_PATH = "/storage/v1/status";

/** Whether a service answered. */
export type ServiceState = "up" | "down" | "unknown";

/**
 * Ask a service whether it is there.
 *
 * A service that does not answer within the timeout is down, and so is
 * one that answers with an error: what matters is whether the estate can
 * use it, not whether it said something.
 */
export async function probe(
  url: string,
  init: RequestInit = {},
  timeoutMs = 3000,
): Promise<{ state: ServiceState; ms: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
    const ms = Date.now() - startedAt;
    return { state: response.ok ? "up" : "down", ms };
  } catch {
    return { state: "down", ms: Date.now() - startedAt };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Is this value one of the templates' examples?
 *
 * The estate's environment files are copied from the templates, and the
 * templates carry example values. A service configured with one of them
 * is not configured at all, and probing it produces a DNS failure that
 * reads like a broken service.
 */
export function isTemplateValue(value: string | null | undefined): boolean {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return false;
  const lowered = trimmed.toLowerCase();
  return lowered.startsWith("your-") || lowered.includes("your-instance") || lowered.includes("your-upstash");
}
