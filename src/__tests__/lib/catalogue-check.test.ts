import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "bun:fs";
import { join } from "bun:path";
/**
 * Tests for the catalogue guard's namespace selection.
 *
 * The guard was blind to the 611 flat keys at the root of `messages/en.json` —
 * `password`, `email_address`, `first_name`, `hide_password`, every label the
 * legacy UI reads — because the namespace filter kept entries whose value is an
 * object and those values are strings. Its docstring claimed to check "the 947
 * strings a reader actually sees" while checking 336.
 *
 * A blind spot in a guard is worse than no guard, because the docstring is what
 * the next person trusts. So these tests build a fixture catalogue, run the
 * real script against it with `--messages`, and assert it fires on a *flat* key
 * — the exact class of finding it used to drop.
 *
 * Every fixture is careful about which rules it trips: one English value in a
 * Latin-script locale and one in a non-Latin locale are the same mistake caught
 * by two different rules, so a test that means to exercise `wrong-script` must
 * translate its Latin locales or it will pass for the wrong reason.
 */
import { afterEach, describe, expect, it } from "bun:test";
import { runScript } from "./run-script";

const PROJECT = join(import.meta.dir, "..", "..", "..");
const SCRIPT = join(PROJECT, "scripts", "check-catalogue.ts");

const LOCALES = [
  "en",
  "ar",
  "cs",
  "de",
  "es",
  "fr",
  "hi",
  "id",
  "it",
  "ja",
  "ko",
  "nl",
  "pl",
  "pt",
  "ru",
  "sv",
  "th",
  "tr",
  "uk",
  "vi",
  "zh",
];

/** Locales whose prose is Latin script, where English and translated coincide. */
const LATIN = ["cs", "de", "es", "fr", "id", "it", "nl", "pl", "pt", "sv", "tr", "vi"];

/** One clean sentence per non-Latin locale, so only the rule under test can fire. */
const TRANSLATED: Record<string, string> = {
  ru: "Введите ваш пароль",
  uk: "Введіть свій пароль",
  ar: "أدخل كلمة المرور الخاصة بك",
  hi: "अपना पासवर्ड दर्ज करें",
  ja: "パスワードを入力してください",
  ko: "비밀번호를 입력하세요",
  zh: "请输入你的密码",
  th: "กรอกรหัสผ่านของคุณ",
};

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/**
 * A 21-locale catalogue built from one reference shape, plus a runner for the
 * real script against it.
 *
 * `value(locale, path)` returns the English text by default — which is the
 * condition under test — and a test overrides it for the one locale it is about.
 * Returning `undefined` for a locale means "translate this one".
 */
function catalogue(reference: Record<string, unknown>, value?: (locale: string, path: string) => string | undefined) {
  const root = mkdtempSync(join(PROJECT, ".check-catalogue-root-"));
  roots.push(root);
  const messages = join(root, "messages");
  mkdirSync(messages, { recursive: true });
  const baseline = join(root, "baseline.json");

  const write = (locale: string) => {
    const out: Record<string, unknown> = {};
    for (const [key, source] of Object.entries(reference)) {
      const path = typeof source === "string" ? key : key;
      if (typeof source === "string") {
        out[key] = value?.(locale, path) ?? source;
        continue;
      }
      const ns: Record<string, string> = {};
      for (const leaf of Object.keys(source as Record<string, unknown>)) {
        const leafValue = value?.(locale, `${key}.${leaf}`);
        ns[leaf] = leafValue ?? (source as Record<string, string>)[leaf];
      }
      out[key] = ns;
    }
    writeFileSync(join(messages, `${locale}.json`), `${JSON.stringify(out, null, 2)}\n`);
  };

  for (const locale of LOCALES) write(locale);

  const run = (...args: string[]) =>
    runScript([SCRIPT, ...args, "--messages", messages, "--baseline", baseline], {
      cwd: PROJECT,
      env: { ...process.env, NO_COLOR: "1" },
      timeout: 120_000,
    });

  const setBaseline = (baseline_: unknown) => writeFileSync(baseline, JSON.stringify(baseline_, null, 2));

  /** Replace one locale's whole catalogue. */
  const overwrite = (locale: string, next: Record<string, unknown>) =>
    writeFileSync(join(messages, `${locale}.json`), `${JSON.stringify(next, null, 2)}\n`);

  return { run, setBaseline, overwrite };
}

