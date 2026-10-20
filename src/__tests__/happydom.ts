import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Bun's own `Response`, captured before happy-dom replaces the global one.
//
// The test runner preloads happy-dom so the component tests have a DOM. That
// replacement also swaps `Response` for happy-dom's implementation, and
// `Bun.serve` rejects that — it wants a real `Response` back from its fetch
// handler. Capturing the original here is the only point where it is still
// reachable, and it lets a test spin up a real Bun server.
export const NativeResponse = globalThis.Response;

GlobalRegistrator.register();
