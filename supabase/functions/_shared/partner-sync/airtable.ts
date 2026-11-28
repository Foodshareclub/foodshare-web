import { getSecret } from "../vault.ts";

/**
 * Read-only Airtable client for one partner base.
 *
 * The base id, table id and token come from the Vault at run time; none of
 * them appears in code, logs or errors. Every request is a GET to
 * api.airtable.com under that one base and table, and nothing else.
 *
 * Airtable Free allows 1,000 API calls per workspace per month. Every HTTP
 * attempt below counts against that allowance, including a retry after a 429,
 * so the caller passes a hard per-run call budget rather than only a page
 * limit. A run that cannot finish inside its budget fails before writing
 * anything; the next scheduled run starts with a fresh allowance.
 */
export interface AirtableConfig {
  token: string;
  baseId: string;
  tableId: string;
}

export interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface FetchRecordsOptions {
  /** Total HTTP attempts allowed for this run, retries included. */
  maxCalls?: number;
}

export interface FetchRecordsResult {
  records: AirtableRecord[];
  /** Every request made, including retries. This is what Airtable counts. */
  apiCalls: number;
}

export class AirtableError extends Error {
  status: number;
  retryAfterSeconds?: number;
  upstreamType?: string;
  apiCalls?: number;

  constructor(
    message: string,
    status: number,
    details: {
      retryAfterSeconds?: number;
      upstreamType?: string;
      apiCalls?: number;
    } = {},
  ) {
    super(message);
    this.name = "AirtableError";
    this.status = status;
    this.retryAfterSeconds = details.retryAfterSeconds;
    this.upstreamType = details.upstreamType;
    this.apiCalls = details.apiCalls;
  }
}

export class AirtableCallBudgetExceeded extends AirtableError {
  maxCalls: number;

  constructor(apiCalls: number, maxCalls: number) {
    super(`Airtable pagination exceeded the ${maxCalls}-call run budget`, 0, { apiCalls });
    this.name = "AirtableCallBudgetExceeded";
    this.maxCalls = maxCalls;
  }
}

const HOST = "api.airtable.com";
const MAX_PAGES = 100;
const MAX_ATTEMPTS = 3;
const PAGE_INTERVAL_MS = 220;
// Airtable's rate-limit Retry-After is commonly 30 seconds. Waiting longer
// than this holds a cron request open for no benefit; the next run is the
// better retry, and the caller reports the upstream status in the meantime.
const MAX_INLINE_RETRY_MS = 30_000;

export async function loadAirtableConfig(): Promise<AirtableConfig> {
  const [token, baseId, tableId] = await Promise.all([
    getSecret("AIRTABLE_API_TOKEN"),
    getSecret("AIRTABLE_LACF_BASE_ID"),
    getSecret("AIRTABLE_LACF_TABLE_ID"),
  ]);
  if (!token || !baseId || !tableId) {
    throw new Error("The partner Airtable is not configured");
  }
  return { token, baseId, tableId };
}

export function recordsUrl(config: AirtableConfig, offset?: string): URL {
  const url = new URL(`https://${HOST}/v0/${config.baseId}/${config.tableId}`);
  url.searchParams.set("pageSize", "100");
  if (offset) url.searchParams.set("offset", offset);
  return url;
}

