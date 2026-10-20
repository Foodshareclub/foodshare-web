import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "bun:fs";
import { join } from "bun:path";
/**
 * Tests for the dead-class guard itself.
 *
 * This one needed them more than most: writing it surfaced seven ways to be
 * wrong, and each of those failures looked like a working guard reporting a real
 * bug. A checker that cries wolf gets deleted, and a deleted checker is worse
 * than no checker because the gap is now invisible.
 *
 * The fixture tree lives inside the repository on purpose. The script compiles
 * `src/app/globals.css` through the Tailwind PostCSS plugin, which resolves
 * `tailwindcss` relative to the stylesheet — a fixture in `/tmp` fails to
 * resolve, and fails for a reason that has nothing to do with the test.
 */
import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { runScript } from "./run-script";

const PROJECT = join(import.meta.dir, "..", "..", "..");
const SCRIPT = join(PROJECT, "scripts", "check-classes.ts");

let root: string;
let src: string;
const trees: string[] = [];

function freshTree(): void {
  root = mkdtempSync(join(PROJECT, ".check-classes-"));
  trees.push(root);
  src = join(root, "src");
  mkdirSync(join(src, "app"), { recursive: true });
  mkdirSync(join(src, "components"), { recursive: true });
  // The fixture must actually emit. With `source(none)` and no `@source`, the
  // fixture stylesheet generates no utilities at all, so no namespace is ever
  // "live", so nothing can ever be reported dead — and every test below passes
  // for the wrong reason. That is not a hypothetical: it is what the first
  // version of this file did, and 16 green tests proved nothing.
  writeFileSync(join(src, "app", "globals.css"), '@import "tailwindcss" source(none);\n@source "../**/*.{ts,tsx}";\n');
}

function component(name: string, body: string): void {
  writeFileSync(join(src, "components", name), body);
}

function stylesheet(name: string, css: string): void {
  writeFileSync(join(src, name), css);
}

function run(...args: string[]) {
  return runScript([SCRIPT, ...args], {
    cwd: PROJECT,
    env: { ...process.env, CLASS_CHECK_ROOT: root, FORCE_COLOR: "0" },
  });
}

/** Baseline first, then assert the tree is clean. Order matters in every case. */
function expectClean(): void {
  run("--write-baseline");
  const { code, out } = run();
  expect(out).toContain("0 dead");
  expect(code).toBe(0);
}

beforeEach(freshTree);

afterAll(() => {
  for (const tree of trees) rmSync(tree, { recursive: true, force: true });
});

