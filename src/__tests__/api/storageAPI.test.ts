import { afterEach, expect, mock, test } from "bun:test";
let removeError: Error | null = null;
const remove = mock(async (_paths: string[]) => ({ error: removeError }));
const from = mock((bucket: string) => ({
  remove,
  getPublicUrl: (path: string) => ({
    data: { publicUrl: `https://api.foodshare.club/storage/v1/object/public/${bucket}/${path}` },
  }),
}));
mock.module("@/lib/supabase/client", () => ({ supabase: { storage: { from } } }));
const { storageAPI } = await import("@/api/storageAPI");
afterEach(() => {
  removeError = null;
  remove.mockClear();
  from.mockClear();
});
test("storage URL is always Supabase even if legacy R2 configuration exists", () => {
  const old = process.env.R2_ACCOUNT_ID;
  process.env.R2_ACCOUNT_ID = "legacy-fixture";
  try {
    expect(storageAPI.getPublicUrl({ bucket: "food-images", path: "user/photo.png" })).toBe(
      "https://api.foodshare.club/storage/v1/object/public/food-images/user/photo.png",
    );
  } finally {
    if (old === undefined) delete process.env.R2_ACCOUNT_ID;
    else process.env.R2_ACCOUNT_ID = old;
  }
});
test("deletion targets only the requested Supabase object", async () => {
  expect(await storageAPI.deleteImage({ bucket: "posts", path: "user/photo.png" })).toEqual({ error: null });
  expect(from).toHaveBeenCalledWith("posts");
  expect(remove).toHaveBeenCalledWith(["user/photo.png"]);
});
test("Supabase deletion failure reaches the caller", async () => {
  removeError = new Error("storage unavailable");
  expect((await storageAPI.deleteImage({ bucket: "posts", path: "user/photo.png" })).error).toBe(removeError);
});
