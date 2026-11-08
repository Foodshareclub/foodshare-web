/**
 * Subscription state-transition validation (api-v1-subscription/webhook.ts).
 *
 * `validateStatusTransition` is advisory: the caller logs a warning on an
 * invalid transition and the authoritative gate is the atomic
 * `billing_process_webhook_atomically` RPC. The contract pinned here:
 *
 *  - the DB's literal "unknown" (no prior record) is a first-ever
 *    subscription and passes;
 *  - the validate RPC's answer is relayed (valid or not) with the
 *    status it was checked against;
 *  - an RPC ERROR is an exception. Before the fix, an error yielded
 *    `data: null`, which fell through to `isValid ?? true` and reported
 *    `{ valid: true, currentStatus: null }` — the billing state machine
 *    was reported as checked-and-fine while the database had said
 *    nothing.
 */
import { assert, assertEquals, assertRejects } from "@std/assert";

import { validateStatusTransition } from "../api-v1-subscription/webhook.ts";
import { getSupabaseClient } from "../_shared/supabase.ts";
import { resetCircuit } from "../_shared/circuit-breaker.ts";

type SC = ReturnType<typeof getSupabaseClient>;

interface RpcResult {
  data: unknown;
  error: { message: string } | null;
}

function mockSupabase(results: Record<string, RpcResult>) {
  const calls: { name: string; params: Record<string, unknown> }[] = [];
  const client = {
    rpc(name: string, params?: Record<string, unknown>) {
      calls.push({ name, params: params ?? {} });
      const r = results[name];
      return Promise.resolve({
        data: r?.data ?? null,
        error: r?.error ?? null,
      });
    },
  } as unknown as SC;
  return { calls, client };
}

const TXN = "txn-123";

Deno.test("transition: DB answer 'unknown' (no prior record) passes", async () => {
  resetCircuit("subscription-db");
  const { calls, client } = mockSupabase({
    billing_get_current_status: { data: "unknown", error: null },
  });

  const result = await validateStatusTransition(
    client,
    TXN,
    "apple",
    "active",
    "subscription_created",
  );

  assertEquals(result, { valid: true, currentStatus: "unknown" });
  // 'unknown' short-circuits: the validate RPC must not be called.
  assertEquals(calls.length, 1);
  assertEquals(calls[0].name, "billing_get_current_status");
});

Deno.test("transition: relay the validate RPC answer with the checked status", async () => {
  resetCircuit("subscription-db");
  const { calls, client } = mockSupabase({
    billing_get_current_status: { data: "active", error: null },
    billing_validate_status_transition: { data: false, error: null },
  });

  const result = await validateStatusTransition(
    client,
    TXN,
    "apple",
    "expired",
    "subscription_expired",
  );

  assertEquals(result, { valid: false, currentStatus: "active" });
  assertEquals(calls.length, 2);
  assertEquals(calls[1].name, "billing_validate_status_transition");
  assert(
    calls[1].params.p_current_status === "active",
    "validate RPC must be checked against the status that was read",
  );
});

Deno.test("transition: status-read RPC error throws instead of fabricating validity", async () => {
  resetCircuit("subscription-db");
  const { client } = mockSupabase({
    billing_get_current_status: {
      data: null,
      error: { message: "PGRST202: could not find the function" },
    },
  });

  await assertRejects(
    () =>
      validateStatusTransition(
        client,
        TXN,
        "apple",
        "active",
        "subscription_created",
      ),
    Error,
    "Failed to read current subscription status",
  );
});

Deno.test("transition: validate RPC error throws instead of defaulting to valid", async () => {
  resetCircuit("subscription-db");
  const { client } = mockSupabase({
    billing_get_current_status: { data: "active", error: null },
    billing_validate_status_transition: {
      data: null,
      error: { message: "PGRST202: could not find the function" },
    },
  });

  await assertRejects(
    () =>
      validateStatusTransition(
        client,
        TXN,
        "apple",
        "expired",
        "subscription_expired",
      ),
    Error,
    "Failed to validate status transition",
  );
});
