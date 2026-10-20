#!/usr/bin/env bun
/**
 * Catches a namespaced `t` called with a key that names a namespace.
 *
 * `useTranslations("Chat")` returns a function bound to that namespace, so
 * `t("sendMessage")` resolves `Chat.sendMessage`, and `t("Chat.sendMessage")`
 * resolves **`Chat.Chat.sendMessage`** — which every `getMessageFallback` renders
 * as the literal key path, in all 21 locales.
 *
 * This has now happened three times in three phases, each caught by a *different*
 * tool, which is the actual problem:
 *
 *   - `PasswordStrength` rendered the text `AuthFlow.AuthFlow.rules.length` on
 *     screen, because a `labelKey` arrived namespace-qualified and the
 *     component's `t` was already bound to `AuthFlow`. Found by a render test.
 *   - `UnifiedChatContainer` resolved `Chat.AuthFlow.goBack`. Found by
 *     `translations:check`.
 *   - A namespaced `t` called with a `Chat.*` key in the same file, found by
 *     `translations:check` on the very next edit.
 *
 * Three occurrences, three different detectors, none of them at the point of the
 * mistake.
 *
 * ## The rule: the composed path must exist, and the bare key must
 *
 * A namespaced translator turns a key into `<bound>.<key>`, so the call site can
 * be checked against the catalogue:
 *
 *   - `<bound>.<key>` exists → correct. Nested paths land here:
 *     `t("reset.submit")` on `AuthFlow` → `AuthFlow.reset.submit` ✓
 *   - `<bound>.<key>` is absent but `<key>` exists → the namespace prefix was
 *     meant to be dropped. Both shipping forms land here:
 *     `t("Chat.sendMessage")` on `Chat` → `Chat.Chat.sendMessage` ✗
 *     `t("AuthFlow.goBack")` on `Chat` → `Chat.AuthFlow.goBack` ✗
 *   - both absent → a genuinely missing key, which is `translations:check`'s
 *     job, not this one's.
 *
 * The third clause is what keeps the guard honest. Two earlier versions inferred
 * the answer structurally and both were wrong. The first matched only the
 * binding's *own* namespace, so it missed the `Chat` + `AuthFlow.goBack` call
 * that actually shipped. The second rejected every dotted key, so it reported 27
 * correct `AuthFlow.reset.*` calls as bugs — and `reset` is itself a top-level
 * namespace, so no amount of pattern-matching on the head segment could tell the
 * two apart. A guard that cries wolf on a quarter of a namespace gets deleted,
 * so existence is the only sound discriminator: it needs no heuristic, and it
 * cannot be wrong about a key that is in the catalogue.
 *
 * A **root** translator (`useTranslations()`) is exempt: it resolves keys as
 * written, so `t("AuthFlow.goBack")` is correct there. So is a **dynamic**
 * namespace (`useTranslations(ns)`) — a literal key cannot be composed with it
 * statically, and guessing would be a false positive waiting to happen.
 *
 * Usage:
 *   bun run check:namespace-keys
 *   bun run check:namespace-keys -- --report
 */

import { readFileSync, readdirSync, statSync } from "bun:fs";
import { join } from "bun:path";
import ts from "typescript";

const ROOT = process.env.NAMESPACE_KEYS_ROOT ?? join(import.meta.dir, "..");
const SRC = join(ROOT, "src");
const CATALOGUE = join(ROOT, "messages", "en.json");

const paint = (code: string) => (process.env.NO_COLOR ? "" : `\x1b[${code}m`);
const RED = paint(31);
const GREEN = paint(32);
const YELLOW = paint(33);
const BOLD = paint(1);
const DIM = paint(2);
const RESET = paint(0);

interface Finding {
  file: string;
  line: number;
  /** The namespace the translator is bound to. */
  bound: string;
  /** The key as written at the call site. */
  key: string;
  /** The path it actually resolves to. */
  resolves: string;
  /** The identifier bound to the translator, e.g. `t` or `tAuthFlow`. */
  identifier: string;
}

/**
 * Every dotted path in the English catalogue, so a composed key can be tested
 * for existence. Object nodes are included alongside leaves: next-intl resolves a
 * prefix to a namespace for interpolation, and only the leaves are keys.
 */
