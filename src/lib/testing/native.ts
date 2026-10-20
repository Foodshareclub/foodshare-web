/**
 * Bun's own `Response` and `fetch`, captured before happy-dom replaces them.
 *
 * The test runner preloads happy-dom, which swaps the global `Response` for
 * its own implementation and the global `fetch` for one that enforces the
 * Same Origin Policy. Two things break as a result:
 *
 *   - `Bun.serve` rejects happy-dom's `Response`. The server wants a real
 *     one back from its handler, and it answers with an error page instead.
 *   - A `fetch` to a local mock server is a cross-origin request, and
 *     happy-dom's `fetch` blocks it.
 *
 * This module captures both while the globals are still Bun's. The capture
 * only works if it happens *before* happy-dom registers, so the test preload
 * imports this module first and registers happy-dom second — the import
 * order is the whole mechanism, and the comment in `happydom.ts` says so.
 *
 * Outside the test runner there is no happy-dom, so the capture is of Bun's
 * globals either way and the module is a no-op.
 */

/** Bun's `Response`, before happy-dom takes the global. */
export const NativeResponse = globalThis.Response;

/** Bun's `fetch`, before happy-dom takes the global. */
export const NativeFetch = globalThis.fetch;
