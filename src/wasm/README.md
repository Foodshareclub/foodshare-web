# `src/wasm/` — prebuilt WebAssembly artifacts (vendored)

The `*.wasm` binaries + wasm-pack `--target nodejs` glue (`*.js`) in each
`foodshare-*/` directory are **build artifacts vendored into git**
(force-added past the local `.gitignore`).

## Why vendored?

- Fresh clones, CI runners, and the **container image build** need runnable
  artifacts without a Rust/wasm-pack toolchain. The `.wasm`/`.js` files
  total ~1.6MB — cheaper than a Rust stage in the `Containerfile`.
- Turbopack dev/prod builds `readFileSync` these at module scope; missing
  files break `bun run build` (see `foodshare-tools/build-wasm.ts`).

## Regenerating

Source of truth: `foodshare-tools` (`bun run build:wasm` there, which runs the
`fs-wasm` binary; the Rust crate is `foodshare-wasm`, and it installs the
Turbopack-safe universal loader with `/*turbopackIgnore: true*/` markers —
do NOT hand-edit the glue).

After rebuilding, re-vendor explicitly (gitignore still ignores them by default):

```bash
git add -f src/wasm/*/*.wasm src/wasm/*/*.js
git commit -m "chore(web): refresh vendored wasm artifacts"
```

Keep the `*.d.ts` + `package.json` (tracked normally) in sync with the toolchain.

## The bridge contract

The modules take and return **JS objects and arrays** — `serde-wasm-bindgen`
crosses the boundary directly, with no JSON string roundtrip. The bridges in
`src/lib/wasm-*.ts` pass the values straight through.

One trap: `serde-wasm-bindgen` serializes a `serde_json::Value` object as a
JavaScript `Map`, and a `Map` has no readable properties. The Rust side
therefore returns derived structs, which become plain objects.

