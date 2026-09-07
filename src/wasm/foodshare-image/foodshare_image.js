/* @ts-self-types="./foodshare_image.d.ts" */

/**
 * Calculate optimal resized target width based on raw file size tiers and current dimensions.
 *
 * Returns target width in pixels (0 means no resize needed).
 * @param {number} file_size_bytes
 * @param {number} current_width
 * @param {number} current_height
 * @returns {number}
 */
function calculate_smart_width(file_size_bytes, current_width, current_height) {
  const ret = wasm.calculate_smart_width(file_size_bytes, current_width, current_height);
  return ret >>> 0;
}
exports.calculate_smart_width = calculate_smart_width;

/**
 * Detect image format from magic bytes (JPEG, PNG, GIF, WebP, AVIF, BMP, TIFF, HEIC).
 *
 * # Arguments
 * * `data` - Raw image byte buffer (at least first 12 bytes recommended)
 *
 * # Returns
 * Format name as lowercase string (e.g. "jpeg", "png", "webp"), or None if unrecognized.
 * @param {Uint8Array} data
 * @returns {string | undefined}
 */
function detect_image_format(data) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_export);
    const len0 = WASM_VECTOR_LEN;
    wasm.detect_image_format(retptr, ptr0, len0);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    let v2;
    if (r0 !== 0) {
      v2 = getStringFromWasm0(r0, r1);
      wasm.__wbindgen_export2(r0, r1 * 1, 1);
    }
    return v2;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}
exports.detect_image_format = detect_image_format;

/**
 * Extract image metadata (dimensions, format, aspect ratio, orientation) as a JSON string.
 *
 * Supports instant zero-allocation parsing for JPEG, PNG, and GIF.
 *
 * # Arguments
 * * `data` - Image byte buffer
 *
 * # Returns
 * JSON string with metadata object, or None if extraction failed.
 * @param {Uint8Array} data
 * @returns {string | undefined}
 */
function extract_image_metadata_json(data) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_export);
    const len0 = WASM_VECTOR_LEN;
    wasm.extract_image_metadata_json(retptr, ptr0, len0);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    let v2;
    if (r0 !== 0) {
      v2 = getStringFromWasm0(r0, r1);
      wasm.__wbindgen_export2(r0, r1 * 1, 1);
    }
    return v2;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}
exports.extract_image_metadata_json = extract_image_metadata_json;

/**
 * Get the standard MIME type for an image byte buffer.
 *
 * # Arguments
 * * `data` - Raw image byte buffer
 *
 * # Returns
 * MIME type string (e.g. "image/jpeg", "image/png", "image/webp"), or None.
 * @param {Uint8Array} data
 * @returns {string | undefined}
 */
function get_image_mime_type(data) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_export);
    const len0 = WASM_VECTOR_LEN;
    wasm.get_image_mime_type(retptr, ptr0, len0);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    let v2;
    if (r0 !== 0) {
      v2 = getStringFromWasm0(r0, r1);
      wasm.__wbindgen_export2(r0, r1 * 1, 1);
    }
    return v2;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}
exports.get_image_mime_type = get_image_mime_type;

/**
 * Check if a byte buffer contains a valid recognized image format.
 * @param {Uint8Array} data
 * @returns {boolean}
 */
function is_valid_image(data) {
  const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_export);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.is_valid_image(ptr0, len0);
  return ret !== 0;
}
exports.is_valid_image = is_valid_image;
function __wbg_get_imports() {
  const import0 = {
    __proto__: null,
  };
  return {
    __proto__: null,
    "./foodshare_image_bg.js": import0,
  };
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
    path.join(process.cwd(), "src", "wasm", "foodshare-image", filename),
    path.join(process.cwd(), "foodshare-web", "src", "wasm", "foodshare-image", filename),
    path.join(process.cwd(), "..", "foodshare-web", "src", "wasm", "foodshare-image", filename),
  ];
  for (const c of candidates) {
    if (fs.existsSync(/*turbopackIgnore: true*/ c)) return c;
  }
  return candidates[0];
}
const wasmPath = __resolveWasmPath("foodshare_image_bg.wasm");
const wasmBytes = require("fs").readFileSync(/*turbopackIgnore: true*/ wasmPath);
const wasmModule = new WebAssembly.Module(wasmBytes);
let wasmInstance = new WebAssembly.Instance(wasmModule, __wbg_get_imports());
let wasm = wasmInstance.exports;
