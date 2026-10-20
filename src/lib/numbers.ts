/**
 * Number formatting utilities.
 *
 * Canonical home for the locale-aware formatters used by any page that renders
 * a count. Extracted from `src/app/page.tsx`, which had them as module-local
 * functions, when `/donation` needed the identical formatter for its impact
 * stat — two copies of `new Intl.NumberFormat(locale, { notation: "compact" })`
 * would be two places for the separator convention to drift.
 *
 * Every formatter here takes the **resolved** locale rather than a BCP-47
 * default, because the point is that a German page and an Arabic page agree on
 * the unit and do not disagree on the separator. Passing `"en"` as a fallback
 * would be the bug, not the safety net.
 */

/**
 * Compact form for a count: 1240 → "1.2K", 41 → "41".
 *
 * The formatter is built once per request and reused, because constructing an
 * `Intl.NumberFormat` is not free and a page rendering three stats should not
 * pay for three of them.
 */
export function makeCompactFormatter(locale: string): (n: number) => string {
  const formatter = new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  return (n: number) => formatter.format(n);
}

/**
 * Plain grouped form: 1240 → "1,240".
 *
 * Used where a compact suffix would understate or mislead — a "1.2K members"
 * stat is fine, but "1.2K" as the sole figure on a page is less honest than the
 * exact number, and the exact number fits.
 */
export function makeGroupedFormatter(locale: string): (n: number) => string {
  const formatter = new Intl.NumberFormat(locale);
  return (n: number) => formatter.format(n);
}

/**
 * Food rescued: kg under a ton, tonnes above.
 *
 * The unit switch is at 1000 kg because "2.4K kg" reads worse than "2.4 t", and
 * "2,400 kg" is three tokens where "2.4 t" is two. This is the same ~2 kg per
 * arranged-listing estimate `getAnalyticsSummary` makes, put in a unit a person
 * can hold in their head.
 *
 * The number is compact-formatted but the **unit is not translated**. That is
 * deliberate: `t` and `kg` are the SI symbols, and SI symbols are the same in
 * every locale precisely so that a document mixing scripts stays unambiguous.
 * Translating them would be wrong, not inclusive.
 */
export function formatFoodSaved(kg: number, formatCompact: (n: number) => string): string {
  if (kg >= 1000) return `${formatCompact(kg / 1000)} t`;
  return `${formatCompact(kg)} kg`;
}
