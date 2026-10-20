/**
 * Timer handle types.
 *
 * The project runs on Bun, so the ambient `setTimeout`/`setInterval` return
 * Bun's `Timer` (which carries `Symbol.dispose` and `ref`/`unref`). The
 * `NodeJS.Timeout` type is deliberately not used: it is a Node.js type, and
 * naming it here would tie the codebase to a runtime this project does not
 * use.
 *
 * `ReturnType<typeof setTimeout>` resolves to Bun's `Timer` under
 * `@types/bun` and to `NodeJS.Timeout` under `@types/node`, so the same source
 * stays type-correct on either runtime without naming either.
 */
export type TimerHandle = ReturnType<typeof setTimeout>;

/**
 * Handle returned by `setInterval`.
 *
 * Kept separate from {@link TimerHandle} for readability: an interval handle
 * is never cleared with `clearTimeout`, and mixing the two up is a bug that
 * the type system cannot catch.
 */
export type IntervalHandle = ReturnType<typeof setInterval>;
