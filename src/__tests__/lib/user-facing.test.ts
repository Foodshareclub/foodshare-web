import { join } from "bun:path";
/**
 * Tests for the shared "is this user-facing English prose" predicates, and for
 * the two guards that use them.
 *
 * These rules were copied into a second guard and shared out, because a copy in
 * two files is a copy that drifts — and drift here is silent. The text guard
 * already had this bug once, in a form worth remembering: `PROPER_NOUN` was
 * `^\p{Lu}?\s*\p{Lu}\s*$` in its first version, which matches "Save", "Share"
 * and "Cancel", so the single-word majority of what the guard exists to find was
 * silently forgiven and the guard reported a fraction of the real number. Every
 * predicate below has a test for the string it must *not* forgive, because that
 * is the direction the failure is invisible in.
 */
import { describe, expect, it } from "bun:test";

import { isUserFacing } from "../../../scripts/lib/user-facing";

describe("user-facing — prose is prose", () => {
  const report = [
    "Welcome back",
    "Don't have an account?",
    "Enter your password",
    "By continuing, you agree to FoodShare's Terms of Service",
    "At least 8 characters",
    "The link you followed has expired",
  ];

  for (const value of report)
    it(`reports ${JSON.stringify(value)}`, () => {
      expect(isUserFacing(value)).toBe(true);
    });

  it("reports a single ordinary word, which the old PROPER_NOUN forgave", () => {
    for (const value of ["Save", "Share", "Cancel", "Delete", "Refresh", "Loading..."])
      expect(isUserFacing(value), `${value} must be reported`).toBe(true);
  });
});

describe("user-facing — what is deliberately forgiven", () => {
  it("forgives nothing with no letters", () => {
    for (const value of ["", "123", "1/2", "→", "·", "#"]) expect(isUserFacing(value)).toBe(false);
  });

  it("forgives a symbol run", () => {
    for (const value of ["⌘K", "«»", "→ ↓", "…"]) expect(isUserFacing(value)).toBe(false);
  });

  it("forgives a keycap, and accepts the cost of the bound that does it", () => {
    // The bound is the point: "ESC" is a key hint. Its cost is that a three-letter
    // all-caps word is forgiven too, and "NEW" is the honest example of that. A
    // wider bound would forgive "SAVE" and every other all-caps word, which is a
    // much larger and much more common loss. The cost is stated here so that
    // raising the bound later is a decision and not a convenience.
    expect(isUserFacing("ESC")).toBe(false);
    expect(isUserFacing("⌘⇧Z")).toBe(false);
    expect(isUserFacing("NEW")).toBe(false); // the accepted cost
    expect(isUserFacing("SAVE")).toBe(true);
    expect(isUserFacing("NEWER")).toBe(true);
  });

  it("does not forgive a word that merely ends in a full stop or a hyphen", () => {
    // The second version of `NAMED_SHAPE` used a bare `[.-]`, so every word
    // *ending* in punctuation matched and "Loading...", "Saving..." and "Delete."
    // were all forgiven. A name has the separator with letters on both sides.
    expect(isUserFacing("Loading...")).toBe(true);
    expect(isUserFacing("Saving...")).toBe(true);
    expect(isUserFacing("Delete.")).toBe(true);
    expect(isUserFacing("Ko-fi")).toBe(false);
    expect(isUserFacing("Next.js")).toBe(false);
  });

  it("forgives a brand as a whole value", () => {
    for (const value of ["Ko-fi", "Next.js", "GitHub", "Foodlytics"])
      expect(isUserFacing(value), `${value} must be forgiven`).toBe(false);
  });

  it("forgives a phrase made only of loanwords and nouns", () => {
    // The word-by-word form is what makes `alt="FoodShare logo"` forgivable
    // without also forgiving every brand-plus-noun phrase in the app.
    for (const value of ["FoodShare logo", "Google", "GitHub avatar", "Sentry", "PDF icon", "Telegram"])
      expect(isUserFacing(value), `${value} must be forgiven`).toBe(false);

    // …and a brand plus an English noun is still prose, because the noun is.
    // `alt="User avatar"` needs translating in all 21 locales, and forgiving it
    // because the second word happens to be loanword-shaped would forgive every
    // "Upload icon" and "Message image" in the app too.
    for (const value of ["User avatar", "Upload icon", "Message image"])
      expect(isUserFacing(value), `${value} must be reported`).toBe(true);
  });

  it("does not forgive a brand run into a sentence", () => {
    // The case the word-by-word rule most needs to catch, and the reason it
    // requires the value to be words-and-separators only.
    expect(isUserFacing("FoodShare logo. Sign in to continue.")).toBe(true);
    expect(isUserFacing("Uploaded to FoodShare by Ada")).toBe(true);
    expect(isUserFacing("Share on Facebook, or copy the link")).toBe(true);
  });

  it("forgives anything inside an svg", () => {
    // A `<title>` inside a `<svg>` is part of a drawing, and translating it
    // changes the drawing rather than the copy.
    expect(isUserFacing("Close", { insideSvg: true })).toBe(false);
    expect(isUserFacing("Close")).toBe(true);
  });

  it("only forgives a single-token proper noun for a whole value", () => {
    // An attribute is a complete label, so it gets the exemption. A fragment in
    // the middle of a sentence does not — the word "GitHub" inside prose is part
    // of prose that needs translating around it.
    expect(isUserFacing("GitHub", { wholeValue: true })).toBe(false);
    expect(isUserFacing("GitHub", { wholeValue: false })).toBe(true);
  });
});

describe("the two guards agree", () => {
  /**
   * The shared module is only worth having if both guards really do exclude the
   * same things. `check-i18n-text.ts` was refactored onto `isUserFacing`, so a
   * change to the predicates that made one guard report a string the other
   * forgives — or worse, vice versa — would be a change in what the repo knows.
   */
  it("check-i18n-text uses the shared predicates, not its own copy", async () => {
    const source = await Bun.file(join(import.meta.dir, "..", "..", "..", "scripts", "check-i18n-text.ts")).text();
    expect(source).toContain('from "./lib/user-facing"');
    // The local copies must be gone, or the sharing is theatre.
    expect(source).not.toContain("const PROPER_NOUN");
    expect(source).not.toContain("const SYMBOLIC");
    expect(source).not.toContain("const KEYCAP");
    expect(source).toContain("isUserFacing(");
  });

  it("check-i18n-attributes uses the same predicates", async () => {
    const source = await Bun.file(
      join(import.meta.dir, "..", "..", "..", "scripts", "check-i18n-attributes.ts"),
    ).text();
    expect(source).toContain('from "./lib/user-facing"');
    expect(source).not.toContain("const PROPER_NOUN");
    expect(source).toContain("isUserFacing(");
  });
});
