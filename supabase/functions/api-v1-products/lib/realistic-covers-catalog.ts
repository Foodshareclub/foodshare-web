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
  subjectMatched: boolean;
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
  pastry: [
    "assets/covers/food/pastry-1.jpg",
    "assets/covers/food/pastry-2.jpg",
    "assets/covers/food/pastry-3.jpg",
  ],
  meal: [
    "assets/covers/food/meal-1.jpg",
    "assets/covers/food/meal-2.jpg",
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
    "assets/covers/food/produce-2.jpg",
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
    "assets/covers/food/pastry-1.jpg",
    "assets/covers/food/produce-1.jpg",
    "assets/covers/food/meal-1.jpg",
    "assets/covers/food/assorted-2.jpg",
    "assets/covers/food/bread-1.jpg",
    "assets/covers/food/pastry-2.jpg",
    "assets/covers/food/assorted-3.jpg",
    "assets/covers/food/meal-2.jpg",
    "assets/covers/food/apple-1.jpg",
    "assets/covers/food/produce-2.jpg",
    "assets/covers/food/assorted-4.jpg",
    "assets/covers/food/pastry-3.jpg",
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

  // Pastry & Sweet Bakes (Schnecken, Croissants, Cinnamon rolls, Danishes)
  schnecken: "pastry",
  schnecke: "pastry",
  ahorn: "pastry",
  walnuss: "pastry",
  walnut: "pastry",
  maple: "pastry",
  croissant: "pastry",
  croissants: "pastry",
  pastry: "pastry",
  pastries: "pastry",
  danish: "pastry",
  muffin: "pastry",
  muffins: "pastry",
  donut: "pastry",
  donuts: "pastry",
  gebäck: "pastry",
  gebaeck: "pastry",
  plunder: "pastry",
  cinnamon: "pastry",
  zimtschnecke: "pastry",
  bun: "pastry",
  buns: "pastry",
  brioche: "pastry",
  выпечка: "pastry",
  булочка: "pastry",
  булочки: "pastry",
  круассан: "pastry",
  круассаны: "pastry",

  // Prepared Meals, Traditional Dishes & Casseroles
  шуба: "meal",
  селедка: "meal",
  сельдь: "meal",
  запеканка: "meal",
  auflauf: "meal",
  casserole: "meal",
  suppe: "meal",
  soup: "meal",
  stew: "meal",
  gericht: "meal",
  mahlzeit: "meal",
  lasagna: "meal",
  lasagne: "meal",
  curry: "meal",
  blini: "meal",
  блины: "meal",

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
  fruechte: "produce",
  produce: "produce",
  lemon: "produce",
  citrus: "produce",
  orange: "produce",
  avocado: "produce",
  avocados: "produce",
  berries: "produce",
  beeren: "produce",

  // Pantry, Dry Staples & Grains
  pantry: "pantry",
  pasta: "pantry",
  nudeln: "pantry",
  rice: "pantry",
  reis: "pantry",
  grain: "pantry",
  grains: "pantry",
  canned: "pantry",
  konserve: "pantry",
  konserven: "pantry",
  noodle: "pantry",
  noodles: "pantry",
  cereal: "pantry",
  beans: "pantry",
  bohnen: "pantry",
  klöße: "pantry",
  kloesse: "pantry",
  salzstangen: "pantry",
  tüten: "pantry",
  tueten: "pantry",
  suppen: "pantry",
  suppenpulver: "pantry",
  flour: "pantry",
  mehl: "pantry",
  öl: "pantry",
  oil: "pantry",
  zucker: "pantry",
  sugar: "pantry",
  snack: "pantry",
  snacks: "pantry",
  chips: "pantry",
  lebensmittel: "pantry",

  // Fridge & Community
  fridge: "fridge",
  refrigerator: "fridge",
  kühlschrank: "fridge",
  kuehlschrank: "fridge",
  холодильник: "fridge",
};

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
  if (matchedSubjects.size === 1) {
    matchedSubject = Array.from(matchedSubjects)[0];
  } else if (
    matchedSubjects.size > 0 &&
    Array.from(matchedSubjects).every((s) => s === "pantry")
  ) {
    matchedSubject = "pantry";
  } else if (
    hasHaulKeyword ||
    matchedSubjects.size >= 2 ||
    matchedSubjects.has("dairy")
  ) {
    matchedSubject = "assorted";
  }

  const subjectMatched = matchedSubject !== null;
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

  const primaryPool = REALISTIC_COVERS_CATALOG[matchedSubject] ||
    REALISTIC_COVERS_CATALOG.assorted;
  const excluded = new Set(input.excludeUrls || []);

  // 3. Select variant deterministically using postId and normalized title hash
  const normalizedTitle = (input.title || "food").trim().replace(/\s+/g, " ");
  const seed = fmix32(((input.postId ?? 0) + 2) ^ hashText(normalizedTitle));

  // Prefer candidate variants that haven't been used by adjacent listings
  const availablePrimary = primaryPool.filter((p) => !excluded.has(`${base}/${p}`));
  if (availablePrimary.length > 0) {
    const chosenPath = availablePrimary[seed % availablePrimary.length];
    return {
      url: `${base}/${chosenPath}`,
      path: chosenPath,
      subject: matchedSubject,
      subjectMatched,
      isRealisticCatalogCover: true,
    };
  }

  // Relevance outranks variety: exhausting banana or fridge variants must
  // never substitute an unrelated meal, pastry, or other food photograph.
  const chosenPath = primaryPool[seed % primaryPool.length];
  const url = `${base}/${chosenPath}`;

  return {
    url,
    path: chosenPath,
    subject: matchedSubject,
    subjectMatched,
    isRealisticCatalogCover: true,
  };
}
