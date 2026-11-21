import { afterEach, describe, expect, it } from "bun:test";
import {
  BREAKER_COOL_DOWN_MS,
  UpstashBreaker,
  classifyUpstashError,
  namespacedKey,
  setUpstashAccessForTesting,
  withUpstash,
} from "@/lib/upstash/access";

/**
 * The shared Upstash breaker (task 23.1): opens at once on quota, auth and
 * timeout errors, skips Upstash for a 10-minute cool-down, lets one
 * half-open probe through, closes on success, and logs only when it opens
 * or closes.
 */

const QUOTA = new Error("ERR max requests limit exceeded. Limit: 500000, Usage: 500001");

function breakerAt(start = 1_000_000) {
  let t = start;
  const events: string[] = [];
  const breaker = new UpstashBreaker({
    now: () => t,
    log: (event, detail) => events.push(detail.reason ? `${event}:${detail.reason}` : event),
  });
  return {
    breaker,
    events,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe("classifyUpstashError", () => {
  it("recognises the production quota, auth and timeout errors", () => {
    expect(classifyUpstashError(QUOTA)).toBe("quota");
    expect(classifyUpstashError(new Error("WRONGPASS invalid or missing auth token"))).toBe("auth");
    expect(classifyUpstashError(new Error("Unauthorized (HTTP 401)"))).toBe("auth");
    const timeout = new Error("The operation timed out.");
    timeout.name = "TimeoutError";
    expect(classifyUpstashError(timeout)).toBe("timeout");
    expect(classifyUpstashError(new Error("ECONNRESET"))).toBe("other");
  });
});

describe("UpstashBreaker", () => {
  it("opens on the first quota error and skips Upstash for the cool-down", () => {
    const { breaker, events, advance } = breakerAt();
    expect(breaker.tryAcquire()).toBe(true);
    breaker.recordFailure(QUOTA);
    expect(breaker.state).toBe("open");
    expect(breaker.lastReason).toBe("quota");
    expect(breaker.tryAcquire()).toBe(false);
    advance(BREAKER_COOL_DOWN_MS - 1);
    expect(breaker.tryAcquire()).toBe(false);
    expect(events).toEqual(["open:quota"]);
  });

  it("needs five consecutive unclassified errors to open", () => {
    const { breaker } = breakerAt();
    for (let i = 0; i < 4; i++) breaker.recordFailure(new Error("ECONNRESET"));
    expect(breaker.state).toBe("closed");
    breaker.recordFailure(new Error("ECONNRESET"));
    expect(breaker.state).toBe("open");
  });

  it("lets exactly one half-open probe through after the cool-down", () => {
    const { breaker, advance } = breakerAt();
    breaker.recordFailure(QUOTA);
    advance(BREAKER_COOL_DOWN_MS);
    expect(breaker.state).toBe("half-open");
    expect(breaker.tryAcquire()).toBe(true);
    // Concurrent callers keep using the fallback while the probe is out.
    expect(breaker.tryAcquire()).toBe(false);
    expect(breaker.tryAcquire()).toBe(false);
  });

  it("re-opens silently when the probe fails, and closes (with one log line) when it succeeds", () => {
    const { breaker, events, advance } = breakerAt();
    breaker.recordFailure(QUOTA);
    // A month of exhausted quota: probe every cool-down, each one fails.
    for (let i = 0; i < 3; i++) {
      advance(BREAKER_COOL_DOWN_MS);
      expect(breaker.tryAcquire()).toBe(true);
      breaker.recordFailure(QUOTA);
      expect(breaker.state).toBe("open");
    }
    // Monthly reset: the next probe succeeds and the breaker closes.
    advance(BREAKER_COOL_DOWN_MS);
    expect(breaker.tryAcquire()).toBe(true);
    breaker.recordSuccess();
    expect(breaker.state).toBe("closed");
    expect(breaker.tryAcquire()).toBe(true);
    expect(events).toEqual(["open:quota", "close"]);
  });

  it("does not log a close when it was never open", () => {
    const { breaker, events } = breakerAt();
    breaker.recordSuccess();
    breaker.recordSuccess();
    expect(events).toEqual([]);
  });
});

describe("withUpstash", () => {
  afterEach(() => setUpstashAccessForTesting(null));

  it("returns the fallback without calling Upstash while the breaker is open", async () => {
    const { breaker } = breakerAt();
    let calls = 0;
    setUpstashAccessForTesting({ client: {}, breaker });

    const first = await withUpstash(
      async () => {
        calls++;
        throw QUOTA;
      },
      () => "source",
    );
    expect(first).toBe("source");
    expect(calls).toBe(1);
    expect(breaker.state).toBe("open");

    const second = await withUpstash(
      async () => {
        calls++;
        return "cache";
      },
      () => "source",
    );
    expect(second).toBe("source");
    expect(calls).toBe(1);
  });

  it("uses the fallback when Upstash is not configured", async () => {
    setUpstashAccessForTesting({ client: null });
    expect(
      await withUpstash(
        async () => "cache",
        () => "source",
      ),
    ).toBe("source");
  });
});

describe("namespacedKey", () => {
  it("prefixes once", () => {
    expect(namespacedKey("cache:leaderboard:top100")).toBe("fs:web:cache:leaderboard:top100");
    expect(namespacedKey(namespacedKey("x"))).toBe("fs:web:x");
  });
});
