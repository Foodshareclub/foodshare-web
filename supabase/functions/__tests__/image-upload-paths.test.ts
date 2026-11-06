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
