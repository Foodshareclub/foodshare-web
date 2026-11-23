import { describe, expect, it } from "bun:test";
import {
  isGenericReusedReferenceCover,
  resolveRealisticCover,
} from "@/lib/realistic-covers";

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
    expect(cover).toMatch(/\/assets\/covers\/fridge\/fridge-[12]\.jpg/);
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

  it("detects generic mass-reused reference covers", () => {
    expect(
      isGenericReusedReferenceCover(
        "https://api.foodshare.club/storage/v1/object/public/assets/listing-reference/a433875991b9df54ea83c4f0d49418416c7c3188dd8cb889fa7597478d1529b0/fresh-produce.jpg",
      ),
    ).toBe(true);
    expect(
      isGenericReusedReferenceCover("/assets/covers/food/banana-1.jpg"),
    ).toBe(false);
    expect(isGenericReusedReferenceCover(null)).toBe(false);
  });

  it("classifies multi-item and generic haul listings as assorted", () => {
    const c2662 = resolveRealisticCover({
      title:
        "Brot brötchen Aufschnitt Jogurt käse Obst gemüse alles eigentlich",
      postId: 2662,
    });
    expect(c2662).toMatch(/\/assets\/covers\/food\/assorted-[1-4]\.jpg/);

    const c2659 = resolveRealisticCover({
      title: "Brot,Gemüse.,Obst Abgelaufen alles",
      postId: 2659,
    });
    expect(c2659).toMatch(/\/assets\/covers\/food\/assorted-[1-4]\.jpg/);

    const c2626 = resolveRealisticCover({
      title: "Verschiedenes",
      postId: 2626,
    });
    expect(c2626).toMatch(/\/assets\/covers\/food\/assorted-[1-4]\.jpg/);
  });

  it("guarantees 3 mutually distinct covers for target listings 2662, 2659, and 2626", () => {
    const c2662 = resolveRealisticCover({
      title:
        "Brot brötchen Aufschnitt Jogurt käse Obst gemüse alles eigentlich",
      postId: 2662,
    });
    const c2659 = resolveRealisticCover({
      title: "Brot,Gemüse.,Obst Abgelaufen alles",
      postId: 2659,
    });
    const c2626 = resolveRealisticCover({
      title: "Verschiedenes",
      postId: 2626,
    });

    expect(c2662).not.toBe(c2659);
    expect(c2659).not.toBe(c2626);
    expect(c2662).not.toBe(c2626);

    // Also verify with raw database whitespace / newlines
    const raw2662 = resolveRealisticCover({
      title:
        "Brot brötchen Aufschnitt Jogurt käse Obst gemüse alles eigentlich ",
      postId: 2662,
    });
    const raw2659 = resolveRealisticCover({
      title: "Brot,Gemüse.,Obst \nAbgelaufen alles ",
      postId: 2659,
    });
    const raw2626 = resolveRealisticCover({
      title: "Verschiedenes ",
      postId: 2626,
    });
    expect(raw2662).not.toBe(raw2659);
    expect(raw2659).not.toBe(raw2626);
    expect(raw2662).not.toBe(raw2626);
  });
});
