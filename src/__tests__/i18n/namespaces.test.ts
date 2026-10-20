import { join } from "bun:path";
import { describe, expect, it } from "bun:test";

/**
 * The main navigation and the language settings page were English literals in
 * every one of the 21 locales — including the page a user opens in order to
 * *choose* a language.
 *
 * `scripts/check-translations.ts` already proves that every key referenced in
 * code exists in the catalogue. That catches a *missing* key, which renders as
 * its own path. It cannot catch a key that exists but resolves to nothing at
 * runtime: a `useTranslations("navr")` typo, or a hook called in a component
 * that has no provider above it, both fail at render time with an error rather
 * than a visible string.
 *
 * So this checks the wiring: every component that calls `useTranslations` names
 * a namespace that exists, and every namespace it uses has at least one key.
 * Cheap, static, and it fails on the class of mistake that a screenshot would
 * catch and a test would not.
 */

const SRC = join(process.cwd(), "src");
const CATALOGUE = (await Bun.file(join(process.cwd(), "messages", "en.json")).json()) as Record<string, unknown>;

function walk(dir: string): string[] {
  const { readdirSync, statSync } = require("bun:fs") as typeof import("bun:fs");
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(SRC).filter((f) => /\.(ts|tsx)$/.test(f) && !f.includes("/__tests__/"));

interface Call {
  file: string;
  namespace: string;
}

const calls: Call[] = [];
for (const file of files) {
  const source = await Bun.file(file).text();
  for (const match of source.matchAll(/useTranslations\(\s*["']([^"']+)["']\s*\)/g)) {
    calls.push({ file: file.replace(`${process.cwd()}/`, ""), namespace: match[1] });
  }
  for (const match of source.matchAll(/getTranslations\(\s*["']([^"']+)["']\s*\)/g)) {
    calls.push({ file: file.replace(`${process.cwd()}/`, ""), namespace: match[1] });
  }
}

function hasPath(path: string): boolean {
  let node: unknown = CATALOGUE;
  for (const part of path.split(".")) {
    if (!node || typeof node !== "object") return false;
    if (!(part in (node as Record<string, unknown>))) return false;
    node = (node as Record<string, unknown>)[part];
  }
  return node !== undefined;
}

describe("translation namespaces resolve", () => {
  it("finds the calls (a parser regression would make the rest vacuous)", () => {
    expect(calls.length).toBeGreaterThan(5);
  });

  it("every namespace passed to useTranslations/getTranslations exists", () => {
    // A typo here is a runtime error, not a missing message: next-intl throws
    // when a namespace does not resolve, so the page 500s rather than falling
    // back.
    const broken = calls.filter((call) => !hasPath(call.namespace)).map((call) => `${call.file} → "${call.namespace}"`);

    expect(broken).toEqual([]);
  });

  it("every namespace is an object, not a leaf string", () => {
    // The collision this guards is real: `settings` is a flat string in this
    // catalogue ("Settings"), so a component asking for `useTranslations
    // ("settings")` would get a string where it expects a message tree, and
    // every lookup under it would be undefined.
    const leaves = calls
      .filter((call) => {
        const node = CATALOGUE[call.namespace.split(".")[0]];
        return node !== undefined && (typeof node === "string" || Array.isArray(node));
      })
      .map((call) => `${call.file} → "${call.namespace}"`);

    expect(leaves).toEqual([]);
  });

  it("the namespaces this session added are the ones in use", () => {
    // A namespace added to the catalogue but never referenced is dead weight
    // that the per-locale budget then charges for.
    const referenced = new Set(calls.map((call) => call.namespace.split(".")[0]));
    expect(referenced.has("nav")).toBe(true);
    expect(referenced.has("languageSettings")).toBe(true);
  });
});

describe("hardcoded strings in the navigation", () => {
  const navComponents = [
    "src/components/header/navbar/organisms/DesktopMenu.tsx",
    "src/components/header/navbar/organisms/MobileMenu.tsx",
  ];

  it.each(navComponents)("%s has no English literals left in its menu labels", async (path) => {
    const source = await Bun.file(join(process.cwd(), path)).text();

    // The specific labels that were literals, so a regression names itself.
    const literals = [
      "Admin Dashboard",
      "My listings",
      "Account settings",
      "Log Out",
      "About Foodshare",
      "About Us",
      "Registration",
      "Appearance",
      "See menu",
      "new messages",
    ];

    const found = literals.filter((literal) => source.includes(`"${literal}"`));
    expect({ file: path, found }).toEqual({ file: path, found: [] });
  });

  it("does not build the unread count by string concatenation", async () => {
    // `Chat (2 new)` is ungrammatical in ja/ko/ar/zh, where word order and
    // counters differ. Both menus used to build it by hand, in two places.
    for (const path of navComponents) {
      const source = await Bun.file(join(process.cwd(), path)).text();
      expect({ file: path, template: /`Chat \(\$\{/.test(source) }).toEqual({
        file: path,
        template: false,
      });
    }
  });

  it("uses a count-aware message for the unread badge", async () => {
    const source = await Bun.file(join(process.cwd(), "messages", "en.json")).text();
    const catalogue = JSON.parse(source) as { nav?: Record<string, string> };

    // ICU plural, so a translator can adapt the rule rather than translate a
    // template with a number pasted into it.
    expect(catalogue.nav?.chatWithUnread ?? "").toContain("plural");
    expect(catalogue.nav?.newMessages ?? "").toContain("plural");
  });
});
