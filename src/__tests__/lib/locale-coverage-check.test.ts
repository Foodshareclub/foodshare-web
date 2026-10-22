import { join } from "bun:path";
/**
 * Tests for the locale-coverage guard.
 *
 * The guard exists because nine of the twenty-one shipped locales are almost
 * entirely byte-identical English, and neither `translations:check` nor
 * `check:catalogue` could say so in a form anybody could act on. So it is the
 * guard most in need of being seen to fail: a per-key ratchet that fires on the
 * wrong thing, or not at all, is worse than no ratchet, because it is trusted.
 *
 * Each case below breaks the property and asserts the gate names it. The script
 * is a top-level side effect, so only its pure functions are imported — the
 * arrangement `check-build-network.ts` already uses for `diagnose()`.
 */
import { describe, expect, it } from "bun:test";

import { findRegressions, leavesOf, measure, share } from "../../../scripts/check-locale-coverage";
import { LOCALES } from "../../../scripts/lib/catalogue-batch";

const MESSAGES = join(import.meta.dir, "..", "..", "..", "messages");

/**
 * Every catalogue, read once.
 *
 * `Bun.file().json()` parses as it reads, and reading up front means the
 * per-locale lookups below are map hits rather than repeated I/O.
 */
const CATALOGUES = new Map<string, Record<string, unknown>>(
  await Promise.all(
    LOCALES.map(
      async (locale) =>
        [locale, (await Bun.file(join(MESSAGES, `${locale}.json`)).json()) as Record<string, unknown>] as const,
    ),
  ),
);

const load = (locale: string): Record<string, unknown> => CATALOGUES.get(locale) ?? {};

type Coverage = {
  flatPresent: number;
  flatIdentical: number;
  nestedPresent: number;
  nestedIdentical: number;
};

const cover = (over: Partial<Coverage> = {}): Coverage => ({
  flatPresent: 10,
  flatIdentical: 2,
  nestedPresent: 10,
  nestedIdentical: 2,
  ...over,
});

describe("locale coverage — leaves", () => {
  it("finds the flat root keys", () => {
    expect(leavesOf({ password: "Password", email: "Email" })).toEqual([
      ["password", null],
      ["email", null],
    ]);
  });

  it("finds nested leaves and carries the path, not the value", () => {
    // The second slot is the path. An earlier version carried the English
    // *value* there, every nested lookup missed, and the whole namespaced half of
    // the catalogue reported as 0 present in all twenty locales — a clean,
    // plausible table, wrong in exactly one direction, which is the direction a
    // reviewer cannot check by eye.
    const reference = { Home: { hero: "Welcome" } };
    const leaves = leavesOf(reference);
    expect(leaves).toEqual([["Home", "hero"]]);

    expect(measure({ Home: { hero: "Willkommen" } }, reference, leaves)).toEqual({
      flatPresent: 0,
      flatIdentical: 0,
      nestedPresent: 1,
      nestedIdentical: 0,
    });
  });

  it("walks to the bottom, keeping the container and the full path apart", () => {
    // `profile.avatar.upload` must be read as `profile` → `avatar.upload`. An
    // earlier three-slot shape stored the *first* path segment where the
    // namespace belonged, so this was looked up as a top-level key named
    // `avatar`, and every nested leaf counted as absent.
    const reference = { profile: { avatar: { upload: "Upload" }, name: "Name" } };
    const leaves = leavesOf(reference);
    expect(leaves).toEqual([
      ["profile", "avatar.upload"],
      ["profile", "name"],
    ]);
    expect(measure({ profile: { avatar: { upload: "Hochladen" }, name: "Ihr Name" } }, reference, leaves)).toEqual({
      flatPresent: 0,
      flatIdentical: 0,
      nestedPresent: 2,
      nestedIdentical: 0,
    });
  });

  it("counts a flat root key as itself rather than as a path", () => {
    // The bug this catches: walking a flat key means indexing a string, which
    // returns undefined — so the flat half quietly reported 0 present while the
    // nested half looked perfectly healthy.
    const reference = { password: "Password" };
    expect(measure({ password: "Passwort" }, reference, leavesOf(reference))).toEqual({
      flatPresent: 1,
      flatIdentical: 0,
      nestedPresent: 0,
      nestedIdentical: 0,
    });
  });

  it("ignores non-string leaves", () => {
    expect(leavesOf({ count: 3, flag: true, list: ["a"], ns: { ok: "Yes", n: 1 } })).toEqual([["ns", "ok"]]);
  });
});

describe("locale coverage — measurement", () => {
  const reference = { password: "Password", Home: { hero: "Welcome" } };
  const leaves = leavesOf(reference);

  it("counts a byte-identical value in both the flat and nested halves", () => {
    expect(measure({ password: "Password", Home: { hero: "Welcome" } }, reference, leaves)).toEqual({
      flatPresent: 1,
      flatIdentical: 1,
      nestedPresent: 1,
      nestedIdentical: 1,
    });
  });

  it("counts a translated value as present and not identical", () => {
    expect(measure({ password: "Passwort", Home: { hero: "Willkommen" } }, reference, leaves)).toEqual({
      flatPresent: 1,
      flatIdentical: 0,
      nestedPresent: 1,
      nestedIdentical: 0,
    });
  });

  it("skips a key the locale does not carry at all", () => {
    // Missing is not identical. `translations:check` owns missing keys, and
    // counting them here would make a locale look *better* for being empty.
    expect(measure({}, reference, leaves)).toEqual({
      flatPresent: 0,
      flatIdentical: 0,
      nestedPresent: 0,
      nestedIdentical: 0,
    });
  });

  it("skips a namespace the locale does not carry at all", () => {
    expect(measure({ password: "Passwort" }, reference, leaves).nestedPresent).toBe(0);
  });

  it("reports 0 for a locale with nothing in it rather than dividing by zero", () => {
    expect(share({ flatPresent: 0, flatIdentical: 0, nestedPresent: 0, nestedIdentical: 0 })).toBe(0);
  });
});

