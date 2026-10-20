import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "bun:fs";
import { tmpdir } from "bun:os";
import { join } from "bun:path";
/**
 * Tests for the RTL direction guard itself.
 *
 * A guard that has never been shown to fail is indistinguishable from a guard
 * that always passes, and it is the second kind that gets trusted in review and
 * then ignored. So every rule in `scripts/check-rtl.ts` gets a case here that
 * proves the rule fires, and the two idioms it is *meant* to forgive get cases
 * proving it does not overreach.
 *
 * The guard is a script, not a module, so it is exercised the way CI runs it:
 * as a subprocess against a temporary source tree.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { runScript } from "./run-script";

const SCRIPT = join(import.meta.dir, "..", "..", "..", "scripts", "check-rtl.ts");

let root: string;
let src: string;
const trees: string[] = [];

/** A fresh tree per group, so one case's violation cannot rescue another's. */
function freshTree(): void {
  root = mkdtempSync(join(tmpdir(), "fs-rtl-"));
  trees.push(root);
  src = join(root, "src");
  mkdirSync(join(src, "components", "ui"), { recursive: true });
}

function write(relative: string, contents: string): void {
  const target = join(src, relative);
  mkdirSync(join(target, ".."), { recursive: true });
  writeFileSync(target, contents);
}

/** Run the guard against the temporary tree. Baseline is written for each case. */
function run(...args: string[]) {
  return runScript([SCRIPT, ...args], {
    cwd: root,
    env: { ...process.env, FORCE_COLOR: "0", RTL_CHECK_ROOT: root },
  });
}

afterAll(() => {
  for (const tree of trees) rmSync(tree, { recursive: true, force: true });
});

