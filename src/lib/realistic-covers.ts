/**
 * Realistic covers catalog and deterministic resolver for FoodShare web.
 * Provides authentic, high-resolution photography for listings without customer camera photos,
 * ensuring listings never look artificial or like placeholders.
 */

export const REALISTIC_COVERS_CATALOG: Record<string, string[]> = {
  banana: [
    "/assets/covers/food/banana-1.jpg",
    "/assets/covers/food/banana-2.jpg",
  ],
  apple: ["/assets/covers/food/apple-1.jpg", "/assets/covers/food/apple-2.jpg"],
  bread: ["/assets/covers/food/bread-1.jpg"],
  produce: ["/assets/covers/food/produce-1.jpg"],
  pantry: ["/assets/covers/food/pantry-1.jpg"],
  fridge: ["/assets/covers/fridge/fridge-1.jpg"],
  food_fallback: [
    "/assets/covers/food/produce-1.jpg",
    "/assets/covers/food/bread-1.jpg",
    "/assets/covers/food/apple-1.jpg",
    "/assets/covers/food/banana-1.jpg",
  ],
  community_fallback: [
    "/assets/covers/fridge/fridge-1.jpg",
    "/assets/covers/food/produce-1.jpg",
  ],
};

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

function hashText(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function resolveRealisticCover(input: {
  title: string;
  description?: string;
  postType?: string;
  postId?: number;
  excludeUrls?: string[];
}): string {
  const text = `${input.title || ""} ${input.description || ""}`.toLowerCase();

  let matchedSubject: string | null = null;
  for (const [kw, subject] of Object.entries(SUBJECT_KEYWORDS)) {
    const pattern = new RegExp(
      `(^|[^a-z0-9äöüßéèêáàâñç])${kw}([^a-z0-9äöüßéèêáàâñç]|$)`,
      "i",
    );
    if (pattern.test(text)) {
      matchedSubject = subject;
      break;
    }
  }

  if (!matchedSubject) {
    const postType = (input.postType || "food").toLowerCase();
    if (postType === "fridge") {
      matchedSubject = "fridge";
    } else if (
      postType === "food" ||
      postType === "vegan" ||
      postType === "foodbank"
    ) {
      matchedSubject = "food_fallback";
    } else {
      matchedSubject = "community_fallback";
    }
  }

  const pool =
    REALISTIC_COVERS_CATALOG[matchedSubject] ||
    REALISTIC_COVERS_CATALOG.food_fallback;
  const excluded = new Set(input.excludeUrls || []);

  const seed = Math.abs(
    input.postId != null ? input.postId : hashText(input.title || "food"),
  );
  const available = pool.filter((p) => !excluded.has(p));
  const candidatePool = available.length > 0 ? available : pool;

  return candidatePool[seed % candidatePool.length];
}
