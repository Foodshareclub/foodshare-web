/**
 * Not auto-loaded by Next.js (the framework only loads
 * `src/instrumentation-client.ts`). Client-side Sentry init lives in the
 * canonical `sentry.client.config.ts` at the repo root — do not duplicate
 * `Sentry.init` here. This module re-exports it for explicit imports.
 */
import "../../sentry.client.config";
