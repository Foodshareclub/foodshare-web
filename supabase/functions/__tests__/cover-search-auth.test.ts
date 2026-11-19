import { assertRejects } from "@std/assert";
import { AuthenticationError } from "../_shared/errors.ts";
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
