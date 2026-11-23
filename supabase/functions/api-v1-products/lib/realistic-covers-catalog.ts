/**
 * Realistic covers catalog and deterministic resolver.
 * Maps food and community listings to authentic, high-quality photographic assets
 * stored in Supabase Storage (`food-images`) to eliminate artificial placeholder aesthetics.
 */

export const SUPABASE_STORAGE_BASE =
  "https://api.foodshare.club/storage/v1/object/public/food-images";

export interface RealisticCoverResult {
  url: string;
  path: string;
  subject: string;
  isRealisticCatalogCover: true;
}

/**
 * Catalogue of curated photographic covers hosted in Supabase Storage `food-images`.
 * Each subject contains multiple distinct photographic angles to prevent repetition.
 */
export const REALISTIC_COVERS_CATALOG: Record<string, string[]> = {
  banana: [
    "assets/covers/food/banana-1.jpg",
    "assets/covers/food/banana-2.jpg",
  ],
  apple: [
    "assets/covers/food/apple-1.jpg",
    "assets/covers/food/apple-2.jpg",
  ],
  bread: [
    "assets/covers/food/bread-1.jpg",
  ],
  produce: [
    "assets/covers/food/produce-1.jpg",
  ],
  pantry: [
    "assets/covers/food/pantry-1.jpg",
  ],
  fridge: [
    "assets/covers/fridge/fridge-1.jpg",
  ],
  food_fallback: [
    "assets/covers/food/produce-1.jpg",
    "assets/covers/food/bread-1.jpg",
    "assets/covers/food/apple-1.jpg",
    "assets/covers/food/banana-1.jpg",
  ],
  community_fallback: [
    "assets/covers/fridge/fridge-1.jpg",
    "assets/covers/food/produce-1.jpg",
  ],
};

/** Multilingual keyword dictionary mapping tokens to canonical subjects */
const SUBJECT_KEYWORDS: Record<string, string> = {
  // Bananas
  banana: "banana",
  bananas: "banana",
  банан: "banana",
  бананы: "banana",
  banane: "banana",
  bananes: "banana",
  plátano: "banana",
  plátanos: "banana",
  platano: "banana",
  platanos: "banana",

  // Apples
  apple: "apple",
  apples: "apple",
  яблоко: "apple",
  яблоки: "apple",
  apfel: "apple",
  äpfel: "apple",
  pomme: "apple",
  pommes: "apple",
  manzana: "apple",
  manzanas: "apple",

  // Breads & Bakery
  bread: "bread",
  brot: "bread",
  pain: "bread",
  хлеб: "bread",
  sourdough: "bread",
  loaf: "bread",
  baguette: "bread",
  pan: "bread",
  bakery: "bread",
  roll: "bread",
  bun: "bread",
  pastry: "bread",

  // Produce & Vegetables
  vegetable: "produce",
  vegetables: "produce",
  veggie: "produce",
  gemüse: "produce",
  овощи: "produce",
  tomato: "produce",
  tomatoes: "produce",
  carrot: "produce",
  carrots: "produce",
  potato: "produce",
  potatoes: "produce",
  salad: "produce",
  greens: "produce",
  fruit: "produce",
  produce: "produce",
  lemon: "produce",
  citrus: "produce",
  orange: "produce",

  // Pantry & Grains
  pantry: "pantry",
  pasta: "pantry",
  rice: "pantry",
  grain: "pantry",
  grains: "pantry",
  canned: "pantry",
  noodle: "pantry",
  noodles: "pantry",
  cereal: "pantry",
  beans: "pantry",

  // Fridge & Community
  fridge: "fridge",
  refrigerator: "fridge",
  kühlschrank: "fridge",
  холодильник: "fridge",
};

/** Deterministic string hashing for variant selection */
function hashText(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Resolves a photorealistic photographic cover URL from the storage catalog.
 * Guarantees a clean, non-placeholder photographic cover.
 */
export function resolveRealisticCover(input: {
  title: string;
  description?: string;
  postType?: string;
  postId?: number;
  excludeUrls?: string[];
  storageBaseUrl?: string;
}): RealisticCoverResult {
  const base = (input.storageBaseUrl || SUPABASE_STORAGE_BASE).replace(/\/+$/, "");
  const text = `${input.title || ""} ${input.description || ""}`.toLowerCase();

  // 1. Identify best-matching subject by keyword
  let matchedSubject: string | null = null;
  for (const [kw, subject] of Object.entries(SUBJECT_KEYWORDS)) {
    const pattern = new RegExp(`(^|[^a-z0-9äöüßéèêáàâñç])${kw}([^a-z0-9äöüßéèêáàâñç]|$)`, "i");
    if (pattern.test(text)) {
      matchedSubject = subject;
      break;
    }
  }

  // 2. Fall back to postType or default category
  if (!matchedSubject) {
    const postType = (input.postType || "food").toLowerCase();
    if (postType === "fridge") {
      matchedSubject = "fridge";
    } else if (postType === "food" || postType === "vegan" || postType === "foodbank") {
      matchedSubject = "food_fallback";
    } else {
      matchedSubject = "community_fallback";
    }
  }

  const pool = REALISTIC_COVERS_CATALOG[matchedSubject] || REALISTIC_COVERS_CATALOG.food_fallback;
  const excluded = new Set(input.excludeUrls || []);

  // 3. Select variant deterministically using postId or title hash
  const seed = Math.abs(input.postId != null ? input.postId : hashText(input.title || "food"));

  // Prefer candidate variants that haven't been used by adjacent listings
  const available = pool.filter((p) => !excluded.has(`${base}/${p}`));
  const candidatePool = available.length > 0 ? available : pool;

  const chosenPath = candidatePool[seed % candidatePool.length];
  const url = `${base}/${chosenPath}`;

  return {
    url,
    path: chosenPath,
    subject: matchedSubject,
    isRealisticCatalogCover: true,
  };
}
