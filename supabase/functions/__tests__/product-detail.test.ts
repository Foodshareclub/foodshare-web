import { assertRejects } from "./test-utils.ts";
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
