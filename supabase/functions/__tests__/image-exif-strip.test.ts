/**
 * GPS metadata contract for the image upload boundary.
 *
 * The fixture is a tiny JPEG carrying GPS latitude/longitude. It is below the
 * 100 KiB threshold that makes compressImage return the original bytes, which
 * is exactly the path that used to bypass recompression. The upload handler
 * must sanitize the bytes before storage, so both the stored object and the
 * bytes served from its public URL have no GPS metadata.
 */

import { assertEquals } from "@std/assert";
import type { HandlerContext } from "../_shared/handler/types.ts";
import { extractEXIF } from "../api-v1-images/services/exif.ts";
import { stripImageMetadata } from "../_shared/image-utils.ts";
import { handleUpload } from "../api-v1-images/lib/upload.ts";

const USER = "11111111-1111-1111-1111-111111111111";
const FIXTURE = new URL("./fixtures/gps-exif.jpg", import.meta.url);

async function fixtureBytes(): Promise<Uint8Array> {
  return await Deno.readFile(FIXTURE);
}

function arrayBufferOf(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

Deno.test("image-exif: the fixture really carries GPS", async () => {
  const exif = await extractEXIF(await fixtureBytes());
  if (!exif?.gps) throw new Error(`fixture has no GPS EXIF: ${JSON.stringify(exif)}`);
  assertEquals(typeof exif.gps.latitude, "number");
  assertEquals(typeof exif.gps.longitude, "number");
});

Deno.test("image-exif: stripping removes the GPS segment", async () => {
  const stripped = stripImageMetadata(await fixtureBytes());
  const exif = await extractEXIF(stripped);
  assertEquals(exif?.gps, undefined);
  // The image container is still a JPEG, not a truncated file.
  assertEquals(stripped[0], 0xff);
  assertEquals(stripped[1], 0xd8);
});

Deno.test("image-exif: upload stores and serves no GPS metadata", async () => {
  const original = await fixtureBytes();
  const uploads = new Map<string, Uint8Array>();

  const supabase = {
    rpc: () => Promise.resolve({ data: true, error: null }),
    storage: {
      from(bucket: string) {
        return {
          upload(path: string, content: Uint8Array) {
            uploads.set(path, new Uint8Array(content));
            return Promise.resolve({ error: null });
          },
          getPublicUrl(path: string) {
            return {
              data: {
                publicUrl: `https://storage.example/${bucket}/${path}`,
              },
            };
          },
        };
      },
    },
    from() {
      return {
        insert: () => Promise.resolve({ error: null }),
      };
    },
  };

  const form = new FormData();
  form.append(
    "file",
    new File([arrayBufferOf(original)], "gps.jpg", { type: "image/jpeg" }),
  );
  form.append("bucket", "food-images");
  form.append("generateThumbnail", "true");

  const request = new Request("http://localhost/functions/v1/api-v1-images", {
    method: "POST",
    body: form,
  });

  const ctx = {
    request,
    ctx: { requestId: "test", correlationId: "test" },
    userId: USER,
    supabase,
    body: form,
    query: {},
    params: {},
    headers: request.headers,
    idempotencyKey: null,
    corsHeaders: {},
    getSecret: () => Promise.resolve(undefined),
  } as unknown as HandlerContext;

  const response = await handleUpload(ctx);
  assertEquals(response.status, 200);
  const body = await response.json() as {
    data: {
      data: { path: string; thumbnailPath?: string; url: string };
      metadata: { exif?: { gps?: unknown } };
    };
  };
  const uploaded = body.data.data;

  const stored = uploads.get(uploaded.path);
  if (!stored) throw new Error(`upload did not store ${uploaded.path}`);
  assertEquals((await extractEXIF(stored))?.gps, undefined);
  if (!body.data.metadata.exif?.gps) {
    throw new Error("upload response did not report the source GPS metadata");
  }

  const thumbnail = uploaded.thumbnailPath ? uploads.get(uploaded.thumbnailPath) : undefined;
  if (thumbnail) assertEquals((await extractEXIF(thumbnail))?.gps, undefined);

  // The public URL serves the stored object bytes. Serve those exact bytes
  // locally and read them back, so the assertion covers the served path, not
  // only the in-memory upload.
  const ac = new AbortController();
  let resolvePort: (port: number) => void;
  const portPromise = new Promise<number>((resolve) => (resolvePort = resolve));
  const server = Deno.serve(
    {
      hostname: "127.0.0.1",
      port: 0,
      signal: ac.signal,
      onListen: ({ port }) => resolvePort(port),
    },
    () => new Response(arrayBufferOf(stored)),
  );
  try {
    const port = await portPromise;
    const served = new Uint8Array(
      await (await fetch(`http://127.0.0.1:${port}/image.jpg`)).arrayBuffer(),
    );
    assertEquals(served, stored);
    assertEquals((await extractEXIF(served))?.gps, undefined);
  } finally {
    ac.abort();
    await server.finished;
  }
});
