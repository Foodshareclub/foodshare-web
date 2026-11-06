/**
 * Service-to-service authentication.
 *
 * Two credentials are accepted, and nothing else:
 *   * `CRON_SECRET`, as `X-Cron-Secret: <secret>` or `Authorization: Bearer <secret>`
 *   * `SUPABASE_SERVICE_ROLE_KEY`, as `Authorization: Bearer <key>`
 *
 * The previous implementation also trusted `X-Supabase-Cron: true`. That header
 * is just a string the caller writes; it is not a credential, and it made every
 * service-only route (queue processing, provider status, storage maintenance)
 * public. There is no platform contract that sets it, so it is gone.
 *
 * Comparisons are constant time. An unset secret is never treated as a match,
 * so a deployment that forgets to configure `CRON_SECRET` fails closed rather
 * than accepting an empty header.
 */

import { timingSafeEqual } from "./utils.ts";
import { ForbiddenError } from "./errors.ts";

function readSecret(name: string): string | null {
  const value = Deno.env.get(name)?.trim();
  return value ? value : null;
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

/**
 * Returns true only when the request carries a valid service credential.
 */
export function verifyServiceAuth(request: Request): boolean {
  const cronSecret = readSecret("CRON_SECRET");
  const serviceRoleKey = readSecret("SUPABASE_SERVICE_ROLE_KEY");

  const presentedCron = request.headers.get("x-cron-secret")?.trim() ?? null;
  if (cronSecret && presentedCron && timingSafeEqual(presentedCron, cronSecret)) {
    return true;
  }

  const token = bearerToken(request);
  if (!token) return false;

  if (cronSecret && timingSafeEqual(token, cronSecret)) return true;
  if (serviceRoleKey && timingSafeEqual(token, serviceRoleKey)) return true;

  return false;
}

/**
 * Throws a 403 unless the request carries a valid service credential.
 */
export function requireServiceAuth(request: Request): void {
  if (!verifyServiceAuth(request)) {
    throw new ForbiddenError("Service or cron authentication required");
  }
}
