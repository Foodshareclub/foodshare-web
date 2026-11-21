import { afterEach, describe, expect, it } from "bun:test";
import { cacheThrough, invalidateLeaderboard } from "@/lib/redis";
import { cache } from "@/lib/storage/redis";
import { getCachedHealth, incrementStat } from "@/lib/email/redis-cache";
import { UpstashBreaker, setUpstashAccessForTesting } from "@/lib/upstash/access";

/**
 * The caches go to the source while the breaker is open, and every write
 * carries a TTL and a namespaced key (task 23.1). The client is an in-test
 * recorder: no real Upstash is called.
 */

const QUOTA = new Error("ERR max requests limit exceeded. Limit: 500000, Usage: 500001");

function recorder(options: { fail?: boolean } = {}) {
  const calls: Array<{ cmd: string; args: unknown[] }> = [];
  const record =
    (cmd: string, result: unknown = null) =>
    async (...args: unknown[]) => {
      calls.push({ cmd, args });
      if (options.fail) throw QUOTA;
      return result;
    };
  const client = {
    get: record("get"),
    set: record("set", "OK"),
    setex: record("setex", "OK"),
    del: record("del", 1),
    scan: record("scan", [0, []]),
    keys: record("keys", []),
    exists: record("exists", 0),
    hincrby: record("hincrby", 1),
    expire: record("expire", 1),
  };
  return { client, calls };
}

afterEach(() => setUpstashAccessForTesting(null));

describe("cache bypass while the breaker is open", () => {
  it("cacheThrough reads the source and sends nothing to Upstash", async () => {
    const { client, calls } = recorder();
    const breaker = new UpstashBreaker({ log: () => {} });
    breaker.recordFailure(QUOTA);
    setUpstashAccessForTesting({ client, breaker });

    let sourceReads = 0;
    const value = await cacheThrough("cache:leaderboard:top100", async () => {
      sourceReads++;
      return { rows: 3 };
    });
    await invalidateLeaderboard();
    await cache.set("product:1", { id: 1 });
    await getCachedHealth();
    await incrementStat("processed");

    expect(value).toEqual({ rows: 3 });
    expect(sourceReads).toBe(1);
    expect(calls).toEqual([]);
  });

  it("a quota error on the first read opens the breaker; later calls skip Upstash", async () => {
    const { client, calls } = recorder({ fail: true });
    const breaker = new UpstashBreaker({ log: () => {} });
    setUpstashAccessForTesting({ client, breaker });

    for (let i = 0; i < 3; i++) {
      await cacheThrough("cache:leaderboard:top100", async () => "fresh");
    }
    expect(breaker.state).toBe("open");
    expect(calls.length).toBe(1);
  });
});

describe("writes while the breaker is closed", () => {
  it("every write is namespaced and expires", async () => {
    const { client, calls } = recorder();
    setUpstashAccessForTesting({ client, breaker: new UpstashBreaker({ log: () => {} }) });

    await cacheThrough("cache:leaderboard:top100", async () => "fresh", 120);
    await cache.set("product:1", { id: 1 }); // no TTL given
    await incrementStat("processed");
    // Fire-and-forget cache write in cacheThrough.
    await new Promise((resolve) => setTimeout(resolve, 0));

    const sets = calls.filter((c) => c.cmd === "set");
    expect(sets.map((c) => c.args[0])).toEqual(["fs:web:cache:leaderboard:top100", "fs:web:product:1"]);
    expect(sets.map((c) => (c.args[2] as { ex?: number }).ex)).toEqual([120, 300]);
    const hincr = calls.find((c) => c.cmd === "hincrby");
    expect(hincr?.args[0]).toBe("fs:web:email:stats:daily");
    expect(calls.some((c) => c.cmd === "expire" && c.args[0] === "fs:web:email:stats:daily")).toBe(true);
  });
});
