/**
 * Ambient declaration for WGSL shader imports.
 *
 * `@vgpu/wgsl` declares `*.wgsl` in its own `wgsl-types.d.ts`, and
 * `src/wgsl-env.d.ts` pulls that in with a triple-slash reference so `tsc`
 * resolves the imports. Bun's own type-checker (`bun check`) does not follow
 * triple-slash `types` references into a package's wildcard module
 * declarations, so the same declaration is repeated here: a local ambient
 * module is visible to both checkers, and the two spellings describe the same
 * shape the loader produces.
 *
 * The two must be kept in step — `src/wgsl-env.d.ts` still points at the
 * package copy for `tsc`, and this file is the copy `bun check` can see.
 */
declare module "*.wgsl" {
  const source: { readonly version: 1; readonly wgsl: string };
  export default source;
}
