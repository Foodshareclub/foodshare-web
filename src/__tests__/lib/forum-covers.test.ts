import { describe, expect, test } from "bun:test";
import { normalizeForumImageUrl, resolveForumCover, resolveForumCoverSources } from "@/lib/forum-covers";

describe("forum-covers", () => {
  test("rewrites retired legacy Supabase Cloud host to active API host", () => {
    const legacyUrl =
      "https://iazmjdjwnkilycbjwpzp.supabase.co/storage/v1/object/public/forum/6f6acbcb-d865-4897-acf2-68a509e58921/cover.jpg";

    const normalized = normalizeForumImageUrl(legacyUrl);

    expect(normalized).toBeDefined();
    expect(normalized).not.toContain("iazmjdjwnkilycbjwpzp.supabase.co");
    expect(normalized).toEndWith("/storage/v1/object/public/forum/6f6acbcb-d865-4897-acf2-68a509e58921/cover.jpg");
  });

  test("rejects invalid or unconfigured hosts cleanly", () => {
    expect(normalizeForumImageUrl(null)).toBeUndefined();
    expect(normalizeForumImageUrl("")).toBeUndefined();
    expect(normalizeForumImageUrl("https://evil.example.com/photo.jpg")).toBeUndefined();
    expect(normalizeForumImageUrl("javascript:alert(1)")).toBeUndefined();
  });

  test("selects contextual food waste cover for LCA food waste article", () => {
    const cover = resolveForumCover({
      id: 441,
      slug: "the-most-detailed-life-cycle-analysis-of-food-waste-ever-offers-eye-popping-revelations-copy",
      title: "The most detailed life cycle analysis of food waste ever offers eye-popping revelations copy",
      description: "<p>AgFunder wrote a nice article about our new #foodwaste estimates and surplus food</p>",
      postType: "guide",
    });

    expect(cover).toStartWith("/assets/covers/");
  });

  test("selects contextual produce/nutrition cover for plant diet article", () => {
    const cover = resolveForumCover({
      id: 359,
      slug: "health-benefits-of-incorporating-fruit-veggies-grains-nuts-and-seeds-into-your-diet",
      title: "Health Benefits of Incorporating Fruit, Veggies, Grains, Nuts, and Seeds Into Your Diet",
      description: "A healthy diet should include nutrient-dense fruits, vegetables, whole grains, nuts and seeds.",
      postType: "guide",
    });

    expect([
      "/assets/covers/food/produce-1.jpg",
      "/assets/covers/food/produce-2.jpg",
      "/assets/covers/food/assorted-1.jpg",
    ]).toContain(cover);
  });

  test("resolveForumCoverSources falls back to contextual cover when explicit URL is missing", () => {
    const resolved = resolveForumCoverSources({
      id: 359,
      title: "Health Benefits of Incorporating Fruit, Veggies, Grains, Nuts, and Seeds Into Your Diet",
      imageUrl: null,
      postType: "guide",
    });

    expect(resolved.hasExplicitImage).toBe(false);
    expect(resolved.primaryUrl).toBe(resolved.fallbackUrl);
    expect(resolved.primaryUrl).toStartWith("/assets/covers/");
  });

  test("resolveForumCoverSources keeps valid explicit image as primary while providing contextual fallback", () => {
    const remoteUrl = "https://api.foodshare.club/storage/v1/object/public/forum/blog/media/test-hash";
    const resolved = resolveForumCoverSources({
      id: 100,
      title: "Launching Foodshare 3.0",
      imageUrl: remoteUrl,
      postType: "announcement",
    });

    expect(resolved.hasExplicitImage).toBe(true);
    expect(resolved.primaryUrl).toBe(remoteUrl);
    expect(resolved.fallbackUrl).toStartWith("/assets/covers/");
  });
});
