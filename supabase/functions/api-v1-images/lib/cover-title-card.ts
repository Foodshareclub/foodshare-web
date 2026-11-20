/**
 * Deterministic local title-card renderer — the tier-3 cover floor.
 *
 * Renders a listing title card to PNG bytes with ZERO external calls: no
 * network, no environment reads, no clock, no randomness. The same title and
 * description always produce byte-identical output (and therefore the same
 * SHA-256), which is what makes the floor idempotent and auditable.
 *
 * Everything is hand-rolled to stay dependency-free inside the edge isolate:
 * a 5x7 bitmap font, greedy word wrap, and a PNG encoder that emits stored
 * (uncompressed) deflate blocks. The output is a valid RGB PNG accepted by
 * every decoder; it is deliberately not size-optimized — determinism and
 * zero-dependency are the contract, and the result stays under the 5MB
 * raster bound enforced by `rasterType`.
 *
 * @module api-v1-images/lib/cover-title-card
 */

export const TITLE_CARD_WIDTH = 1200;
export const TITLE_CARD_HEIGHT = 630;

type RGB = readonly [number, number, number];

interface Palette {
  background: RGB;
  foreground: RGB;
  accent: RGB;
}

/** Fixed palette set; the text hash selects one deterministically. */
const PALETTES: readonly Palette[] = [
  { background: [27, 67, 50], foreground: [241, 248, 233], accent: [149, 213, 178] },
  { background: [127, 85, 57], foreground: [255, 248, 240], accent: [230, 204, 178] },
  { background: [157, 2, 8], foreground: [255, 248, 240], accent: [255, 186, 8] },
  { background: [0, 48, 73], foreground: [253, 240, 213], accent: [247, 127, 0] },
  { background: [96, 108, 56], foreground: [254, 250, 224], accent: [221, 161, 94] },
  { background: [95, 15, 64], foreground: [251, 248, 204], accent: [252, 163, 17] },
  { background: [38, 70, 83], foreground: [233, 245, 219], accent: [233, 196, 106] },
  { background: [106, 4, 15], foreground: [255, 234, 236], accent: [249, 199, 79] },
];

/**
 * 5x7 bitmap font. Each glyph is seven rows of five bits (MSB = leftmost
 * pixel). Lowercase maps to uppercase; unsupported code points render as a
 * solid "tofu" box, the standard font fallback, so any input string renders.
 */
