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
  assorted: [
    "assets/covers/food/assorted-1.jpg",
    "assets/covers/food/assorted-2.jpg",
    "assets/covers/food/assorted-3.jpg",
    "assets/covers/food/assorted-4.jpg",
  ],
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
    "assets/covers/fridge/fridge-2.jpg",
  ],
  food_fallback: [
    "assets/covers/food/assorted-1.jpg",
    "assets/covers/food/produce-1.jpg",
    "assets/covers/food/assorted-2.jpg",
    "assets/covers/food/bread-1.jpg",
    "assets/covers/food/assorted-3.jpg",
    "assets/covers/food/apple-1.jpg",
    "assets/covers/food/assorted-4.jpg",
    "assets/covers/food/banana-1.jpg",
  ],
  community_fallback: [
    "assets/covers/food/assorted-1.jpg",
    "assets/covers/fridge/fridge-1.jpg",
    "assets/covers/food/assorted-2.jpg",
    "assets/covers/fridge/fridge-2.jpg",
  ],
};

/** Multilingual keywords identifying mixed grocery, food rescue, or miscellaneous hauls */
const HAUL_KEYWORDS = new Set([
  "verschiedenes",
  "alles",
  "lebensmittel",
  "gemischt",
  "gemischtes",
  "kiste",
  "korb",
  "spende",
  "tüte",
  "reste",
  "allerlei",
  "überraschung",
  "retter",
  "gerettete",
  "assorted",
  "various",
  "groceries",
  "grocery",
  "mixed",
  "haul",
  "box",
  "basket",
  "rescue",
  "bundle",
  "variety",
  "miscellaneous",
  "everything",
  "разное",
  "продукты",
  "набор",
  "пакет",
  "коробка",
  "еда",
  "divers",
  "varié",
  "variado",
  "varios",
]);

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
  brötchen: "bread",
  broetchen: "bread",
  bun: "bread",
  pastry: "bread",
  croissant: "bread",

  // Dairy & Cold Cuts
  dairy: "dairy",
  cheese: "dairy",
  käse: "dairy",
  kaese: "dairy",
  yogurt: "dairy",
  yoghurt: "dairy",
  jogurt: "dairy",
  joghurt: "dairy",
  milk: "dairy",
  milch: "dairy",
  butter: "dairy",
  aufschnitt: "dairy",

  // Produce & Vegetables
  vegetable: "produce",
  vegetables: "produce",
  veggie: "produce",
  gemüse: "produce",
  gemuese: "produce",
  obst: "produce",
  овощи: "produce",
  фрукты: "produce",
  tomato: "produce",
  tomatoes: "produce",
  tomate: "produce",
  tomaten: "produce",
  carrot: "produce",
  carrots: "produce",
  karotte: "produce",
  karotten: "produce",
  möhre: "produce",
  moehre: "produce",
  potato: "produce",
  potatoes: "produce",
  kartoffel: "produce",
  kartoffeln: "produce",
  salad: "produce",
  salat: "produce",
  greens: "produce",
  fruit: "produce",
  früchte: "produce",
  produce: "produce",
  lemon: "produce",
  citrus: "produce",
  orange: "produce",

  // Pantry & Grains
  pantry: "pantry",
  pasta: "pantry",
  nudeln: "pantry",
  rice: "pantry",
  reis: "pantry",
  grain: "pantry",
  grains: "pantry",
  canned: "pantry",
  konserve: "pantry",
  noodle: "pantry",
  noodles: "pantry",
  cereal: "pantry",
  beans: "pantry",
  bohnen: "pantry",

  // Fridge & Community
  fridge: "fridge",
  refrigerator: "fridge",
  kühlschrank: "fridge",
  kuehlschrank: "fridge",
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

/** 32-bit integer finalizer for uniform pseudo-random dispersion */
function fmix32(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
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

  // 1. Identify best-matching subject by keyword and multi-category detection
  let hasHaulKeyword = false;
  for (const kw of HAUL_KEYWORDS) {
    const pattern = new RegExp(
      `(^|[^a-z0-9äöüßéèêáàâñç])${kw}([^a-z0-9äöüßéèêáàâñç]|$)`,
      "i",
    );
    if (pattern.test(text)) {
      hasHaulKeyword = true;
      break;
    }
  }

  const matchedSubjects = new Set<string>();
  for (const [kw, subject] of Object.entries(SUBJECT_KEYWORDS)) {
    const pattern = new RegExp(
      `(^|[^a-z0-9äöüßéèêáàâñç])${kw}([^a-z0-9äöüßéèêáàâñç]|$)`,
      "i",
    );
    if (pattern.test(text)) {
      matchedSubjects.add(subject);
    }
  }

  let matchedSubject: string | null = null;
  // If multiple distinct categories or haul keyword, classify as 'assorted'
  if (hasHaulKeyword || matchedSubjects.size >= 2 || matchedSubjects.has("dairy")) {
    matchedSubject = "assorted";
  } else if (matchedSubjects.size === 1) {
    matchedSubject = Array.from(matchedSubjects)[0];
  }

  // 2. Fall back to postType or default category
  if (!matchedSubject) {
    const postType = (input.postType || "food").toLowerCase();
    if (postType === "fridge") {
      matchedSubject = "fridge";
    } else if (postType === "food" || postType === "vegan" || postType === "foodbank") {
      matchedSubject = "assorted";
    } else {
      matchedSubject = "community_fallback";
    }
  }

  const pool = REALISTIC_COVERS_CATALOG[matchedSubject] ||
    REALISTIC_COVERS_CATALOG.assorted;
  const excluded = new Set(input.excludeUrls || []);

  // 3. Select variant deterministically using postId and normalized title hash
  const normalizedTitle = (input.title || "food").trim().replace(/\s+/g, " ");
  const seed = fmix32(((input.postId ?? 0) + 2) ^ hashText(normalizedTitle));

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
