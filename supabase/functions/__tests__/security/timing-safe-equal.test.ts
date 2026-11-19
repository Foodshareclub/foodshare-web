/**
 * timingSafeEqual tests (F-024, Property 5: Constant-time compare)
 *
 * **Validates: Requirements 8.3**
 */
import { assertEquals } from "@std/assert";
import { timingSafeEqual } from "../../_shared/utils.ts";

Deno.test("timingSafeEqual: equal strings", () => {
  assertEquals(timingSafeEqual("secret-token", "secret-token"), true);
});

Deno.test("timingSafeEqual: different strings", () => {
  assertEquals(timingSafeEqual("secret-token", "other"), false);
  assertEquals(timingSafeEqual("secret-token", "secret-tokenX"), false);
});

Deno.test("timingSafeEqual: equal length differing only in last char", () => {
  assertEquals(timingSafeEqual("secret-tokeN", "secret-token"), false);
});

Deno.test("timingSafeEqual: empty strings", () => {
  assertEquals(timingSafeEqual("", ""), true);
  assertEquals(timingSafeEqual("", "a"), false);
  assertEquals(timingSafeEqual("a", ""), false);
});

Deno.test("timingSafeEqual: unicode", () => {
  assertEquals(timingSafeEqual("héllo🍎", "héllo🍎"), true);
  assertEquals(timingSafeEqual("héllo🍎", "héllo🍏"), false);
  assertEquals(timingSafeEqual("é", "e"), false);
});

Deno.test("Property 5: timingSafeEqual(a, b) === (a === b) over random pairs", () => {
  const alphabet = "abAB01-_é🍎\u0000";
  const chars = Array.from(alphabet);
  const rand = (n: number) => Math.floor(Math.random() * n);
  const str = (len: number) =>
    Array.from({ length: len }, () => chars[rand(chars.length)]).join("");
  for (let i = 0; i < 2000; i++) {
    const a = str(rand(12));
    let b: string;
    switch (i % 3) {
      case 0:
        b = str(rand(12));
        break;
      case 1:
        b = a;
        break;
      default: {
        // equal-length near-miss: change one character
        const arr = Array.from(a);
        if (arr.length > 0) arr[rand(arr.length)] = chars[rand(chars.length)];
        b = arr.join("");
      }
    }
    assertEquals(timingSafeEqual(a, b), a === b, `a=${JSON.stringify(a)} b=${JSON.stringify(b)}`);
  }
});
