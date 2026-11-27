import { assertEquals, assertRejects } from "@std/assert";
import type { HandlerContext } from "../_shared/api-handler.ts";
import { ValidationError } from "../_shared/errors.ts";
import type { ListQuery, UpdateProductBody } from "../api-v1-products/lib/schemas.ts";
import { createProductSchema, updateProductSchema } from "../api-v1-products/lib/schemas.ts";
import { updateProduct } from "../api-v1-products/lib/handlers/update-product.ts";

const OWNER = "11111111-1111-4111-8111-111111111111";

Deno.test("updateProductSchema and createProductSchema both allow empty images arrays for server cover generation", () => {
  const createResult = createProductSchema.safeParse({
    title: "Fresh apples",
    images: [],
    postType: "food",
    latitude: 37.77,
    longitude: -122.42,
  });
  assertEquals(createResult.success, true);

  const updateResult = updateProductSchema.safeParse({
    version: 1,
    images: [],
  });
  assertEquals(updateResult.success, true);
});

Deno.test("updateProduct generates a canonical cover and archives prior images when images is []", async () => {
  const existingRow = {
    id: 42,
    profile_id: OWNER,
    version: 3,
    post_type: "food",
    post_name: "Homegrown Lemons",
    post_description: "Bag of Meyer lemons",
    images: [
      "https://iazmjdjwnkilycbjwpzp.supabase.co/storage/v1/object/public/posts/old-lemon.jpg",
    ],
    metadata: {
      owner_note: "keep-me",
      cover_image_archive: ["https://example.com/earlier.jpg"],
    },
  };

  let capturedUpdates: Record<string, unknown> | undefined;
  let coverCalledWith: Record<string, unknown> | undefined;

  const updatedRow = {
    id: 42,
    profile_id: OWNER,
    post_name: "Meyer Lemons",
    post_description: "Bag of Meyer lemons",
    post_type: "thing",
    images: [
      "https://api.foodshare.club/storage/v1/object/public/food-images/generated/cover-42.png",
    ],
    version: 4,
    is_active: true,
    created_at: "2026-11-26T00:00:00Z",
    updated_at: "2026-11-26T01:00:00Z",
    metadata: {},
  };

  const mockSupabase = {
    from: (_table: string) => ({
      select: (_cols: string) => ({
        eq: (_col: string, _val: unknown) => ({
          maybeSingle: () => Promise.resolve({ data: existingRow, error: null }),
        }),
      }),
      update: (payload: Record<string, unknown>) => {
        capturedUpdates = payload;
        return {
          eq: () => ({
            eq: () => ({
              eq: () => ({
                select: () => ({
                  maybeSingle: () => Promise.resolve({ data: updatedRow, error: null }),
                }),
              }),
            }),
          }),
        };
      },
    }),
  };

  const ctx = {
    supabase: mockSupabase as unknown as HandlerContext<UpdateProductBody, ListQuery>["supabase"],
    userId: OWNER,
    body: {
      version: 3,
      title: "Meyer Lemons",
      postType: "thing",
      images: [],
    },
    query: { id: "42" } as unknown as ListQuery,
    ctx: { requestId: "req-cover-test" },
  } as unknown as HandlerContext<UpdateProductBody, ListQuery>;

  const res = await updateProduct(ctx, {
    createCover: (input, userId) => {
      coverCalledWith = { input, userId };
      return Promise.resolve({
        images: [
          "https://api.foodshare.club/storage/v1/object/public/food-images/generated/cover-42.png",
        ],
        cover: {
          kind: "generated",
          provider: "zai",
          model: "glm-image",
          contextHash: "ctx-42",
          matchedAt: "2026-11-26T01:00:00Z",
          query: "Meyer Lemons",
          matchScope: "subject",
          disclosure: "AI-generated illustration",
        },
      });
    },
  });

  assertEquals(res.status, 200);
  assertEquals(coverCalledWith, {
    input: {
      title: "Meyer Lemons",
      description: "Bag of Meyer lemons",
      postType: "thing",
      images: [],
    },
    userId: OWNER,
  });
  assertEquals(capturedUpdates?.images, [
    "https://api.foodshare.club/storage/v1/object/public/food-images/generated/cover-42.png",
  ]);

  const meta = capturedUpdates?.metadata as Record<string, unknown>;
  assertEquals(meta.owner_note, "keep-me");
  assertEquals(meta.cover_image_archive, [
    "https://example.com/earlier.jpg",
    "https://iazmjdjwnkilycbjwpzp.supabase.co/storage/v1/object/public/posts/old-lemon.jpg",
  ]);
  assertEquals((meta.cover as { model: string }).model, "glm-image");
  assertEquals((meta.classification as { requestedPostType: string }).requestedPostType, "food");
});

Deno.test("updateProduct rejects external image URLs when non-empty images array is provided", async () => {
  const existingRow = {
    id: 43,
    profile_id: OWNER,
    version: 1,
    post_type: "food",
    post_name: "Carrots",
    post_description: "Bunch of carrots",
    images: ["https://api.foodshare.club/storage/v1/object/public/posts/carrots.jpg"],
    metadata: {},
  };

  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: existingRow, error: null }),
        }),
      }),
    }),
  };

  const ctx = {
    supabase: mockSupabase as unknown as HandlerContext<UpdateProductBody, ListQuery>["supabase"],
    userId: OWNER,
    body: {
      version: 1,
      images: ["https://evil.example.com/hotlink.jpg"],
    },
    query: { id: "43" } as unknown as ListQuery,
  } as unknown as HandlerContext<UpdateProductBody, ListQuery>;

  await assertRejects(
    () => updateProduct(ctx),
    ValidationError,
    "Images must be available in our storage",
  );
});
