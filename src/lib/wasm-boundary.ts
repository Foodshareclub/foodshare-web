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
 * The largest vector that crosses the boundary.
 *
 * The module reads a vector as `&[f32]`, so a vector of a million
 * numbers is a million numbers in the caller's memory and again in the
 * module's. The app's embeddings are 384 or 1536 numbers long.
 */
export const MAX_VECTOR_LENGTH = 65_536;

/**
 * The largest number of items in a batch that crosses the boundary.
 *
 * Every item of a batch is an object that the module reads, so a batch
 * of a million items is a million objects in the caller's memory and
 * again in the module's. A page of listings is a few dozen.
 */
export const MAX_BATCH_LENGTH = 10_000;

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
 * Require a number that is neither `NaN` nor infinite, and not negative.
 *
 * @throws TypeError if the value is not a number, or RangeError if it is
 *   negative or not finite.
 */
export function requireNonNegativeNumber(value: unknown, name: string): number {
  const num = requireFiniteNumber(value, name);
  if (num < 0) {
    throw new RangeError(`${name} must not be negative, got ${num}`);
  }
  return num;
}

/**
 * Require a number that is neither `NaN` nor infinite, and greater than
 * zero.
 *
 * @throws TypeError if the value is not a number, or RangeError if it is
 *   zero, negative, or not finite.
 */
export function requirePositiveNumber(value: unknown, name: string): number {
  const num = requireFiniteNumber(value, name);
  if (num <= 0) {
    throw new RangeError(`${name} must be greater than zero, got ${num}`);
  }
  return num;
}

/**
 * Require a whole number.
 *
 * @throws TypeError if the value is not a number, or RangeError if it has
 *   a fractional part.
 */
function requireInteger(value: unknown, name: string): number {
  const num = requireFiniteNumber(value, name);
  if (!Number.isInteger(num)) {
    throw new RangeError(`${name} must be a whole number, got ${num}`);
  }
  return num;
}

/**
 * Require a whole number that is not negative.
 *
 * @throws TypeError if the value is not a number, or RangeError if it is
 *   negative or has a fractional part.
 */
export function requireNonNegativeInteger(value: unknown, name: string): number {
  const num = requireInteger(value, name);
  if (num < 0) {
    throw new RangeError(`${name} must not be negative, got ${num}`);
  }
  return num;
}

/**
 * Require a whole number within a range.
 *
 * @throws TypeError if the value is not a number, or RangeError if it has
 *   a fractional part or lies outside the range.
 */
export function requireIntegerInRange(value: unknown, name: string, min: number, max: number): number {
  const num = requireInteger(value, name);
  if (num < min || num > max) {
    throw new RangeError(`${name} must be between ${min} and ${max}, got ${num}`);
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
 * Require a vector of finite numbers.
 *
 * The module reads a vector as `&[f32]`, so a value that is not a vector
 * cannot be handed over: `new Float32Array("abc")` is empty, and
 * `new Float32Array(5)` is five zeros, and either would be measured as
 * though it were the embedding the caller meant to pass.
 *
 * A vector of the wrong length is not an error: the module measures the
 * two vectors against each other and answers with a similarity of zero
 * when they do not match, which is what a caller wants to see.
 *
 * @throws TypeError if the value is not a vector, or holds a value that is
 *   not a number.
 * @throws RangeError if the vector holds a value that is not finite.
 */
export function requireVector(value: unknown, name: string): Float32Array {
  if (value instanceof Float32Array) {
    if (value.length > MAX_VECTOR_LENGTH) {
      throw new RangeError(`${name} must hold at most ${MAX_VECTOR_LENGTH} numbers, got ${value.length}`);
    }
    for (let index = 0; index < value.length; index++) {
      const entry = value[index];
      if (!Number.isFinite(entry)) {
        throw new RangeError(`${name}[${index}] must be a finite number, got ${entry}`);
      }
    }
    return value;
  }
  if (!Array.isArray(value)) {
    throw new TypeError(`${name} must be a vector of numbers, got ${describe(value)}`);
  }
  if (value.length > MAX_VECTOR_LENGTH) {
    throw new RangeError(`${name} must hold at most ${MAX_VECTOR_LENGTH} numbers, got ${value.length}`);
  }
  return new Float32Array(value.map((entry, index) => requireFiniteNumber(entry, `${name}[${index}]`)));
}

/**
 * Require an array.
 *
 * @throws TypeError if the value is not an array.
 * @throws RangeError if the array is longer than the limit.
 */
export function requireArray<T>(value: unknown, name: string, maxLength = MAX_BATCH_LENGTH): T[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${name} must be an array, got ${describe(value)}`);
  }
  if (value.length > maxLength) {
    throw new RangeError(`${name} must hold at most ${maxLength} items, got ${value.length}`);
  }
  return value as T[];
}

/**
 * Require an identifier: a string, or a number that is not `NaN`.
 *
 * @throws TypeError if the value is neither a string nor a number.
 * @throws RangeError if the value is a number that is not finite.
 */
export function requireIdentifier(value: unknown, name: string): string | number {
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new RangeError(`${name} must be a finite number, got ${value}`);
    }
    return value;
  }
  throw new TypeError(`${name} must be a string or a number, got ${describe(value)}`);
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