function cataloguePaths(): Set<string> {
  const catalogue = JSON.parse(readFileSync(CATALOGUE, "utf8")) as Record<string, unknown>;
  const paths = new Set<string>();
  const walk = (node: unknown, prefix: string): void => {
    if (Array.isArray(node)) {
      node.forEach((item, index) => {
        const path = `${prefix}.${index}`;
        paths.add(path);
        if (item && typeof item === "object") walk(item, path);
      });
      return;
    }
    if (node && typeof node === "object")
      for (const [key, value] of Object.entries(node)) {
        const path = prefix ? `${prefix}.${key}` : key;
        paths.add(path);
        if (value && typeof value === "object") walk(value, path);
      }
  };
  walk(catalogue, "");
  return paths;
}

const inCatalogue = cataloguePaths();

function files(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files(full, out);
    else if (entry.endsWith(".tsx") || entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

const findings: Finding[] = [];

const lineOf = (source: ts.SourceFile, node: ts.Node): number =>
  source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;

const relative = (file: string): string => file.replace(`${ROOT}/`, "");

for (const file of files(SRC)) {
  if (file.includes(".test.") || file.includes(".stories.")) continue;
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);

  /**
   * Translator bindings, read from the AST so that a mention of the pattern in a
   * comment or a string is not mistaken for the pattern itself. The first version
   * of this guard used a regex over the source text and duly reported the
   * explanatory comment three lines above its own fix.
   *
   * Only a **string literal** namespace is recorded, which is what exempts a root
   * translator and a dynamic one.
   */
  // Keyed by *name*. A `ts.Identifier` from the declaration is never the same
  // object as the one at the call site, so keying by node made every lookup miss
  // and the guard could not fire at all — it passed on the real tree only because
  // the tree was already fixed.
  const bindings = new Map<string, string>();
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.expression) &&
      node.initializer.expression.text === "useTranslations"
    ) {
      const [argument] = node.initializer.arguments;
      if (argument && ts.isStringLiteralLike(argument) && /^[A-Za-z][\w.]*$/.test(argument.text))
        bindings.set(node.name.text, argument.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  if (bindings.size === 0) continue;

  /**
   * Every call of a bound translator. `t("reset.submit")` and `t("x")` alike, so
   * the catalogue decides what happens next.
   */
  const calls: { node: ts.CallExpression; key: string; identifier: string; bound: string }[] = [];
  const collect = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.arguments.length === 1) {
      // The callee is an exact identifier, so a call can only belong to the
      // binding of that name: no prefix matching is possible or needed.
      const bound = bindings.get(node.expression.text);
      const [argument] = node.arguments;
      if (bound && argument && ts.isStringLiteralLike(argument) && argument.text.includes("."))
        calls.push({ node, key: argument.text, identifier: node.expression.text, bound });
    }
    ts.forEachChild(node, collect);
  };
  collect(source);

  for (const call of calls) {
    // Resolves correctly, or the key is simply missing and `translations:check`
    // owns that. Only the middle clause is this guard's business.
    if (inCatalogue.has(`${call.bound}.${call.key}`) || !inCatalogue.has(call.key)) continue;
    findings.push({
      file: relative(file),
      line: lineOf(source, call.node),
      bound: call.bound,
      key: call.key,
      resolves: `${call.bound}.${call.key}`,
      identifier: call.identifier,
    });
  }
}

findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

console.log(`\n${BOLD}Namespaced key check${RESET}\n`);

if (process.argv.includes("--report") || findings.length > 0)
  for (const finding of findings)
    console.log(
      `  ${finding.file}:${finding.line}  ${finding.identifier}("${finding.key}")  ` +
        `${DIM}→ resolves as ${finding.resolves}${RESET}`,
    );

if (findings.length > 0) {
  console.error(
    [
      "",
      `  ${RED}${BOLD}A namespaced t() was called with a key that names a namespace${RESET}`,
      "",
      '  useTranslations("X") binds t to X, so t("X.y") resolves as X.X.y and',
      '  t("Y.z") as X.Y.z — both of which every getMessageFallback renders as the',
      "  literal key path, in all 21 locales. A namespaced translator takes keys",
      "  relative to its own namespace. Either drop the prefix, or bind a second",
      "  translator:",
      "",
      '    const t = useTranslations("X");',
      '    const tOther = useTranslations("Y");',
      "",
      '  Nested paths are fine: t("reset.submit") on AuthFlow is AuthFlow.reset.submit.',
      "",
      "  translations:check also catches this, but only after the edit lands, and",
      "  only if the composed key is one it scans for.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const note = `  ${YELLOW}·${RESET} ${inCatalogue.size} catalogue paths read from messages/en.json. This shape has appeared three times; if it fires again, this check is not in the loop for that file.`;

console.log(`  ${GREEN}✓${RESET} No namespaced t() is called with a key that names a namespace.`);
console.log(note);
console.log();
