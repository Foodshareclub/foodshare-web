/**
 * Upstash monthly request budget check (used by scripts/upstash-budget-guard.ts).
 *
 * Reads the Upstash Developer API with HTTP basic auth (account email + API
 * key): `GET /v2/redis/databases` to find the database by name when no id is
 * given, then `GET /v2/redis/stats/{id}` for `total_monthly_requests`. The
 * credentials are only ever placed in the Authorization header; nothing here
 * logs them.
 */

export const UPSTASH_API_BASE = "https://api.upstash.com/v2";
export const DEFAULT_DATABASE_NAME = "foodshare-production-rate-limit";
/** Free-tier monthly request allowance. */
export const DEFAULT_MONTHLY_LIMIT = 500_000;
export const DEFAULT_WARN_PERCENT = 70;

export interface BudgetConfig {
  email: string;
  apiKey: string;
  databaseId?: string;
  databaseName?: string;
  monthlyLimit?: number;
  warnPercent?: number;
}

export interface BudgetReport {
  databaseId: string;
  used: number;
  limit: number;
  percent: number;
  warnPercent: number;
  level: "ok" | "warn";
}

export function evaluateBudget(used: number, limit: number, warnPercent: number): Omit<BudgetReport, "databaseId"> {
  const percent = limit > 0 ? Math.round((used / limit) * 1000) / 10 : 0;
  return { used, limit, percent, warnPercent, level: percent > warnPercent ? "warn" : "ok" };
}

class UpstashApiError extends Error {}

async function getJson(fetchImpl: typeof fetch, path: string, auth: string): Promise<unknown> {
  const response = await fetchImpl(`${UPSTASH_API_BASE}${path}`, {
    headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    // Status only: the body could echo request details.
    throw new UpstashApiError(`Upstash API ${path.split("/").slice(0, 3).join("/")} answered HTTP ${response.status}`);
  }
  return response.json();
}

export async function checkUpstashBudget(config: BudgetConfig, fetchImpl: typeof fetch = fetch): Promise<BudgetReport> {
  const auth = btoa(`${config.email}:${config.apiKey}`);
  let databaseId = config.databaseId;
  if (!databaseId) {
    const name = config.databaseName || DEFAULT_DATABASE_NAME;
    const databases = (await getJson(fetchImpl, "/redis/databases", auth)) as Array<{
      database_id?: string;
      database_name?: string;
    }>;
    databaseId = Array.isArray(databases) ? databases.find((db) => db.database_name === name)?.database_id : undefined;
    if (!databaseId) throw new UpstashApiError(`No Upstash Redis database named "${name}" on this account`);
  }
  const stats = (await getJson(fetchImpl, `/redis/stats/${encodeURIComponent(databaseId)}`, auth)) as {
    total_monthly_requests?: unknown;
  };
  const used = Number(stats.total_monthly_requests);
  if (!Number.isFinite(used)) throw new UpstashApiError("Upstash stats had no total_monthly_requests");
  return {
    databaseId,
    ...evaluateBudget(used, config.monthlyLimit ?? DEFAULT_MONTHLY_LIMIT, config.warnPercent ?? DEFAULT_WARN_PERCENT),
  };
}
