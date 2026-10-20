/**
 * Password strength: one scorer, and it counts the rules the product states.
 *
 * This module exists because two copies of this logic had drifted apart, and the
 * drift was visible to a reader:
 *
 * | | `PasswordStrength.tsx` (modal)            | `/auth/reset-password` (inline) |
 * | --- | --- | --- |
 * | properties scored | length≥8, length≥12, lower, upper, number, symbol | length≥8, length≥12, upper, number, symbol |
 * | maximum score     | 6, drawn as **6** bars                          | 5, drawn as **4** bars            |
 * | labels            | Weak · Medium · Strong · Very Strong           | Weak · Fair · Good · Strong       |
 *
 * So `Passw0rd!` was "Very Strong" in the modal and "Fair" on the reset page —
 * same password, same product, two answers. And the modal scored a property the
 * product never asked for, while *not* checking the two that the reset page
 * printed as a checklist beneath the meter. A meter and a checklist that can
 * disagree are not a design, they are two half-implementations.
 *
 * ## The rules are four, and the score is over those four
 *
 * `passwordSchema` in `src/app/actions/auth.ts` enforces **one** thing:
 * `length >= 8`. Uppercase, number and symbol are *advised* — the reset page
 * lists them, and nothing rejects a password without them. Scoring four rules
 * rather than six properties means the meter measures exactly what the checklist
 * beside it claims, so a reader who sees three of four ticks sees "Fair" and not
 * something invented.
 *
 * `length >= 12` was one of the six properties and is **not** one of the four
 * rules: nothing anywhere tells a reader their password should be twelve
 * characters, so scoring it would have inflated every password between 8 and 11
 * characters past the bar that the stated rules justify.
 *
 * The score is deliberately not a security metric. It is a progress indicator for
 * a person choosing a password, and it is labelled as such.
 */

export type StrengthLevel = "weak" | "fair" | "good" | "strong";

/** The four rules the product states, in the order the checklist prints them. */
export const PASSWORD_RULES = [
  { id: "length", labelKey: "rules.length" },
  { id: "uppercase", labelKey: "rules.uppercase" },
  { id: "number", labelKey: "rules.number" },
  { id: "symbol", labelKey: "rules.symbol" },
] as const satisfies ReadonlyArray<{ id: string; labelKey: `rules.${string}` }>;

export type PasswordRuleId = (typeof PASSWORD_RULES)[number]["id"];

/** How many of the four rules a password meets. Always 0–4. */
export type PasswordScore = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrength {
  score: PasswordScore;
  /** The band the score falls in. */
  level: StrengthLevel;
  /**
   * A catalogue key, not a word.
   *
   * "Weak" was an English literal in both copies, so the label was English in 21
   * locales. Handing back a key makes it impossible to render an untranslated
   * strength: the type has no room for a sentence.
   *
   * **Namespace-relative, deliberately.** Every caller reads it through
   * `useTranslations("AuthFlow")`, and next-intl resolves a fully-qualified key
   * passed to a namespaced `t` only because it is lenient — a relative key has
   * one reading. The first version of this returned `AuthFlow.strength.weak` and
   * rendered the literal text `AuthFlow.AuthFlow.strength.weak` under a mock
   * that was stricter than the library, which is a gap worth closing by not
   * relying on the leniency at all.
   */
  labelKey: `strength.${StrengthLevel}`;
  /** Tailwind class for the filled bars and the label. */
  color: string;
  /** One flag per stated rule, so the checklist cannot drift from the score. */
  met: Record<PasswordRuleId, boolean>;
  /** True when the server would accept this password: length ≥ 8. */
  acceptable: boolean;
}

const BANDS: Array<[PasswordScore, StrengthLevel, string]> = [
  [0, "weak", "bg-red-500"],
  [2, "fair", "bg-amber-500"],
  [3, "good", "bg-orange-500"],
  [4, "strong", "bg-emerald-500"],
];

const band = (score: PasswordScore): { level: StrengthLevel; color: string } => {
  const found = [...BANDS].reverse().find(([floor]) => score >= floor);
  // `BANDS` ends at 4 and `score` is 0–4, so this cannot be undefined; the cast
  // says so rather than inventing a fallback that would hide a future edit.
  const [, level, color] = found as [PasswordScore, StrengthLevel, string];
  return { level, color };
};

/**
 * Score a password against the four stated rules.
 *
 * **`uppercase` is ASCII-only, deliberately** — `[A-Z]` is what the sign-up
 * checklist tests, and a scorer that disagreed with the checklist about which
 * letters count would be the same class of defect as two scorers disagreeing with
 * each other. The consequence is that a password of only non-Latin letters is not
 * credited with an uppercase letter it does not have, which is the safe direction
 * to be wrong in.
 *
 * **`symbol` is Unicode-aware, and it started out ASCII too.** `/[^A-Za-z0-9]/`
 * counts every Cyrillic or CJK character as a "special character", so `пароль123`
 * scored 3 of 4 and a reader was told their password was "Good" on the strength
 * of its being in a different alphabet. A test caught it. The rule now means what
 * it says: a character that is not a letter, not a digit, and not whitespace —
 * `!`, `@`, `#`, `-`, and nothing else. `[\p{L}\p{N}\s]` rather than an explicit
 * symbol list, so a script nobody thought of does not need adding to it.
 */
export function scorePassword(password: string): PasswordStrength {
  const met: Record<PasswordRuleId, boolean> = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^\p{L}\p{N}\s]/u.test(password),
  };

  const score = PASSWORD_RULES.reduce<number>((total, rule) => total + (met[rule.id] ? 1 : 0), 0) as PasswordScore;
  const { level, color } = band(score);

  return {
    score,
    level,
    labelKey: `strength.${level}`,
    color,
    met,
    acceptable: met.length,
  };
}
