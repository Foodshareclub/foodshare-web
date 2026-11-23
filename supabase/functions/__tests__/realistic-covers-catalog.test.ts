import { assertEquals, assertNotEquals } from "@std/assert";
import {
  resolveRealisticCover,
  SUPABASE_STORAGE_BASE,
} from "../api-v1-products/lib/realistic-covers-catalog.ts";

Deno.test("realistic catalog: keyword matching resolves correct food subjects", () => {
  const banana = resolveRealisticCover({ title: "Fresh Organic Bananas" });
  assertEquals(banana.subject, "banana");
  assertEquals(banana.url.includes("assets/covers/food/banana"), true);

  const apple = resolveRealisticCover({ title: "Red Apples from Tree" });
  assertEquals(apple.subject, "apple");
  assertEquals(apple.url.includes("assets/covers/food/apple"), true);

  const bread = resolveRealisticCover({ title: "Sourdough Bread Loaf" });
  assertEquals(bread.subject, "bread");
  assertEquals(bread.url.includes("assets/covers/food/bread"), true);

  const produce = resolveRealisticCover({ title: "Fresh Garden Tomatoes and Carrots" });
  assertEquals(produce.subject, "produce");
  assertEquals(produce.url.includes("assets/covers/food/produce"), true);

  const pantry = resolveRealisticCover({ title: "Dry Penne Pasta and Rice" });
  assertEquals(pantry.subject, "pantry");
  assertEquals(pantry.url.includes("assets/covers/food/pantry"), true);

  const fridge = resolveRealisticCover({ title: "Downtown Community Fridge", postType: "fridge" });
  assertEquals(fridge.subject, "fridge");
  assertEquals(fridge.url.includes("assets/covers/fridge/fridge"), true);
});

Deno.test("realistic catalog: multilingual keywords match accurately", () => {
  const ruBanana = resolveRealisticCover({ title: "Спелые бананы" });
  assertEquals(ruBanana.subject, "banana");

  const deApple = resolveRealisticCover({ title: "Frische Äpfel" });
  assertEquals(deApple.subject, "apple");

  const frBread = resolveRealisticCover({ title: "Pain artisanal frais" });
  assertEquals(frBread.subject, "bread");

  const esApple = resolveRealisticCover({ title: "Manzanas rojas" });
  assertEquals(esApple.subject, "apple");
});

Deno.test("realistic catalog: deterministic postId seed selects different variants", () => {
  const variant1 = resolveRealisticCover({ title: "Banana", postId: 0 });
  const variant2 = resolveRealisticCover({ title: "Banana", postId: 1 });
  assertNotEquals(variant1.url, variant2.url);
  assertEquals(
    variant1.url.includes("banana-1.jpg") || variant1.url.includes("banana-2.jpg"),
    true,
  );
  assertEquals(
    variant2.url.includes("banana-1.jpg") || variant2.url.includes("banana-2.jpg"),
    true,
  );
});

Deno.test("realistic catalog: excludeUrls deduplication avoids recently used photos", () => {
  const first = resolveRealisticCover({ title: "Apples", postId: 0 });
  const second = resolveRealisticCover({
    title: "Apples",
    postId: 0,
    excludeUrls: [first.url],
  });

  assertNotEquals(first.url, second.url);
  assertEquals(first.url.includes("apple-1.jpg") || first.url.includes("apple-2.jpg"), true);
  assertEquals(second.url.includes("apple-1.jpg") || second.url.includes("apple-2.jpg"), true);
});

Deno.test("realistic catalog: unmatched titles fall back cleanly by postType without placeholders", () => {
  const food = resolveRealisticCover({ title: "Miscellaneous items", postType: "food" });
  assertEquals(food.isRealisticCatalogCover, true);
  assertEquals(food.url.startsWith(SUPABASE_STORAGE_BASE), true);

  const fridge = resolveRealisticCover({ title: "Shelter sharing", postType: "fridge" });
  assertEquals(fridge.subject, "fridge");
  assertEquals(fridge.url.startsWith(SUPABASE_STORAGE_BASE), true);
});

Deno.test("realistic catalog: multi-item and haul listings classify as assorted", () => {
  const multi1 = resolveRealisticCover({
    title: "Brot brötchen Aufschnitt Jogurt käse Obst gemüse alles eigentlich",
    postId: 2662,
  });
  assertEquals(multi1.subject, "assorted");
  assertEquals(multi1.url.includes("assets/covers/food/assorted"), true);

  const multi2 = resolveRealisticCover({
    title: "Brot,Gemüse.,Obst Abgelaufen alles",
    postId: 2659,
  });
  assertEquals(multi2.subject, "assorted");
  assertEquals(multi2.url.includes("assets/covers/food/assorted"), true);

  const haul = resolveRealisticCover({
    title: "Verschiedenes",
    postId: 2626,
  });
  assertEquals(haul.subject, "assorted");
  assertEquals(haul.url.includes("assets/covers/food/assorted"), true);
});

Deno.test("realistic catalog: target listings 2662, 2659, and 2626 resolve to mutually distinct covers", () => {
  const c2662 = resolveRealisticCover({
    title: "Brot brötchen Aufschnitt Jogurt käse Obst gemüse alles eigentlich",
    postId: 2662,
  });
  const c2659 = resolveRealisticCover({
    title: "Brot,Gemüse.,Obst Abgelaufen alles",
    postId: 2659,
  });
  const c2626 = resolveRealisticCover({
    title: "Verschiedenes",
    postId: 2626,
  });

  assertNotEquals(c2662.url, c2659.url);
  assertNotEquals(c2659.url, c2626.url);
  assertNotEquals(c2662.url, c2626.url);
});

Deno.test("realistic catalog: pastry and meal subjects resolve authentically", () => {
  const schnecke = resolveRealisticCover({
    title: "2 walnuss Ahorn schnecken",
    postId: 2618,
  });
  assertEquals(schnecke.subject, "pastry");
  assertEquals(schnecke.url.includes("assets/covers/food/pastry"), true);

  const shuba = resolveRealisticCover({
    title: "Сельдь под шубой",
    postId: 2726,
  });
  assertEquals(shuba.subject, "meal");
  assertEquals(shuba.url.includes("assets/covers/food/meal"), true);
});