/** Throws unless the URL is the configured base and table on Airtable. */
export function assertAllowedUrl(url: URL, config: AirtableConfig): void {
  if (url.protocol !== "https:" || url.hostname !== HOST) {
    throw new Error("Refusing a request outside the allowed host");
  }
  const prefix = `/v0/${config.baseId}/${config.tableId}`;
  if (!url.pathname.startsWith(prefix)) {
    throw new Error("Refusing a request outside the configured base");
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function retryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number.parseFloat(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return undefined;
}

function backoffMs(attempt: number): number {
  return Math.min(250 * 2 ** (attempt - 1), 2_000);
}

/** Airtable's error type says what the status alone cannot (quota vs permission). */
async function upstreamErrorType(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { error?: { type?: unknown } };
    return typeof body.error?.type === "string" ? body.error.type : undefined;
  } catch {
    return undefined;
  }
}

async function getWithRetry(
  url: URL,
  config: AirtableConfig,
  fetchImpl: FetchLike,
  maxCalls: number,
): Promise<{ response: Response; calls: number }> {
  let calls = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (calls >= maxCalls) throw new AirtableCallBudgetExceeded(calls, maxCalls);
    calls += 1;

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${config.token}` },
      });
    } catch {
      if (attempt < MAX_ATTEMPTS && calls < maxCalls) {
        await sleep(backoffMs(attempt));
        continue;
      }
      throw new AirtableError("Airtable request failed", 0, { apiCalls: calls });
    }

    if (response.status === 429) {
      const waitMs = retryAfterMs(response.headers.get("retry-after"));
      // Retry only when the wait is short and the run still has a call left.
      // A monthly quota 429 usually asks for a much longer wait; retrying it
      // inline would spend the allowance without changing the answer.
      if (attempt < MAX_ATTEMPTS && calls < maxCalls && (waitMs ?? 0) <= MAX_INLINE_RETRY_MS) {
        await sleep(waitMs ?? backoffMs(attempt));
        continue;
      }
      throw new AirtableError("Airtable rate limit", 429, {
        retryAfterSeconds: waitMs === undefined ? undefined : Math.ceil(waitMs / 1000),
        upstreamType: await upstreamErrorType(response),
        apiCalls: calls,
      });
    }

    if (response.status === 403) {
      // A 403 is a permission or plan/quota answer. Retrying it cannot help.
      throw new AirtableError(
        "Airtable refused the read (HTTP 403); check the token, base access, or the workspace API quota",
        403,
        {
          upstreamType: await upstreamErrorType(response),
          apiCalls: calls,
        },
      );
    }

    if (response.status >= 500 && attempt < MAX_ATTEMPTS && calls < maxCalls) {
      await sleep(backoffMs(attempt));
      continue;
    }

    if (!response.ok) {
      throw new AirtableError(`Airtable returned HTTP ${response.status}`, response.status, {
        upstreamType: await upstreamErrorType(response),
        apiCalls: calls,
      });
    }

    return { response, calls };
  }

  throw new AirtableError("Airtable request failed", 0, { apiCalls: calls });
}

/**
 * Pages through every record within a hard call budget. No parameter can
 * change the method or target.
 *
 * The budget covers retries as well as pages. If a retry or an extra page
 * would exceed it, the client throws instead of making the call: a partial
 * record set is never returned, so the caller cannot apply half a sync.
 */
export async function fetchRecordsWithUsage(
  config: AirtableConfig,
  fetchImpl: FetchLike = fetch,
  options: FetchRecordsOptions = {},
): Promise<FetchRecordsResult> {
  const maxCalls = options.maxCalls ?? MAX_PAGES;
  if (!Number.isInteger(maxCalls) || maxCalls < 1) {
    throw new Error("maxCalls must be a positive integer");
  }

  const records: AirtableRecord[] = [];
  let offset: string | undefined;
  let pages = 0;
  let apiCalls = 0;

  do {
    if (apiCalls >= maxCalls) throw new AirtableCallBudgetExceeded(apiCalls, maxCalls);

    const url = recordsUrl(config, offset);
    assertAllowedUrl(url, config);

    let result: { response: Response; calls: number };
    try {
      result = await getWithRetry(url, config, fetchImpl, maxCalls - apiCalls);
    } catch (error) {
      // Report total calls, not just this page's attempts.
      if (error instanceof AirtableError) {
        error.apiCalls = apiCalls + (error.apiCalls ?? 0);
      }
      throw error;
    }
    apiCalls += result.calls;

    const body = (await result.response.json()) as { records?: unknown; offset?: unknown };
    if (!Array.isArray(body.records)) {
      throw new Error("Unexpected Airtable response");
    }
    for (const item of body.records) {
      const record = item as { id?: unknown; fields?: unknown };
      if (typeof record.id !== "string") throw new Error("Unexpected Airtable record");
      records.push({
        id: record.id,
        fields: (record.fields ?? {}) as Record<string, unknown>,
      });
    }

    offset = typeof body.offset === "string" && body.offset ? body.offset : undefined;
    pages += 1;
    if (pages > MAX_PAGES) throw new Error("Airtable pagination did not end");
    if (offset) {
      if (apiCalls >= maxCalls) throw new AirtableCallBudgetExceeded(apiCalls, maxCalls);
      await sleep(PAGE_INTERVAL_MS);
    }
  } while (offset);

  return { records, apiCalls };
}

/** Backwards-compatible wrapper for callers that do not need the call count. */
export async function fetchRecords(
  config: AirtableConfig,
  fetchImpl: FetchLike = fetch,
): Promise<AirtableRecord[]> {
  return (await fetchRecordsWithUsage(config, fetchImpl)).records;
}
