import { getSecret } from "../vault.ts";

/**
 * Read-only Airtable client for one partner base.
 *
 * The base id, table id and token come from the Vault at run time; none of
 * them appears in code, logs or errors. Every request is a GET to
 * api.airtable.com under that one base and table, and nothing else.
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

const HOST = "api.airtable.com";
const MAX_PAGES = 100;
const MAX_ATTEMPTS = 3;

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

async function getWithRetry(url: URL, config: AirtableConfig, fetchImpl: FetchLike): Promise<Response> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${config.token}` },
    });
    if (response.status === 429 && attempt < MAX_ATTEMPTS) {
      const seconds = Number.parseFloat(response.headers.get("retry-after") ?? "");
      await sleep(Number.isFinite(seconds) ? Math.min(seconds * 1000, 5_000) : 1_000);
      continue;
    }
    if (!response.ok) {
      throw new Error(`Airtable returned HTTP ${response.status}`);
    }
    return response;
  }
  throw new Error("Airtable rate limit persisted");
}

/** Pages through every record. No parameter can change the method or target. */
export async function fetchRecords(
  config: AirtableConfig,
  fetchImpl: FetchLike = fetch,
): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;
  let pages = 0;
  do {
    const url = recordsUrl(config, offset);
    assertAllowedUrl(url, config);
    const response = await getWithRetry(url, config, fetchImpl);
    const body = (await response.json()) as { records?: unknown; offset?: unknown };
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
    if (offset) await sleep(220);
  } while (offset);
  return records;
}
