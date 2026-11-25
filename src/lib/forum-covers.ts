/**
 * Contextual cover resolver and legacy storage URL normalizer for Forum posts.
 * Guarantees every forum card, article detail page, OpenGraph card, and RSS item
 * renders a valid, topic-relevant cover image even when legacy Supabase Cloud URLs
 * return 402 or when editorial posts omit an explicit cover image.
 */

import { normalizeImageUrl } from "./image";

export const LEGACY_FORUM_SUPABASE_ORIGIN = "https://iazmjdjwnkilycbjwpzp.supabase.co";
export const CURRENT_FORUM_SUPABASE_ORIGIN = (
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://api.foodshare.club"
).replace(/\/$/, "");

export const FORUM_COVER_CATALOG = {
  food_waste: [
    "/assets/covers/forum/food-waste-lca.jpg",
    "/assets/covers/food/assorted-3.jpg",
    "/assets/covers/food/assorted-4.jpg",
  ],
  nutrition_diet: [
    "/assets/covers/food/produce-2.jpg",
    "/assets/covers/food/produce-1.jpg",
    "/assets/covers/food/assorted-1.jpg",
  ],
  plant_based: ["/assets/covers/food/meal-1.jpg", "/assets/covers/food/meal-2.jpg", "/assets/covers/food/pantry-1.jpg"],
  bakery_bread: [
    "/assets/covers/food/bread-1.jpg",
    "/assets/covers/food/pastry-1.jpg",
    "/assets/covers/food/pastry-2.jpg",
  ],
  community_app: [
    "/assets/covers/forum/community-sharing-app.jpg",
    "/assets/covers/fridge/fridge-1.jpg",
    "/assets/covers/fridge/fridge-2.jpg",
  ],
  sustainability: [
    "/assets/covers/forum/food-waste-lca.jpg",
    "/assets/covers/forum/community-sharing-app.jpg",
    "/assets/covers/food/assorted-2.jpg",
  ],
} as const satisfies Record<string, readonly string[]>;

type ForumTopic = keyof typeof FORUM_COVER_CATALOG;

const TOPIC_RULES: Array<{ topic: ForumTopic; keywords: readonly string[] }> = [
  {
    topic: "food_waste",
    keywords: [
      "food waste",
      "foodwaste",
      "life cycle",
      "lca",
      "scandal",
      "dumpster",
      "landfill",
      "surplus",
      "audit",
      "perishable",
      "compost",
      "fertilizer",
      "plastics",
      "packaging",
      "transparency",
    ],
  },
  {
    topic: "nutrition_diet",
    keywords: [
      "fruit",
      "veggies",
      "vegetables",
      "grains",
      "nuts",
      "seeds",
      "diet",
      "health benefits",
      "vitamins",
      "fiber",
      "banana",
      "bananas",
      "apple",
      "apples",
      "grocery",
      "market",
    ],
  },
  {
    topic: "plant_based",
    keywords: [
      "vegan",
      "plant-based",
      "vegetarian",
      "meat",
      "dairy",
      "milk",
      "burger",
      "protein",
      "pasta",
      "salad",
      "lentils",
      "broccoli",
      "mushroom",
      "asparagus",
      "seasteading",
      "animals",
    ],
  },
  {
    topic: "bakery_bread",
    keywords: ["bread", "dough", "bakery", "baker", "bakers", "panera", "pastry", "croissant", "sourdough"],
  },
  {
    topic: "community_app",
    keywords: [
      "foodshare",
      "product hunt",
      "mobile app",
      "next.js",
      "ios",
      "android",
      "community fridge",
      "community",
      "announcement",
      "release",
      "upgrade",
    ],
  },
];

export interface ForumCoverInput {
  id?: number | null;
  slug?: string | null;
  title?: string | null;
  description?: string | null;
  postType?: string | null;
  categorySlug?: string | null;
  imageUrl?: string | null;
}

function hashText(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function fmix32(h: number): number {
  let mixed = h ^ (h >>> 16);
  mixed = Math.imul(mixed, 0x85ebca6b);
  mixed ^= mixed >>> 13;
  mixed = Math.imul(mixed, 0xc2b2ae35);
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}

/**
 * Rewrites retired Supabase Cloud URLs (`iazmjdjwnkilycbjwpzp.supabase.co`) to the active
 * Supabase origin and validates that the resulting URL belongs to a configured image host.
 */
export function normalizeForumImageUrl(url: string | null | undefined): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;

  const rewritten = trimmed.startsWith(LEGACY_FORUM_SUPABASE_ORIGIN)
    ? `${CURRENT_FORUM_SUPABASE_ORIGIN}${trimmed.slice(LEGACY_FORUM_SUPABASE_ORIGIN.length)}`
    : trimmed;

  return normalizeImageUrl(rewritten);
}

/**
 * Deterministically selects a context-matched editorial cover path from local curated/generated
 * forum assets based on the post's title, description, slug, category, and post type.
 */
export function resolveForumCover(input: ForumCoverInput): string {
  const plainDesc = (input.description || "").replace(/<[^>]*>/g, " ");
  const searchable = `${input.title || ""} ${plainDesc} ${input.slug || ""} ${input.categorySlug || ""}`.toLowerCase();

  let matchedTopic: ForumTopic | null = null;
  let bestScore = 0;

  for (const rule of TOPIC_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (searchable.includes(kw)) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      matchedTopic = rule.topic;
    }
  }

  if (!matchedTopic) {
    const type = (input.postType || "").toLowerCase();
    if (type === "announcement" || type === "question") {
      matchedTopic = "community_app";
    } else if (type === "guide") {
      matchedTopic = "sustainability";
    } else {
      matchedTopic = "sustainability";
    }
  }

  const pool = FORUM_COVER_CATALOG[matchedTopic];
  // Prioritize the flagship curated image for strong primary topic hits (index 0),
  // and disperse across the pool cleanly when posts share general themes.
  const seed = fmix32(((input.id ?? 0) + 1) ^ hashText(input.slug || input.title || matchedTopic));
  return pool[seed % pool.length];
}

/**
 * Returns both the primary cover URL (rewriting retired hosts if present, otherwise falling
 * back directly to the contextual cover) and a guaranteed local contextual fallback URL.
 */
export function resolveForumCoverSources(input: ForumCoverInput): {
  primaryUrl: string;
  fallbackUrl: string;
  hasExplicitImage: boolean;
} {
  const fallbackUrl = resolveForumCover(input);
  const normalizedPrimary = normalizeForumImageUrl(input.imageUrl);
  return {
    primaryUrl: normalizedPrimary ?? fallbackUrl,
    fallbackUrl,
    hasExplicitImage: Boolean(normalizedPrimary),
  };
}
