/* @ts-self-types="./foodshare_compression.d.ts" */

/**
 * Compress data using Brotli.
 *
 * # Arguments
 * * `data` - Data to compress
 * * `quality` - Compression level (0-11, higher = better compression but slower)
 *
 * # Returns
 * Compressed data as Uint8Array
 * @param {Uint8Array} data
 * @param {number} quality
 * @returns {Uint8Array}
 */
function brotli_compress(data, quality) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_export);
    const len0 = WASM_VECTOR_LEN;
    wasm.brotli_compress(retptr, ptr0, len0, quality);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    var v2 = getArrayU8FromWasm0(r0, r1).slice();
    wasm.__wbindgen_export2(r0, r1 * 1, 1);
    return v2;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}
exports.brotli_compress = brotli_compress;

/**
 * Decompress Brotli data.
 * @param {Uint8Array} data
 * @returns {Uint8Array}
 */
function brotli_decompress(data) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_export);
    const len0 = WASM_VECTOR_LEN;
    wasm.brotli_decompress(retptr, ptr0, len0);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    var v2 = getArrayU8FromWasm0(r0, r1).slice();
    wasm.__wbindgen_export2(r0, r1 * 1, 1);
    return v2;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}
exports.brotli_decompress = brotli_decompress;

/**
 * Compress data with automatic algorithm selection based on size.
 *
 * Uses Brotli for larger payloads (>1KB), Gzip otherwise.
 * @param {Uint8Array} data
 * @returns {Uint8Array}
 */
function compress_auto(data) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_export);
    const len0 = WASM_VECTOR_LEN;
    wasm.compress_auto(retptr, ptr0, len0);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    var v2 = getArrayU8FromWasm0(r0, r1).slice();
    wasm.__wbindgen_export2(r0, r1 * 1, 1);
    return v2;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}
exports.compress_auto = compress_auto;

/**
 * Generate ETag for data (SHA-256 based).
 * @param {Uint8Array} data
 * @returns {string}
 */
function generate_etag(data) {
  let deferred2_0;
  let deferred2_1;
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_export);
    const len0 = WASM_VECTOR_LEN;
    wasm.generate_etag(retptr, ptr0, len0);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    deferred2_0 = r0;
    deferred2_1 = r1;
    return getStringFromWasm0(r0, r1);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
    wasm.__wbindgen_export2(deferred2_0, deferred2_1, 1);
  }
}
exports.generate_etag = generate_etag;

/**
 * Compress data using Gzip.
 *
 * # Arguments
 * * `data` - Data to compress
 * * `level` - Compression level (0-9)
 * @param {Uint8Array} data
 * @param {number} level
 * @returns {Uint8Array}
 */
function gzip_compress(data, level) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_export);
    const len0 = WASM_VECTOR_LEN;
    wasm.gzip_compress(retptr, ptr0, len0, level);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    var v2 = getArrayU8FromWasm0(r0, r1).slice();
    wasm.__wbindgen_export2(r0, r1 * 1, 1);
    return v2;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}
exports.gzip_compress = gzip_compress;

/**
 * Decompress Gzip data.
 * @param {Uint8Array} data
 * @returns {Uint8Array}
 */
function gzip_decompress(data) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_export);
    const len0 = WASM_VECTOR_LEN;
    wasm.gzip_decompress(retptr, ptr0, len0);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    var v2 = getArrayU8FromWasm0(r0, r1).slice();
    wasm.__wbindgen_export2(r0, r1 * 1, 1);
    return v2;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}
exports.gzip_decompress = gzip_decompress;
function __wbg_get_imports() {
  const import0 = {
    __proto__: null,
  };
  return {
    __proto__: null,
    "./foodshare_compression_bg.js": import0,
  };
}

function getArrayU8FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
  if (
    cachedDataViewMemory0 === null ||
    cachedDataViewMemory0.buffer.detached === true ||
    (cachedDataViewMemory0.buffer.detached === undefined &&
      cachedDataViewMemory0.buffer !== wasm.memory.buffer)
  ) {
    cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
  }
  return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
  return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
  if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
    cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}

function passArray8ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 1, 1) >>> 0;
  getUint8ArrayMemory0().set(arg, ptr / 1);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}

let cachedTextDecoder = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
function decodeText(ptr, len) {
  return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let WASM_VECTOR_LEN = 0;

function __resolveWasmPath(filename) {
  const fs = require("fs");
  const path = require("path");
  const candidates = [
    path.join(__dirname, filename),
    path.join(process.cwd(), "src", "wasm", "foodshare-compression", filename),
    path.join(process.cwd(), "foodshare-web", "src", "wasm", "foodshare-compression", filename),
    path.join(
      process.cwd(),
      "..",
      "foodshare-web",
      "src",
      "wasm",
      "foodshare-compression",
      filename
    ),
  ];
  for (const c of candidates) {
    if (fs.existsSync(/*turbopackIgnore: true*/ c)) return c;
  }
  return candidates[0];
}
const wasmPath = __resolveWasmPath("foodshare_compression_bg.wasm");
const wasmBytes = require("fs").readFileSync(/*turbopackIgnore: true*/ wasmPath);
const wasmModule = new WebAssembly.Module(wasmBytes);
let wasmInstance = new WebAssembly.Instance(wasmModule, __wbg_get_imports());
let wasm = wasmInstance.exports;
