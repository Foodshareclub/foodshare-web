import { describe, expect, it } from "bun:test";
import {
  compressAuto,
  compressBrotli,
  compressGzip,
  decompressBrotliString,
  decompressGzipString,
  generateETag,
} from "@/lib/wasm-compression";
import { buildOtpAuthUri, constantTimeEquals, generateTotp, hmacSha256, verifyTotp } from "@/lib/wasm-crypto";
import {
  calculateHaversineDistance,
  calculateItemDistances,
  filterItemsWithinRadius,
  parsePostGisLocation,
} from "@/lib/wasm-geo";
import {
  calculateSmartWidth,
  detectImageFormat,
  extractImageMetadata,
  getImageMimeType,
  isValidImage,
} from "@/lib/wasm-image";
import {
  calculateDistanceDecay,
  calculateHybridScore,
  cosineSimilarity,
  fuseRankedLists,
  l2Distance,
  normalizeVectorDimensions,
} from "@/lib/wasm-search";

describe("WebAssembly Crypto & TOTP Bridges", () => {
  const secret = "12345678901234567890";

  it("generates correct RFC 6238 TOTP codes", () => {
    const code59s = generateTotp(secret, 59);
    expect(code59s).toBe("287082");

    const code1111s = generateTotp(secret, 1111111109);
    expect(code1111s).toBe("081804");
  });

  it("verifies TOTP code within drift window", () => {
    const code = generateTotp(secret, 1000);
    // Exact match
    expect(verifyTotp(secret, code, 1000)).toBe(true);
    // Within drift window
    expect(verifyTotp(secret, code, 1025)).toBe(true);
    // Invalid code
    expect(verifyTotp(secret, "999999", 1000)).toBe(false);
  });

  it("treats the epoch as a timestamp rather than as 'now'", () => {
    // RFC 4226 test vector: counter 0 is the epoch itself.
    expect(generateTotp(secret, 0)).toBe("755224");
  });

  it("floors a fractional timestamp to whole seconds", () => {
    expect(generateTotp(secret, 59.9)).toBe(generateTotp(secret, 59));
  });

  it("refuses a negative timestamp", () => {
    expect(() => generateTotp(secret, -1)).toThrow(RangeError);
  });

  it("generates valid OTPAuth URI", () => {
    const uri = buildOtpAuthUri("user@foodshare.club", "JBSWY3DPEHPK3PXP");
    expect(uri).toContain("otpauth://totp/FoodShare:user@foodshare.club");
    expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
  });

  it("performs constant-time string comparison", () => {
    expect(constantTimeEquals("token-abc-123", "token-abc-123")).toBe(true);
    expect(constantTimeEquals("token-abc-123", "token-xyz-999")).toBe(false);
  });
});

describe("WebAssembly Vector Search & RRF Bridges", () => {
  it("calculates cosine similarity and L2 distance correctly", () => {
    const a = new Float32Array([1, 2, 3]);
    const b = new Float32Array([1, 2, 3]);
    const sim = cosineSimilarity(a, b);
    expect(Math.abs(sim - 1.0)).toBeLessThan(1e-5);

    const dist = l2Distance(a, b);
    expect(dist).toBe(0.0);
  });

  it("normalizes vector dimensions to 384", () => {
    const raw = [1, 2, 3];
    const normalized = normalizeVectorDimensions(raw, 384);
    expect(normalized.length).toBe(384);
    expect(normalized[0]).toBe(1);
    expect(normalized[1]).toBe(2);
    expect(normalized[2]).toBe(3);
    expect(normalized[3]).toBe(0);
  });

  it("fuses ranked lists using Reciprocal Rank Fusion", () => {
    const listA = ["item1", "item2", "item3"];
    const listB = ["item2", "item1", "item4"];
    const fused = fuseRankedLists([listA, listB]);

    expect(fused.length).toBe(4);
    expect(fused[0].score).toBeGreaterThan(fused[2].score);
  });

  it("fuses numeric identifiers", () => {
    const fused = fuseRankedLists([
      [1, 2, 3],
      [2, 1, 4],
    ]);

    expect(fused.length).toBe(4);
    expect(fused.map((item) => item.id).sort()).toEqual([1, 2, 3, 4]);
  });

  it("keeps a numeric identifier distinct from the same digits as a string", () => {
    const fused = fuseRankedLists([[1], ["1"]]);

    expect(fused.length).toBe(2);
    expect(fused.map((item) => item.id).sort()).toEqual([1, "1"]);
  });

  it("orders equally scored results the same way every time", () => {
    const lists = [
      ["a", "b", "c", "d", "e"],
      ["b", "a", "d", "c", "e"],
    ];
    const orders = new Set<string>();

    for (let attempt = 0; attempt < 8; attempt++) {
      orders.add(fuseRankedLists(lists).map((item) => item.id).join(","));
    }

    expect(orders.size).toBe(1);
  });

  it("calculates multi-modal hybrid score combining vector, text, and geo", () => {
    const qVec = [1, 0, 0];
    const itemVec = [1, 0, 0];

    const scoreNear = calculateHybridScore({
      textQuery: "sourdough",
      targetText: "Fresh artisan sourdough bread",
      queryVector: qVec,
      itemVector: itemVec,
      distanceKm: 1.0,
    });

    const scoreFar = calculateHybridScore({
      textQuery: "sourdough",
      targetText: "Fresh artisan sourdough bread",
      queryVector: qVec,
      itemVector: itemVec,
      distanceKm: 50.0,
    });

    expect(scoreNear).toBeGreaterThan(scoreFar);
    expect(scoreNear).toBeGreaterThan(0.9);
  });

  it("calculates exponential distance decay", () => {
    expect(calculateDistanceDecay(0.0, 10.0)).toBeCloseTo(1.0, 3);
    expect(calculateDistanceDecay(10.0, 10.0)).toBeCloseTo(0.5, 2);
    expect(calculateDistanceDecay(20.0, 10.0)).toBeCloseTo(0.25, 2);
  });
});

