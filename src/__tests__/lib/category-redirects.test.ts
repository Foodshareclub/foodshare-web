import { expect, test } from "bun:test";
import { CATEGORIES } from "@/constants/categories";
import {
  getRedirectUrl,
  unstable_getResponseFromNextConfig,
} from "next/experimental/testing/server";
import nextConfig from "../../../next.config";

test("category indexes are never captured by legacy product detail redirects", async () => {
  for (const category of [
    ...CATEGORIES.map(({ id }) => id),
    "things",
    "organisations",
    "volunteers",
  ]) {
    const response = await unstable_getResponseFromNextConfig({
      url: `https://foodshare.club/${category}?distance=any&key_word=banana`,
      nextConfig: { redirects: nextConfig.redirects },
    });
    expect(getRedirectUrl(response)).toBeNull();
  }
});

test("legacy detail links still redirect permanently and retain their query parameters", async () => {
  for (const category of [
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
  ]) {
    const response = await unstable_getResponseFromNextConfig({
      url: `https://foodshare.club/${category}/123-example?from=search`,
      nextConfig: { redirects: nextConfig.redirects },
    });
    expect(response.status).toBe(308);
    expect(getRedirectUrl(response)).toBe("https://foodshare.club/product/123-example?from=search");
  }
});
