import { assertEquals, assertRejects } from "./test-utils.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchNearbyProducts } from "../api-v1-products/lib/nearby-products.ts";
import { listQuerySchema } from "../api-v1-products/lib/schemas.ts";

function mockDatabase(size = 240, failHydration = false) {
  const calls: Record<string, unknown>[] = [];
  const products = Array.from({ length: size }, (_, i) => ({
    id: size - i,
    distance_meters: Math.floor(i / 3),
    post_name: `Product ${i}`,
    category_id: i % 2 + 1,
    profile_id: i % 2 ? "owner-a" : "owner-b",
    latitude: 0,
    longitude: 0,
    is_active: true,
    is_arranged: false,
  }));
  const client = {
    rpc(name: string, params: Record<string, number | null>) {
      assertEquals(name, "get_nearby_posts");
      assertEquals(
        Object.keys(params).sort(),
        [
          "user_lat",
          "user_lng",
          "radius_meters",
          "post_type_filter",
          "cursor_distance",
          "cursor_id",
          "page_limit",
        ].sort(),
      );
      calls.push(params);
      const after = products.filter((row) =>
        params.cursor_distance === null ||
        row.distance_meters > params.cursor_distance ||
        (row.distance_meters === params.cursor_distance && row.id < params.cursor_id!)
      );
      return Promise.resolve({ data: after.slice(0, params.page_limit!), error: null });
    },
    from(table: string) {
      assertEquals(table, "posts_with_location");
      let selected = products;
      const builder = {
        select() {
          return builder;
        },
        in(_column: string, ids: number[]) {
          selected = selected.filter((row) => ids.includes(row.id));
          return builder;
        },
        eq(column: string, value: unknown) {
          selected = selected.filter((row) => row[column as keyof typeof row] === value);
          return builder;
        },
        // oxlint-disable-next-line unicorn/no-thenable
        then(resolve: (result: unknown) => unknown) {
          // Deliberately scramble hydration order: the RPC's distance/id order must win.
          return Promise.resolve({
            data: [...selected].reverse(),
            error: failHydration ? new Error("offline") : null,
          }).then(resolve);
        },
      };
      return builder;
    },
  } as unknown as SupabaseClient;
  return { client, calls, products };
}

Deno.test("nearby uses canonical RPC and preserves full product fields in distance order", async () => {
  const db = mockDatabase();
  const rows = await fetchNearbyProducts(db.client, {
    lat: 0,
    lng: 0,
    radiusKm: 25,
    limit: 20,
    offset: 0,
    postType: "food",
  });
  assertEquals(rows.map((r) => r.id), db.products.slice(0, 21).map((r) => r.id));
  assertEquals(rows[0].category_id, 1);
  assertEquals(rows[0].latitude, 0);
  assertEquals(db.calls[0].radius_meters, 25000);
  assertEquals(db.calls[0].post_type_filter, "food");
});

Deno.test("nearby offset passes 100-row RPC boundary without duplicates", async () => {
  const db = mockDatabase();
  const rows = await fetchNearbyProducts(db.client, {
    lat: 0,
    lng: 0,
    radiusKm: 25,
    limit: 20,
    offset: 120,
  });
  assertEquals(rows.map((r) => r.id), db.products.slice(120, 141).map((r) => r.id));
  assertEquals(db.calls.length, 2);
});

Deno.test("nearby filters before applying offset and lookahead", async () => {
  const db = mockDatabase();
  const rows = await fetchNearbyProducts(db.client, {
    lat: 0,
    lng: 0,
    radiusKm: 25,
    limit: 20,
    offset: 50,
    categoryId: 2,
    userId: "owner-a",
  });
  assertEquals(
    rows.map((r) => r.id),
    db.products.filter((r) => r.category_id === 2).slice(50, 71).map((r) => r.id),
  );
});

Deno.test("nearby 100-item page still fetches a lookahead row", async () => {
  const db = mockDatabase();
  const rows = await fetchNearbyProducts(db.client, {
    lat: 0,
    lng: 0,
    radiusKm: 25,
    limit: 100,
    offset: 0,
  });
  assertEquals(rows.length, 101);
  assertEquals(db.calls.length, 2);
});

Deno.test("nearby returns a short final page and an empty page past the end", async () => {
  const db = mockDatabase(25);
  const params = { lat: 0, lng: 0, radiusKm: 25, limit: 20, offset: 20 };
  assertEquals((await fetchNearbyProducts(db.client, params)).length, 5);
  assertEquals((await fetchNearbyProducts(db.client, { ...params, offset: 40 })).length, 0);
});

Deno.test("nearby propagates database errors instead of reporting an empty feed", async () => {
  const db = mockDatabase(25, true);
  await assertRejects(
    () => fetchNearbyProducts(db.client, { lat: 0, lng: 0, radiusKm: 25, limit: 20, offset: 0 }),
    Error,
    "offline",
  );
});

Deno.test("real product schema validates nearby coordinates and offsets", () => {
  assertEquals(listQuerySchema.safeParse({ lat: "0", lng: "0", cursor: "120" }).success, true);
  for (
    const query of [{ lat: "91", lng: "0" }, { lat: "NaN", lng: "0" }, { lat: "0" }, {
      lat: "0",
      lng: "0",
      cursor: "-1",
    }]
  ) {
    assertEquals(listQuerySchema.safeParse(query).success, false);
  }
  assertEquals(listQuerySchema.safeParse({ cursor: "opaque-global-cursor" }).success, true);
});
