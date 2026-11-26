import { assertEquals, assertRejects } from "@std/assert";
import {
  partnerObjectPath,
  type PartnerPhotoDeps,
  partnerPhotoPath,
  resolvePartnerPhoto,
} from "../_shared/partner-sync/photo.ts";

const jpeg = (fill: number) => {
  const bytes = new Uint8Array(2048).fill(fill);
  bytes.set([0xff, 0xd8, 0xff], 0);
  return bytes;
};
const source = (over: Record<string, unknown> = {}) => ({
  attachment_id: "attNEW",
  filename: "fridge.jpg",
  size: 2048,
  url: "https://v5.airtableusercontent.com/new.jpg",
  ...over,
});
const stored = (over: Record<string, unknown> = {}) => ({
  attachment_id: "attOLD",
  filename: "old.jpg",
  size: 2048,
  sha256: "a".repeat(64),
  url: "https://api.test/storage/v1/object/public/posts/owner/partner-lacf/old.jpg",
  stored_at: "2026-11-26T00:00:00.000Z",
  ...over,
});

function deps(over: Partial<PartnerPhotoDeps> = {}): PartnerPhotoDeps {
  return {
    download: async () => jpeg(1),
    store: async (path) => `https://api.test/storage/v1/object/public/posts/${path}`,
    readback: async () => jpeg(1),
    ...over,
  };
}

Deno.test("a record with no photo clears ours and reports the old object", async () => {
  const result = await resolvePartnerPhoto({
    ownerId: "owner",
    attachment: null,
    currentImages: [stored().url],
    stored: stored(),
  }, deps());
  assertEquals(result.images, []);
  assertEquals(result.photo, null);
  assertEquals(result.replacedUrl, stored().url);
});

Deno.test("an unchanged attachment keeps the stored cover without a download", async () => {
  let downloads = 0;
  const result = await resolvePartnerPhoto(
    {
      ownerId: "owner",
      attachment: source({ attachment_id: "attOLD", filename: "old.jpg" }),
      currentImages: ["https://api.test/other.jpg", stored().url],
      stored: stored(),
    },
    deps({
      download: async () => {
        downloads++;
        return jpeg(1);
      },
    }),
  );
  assertEquals(downloads, 0);
  assertEquals(result.images, [stored().url]);
  assertEquals(result.photo, stored());
  assertEquals(result.replacedUrl, null);
});

Deno.test("a changed photo is downloaded, stored, read back and replaces ours", async () => {
  const seen: string[] = [];
  const result = await resolvePartnerPhoto(
    {
      ownerId: "owner",
      attachment: source(),
      currentImages: [stored().url],
      stored: stored(),
    },
    deps({
      download: async (url) => {
        seen.push(url);
        return jpeg(2);
      },
      store: async (path, _bytes, contentType) => {
        seen.push(`${path}|${contentType}`);
        return `https://api.test/storage/v1/object/public/posts/${path}`;
      },
      readback: async () => jpeg(2),
    }),
  );
  assertEquals(seen[0], "https://v5.airtableusercontent.com/new.jpg");
  const path = seen[1].split("|")[0];
  assertEquals(path.startsWith("owner/partner-lacf/"), true);
  assertEquals(path.endsWith(".jpeg"), true);
  assertEquals(seen[1].endsWith("|image/jpeg"), true);
  assertEquals(result.images.length, 1);
  assertEquals(
    result.images[0],
    `https://api.test/storage/v1/object/public/posts/${path}`,
  );
  assertEquals(result.photo?.attachment_id, "attNEW");
  assertEquals(result.photo?.url, result.images[0]);
  assertEquals(result.photo?.sha256.length, 64);
  assertEquals(result.replacedUrl, stored().url);
});

Deno.test("a readback that does not match the bytes is refused", async () => {
  await assertRejects(
    () =>
      resolvePartnerPhoto({
        ownerId: "owner",
        attachment: source(),
        currentImages: [],
        stored: null,
      }, deps({ readback: async () => jpeg(9) })),
    Error,
    "readback",
  );
});

Deno.test("a non-image body is refused", async () => {
  await assertRejects(
    () =>
      resolvePartnerPhoto({
        ownerId: "owner",
        attachment: source(),
        currentImages: [],
        stored: null,
      }, deps({ download: async () => new Uint8Array(2048).fill(65) })),
    Error,
    "raster",
  );
});

Deno.test("only partner-lacf objects are ever cleanup candidates", () => {
  assertEquals(
    partnerObjectPath(
      "https://api.test/storage/v1/object/public/posts/owner/partner-lacf/abc.jpg",
    ),
    "owner/partner-lacf/abc.jpg",
  );
  assertEquals(
    partnerObjectPath(
      "https://api.test/storage/v1/object/public/posts/owner/reference-covers/abc.jpg",
    ),
    null,
  );
  assertEquals(
    partnerPhotoPath("owner", "abc", "webp"),
    "owner/partner-lacf/abc.webp",
  );
});
