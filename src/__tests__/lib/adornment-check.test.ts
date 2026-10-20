import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "bun:fs";
import { join } from "bun:path";
/**
 * Tests for the adornment-alignment guard.
 *
 * This is the one RTL defect a class-string scan cannot see, because the two
 * classes that disagree live on *different elements* and the only thing
 * connecting them is their parent. So it walks the AST, which means the parts
 * most likely to be wrong are the parts that decide which elements are related
 * at all — and the first version got that wrong in a way that produced
 * confident false positives:
 *
 *   - it searched the nearest JSX ancestor of any kind, so a `fixed bottom-4
 *     left-4` mobile toggle was matched against a `ps-10` ninety lines below it
 *     in a completely unrelated part of the page;
 *   - it treated `fixed` as positioned, but a fixed element is positioned
 *     against the viewport and has no containing-block relationship to a
 *     sibling's padding at all.
 *
 * Both errors reported a *correct* component as broken, which is the failure
 * mode that gets a guard deleted.
 */
import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { runScript } from "./run-script";

const PROJECT = join(import.meta.dir, "..", "..", "..");
const SCRIPT = join(PROJECT, "scripts", "check-adornments.ts");

let root: string;
let src: string;
const trees: string[] = [];

function freshTree(): void {
  root = mkdtempSync(join(PROJECT, ".check-adornments-"));
  trees.push(root);
  src = join(root, "src");
  mkdirSync(join(src, "components"), { recursive: true });
  writeFileSync(join(src, "components", "keep.tsx"), "export const K = 1;\n");
}

function component(name: string, body: string): void {
  writeFileSync(join(src, "components", name), body);
}

function run(...args: string[]) {
  return runScript([SCRIPT, ...args], {
    cwd: PROJECT,
    env: { ...process.env, ADORNMENT_CHECK_ROOT: root, FORCE_COLOR: "0" },
  });
}

function expectClean(): void {
  run("--write-baseline");
  const { code, out } = run();
  expect(out).toContain("No half-converted adornments");
  expect(code).toBe(0);
}

/**
 * Baseline the empty tree, *then* add the file.
 *
 * Written as one helper because getting this order wrong is the single easiest
 * mistake in a ratchet test, and it passes: a baseline written after the
 * violation records the violation as acceptable, the gate reports zero growth,
 * and the test is green while asserting nothing. Four of these across three
 * guards now, so it is a helper rather than a habit.
 */
function expectFinding(name: string, body: string, expected: string): void {
  run("--write-baseline");
  expect(run().code).toBe(0);
  component(name, body);
  const { code, out } = run();
  expect(out).toContain(expected);
  expect(code).toBe(1);
}

beforeEach(freshTree);

afterAll(() => {
  for (const tree of trees) rmSync(tree, { recursive: true, force: true });
});