describe("WebAssembly Geospatial Bridges", () => {
  it("calculates Haversine distance correctly", () => {
    // London (51.5074, -0.1278) to Paris (48.8566, 2.3522) ~ 343 km
    const dist = calculateHaversineDistance(51.5074, -0.1278, 48.8566, 2.3522);
    expect(dist).toBeGreaterThan(340);
    expect(dist).toBeLessThan(346);
  });

  it("filters items within radius", () => {
    const items = [
      { id: "near", location: { coordinates: [8.6821, 50.1109] } },
      { id: "far", location: { coordinates: [13.405, 52.52] } },
    ];

    const filtered = filterItemsWithinRadius(50.1109, 8.6821, items, 50);

    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("near");
  });

  it("keeps the item's own fields when filtering by radius", () => {
    const items = [
      { id: "near", title: "Pantry on Main St", location: { coordinates: [8.6821, 50.1109] } },
      { id: "far", title: "Far away", location: { coordinates: [13.405, 52.52] } },
    ];

    const filtered = filterItemsWithinRadius(50.1109, 8.6821, items, 50);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe("Pantry on Main St");
    expect(filtered[0].location).toEqual({ coordinates: [8.6821, 50.1109] });
    expect(filtered[0].distance).toBeCloseTo(0, 3);
  });

  it("keeps the item's own fields when calculating distances", () => {
    const items = [{ id: 7, title: "Seven", location: { coordinates: [8.6821, 50.1109] } }];

    const measured = calculateItemDistances(50.1109, 8.6821, items);

    expect(measured).toHaveLength(1);
    expect(measured[0].id).toBe(7);
    expect(measured[0].title).toBe("Seven");
    expect(measured[0].distance).toBeCloseTo(0, 3);
  });

  it("measures one item without a location as infinitely far away", () => {
    const items = [
      { id: "here", location: { coordinates: [8.6821, 50.1109] } },
      { id: "nowhere" },
    ];

    const measured = calculateItemDistances(50.1109, 8.6821, items);

    expect(measured[0].distance).toBeCloseTo(0, 3);
    expect(measured[1].distance).toBe(Number.POSITIVE_INFINITY);
  });

  it("parses PostGIS WKT points", () => {
    const parsed = parsePostGisLocation("POINT(8.6821 50.1109)");

    expect(parsed).not.toBeNull();
    expect(parsed?.latitude).toBeCloseTo(50.1109, 4);
    expect(parsed?.longitude).toBeCloseTo(8.6821, 4);
  });

  it("parses the SRID-prefixed WKT the app stores", () => {
    const parsed = parsePostGisLocation("SRID=4326;POINT(8.6821 50.1109)");

    expect(parsed).not.toBeNull();
    expect(parsed?.latitude).toBeCloseTo(50.1109, 4);
    expect(parsed?.longitude).toBeCloseTo(8.6821, 4);
  });

  it("parses a latitude/longitude pair", () => {
    const parsed = parsePostGisLocation({ latitude: 50.1109, longitude: 8.6821 });

    expect(parsed?.latitude).toBeCloseTo(50.1109, 4);
    expect(parsed?.longitude).toBeCloseTo(8.6821, 4);
  });

  it("returns null for a location that holds no point", () => {
    expect(parsePostGisLocation(null)).toBeNull();
    expect(parsePostGisLocation("not a point")).toBeNull();
  });
});

