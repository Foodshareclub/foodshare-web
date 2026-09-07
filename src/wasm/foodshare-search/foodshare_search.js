/* @ts-self-types="./foodshare_search.d.ts" */

/**
 * Calculate exponential geospatial proximity decay in WebAssembly.
 * @param {number} distance_km
 * @param {number | null} [half_life_km]
 * @returns {number}
 */
function distance_decay(distance_km, half_life_km) {
  const ret = wasm.distance_decay(
    distance_km,
    isLikeNone(half_life_km) ? Number.MAX_SAFE_INTEGER : Math.fround(half_life_km)
  );
  return ret;
}
exports.distance_decay = distance_decay;

/**
 * Calculate Levenshtein edit distance between two strings.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function edit_distance(a, b) {
  const ptr0 = passStringToWasm0(a, wasm.__wbindgen_export, wasm.__wbindgen_export2);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(b, wasm.__wbindgen_export, wasm.__wbindgen_export2);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.edit_distance(ptr0, len0, ptr1, len1);
  return ret >>> 0;
}
exports.edit_distance = edit_distance;

/**
 * Check if text contains a fuzzy match for query.
 *
 * Returns true if all characters in query appear in text in order.
 * @param {string} query
 * @param {string} text
 * @returns {boolean}
 */
function fuzzy_contains(query, text) {
  const ptr0 = passStringToWasm0(query, wasm.__wbindgen_export, wasm.__wbindgen_export2);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(text, wasm.__wbindgen_export, wasm.__wbindgen_export2);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.fuzzy_contains(ptr0, len0, ptr1, len1);
  return ret !== 0;
}
exports.fuzzy_contains = fuzzy_contains;

/**
 * Calculate multi-modal hybrid score in WebAssembly.
 * @param {string} text_query
 * @param {string} target_text
 * @param {Float32Array | null} [query_vector]
 * @param {Float32Array | null} [item_vector]
 * @param {number | null} [distance_km]
 * @param {number | null} [vector_weight]
 * @param {number | null} [text_weight]
 * @param {number | null} [geo_weight]
 * @param {number | null} [half_life_km]
 * @returns {number}
 */
function hybrid_score(
  text_query,
  target_text,
  query_vector,
  item_vector,
  distance_km,
  vector_weight,
  text_weight,
  geo_weight,
  half_life_km
) {
  const ptr0 = passStringToWasm0(text_query, wasm.__wbindgen_export, wasm.__wbindgen_export2);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(target_text, wasm.__wbindgen_export, wasm.__wbindgen_export2);
  const len1 = WASM_VECTOR_LEN;
  var ptr2 = isLikeNone(query_vector)
    ? 0
    : passArrayF32ToWasm0(query_vector, wasm.__wbindgen_export);
  var len2 = WASM_VECTOR_LEN;
  var ptr3 = isLikeNone(item_vector) ? 0 : passArrayF32ToWasm0(item_vector, wasm.__wbindgen_export);
  var len3 = WASM_VECTOR_LEN;
  const ret = wasm.hybrid_score(
    ptr0,
    len0,
    ptr1,
    len1,
    ptr2,
    len2,
    ptr3,
    len3,
    isLikeNone(distance_km) ? Number.MAX_SAFE_INTEGER : Math.fround(distance_km),
    isLikeNone(vector_weight) ? Number.MAX_SAFE_INTEGER : Math.fround(vector_weight),
    isLikeNone(text_weight) ? Number.MAX_SAFE_INTEGER : Math.fround(text_weight),
    isLikeNone(geo_weight) ? Number.MAX_SAFE_INTEGER : Math.fround(geo_weight),
    isLikeNone(half_life_km) ? Number.MAX_SAFE_INTEGER : Math.fround(half_life_km)
  );
  return ret;
}
exports.hybrid_score = hybrid_score;

/**
 * Calculate relevance score for a query against text.
 *
 * # Arguments
 * * `query` - Search query
 * * `text` - Text to match against
 *
 * # Returns
 * Relevance score (0-50, higher is better)
 * @param {string} query
 * @param {string} text
 * @returns {number}
 */
function relevance_score(query, text) {
  const ptr0 = passStringToWasm0(query, wasm.__wbindgen_export, wasm.__wbindgen_export2);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(text, wasm.__wbindgen_export, wasm.__wbindgen_export2);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.relevance_score(ptr0, len0, ptr1, len1);
  return ret >>> 0;
}
exports.relevance_score = relevance_score;

/**
 * Merge ranked result lists using Reciprocal Rank Fusion in WebAssembly.
 *
 * # Arguments
 * * `lists_json` - JSON 2D array of item IDs: `[["item1", "item2"], ["item2", "item3"]]`
 * * `k` - RRF smoothing parameter (default 60.0)
 * @param {string} lists_json
 * @param {number | null} [k]
 * @returns {string}
 */
function rrf_merge(lists_json, k) {
  let deferred2_0;
  let deferred2_1;
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passStringToWasm0(lists_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    wasm.rrf_merge(retptr, ptr0, len0, isLikeNone(k) ? Number.MAX_SAFE_INTEGER : Math.fround(k));
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    deferred2_0 = r0;
    deferred2_1 = r1;
    return getStringFromWasm0(r0, r1);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
    wasm.__wbindgen_export3(deferred2_0, deferred2_1, 1);
  }
}
exports.rrf_merge = rrf_merge;

