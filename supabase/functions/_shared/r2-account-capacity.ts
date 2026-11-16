/** Account-wide R2 admission control, shared by Bun backups and Edge image writes. */
import { AWSV4Signer } from "./aws-signer.ts";

export const ACCOUNT_UPLOAD_LIMIT_BYTES = 9_000_000_000;
export const QUOTA_LOCK_KEY = "backups/foodshare-control/upload-lock.json";
export const QUOTA_LOCK_BUCKET = "supabase-backups";
export const RECOVERY_CAPACITY_PREFIX = "backups/foodshare-recovery/";
const OBJECT_OVERHEAD_BYTES = 16_384;

export interface AccountCapacityConfig {
  endpoint: string;
  accountId?: string;
  accountReadToken?: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  lockBucket?: string;
  recoveryMaxBytes?: number;
}
export interface CapacitySnapshot {
  accountBytes: number;
  recoveryBytes: number;
  incomingBytes: number;
  accountLimitBytes: number;
  buckets: number;
}

function field(xml: string, name: string): string {
  const value = xml.match(new RegExp("<" + name + ">([^<]*)</" + name + ">"))?.[1];
  if (value === undefined) throw new Error("Incomplete R2 capacity document");
  return value.replace(/&([^;]+);/g, (_whole, entity: string) => {
    const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
    if (entity in named) return named[entity];
    if (/^#\d+$/.test(entity)) return String.fromCodePoint(Number(entity.slice(1)));
    if (/^#x[0-9a-f]+$/i.test(entity)) return String.fromCodePoint(parseInt(entity.slice(2), 16));
    throw new Error("Invalid R2 XML entity");
  });
}
function rootDocument(xml: string, name: string) {
  if (
    !new RegExp("<" + name + "(?:\\s[^>]*)?>").test(xml) ||
    !xml.includes("</" + name + ">") || xml.length > 2_000_000
  ) throw new Error("Invalid R2 capacity document");
}
export function bucketNames(xml: string): string[] {
  rootDocument(xml, "ListAllMyBucketsResult");
  if (
    /<(?:NextContinuationToken|ContinuationToken)>[^<]+</.test(xml) ||
    /<IsTruncated>\s*true\s*</.test(xml)
  ) {
    throw new Error("Incomplete account bucket listing");
  }
  const body = xml.match(/<Buckets(?:\s[^>]*)?>([\s\S]*?)<\/Buckets>/)?.[1];
  if (body === undefined) throw new Error("Missing account bucket listing");
  const rows = [...body.matchAll(/<Bucket>([\s\S]*?)<\/Bucket>/g)];
  if (body.replace(/<Bucket>[\s\S]*?<\/Bucket>/g, "").trim()) {
    throw new Error("Invalid bucket listing");
  }
  const names = rows.map((row) => field(row[1], "Name"));
  if (
    !names.length || names.length > 1000 || new Set(names).size !== names.length ||
    names.some((name) => !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(name))
  ) throw new Error("Invalid account bucket enumeration");
  return names;
}

export function withR2AccountCapacity<T>(
  config: AccountCapacityConfig,
  incomingBytes: number,
  run: (snapshot: CapacitySnapshot) => Promise<T>,
  send: (input: string | URL, init?: RequestInit) => Promise<Response> = fetch,
): Promise<T> {
  return accountCapacity(config, incomingBytes, run, send, false);
}

/** Read-only observation: never creates, releases, or expires a writer's lock. */
export function inspectR2AccountCapacity(
  config: AccountCapacityConfig,
  send: (input: string | URL, init?: RequestInit) => Promise<Response> = fetch,
): Promise<CapacitySnapshot> {
  return accountCapacity(config, 0, async (snapshot) => snapshot, send, true);
}

async function accountCapacity<T>(
  config: AccountCapacityConfig,
  incomingBytes: number,
  run: (snapshot: CapacitySnapshot) => Promise<T>,
  send: (input: string | URL, init?: RequestInit) => Promise<Response>,
  inspectionOnly: boolean,
): Promise<T> {
  if (
    !Number.isSafeInteger(incomingBytes) || incomingBytes < 0 ||
    (config.recoveryMaxBytes !== undefined &&
      (!Number.isSafeInteger(config.recoveryMaxBytes) || incomingBytes > config.recoveryMaxBytes))
  ) throw new Error("Incoming object exceeds its capacity budget");
  const lockBucket = config.lockBucket ?? QUOTA_LOCK_BUCKET;
  if (
    ![lockBucket, config.bucketName].every((name) =>
      /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(name)
    )
  ) {
    throw new Error("Invalid capacity bucket configuration");
  }
  const cloudflareEndpoint = new URL(config.endpoint).hostname.endsWith(
    ".r2.cloudflarestorage.com",
  );
  if (
    cloudflareEndpoint &&
    (!config.accountReadToken || !config.accountId || !/^[a-f0-9]{32}$/.test(config.accountId))
  ) {
    throw new Error("Complete account inventory credentials are required before R2 writes");
  }
  const defaultEndpoint = cloudflareEndpoint
    ? "https://" + config.accountId + ".r2.cloudflarestorage.com"
    : config.endpoint;
  const destinationJurisdiction = cloudflareEndpoint
    ? ["default", "eu", "us"].find((region) =>
      new URL(config.endpoint).hostname ===
        config.accountId + (region === "default" ? "" : "." + region) + ".r2.cloudflarestorage.com"
    )
    : "default";
  if (!destinationJurisdiction) {
    throw new Error("Destination jurisdiction is outside the verified capacity scope");
  }
  const signer = new AWSV4Signer("auto", "s3", config.accessKeyId, config.secretAccessKey);
  async function request(
    method: string,
    path: string,
    query = "",
    body = "",
    headers: Record<string, string> = {},
    endpoint = defaultEndpoint,
  ) {
    const url = new URL(endpoint);
    if (url.pathname !== "/" && url.pathname !== "") {
      throw new Error("Account endpoint must not contain a bucket");
    }
    url.pathname = path;
    url.search = query;
    url.searchParams.sort();
    const signed = await signer.signRequest(method, url.href, headers, body);
    try {
      return await send(url, {
        method,
        headers: signed,
        body: method === "GET" ? undefined : body,
        signal: AbortSignal.timeout(25_000),
        redirect: "error",
      });
    } catch {
      throw new Error("R2 capacity request failed; credentials withheld");
    }
  }
  async function xmlResponse(response: Response) {
    if (!response.ok) {
      throw new Error(
        "R2 capacity enumeration denied or unavailable (HTTP " + response.status + ")",
      );
    }
    const xml = await response.text();
    if (xml.length > 2_000_000) {
      throw new Error("Capacity response exceeded its enumeration budget");
    }
    return xml;
  }
  async function accountBuckets(): Promise<
    { name: string; jurisdiction: string; endpoint: string }[]
  > {
    if (!config.accountReadToken) {
      return bucketNames(await xmlResponse(await request("GET", "/", "max-buckets=1000")))
        .map((name) => ({ name, jurisdiction: "default", endpoint: defaultEndpoint }));
    }
    if (!config.accountId || !/^[a-f0-9]{32}$/.test(config.accountId)) {
      throw new Error("Account identity is required for capacity enumeration");
    }
    const buckets: { name: string; jurisdiction: string; endpoint: string }[] = [];
    // Commercial jurisdictions. Other destinations are explicitly refused.
    // Inaccessible Gov/FedRAMP scopes are not asserted empty.
    for (const jurisdiction of ["default", "eu", "us"]) {
      const names = new Set<string>();
      const cursors = new Set<string>();
      let cursor = "";
      let expectedCount: number | undefined;
      do {
        const url = new URL(
          "https://api.cloudflare.com/client/v4/accounts/" + config.accountId + "/r2/buckets",
        );
        url.searchParams.set("per_page", "1000");
        if (cursor) url.searchParams.set("cursor", cursor);
        const response = await send(url, {
          headers: {
            Authorization: "Bearer " + config.accountReadToken,
            "cf-r2-jurisdiction": jurisdiction,
          },
          signal: AbortSignal.timeout(25_000),
          redirect: "error",
        });
        if (!response.ok) throw new Error("Account bucket enumeration unavailable");
        const body = await response.json();
        if (body?.success !== true || !Array.isArray(body.result?.buckets)) {
          throw new Error("Incomplete account bucket enumeration");
        }
        const total = body.result_info?.total_count;
        if (total !== undefined) {
          if (
            !Number.isSafeInteger(total) || total < 0 ||
            (expectedCount !== undefined && expectedCount !== total)
          ) {
            throw new Error("Account inventory changed during enumeration");
          }
          expectedCount = total;
        }
        for (const bucket of body.result.buckets) {
          if (
            typeof bucket?.name !== "string" ||
            !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket.name) ||
            names.has(bucket.name)
          ) throw new Error("Invalid account bucket enumeration");
          names.add(bucket.name);
          buckets.push({
            name: bucket.name,
            jurisdiction,
            endpoint: jurisdiction === "default"
              ? defaultEndpoint
              : "https://" + config.accountId + "." + jurisdiction + ".r2.cloudflarestorage.com",
          });
        }
        if (buckets.length > 1000) {
          throw new Error("Account bucket enumeration exceeded its budget");
        }
        cursor = body.result_info?.cursor ?? "";
        if (typeof cursor !== "string" || (cursor && cursors.has(cursor))) {
          throw new Error("Invalid account bucket pagination");
        }
        if (cursor) cursors.add(cursor);
      } while (cursor);
      if (expectedCount !== undefined && names.size !== expectedCount) {
        throw new Error("Incomplete account bucket enumeration");
      }
    }
    if (!buckets.length) throw new Error("Empty account bucket enumeration");
    return buckets;
  }
  const owner = crypto.randomUUID();
  const lockPath = "/" + lockBucket + "/" + QUOTA_LOCK_KEY;
  const lock = inspectionOnly ? await request("GET", lockPath) : await request(
    "PUT",
    lockPath,
    "",
    JSON.stringify({ owner, createdAt: new Date().toISOString() }),
    {
      "if-none-match": "*",
      "content-type": "application/json",
    },
  );
  if (inspectionOnly ? lock.status !== 404 : !lock.ok) {
    throw new Error("R2 upload lock unavailable; another writer or unresolved upload may exist");
  }
  async function releaseLock() {
    if (inspectionOnly) return;
    const heldResponse = await request("GET", lockPath);
    if (!heldResponse.ok) throw new Error("R2 upload lock ownership unavailable; preserving lock");
    const held = await heldResponse.json() as { owner?: string };
    if (held.owner !== owner) throw new Error("R2 upload lock ownership changed; preserving lock");
    if (!(await request("DELETE", lockPath)).ok) throw new Error("R2 upload lock release failed");
  }
  let operationStarted = false;
  try {
    const names = await accountBuckets();
    if (
      !names.some((item) =>
        item.name === config.bucketName && item.jurisdiction === destinationJurisdiction
      ) ||
      !names.some((item) => item.name === lockBucket && item.jurisdiction === "default")
    ) {
      throw new Error("Destination or lock bucket absent from account enumeration");
    }
    let accountBytes = 0;
    let recoveryBytes = 0;
    let count = 0;
    for (const descriptor of names) {
      const bucket = descriptor.name;
      const pending = await xmlResponse(
        await request("GET", "/" + bucket, "max-uploads=1&uploads=", "", {}, descriptor.endpoint),
      );
      rootDocument(pending, "ListMultipartUploadsResult");
      if (field(pending, "IsTruncated") !== "false" || /<Upload(?:\s[^>]*)?>/.test(pending)) {
        throw new Error(
          "Pending or unreadable multipart uploads prevent a safe capacity reservation",
        );
      }
      const tokens = new Set<string>();
      const keys = new Set<string>();
      let token = "";
      do {
        const query = new URLSearchParams({ "list-type": "2", "max-keys": "1000" });
        if (token) query.set("continuation-token", token);
        const page = await xmlResponse(
          await request("GET", "/" + bucket, query.toString(), "", {}, descriptor.endpoint),
        );
        rootDocument(page, "ListBucketResult");
        if (field(page, "Name") !== bucket) {
          throw new Error("Capacity listing returned another bucket");
        }
        const truncated = field(page, "IsTruncated");
        if (truncated !== "true" && truncated !== "false") {
          throw new Error("Incomplete capacity listing");
        }
        const rows = [...page.matchAll(/<Contents(?:\s[^>]*)?>([\s\S]*?)<\/Contents>/g)];
        const keyCount = field(page, "KeyCount");
        if (!/^\d+$/.test(keyCount) || Number(keyCount) !== rows.length) {
          throw new Error("Incomplete capacity object listing");
        }
        for (const row of rows) {
          const key = field(row[1], "Key");
          const sizeText = field(row[1], "Size");
          const size = Number(sizeText);
          if (
            !key || keys.has(key) || !/^\d+$/.test(sizeText) || !Number.isSafeInteger(size) ||
            size < 0
          ) {
            throw new Error("Invalid capacity object metadata");
          }
          keys.add(key);
          if (++count > 100_000) throw new Error("Capacity enumeration exceeded its object budget");
          accountBytes += size + OBJECT_OVERHEAD_BYTES;
          if (
            bucket === config.bucketName && descriptor.jurisdiction === destinationJurisdiction &&
            key.startsWith(RECOVERY_CAPACITY_PREFIX)
          ) {
            recoveryBytes += size;
          }
          if (!Number.isSafeInteger(accountBytes)) throw new Error("Capacity byte count overflow");
        }
        token = truncated === "true" ? field(page, "NextContinuationToken") : "";
        if (truncated === "true" && (!token || tokens.has(token))) {
          throw new Error("Invalid capacity pagination");
        }
        if (token) tokens.add(token);
      } while (token);
    }
    if (
      !inspectionOnly &&
      accountBytes + incomingBytes + OBJECT_OVERHEAD_BYTES >= ACCOUNT_UPLOAD_LIMIT_BYTES
    ) {
      throw new Error("R2 account capacity reservation refused before upload");
    }
    if (
      config.recoveryMaxBytes !== undefined &&
      recoveryBytes + incomingBytes > config.recoveryMaxBytes
    ) {
      throw new Error("R2 recovery capacity reservation refused before upload");
    }
    operationStarted = true;
    const result = await run({
      accountBytes,
      recoveryBytes,
      incomingBytes,
      accountLimitBytes: ACCOUNT_UPLOAD_LIMIT_BYTES,
      buckets: names.length,
    });
    await releaseLock();
    return result;
  } catch (error) {
    // Admission failures have not written data. Once the operation starts,
    // retain the lock on any error: a timed-out write may still be committing.
    if (!operationStarted) {
      try {
        await releaseLock();
      } catch (cleanup) {
        throw new AggregateError(
          [error, cleanup],
          "R2 admission failed and its lock could not be released",
        );
      }
    }
    throw error;
  }
}
