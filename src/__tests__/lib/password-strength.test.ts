/**
 * Tests for `scorePassword`.
 *
 * The scorer this replaced existed twice, and the two copies disagreed in a way a
 * reader could see: `Passw0rd!` was "Very Strong" in the sign-in modal and "Fair"
 * on the reset page — same password, same product, two answers. And the modal
 * scored `length >= 12` and lowercase, neither of which the product states
 * anywhere, while not checking the two rules the reset page printed as a
 * checklist.
 *
 * So the tests here are mostly about *invariants between the pieces* — the score
 * must equal the number of ticked rules, and the band must be a function of the
 * score — because an invariant is what a future edit breaks silently, and a table
 * of examples only catches the cases somebody remembered to write down.
 */
import { describe, expect, it } from "bun:test";

import { PASSWORD_RULES, type PasswordRuleId, scorePassword } from "@/lib/password-strength";

const met = (password: string): PasswordRuleId[] =>
  PASSWORD_RULES.filter((rule) => scorePassword(password).met[rule.id]).map((rule) => rule.id);

describe("password strength — the score is the number of rules met", () => {
  it("is zero for an empty password, and nothing else", () => {
    const result = scorePassword("");
    expect(result.score).toBe(0);
    expect(result.level).toBe("weak");
    expect(result.acceptable).toBe(false);
    expect(met("")).toEqual([]);
  });

  it("counts exactly the rules the checklist prints, for any password", () => {
    // The invariant the two old copies each broke in a different direction.
    const samples = [
      "",
      "a",
      "abcdefgh",
      "abcdefghijkl",
      "ABCDEFGH",
      "abc12345",
      "abc123!",
      "Passw0rd!",
      "Passw0rd!P@ssw0rd!P@ssw0rd!",
      "🔑🔑🔑🔑🔑🔑🔑🔑",
      "Ünïcödé Pässwörd!",
      "        ",
      "12345678",
      "!!!!!!!!",
    ];
    for (const password of samples) {
      const result = scorePassword(password);
      expect(result.score, `"${password}"`).toBe(PASSWORD_RULES.filter((rule) => result.met[rule.id]).length);
      expect(result.score, `"${password}"`).toBeGreaterThanOrEqual(0);
      expect(result.score, `"${password}"`).toBeLessThanOrEqual(4);
    }
  });

  it("never exceeds four, because there are four rules", () => {
    // A six-bar meter over six properties is what the modal had; a four-bar meter
    // over five properties is what the reset page had. Neither matched the other.
    expect(scorePassword("Passw0rd!P@ssw0rd!P@ssw0rd!").score).toBe(4);
  });

  it("does not score length >= 12, which the product never asks for", () => {
    // A 12-character password that satisfies nothing else scores the same as an
    // 8-character one. It used to score two points higher in the modal, which is
    // the whole reason one screen said "Very Strong" and the other said "Fair".
    expect(met("abcdefgh")).toEqual(["length"]);
    expect(met("abcdefghijkl")).toEqual(["length"]);
  });

  it("does not score lowercase, which the product never asks for either", () => {
    expect(met("abc12345")).toEqual(["length", "number"]);
  });
});

describe("password strength — the band follows the score", () => {
  it("maps each score to one band, monotonically", () => {
    const byScore = new Map<number, string>();
    // One sample per score, 0 through 4. `abc1234!` rather than `abc123!`: the
    // latter is seven characters, so it misses the length rule and lands on 2 —
    // which is itself a fair demonstration of the rule.
    for (const password of ["", "abcdefgh", "abc12345", "abc1234!", "Passw0rd!"]) {
      const result = scorePassword(password);
      const existing = byScore.get(result.score);
      if (existing) expect(existing, `score ${result.score} has two bands`).toBe(result.level);
      else byScore.set(result.score, result.level);
    }
    expect([...byScore.entries()].sort((a, b) => a[0] - b[0])).toEqual([
      [0, "weak"],
      [1, "weak"],
      [2, "fair"],
      [3, "good"],
      [4, "strong"],
    ]);
  });

  it("hands back a catalogue key, never an English word", () => {
    // The old scorers returned `label: "Weak"` as a literal, which is why the
    // label was English in 21 locales. The type has no room for a sentence now.
    for (const password of ["", "abc12345", "Passw0rd!"]) {
      const result = scorePassword(password);
      expect(result.labelKey).toBe(`strength.${result.level}`);
      expect(Object.keys(result)).not.toContain("label");
    }
  });
});

describe("password strength — agreement with what the server enforces", () => {
  it("accepts exactly what `passwordSchema` accepts", () => {
    // `passwordSchema` in src/app/actions/auth.ts is `.min(8)`. A meter that says
    // "unacceptable" for a password the server takes is a false claim, and the
    // old reset page had no such flag at all.
    expect(scorePassword("1234567").acceptable).toBe(false);
    expect(scorePassword("12345678").acceptable).toBe(true);
    expect(scorePassword("Passw0rd!").acceptable).toBe(true);
  });

  it("does not count an alphabet as a special character", () => {
    // `/[^A-Za-z0-9]/` treated every Cyrillic and CJK character as punctuation, so
    // `пароль123` scored 3 of 4 and a reader was told their password was "Good" on
    // the strength of its being written in a different alphabet. A test caught it.
    expect(met("пароль123")).toEqual(["length", "number"]);
    expect(met("密码密码密码123")).toEqual(["length", "number"]);
    // An actual punctuation mark still counts, in either script's neighbourhood.
    expect(met("пароль123!")).toEqual(["length", "number", "symbol"]);
    expect(met("abc 1234")).toEqual(["length", "number"]);
  });
});
