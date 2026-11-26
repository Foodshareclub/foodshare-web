import { assertEquals, assertRejects } from "@std/assert";
import { createProductSchema } from "../api-v1-products/lib/schemas.ts";
import {
  type CoverDependencies,
  coverSearchContext,
  ensureListingCover,
  rasterType,
  verifiedCatalogCover,
} from "../api-v1-products/lib/listing-cover.ts";
import { RateLimitError, ServerError } from "../_shared/errors.ts";
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
const input = {
  title: "Organic apples",
  description: "Fresh apples from the garden",
  postType: "food",
  images: [] as string[],
};
function dependencies(): CoverDependencies {
  return {
    quota: () => Promise.resolve(true),
    search: () =>
      Promise.resolve({
        candidate: {
          pageId: 42,
          title: "File:Apples.png",
          caption: "Apples",
          imageUrl: "https://upload.wikimedia.org/test.png",
          sourcePageUrl: "https://commons.wikimedia.org/?curid=42",
          license: "CC0",
          licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
          artist: "Photographer",
        },
        query: "apples",
        confidence: 0.95,
        scope: "subject",
        model: "openai/gpt-oss-20b",
      }),
    download: () => Promise.resolve(png),
    store: (path) =>
      Promise.resolve(`https://api.foodshare.club/storage/v1/object/public/food-images/${path}`),
    verify: () => Promise.resolve(png),
  };
}
Deno.test("existing customer photos never trigger search, download or storage writes", async () => {
  const unexpected = () => {
    throw Error("Existing photos must be preserved");
  };
  const images = ["https://api.foodshare.club/storage/v1/object/public/posts/user/a.jpg"];
  assertEquals(
    await ensureListingCover({ ...input, images }, "user", {
      quota: unexpected,
      search: unexpected,
      download: unexpected,
      store: unexpected,
      verify: unexpected,
    }),
    { images },
  );
});
Deno.test("image search consumes quota before provider access", async () => {
  const deps = dependencies();
  deps.quota = () => Promise.resolve(false);
  deps.search = () => {
    throw Error("Provider must not be called");
  };
  await assertRejects(() => ensureListingCover(input, "user", deps), RateLimitError);
});
Deno.test("searched cover retains source and license after owner-scoped upload and public readback", async () => {
  const deps = dependencies();
  deps.generate = () => {
    throw Error("A matching reference must avoid paid generation");
  };
  const calls: string[] = [];
  deps.store = (path, bytes, type) => {
    calls.push("store");
    assertEquals(path.startsWith("user/reference-covers/"), true);
    assertEquals(bytes, png);
    assertEquals(type, "image/png");
    return Promise.resolve(`https://api.foodshare.club/${path}`);
  };
  deps.verify = () => {
    calls.push("verify");
    return Promise.resolve(png);
  };
  const result = await ensureListingCover(input, "user", deps);
  assertEquals(calls, ["store", "verify"]);
  assertEquals(result.images.length, 1);
  assertEquals(result.cover?.kind, "reference");
  assertEquals(result.cover?.contextHash.length, 64);
  assertEquals(result.cover?.license, "CC0");
  assertEquals(result.cover?.pageId, 42);
});
Deno.test("mismatched public readback fails closed before publication", async () => {
  const deps = dependencies();
  deps.verify = () => Promise.resolve(new Uint8Array([1]));
  await assertRejects(() => ensureListingCover(input, "user", deps), ServerError, "readback");
});
Deno.test("HTML and oversized downloads cannot become listing covers", async () => {
  for (
    const bytes of [
      new TextEncoder().encode("<html>not an image</html>"),
      new Uint8Array(5 * 1024 * 1024 + 1),
    ]
  ) {
    const deps = dependencies();
    deps.download = () => Promise.resolve(bytes);
    deps.store = () => {
      throw Error("Invalid image must not be stored");
    };
    await assertRejects(() => ensureListingCover(input, "user", deps), ServerError);
  }
  assertEquals(rasterType(png), "png");
});
Deno.test("multilingual context is retained and contact data is removed before AI search", () => {
  const text = coverSearchContext({
    ...input,
    title: "Овощи",
    description: "яблоки a@example.com https://example.com +1 234 567 8901",
  });
  assertEquals(text.includes("яблоки"), true);
  for (const contact of ["a@example.com", "https://example.com", "234 567"]) {
    assertEquals(text.includes(contact), false);
  }
});
Deno.test("control characters are replaced with spaces before AI search", () => {
  const text = coverSearchContext({
    ...input,
    title: "Ap\u0000ples\u001f",
    description: "a\nb\tc",
  });
  assertEquals(JSON.parse(text), { title: "Ap ples ", description: "a b c", category: "food" });
});
Deno.test("omitted images enter automatic cover search", () => {
  assertEquals(
    createProductSchema.parse({
      title: "Organic apples",
      postType: "food",
      latitude: 51,
      longitude: 0,
    }).images,
    [],
  );
});

Deno.test("catalog fallback verifies backend bytes and does not invent attribution", async () => {
  let checked = "";
  const fallbackResult = await verifiedCatalogCover(
    {
      title: "Fresh Bananas",
      description: "Organic bunch",
      postType: "food",
      images: [],
    },
    [],
    (url) => {
      checked = url;
      return Promise.resolve(png);
    },
  );

  assertEquals(fallbackResult.images.length, 1);
  assertEquals(fallbackResult.images[0].includes("assets/covers/food/banana"), true);
  assertEquals(fallbackResult.cover?.kind, "reference");
  assertEquals(fallbackResult.cover?.provider, "realistic-catalog");
  assertEquals(checked, fallbackResult.images[0]);
  assertEquals(fallbackResult.cover.matchScope, "category");
  assertEquals(fallbackResult.cover.contextHash.length, 64);
  for (const field of ["confidence", "license", "licenseUrl", "artist", "pageId"]) {
    assertEquals(field in fallbackResult.cover, false);
  }
});

Deno.test("catalog fallback rejects missing, non-image and unrelated covers", async () => {
  await assertRejects(
    () => verifiedCatalogCover(input, [], () => Promise.reject(new Error("HTTP 404"))),
    Error,
    "HTTP 404",
  );
  await assertRejects(
    () =>
      verifiedCatalogCover(
        input,
        [],
        () => Promise.resolve(new TextEncoder().encode("<html>missing image</html>")),
      ),
    ServerError,
  );
  for (
    const fixture of [
      {
        ...input,
        title: "Wooden chair",
        description: "Dining furniture",
        postType: "thing",
      },
      { ...input, title: "Unidentified donation", description: "Details pending" },
      { ...input, postType: "fridge" },
    ]
  ) {
    await assertRejects(() =>
      verifiedCatalogCover(fixture, [], () => {
        throw new Error("Unrelated catalog must not be fetched");
      }), ServerError);
  }
});
