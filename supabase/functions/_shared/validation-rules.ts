/**
 * Validation Rules — backward-compatible shim.
 *
 * The 561-line god-file was decomposed into the `_shared/validation/` module
 * family (constants, types, domain, auth, xss, numbers). This shim
 * re-exports everything so existing importers
 * (`../_shared/validation-rules.ts`) keep working unchanged.
 */

export * from "./validation/index.ts";

import VALIDATION from "./validation/index.ts";

export default VALIDATION;
