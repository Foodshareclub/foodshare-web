import { describe, expect, it } from "bun:test";
import { defaultLocale, locales } from "@/i18n/config";
import { resolveRequestLocale } from "@/i18n/resolve";

/**
 * Guards the `X-NEXT-INTL-LOCALE` value written in `src/proxy.ts`. next-intl
 * reads that request header in `getRequestLocale()`, so a bad value here either
 * breaks Server Component translations or — since it is a header, not a cookie
 * body — opens a response-splitting vector.
 */
describe("resolveRequestLocale", () => {
  it("returns the default locale for an absent cookie", () => {
    expect(resolveRequestLocale(undefined)).toBe(defaultLocale);
    expect(resolveRequestLocale(null)).toBe(defaultLocale);
    expect(resolveRequestLocale("")).toBe(defaultLocale);
  });

  it("passes through every supported locale", () => {
    for (const locale of locales) {
      expect(resolveRequestLocale(locale)).toBe(locale);
    }
  });

  it("rejects an unsupported locale rather than passing it through", () => {
    expect(resolveRequestLocale("klingon")).toBe(defaultLocale);
    expect(resolveRequestLocale("xx")).toBe(defaultLocale);
    // A regional variant is not a known locale; do not invent one.
    expect(resolveRequestLocale("pt-BR")).toBe(defaultLocale);
  });

  it("rejects header-injection attempts in the cookie value", () => {
    // The value is written into a request header, so a CRLF or a header-shaped
    // payload must never survive validation.
    for (const hostile of [
      "en\r\nX-Admin: 1",
      "en\nSet-Cookie: a=b",
      "../../etc/passwd",
      "en; DROP TABLE users",
      "<script>",
    ]) {
      expect(resolveRequestLocale(hostile)).toBe(defaultLocale);
    }
  });

  it("only ever returns one of the known locales", () => {
    for (const input of locales) {
      expect(locales).toContain(resolveRequestLocale(input));
    }
  });
});
