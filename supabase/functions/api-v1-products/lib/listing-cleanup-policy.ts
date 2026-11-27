/**
 * The pure policy behind the listing cleanup & cover repair runner: which
 * rows are safe to delete, and what a repaired gallery should look like.
 *
 * It lives beside the edge functions, not in `scripts/`, so the functions'
 * type check covers it and the Deno test suite can import it. The runner
 * itself is a Deno entry point that resolves `@supabase/supabase-js` from the
 * repository root; that specifier does not resolve in the functions' import
 * map, so a test that imported the entry point would drag an unresolvable
 * module into the checked graph.
 */

export const CANONICAL_PUBLIC_PREFIX = "https://api.foodshare.club/storage/v1/object/public/";
export const LEGACY_SUPABASE_HOST = "iazmjdjwnkilycbjwpzp.supabase.co";
export const MAX_RETAINED_IMAGES = 3;

export const REVIEWED_TEST_IDS: ReadonlySet<number> = new Set([
  2406, // founder test "Lentils"
  2487, // founder test "Rice"
  2511, // founder test "Organic apples"
  2732, // founder test "Apple"
  2733, // founder test "Banana"
]);

export const REVIEWED_PROFILE_LISTING_IDS: ReadonlySet<number> = new Set([
  2494, // "Hassan " (empty description)
  2497, // "Rosa45" (empty description)
  2500, // "Nadia"
  2503, // "Vlad" / profile Vladimir
  2517, // "Ira Simon " / profile Ira
  2534, // "___sebo___"
  2551, // "Kai"
  2553, // "DanaVa"
  2572, // "Biene"
  2589, // "Huli"
  2608, // "Natalia Wolski"
  2621, // "Abras"
  2650, // "Eiliy "
  2660, // "(No Title)"
  2663, // "Aboja"
  2693, // "Tegsti "
  2720, // "(No Title)" / "need food"
  11591, // "Hollnagel "
]);

const DIRECTORY_TYPES = new Set(["foodbank", "fridge", "organisation"]);
const PEER_LISTING_TYPES = new Set(["food", "thing", "wanted", "borrow"]);

const SYNTHETIC_TEST_TITLES = new Set([
  "test",
  "test post",
  "test listing",
  "testing",
  "test item",
  "dummy",
  "sample",
  "sample listing",
  "asdf",
  "qwerty",
  "qa test",
  "delete me",
]);

export interface AuditPostRow {
  id: number;
  profile_id: string | null;
  post_name: string | null;
  post_description: string | null;
  post_type: string;
  images: unknown;
  metadata: Record<string, unknown> | null;
  version: number;
  is_active: boolean;
}

export interface AuditProfileRow {
  id: string;
  first_name?: string | null;
  second_name?: string | null;
  nickname?: string | null;
  email?: string | null;
}

export interface CleanupDecision {
  action: "delete" | "keep";
  reason?: string;
}

export type UrlHealth = "live_canonical" | "live_external" | "dead" | "placeholder";

function norm(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/\s+/g, " ") : "";
}

export function isCanonicalUrl(url: string): boolean {
  return url.startsWith(CANONICAL_PUBLIC_PREFIX);
}

export function isKnownDeadPlaceholderUrl(url: string): boolean {
  if (!url || typeof url !== "string") return true;
  if (!url.startsWith("https://") && !url.startsWith("http://")) return true;
  if (url.includes("/add_pics.webp") || url.endsWith("add_pics.webp")) {
    return true;
  }
  try {
    const parsed = new URL(url);
    if (parsed.hostname === LEGACY_SUPABASE_HOST) return true;
  } catch {
    return true;
  }
  return false;
}

