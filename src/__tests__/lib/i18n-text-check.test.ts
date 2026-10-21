import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "bun:fs";
import { join } from "bun:path";
/**
 * Tests for the untranslated-text guard.
 *
 * The point of this guard is to catch text that no other tool can see, so the
 * thing worth testing is that it does not fire on things no one would want to
 * translate — a guard that reports 2,300 strings when 40 are real gets switched
 * off, and a guard that reports the wrong 40 gets acted on wrongly.
 *
 * The per-file ratchet is the other half. A file already on the list must not
 * get worse; a file not on it must have none. Both directions are tested,
 * because a ratchet that only fails on growth still lets a new component ship
 * with hardcoded text if its first version is committed after the baseline.
 */
import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { runScript } from "./run-script";

const PROJECT = join(import.meta.dir, "..", "..", "..");
const SCRIPT = join(PROJECT, "scripts", "check-i18n-text.ts");

let root: string;
let src: string;
const trees: string[] = [];

function freshTree(): void {
  root = mkdtempSync(join(PROJECT, ".check-i18n-text-"));
  trees.push(root);
  src = join(root, "src", "components");
  mkdirSync(src, { recursive: true });
}

function component(name: string, body: string): void {
  writeFileSync(join(src, name), body);
}

function run(...args: string[]) {
  return runScript([SCRIPT, ...args], {
    cwd: PROJECT,
    env: { ...process.env, I18N_TEXT_ROOT: root, FORCE_COLOR: "0" },
  });
}

beforeEach(freshTree);

afterAll(() => {
  for (const tree of trees) rmSync(tree, { recursive: true, force: true });
});

describe("check-i18n-text", () => {
  it("reports a hardcoded sentence", () => {
    component("save.tsx", "export const S = () => <button>Save changes</button>;\n");
    run("--write-baseline");
    const { out } = run("--report");
    expect(out).toContain("Save changes");
  });

  it("sees nothing in a component that translates", () => {
    component("done.tsx", 'export const D = ({ t }: { t: (k: string) => string }) => <button>{t("save")}</button>;\n');
    run("--write-baseline");
    const { code, out } = run();
    expect(out).toContain("No file gained untranslated text");
    expect(code).toBe(0);
  });

  it("finds the fragments around an interpolated value", () => {
    // `{count} reviews` is two JSX text nodes, and both need translating. A
    // whole-expression test would have found neither.
    component("count.tsx", "export const C = ({ n }: { n: number }) => <p>{n} reviews</p>;\n");
    run("--write-baseline");
    const { out } = run("--report");
    expect(out).toContain("reviews");
  });

  it("ignores a brand name used as one token", () => {
    // An interior capital is the tell. "Ko-fi" has one, "Save" does not, and the
    // alternative is a hand-maintained list of every brand in the app.
    component("brand.tsx", 'export const B = () => <a href="#">Ko-fi</a>;\n');
    run("--write-baseline");
    const { out } = run("--report");
    expect(out).not.toContain("Ko-fi");
  });

  it("ignores text inside an svg", () => {
    // A `<title>` in a drawing is part of the drawing.
    component(
      "icon.tsx",
      'export const I = () => (\n  <svg viewBox="0 0 24 24"><title>Close panel</title></svg>\n);\n',
    );
    run("--write-baseline");
    const { out } = run("--report");
    expect(out).not.toContain("Close panel");
  });

  it("ignores purely symbolic text", () => {
    component("keys.tsx", "export const K = () => <kbd>⌘K</kbd>;\n");
    run("--write-baseline");
    const { out } = run("--report");
    expect(out).not.toContain("⌘K");
  });

  describe("the per-file ratchet", () => {
    it("fails when a file on the list gains a string", () => {
      component("a.tsx", "export const A = () => <button>Save</button>;\n");
      run("--write-baseline");
      expect(run().code).toBe(0);
      component("a.tsx", "export const A = () => <button>Save</button> <button>Cancel</button>;\n");
      const { code, out } = run();
      expect(code).toBe(1);
      expect(out).toContain("2 now, 1 in the baseline");
    });

    it("fails when a new file appears with no baseline entry", () => {
      component("clean.tsx", 'export const C = () => <button>{t("ok")}</button>;\n');
      run("--write-baseline");
      expect(run().code).toBe(0);
      component("fresh.tsx", "export const F = () => <button>Publish</button>;\n");
      const { code, out } = run();
      expect(code).toBe(1);
      expect(out).toContain("in a file that had none");
    });

    it("passes when a file improves", () => {
      component("a.tsx", "export const A = () => <button>Save</button> <button>Cancel</button>;\n");
      run("--write-baseline");
      component("a.tsx", 'export const A = () => <button>{t("save")}</button> <button>{t("cancel")}</button>;\n');
      const { code, out } = run();
      expect(code).toBe(0);
      expect(out).toContain("1 file(s) have been fully translated");
    });
  });
});
