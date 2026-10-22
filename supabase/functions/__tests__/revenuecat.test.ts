import {
  assertEquals,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { BillingAuthenticationError, createRevenueCatApp } from "../api-v1-revenuecat/app.ts";
import {
  productionAccess,
  readProductionRecords,
  reconcile,
  type ReconciliationPorts,
} from "../api-v1-revenuecat/reconcile.ts";

const entitlements = { items: [{ id: "entl3175166552" }], next_page: null };
const active = {
  product_id: "prod9e75f4eb12",
  environment: "production",
  entitlements,
  gives_access: true,
  ends_at: null,
};

Deno.test("RevenueCat: exact production products and entitlements only", () => {
  assertEquals(productionAccess([active], [], 1000), { active: true, expiresAt: null });
  for (
    const row of [{ ...active, product_id: "unknown" }, { ...active, gives_access: false }, {
      ...active,
      entitlements: { items: [] },
    }, { ...active, ends_at: 999 }]
  ) {
    assertEquals(productionAccess([row], [], 1000).active, false);
  }
  assertThrows(() => productionAccess([{ ...active, environment: "sandbox" }], [], 1000));
  assertThrows(() => productionAccess([{ ...active, gives_access: "true" }], [], 1000));
  assertThrows(() =>
    productionAccess(
      [{ ...active, entitlements: { ...entitlements, next_page: "/more" } }],
      [],
      1000,
    )
  );
});

Deno.test("RevenueCat: preserve owned legacy access, revoke refunded access", () => {
  const legacy = {
    product_id: "prod701686c597",
    environment: "production",
    entitlements,
    status: "owned",
  };
  assertEquals(productionAccess([], [legacy], 1000).active, true);
  assertEquals(productionAccess([], [{ ...legacy, status: "refunded" }], 1000).active, false);
  assertEquals(
    productionAccess([{ ...active, ends_at: 2000 }], [], 1000).expiresAt,
    new Date(2000).toISOString(),
  );
});

Deno.test("RevenueCat: unmapped identity never queries provider or writes access", async () => {
  let calls = 0;
  await assertRejects(() =>
    reconcile("unmapped", {
      begin: async () => null,
      read: async () => {
        calls++;
        return [];
      },
      complete: async () => {
        calls++;
        return true;
      },
    })
  );
  assertEquals(calls, 0);
});

Deno.test("RevenueCat: provider failure leaves prior verified snapshot unchanged", async () => {
  let writes = 0;
  await assertRejects(() =>
    reconcile("known", {
      begin: async () => 1,
      read: async () => {
        throw new Error("upstream unavailable");
      },
      complete: async () => {
        writes++;
        return true;
      },
    })
  );
  assertEquals(writes, 0);
});

Deno.test("RevenueCat: paging is production scoped and cannot exfiltrate token", async () => {
  const requests: string[] = [];
  const mock = (async (input: RequestInfo | URL) => {
    requests.push(String(input));
    return Response.json({ items: [], next_page: "https://attacker.invalid/steal" });
  }) as typeof fetch;
  await assertRejects(() =>
    readProductionRecords("user/with/slash", "subscriptions", "test", mock)
  );
  assertEquals(requests.length, 1);
  const url = new URL(requests[0]);
  assertEquals(url.searchParams.get("environment"), "production");
  assertEquals(url.pathname.includes("user%2Fwith%2Fslash"), true);
});

Deno.test("RevenueCat: webhook authenticates before parsing and ignores forged expiry/status", async () => {
  let reads = 0;
  let result = true;
  const ports: ReconciliationPorts = {
    begin: async () => 1,
    read: async () => {
      reads++;
      return [];
    },
    complete: async (_id, _revision, snapshot) => {
      result = snapshot.active;
      return true;
    },
  };
  const authorization = `Bearer ${"a".repeat(40)}`;
  const app = createRevenueCatApp({
    webhookAuthorization: authorization,
    reconciliation: ports,
    status: async () => ({ identity_ready: false, has_access: false }),
  });
  const request = (auth: string, body: string) =>
    app.request("/api-v1-revenuecat/webhook", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body,
    });
  assertEquals((await request("wrong", "not json")).status, 401);
  assertEquals(reads, 0);
  const event = {
    id: "event",
    type: "INITIAL_PURCHASE",
    app_id: "app7e195851d0",
    environment: "PRODUCTION",
    app_user_id: "known",
    status: "active",
    expiration_at_ms: 9999999999999,
  };
  assertEquals((await request(authorization, JSON.stringify({ event }))).status, 200);
  assertEquals(result, false);
  assertEquals(reads, 2);
  assertEquals(
    (await request(authorization, JSON.stringify({ event: { ...event, environment: "SANDBOX" } })))
      .status,
    200,
  );
  assertEquals(reads, 2);
  assertEquals(
    (await request(authorization, JSON.stringify({ event: { ...event, app_id: "other" } }))).status,
    400,
  );
});

Deno.test("RevenueCat: status cannot accept a caller-supplied billing identity", async () => {
  const app = createRevenueCatApp({
    webhookAuthorization: "",
    reconciliation: {
      begin: async () => {
        throw new Error("must not reconcile");
      },
      read: async () => [],
      complete: async () => true,
    },
    status: async () => ({ identity_ready: false, has_access: false }),
  });
  assertEquals((await app.request("/api-v1-revenuecat/")).status, 401);
  const response = await app.request("/api-v1-revenuecat/?customer_id=victim", {
    headers: { Authorization: "Bearer jwt" },
  });
  assertEquals(await response.json(), { identity_ready: false, has_access: false });
});

Deno.test("RevenueCat: expired user sessions return 401 without upstream access", async () => {
  const app = createRevenueCatApp({
    webhookAuthorization: "",
    status: async () => {
      throw new BillingAuthenticationError();
    },
    reconciliation: {
      begin: async () => {
        throw new Error("must not reconcile");
      },
      read: async () => [],
      complete: async () => true,
    },
  });
  const response = await app.request("/api-v1-revenuecat/", {
    headers: { Authorization: "Bearer invalid" },
  });
  assertEquals(response.status, 401);
});

Deno.test("RevenueCat: transfers reconcile both sides from provider, never event access", async () => {
  const completed: string[] = [];
  const authorization = `Bearer ${"t".repeat(40)}`;
  const app = createRevenueCatApp({
    webhookAuthorization: async () => authorization,
    status: async () => ({ identity_ready: false, has_access: false }),
    reconciliation: {
      begin: async () => 1,
      read: async () => [],
      complete: async (id, _revision, snapshot) => {
        completed.push(id);
        assertEquals(snapshot.active, false);
        return true;
      },
    },
  });
  const response = await app.request("/api-v1-revenuecat/webhook", {
    method: "POST",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify({
      event: {
        id: "transfer",
        type: "TRANSFER",
        transferred_from: ["old"],
        transferred_to: ["new"],
      },
    }),
  });
  assertEquals(response.status, 200);
  assertEquals(completed, ["old", "new"]);
});
