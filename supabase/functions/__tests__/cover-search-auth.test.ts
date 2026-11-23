import { assertRejects } from "@std/assert";
import { AuthenticationError, ValidationError } from "../_shared/errors.ts";
import { handleCoverSearch } from "../api-v1-cover-search/lib/handler.ts";

Deno.test("cover search rejects unauthenticated callers before AI or storage access", async () => {
  await assertRejects(
    () =>
      handleCoverSearch(
        {
          userId: null,
          body: { title: "Apples", postType: "food", images: [] },
        } as unknown as Parameters<typeof handleCoverSearch>[0],
      ),
    AuthenticationError,
  );
});

Deno.test("cover search with invalid postId throws ValidationError", async () => {
  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
  };

  await assertRejects(
    () =>
      handleCoverSearch(
        {
          userId: "test-user-id",
          body: { postId: 999999, images: [] },
          supabase: mockSupabase,
        } as unknown as Parameters<typeof handleCoverSearch>[0],
      ),
    ValidationError,
  );
});
