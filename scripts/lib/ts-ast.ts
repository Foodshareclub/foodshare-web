/**
 * A TypeScript AST for the guard scripts, backed by `tsrs`.
 *
 * The guard scripts — `check-i18n-text`, `check-i18n-attributes`,
 * `check-adornments` and `check-namespace-keys` — read the shape of the
 * source, not its types: they ask what text sits inside a JSX element,
 * whether an attribute carries a literal, which call a binding came from.
 * A type checker cannot answer any of that.
 *
 * They used to answer it with `typescript`'s JavaScript API. TypeScript 7
 * is a Rust port, and the `typescript` package no longer ships a JavaScript
 * compiler API at all — `import ts from "typescript"` resolves to a module
 * that only exports a version string. The API moved to `typescript/ast` and
 * `typescript/sync`.
 *
 * `tsrs` is the same compiler with the same shape, and its `unstable/ast`
 * entry point exposes the identical `is*` guards, the identical node types
 * and the identical `getChildren` navigation. This module is the seam: the
 * scripts import `* as ts` from here instead of from `typescript`, and the
 * only thing that changes for them is that parsing is asynchronous and
 * happens over a channel to the compiler process rather than in-process.
 *
 * Why the asynchronous API and not the synchronous one: the synchronous
 * channel reads the compiler's stdout through `stdout._handle.fd`, a Node
 * internal that Bun does not implement, so `new API()` from
 * `tsrs/unstable/sync` throws "undefined is not an object (evaluating
 * 'stdout._handle.fd')" on this runtime. The asynchronous API speaks over a
 * pipe it manages itself and works.
 *
 * The AST is materialised lazily, one node at a time, as the scripts walk
 * it. A full pass over the web app's ~600 TSX files costs about three
 * seconds.
 */

import * as ast from "tsrs/unstable/ast";
import { API } from "tsrs/unstable/async";

/**
 * Every type guard (`isJsxText`, `isCallExpression`, …), every node type
 * (`Node`, `JsxAttribute`, `SourceFile`, …) and the navigation helpers
 * (`getChildren`, `getChildren`, `SyntaxKind`) come straight from `tsrs`,
 * so a script's own code reads exactly as it did against `typescript`.
 */
export * from "tsrs/unstable/ast";

/**
 * `typescript` spells this `isStringLiteralLike`; `tsrs` spells it
 * `isStringLiteralLikeNode`. Same predicate either way — a string literal,
 * or a template literal with no substitution.
 */
export const isStringLiteralLike = ast.isStringLiteralLikeNode;

/** A parsed file, with the line lookups the scripts need. */
export interface ParsedFile {
  /** The parsed source file. */
  readonly sourceFile: ast.SourceFile;
  /** The 1-based line number of a node. */
  lineOf(node: ast.Node): number;
  /** The character offset where a node's content starts, skipping trivia. */
  startOf(node: ast.Node): number;
}

let client: API | undefined;

/**
 * The compiler process. One per script run, shared by every file — the
 * compiler is a long-lived service and starting one per file would cost
 * more than the parse.
 */
async function getClient(): Promise<API> {
  if (!client) {
    client = new API();
    // The compiler process is a child, and a child keeps the event loop
    // alive. A guard script that forgets to close the client would print
    // its result and then hang, holding the compiler for the next run.
    // Disposing is synchronous, so it is safe to do this on the way out.
    process.on("exit", () => {
      try {
        (client as unknown as { [Symbol.dispose]?: () => void })?.[Symbol.dispose]?.();
      } catch {
        // The process is exiting anyway.
      }
    });
  }
  return client;
}

/**
 * Releases the compiler process.
 *
 * Call it before exiting. A script that exits without it leaves the
 * compiler process behind, and a guard that runs on every commit would
 * accumulate one per run.
 */
export async function closeAstClient(): Promise<void> {
  if (!client) return;
  const closing = client;
  client = undefined;
  await closing.close?.();
}

/**
 * Parses one file.
 *
 * `fileName` decides how the source is parsed — a `.tsx` file is parsed as
 * TSX, so JSX in it is syntax rather than a type error.
 */
export async function parseSourceFile(fileName: string, text: string): Promise<ParsedFile> {
  const api = await getClient();
  const retained = await api.createSourceFile(fileName, text);
  const sourceFile = retained.sourceFile as unknown as ast.SourceFile;
  const lineStarts = sourceFile.getLineStarts();

  return {
    sourceFile,
    startOf: (node) => node.getStart(),
    lineOf(node) {
      // `lineStarts` holds the offset of the first character of each line, so
      // the line a node starts on is the last one that starts at or before
      // it.
      const start = node.getStart();
      let low = 0;
      let high = lineStarts.length - 1;
      while (low < high) {
        const mid = (low + high + 1) >> 1;
        if (lineStarts[mid] <= start) low = mid;
        else high = mid - 1;
      }
      return low + 1;
    },
  };
}

/**
 * Visits the children of a node.
 *
 * `ts.forEachChild` skipped punctuation and other trivia, and so does the
 * remote node's own `forEachChild` — which is what this uses. `getChildren`
 * returns the tokens as well, so a walk built on it visits roughly half
 * again as many nodes, over a channel, for nothing: the guards inspect the
 * shape of the tree rather than counting nodes.
 */
export function forEachChild(node: ast.Node, callback: (child: ast.Node) => void): void {
  node.forEachChild((child) => {
    callback(child as ast.Node);
  });
}

/**
 * The attributes of a JSX opening or self-closing element.
 *
 * In `typescript`, `node.attributes` is the array of attributes. In the
 * remote AST it is a node that *holds* them, and the array is not reachable
 * from it — so this walks down to the attributes themselves.
 */
export function jsxAttributes(node: ast.Node): ast.JsxAttribute[] {
  const attributes: ast.JsxAttribute[] = [];
  const collect = (current: ast.Node) => {
    if (ast.isJsxAttribute(current)) {
      attributes.push(current);
      return;
    }
    for (const child of ast.getChildren(current)) collect(child);
  };
  for (const child of ast.getChildren(node)) collect(child);
  return attributes;
}
