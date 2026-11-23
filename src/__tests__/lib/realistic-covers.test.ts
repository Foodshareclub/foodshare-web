import { describe, expect, it } from "bun:test";
import { resolveRealisticCover } from "@/lib/realistic-covers";

describe("resolveRealisticCover", () => {
  it("resolves realistic cover for bananas", () => {
    const cover = resolveRealisticCover({ title: "Organic Yellow Bananas" });
    expect(cover).toMatch(/\/assets\/covers\/food\/banana-[12]\.jpg/);
  });

  it("resolves realistic cover for apples", () => {
    const cover = resolveRealisticCover({ title: "Crisp Red Apples" });
    expect(cover).toMatch(/\/assets\/covers\/food\/apple-[12]\.jpg/);
  });

  it("resolves realistic cover for bread and bakery", () => {
    const cover = resolveRealisticCover({ title: "Sourdough Bread" });
    expect(cover).toBe("/assets/covers/food/bread-1.jpg");
  });

  it("resolves realistic cover for produce and vegetables", () => {
    const cover = resolveRealisticCover({
      title: "Garden Tomatoes and Greens",
    });
    expect(cover).toBe("/assets/covers/food/produce-1.jpg");
  });

  it("resolves realistic cover for pantry items", () => {
    const cover = resolveRealisticCover({
      title: "Pasta and Rice Pantry Items",
    });
    expect(cover).toBe("/assets/covers/food/pantry-1.jpg");
  });

  it("resolves realistic cover for community fridge", () => {
    const cover = resolveRealisticCover({
      title: "Community Fridge Downtown",
      postType: "fridge",
    });
    expect(cover).toBe("/assets/covers/fridge/fridge-1.jpg");
  });

  it("supports deduplication with excludeUrls", () => {
    const first = resolveRealisticCover({ title: "Bananas", postId: 0 });
    const second = resolveRealisticCover({
      title: "Bananas",
      postId: 0,
      excludeUrls: [first],
    });
    expect(first).not.toBe(second);
  });
});
