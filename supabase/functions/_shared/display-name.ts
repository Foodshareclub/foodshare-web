/**
 * Display Name Extraction Utility — backward-compatible shim.
 *
 * Pure utilities moved to `./display-name/utils.ts` (alongside the service,
 * types, and errors in `display-name/`). This flat path is preserved so
 * existing importers (`../_shared/display-name.ts`) keep working unchanged.
 */

export * from "./display-name/utils.ts";

import extractDefault from "./display-name/utils.ts";

export default extractDefault;