describe("catalogue guard — the root namespace", () => {
  it("sees a flat key holding English in a Latin-script locale", () => {
    // `it` and `nl` write "Enter your password" differently, so an English copy
    // there is a real defect — and this is the shape the guard used to drop.
    const { run, setBaseline } = catalogue({ password_label: "Enter your password" }, (locale) =>
      locale === "en" ? undefined : LATIN.includes(locale) ? undefined : TRANSLATED[locale],
    );
    setBaseline({});

    const failed = run();
    expect(failed.code).toBe(1);
    expect(failed.out).toContain("(root) · identical-to-english");
    expect(failed.out).toContain("password_label");
    expect(failed.out).toContain("12 locale(s)");
  });

  it("sees a flat key holding Latin prose in a non-Latin locale", () => {
    const { run, setBaseline } = catalogue({ cancel: "Cancel" });
    setBaseline({});

    const failed = run();
    expect(failed.code).toBe(1);
    expect(failed.out).toContain("(root) · wrong-script");
    expect(failed.out).toContain("cancel");
    expect(failed.out).toContain("8 locale(s)");
  });

  it("sees a flat key with a stray Latin word inside translated prose", () => {
    const { run, setBaseline } = catalogue({ support: "Contact support for help" }, (locale) =>
      locale === "en" ? undefined : `${TRANSLATED[locale]} support`,
    );
    setBaseline({});

    const failed = run();
    expect(failed.code).toBe(1);
    expect(failed.out).toContain("(root) · stray-latin");
  });

  it("cannot catch a flat key whose value equals its own key", () => {
    // Pinned deliberately rather than papered over. `self-key` matches
    // `"<namespace>.<key>"`, and a flat key's path is the bare key — so a flat
    // `chat: "chat"` renders literally on screen and this guard will not see it.
    // Documented as a limit in the script; a test that pretended otherwise would
    // be the more dangerous artefact. Other rules may still fire on the same
    // fixture, so the assertion is about `self-key` specifically.
    const { run, setBaseline } = catalogue({ chat: "chat" });
    setBaseline({});
    expect(run().out).not.toContain("self-key");
  });

  it("passes when a flat key is genuinely translated everywhere", () => {
    const { run, setBaseline } = catalogue({ password_label: "Enter your password" }, (locale) =>
      locale === "en" ? undefined : latinWord(locale),
    );
    setBaseline({});
    expect(run().code).toBe(0);
  });

  it("reports a real namespace under its own name, not as the root", () => {
    const { run, setBaseline } = catalogue({ Home: { hero: "Welcome back" } }, (locale) =>
      locale === "en" ? undefined : LATIN.includes(locale) ? undefined : TRANSLATED[locale],
    );
    setBaseline({});

    const failed = run();
    expect(failed.code).toBe(1);
    expect(failed.out).toContain("Home · identical-to-english");
    expect(failed.out).not.toContain("(root) · identical-to-english");
  });
});

/** A one-word value in the locale's own script, used where a word is enough. */
function latinWord(locale: string): string {
  const words: Record<string, string> = {
    cs: "Heslo",
    de: "Passwort",
    es: "Contraseña",
    fr: "Motdepasse",
    id: "Sandi",
    it: "Password",
    nl: "Wachtwoord",
    pl: "Hasło",
    pt: "Senha",
    sv: "Lösenord",
    tr: "Parola",
    vi: "Mậtkhẩu",
    ru: "Пароль",
    uk: "Пароль",
    ar: "كلمة",
    hi: "पासवर्ड",
    ja: "パスワード",
    ko: "비밀번호",
    zh: "密码",
    th: "รหัส",
  };
  return words[locale] ?? words.de;
}

describe("catalogue guard — the ratchet", () => {
  const oneKey = { password_label: "Enter your password" };
  /** Everything translated except `en`, so an overwrite is the only English. */
  const allTranslated = (locale: string) => (locale === "en" ? undefined : latinWord(locale));

  it("counts keys, not findings: one key wrong in twelve locales is one problem", () => {
    // A baseline that grew by twelve when one string was reverted would be a
    // baseline nobody trusts. The trade is deliberate and it has an edge worth
    // writing down: once a key is in the baseline, the *same* key becoming
    // English in a further locale does not trip the gate. The `--report` view is
    // where that shows up, as a rising locale count on a stable key count.
    const { run, setBaseline, overwrite } = catalogue(oneKey, allTranslated);
    for (const locale of LATIN) overwrite(locale, { password_label: "Enter your password" });
    setBaseline({ "(root)": { "identical-to-english": 12 } });

    expect(run().code).toBe(0);
    expect(run("--report").out).toContain("1 key(s) · 12 finding(s) · 12 locale(s)");
  });

  it("trips one key over the ratchet whatever the locale count", () => {
    const { run, setBaseline, overwrite } = catalogue(oneKey, allTranslated);
    overwrite("it", { password_label: "Enter your password" });
    setBaseline({});
    expect(run().code).toBe(1);

    overwrite("nl", { password_label: "Enter your password" });
    overwrite("pl", { password_label: "Enter your password" });
    // Still one key, so still one over. That is the design, not an accident.
    expect(run("--report").out).toContain("1 key(s) · 3 finding(s) · 3 locale(s)");
  });

  it("refuses to run with no baseline, and says how to make one", () => {
    const { run } = catalogue(oneKey);
    const failed = run();
    expect(failed.code).toBe(1);
    expect(failed.out).toContain("--write-baseline");
  });

  it("names the allowlist in the failure output", () => {
    // A failure nobody can act on is a guard that gets switched off.
    const { run, setBaseline } = catalogue({ cancel: "Cancel" });
    setBaseline({});
    expect(run().out).toContain("Latin runs permitted inside non-Latin prose");
  });
});

