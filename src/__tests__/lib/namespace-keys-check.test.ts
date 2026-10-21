import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "bun:fs";
import { join } from "bun:path";
/**
 * Tests for the namespaced-key guard.
 *
 * The defect has appeared three times in three phases, each caught by a
 * *different* tool: `PasswordStrength` rendered the literal text
 * `AuthFlow.AuthFlow.rules.length` (a render test found it),
 * `UnifiedChatContainer` resolved `Chat.AuthFlow.goBack` (`translations:check`
 * found it), and a third self-qualified call followed immediately. The problem is
 * not that the shape is hard to write — it is that nothing said "this is a
 * mistake" at the point of the mistake.
 *
 * So most of what follows is the reverse of an ordinary guard's tests: prove that
 * a *correct* file passes, and prove that each way of writing the *incorrect* one
 * fails. A guard that has only ever been seen to pass is a guess.
 *
 * The fixtures ship a miniature `messages/en.json` alongside the source, because
 * the rule is decided by catalogue existence rather than by shape — and two
 * earlier shape-based versions were both wrong (one missed the defect that
 * shipped; the other reported 27 correct nested keys as bugs).
 */
import { afterEach, describe, expect, it } from "bun:test";
import { runScript } from "./run-script";

const PROJECT = join(import.meta.dir, "..", "..", "..");
const SCRIPT = join(PROJECT, "scripts", "check-namespace-keys.ts");

/** A catalogue with the two namespaces the fixtures use, plus a `reset` sibling. */
const CATALOGUE = {
  Chat: { sendMessage: "Send message", sendMessageHint: "…", back: "Back" },
  AuthFlow: { goBack: "Go back", reset: { submit: "Submit", updating: "Updating" } },
  reset: { updating: "Updating" },
  Accessibility: { label: "Label" },
};

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** One source file, run through the real script. */
const tree = (source: string) => {
  const root = mkdtempSync(join(PROJECT, ".check-namespace-keys-"));
  roots.push(root);
  mkdirSync(join(root, "src"), { recursive: true });
  mkdirSync(join(root, "messages"), { recursive: true });
  writeFileSync(join(root, "src", "Component.tsx"), source);
  writeFileSync(join(root, "messages", "en.json"), JSON.stringify(CATALOGUE));
  return runScript([SCRIPT], {
    cwd: PROJECT,
    env: { ...process.env, NAMESPACE_KEYS_ROOT: root, NO_COLOR: "1" },
    timeout: 60_000,
  });
};

describe("namespaced key guard — correct files pass", () => {
  it("passes keys relative to the translator's own namespace", () => {
    const { code, out } = tree(`
import { useTranslations } from "next-intl";
export function C() {
  const t = useTranslations("Chat");
  return <b aria-label={t("sendMessage")} />;
}
`);
    expect(code).toBe(0);
    expect(out).toContain("No namespaced t() is called with a key that names a namespace");
  });

  it("passes a nested key path, which is dotted and correct", () => {
    // The case that the second, over-eager version of this guard reported as a
    // bug: `reset` is a namespace *and* a nested key under `AuthFlow`, so nothing
    // about the head segment can decide it. The catalogue can.
    const { code } = tree(`
import { useTranslations } from "next-intl";
export function C() {
  const t = useTranslations("AuthFlow");
  return <b aria-label={t("reset.submit")} />;
}
`);
    expect(code).toBe(0);
  });

  it("passes the fix both real occurrences used: a second translator", () => {
    const { code } = tree(`
import { useTranslations } from "next-intl";
export function C() {
  const t = useTranslations("Chat");
  const tAuthFlow = useTranslations("AuthFlow");
  return <b aria-label={tAuthFlow("goBack")} />;
}
`);
    expect(code).toBe(0);
  });

  it("does not read a longer identifier as the shorter binding", () => {
    // If `\bt(` also matched `tAuth(`, every second translator in the app would be
    // a false positive.
    const { code } = tree(`
import { useTranslations } from "next-intl";
export function C() {
  const t = useTranslations("Chat");
  const tChat = useTranslations("Chat");
  return <b aria-label={tChat("sendMessage")} />;
}
`);
    expect(code).toBe(0);
  });

  it("ignores a mention of the pattern inside a comment", () => {
    // The regex version reported this guard's own explanatory comment as a
    // defect three lines above the fix it was describing.
    const { code } = tree(`
import { useTranslations } from "next-intl";
export function C() {
  const t = useTranslations("Chat");
  // Do not write t("AuthFlow.goBack") here: it resolves as Chat.AuthFlow.goBack.
  /* Nor t("Chat.sendMessage"), which doubles the namespace. */
  return <b aria-label={t("sendMessage")} />;
}
`);
    expect(code).toBe(0);
  });

  it("ignores the same text inside a string literal", () => {
    const { code } = tree(`
import { useTranslations } from "next-intl";
export function C() {
  const t = useTranslations("Chat");
  const example = 't("AuthFlow.goBack")';
  return <b aria-label={t(example)} />;
}
`);
    expect(code).toBe(0);
  });
});

