import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createClient } from "@supabase/supabase-js";

const requests: URL[] = [];
let responseRows: Array<{ id: number; post_name: string }> = [];
let nearbyRows: Array<{ id: number; post_name: string; distance_meters: number }> = [];
const rpcRequests: Array<Record<string, number | string | null>> = [];
const client = createClient("https://database.example.test", "public-anon-key", {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: {
    fetch: async (input, init) => {
      requests.push(new URL(String(input)));
      if (String(input).includes("/rpc/")) {
        const params = JSON.parse(String(init?.body));
        rpcRequests.push(params);
        return Response.json(
          nearbyRows
            .filter(
              (row) =>
                params.cursor_distance === null || row.distance_meters > params.cursor_distance
            )
            .slice(0, params.page_limit)
        );
      }
      return Response.json(responseRows);
    },
  },
});

mock.module("@/lib/supabase/server", () => ({
  createCachedClient: () => client,
  createClient: async () => client,
}));
const { getProductsPaginated } = await import("@/lib/data/products");
const { getNearbyPosts } = await import("@/lib/data/nearby-posts");
const { getChallenges, getChallengesPaginated } = await import("@/lib/data/challenges");

beforeEach(() => {
  requests.length = 0;
  responseRows = [];
  nearbyRows = [];
  rpcRequests.length = 0;
});

describe("listing search requests", () => {
  test("keeps the keyword, category and active filter when requesting another page", async () => {
    responseRows = [
      { id: 33, post_name: "Banana" },
      { id: 22, post_name: "Bananas" },
      { id: 11, post_name: "Banana bread" },
    ];
    const first = await getProductsPaginated("food", { limit: 2, searchTerm: " Banana " });
    expect(first.data.map((row) => row.id)).toEqual([33, 22]);
    expect(first.nextCursor).toBe(22);
    expect(first.hasMore).toBe(true);

    responseRows = [{ id: 11, post_name: "Banana bread" }];
    const next = await getProductsPaginated("food", {
      limit: 2,
      cursor: first.nextCursor,
      searchTerm: "Banana",
    });
    expect(next.data.map((row) => row.id)).toEqual([11]);
    expect(next.hasMore).toBe(false);
    expect(next.nextCursor).toBeNull();

    for (const request of requests) {
      expect(request.searchParams.get("post_name")).toBe("ilike.%Banana%");
      expect(request.searchParams.get("post_type")).toBe("eq.food");
      expect(request.searchParams.get("is_active")).toBe("eq.true");
      expect(request.searchParams.get("order")).toBe("id.desc");
      expect(request.searchParams.get("limit")).toBe("3");
    }
    expect(requests[1].searchParams.get("id")).toBe("lt.22");
  });

  test("searches percent and underscore characters literally", async () => {
    await getProductsPaginated("food", { searchTerm: "100%_organic" });
    expect(requests[0].searchParams.get("post_name")).toBe("ilike.%100\\%\\_organic%");
  });

  test("leaves ordinary browsing unfiltered by keyword", async () => {
    await getProductsPaginated("food", { searchTerm: "  " });
    expect(requests[0].searchParams.has("post_name")).toBe(false);
  });

  test("all categories omits a type predicate and organisation maps to the stored type", async () => {
    await getProductsPaginated("all", { searchTerm: "Bread" });
    expect(requests[0].searchParams.has("post_type")).toBe(false);
    await getProductsPaginated("organisation");
    expect(requests[1].searchParams.get("post_type")).toBe("eq.business");
  });

  test("challenge search survives the initial query and paginated refresh", async () => {
    await getChallenges("  100%_waste  ");
    await getChallengesPaginated({ searchTerm: "100%_waste", page: 2, limit: 12 });
    for (const request of requests) {
      expect(request.searchParams.get("challenge_title")).toBe("ilike.%100\\%\\_waste%");
      expect(request.searchParams.get("challenge_published")).toBe("eq.true");
    }
    expect(requests[1].searchParams.get("offset")).toBe("12");
  });

  test("nearby search reaches matches beyond the first source page without losing the resume position", async () => {
    nearbyRows = Array.from({ length: 350 }, (_, index) => ({
      id: index + 1,
      distance_meters: index + 1,
      post_name: (index + 1) % 123 === 0 ? "BANANA" : "Bread",
    }));
    const options = {
      lat: 1,
      lng: 2,
      radiusMeters: 2000,
      postType: "food",
      searchTerm: "banana",
      limit: 1,
    };
    const first = await getNearbyPosts(options);
    expect(first.data.map((row) => row.id)).toEqual([123]);
    expect(first.nextCursor).toEqual({ distance: 123, id: 123 });
    const second = await getNearbyPosts({ ...options, cursor: first.nextCursor });
    expect(second.data.map((row) => row.id)).toEqual([246]);
    const last = await getNearbyPosts({ ...options, cursor: second.nextCursor });
    expect(last.data).toEqual([]);
    expect(last.hasMore).toBe(false);
    for (const params of rpcRequests) {
      expect(params.radius_meters).toBe(2000);
      expect(params.post_type_filter).toBe("food");
    }
  });

  test("a bounded scan returns a continuation even when its first 400 rows do not match", async () => {
    nearbyRows = Array.from({ length: 500 }, (_, index) => ({
      id: index + 1,
      distance_meters: index + 1,
      post_name: index === 449 ? "100%_organic" : "Bread",
    }));
    const options = { lat: 1, lng: 2, postType: "all", searchTerm: "100%_organic" };
    const first = await getNearbyPosts(options);
    expect(first.data).toEqual([]);
    expect(first.hasMore).toBe(true);
    expect(first.nextCursor).toEqual({ distance: 400, id: 400 });
    expect(rpcRequests).toHaveLength(4);
    expect(rpcRequests[0].post_type_filter).toBeNull();
    const second = await getNearbyPosts({ ...options, cursor: first.nextCursor });
    expect(second.data.map((row) => row.id)).toEqual([450]);
    expect(second.hasMore).toBe(false);
  });
});