describe("check-adornments", () => {
  it("finds a glyph anchored physically beside logical padding", () => {
    expectFinding(
      "field.tsx",
      "export const F = () => (\n" +
        '  <div className="relative">\n' +
        '    <input className="h-12 pe-12" />\n' +
        '    <button className="absolute right-2 top-1/2 p-2" />\n' +
        "  </div>\n" +
        ");\n",
      "right-2 beside pe-12",
    );
  });

  it("finds the leading-side form", () => {
    expectFinding(
      "search.tsx",
      "export const S = () => (\n" +
        '  <div className="relative">\n' +
        '    <i className="absolute left-3" />\n' +
        '    <input className="ps-10" />\n' +
        "  </div>\n" +
        ");\n",
      "left-3 beside ps-10",
    );
  });

  it("accepts a glyph already written logically", () => {
    component(
      "field.tsx",
      "export const F = () => (\n" +
        '  <div className="relative">\n' +
        '    <input className="h-12 pe-12" />\n' +
        '    <button className="absolute end-2 top-1/2 p-2" />\n' +
        "  </div>\n" +
        ");\n",
    );
    expectClean();
  });

  it("ignores a glyph in a container that reserves no padding", () => {
    // A corner badge, a scrollbar control, a close button. Nothing to disagree
    // with, so there is no correct answer to check against.
    component(
      "badge.tsx",
      "export const B = () => (\n" +
        '  <div className="relative">\n' +
        '    <img className="rounded" />\n' +
        '    <span className="absolute right-2 top-2 rounded-full" />\n' +
        "  </div>\n" +
        ");\n",
    );
    expectClean();
  });

  it("ignores a container that reserves both sides equally", () => {
    // Symmetric padding is not reserving room for anything, so there is no
    // single answer to check the adornment against.
    component(
      "both.tsx",
      "export const B = () => (\n" +
        '  <div className="relative">\n' +
        '    <input className="ps-4 pe-4" />\n' +
        '    <i className="absolute left-2" />\n' +
        '    <i className="absolute right-2" />\n' +
        "  </div>\n" +
        ");\n",
    );
    expectClean();
  });

  it("reads the reservation from asymmetric padding on the container itself", () => {
    // A select item: `relative … ps-1.5 pe-8` with the checkmark as a child.
    // Two things had to be right for this to be caught. The padding has to be
    // read from the container's *own* className and not only its children's,
    // and "one side only" has to become "the larger side" — both sides are
    // padded, and the asymmetry is the whole signal.
    expectFinding(
      "select.tsx",
      "export const S = () => (\n" +
        "  <div>\n" +
        '    <div className="relative flex w-full pe-8 ps-1.5">\n' +
        '      <span className="pointer-events-none absolute right-2 flex size-4" />\n' +
        "    </div>\n" +
        "  </div>\n" +
        ");\n",
      "right-2 beside pe-8",
    );
  });

  it("accepts a field with an adornment at each end, both logical", () => {
    // `ps-11 pe-10` with a magnifier at the start and a clear button at the end.
    // Both sides are reserved, so "which side is reserved" decides nothing —
    // 11 is not meaningfully larger than 10. The rule is about the adornment's
    // own side having padding, and a field written that way is correct.
    component(
      "field.tsx",
      "export const F = () => (\n" +
        "  <div>\n" +
        '    <div className="relative w-full">\n' +
        '      <Search className="absolute start-4 top-1/2" />\n' +
        '      <input className="h-11 ps-11 pe-10" />\n' +
        '      <button className="absolute end-3 top-1/2" />\n' +
        "    </div>\n" +
        "  </div>\n" +
        ");\n",
    );
    expectClean();
  });

  it("reports the clear button when it is still anchored physically", () => {
    expectFinding(
      "field.tsx",
      "export const F = () => (\n" +
        "  <div>\n" +
        '    <div className="relative w-full">\n' +
        '      <Search className="absolute start-4 top-1/2" />\n' +
        '      <input className="h-11 ps-11 pe-10" />\n' +
        '      <button className="absolute right-3 top-1/2" />\n' +
        "    </div>\n" +
        "  </div>\n" +
        ");\n",
      "right-3 beside pe-10",
    );
  });

  it("ignores a reservation on the opposite side", () => {
    // The room is reserved at the start and the glyph is anchored right, so the
    // two disagree in LTR as well. That is a different defect — visible without
    // this guard, in the locale you develop in — and folding it in here would
    // mean the report no longer meant "half-converted". The draft of this test
    // asserted the opposite, which is what prompted the question above.
    component(
      "other.tsx",
      "export const O = () => (\n" +
        '  <div className="relative flex w-full pe-1.5 ps-8">\n' +
        '    <span className="absolute right-2" />\n' +
        "  </div>\n" +
        ");\n",
    );
    expectClean();
  });

  it("ignores a fixed control", () => {
    // A fixed element is positioned against the viewport and has no
    // containing-block relationship to a sibling's padding. Matching one
    // produced two false positives in the first report.
    component(
      "floating.tsx",
      "export const F = () => (\n" +
        "  <div>\n" +
        '    <button className="fixed bottom-4 left-4" />\n' +
        "    <section>\n" +
        '      <div className="relative"><input className="ps-10" /></div>\n' +
        "    </section>\n" +
        "  </div>\n" +
        ");\n",
    );
    expectClean();
  });

  it("does not reach past the positioned ancestor", () => {
    // The padding belongs to a different part of the page. Searching the
    // nearest JSX ancestor of *any* kind found this; searching the nearest
    // *positioned* one does not, because there is none between them.
    component(
      "distant.tsx",
      "export const D = () => (\n" +
        "  <div>\n" +
        '    <button className="absolute left-4" />\n' +
        '    <div className="relative"><input className="ps-10" /></div>\n' +
        "  </div>\n" +
        ");\n",
    );
    expectClean();
  });

  it("finds the defect through a cn() call and a conditional", () => {
    expectFinding(
      "cn.tsx",
      "export const C = ({ on }: { on: boolean }) => (\n" +
        '  <div className="relative">\n' +
        '    <input className={cn("h-12", "pe-12", on && "pe-16")} />\n' +
        '    <button className={cn("absolute", "right-2", "top-1/2")} />\n' +
        "  </div>\n" +
        ");\n",
      "right-2 beside pe-12",
    );
  });

  it("reports a file once, and reports it the same way twice", () => {
    // Determinism matters for a ratchet: a `g`-flagged regex left between two
    // files advances `lastIndex` and changes what the next file reports.
    component(
      "two.tsx",
      "export const T = () => (\n" +
        '  <div className="relative">\n' +
        '    <input className="pe-12" />\n' +
        '    <button className="absolute right-2" />\n' +
        "  </div>\n" +
        ");\n",
    );
    const first = run("--report").out;
    const second = run("--report").out;
    expect(first).toBe(second);
    expect((first.match(/two\.tsx/g) ?? []).length).toBe(1);
  });
});
