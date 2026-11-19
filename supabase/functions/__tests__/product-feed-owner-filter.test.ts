import { assertEquals } from "./test-utils.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { HandlerContext } from "../_shared/api-handler.ts";
import { cache } from "../_shared/cache.ts";
import { getFeed, listProducts } from "../api-v1-products/lib/handlers/get-products.ts";
import { type ListQuery, listQuerySchema } from "../api-v1-products/lib/schemas.ts";

const viewer = "00000000-0000-0000-0000-000000000001";
const otherOwner = "00000000-0000-0000-0000-000000000002";
const rows = [viewer, otherOwner].map((owner, index) => ({
  id: 100 + index,
  profile_id: owner,
  post_name: `Listing ${index}`,
  post_type: "food",
  is_active: true,
  is_arranged: false,
  latitude: 38,
  longitude: -121,
  distance_meters: 50 + index,
  created_at: "2026-10-12T00:00:00Z",
}));

function database() {
  const ownerFilters: unknown[] = [];
  const client = {
    rpc(name: string, params: Record<string, unknown>) {
      if (name === "get_user_unread_counts") {
        assertEquals(params.p_user_id, viewer);
        return Promise.resolve({ data: [{ unread_notifications: 2 }], error: null });
      }
      assertEquals(name, "get_nearby_posts");
      return Promise.resolve({ data: rows, error: null });
    },
    from(table: string) {
      assertEquals(table, "posts_with_location");
      let selected = [...rows];
      const builder = {
        select() {
          return builder;
        },
        order() {
          return builder;
        },
        limit(limit: number) {
          selected = selected.slice(0, limit);
          return builder;
        },
        in(_column: string, ids: number[]) {
          selected = selected.filter((row) => ids.includes(row.id));
          return builder;
        },
        eq(column: string, value: unknown) {
          if (column === "profile_id") ownerFilters.push(value);
          selected = selected.filter((row) => row[column as keyof typeof row] === value);
          return builder;
        },
        // oxlint-disable-next-line unicorn/no-thenable
        then(resolve: (result: unknown) => unknown) {
          return Promise.resolve({ data: selected, error: null, count: selected.length }).then(
            resolve,
          );
        },
      };
      return builder;
    },
  } as unknown as SupabaseClient;
  return { client, ownerFilters };
}

function context(client: SupabaseClient, userId: string | null, query: ListQuery) {
  return { supabase: client, userId, query, corsHeaders: {} } as HandlerContext<unknown, ListQuery>;
}

Deno.test("authenticated aggregated feed includes other owners while counts and privacy use the viewer", async () => {
  const db = database();
  const response = await getFeed(
    context(db.client, viewer, listQuerySchema.parse({ lat: "38", lng: "-121", limit: "20" })),
  );
  const payload = await response.json();
  assertEquals(payload.data.listings.map((row: { profile_id: string }) => row.profile_id), [
    viewer,
    otherOwner,
  ]);
  assertEquals(db.ownerFilters, []);
  assertEquals(payload.data.counts.notifications, 2);
  assertEquals(payload.data.listings[0].coordinates_approximate, false);
  assertEquals(payload.data.listings[1].coordinates_approximate, true);
});

for (const location of [{}, { lat: "38", lng: "-121" }]) {
  Deno.test(`public owner filter is honored independently of viewer identity ${JSON.stringify(location)}`, async () => {
    cache.clear();
    const db = database();
    const query = listQuerySchema.parse({ ...location, userId: otherOwner });
    const guest = await (await listProducts(context(db.client, null, query))).json();
    assertEquals(guest.data.map((row: { profile_id: string }) => row.profile_id), [otherOwner]);
    assertEquals(db.ownerFilters, [otherOwner]);
    assertEquals(guest.data[0].coordinates_approximate, true);
    const member = await (await listProducts(context(db.client, viewer, query))).json();
    assertEquals(member.data[0].coordinates_approximate, true);
    assertEquals(member.data[0].latitude, guest.data[0].latitude);
    const owner = await (await listProducts(context(db.client, otherOwner, query))).json();
    assertEquals(owner.data[0].coordinates_approximate, false);
    assertEquals(owner.data[0].latitude, 38);
    assertEquals(owner.data[0].longitude, -121);
    cache.clear();
  });
}
