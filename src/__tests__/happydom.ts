import { AsyncLocalStorage } from "bun:async_hooks";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Next installs this global when starting its server. Config tests also load
// server instrumentation, so provide the same runtime primitive before imports.
Object.defineProperty(globalThis, "AsyncLocalStorage", {
  value: AsyncLocalStorage,
  configurable: true,
  writable: true,
});

// Bun's own `Response` and `fetch`, captured before happy-dom replaces them.
//
// The test runner preloads happy-dom so the component tests have a DOM. That
// replacement also swaps `Response` for happy-dom's implementation, and
// `Bun.serve` rejects that — it wants a real `Response` back from its fetch
// handler. It swaps `fetch` for one that enforces the Same Origin Policy,
// which blocks a request to a local mock server.
//
// The import below has to happen *before* `GlobalRegistrator.register()` at
// the bottom of this file: the capture is of whatever the globals are at the
// moment the module is first evaluated, and that is only Bun's while happy-dom
// has not registered yet. The module is here rather than inlined so that
// `src/lib/testing/` can reach the same capture without importing from the
// test tree.
import { NativeFetch, NativeResponse } from "../lib/testing/native";

export { NativeFetch, NativeResponse };

GlobalRegistrator.register();
