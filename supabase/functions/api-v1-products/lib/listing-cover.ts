/** Listing covers are durable Supabase references, never temporary search URLs. */
import { RateLimitError, ServerError } from "../../_shared/errors.ts";
import { checkRateLimit, uploadImage } from "../../api-v1-images/lib/storage.ts";
import { downloadImage } from "../../_shared/image-utils.ts";
import {
  coverSearchContext,
  type ReferenceMatch,
  searchListingReference,
} from "./listing-cover-search.ts";
export { coverSearchContext } from "./listing-cover-search.ts";

export interface CoverInput {
  title: string;
  description?: string;
  postType: string;
  images: string[];
  excludePageIds?: number[];
  excludeUrls?: string[];
}
export interface CoverProvenance {
  kind: "reference";
  provider: "wikimedia-commons";
  model: string;
  contextHash: string;
  matchedAt: string;
  query: string;
  matchScope: "subject" | "category";
  confidence: number;
  sourcePageUrl: string;
  sourceImageUrl: string;
  pageId: number;
  license: string;
  licenseUrl: string;
  artist: string;
  disclosure: "Reference image; not a photograph of the listed item";
}
export function rasterType(bytes: Uint8Array): "png" | "jpeg" | "webp" {
  if (bytes.length < 12 || bytes.length > 5 * 1024 * 1024) {
    throw new ServerError("Cover has an invalid size");
  }
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) return "png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpeg";
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  throw new ServerError("Cover is not a supported raster image");
}
export interface CoverDependencies {
  quota(): Promise<boolean>;
  search(input: CoverInput): Promise<ReferenceMatch>;
  download(url: string): Promise<Uint8Array>;
  store(path: string, bytes: Uint8Array, contentType: string): Promise<string>;
  verify(url: string): Promise<Uint8Array>;
}
export async function ensureListingCover(
  input: CoverInput,
  userId: string,
  dependencies: CoverDependencies,
): Promise<{ images: string[]; cover?: CoverProvenance }> {
  if (input.images.length) return { images: input.images };
  if (!await dependencies.quota()) throw new RateLimitError("Cover search quota exceeded");
  const match = await dependencies.search(input);
  const bytes = await dependencies.download(match.candidate.imageUrl);
  const format = rasterType(bytes);
  const hex = (buffer: ArrayBuffer) =>
    [...new Uint8Array(buffer)].map((v) => v.toString(16).padStart(2, "0")).join("");
  const digest = hex(await crypto.subtle.digest("SHA-256", new Uint8Array(bytes)));
  const contextHash = hex(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(coverSearchContext(input))),
  );
  const path = `${userId}/reference-covers/${digest}.${format}`;
  const url = await dependencies.store(path, bytes, `image/${format}`);
  const readback = await dependencies.verify(url);
  if (hex(await crypto.subtle.digest("SHA-256", new Uint8Array(readback))) !== digest) {
    throw new ServerError("Cover public readback verification failed");
  }
  return {
    images: [url],
    cover: {
      kind: "reference",
      provider: "wikimedia-commons",
      model: match.model,
      contextHash,
      matchedAt: new Date().toISOString(),
      query: match.query,
      matchScope: match.scope,
      confidence: match.confidence,
      sourcePageUrl: match.candidate.sourcePageUrl,
      sourceImageUrl: match.candidate.imageUrl,
      pageId: match.candidate.pageId,
      license: match.candidate.license,
      licenseUrl: match.candidate.licenseUrl,
      artist: match.candidate.artist,
      disclosure: "Reference image; not a photograph of the listed item",
    },
  };
}
export async function createListingCover(
  input: CoverInput,
  userId: string,
  supabase: Parameters<typeof uploadImage>[0],
  _requestId: string,
  overrides?: Partial<CoverDependencies>,
) {
  const excludePageIds = input.excludePageIds ? [...input.excludePageIds] : [];
  const excludeUrls = input.excludeUrls ? [...input.excludeUrls] : [];

  // Query existing active covers to guarantee distinct photos and prevent duplicate placeholders
  if (
    excludePageIds.length === 0 && excludeUrls.length === 0 && supabase &&
    typeof (supabase as unknown as { from?: unknown }).from === "function"
  ) {
    try {
      const db = supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            eq: (col: string, val: unknown) => {
              limit: (
                n: number,
              ) => Promise<{ data?: Array<{ images?: unknown; metadata?: unknown }> }>;
            };
          };
        };
      };
      const { data: activePosts } = await db
        .from("posts")
        .select("images, metadata")
        .eq("is_active", true)
        .limit(200);

      if (activePosts) {
        for (const p of activePosts) {
          const meta = p.metadata as { cover?: { pageId?: unknown } } | undefined;
          const pageId = meta?.cover?.pageId;
          if (typeof pageId === "number") excludePageIds.push(pageId);
          if (Array.isArray(p.images)) {
            for (const img of p.images) {
              if (typeof img === "string") excludeUrls.push(img);
            }
          }
        }
      }
    } catch {
      // Non-fatal deduplication lookup
    }
  }

  const distinctInput: CoverInput = {
    ...input,
    excludePageIds,
    excludeUrls,
  };

  return await ensureListingCover(distinctInput, userId, {
    quota: overrides?.quota ?? (() => checkRateLimit(userId, supabase)),
    search: overrides?.search ?? ((context) => searchListingReference(context)),
    download: overrides?.download ?? downloadImage,
    store: overrides?.store ??
      (async (path, bytes, contentType) =>
        (await uploadImage(supabase, "food-images", path, bytes, contentType)).publicUrl),
    verify: overrides?.verify ?? downloadImage,
  });
}
