/**
 * Shared Upstash Redis REST client (task 23.2).
 *
 * One client for every edge function that talks to the production Redis
 * (`api-v1-cache`, the translation cache). It adds three things to a bare
 * `fetch`:
 *
 * - a short timeout (`UPSTASH_TIMEOUT_MS`), so a slow Upstash cannot hold an
 *   edge request open;
 * - the shared circuit breaker: while Upstash is skipped no request leaves
 *   the isolate, and the caller gets an `UpstashUnavailableError` it can turn
 *   into "go to the source";
 * - failure classification, so a quota, auth or timeout failure opens the
 *   breaker while a command-level error (wrong type, bad syntax) does not.
 *
 * It never retries: a retry against an exhausted quota only spends more of it.
 * Secrets are never logged and never placed in error messages.
 */
import {
  classifyUpstashFailure,
  getUpstashBreaker,
  UPSTASH_TIMEOUT_MS,
  type UpstashBreaker,
  type UpstashFailureKind,
} from "./upstash-breaker.ts";

export const UPSTASH_REDIS_BREAKER = "upstash-redis";

export function redisBreaker(): UpstashBreaker {
  return getUpstashBreaker(UPSTASH_REDIS_BREAKER);
}

/** Upstash was skipped (breaker open) or failed in a way that opens it. */
export class UpstashUnavailableError extends Error {
  constructor(
    message: string,
    /** null when the call was skipped because the breaker was already open. */
    readonly kind: UpstashFailureKind | null,
    readonly skipped: boolean,
  ) {
    super(message);
    this.name = "UpstashUnavailableError";
  }
}

/** Upstash answered, but the command itself failed (not an availability fault). */
export class UpstashCommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpstashCommandError";
  }
}

export type RedisCommand = (string | number)[];

export interface UpstashRedisCreds {
  url: string;
  token: string;
}

async function post(
  creds: UpstashRedisCreds,
  path: string,
  body: unknown,
  timeoutMs: number,
): Promise<unknown> {
  const breaker = redisBreaker();
  if (!breaker.allow()) {
    throw new UpstashUnavailableError("Upstash skipped: circuit open", null, true);
  }
  const url = path ? creds.url.replace(/\/?$/, path) : creds.url;
  let response: Response;
  let data: unknown;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    data = await response.json().catch(() => ({}));
  } catch (error) {
    const kind = classifyUpstashFailure({ error }) ?? "unavailable";
    breaker.recordFailure(kind);
    throw new UpstashUnavailableError(`Upstash request failed (${kind})`, kind, false);
  }

  const errorText = extractError(data);
  if (!response.ok || errorText) {
    const kind = classifyUpstashFailure({
      status: response.status,
      message: errorText ?? undefined,
    });
    if (kind) {
      breaker.recordFailure(kind);
      throw new UpstashUnavailableError(`Upstash request failed (${kind})`, kind, false);
    }
    // Upstash answered: it is reachable, so a half-open probe has succeeded.
    breaker.recordSuccess();
    throw new UpstashCommandError(errorText ?? `Upstash HTTP ${response.status}`);
  }
  breaker.recordSuccess();
  return data;
}

function extractError(data: unknown): string | null {
  if (Array.isArray(data)) {
    for (const item of data) {
      const message = extractError(item);
      if (message) return message;
    }
    return null;
  }
  if (data && typeof data === "object" && "error" in data) {
    const value = (data as { error?: unknown }).error;
    if (typeof value === "string" && value) return value;
  }
  return null;
}

/** Run one command and return its `result`. */
export async function upstashCommand(
  creds: UpstashRedisCreds,
  command: RedisCommand,
  timeoutMs: number = UPSTASH_TIMEOUT_MS,
): Promise<unknown> {
  const data = await post(creds, "", command, timeoutMs) as { result?: unknown };
  return data.result;
}

/** Run commands in one `/pipeline` request and return each `result`. */
export async function upstashPipeline(
  creds: UpstashRedisCreds,
  commands: RedisCommand[],
  timeoutMs: number = UPSTASH_TIMEOUT_MS,
): Promise<unknown[]> {
  if (commands.length === 0) return [];
  const data = await post(creds, "/pipeline", commands, timeoutMs) as Array<{ result?: unknown }>;
  return data.map((item) => item.result);
}
