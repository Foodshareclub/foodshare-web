import { assertEquals } from "@std/assert";
import { validateProductImageUrls } from "../_shared/storage-urls.ts";

Deno.test("listing photo publication requires an available raster at the public storage URL", async () => {
  const previous = Deno.env.get("SUPABASE_PUBLIC_URL");
  Deno.env.set("SUPABASE_PUBLIC_URL", "https://api.foodshare.club");
  const url = "https://api.foodshare.club/storage/v1/object/public/posts/owner/photo.png";
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
  try {
    let calls = 0;
    const readback = (value: string) => {
      calls++;
      assertEquals(value, url);
      return Promise.resolve(png);
    };
    assertEquals(await validateProductImageUrls([url], readback), { valid: true });
    assertEquals(calls, 1);
    assertEquals(await validateProductImageUrls([], readback), { valid: true });
    assertEquals(calls, 1);
    for (
      const invalid of [
        "https://external.example/photo.png",
        "http://127.0.0.1/photo.png",
      ]
    ) {
      assertEquals(await validateProductImageUrls([invalid], readback), {
        valid: false,
        invalidUrls: [invalid],
      });
    }
    assertEquals(calls, 1); // Reject unsafe origins before connecting.
    const unavailable = () => Promise.reject(Error("HTTP 404: private diagnostic"));
    assertEquals(await validateProductImageUrls([url], unavailable), {
      valid: false,
      invalidUrls: [url],
    });
    for (
      const bytes of [
        new Uint8Array(),
        new TextEncoder().encode("<html>storage error</html>"),
        new TextEncoder().encode("%PDF-1.7 not an image"),
        new Uint8Array(10 * 1024 * 1024 + 1),
      ]
    ) {
      assertEquals(await validateProductImageUrls([url], () => Promise.resolve(bytes)), {
        valid: false,
        invalidUrls: [url],
      });
    }
    const ascii = (text: string) => new TextEncoder().encode(text);
    for (
      const bytes of [
        png,
        new Uint8Array([255, 216, 255, 224, 0, 0, 0, 0, 0, 0, 0, 0]),
        ascii("GIF89a000000"),
        ascii("GIF87a000000"),
        ascii("RIFF0000WEBP"),
        new Uint8Array([0, 0, 0, 20, ...ascii("ftypavif0000avif")]),
        new Uint8Array([0, 0, 0, 20, ...ascii("ftypheic0000mif1")]),
        new Uint8Array([0, 0, 0, 20, ...ascii("ftypmif10000heic")]),
      ]
    ) {
      assertEquals(await validateProductImageUrls([url], () => Promise.resolve(bytes)), {
        valid: true,
      });
    }
    for (
      const bytes of [
        ascii("RIFF0000WAVE"),
        new Uint8Array([0, 0, 0, 20, ...ascii("ftypmp420000isom")]),
        new Uint8Array([0, 0, 0, 99, ...ascii("ftypavif0000avif")]),
      ]
    ) {
      assertEquals(await validateProductImageUrls([url], () => Promise.resolve(bytes)), {
        valid: false,
        invalidUrls: [url],
      });
    }
  } finally {
    if (previous === undefined) Deno.env.delete("SUPABASE_PUBLIC_URL");
    else Deno.env.set("SUPABASE_PUBLIC_URL", previous);
  }
});
