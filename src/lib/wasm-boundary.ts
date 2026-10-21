/**
 * Guards for the WebAssembly boundary.
 *
 * The modules behind `src/lib/wasm-*.ts` are compiled from Rust and trust
 * their arguments. A `&str` parameter read out of the module's memory by
 * length, so a value that is not a string sends it off the end of the
 * allocation: `malloc` is asked for a length that is not a number, and the
 * copy that follows writes outside the buffer. That is an out-of-bounds
 * access inside the module, not a JavaScript exception, so it does not
 * behave like a normal type error.
 *
 * Every bridge checks its arguments here, so a caller that passes the
 * wrong type gets an ordinary error instead.
 *
 * @module lib/wasm-boundary
 */

/**
 * Require a string.
 *
 * @throws TypeError if the value is not a string.
 */
export function requireString(value: unknown, name: string): string {
  if (typeof value !== "string") {
    throw new TypeError(`${name} must be a string, got ${describe(value)}`);
  }
  return value;
}

/**
 * Require a number that is neither `NaN` nor infinite.
 *
 * @throws TypeError if the value is not a number, or RangeError if it is
 *   not finite.
 */
export function requireFiniteNumber(value: unknown, name: string): number {
  if (typeof value !== "number") {
    throw new TypeError(`${name} must be a number, got ${describe(value)}`);
  }
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number, got ${value}`);
  }
  return value;
}

/**
 * Require a whole number that is not negative.
 *
 * @throws TypeError if the value is not a number, or RangeError if it is
 *   negative or has a fractional part.
 */
export function requireNonNegativeInteger(value: unknown, name: string): number {
  const num = requireFiniteNumber(value, name);
  if (!Number.isInteger(num)) {
    throw new RangeError(`${name} must be a whole number, got ${num}`);
  }
  if (num < 0) {
    throw new RangeError(`${name} must not be negative, got ${num}`);
  }
  return num;
}

/**
 * Require a byte buffer.
 *
 * @throws TypeError if the value is not a `Uint8Array`.
 */
export function requireByteArray(value: unknown, name: string): Uint8Array {
  if (!(value instanceof Uint8Array)) {
    throw new TypeError(`${name} must be a Uint8Array, got ${describe(value)}`);
  }
  return value;
}

/**
 * Require an array of finite numbers, or nothing at all.
 *
 * A vector of the wrong length is not an error here: the module measures
 * the two vectors against each other and answers with a similarity of zero
 * when they do not match, which is what a caller wants to see.
 *
 * @throws TypeError if the value is present and is not an array of finite
 *   numbers.
 */
export function requireNumberArray(value: unknown, name: string): number[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    throw new TypeError(`${name} must be an array of numbers, got ${describe(value)}`);
  }
  return value.map((entry, index) => requireFiniteNumber(entry, `${name}[${index}]`));
}

/**
 * Describe a value for an error message, without dumping its contents.
 */
function describe(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  if (typeof value === "object") return "an object";
  if (typeof value === "string") return "a string";
  return typeof value;
}