describe("WebAssembly Compression & ETag Bridges", () => {
  const samplePayload = "FoodShare community pantry listing - fresh organic produce available for pickup!".repeat(20);

  it("compresses and decompresses with Brotli", () => {
    const compressed = compressBrotli(samplePayload, 4);
    expect(compressed.length).toBeLessThan(samplePayload.length);

    const decompressed = decompressBrotliString(compressed);
    expect(decompressed).toBe(samplePayload);
  });

  it("compresses and decompresses with Gzip", () => {
    const compressed = compressGzip(samplePayload, 6);
    expect(compressed.length).toBeLessThan(samplePayload.length);

    const decompressed = decompressGzipString(compressed);
    expect(decompressed).toBe(samplePayload);
  });

  it("generates deterministic SHA-256 ETags", () => {
    const etag1 = generateETag("item-listing-12345");
    const etag2 = generateETag("item-listing-12345");
    const etagDiff = generateETag("item-listing-67890");

    expect(etag1).toBe(etag2);
    expect(etag1).not.toBe(etagDiff);
    expect(etag1).toMatch(/^"[a-f0-9]{32}"$/);
  });

  it("auto-selects compression algorithm based on size", () => {
    const smallPayload = "small";
    const compressedSmall = compressAuto(smallPayload);
    expect(compressedSmall.length).toBeGreaterThan(0);

    const largePayload = samplePayload;
    const compressedLarge = compressAuto(largePayload);
    expect(compressedLarge.length).toBeLessThan(largePayload.length);
  });
});

describe("WebAssembly Image Geometry & Format Detection Bridges", () => {
  // PNG Magic bytes: 89 50 4E 47 0D 0A 1A 0A
  const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  // JPEG Magic bytes: FF D8 FF
  const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  // GIF Magic bytes: GIF89a
  const gifHeader = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x64, 0x00, 0x64, 0x00, 0x80, 0x00]);

  it("detects image formats from magic bytes", () => {
    expect(detectImageFormat(pngHeader)).toBe("png");
    expect(detectImageFormat(jpegHeader)).toBe("jpeg");
    expect(detectImageFormat(gifHeader)).toBe("gif");
    expect(detectImageFormat(new Uint8Array([0x00, 0x00, 0x00, 0x00]))).toBeNull();
  });

  it("resolves MIME types correctly", () => {
    expect(getImageMimeType(pngHeader)).toBe("image/png");
    expect(getImageMimeType(jpegHeader)).toBe("image/jpeg");
    expect(getImageMimeType(gifHeader)).toBe("image/gif");
  });

  it("checks image validity", () => {
    expect(isValidImage(pngHeader)).toBe(true);
    expect(isValidImage(jpegHeader)).toBe(true);
    expect(isValidImage(new Uint8Array([1, 2, 3, 4]))).toBe(false);
  });

  it("calculates smart target widths across size tiers", () => {
    // 3MB image with 4000px width -> ExtraLarge tier target 600px
    const targetLarge = calculateSmartWidth(3 * 1024 * 1024, 4000, 3000);
    expect(targetLarge).toBe(600);

    // 100KB small image -> 0 (no resize needed)
    const targetSmall = calculateSmartWidth(100 * 1024, 800, 600);
    expect(targetSmall).toBe(0);
  });

  it("extracts GIF dimensions from raw byte buffer", () => {
    const meta = extractImageMetadata(gifHeader);
    expect(meta).not.toBeNull();
    if (meta) {
      expect(meta.width).toBe(100);
      expect(meta.height).toBe(100);
      expect(meta.is_square).toBe(true);
      expect(meta.aspect_ratio).toBe(1);
    }
  });

  it("extracts PNG dimensions from raw byte buffer", () => {
    // A real 1x1 PNG, header and all.
    const png = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
      0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
      0x42, 0x60, 0x82,
    ]);

    const meta = extractImageMetadata(png);
    expect(meta).not.toBeNull();
    if (meta) {
      expect(meta.width).toBe(1);
      expect(meta.height).toBe(1);
      expect(meta.format).toBe("png");
      expect(meta.is_square).toBe(true);
    }
  });

  it("returns null for bytes that hold no image", () => {
    expect(extractImageMetadata(new Uint8Array([0, 0, 0, 0]))).toBeNull();
  });
});

