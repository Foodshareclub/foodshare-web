import { assertEquals, assertRejects } from "./test-utils.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listingSearchQuerySchema } from "../api-v1-products/lib/schemas.ts";
import type { HandlerContext } from "../_shared/api-handler.ts";
import {
  fetchSearchProducts,
  searchProducts,
} from "../api-v1-products/lib/handlers/search-products.ts";

const query = { mode: "search", q: "bread & milk+", lat: "38", lng: "-121", radiusKm: "12" };

Deno.test("listing search validates all scope and pagination inputs without dropping unsupported filters", () => {
  for (
    const invalid of [
      { sortBy: "expiring_soon" },
      { expiryHours: "12" },
      { radiusKm: "NaN" },
      { radiusKm: "101" },
      { lat: "91" },
      { lng: undefined },
      { offset: "-1" },
      { limit: "101" },
      { availableOnly: "true", arrangedOnly: "true" },
    ]
  ) assertEquals(listingSearchQuerySchema.safeParse({ ...query, ...invalid }).success, false);
  assertEquals(listingSearchQuerySchema.parse(query).q, "bread & milk+");
});

Deno.test("listing search passes complete filter semantics and page scope to canonical RPC", async () => {
  const filters = listingSearchQuerySchema.parse({
    ...query,
    postType: "borrow",
    categoryId: "12",
    availableOnly: "false",
    arrangedOnly: "true",
    sortBy: "popular",
    limit: "20",
    offset: "40",
  });
  const client = {
    rpc(name: string, params: Record<string, unknown>) {
      assertEquals(name, "search_food_items");
      assertEquals(params, {
        p_latitude: 38,
        p_longitude: -121,
        p_radius_km: 12,
        p_search_query: "bread & milk+",
        p_category_id: 12,
        p_post_type: "borrow",
        p_available_only: false,
        p_arranged_only: true,
        p_sort_by: "popular",
        p_limit: 20,
        p_offset: 40,
      });
      return Promise.resolve({
        data: { items: [], totalCount: 40, hasMore: false, categoryBreakdown: {} },
        error: null,
      });
    },
  } as unknown as SupabaseClient;
  const page = await fetchSearchProducts(client, filters, null);
  assertEquals(page.totalCount, 40);
});

Deno.test("listing search approximates non-owner coordinates, redacts pickup address, and preserves owner data", async () => {
  const item = {
    id: 42,
    profile_id: "owner",
    latitude: 38,
    longitude: -121,
    location: "raw-point",
    post_name: "Apples",
    post_address: "10 Private Street",
    post_stripped_address: "Sacramento",
    distance_km: 1.25,
    created_at: "2026-10-10T00:00:00Z",
    is_active: true,
    is_arranged: false,
  };
  const client = {
    rpc() {
      return Promise.resolve({
        data: { items: [item], totalCount: 1, hasMore: false, categoryBreakdown: { food: 1 } },
        error: null,
      });
    },
  } as unknown as SupabaseClient;
  const filters = listingSearchQuerySchema.parse(query);
  const guest = (await fetchSearchProducts(client, filters, null)).items[0];
  const other = (await fetchSearchProducts(client, filters, "someone-else")).items[0];
  const owner = (await fetchSearchProducts(client, filters, "owner")).items[0];
  assertEquals(guest.coordinates_approximate, true);
  assertEquals(guest.latitude === item.latitude, false);
  assertEquals(guest.longitude === item.longitude, false);
  assertEquals(guest.location, null);
  assertEquals(guest.post_address, "Sacramento");
  assertEquals(guest.distance_meters, 1250);
  assertEquals(guest.latitude, other.latitude);
  assertEquals(owner.latitude, item.latitude);
  assertEquals(owner.post_address, item.post_address);
});

Deno.test("listing search propagates transport and malformed-response failures", async () => {
  const filters = listingSearchQuerySchema.parse(query);
  for (const response of [{ data: null, error: new Error("offline") }, { data: {}, error: null }]) {
    const client = {
      rpc() {
        return Promise.resolve(response);
      },
    } as unknown as SupabaseClient;
    await assertRejects(() => fetchSearchProducts(client, filters, null));
  }
});

Deno.test("search route rejects unknown filters and returns an uncached typed envelope", async () => {
  const client = {
    rpc() {
      return Promise.resolve({
        data: { items: [], totalCount: 0, hasMore: false, categoryBreakdown: {} },
        error: null,
      });
    },
  } as unknown as SupabaseClient;
  const requestURL = new URL("https://example.com/functions/v1/api-v1-products");
  for (const [key, value] of Object.entries(query)) requestURL.searchParams.set(key, value);
  const context = {
    supabase: client,
    userId: null,
    corsHeaders: {},
    query,
    request: new Request(requestURL),
  } as unknown as HandlerContext;
  const response = await searchProducts(context);
  assertEquals(response.headers.get("Cache-Control"), "private, no-store");
  const payload = await response.json();
  assertEquals(payload.success, true);
  assertEquals(payload.data, { items: [], totalCount: 0, hasMore: false, categoryBreakdown: {} });
  requestURL.searchParams.set("expiringWithinHours", "12");
  await assertRejects(() => searchProducts({ ...context, request: new Request(requestURL) }));
});
