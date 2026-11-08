/**
 * Product nearby-filter tests
 *
 * `getProducts` with `lat`/`lng`/`radius` filters the list through the
 * `get_nearby_products` RPC. That RPC does not exist in any migration (and
 * was confirmed absent from production on 2026-11-08 — see
 * docs/rpc-signature-audit.md), but the old code bound only `data`: a
 * failed RPC resolved with `null` and the geographic filter was silently
 * dropped, so a "near me" request answered with a global list that the
 * client had no way to recognise as unfiltered. A failed nearby search
 * must fail the request, not widen it.
 */

import { assert, assertEquals, assertRejects } from "@std/assert";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ProductService } from "../api-v1-products/lib/product-service.ts";
import { setupTestEnv } from "./test-utils.ts";

interface BuilderRecord {
  inCalls: Array<[string, unknown]>;
  rows: unknown[];
}

function nearbyClient(
  nearbyResult: { data: unknown; error: unknown },
  record: BuilderRecord,
): SupabaseClient {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    in: (column: string, values: unknown) => {
      record.inCalls.push([column, values]);
      return builder;
    },
    order: () => builder,
    range: () => builder,
    // oxlint-disable-next-line unicorn/no-thenable
    then: (
      resolve: (result: {
        data: unknown[];
        error: unknown;
        count: number;
      }) => void,
    ) => {
      resolve({ data: record.rows, error: null, count: record.rows.length });
    },
  };
  return {
    from: () => builder,
    rpc: (name: string) => {
      assert(name === "get_nearby_products");
      return Promise.resolve(nearbyResult);
    },
  } as unknown as SupabaseClient;
}

Deno.test({
  name: "product nearby filter",
  fn: async (t) => {
    setupTestEnv();
    const USER_ID = "33333333-3333-4333-8333-333333333333";
    const geo = { lat: 37.33, lng: -121.89, radius: 10 };
    const rows = [{ id: 1 }, { id: 2 }];

    await t.step("a failed nearby search fails the request instead of widening it", async () => {
      const record: BuilderRecord = { inCalls: [], rows };
      const service = new ProductService(
        nearbyClient(
          // A real PostgREST error is an Error with a .code; the mock
          // matches that shape so `throw error` rejects with an Error.
          { data: null, error: Object.assign(new Error("PGRST202: function does not exist"), { code: "PGRST202" }) },
          record,
        ),
        USER_ID,
      );
      await assertRejects(
        () =>
          service.getProducts({ ...geo, limit: 10, offset: 0 }),
        Error,
        "PGRST202",
      );
    });

    await t.step("a successful nearby search narrows the list to the RPC's ids", async () => {
      const record: BuilderRecord = { inCalls: [], rows };
      const service = new ProductService(
        nearbyClient({ data: [11, 12], error: null }, record),
        USER_ID,
      );
      const result = await service.getProducts({ ...geo, limit: 10, offset: 0 });
      assertEquals(result.count, 2);
      assertEquals(record.inCalls.length, 1);
      assertEquals(record.inCalls[0][0], "id");
      assertEquals(record.inCalls[0][1], [11, 12]);
    });

    await t.step("no geo params means no nearby search", async () => {
      const record: BuilderRecord = { inCalls: [], rows };
      // rpc is the sentinel: the builder client's rpc would throw if the
      // service reached for a nearby search without geo params.
      const client = {
        ...nearbyClient({ data: null, error: null }, record),
        rpc: () => {
          throw new Error("rpc must not be called without geo params");
        },
      } as unknown as SupabaseClient;
      const service = new ProductService(client, USER_ID);
      const result = await service.getProducts({ limit: 10, offset: 0 });
      assertEquals(result.count, 2);
      assertEquals(record.inCalls.length, 0);
    });
  },
});
