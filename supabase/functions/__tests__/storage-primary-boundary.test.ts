import { assertEquals, assertThrows } from "@std/assert";
import { storagePublicUrl } from "../_shared/storage-public-url.ts";
import { parseStorageUrl } from "../_shared/storage-urls.ts";
Deno.test("public Storage URLs use the external API origin and encode object paths", () => {
  assertEquals(
    storagePublicUrl(
      "https://api.foodshare.club",
      "food-images",
      "user/my photo.png",
    ),
    "https://api.foodshare.club/storage/v1/object/public/food-images/user/my%20photo.png",
  );
  assertThrows(() => storagePublicUrl("http://kong:8000", "food-images", "user/a.png"));
  assertThrows(() =>
    storagePublicUrl(
      "https://user:password@api.foodshare.club",
      "food-images",
      "user/a.png",
    )
  );
  assertThrows(() => storagePublicUrl("https://api.foodshare.club", "food-images", "../a.png"));
});
Deno.test("application storage validation accepts Supabase and rejects R2 origins", async () => {
  const old = Deno.env.get("SUPABASE_PUBLIC_URL");
  Deno.env.set("SUPABASE_PUBLIC_URL", "https://api.foodshare.club");
  try {
    assertEquals(
      await parseStorageUrl(
        "https://api.foodshare.club/storage/v1/object/public/posts/user/a.png",
      ),
      { provider: "supabase", bucket: "posts", path: "user/a.png" },
    );
    assertEquals(
      await parseStorageUrl(
        "https://api.foodshare.club/storage/v1/object/public/food-images/user/a.png",
      ),
      { provider: "supabase", bucket: "food-images", path: "user/a.png" },
    );
    assertEquals(
      await parseStorageUrl("https://pub-test.r2.dev/posts/user/a.png"),
      null,
    );
    assertEquals(
      await parseStorageUrl(
        "https://api.foodshare.club:8443/storage/v1/object/public/posts/user/a.png",
      ),
      null,
    );
  } finally {
    if (old === undefined) Deno.env.delete("SUPABASE_PUBLIC_URL");
    else Deno.env.set("SUPABASE_PUBLIC_URL", old);
  }
});

Deno.test("orphan cleanup cannot delete R2 backup objects or their migration evidence", async () => {
  const { cleanupOrphanImages } = await import(
    "../api-v1-images/services/cleanup.ts"
  );
  let deletes = 0;
  const client = {
    rpc() {
      return Promise.resolve({
        data: [{
          metric_id: 123,
          bucket: "supabase-backups",
          path: "backups/protected.age",
          storage: "r2",
          compressed_size: 10,
          uploaded_at: new Date().toISOString(),
        }],
        error: null,
      });
    },
    from() {
      deletes++;
      throw Error("Metrics must be retained");
    },
    storage: {
      from() {
        deletes++;
        throw Error("Storage must remain untouched");
      },
    },
  } as unknown as Parameters<typeof cleanupOrphanImages>[0];
  const stats = await cleanupOrphanImages(client, { dryRun: false });
  assertEquals(stats.orphansDeleted, 0);
  assertEquals(stats.deleteFailed, 1);
  assertEquals(deletes, 0);
});
