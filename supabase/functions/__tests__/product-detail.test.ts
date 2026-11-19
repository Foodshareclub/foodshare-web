import { assertEquals, assertRejects } from "./test-utils.ts";
import type { HandlerContext } from "../_shared/api-handler.ts";
import { getProduct } from "../api-v1-products/lib/handlers/get-products.ts";
import { type ListQuery, listQuerySchema } from "../api-v1-products/lib/schemas.ts";

Deno.test("product detail does not disguise a database failure as a missing listing", async () => {
  const query = {
    select() {
      return query;
    },
    returns() {
      return query;
    },
    eq() {
      return query;
    },
    maybeSingle() {
      return Promise.resolve({ data: null, error: new Error("database unavailable") });
    },
  };
  const ctx = {
    query: listQuerySchema.parse({ id: "2559" }),
    supabase: { from: () => query },
  } as unknown as HandlerContext<unknown, ListQuery>;
  await assertRejects(() => getProduct(ctx), Error, "database unavailable");
});

for (const publicOwner of [true, false]) {
  Deno.test(`product detail respects the public owner projection (visible=${publicOwner})`, async () => {
    const profile = publicOwner
      ? { id: "owner", display_name: "Member", created_at: "2026-01-01", bio: "Shares food" }
      : null;
    const query = {
      select(columns: string) {
        // Reproduce the production grant boundary rather than allowing the
        // private profiles join to pass in a permissive client mock.
        assertEquals(columns.includes("profile:profiles_public!posts_profile_id_fkey("), true);
        assertEquals(columns.includes("bio:about_me"), true);
        return query;
      },
      returns() {
        return query;
      },
      eq() {
        return query;
      },
      maybeSingle() {
        return Promise.resolve({
          data: { id: 2559, post_name: "Food", profile_id: "owner", profile },
          error: null,
        });
      },
    };
    const ctx = {
      query: listQuerySchema.parse({ id: "2559", include: "owner" }),
      supabase: { from: () => query },
      requestId: "test-detail",
    } as unknown as HandlerContext<unknown, ListQuery>;
    const response = await getProduct(ctx);
    const body = await response.json();
    assertEquals(response.status, 200);
    assertEquals(body.data.id, 2559);
    assertEquals(body.data.profile, profile);
    assertEquals(body.data.user === null, !publicOwner);
  });
}