describe("WebAssembly Boundary Guards", () => {
  /**
   * The modules read their arguments out of their own memory, and a
   * `&str` parameter is read by length. A value that is not a string
   * sends the read off the end of the allocation: an out-of-bounds
   * access inside the module, which is not a JavaScript exception and so
   * cannot be caught by a caller. Every bridge therefore checks first.
   */

  it("refuses a value that is not a string", () => {
    for (const value of [12345, null, undefined, {}, []]) {
      expect(() => verifyTotp(value as never, "123456")).toThrow();
      expect(() => generateTotp(value as never)).toThrow();
      expect(() => buildOtpAuthUri(value as never, "JBSWY3DPEHPK3PXP")).toThrow();
      expect(() => constantTimeEquals(value as never, "b")).toThrow();
      expect(() => hmacSha256(value as never, "message")).toThrow();
    }
  });

  it("refuses a value that is not a finite number", () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() => calculateHaversineDistance(value, 0, 0, 0)).toThrow();
      expect(() => calculateHaversineDistance(0, value, 0, 0)).toThrow();
      expect(() => calculateDistanceDecay(value)).toThrow();
      expect(() => calculateSmartWidth(value, 100, 100)).toThrow();
    }

    for (const value of ["50", null, undefined, {}]) {
      expect(() => calculateHaversineDistance(value as never, 0, 0, 0)).toThrow();
      expect(() => calculateDistanceDecay(value as never)).toThrow();
    }
  });

  it("refuses a dimension that is not a whole, non-negative number", () => {
    expect(() => calculateSmartWidth(1024, 4000.5, 3000)).toThrow();
    expect(() => calculateSmartWidth(1024, -1, 3000)).toThrow();
    expect(() => calculateSmartWidth(1024, 4000, -1)).toThrow();
  });

  it("refuses a byte buffer that is not one", () => {
    for (const value of [null, undefined, "GIF89a", [1, 2, 3], {}]) {
      expect(() => detectImageFormat(value as never)).toThrow();
      expect(() => getImageMimeType(value as never)).toThrow();
      expect(() => isValidImage(value as never)).toThrow();
      expect(() => extractImageMetadata(value as never)).toThrow();
      expect(() => decompressBrotliString(value as never)).toThrow();
      expect(() => decompressGzipString(value as never)).toThrow();
    }
  });

  it("refuses a vector that is not made of numbers", () => {
    const options = { textQuery: "a", targetText: "b" };

    expect(() => calculateHybridScore({ ...options, queryVector: "abc" as never })).toThrow();
    expect(() => calculateHybridScore({ ...options, itemVector: ["x", "y"] as never })).toThrow();
    expect(() => calculateHybridScore({ ...options, queryVector: [1, Number.NaN] })).toThrow();
  });

  it("refuses a query that is not a string", () => {
    expect(() => calculateHybridScore({ textQuery: 42 as never, targetText: "b" })).toThrow();
    expect(() => calculateHybridScore({ textQuery: "a", targetText: 42 as never })).toThrow();
  });

  it("refuses a vector that is not a vector at all", () => {
    // `new Float32Array("abc")` is empty and `new Float32Array(5)` is
    // five zeros, so a value that is not a vector would be measured as
    // though it were the embedding the caller meant to pass.
    for (const value of ["abc", 5, null, undefined, {}, true]) {
      expect(() => cosineSimilarity(value as never, [1, 2])).toThrow();
      expect(() => l2Distance([1, 2], value as never)).toThrow();
    }
  });

  it("refuses a vector that holds a value that is not a number", () => {
    expect(() => cosineSimilarity([1, "2"] as never, [1, 2])).toThrow();
    expect(() => l2Distance([1, 2], [1, Number.NaN])).toThrow();
    expect(() => cosineSimilarity(new Float32Array([1, Number.NaN]), new Float32Array([1, 2]))).toThrow();
  });

  it("refuses a vector size that is not a whole number in range", () => {
    expect(() => normalizeVectorDimensions([1, 2, 3], -1)).toThrow();
    expect(() => normalizeVectorDimensions([1, 2, 3], 1.5)).toThrow();
    expect(() => normalizeVectorDimensions([1, 2, 3], 10_000_000)).toThrow();
  });

  it("refuses an identifier that is not a string or a number", () => {
    expect(() => fuseRankedLists([[{} as never]])).toThrow();
    expect(() => fuseRankedLists([[Number.NaN as never]])).toThrow();
  });

  it("refuses a fusion constant that is not a number of at least zero", () => {
    expect(() => fuseRankedLists([["a"]], -1)).toThrow();
    expect(() => fuseRankedLists([["a"]], Number.NaN)).toThrow();
  });

  it("refuses a weight that is not a number of at least zero", () => {
    const options = { textQuery: "a", targetText: "b" };

    for (const weight of [-1, Number.NaN, "0.45"]) {
      expect(() => calculateHybridScore({ ...options, vectorWeight: weight as never })).toThrow();
      expect(() => calculateHybridScore({ ...options, textWeight: weight as never })).toThrow();
      expect(() => calculateHybridScore({ ...options, geoWeight: weight as never })).toThrow();
    }
  });

  it("refuses a half-life that is not a number greater than zero", () => {
    const options = { textQuery: "a", targetText: "b" };

    // The module holds a half-life of ten kilometres for a value of zero
    // or less, so a half-life of zero is a different curve from the one
    // that was asked for, and it is answered with as though it were the
    // one that was asked for.
    expect(() => calculateHybridScore({ ...options, halfLifeKm: 0 })).toThrow();
    expect(() => calculateHybridScore({ ...options, halfLifeKm: -1 })).toThrow();
    expect(() => calculateDistanceDecay(10, 0)).toThrow();
    expect(() => calculateDistanceDecay(10, -1)).toThrow();
  });

  it("refuses a distance that is not a number of at least zero", () => {
    expect(() => calculateDistanceDecay(-1)).toThrow();
    expect(() => calculateHybridScore({ textQuery: "a", targetText: "b", distanceKm: -1 })).toThrow();
  });

  it("refuses a drift window that is not a whole number of at least zero", () => {
    const secret = "12345678901234567890";
    const code = generateTotp(secret, 1000);

    // The module steps backwards and forwards through the window, so a
    // negative window leaves it nothing to check and every code comes
    // back unverified.
    expect(() => verifyTotp(secret, code, 1000, -1)).toThrow();
    expect(() => verifyTotp(secret, code, 1000, 1.5)).toThrow();
    expect(() => verifyTotp(secret, code, 1000, Number.NaN)).toThrow();
  });

  it("refuses a reference point that is not a finite number", () => {
    const items = [{ id: "near", location: { coordinates: [8.6821, 50.1109] } }];

    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, "50"]) {
      expect(() => calculateItemDistances(value as never, 8.6821, items)).toThrow();
      expect(() => calculateItemDistances(50.1109, value as never, items)).toThrow();
      expect(() => filterItemsWithinRadius(value as never, 8.6821, items, 50)).toThrow();
      expect(() => filterItemsWithinRadius(50.1109, value as never, items, 50)).toThrow();
    }
  });

  it("refuses a radius that is not a number of at least zero", () => {
    const items = [{ id: "near", location: { coordinates: [8.6821, 50.1109] } }];

    expect(() => filterItemsWithinRadius(50.1109, 8.6821, items, -1)).toThrow();
    expect(() => filterItemsWithinRadius(50.1109, 8.6821, items, Number.NaN)).toThrow();
  });

  it("refuses a compression level that is outside the range the encoder takes", () => {
    expect(() => compressBrotli("payload", 12)).toThrow();
    expect(() => compressBrotli("payload", -1)).toThrow();
    expect(() => compressGzip("payload", 10)).toThrow();
    expect(() => compressGzip("payload", -1)).toThrow();
  });

  it("still accepts a vector of a length the other vector does not match", () => {
    // The two vectors are measured against each other, and a mismatch
    // answers with a similarity of zero, which is what a caller wants.
    const score = calculateHybridScore({
      textQuery: "bread",
      targetText: "bread",
      queryVector: [1, 2],
      itemVector: [1, 2, 3],
    });

    expect(Number.isFinite(score)).toBe(true);
  });
});