describe("check-classes", () => {
  it("passes when every referenced class emits", () => {
    component("clean.tsx", 'export const C = () => <div className="flex ms-2 text-start" />;\n');
    expectClean();
  });

  it("fails on a class that emits nothing", () => {
    // A real `bg-*` and a real `blur-*` have to be present: a candidate is only
    // reported when its namespace is live, which is the tool's one documented
    // limitation. Without a sibling, `bg-nosuchcolour-500` is invisible.
    component("clean.tsx", 'export const C = () => <div className="flex ms-2 bg-red-500 blur-sm" />;\n');
    expectClean();
    component("broken.tsx", 'export const B = () => <div className="bg-nosuchcolour-500" />;\n');
    const { code, out } = run();
    expect(code).toBe(1);
    expect(out).toContain("grew");
  });

  it("fails on a Tailwind v3 name that v4 dropped", () => {
    // The whole reason this tool exists: `bg-gradient-radial` and `blur-0` are
    // v3 spellings, and both had been rendering as no background and no blur.
    //
    // Baseline first. Writing it after the v3 file would record the regression
    // as acceptable — the same mistake in the ratchet tests, made twice because
    // it is the easy mistake to make.
    component("sibling.tsx", 'export const S = () => <div className="bg-red-500 blur-sm" />;\n');
    run("--write-baseline");
    expect(run().code).toBe(0);

    component("v3.tsx", 'export const V = () => <div className="bg-gradient-radial blur-0" />;\n');
    const { code } = run();
    expect(code).toBe(1);
  });

  describe("emission it must recognise", () => {
    it("sees a variant combined with a pseudo-class", () => {
      // Tailwind emits `.dark\:hover\:text-foreground:hover`. Reading the
      // unescaped pseudo-class colon as part of the name made 400-odd real
      // utilities look dead.
      component("stateful.tsx", 'export const S = () => <a className="hover:text-primary" />;\n');
      expectClean();
    });

    it("sees a class whose name starts with a digit", () => {
      // A CSS identifier cannot start with a digit, so Tailwind emits
      // `.\32 xl\:grid-cols-4` — a hex escape and a space. Unescaping that as a
      // simple backslash pair yields `32 xl:grid-cols-4`, and every `2xl:` and
      // `3xl:` variant in the app reads as dead.
      component("wide.tsx", 'export const W = () => <div className="2xl:grid-cols-4" />;\n');
      expectClean();
    });

    it("sees an arbitrary value", () => {
      component("arbitrary.tsx", 'export const A = () => <div className="ms-[3px] text-[#ff0000]" />;\n');
      expectClean();
    });

    it("sees a class defined in another stylesheet", () => {
      // `gpu-accelerated-tiles` lives in `leaflet.css`, which a client component
      // imports. Reading only `globals.css` reported it dead.
      component("marker.tsx", 'export const M = () => <div className="gpu-accelerated-tiles" />;\n');
      stylesheet("leaflet.css", ".gpu-accelerated-tiles { will-change: transform; }\n");
      expectClean();
    });

    it("sees a class defined in a component style tag", () => {
      // `animate-confetti` is declared in a `<style>` tag inside Confetti.tsx.
      component(
        "Confetti.tsx",
        'export const C = () => <i className="absolute animate-confetti" />;\n' +
          "      <style>{`.animate-confetti { transform: scale(1); }`}</style>\n",
      );
      expectClean();
    });

    it("unwraps a style tag whose body is a JS expression", () => {
      // A styled-jsx body is `{` … `}`. Handing postcss the braces and backticks
      // is a parse error, and a parse error prints no report at all.
      component(
        "styled.tsx",
        'export const S = () => <i className="scrollbar-thin" />;\n' +
          "      <style jsx>{`.scrollbar-thin::-webkit-scrollbar { width: 4px; }`}</style>\n",
      );
      expectClean();
    });

    it("ignores a class name written inside a comment", () => {
      component("documented.tsx", '/** <div className="bg-nosuchcolour-500" /> */\nexport const D = 1;\n');
      expectClean();
    });
  });

  describe("things that are not classes", () => {
    it("ignores a cva variant name", () => {
      // A key in a `variants` map is the name of a variant, not a class.
      component(
        "button.tsx",
        'const b = cva("flex", { variants: { intent: { "brand-orange": "bg-brand-orange" } } });\n' +
          "export default b;\n",
      );
      expectClean();
    });

    it("ignores a comparison operand inside a cn call", () => {
      // `side === "right" && "end-0"` puts the word `right` in a class region.
      component(
        "sheet.tsx",
        "export const S = ({ side }: { side: string }) => (\n" +
          '  <i className={cn(side === "right" && "end-0", "flex")} />\n' +
          ");\n",
      );
      expectClean();
    });

    it("ignores a replacement needle inside a cn call", () => {
      // `color.replace("text-", "ring-")` puts two bare namespace prefixes in
      // a class region, and neither is a class.
      component(
        "tier.tsx",
        "export const T = ({ color }: { color: string }) => (\n" +
          '  <i className={cn(color.replace("text-", "ring-"), "flex")} />\n' +
          ");\n",
      );
      expectClean();
    });

    it("ignores a dynamic prefix built by interpolation", () => {
      component(
        "prefix.tsx",
        "export const P = ({ size }: { size: string }) => (\n" +
          "  <i className={`text-${size}-500 flex`} />\n" +
          ");\n",
      );
      expectClean();
    });

    it("ignores Tailwind's own marker classes", () => {
      // `group` and `peer` carry no declarations by design; they exist to be
      // targeted by variants.
      component("grouped.tsx", 'export const G = () => <div className="group flex peer" />;\n');
      expectClean();
    });

    it("accepts an arbitrary value that starts with a bracket", () => {
      // The leading-`[` case for `NOT_A_CLASS_NAME`: `grid-cols-[10px]` starts
      // with a letter, but the rule must not reject the bracket form either.
      component("grid.tsx", 'export const G = () => <div className="grid-cols-[10px] bg-red-500" />;\n');
      expectClean();
    });

    it("ignores a class attribute that is not a Tailwind class at all", () => {
      // Leaflet marker markup, where the value is built at runtime.
      component(
        "useMarkerIcon.ts",
        'export const marker = (size: string) =>\n  `<div class="cluster-marker cluster-${size}"></div>`;\n',
      );
      expectClean();
    });
  });
});