const FONT: Record<string, readonly number[]> = {
  "A": [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  "B": [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  "C": [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  "D": [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  "E": [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  "F": [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  "G": [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  "H": [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  "I": [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x1f],
  "J": [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  "K": [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  "L": [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  "M": [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  "N": [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  "O": [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  "P": [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  "Q": [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  "R": [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  "S": [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  "T": [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  "U": [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  "V": [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  "W": [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  "X": [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  "Y": [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  "Z": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  " ": [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  ".": [0x00, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x0c],
  ",": [0x00, 0x00, 0x00, 0x00, 0x0c, 0x04, 0x08],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04],
  "?": [0x0e, 0x11, 0x01, 0x02, 0x04, 0x00, 0x04],
  "'": [0x04, 0x04, 0x08, 0x00, 0x00, 0x00, 0x00],
  '"': [0x0a, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x00],
  "-": [0x00, 0x00, 0x00, 0x1f, 0x00, 0x00, 0x00],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "/": [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  ":": [0x00, 0x0c, 0x0c, 0x00, 0x0c, 0x0c, 0x00],
  ";": [0x00, 0x0c, 0x0c, 0x00, 0x0c, 0x04, 0x08],
  "+": [0x00, 0x04, 0x04, 0x1f, 0x04, 0x04, 0x00],
  "%": [0x19, 0x1a, 0x02, 0x04, 0x08, 0x0b, 0x13],
  "#": [0x0a, 0x0a, 0x1f, 0x0a, 0x1f, 0x0a, 0x0a],
  "@": [0x0e, 0x11, 0x17, 0x15, 0x16, 0x10, 0x0e],
};
const TOFU = [0x1f, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1f];

/** FNV-1a over the UTF-8 bytes — stable across runs and platforms. */
function fnv1a(text: string): number {
  const bytes = new TextEncoder().encode(text);
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Control characters carry no glyph; treat them as whitespace. */
function layoutText(text: string): string {
  let out = "";
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    out += code < 0x20 || code === 0x7f ? " " : char;
  }
  return out.replace(/\s+/g, " ").trim();
}

/** Greedy word wrap; over-long words are hard-split. Pure and deterministic. */
function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = layoutText(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    let remaining = word;
    while (remaining.length > maxChars) {
      if (current) {
        lines.push(current);
        current = "";
      }
      lines.push(remaining.slice(0, maxChars));
      remaining = remaining.slice(maxChars);
      if (lines.length >= maxLines) break;
    }
    if (lines.length >= maxLines) break;
    if (!current) current = remaining;
    else if (current.length + 1 + remaining.length <= maxChars) current += " " + remaining;
    else {
      lines.push(current);
      current = remaining;
    }
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  const overflow = lines.length > maxLines ||
    words.join(" ").length > lines.join(" ").length;
  if (overflow && lines.length > 0) {
    const last = lines[maxLines - 1] ?? "";
    lines[maxLines - 1] = last.length > maxChars - 3
      ? last.slice(0, maxChars - 3) + "..."
      : last + "...";
    lines.length = maxLines;
  }
  return lines;
}

class Canvas {
  readonly pixels: Uint8Array;
  constructor(readonly width: number, readonly height: number, background: RGB) {
    this.pixels = new Uint8Array(width * height * 3);
    for (let i = 0; i < this.pixels.length; i += 3) {
      this.pixels[i] = background[0];
      this.pixels[i + 1] = background[1];
      this.pixels[i + 2] = background[2];
    }
  }
  fillRect(x: number, y: number, w: number, h: number, color: RGB): void {
    const x0 = Math.max(0, x);
    const y0 = Math.max(0, y);
    const x1 = Math.min(this.width, x + w);
    const y1 = Math.min(this.height, y + h);
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const offset = (py * this.width + px) * 3;
        this.pixels[offset] = color[0];
        this.pixels[offset + 1] = color[1];
        this.pixels[offset + 2] = color[2];
      }
    }
  }
  drawText(text: string, x: number, y: number, scale: number, color: RGB): void {
    let cursor = x;
    for (const char of text.toUpperCase()) {
      const glyph = FONT[char] ?? TOFU;
      for (let row = 0; row < 7; row++) {
        const bits = glyph[row];
        for (let col = 0; col < 5; col++) {
          if (bits & (0x10 >> col)) {
            this.fillRect(cursor + col * scale, y + row * scale, scale, scale, color);
          }
        }
      }
      cursor += 6 * scale; // 5 pixel columns + 1 column of spacing
    }
  }
}

// ---------------------------------------------------------------------------
// Minimal PNG encoder (RGB8, stored deflate blocks — no compression library)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (const byte of bytes) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function writeUint32BE(target: Uint8Array, offset: number, value: number): void {
  target[offset] = (value >>> 24) & 0xff;
  target[offset + 1] = (value >>> 16) & 0xff;
  target[offset + 2] = (value >>> 8) & 0xff;
  target[offset + 3] = value & 0xff;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  writeUint32BE(out, 0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  writeUint32BE(out, 8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** zlib stream with stored (BTYPE=00) deflate blocks — valid and deterministic. */
function zlibStored(data: Uint8Array): Uint8Array {
  const maxBlock = 65535;
  const blockCount = Math.max(1, Math.ceil(data.length / maxBlock));
  const out = new Uint8Array(2 + data.length + blockCount * 5 + 4);
  let offset = 0;
  out[offset++] = 0x78; // CMF: deflate, 32K window
  out[offset++] = 0x01; // FLG: check bits (0x7801 % 31 === 0), no dict
  for (let i = 0; i < blockCount; i++) {
    const start = i * maxBlock;
    const len = Math.min(maxBlock, data.length - start);
    const final = i === blockCount - 1 ? 1 : 0;
    out[offset++] = final;
    out[offset++] = len & 0xff;
    out[offset++] = (len >>> 8) & 0xff;
    out[offset++] = ~len & 0xff;
    out[offset++] = (~len >>> 8) & 0xff;
    out.set(data.subarray(start, start + len), offset);
    offset += len;
  }
  writeUint32BE(out, offset, adler32(data));
  return out.subarray(0, offset + 4);
}

function encodePng(width: number, height: number, pixels: Uint8Array): Uint8Array {
  const ihdr = new Uint8Array(13);
  writeUint32BE(ihdr, 0, width);
  writeUint32BE(ihdr, 4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  // compression 0, filter 0, interlace 0 already zero
  const stride = width * 3;
  const raw = new Uint8Array(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    raw.set(pixels.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const chunks = [
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlibStored(raw)),
    pngChunk("IEND", new Uint8Array(0)),
  ];
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const png = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    png.set(chunk, offset);
    offset += chunk.length;
  }
  return png;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const MARGIN = 64;
const CONTENT_WIDTH = TITLE_CARD_WIDTH - MARGIN * 2;

/**
 * Render the deterministic title card for a listing.
 *
 * Pure: identical (title, description) inputs always yield identical bytes.
 * Never throws for string inputs; any render failure upstream is a bug and
 * must propagate loudly (the ensure route treats it as a 5xx, not a fallback).
 */
export function renderTitleCard(title: string, description: string): Uint8Array {
  const palette = PALETTES[fnv1a(`${title}\u0000${description}`) % PALETTES.length];
  const canvas = new Canvas(TITLE_CARD_WIDTH, TITLE_CARD_HEIGHT, palette.background);

  // Brand line + accent rule.
  canvas.drawText("FOODSHARE", MARGIN, 48, 3, palette.accent);
  canvas.fillRect(MARGIN, 96, CONTENT_WIDTH, 3, palette.accent);

  // Title: scale 8 → 48px advance, 22 chars per line, at most 3 lines.
  const titleScale = 8;
  const titleChars = Math.floor(CONTENT_WIDTH / (6 * titleScale));
  const titleLines = wrapText(title || "Untitled listing", titleChars, 3);
  let y = 150;
  for (const line of titleLines) {
    canvas.drawText(line, MARGIN, y, titleScale, palette.foreground);
    y += 7 * titleScale + 16;
  }

  // Divider, then description: scale 4 → 24px advance, 44 chars, 4 lines.
  canvas.fillRect(MARGIN, y + 8, 220, 4, palette.accent);
  const descriptionLines = wrapText(description, Math.floor(CONTENT_WIDTH / 24), 4);
  let dy = y + 44;
  for (const line of descriptionLines) {
    canvas.drawText(line, MARGIN, dy, 4, palette.foreground);
    dy += 38;
  }

  return encodePng(TITLE_CARD_WIDTH, TITLE_CARD_HEIGHT, canvas.pixels);
}
