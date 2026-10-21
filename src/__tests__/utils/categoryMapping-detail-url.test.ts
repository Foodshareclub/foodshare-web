import { describe, expect, it } from "bun:test";
import { dbToUrlType, getProductDetailUrl, urlToDbType } from "@/utils/categoryMapping";

/**
 * The detail-URL contract, and the reason product modals work at all.
 *
 * `next.config.ts` 308-redirects the 14 category-prefixed detail paths
 * (`/thing/:id+`, `/fridge/:id+`, …) to `/product/:id*` so that externally
 * indexed links keep working. Next evaluates redirects *before* the filesystem
 * (`redirects.md`: "Redirects are checked before the filesystem"), and a 308
 * makes the client router perform a hard navigation
 * (`segment-cache/navigation.js` → `completeHardNavigation`).
 *
 * So while `getProductDetailUrl` returned `/thing/123`:
 *   - the `@modal/(.)thing` intercept could never fire, because the request
 *     never reached the filesystem router;
 *   - every product click was a full page load.
 *
 * The fix is to generate the canonical `/product/[id]` for internal links and
 * let the redirects serve only external traffic. This test exists to stop
 * someone reintroducing category-prefixed detail URLs.
 */
describe("getProductDetailUrl", () => {
  it("targets /product for every post-backed category", () => {
    for (const postType of [
      "food",
      "thing",
      "borrow",
      "wanted",
      "foodbank",
      "fridge",
      "business",
      "volunteer",
      "zerowaste",
      "vegan",
    ]) {
      expect(getProductDetailUrl(postType, 42)).toBe("/product/42");
    }
  });

  it("is case-insensitive on post_type", () => {
    expect(getProductDetailUrl("Food", 1)).toBe("/product/1");
    expect(getProductDetailUrl("BUSINESS", 1)).toBe("/product/1");
  });

  it("treats a nullish post_type as food", () => {
    expect(getProductDetailUrl(null, 7)).toBe("/product/7");
    expect(getProductDetailUrl(undefined, 7)).toBe("/product/7");
    expect(getProductDetailUrl("", 7)).toBe("/product/7");
  });

  it("keeps challenges on /challenge, which is a real page not a redirect", () => {
    // Challenges live in the `challenges` table, not `posts`, so they must not
    // be routed through /product. This is also the only path that makes the
    // `@modal/(.)challenge` intercept reachable.
    expect(getProductDetailUrl("challenge", 42)).toBe("/challenge/42");
    expect(getProductDetailUrl("challenges", 42)).toBe("/challenge/42");
  });

  it("emits no URL that next.config.ts redirects away", () => {
    // The 14 redirected detail prefixes. An internal link to any of these
    // becomes a 308 and a hard navigation, so none may be generated.
    const redirectedPrefixes = [
      "listing",
      "products",
      "thing",
      "things",
      "borrow",
      "wanted",
      "fridge",
      "foodbank",
      "organisation",
      "organisations",
      "volunteer",
      "volunteers",
      "zerowaste",
      "vegan",
    ];

    for (const postType of [
      "food",
      "thing",
      "borrow",
      "wanted",
      "foodbank",
      "fridge",
      "business",
      "volunteer",
      "zerowaste",
      "vegan",
      "challenge",
    ]) {
      const url = getProductDetailUrl(postType, 1);
      const prefix = `/${url.split("/")[1]}`;
      expect(redirectedPrefixes).not.toContain(prefix);
    }
  });

  it("accepts string ids", () => {
    expect(getProductDetailUrl("thing", "123")).toBe("/product/123");
  });
});

describe("url slug <-> post_type mapping", () => {
  it("maps plural URL slugs to singular column values", () => {
    expect(urlToDbType("things")).toBe("thing");
    expect(urlToDbType("foodbanks")).toBe("foodbank");
    expect(urlToDbType("fridges")).toBe("fridge");
    expect(urlToDbType("organisations")).toBe("business");
    expect(urlToDbType("volunteers")).toBe("volunteer");
  });

  it("accepts both singular and plural forms", () => {
    expect(urlToDbType("thing")).toBe("thing");
    expect(urlToDbType("fridge")).toBe("fridge");
  });

  it("is case-insensitive", () => {
    expect(urlToDbType("Things")).toBe("thing");
    expect(urlToDbType("ORGANISATIONS")).toBe("business");
  });

  it("passes through unknown types unchanged rather than returning empty", () => {
    // A typo'd category must not silently become "no filter".
    expect(urlToDbType("sometypo")).toBe("sometypo");
  });

  it("round-trips db -> url -> db", () => {
    for (const dbType of ["thing", "foodbank", "fridge", "business", "volunteer", "zerowaste", "vegan"]) {
      expect(urlToDbType(dbToUrlType(dbType))).toBe(dbType);
    }
  });
});