export function classifyCleanupCandidate(
  post: AuditPostRow,
  profile?: AuditProfileRow | null,
): CleanupDecision {
  if (REVIEWED_TEST_IDS.has(post.id)) {
    return { action: "delete", reason: "reviewed_test_listing" };
  }
  if (REVIEWED_PROFILE_LISTING_IDS.has(post.id)) {
    return { action: "delete", reason: "reviewed_profile_as_listing" };
  }

  const title = norm(post.post_name);
  const descr = norm(post.post_description);
  const isDirectory = DIRECTORY_TYPES.has(norm(post.post_type));

  if (!isDirectory && (title === "" || title === "(no title)" || title === "no title")) {
    return { action: "delete", reason: "empty_or_no_title" };
  }

  if (!isDirectory && SYNTHETIC_TEST_TITLES.has(title) && (descr === "" || descr === title)) {
    return { action: "delete", reason: "synthetic_test_title" };
  }

  if (PEER_LISTING_TYPES.has(norm(post.post_type)) && profile && title.length > 0) {
    const first = norm(profile.first_name);
    const second = norm(profile.second_name);
    const full = norm([profile.first_name, profile.second_name].filter(Boolean).join(" "));
    const nick = norm(profile.nickname);
    const emailLocal = norm(profile.email?.split("@")[0]);
    const profileTokens = new Set(
      [first, second, full, nick, emailLocal].filter((t) => t.length >= 2),
    );
    const looksTruncatedDescr = descr === "" || descr === title ||
      (descr.length <= 30 && descr.endsWith(","));
    if (profileTokens.has(title) && looksTruncatedDescr) {
      return { action: "delete", reason: "profile_as_listing_exact_match" };
    }
  }

  return { action: "keep" };
}

export function archivedImageUrls(
  metadata: Record<string, unknown> | null | undefined,
  currentImages: string[],
): string[] {
  const existingArchive = Array.isArray(metadata?.cover_image_archive)
    ? metadata.cover_image_archive.filter((u): u is string => typeof u === "string")
    : [];
  return [...new Set([...existingArchive, ...currentImages])];
}

export interface GalleryRepairPlan {
  needsUpdate: boolean;
  nextImages: string[];
  nextMetadata: Record<string, unknown>;
  reason: string;
}

export async function planPostGalleryRepair(
  post: AuditPostRow,
  checkUrl: (url: string) => Promise<UrlHealth>,
  generateCover: (post: AuditPostRow) => Promise<{ images: string[]; cover?: unknown }>,
): Promise<GalleryRepairPlan> {
  const rawImages = Array.isArray(post.images)
    ? post.images.filter((u): u is string => typeof u === "string" && u.trim().length > 0)
    : [];
  const meta = (post.metadata ?? {}) as Record<string, unknown>;

  const healthEntries: Array<{ url: string; health: UrlHealth }> = [];
  for (const url of rawImages) {
    if (isKnownDeadPlaceholderUrl(url)) {
      healthEntries.push({ url, health: "placeholder" });
    } else {
      healthEntries.push({ url, health: await checkUrl(url) });
    }
  }

  const liveCanonical = healthEntries.filter((entry) => entry.health === "live_canonical").map((
    entry,
  ) => entry.url);
  const droppedOrDeadCount =
    healthEntries.filter((entry) => entry.health !== "live_canonical").length;

  const primary = healthEntries[0];
  if (primary && primary.health === "live_canonical") {
    if (droppedOrDeadCount === 0) {
      return {
        needsUpdate: false,
        nextImages: rawImages,
        nextMetadata: meta,
        reason: "already_canonical_clean",
      };
    }
    const nextImages = liveCanonical.slice(0, MAX_RETAINED_IMAGES);
    return {
      needsUpdate: true,
      nextImages,
      nextMetadata: {
        ...meta,
        cover_image_archive: archivedImageUrls(meta, rawImages),
      },
      reason: "pruned_non_canonical_or_dead_secondaries",
    };
  }

  // Primary is missing, external, placeholder, or dead.
  if (liveCanonical.length > 0) {
    const nextImages = liveCanonical.slice(0, MAX_RETAINED_IMAGES);
    return {
      needsUpdate: true,
      nextImages,
      nextMetadata: {
        ...meta,
        cover_image_archive: archivedImageUrls(meta, rawImages),
      },
      reason: "promoted_existing_canonical_cover",
    };
  }

  const generated = await generateCover(post);
  const primaryCover = generated.images[0];
  if (!primaryCover || !isCanonicalUrl(primaryCover)) {
    throw new Error(`Generated cover for post ${post.id} is not canonical`);
  }
  const nextImages = [...new Set([primaryCover, ...liveCanonical])].slice(0, MAX_RETAINED_IMAGES);
  return {
    needsUpdate: true,
    nextImages,
    nextMetadata: {
      ...meta,
      cover_image_archive: archivedImageUrls(meta, rawImages),
      ...(generated.cover ? { cover: generated.cover } : {}),
    },
    reason: "generated_or_fetched_canonical_cover",
  };
}
