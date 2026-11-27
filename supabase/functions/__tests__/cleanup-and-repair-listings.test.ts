import { assertEquals } from "@std/assert";
import {
  type AuditPostRow,
  type AuditProfileRow,
  classifyCleanupCandidate,
  planPostGalleryRepair,
  type UrlHealth,
} from "../../../scripts/cleanup-and-repair-listings.ts";

function makePost(overrides: Partial<AuditPostRow> = {}): AuditPostRow {
  return {
    id: 99999,
    profile_id: "11111111-1111-4111-8111-111111111111",
    post_name: "Fresh sourdough loaf",
    post_description: "Baked this morning, pickup before 7pm",
    post_type: "food",
    images: ["https://api.foodshare.club/storage/v1/object/public/food-images/sourdough.jpg"],
    metadata: {},
    version: 1,
    is_active: true,
    ...overrides,
  };
}

Deno.test("classifyCleanupCandidate flags reviewed tests, profile-as-listings, and preserves real listings", () => {
  assertEquals(classifyCleanupCandidate(makePost({ id: 2406, post_name: "Lentils" })), {
    action: "delete",
    reason: "reviewed_test_listing",
  });
  assertEquals(classifyCleanupCandidate(makePost({ id: 2503, post_name: "Vlad" })), {
    action: "delete",
    reason: "reviewed_profile_as_listing",
  });
  assertEquals(
    classifyCleanupCandidate(
      makePost({ id: 50001, post_name: "(No Title)", post_description: "" }),
    ),
    { action: "delete", reason: "empty_or_no_title" },
  );
  assertEquals(
    classifyCleanupCandidate(
      makePost({ id: 50002, post_name: "Test Listing", post_description: "" }),
    ),
    { action: "delete", reason: "synthetic_test_title" },
  );

  const profile: AuditProfileRow = {
    id: "11111111-1111-4111-8111-111111111111",
    first_name: "Alex",
    second_name: "Rivera",
    nickname: "alexr",
  };
  assertEquals(
    classifyCleanupCandidate(
      makePost({ id: 50003, post_name: "Alex Rivera", post_description: "" }),
      profile,
    ),
    { action: "delete", reason: "profile_as_listing_exact_match" },
  );
  // Real listing sharing user's first name with a full description must be kept
  assertEquals(
    classifyCleanupCandidate(
      makePost({
        id: 50004,
        post_name: "Alex",
        post_description: "Bag of organic apples and pears ready for porch pickup today.",
      }),
      profile,
    ),
    { action: "keep" },
  );
  // Real food bank listing must be kept even if short
  assertEquals(
    classifyCleanupCandidate(
      makePost({ id: 50005, post_type: "foodbank", post_name: "Test", post_description: "" }),
    ),
    { action: "keep" },
  );
});

Deno.test("planPostGalleryRepair replaces non-canonical primary covers via generator and archives originals", async () => {
  const post = makePost({
    id: 1868,
    images: ["https://cdn.vox-cdn.com/thumbor/fridge.jpg"],
    metadata: { owner_note: "lacf" },
  });

  const plan = await planPostGalleryRepair(
    post,
    () => Promise.resolve<UrlHealth>("live_external"),
    () =>
      Promise.resolve({
        images: [
          "https://api.foodshare.club/storage/v1/object/public/food-images/repaired-1868.jpg",
        ],
        cover: { kind: "reference", provider: "wikimedia-commons" },
      }),
  );

  assertEquals(plan.needsUpdate, true);
  assertEquals(plan.reason, "generated_or_fetched_canonical_cover");
  assertEquals(plan.nextImages, [
    "https://api.foodshare.club/storage/v1/object/public/food-images/repaired-1868.jpg",
  ]);
  assertEquals(plan.nextMetadata.owner_note, "lacf");
  assertEquals(plan.nextMetadata.cover_image_archive, [
    "https://cdn.vox-cdn.com/thumbor/fridge.jpg",
  ]);
});

Deno.test("planPostGalleryRepair prunes dead legacy and placeholder secondaries while keeping canonical primary", async () => {
  const canonical = "https://api.foodshare.club/storage/v1/object/public/posts/live-primary.jpg";
  const post = makePost({
    id: 8,
    images: [
      canonical,
      "https://iazmjdjwnkilycbjwpzp.supabase.co/storage/v1/object/public/posts/dead.jpg",
      "https://api.foodshare.club/storage/v1/object/public/assets/add_pics.webp",
    ],
  });

  const plan = await planPostGalleryRepair(
    post,
    (url) => Promise.resolve(url === canonical ? "live_canonical" : "dead"),
    () => Promise.reject(new Error("should not generate when canonical primary is live")),
  );

  assertEquals(plan.needsUpdate, true);
  assertEquals(plan.reason, "pruned_non_canonical_or_dead_secondaries");
  assertEquals(plan.nextImages, [canonical]);
  assertEquals(plan.nextMetadata.cover_image_archive, post.images);
});
