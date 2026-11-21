import { beforeEach, describe, expect, it } from "bun:test";
import { REDIS_PROBE_CACHE_MS, probeRedisHealth, resetRedisProbeCache } from "@/lib/health/redis-probe";
import { UpstashBreaker } from "@/lib/upstash/access";

/**
 * The Redis line of /api/health (task 23.1): "degraded" instead of "down"
 * when the app is on its local fallbacks, and no Upstash command per call.
 */

const URL_ = "https://redis.example.upstash.io";

function fetchStub(answer: () => Response | Promise<Response>) {
  const stub = {
    calls: 0,
    fetch: (async () => {
      stub.calls++;
      return answer();
    }) as unknown as typeof fetch,
  };
  return stub;
}

describe("probeRedisHealth", () => {
  beforeEach(() => resetRedisProbeCache());

  it("reports degraded without calling Upstash while the breaker is open", async () => {
    const breaker = new UpstashBreaker({ log: () => {} });
    breaker.recordFailure(new Error("ERR max requests limit exceeded"));
    const stub = fetchStub(() => new Response('{"result":"PONG"}'));
    const result = await probeRedisHealth(URL_, "token", { breaker, fetchImpl: stub.fetch });
    expect(result.state).toBe("degraded");
    expect(stub.calls).toBe(0);
  });

  it("pings once and reuses the answer for the cache window", async () => {
    let t = 0;
    const breaker = new UpstashBreaker({ log: () => {}, now: () => t });
    const stub = fetchStub(() => new Response('{"result":"PONG"}'));
    const deps = { breaker, fetchImpl: stub.fetch, now: () => t };

    expect((await probeRedisHealth(URL_, "token", deps)).state).toBe("up");
    t += REDIS_PROBE_CACHE_MS - 1;
    const again = await probeRedisHealth(URL_, "token", deps);
    expect(again).toMatchObject({ state: "up", cached: true });
    expect(stub.calls).toBe(1);

    t += 1;
    await probeRedisHealth(URL_, "token", deps);
    expect(stub.calls).toBe(2);
  });

  it("a quota answer opens the shared breaker and reads as degraded, not down", async () => {
    const breaker = new UpstashBreaker({ log: () => {} });
    const stub = fetchStub(
      () => new Response(JSON.stringify({ error: "ERR max requests limit exceeded. Limit: 500000" }), { status: 400 }),
    );
    const result = await probeRedisHealth(URL_, "token", { breaker, fetchImpl: stub.fetch });
    expect(result.state).toBe("degraded");
    expect(breaker.state).toBe("open");
    expect(breaker.lastReason).toBe("quota");
  });

  it("a network failure reads as degraded", async () => {
    const breaker = new UpstashBreaker({ log: () => {} });
    const stub = fetchStub(() => {
      throw new Error("ECONNREFUSED");
    });
    const result = await probeRedisHealth(URL_, "token", { breaker, fetchImpl: stub.fetch });
    expect(result.state).toBe("degraded");
  });
});