describe("namespaced key guard — the wrong file fails", () => {
  it("catches a self-qualified key", () => {
    const { code, out } = tree(`
import { useTranslations } from "next-intl";
export function C() {
  const t = useTranslations("Chat");
  return <b aria-label={t("Chat.sendMessage")} />;
}
`);
    expect(code).toBe(1);
    expect(out).toContain('t("Chat.sendMessage")');
    expect(out).toContain("Chat.Chat.sendMessage");
    expect(out).toContain("A namespaced t() was called with a key that names a namespace");
  });

  it("catches the cross-namespace form, which is the one that shipped", () => {
    const { code, out } = tree(`
import { useTranslations } from "next-intl";
export function C() {
  const t = useTranslations("Chat");
  return <b aria-label={t("AuthFlow.goBack")} />;
}
`);
    expect(code).toBe(1);
    expect(out).toContain("Chat.AuthFlow.goBack");
  });

  it("names the file and the line of the call, not of the binding", () => {
    const { out } = tree(`
import { useTranslations } from "next-intl";
export function C() {
  const t = useTranslations("Chat");

  return <b aria-label={t("Chat.sendMessage")} />;
}
`);
    // The call is on line 6 and the binding on line 4; pointing at the
    // declaration would send the reader to the wrong line.
    expect(out).toContain("src/Component.tsx:6");
    expect(out).not.toContain("src/Component.tsx:4");
  });

  it("catches both bindings in one file", () => {
    const { code, out } = tree(`
import { useTranslations } from "next-intl";
export function C() {
  const t = useTranslations("Chat");
  const tAuthFlow = useTranslations("AuthFlow");
  return (
    <b>
      <i aria-label={t("Chat.sendMessage")} />
      <i aria-label={tAuthFlow("AuthFlow.goBack")} />
    </b>
  );
}
`);
    expect(code).toBe(1);
    expect(out).toContain("Chat.Chat.sendMessage");
    expect(out).toContain("AuthFlow.AuthFlow.goBack");
  });

  it("catches a later call even when the binding is far above it", () => {
    const { code } = tree(`
import { useTranslations } from "next-intl";
export function C() {
  const t = useTranslations("Chat");
  return (
    <div>
      <p>one</p>
      <p>two</p>
      <p>three</p>
      <button aria-label={t("Chat.sendMessage")} />
    </div>
  );
}
`);
    expect(code).toBe(1);
  });

  it("says what to do instead", () => {
    const { out } = tree(`
import { useTranslations } from "next-intl";
export function C() {
  const t = useTranslations("Chat");
  return <b aria-label={t("Chat.sendMessage")} />;
}
`);
    expect(out).toContain("const tOther = useTranslations");
    expect(out).toContain("Nested paths are fine");
  });
});

describe("namespaced key guard — what it deliberately cannot see", () => {
  it("passes a root translator, which has no namespace to duplicate", () => {
    // `useTranslations()` resolves the key as written, so this is correct.
    const { code } = tree(`
import { useTranslations } from "next-intl";
export function C() {
  const t = useTranslations();
  return <b aria-label={t("AuthFlow.goBack")} />;
}
`);
    expect(code).toBe(0);
  });

  it("passes a dynamic namespace, because it cannot be composed statically", () => {
    const { code } = tree(`
import { useTranslations } from "next-intl";
export function C({ ns }: { ns: string }) {
  const t = useTranslations(ns);
  return <b aria-label={t("Chat.sendMessage")} />;
}
`);
    expect(code).toBe(0);
  });

  it("leaves a genuinely missing key to translations:check", () => {
    // Neither `Chat.nope` nor `nope` is in the catalogue, so this guard has
    // nothing to say — that is a missing key, not a composed wrong one.
    const { code } = tree(`
import { useTranslations } from "next-intl";
export function C() {
  const t = useTranslations("Chat");
  return <b aria-label={t("nope")} />;
}
`);
    expect(code).toBe(0);
  });
});

describe("namespaced key guard — the shipped tree", () => {
  it("passes with no arguments, which is how it runs in test:build", () => {
    const result = runScript([SCRIPT], {
      cwd: PROJECT,
      env: { ...process.env, NO_COLOR: "1" },
      timeout: 120_000,
    });
    expect(result.code).toBe(0);
  });
});
