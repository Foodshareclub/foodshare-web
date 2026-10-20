import { describe, expect, it } from "bun:test";
import type { InitialProductStateType } from "@/types/product.types";
import { generateProductPopupHTML } from "@/utils/mapHelpers";

/**
 * Regression tests for the stored-XSS hole in Leaflet popups.
 *
 * `bindPopup()` writes this string through `innerHTML`, so every interpolated
 * value is an injection sink. `post_name`, `post_type` and `images[0]` are all
 * user-controlled (a listing's title is arbitrary text), which meant a listing
 * titled `<img src=x onerror=...>` executed for anyone who clicked its marker.
 *
 * The CTA was also an inline `onclick`, which is worse than an XSS sink on its
 * own: event-handler attributes are governed by `script-src-attr` (which falls
 * back to `script-src`) and a nonce does NOT allow them, so it would have
 * blocked any future nonce migration as well as being directly injectable.
 */
function makeProduct(overrides: Partial<InitialProductStateType> = {}): InitialProductStateType {
  return {
    available_hours: "",
    condition: "good",
    created_at: "2026-01-01T00:00:00Z",
    five_star: null,
    four_star: null,
    images: [],
    id: 42,
    location: {} as InitialProductStateType["location"],
    post_address: "",
    post_stripped_address: "",
    is_arranged: false,
    post_description: "",
    post_like_counter: 0,
    transportation: "",
    post_name: "Fresh tomatoes",
    post_slug: null,
    post_type: "thing",
    is_active: true,
    post_views: 0,
    profile_id: "11111111-1111-1111-1111-111111111111",
    ...overrides,
  } as InitialProductStateType;
}

describe("generateProductPopupHTML", () => {
  it("escapes a script tag in the listing title", () => {
    const html = generateProductPopupHTML(makeProduct({ post_name: '<script>alert("xss")</script>' }), "thing");
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes quotes in the title so it cannot break out of an attribute", () => {
    const html = generateProductPopupHTML(makeProduct({ post_name: '"><img src=x onerror=alert(1)>' }), "thing");
    expect(html).not.toContain("<img src=x onerror");
    expect(html).toContain("&quot;");
  });

  it("escapes an event-handler payload in the image URL", () => {
    const html = generateProductPopupHTML(makeProduct({ images: ['x" onerror="alert(1)'] }), "thing");
    expect(html).not.toContain('onerror="alert(1)"');
    expect(html).toContain("onerror=&quot;");
  });

  it("escapes post_type used as badge text", () => {
    const html = generateProductPopupHTML(makeProduct({ post_type: "<b>bold</b>" }), "<b>bold</b>");
    expect(html).not.toContain("<b>bold</b>");
    expect(html).toContain("&lt;b&gt;");
  });

  it("emits no inline event handlers at all", () => {
    const html = generateProductPopupHTML(makeProduct({ post_name: "Normal" }), "thing");
    // Would need script-src-attr, which a nonce cannot satisfy.
    expect(html).not.toMatch(/\sonclick=/i);
    expect(html).not.toMatch(/\sonerror=/i);
    expect(html).not.toMatch(/\sonload=/i);
    expect(html).not.toContain("javascript:");
  });

  it("renders a native link to the canonical product URL", () => {
    const html = generateProductPopupHTML(makeProduct({ id: 42 }), "thing");
    // Not `/thing/42`, which is a 308 redirect to this.
    expect(html).toContain('href="/product/42"');
    expect(html).toContain('class="product-popup-button"');
  });

  it("routes challenges to their own page instead of /product", () => {
    const html = generateProductPopupHTML(makeProduct({ id: 7, post_type: "challenge" }), "challenge");
    expect(html).toContain('href="/challenge/7"');
  });

  it("omits the image element when there is no image", () => {
    const html = generateProductPopupHTML(makeProduct({ images: [] }), "thing");
    expect(html).not.toContain("<img");
  });

  it("renders distance only when present and numeric", () => {
    const withDistance = generateProductPopupHTML(
      makeProduct({ distance: 1.25 } as Partial<InitialProductStateType>),
      "thing",
    );
    expect(withDistance).toContain("1.3 km away");

    const withoutDistance = generateProductPopupHTML(makeProduct(), "thing");
    expect(withoutDistance).not.toContain("km away");
  });
});
