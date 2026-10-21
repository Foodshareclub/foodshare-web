import { describe, expect, it } from "bun:test";

/**
 * The guards at the WebAssembly boundary.
 *
 * Every bridge checks its arguments here, so a caller that passes the
 * wrong thing gets an ordinary error instead of an out-of-bounds access
 * inside a module.
 *
 * The errors are what the `/api/engine/*` endpoints answer with, so the
 * two kinds matter: a `TypeError` or a `RangeError` is a body the caller
 * got wrong and is answered with a 400, and anything else is a fault of
 * the server.
 */

import {
  MAX_BATCH_LENGTH,
  MAX_VECTOR_LENGTH,
  requireArray,
  requireByteArray,
  requireFiniteNumber,
  requireIdentifier,
  requireIntegerInRange,
  requireNonNegativeInteger,
  requireNonNegativeNumber,
  requirePositiveNumber,
  requireString,
  requireVector,
} from "@/lib/wasm-boundary";

describe("requireString", () => {
  it("accepts a string", () => {
    expect(requireString("hello", "name")).toBe("hello");
    expect(requireString("", "name")).toBe("");
  });

  it("refuses anything else", () => {
    for (const value of [42, null, undefined, {}, [], true]) {
      expect(() => requireString(value, "name")).toThrow(TypeError);
    }
  });

  it("names the field in the message", () => {
    expect(() => requireString(42, "secret")).toThrow(/secret/);
  });
});

describe("requireFiniteNumber", () => {
  it("accepts a finite number", () => {
    expect(requireFiniteNumber(0, "n")).toBe(0);
    expect(requireFiniteNumber(-1.5, "n")).toBe(-1.5);
  });

  it("refuses a value that is not a number", () => {
    for (const value of ["50", null, undefined, {}, []]) {
      expect(() => requireFiniteNumber(value, "n")).toThrow(TypeError);
    }
  });

  it("refuses a number that is not finite", () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() => requireFiniteNumber(value, "n")).toThrow(RangeError);
    }
  });
});

describe("requireNonNegativeNumber", () => {
  it("accepts zero and above", () => {
    expect(requireNonNegativeNumber(0, "n")).toBe(0);
    expect(requireNonNegativeNumber(3.5, "n")).toBe(3.5);
  });

  it("refuses a negative number", () => {
    expect(() => requireNonNegativeNumber(-1, "n")).toThrow(RangeError);
  });
});

describe("requirePositiveNumber", () => {
  it("accepts a number above zero", () => {
    expect(requirePositiveNumber(0.5, "n")).toBe(0.5);
  });

  it("refuses zero and below", () => {
    expect(() => requirePositiveNumber(0, "n")).toThrow(RangeError);
    expect(() => requirePositiveNumber(-1, "n")).toThrow(RangeError);
  });
});

describe("requireNonNegativeInteger", () => {
  it("accepts a whole number that is not negative", () => {
    expect(requireNonNegativeInteger(0, "n")).toBe(0);
    expect(requireNonNegativeInteger(7, "n")).toBe(7);
  });

  it("refuses a number with a fractional part", () => {
    expect(() => requireNonNegativeInteger(1.5, "n")).toThrow(RangeError);
  });

  it("refuses a negative number", () => {
    expect(() => requireNonNegativeInteger(-1, "n")).toThrow(RangeError);
  });
});

describe("requireIntegerInRange", () => {
  it("accepts a whole number inside the range", () => {
    expect(requireIntegerInRange(5, "n", 0, 10)).toBe(5);
    expect(requireIntegerInRange(0, "n", 0, 10)).toBe(0);
    expect(requireIntegerInRange(10, "n", 0, 10)).toBe(10);
  });

  it("refuses a number outside the range", () => {
    expect(() => requireIntegerInRange(-1, "n", 0, 10)).toThrow(RangeError);
    expect(() => requireIntegerInRange(11, "n", 0, 10)).toThrow(RangeError);
  });

  it("refuses a number with a fractional part", () => {
    expect(() => requireIntegerInRange(5.5, "n", 0, 10)).toThrow(RangeError);
  });
});

describe("requireByteArray", () => {
  it("accepts a byte buffer", () => {
    const bytes = new Uint8Array([1, 2, 3]);

    expect(requireByteArray(bytes, "data")).toBe(bytes);
  });

  it("accepts a buffer that is a byte buffer", () => {
    expect(requireByteArray(Buffer.from([1, 2, 3]), "data")).toBeInstanceOf(Uint8Array);
  });

  it("refuses anything else", () => {
    for (const value of [null, undefined, "GIF89a", [1, 2, 3], {}, 42]) {
      expect(() => requireByteArray(value, "data")).toThrow(TypeError);
    }
  });
});

describe("requireVector", () => {
  it("accepts an array of numbers", () => {
    const vector = requireVector([1, 2, 3], "v");

    expect(vector).toBeInstanceOf(Float32Array);
    expect([...vector]).toEqual([1, 2, 3]);
  });

  it("accepts a float array as it is", () => {
    const vector = new Float32Array([1, 2, 3]);

    expect(requireVector(vector, "v")).toBe(vector);
  });

  it("refuses a value that is not a vector", () => {
    // `new Float32Array("abc")` is empty and `new Float32Array(5)` is
    // five zeros, so either would be measured as though it were the
    // embedding the caller meant to pass.
    for (const value of ["abc", 5, null, undefined, {}, true]) {
      expect(() => requireVector(value, "v")).toThrow(TypeError);
    }
  });

  it("refuses a vector that holds a value that is not a number", () => {
    expect(() => requireVector([1, "2"], "v")).toThrow(TypeError);
    expect(() => requireVector([1, Number.NaN], "v")).toThrow(RangeError);
    expect(() => requireVector(new Float32Array([1, Number.NaN]), "v")).toThrow(RangeError);
  });

  it("refuses a vector that is longer than the limit", () => {
    expect(() => requireVector(new Array(MAX_VECTOR_LENGTH + 1).fill(0), "v")).toThrow(RangeError);
  });

  it("accepts a vector of the longest length the limit allows", () => {
    expect(() => requireVector(new Array(MAX_VECTOR_LENGTH).fill(0), "v")).not.toThrow();
  });
});

describe("requireArray", () => {
  it("accepts an array", () => {
    const items = [1, 2, 3];

    expect(requireArray(items, "items")).toBe(items);
  });

  it("refuses a value that is not an array", () => {
    for (const value of [null, undefined, "abc", 5, {}]) {
      expect(() => requireArray(value, "items")).toThrow(TypeError);
    }
  });

  it("refuses an array that is longer than the limit", () => {
    expect(() => requireArray(new Array(MAX_BATCH_LENGTH + 1).fill(0), "items")).toThrow(RangeError);
  });

  it("takes a limit of its own", () => {
    expect(() => requireArray([1, 2, 3], "items", 2)).toThrow(RangeError);
  });
});

describe("requireIdentifier", () => {
  it("accepts a string or a number", () => {
    expect(requireIdentifier("item1", "id")).toBe("item1");
    expect(requireIdentifier(42, "id")).toBe(42);
  });

  it("refuses anything else", () => {
    for (const value of [null, undefined, {}, [], true]) {
      expect(() => requireIdentifier(value, "id")).toThrow(TypeError);
    }
  });

  it("refuses a number that is not finite", () => {
    expect(() => requireIdentifier(Number.NaN, "id")).toThrow(RangeError);
  });
});
