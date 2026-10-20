import { beforeAll, describe, expect, it } from "bun:test";
import { defaultLocale, locales } from "@/i18n/config";
import { loadMessagesWithFallback, mergeWithFallback } from "@/i18n/merge";

/**
 * next-intl's default `getMessageFallback` returns the *key path* for a missing
 * message, so an untranslated key renders literally on screen (a Portuguese user
 * saw `Chat.messages`). These tests pin the deep-merge that layers English
 * underneath every locale, and the invariants that make it safe.
 */

type Messages = Record<string, unknown>;

function flatKeys(obj: unknown, prefix = ""): string[] {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    return Object.entries(obj as Messages).flatMap(([k, v]) => flatKeys(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

function get(obj: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, part) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[part] : undefined),
      obj,
    );
}

describe("mergeWithFallback", () => {
  it("keeps a translated value over the fallback", () => {
    const merged = mergeWithFallback({ greeting: "Olá" }, { greeting: "Hello" });
    expect(merged.greeting).toBe("Olá");
  });

  it("fills a missing top-level key from the fallback", () => {
    const merged = mergeWithFallback({}, { greeting: "Hello" });
    expect(merged.greeting).toBe("Hello");
  });

  it("recurses into nested objects instead of replacing them", () => {
    // The whole point: a shallow spread would drop the translated `title` here.
    const merged = mergeWithFallback(
      { Chat: { title: "Conversas" } },
      { Chat: { title: "Chat", messages: "Messages", send: "Send" } },
    );
    expect(merged.Chat).toEqual({
      title: "Conversas",
      messages: "Messages",
      send: "Send",
    });
  });

  it("merges three levels deep", () => {
    const merged = mergeWithFallback({ a: { b: { c: "pt" } } }, { a: { b: { c: "en", d: "en-d" }, e: "en-e" } });
    expect(get(merged, "a.b.c")).toBe("pt");
    expect(get(merged, "a.b.d")).toBe("en-d");
    expect(get(merged, "a.e")).toBe("en-e");
  });

  it("lets a locale array replace the fallback rather than merge by index", () => {
    const merged = mergeWithFallback({ items: ["um", "dois"] }, { items: ["one", "two", "three"] });
    // Index-aligned merging would produce a mixed-language array.
    expect(merged.items).toEqual(["um", "dois"]);
  });

  it("treats an explicit null in the locale as a deliberate override", () => {
    const merged = mergeWithFallback({ a: null }, { a: "Hello" });
    expect(merged.a).toBeNull();
  });

  it("does not mutate either input", () => {
    const localeMessages = { Chat: { title: "Conversas" } };
    const fallbackMessages = { Chat: { title: "Chat", messages: "Messages" } };
    mergeWithFallback(localeMessages, fallbackMessages);
    expect(localeMessages).toEqual({ Chat: { title: "Conversas" } });
    expect(fallbackMessages).toEqual({
      Chat: { title: "Chat", messages: "Messages" },
    });
  });

  it("returns the default locale catalog unchanged (no needless copy)", async () => {
    const en = await loadMessagesWithFallback(defaultLocale);
    const raw = (await import("../../../messages/en.json")).default;
    expect(en).toEqual(raw);
  });
});

describe("every locale resolves every English key", () => {
  let enKeys: string[] = [];

  beforeAll(async () => {
    enKeys = flatKeys((await import("../../../messages/en.json")).default).sort();
  });

  it("English is the reference catalog", () => {
    expect(enKeys.length).toBeGreaterThan(500);
  });

  for (const locale of locales) {
    if (locale === defaultLocale) continue;

    it(`${locale} has no unresolved keys after merging`, async () => {
      const merged = await loadMessagesWithFallback(locale);

      // next-intl renders the key path itself when a key is absent, so an
      // absent key is a visible bug, not a cosmetic gap.
      const missing = enKeys.filter((key) => get(merged, key) === undefined);
      expect(missing).toEqual([]);
    });
  }
});
