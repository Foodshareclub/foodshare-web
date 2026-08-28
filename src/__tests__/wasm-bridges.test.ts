import { describe, it, expect } from "bun:test";
import { generateTotp, verifyTotp, constantTimeEquals, buildOtpAuthUri } from "@/lib/wasm-crypto";
import { cosineSimilarity, l2Distance, normalizeVectorDimensions, fuseRankedLists, calculateHybridScore, calculateDistanceDecay } from "@/lib/wasm-search";
import { calculateHaversineDistance, filterItemsWithinRadius, parsePostGisLocation } from "@/lib/wasm-geo";
import { compressBrotli, decompressBrotliString, compressGzip, decompressGzipString, generateETag, compressAuto } from "@/lib/wasm-compression";
import { detectImageFormat, getImageMimeType, calculateSmartWidth, isValidImage, extractImageMetadata } from "@/lib/wasm-image";

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

  it("generates valid OTPAuth URI", () => {
    const uri = buildOtpAuthUri("user@foodshare.club", "FoodShare", "JBSWY3DPEHPK3PXP");
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
    const userLat = 51.5074;
    const userLng = -0.1278;

    const items = [
      { id: "1", location: { latitude: 51.508, longitude: -0.128 } }, // ~0.1 km
      { id: "2", location: { latitude: 51.55, longitude: -0.13 } },   // ~5 km
      { id: "3", location: { latitude: 48.8566, longitude: 2.3522 } } // ~343 km (Paris)
    ];

    const nearby = filterItemsWithinRadius(userLat, userLng, items, 10);
    expect(nearby.length).toBe(2);
    expect(nearby[0].id).toBe("1");
    expect(nearby[1].id).toBe("2");
  });

  it("parses PostGIS WKT points", () => {
    const coords = parsePostGisLocation("POINT(-0.1278 51.5074)");
    expect(coords).not.toBeNull();
    if (coords) {
      expect(Math.abs(coords.latitude - 51.5074)).toBeLessThan(1e-4);
      expect(Math.abs(coords.longitude - (-0.1278))).toBeLessThan(1e-4);
    }
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
});



