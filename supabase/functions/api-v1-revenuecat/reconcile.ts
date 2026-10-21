import { z } from "zod";

export const PROJECT_ID = "proj35d26f8e";
const ENTITLEMENT_ID = "entl3175166552";
const subscriptionProducts = new Set([
  "prod44a667ebba",
  "prod587865c49f",
  "prod9e75f4eb12",
  "prodcc7eca935f",
]);
const legacyProduct = "prod701686c597";
const entitlementList = z.object({
  items: z.array(z.object({ id: z.string() })),
  next_page: z.string().nullable().optional(),
});
const common = {
  product_id: z.string(),
  environment: z.literal("production"),
  entitlements: entitlementList,
};
const subscription = z.object({
  ...common,
  gives_access: z.boolean(),
  ends_at: z.number().int().nonnegative().nullable(),
});
const purchase = z.object({ ...common, status: z.string() });
export interface AccessSnapshot {
  active: boolean;
  expiresAt: string | null;
}

/** Never infer access from a webhook type or accept sandbox records. */
export function productionAccess(
  subscriptions: unknown[],
  purchases: unknown[],
  now: number,
): AccessSnapshot {
  let active = false;
  let expiry = 0;
  let indefinite = false;
  for (const value of subscriptions) {
    const row = subscription.parse(value);
    if (row.entitlements.next_page) throw new Error("Incomplete entitlement list");
    if (
      !subscriptionProducts.has(row.product_id) || !row.gives_access ||
      !row.entitlements.items.some((e) => e.id === ENTITLEMENT_ID)
    ) continue;
    if (row.ends_at !== null && row.ends_at <= now) continue;
    active = true;
    if (row.ends_at === null) indefinite = true;
    else expiry = Math.max(expiry, row.ends_at);
  }
  for (const value of purchases) {
    const row = purchase.parse(value);
    if (row.entitlements.next_page) throw new Error("Incomplete entitlement list");
    if (
      row.product_id === legacyProduct && row.status === "owned" &&
      row.entitlements.items.some((e) => e.id === ENTITLEMENT_ID)
    ) {
      active = true;
      indefinite = true;
    }
  }
  return { active, expiresAt: active && !indefinite ? new Date(expiry).toISOString() : null };
}

export interface ReconciliationPorts {
  begin(customerID: string): Promise<number | null>;
  read(customerID: string, resource: "subscriptions" | "purchases"): Promise<unknown[]>;
  complete(customerID: string, revision: number, snapshot: AccessSnapshot): Promise<boolean>;
}

export async function reconcile(customerID: string, ports: ReconciliationPorts): Promise<boolean> {
  const revision = await ports.begin(customerID);
  if (revision === null) throw new Error("Identity mapping required");
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error("Invalid revision");
  const [subscriptions, purchases] = await Promise.all([
    ports.read(customerID, "subscriptions"),
    ports.read(customerID, "purchases"),
  ]);
  const snapshot = productionAccess(subscriptions, purchases, Date.now());
  return ports.complete(customerID, revision, snapshot);
}

export async function readProductionRecords(
  customerID: string,
  resource: "subscriptions" | "purchases",
  token: string,
  fetcher: typeof fetch = fetch,
): Promise<unknown[]> {
  const path = `/v2/projects/${PROJECT_ID}/customers/${encodeURIComponent(customerID)}/${resource}`;
  let url = new URL(`https://api.revenuecat.com${path}`);
  const rows: unknown[] = [];
  const visited = new Set<string>();
  for (let page = 0; page < 10; page++) {
    url.searchParams.set("environment", "production");
    url.searchParams.set("limit", "100");
    if (visited.has(url.href)) throw new Error("Repeated RevenueCat page");
    visited.add(url.href);
    const response = await fetcher(url, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`RevenueCat HTTP ${response.status}`);
    const body = z.object({
      items: z.array(z.unknown()),
      next_page: z.string().nullable().optional(),
    })
      .parse(await response.json());
    rows.push(...body.items);
    if (!body.next_page) return rows;
    const next = new URL(body.next_page, "https://api.revenuecat.com");
    if (
      next.origin !== "https://api.revenuecat.com" || next.pathname !== path ||
      next.username || next.password
    ) throw new Error("Invalid RevenueCat pagination");
    url = next;
  }
  throw new Error("RevenueCat page limit exceeded");
}