describe("catalogue guard — exemptions it must not extend", () => {
  it("does not report a trademark held in Latin script", () => {
    // `apple`, `google` and `facebook` are written the same way in every
    // locale. A guard that reported them would be ignored within a week.
    const { run, setBaseline } = catalogue({ apple: "Apple" });
    setBaseline({});
    expect(run().code).toBe(0);
  });

  it("does not report a bare loanword in a non-Latin locale", () => {
    const { run, setBaseline } = catalogue({ cookie: "Cookie" });
    setBaseline({});
    expect(run().code).toBe(0);
  });

  it("does not report a value equal to its own key path inside a namespace", () => {
    // `Chat.edited` is legitimately the string "edited" in English and in
    // French — so the rule matches the full dotted path, not the bare leaf.
    const { run, setBaseline } = catalogue({ Chat: { edited: "edited" } }, (locale) =>
      locale === "en" ? undefined : LATIN.includes(locale) ? "edited" : TRANSLATED[locale],
    );
    setBaseline({});
    expect(run().code).toBe(0);
  });

  it("reports a value that IS its own key path inside a namespace", () => {
    const { run, setBaseline } = catalogue({ Home: { hero: "Home.hero" } });
    setBaseline({});
    const failed = run();
    expect(failed.code).toBe(1);
    expect(failed.out).toContain("self-key");
  });
});

/**
 * The shipped catalogues, gated once.
 *
 * Run once and shared, because the guard parses twenty-one catalogues and takes
 * a few seconds to do it — and two tests each spawning it pushed that over the
 * harness's per-test budget, which turned a passing guard into a timeout twice
 * over. One spawn, two sets of assertions, and the cost is paid at most once no
 * matter how many assertions are added.
 */
let realRun: { code: number | null; gate: string; report: string } | null = null;
const real = () => {
  if (realRun) return realRun;
  const run = (args: string[]) => {
    return runScript([SCRIPT, ...args], {
      cwd: PROJECT,
      env: { ...process.env, NO_COLOR: "1" },
      // Generous, because a timeout here reads as a guard failure and is not one.
      timeout: 120_000,
    });
  };
  const gate = run([]);
  realRun = { code: gate.code, gate: gate.out, report: run(["--report"]).out };
  return realRun;
};

/**
 * The per-test timeout is raised because the work genuinely takes about four
 * seconds: the guard parses twenty-one catalogues and a fixture is not a
 * substitute for the real thing here. Left at the harness default it failed as a
 * timeout while the guard itself was passing — twice, which is the worst way for
 * a test to lie.
 */
const PARSE_21_CATALOGUES_MS = 60_000;

describe("catalogue guard — the shipped catalogues", () => {
  it(
    "gates the shipped messages directory with no arguments",
    () => {
      expect(real().code).toBe(0);
      expect(real().gate).toContain("No namespace exceeded its baseline");
    },
    PARSE_21_CATALOGUES_MS,
  );

  it(
    "reports grouped and capped, not one line per finding",
    () => {
      // 5,340 findings grouped by (namespace, rule) with 12 keys each: the shape has
      // to stay readable now that the root namespace is in scope, or nobody reads
      // it at all.
      expect(real().report.split("\n").length).toBeLessThan(200);
      expect(real().report).toContain("(root) · identical-to-english");
      expect(real().report).toContain("381 key(s)");
    },
    PARSE_21_CATALOGUES_MS,
  );

  it("includes the root namespace in the baseline it gates on", () => {
    const baseline = JSON.parse(
      readFileSync(join(PROJECT, "scripts", "check-catalogue-baseline.json"), "utf8"),
    ) as Record<string, Record<string, number>>;
    // The 611 flat keys are the ones the legacy UI reads. A baseline without
    // them is a baseline that cannot notice them.
    expect(Object.keys(baseline)).toContain("(root)");
    expect(baseline["(root)"]["wrong-script"]).toBeGreaterThan(400);
  });
});