/**
 * Search items and return sorted results as JSON.
 *
 * # Arguments
 * * `query` - Search query
 * * `items_json` - JSON array of items with `id` and `text` fields
 * * `max_results` - Maximum results to return (0 for all)
 *
 * # Returns
 * JSON array of results with `id` and `score` fields, sorted by score
 * @param {string} query
 * @param {string} items_json
 * @param {number} max_results
 * @returns {string}
 */
function search_items(query, items_json, max_results) {
  let deferred3_0;
  let deferred3_1;
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passStringToWasm0(query, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(items_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len1 = WASM_VECTOR_LEN;
    wasm.search_items(retptr, ptr0, len0, ptr1, len1, max_results);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    deferred3_0 = r0;
    deferred3_1 = r1;
    return getStringFromWasm0(r0, r1);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
    wasm.__wbindgen_export3(deferred3_0, deferred3_1, 1);
  }
}
exports.search_items = search_items;

/**
 * Calculate cosine similarity between two float arrays in WebAssembly.
 * @param {Float32Array} a
 * @param {Float32Array} b
 * @returns {number}
 */
function vector_cosine_similarity(a, b) {
  const ptr0 = passArrayF32ToWasm0(a, wasm.__wbindgen_export);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passArrayF32ToWasm0(b, wasm.__wbindgen_export);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.vector_cosine_similarity(ptr0, len0, ptr1, len1);
  return ret;
}
exports.vector_cosine_similarity = vector_cosine_similarity;

/**
 * Calculate Euclidean (L2) distance between two float arrays in WebAssembly.
 * @param {Float32Array} a
 * @param {Float32Array} b
 * @returns {number}
 */
function vector_l2_distance(a, b) {
  const ptr0 = passArrayF32ToWasm0(a, wasm.__wbindgen_export);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passArrayF32ToWasm0(b, wasm.__wbindgen_export);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.vector_l2_distance(ptr0, len0, ptr1, len1);
  return ret;
}
exports.vector_l2_distance = vector_l2_distance;

/**
 * Pad or truncate vector to exact target dimensions (e.g. 384 for gte-small).
 * @param {Float32Array} v
 * @param {number} target_dim
 * @returns {Float32Array}
 */
function vector_normalize_dimensions(v, target_dim) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passArrayF32ToWasm0(v, wasm.__wbindgen_export);
    const len0 = WASM_VECTOR_LEN;
    wasm.vector_normalize_dimensions(retptr, ptr0, len0, target_dim);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    var v2 = getArrayF32FromWasm0(r0, r1).slice();
    wasm.__wbindgen_export3(r0, r1 * 4, 4);
    return v2;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}
exports.vector_normalize_dimensions = vector_normalize_dimensions;
function __wbg_get_imports() {
  const import0 = {
    __proto__: null,
  };
  return {
    __proto__: null,
    "./foodshare_search_bg.js": import0,
  };
}

function getArrayF32FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
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

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
  if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
    cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
  }
  return cachedFloat32ArrayMemory0;
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

function isLikeNone(x) {
  return x === undefined || x === null;
}

function passArrayF32ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 4, 4) >>> 0;
  getFloat32ArrayMemory0().set(arg, ptr / 4);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
  if (realloc === undefined) {
    const buf = cachedTextEncoder.encode(arg);
    const ptr = malloc(buf.length, 1) >>> 0;
    getUint8ArrayMemory0()
      .subarray(ptr, ptr + buf.length)
      .set(buf);
    WASM_VECTOR_LEN = buf.length;
    return ptr;
  }

  let len = arg.length;
  let ptr = malloc(len, 1) >>> 0;

  const mem = getUint8ArrayMemory0();

  let offset = 0;

  for (; offset < len; offset++) {
    const code = arg.charCodeAt(offset);
    if (code > 0x7f) break;
    mem[ptr + offset] = code;
  }
  if (offset !== len) {
    if (offset !== 0) {
      arg = arg.slice(offset);
    }
    ptr = realloc(ptr, len, (len = offset + arg.length * 3), 1) >>> 0;
    const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
    const ret = cachedTextEncoder.encodeInto(arg, view);

    offset += ret.written;
    ptr = realloc(ptr, len, offset, 1) >>> 0;
  }

  WASM_VECTOR_LEN = offset;
  return ptr;
}

let cachedTextDecoder = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
function decodeText(ptr, len) {
  return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!("encodeInto" in cachedTextEncoder)) {
  cachedTextEncoder.encodeInto = function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
      read: arg.length,
      written: buf.length,
    };
  };
}

let WASM_VECTOR_LEN = 0;

function __resolveWasmPath(filename) {
  const fs = require("fs");
  const path = require("path");
  const candidates = [
    path.join(__dirname, filename),
    path.join(process.cwd(), "src", "wasm", "foodshare-search", filename),
    path.join(process.cwd(), "foodshare-web", "src", "wasm", "foodshare-search", filename),
    path.join(process.cwd(), "..", "foodshare-web", "src", "wasm", "foodshare-search", filename),
  ];
  for (const c of candidates) {
    if (fs.existsSync(/*turbopackIgnore: true*/ c)) return c;
  }
  return candidates[0];
}
const wasmPath = __resolveWasmPath("foodshare_search_bg.wasm");
const wasmBytes = require("fs").readFileSync(/*turbopackIgnore: true*/ wasmPath);
const wasmModule = new WebAssembly.Module(wasmBytes);
let wasmInstance = new WebAssembly.Instance(wasmModule, __wbg_get_imports());
let wasm = wasmInstance.exports;