describe("check-rtl", () => {
  describe("clean trees", () => {
    beforeAll(() => {
      freshTree();
      write("components/ui/button.tsx", 'export const B = () => <b className="ms-2 pe-2 text-start" />;\n');
      write("components/clean.tsx", 'export const C = () => <div className="inset-x-0 border-e" />;\n');
    });

    it("passes a tree with only logical utilities", () => {
      run("--write-baseline");
      const { code, out } = run();
      expect(code).toBe(0);
      expect(out).toContain("No physical direction utilities in the shared primitives");
    });
  });

  describe("the shared primitives", () => {
    beforeAll(freshTree);
    it("fails on a physical utility, with no ratchet escape", () => {
      write("components/ui/dialog.tsx", 'export const D = () => <i className="absolute right-4" />;\n');
      run("--write-baseline");
      const { code, out } = run();
      expect(code).toBe(1);
      expect(out).toContain("shared primitive");
      expect(out).toContain("dialog.tsx");
      // The baseline is a *floor*, never a licence: even writing the violation
      // into the baseline must not make it pass.
      run("--write-baseline");
      expect(run().code).toBe(1);
    });
  });

  describe("the ratchet", () => {
    beforeAll(freshTree);
    it("fails when a new file adds physical utilities", () => {
      // Baseline first, then the violation. Writing the baseline after adding
      // the file would record the violation as acceptable, which is the exact
      // mistake this test exists to make impossible.
      run("--write-baseline");
      expect(run().code).toBe(0);
      write("components/clean2.tsx", 'export const D = () => <div className="ml-2" />;\n');
      const { code, out } = run();
      expect(code).toBe(1);
      expect(out).toContain("grew");
    });

    it("fails when an existing file gains one more occurrence", () => {
      write("components/clean2.tsx", 'export const D = () => <div className="ml-2" />;\n');
      run("--write-baseline");
      const before = run();
      expect(before.code).toBe(0);
      write("components/clean2.tsx", 'export const D = () => <div className="ml-2 mr-2" />;\n');
      const after = run();
      expect(after.code).toBe(1);
      expect(after.out).toContain("grew");
    });

    it("passes again once the debt is genuinely reduced", () => {
      run("--write-baseline");
      write("components/clean2.tsx", 'export const D = () => <div className="ms-2" />;\n');
      expect(run().code).toBe(0);
    });
  });

  describe("idioms that must not be reported", () => {
    beforeAll(freshTree);
    // Each of these is a place where a physical side is the correct answer.
    // Reporting them is how a guard teaches reviewers to ignore it.
    it("allows the centring idiom", () => {
      write("components/centred.tsx", 'export const C = () => <i className="left-1/2 -translate-x-1/2" />;\n');
      run("--write-baseline");
      expect(run().code).toBe(0);
    });

    it("allows an inset that agrees with a same-side slide animation", () => {
      write(
        "components/anchored.tsx",
        'export const A = () => <i className="right-0 data-[state=open]:slide-in-from-right" />;\n',
      );
      run("--write-baseline");
      expect(run().code).toBe(0);
    });

    it("allows a corner-named placement", () => {
      write("components/corner.tsx", 'const c = { "bottom-right": "bottom-0 right-0" };\nexport default c;\n');
      run("--write-baseline");
      expect(run().code).toBe(0);
    });

    it("ignores physical utilities named inside a comment", () => {
      // `kbd.tsx` documents `<Kbd className="ml-auto">` in a usage example. The
      // first version of this guard failed the build over a doc comment.
      write("components/documented.tsx", '/**\n * Usage: <Kbd className="ml-auto">x</Kbd>\n */\nexport const D = 1;\n');
      run("--write-baseline");
      expect(run().code).toBe(0);
    });

    it("ignores physical utilities named inside a line comment", () => {
      // The block-comment form was handled; the line form blanked only the two
      // slashes and left the rest readable, so `-translate-x-full` in a `//`
      // comment explaining a fix was reported as a real violation. It surfaced
      // the first time this project's own commit added such a comment.
      write(
        "components/explained.tsx",
        "// A physical `-translate-x-full` would slide it in from the left.\n" +
          "// so would `ml-2` and `text-left`.\n" +
          "export const E = 1;\n",
      );
      run("--write-baseline");
      const { code, out } = run();
      expect(code).toBe(0);
      expect(out).toContain("0 uses across 0 files");
    });

    it("ignores Radix's physical side data attribute", () => {
      write("components/radix.tsx", 'export const R = () => <i className="data-[side=left]:pr-2" />;\n');
      run("--write-baseline");
      expect(run().code).toBe(0);
    });

    it("allows the centring idiom in its arbitrary-value spelling", () => {
      // `left-[50%] translate-x-[-50%]` is the same idiom as
      // `left-1/2 -translate-x-1/2`, and it is what `ui/dialog.tsx` uses.
      // Excluding only the fractional spelling failed the shared-primitive rule
      // on a centring pair that has been correct all along.
      write(
        "components/ui/centred.tsx",
        'export const C = () => <i className="fixed left-[50%] top-[50%] translate-x-[-50%]" />;\n',
      );
      run("--write-baseline");
      const { code, out } = run();
      expect(code).toBe(0);
      expect(out).toContain("No physical direction utilities in the shared primitives");
    });

    it("allows an inset chosen by a physical side name", () => {
      // `triggerPosition === "left" ? "left-[-10px]" : "right-4"` — the value is
      // picked by which physical side the caller asked for, so it stays there.
      write(
        "components/trigger.tsx",
        "export const T = ({ side }: { side: string }) => (\n" +
          '  <i className={cn(side === "left" ? "left-[-10px]" : "right-4")} />\n' +
          ");\n",
      );
      run("--write-baseline");
      expect(run().code).toBe(0);
    });

    it("still sees a negative inset and an arbitrary value outside a centring pair", () => {
      // The sign and the bracket form were both invisible to the guard, so
      // `-left-[10%]` and `right-[50px]` swept clean and the count never moved.
      // Baseline first, violation second. Writing the baseline after the file
      // records the violation as acceptable, which is the easy mistake and the
      // reason the earlier draft of this case passed.
      run("--write-baseline");
      expect(run().code).toBe(0);
      write("components/decor.tsx", 'export const D = () => <i className="-left-[10%] right-[50px]" />;\n');
      expect(run().code).toBe(1);
    });

    it("allows a side-keyed ternary in both arms", () => {
      // Both branches are physical, because both are the side the caller named.
      // Recognising only the condition and the first arm leaves the `else` to be
      // reported, which is how a correct component gets flagged anyway.
      write(
        "components/trigger.tsx",
        "export const T = ({ side }: { side: string }) => (\n" +
          '  <i className={cn(side === "left" ? "left-[-10px]" : "right-4", "fixed")} />\n' +
          ");\n",
      );
      run("--write-baseline");
      expect(run().code).toBe(0);
    });

    it("allows a transform with an explicit rtl override", () => {
      // A chevron that tugs left in LTR and right in RTL. The base is physical
      // on purpose — the override is what makes it correct in both directions.
      write(
        "components/chevron.tsx",
        "export const C = () => (\n" +
          '  <i className="transition-transform rtl:scale-x-100 group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5" />\n' +
          ");\n",
      );
      run("--write-baseline");
      expect(run().code).toBe(0);
    });

    it("allows the same override with the signs the other way round", () => {
      // One of the three accordions is written this way. A single alternation
      // would have matched the other two and missed this one.
      write(
        "components/chevron2.tsx",
        "export const C = () => (\n" +
          '  <i className="group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />\n' +
          ");\n",
      );
      run("--write-baseline");
      expect(run().code).toBe(0);
    });

    it("allows a transform nudged on both axes", () => {
      // Optical centring of a `Send` glyph that does not sit square in its box.
      // A glyph does not move when the document mirrors.
      write(
        "components/send.tsx",
        'export const S = () => <Send className="h-6 w-6 -translate-x-0.5 translate-y-0.5" />;\n',
      );
      run("--write-baseline");
      expect(run().code).toBe(0);
    });

    it("allows a runtime direction branch around a transform", () => {
      // The `rtl:`-variant form cannot cover this: both arms are physical and a
      // ternary picks one, because Tailwind has no logical form of `translate-x`.
      // Without an idiom for it, the file that gets the fix right is the one the
      // guard reports.
      write(
        "components/branch.tsx",
        "export const B = ({ rtl }: { rtl: boolean }) => (\n" +
          '  <i className={rtl ? "translate-x-8" : "-translate-x-8"} />\n' +
          ");\n",
      );
      // Asserted against the report rather than the gate. Writing the baseline
      // after the file records the idiom as accepted debt, the gate sees no
      // growth and passes, and the assertion says nothing — which is the fifth
      // time this ordering has cost a test its meaning.
      run("--write-baseline");
      expect(run("--report").out).not.toContain("branch.tsx");
    });

    it("still reports a one-axis transform with no override", () => {
      run("--write-baseline");
      expect(run().code).toBe(0);
      write("components/onesided.tsx", 'export const C = () => <i className="absolute left-0 -translate-x-full" />;\n');
      expect(run().code).toBe(1);
    });

    it("does not confuse the ui and ui-library directories", () => {
      // A bare `startsWith(dir)` matches `ui-library` too. The distinction is
      // what makes both of them primitives, so it has to hold.
      write("components/ui-library/nav.tsx", 'export const N = () => <i className="ml-2" />;\n');
      run("--write-baseline");
      const { code, out } = run();
      expect(code).toBe(1);
      expect(out).toContain("ui-library");
    });
  });
});
