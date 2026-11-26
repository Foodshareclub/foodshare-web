/**
 * The current instant.
 *
 * It is a module boundary so render tests can inject a fixed clock and assert
 * what a listing shows at an exact moment. Production reads the real clock.
 */
export function now(): Date {
  return new Date();
}
