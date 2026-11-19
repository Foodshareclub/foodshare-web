/**
 * Image upload path tests.
 *
 * Two regressions are covered:
 *   * `customPath` was passed straight to storage, letting one account name
 *     another account's object (or a shared template) and overwrite it.
 *   * The `assets` bucket, which holds email templates, was client-writable.
 */

import { assertEquals } from "@std/assert";
import {
  CLIENT_WRITABLE_BUCKETS,
  isClientWritableBucket,
  scopedUploadPath,
  uploadImage,
} from "../api-v1-images/lib/storage.ts";

const USER = "11111111-1111-1111-1111-111111111111";

Deno.test("image-paths: generated paths live under the user prefix", () => {
  const path = scopedUploadPath(USER, null, "jpeg");
  assertEquals(path.startsWith(`${USER}/`), true);
  assertEquals(path.endsWith(".jpeg"), true);
});

Deno.test("image-paths: a path naming another account is re-prefixed", () => {
  const path = scopedUploadPath(USER, "other-user/avatar.png", "png");
  assertEquals(path, `${USER}/other-user/avatar.png`);
});

Deno.test("image-paths: traversal segments are discarded", () => {
  const path = scopedUploadPath(USER, "../../etc/passwd", "jpeg");
  assertEquals(path.startsWith(`${USER}/`), true);
  assertEquals(path.includes(".."), false);
  assertEquals(path.endsWith(".jpeg"), true);
});

Deno.test("image-paths: the extension is forced to the detected image format", () => {
  const path = scopedUploadPath(USER, `${USER}/confirmation.html`, "jpeg");
  assertEquals(path, `${USER}/confirmation.jpeg`);
});

Deno.test("image-paths: assets is not a client-writable bucket", () => {
  assertEquals(isClientWritableBucket("assets"), false);
  assertEquals(CLIENT_WRITABLE_BUCKETS.includes("assets"), false);
  assertEquals(isClientWritableBucket("food-images"), true);
});

Deno.test("image storage writes directly to Supabase and returns its canonical URL", async () => {
  const bytes = new Uint8Array([1, 2, 3]);
  const calls: string[] = [];
  const client = {
    storage: {
      from(bucket: string) {
        calls.push(bucket);
        return {
          upload(path: string, content: Uint8Array, options: { contentType: string }) {
            assertEquals(path, USER + "/test.png");
            assertEquals(content, bytes);
            assertEquals(options.contentType, "image/png");
            return Promise.resolve({ error: null });
          },
          getPublicUrl(path: string) {
            return {
              data: {
                publicUrl: "https://api.foodshare.club/storage/v1/object/public/" + bucket + "/" +
                  path,
              },
            };
          },
        };
      },
    },
  } as unknown as Parameters<typeof uploadImage>[0];
  const result = await uploadImage(client, "food-images", USER + "/test.png", bytes, "image/png");
  assertEquals(result.storage, "supabase");
  assertEquals(
    result.publicUrl,
    "https://api.foodshare.club/storage/v1/object/public/food-images/" + USER + "/test.png",
  );
  assertEquals(calls, ["food-images", "food-images"]);
});

Deno.test("image storage rejects failed Supabase writes", async () => {
  const client = {
    storage: {
      from() {
        return {
          upload() {
            return Promise.resolve({ error: { message: "fixture unavailable" } });
          },
        };
      },
    },
  } as unknown as Parameters<typeof uploadImage>[0];
  let failed = false;
  try {
    await uploadImage(client, "food-images", USER + "/test.png", new Uint8Array([1]), "image/png");
  } catch {
    failed = true;
  }
  assertEquals(failed, true);
});
