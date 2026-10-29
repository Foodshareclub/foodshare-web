import { assertEquals, assertRejects, assertThrows } from "./test-utils.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { HandlerContext } from "../_shared/api-handler.ts";
import { DatabaseError, ValidationError } from "../_shared/errors.ts";
import { postEngagementId, togglePostEngagement } from "../_shared/post-engagement.ts";
import { getEngagement } from "../api-v1-engagement/lib/handlers/get-engagement.ts";

Deno.test("post engagement rejects partial, nonpositive and unsafe identifiers", () => {
  for (const value of [0, -1, 1.5, NaN, Infinity, "12oops", "1.0", "", null, undefined, Number.MAX_SAFE_INTEGER + 1]) {
    assertThrows(() => postEngagementId(value), ValidationError);
  }
  assertEquals(postEngagementId(" 12 "), 12);
  assertEquals(postEngagementId(12), 12);
});

Deno.test("post engagement mutation rejects database errors and malformed success payloads", async () => {
  for (const result of [
    { data: null, error: { code: "42P01", message: "private provider diagnostic" } },
    { data: null, error: null },
    { data: { active: "true", likeCount: 1 }, error: null },
    { data: { active: true, likeCount: -1 }, error: null },
    { data: { active: true, likeCount: "1" }, error: null },
  ]) {
    const db = { rpc: () => Promise.resolve(result) } as unknown as SupabaseClient;
    await assertRejects(() => togglePostEngagement(db, "like", 1, "test-user"), DatabaseError);
  }
});

Deno.test("post engagement reads never translate failed or missing data into zero counts", async () => {
  for (const result of [
    { data: null, error: { code: "42P01" } },
    { data: null, error: null },
    { data: {}, error: null },
    { data: { "1": { isLiked: false, isBookmarked: false, likeCount: "0" } }, error: null },
  ]) {
    const ctx = {
      query: { postId: "1" },
      userId: null,
      corsHeaders: {},
      supabase: { rpc: () => Promise.resolve(result) },
    } as unknown as HandlerContext;
    await assertRejects(() => getEngagement(ctx), DatabaseError);
  }
});

Deno.test("post engagement personalized reads forbid shared HTTP caching", async () => {
  const ctx = {
    query: { postId: "1" },
    userId: null,
    corsHeaders: {},
    supabase: {
      rpc: () => Promise.resolve({ data: { "1": { isLiked: false, isBookmarked: false, likeCount: 1 } }, error: null }),
    },
  } as unknown as HandlerContext;
  const response = await getEngagement(ctx);
  assertEquals(response.headers.get("Cache-Control"), "private, no-store");
  assertEquals((await response.json()).data.likeCount, 1);
});