describe("locale coverage — the gate", () => {
  it("passes when nothing changed", () => {
    const baseline = { de: cover(), sv: cover({ flatIdentical: 9, nestedIdentical: 9 }) };
    expect(findRegressions(baseline, structuredClone(baseline))).toEqual([]);
  });

  it("fails when a locale's identical share rises", () => {
    const baseline = { de: cover({ flatIdentical: 2 }) };
    const now = { de: cover({ flatIdentical: 6 }) };
    const [regression] = findRegressions(baseline, now);
    expect(regression).toContain("de");
    expect(regression).toContain("40.0% byte-identical to English, was 20.0%");
    // The flat/nested split is in the message because the split is the story:
    // a locale can be clean in the namespaces and English in the flat keys.
    expect(regression).toContain("flat 2/10 → 6/10");
  });

  it("fails when a partially translated locale reverts wholesale", () => {
    const baseline = { de: cover() };
    const now = { de: cover({ flatIdentical: 10, nestedIdentical: 10 }) };
    expect(findRegressions(baseline, now)).toHaveLength(1);
  });

  it("fails when a new locale arrives untranslated", () => {
    const [regression] = findRegressions(
      { de: cover() },
      { de: cover(), zz: cover({ flatIdentical: 10, nestedIdentical: 10 }) },
    );
    expect(regression).toContain("zz");
    expect(regression).toContain("new to this guard");
  });

  it("passes a new locale that is translated", () => {
    expect(findRegressions({ de: cover() }, { de: cover(), zz: cover() })).toEqual([]);
  });

  it("fails when the catalogue improves without the baseline being rewritten", () => {
    // The subtle one. An over-stated baseline is a silent hole in every future
    // gate: a later regression back to the recorded value would pass, and the
    // guard would have been reporting "green" the whole time.
    const baseline = { de: cover({ flatIdentical: 5, nestedIdentical: 5 }) };
    const [regression] = findRegressions(baseline, { de: cover() });
    expect(regression).toContain("re-run --write-baseline");
  });

  it("is not fooled by floating point", () => {
    const baseline = { de: cover({ flatIdentical: 3, nestedIdentical: 0 }) };
    // 3/20 vs 3/20 computed by different routes must not read as a change.
    expect(findRegressions(baseline, { de: cover({ flatIdentical: 3, nestedIdentical: 0 }) })).toEqual([]);
  });

  it("does not report a locale the baseline has never heard of when it is fine", () => {
    expect(findRegressions({}, { fr: cover() })).toEqual([]);
  });
});

describe("locale coverage — the shipped catalogues", () => {
  const reference = load("en");
  const leaves = leavesOf(reference);
  const others = ["de", "fr", "ja", "sv", "th", "ar", "it", "ru"];

  it("counts every string in the catalogue, flat and nested alike", () => {
    // Written as a comparison rather than a literal on purpose: this number moves
    // every time a namespace is added — `AuthFlow` alone was 48 keys in Phase 25 —
    // and a test that has to be edited each time is a test that will eventually be
    // "fixed" by loosening it.
    const flat = Object.entries(reference).filter(([, v]) => typeof v === "string").length;
    expect(leaves.filter((l) => l[1] === null)).toHaveLength(flat);
    expect(leaves.length).toBeGreaterThan(flat);
  });

  it("finds the namespaces present, so the nested half is not silently zero", () => {
    // `de` carries 9 of the 18 namespaces. A guard that reported 0 nested
    // present everywhere would look identical in the totals and be useless.
    const measured = measure(load("de"), reference, leaves);
    expect(measured.flatPresent).toBe(468);
    expect(measured.nestedPresent).toBeGreaterThan(200);
    expect(measured.flatPresent + measured.nestedPresent).toBeGreaterThan(700);
  });

  it("reports the nine untranslated locales and not the eleven translated ones", () => {
    const at = (locale: string) => share(measure(load(locale), reference, leaves));
    for (const locale of ["sv", "th", "ar", "hi", "it", "ko", "nl", "pl", "tr"])
      expect(at(locale)).toBeGreaterThanOrEqual(0.5);
    for (const locale of ["de", "es", "fr", "ja", "ru", "uk", "zh", "id", "pt", "vi", "cs"])
      expect(at(locale)).toBeLessThan(0.5);
  });

  it("agrees with the baseline the script gates on", async () => {
    const baseline = (await Bun.file(
      join(import.meta.dir, "..", "..", "..", "scripts", "check-locale-coverage-baseline.json"),
    ).json()) as Record<string, Coverage>;
    const actual = Object.fromEntries(others.map((locale) => [locale, measure(load(locale), reference, leaves)]));
    expect(findRegressions(baseline, actual)).toEqual([]);
  });
});
