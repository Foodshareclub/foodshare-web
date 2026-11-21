import { describe, expect, it } from "bun:test";
import { checkUpstashBudget, evaluateBudget } from "@/lib/upstash/budget";

/** The daily budget guard's arithmetic and API use (no real Upstash call). */

describe("evaluateBudget", () => {
  it("warns above the threshold", () => {
    expect(evaluateBudget(495_546, 500_000, 70)).toMatchObject({ percent: 99.1, level: "warn" });
    expect(evaluateBudget(350_000, 500_000, 70)).toMatchObject({ percent: 70, level: "ok" });
    expect(evaluateBudget(100_000, 500_000, 70).level).toBe("ok");
  });
});

describe("checkUpstashBudget", () => {
  it("finds the database by name, reads its stats, and sends credentials only as basic auth", async () => {
    const asked: Array<{ url: string; auth: string | null }> = [];
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      asked.push({ url, auth: new Headers(init?.headers).get("authorization") });
      if (url.endsWith("/redis/databases")) {
        return Response.json([
          { database_id: "other", database_name: "something-else" },
          { database_id: "db-1", database_name: "foodshare-production-rate-limit" },
        ]);
      }
      return Response.json({ total_monthly_requests: 400_000 });
    }) as typeof fetch;

    const report = await checkUpstashBudget({ email: "ops@example.com", apiKey: "k" }, fetchImpl);
    expect(report).toMatchObject({ databaseId: "db-1", used: 400_000, percent: 80, level: "warn" });
    expect(asked.map((a) => a.url)).toEqual([
      "https://api.upstash.com/v2/redis/databases",
      "https://api.upstash.com/v2/redis/stats/db-1",
    ]);
    expect(asked.every((a) => a.auth === `Basic ${btoa("ops@example.com:k")}`)).toBe(true);
    expect(asked.some((a) => a.url.includes("ops@example.com") || a.url.includes(":k"))).toBe(false);
  });

  it("reports an API error by status, without the body", async () => {
    const fetchImpl = (async () => new Response("secret-echo", { status: 401 })) as unknown as typeof fetch;
    const failure = await checkUpstashBudget({ email: "e", apiKey: "k", databaseId: "db-1" }, fetchImpl).catch(
      (error: Error) => error.message,
    );
    expect(failure).toContain("HTTP 401");
    expect(failure).not.toContain("secret-echo");
  });
});
