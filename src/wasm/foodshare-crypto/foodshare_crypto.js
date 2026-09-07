/* @ts-self-types="./foodshare_crypto.d.ts" */

/**
 * Generate standard otpauth URI for MFA QR Code generation.
 * @param {string} account_name
 * @param {string} issuer
 * @param {string} base32_secret
 * @returns {string}
 */
function build_totp_uri(account_name, issuer, base32_secret) {
  let deferred4_0;
  let deferred4_1;
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passStringToWasm0(account_name, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(issuer, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(base32_secret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len2 = WASM_VECTOR_LEN;
    wasm.build_totp_uri(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    deferred4_0 = r0;
    deferred4_1 = r1;
    return getStringFromWasm0(r0, r1);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
    wasm.__wbindgen_export3(deferred4_0, deferred4_1, 1);
  }
}
exports.build_totp_uri = build_totp_uri;

/**
 * Constant-time comparison of two strings.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function constant_time_eq(a, b) {
  const ptr0 = passStringToWasm0(a, wasm.__wbindgen_export, wasm.__wbindgen_export2);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(b, wasm.__wbindgen_export, wasm.__wbindgen_export2);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.constant_time_eq(ptr0, len0, ptr1, len1);
  return ret !== 0;
}
exports.constant_time_eq = constant_time_eq;

/**
 * Generate a 6-digit TOTP MFA token from raw or base32 secret.
 * @param {string} secret
 * @param {bigint | null} [time_seconds]
 * @returns {string}
 */
function generate_totp_code(secret, time_seconds) {
  let deferred3_0;
  let deferred3_1;
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passStringToWasm0(secret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    wasm.generate_totp_code(
      retptr,
      ptr0,
      len0,
      !isLikeNone(time_seconds),
      isLikeNone(time_seconds) ? BigInt(0) : time_seconds
    );
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
    var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
    var ptr2 = r0;
    var len2 = r1;
    if (r3) {
      ptr2 = 0;
      len2 = 0;
      throw takeObject(r2);
    }
    deferred3_0 = ptr2;
    deferred3_1 = len2;
    return getStringFromWasm0(ptr2, len2);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
    wasm.__wbindgen_export3(deferred3_0, deferred3_1, 1);
  }
}
exports.generate_totp_code = generate_totp_code;

/**
 * Generate HMAC-SHA1 signature and return as hex string.
 * @param {string} key
 * @param {string} message
 * @returns {string}
 */
function hmac_sha1_hex(key, message) {
  let deferred3_0;
  let deferred3_1;
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passStringToWasm0(key, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(message, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len1 = WASM_VECTOR_LEN;
    wasm.hmac_sha1_hex(retptr, ptr0, len0, ptr1, len1);
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
exports.hmac_sha1_hex = hmac_sha1_hex;

/**
 * Generate HMAC-SHA256 signature and return as base64 string.
 * @param {string} key
 * @param {string} message
 * @returns {string}
 */
function hmac_sha256_base64(key, message) {
  let deferred3_0;
  let deferred3_1;
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passStringToWasm0(key, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(message, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len1 = WASM_VECTOR_LEN;
    wasm.hmac_sha256_base64(retptr, ptr0, len0, ptr1, len1);
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
exports.hmac_sha256_base64 = hmac_sha256_base64;

/**
 * Generate HMAC-SHA256 signature and return as hex string.
 * @param {string} key
 * @param {string} message
 * @returns {string}
 */
function hmac_sha256_hex(key, message) {
  let deferred3_0;
  let deferred3_1;
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passStringToWasm0(key, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(message, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len1 = WASM_VECTOR_LEN;
    wasm.hmac_sha256_hex(retptr, ptr0, len0, ptr1, len1);
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
exports.hmac_sha256_hex = hmac_sha256_hex;

/**
 * Verify a user-entered TOTP token with time drift window.
 * @param {string} secret
 * @param {string} code
 * @param {bigint | null} [time_seconds]
 * @param {bigint | null} [window_steps]
 * @returns {boolean}
 */
function verify_totp_code(secret, code, time_seconds, window_steps) {
  const ptr0 = passStringToWasm0(secret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(code, wasm.__wbindgen_export, wasm.__wbindgen_export2);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.verify_totp_code(
    ptr0,
    len0,
    ptr1,
    len1,
    !isLikeNone(time_seconds),
    isLikeNone(time_seconds) ? BigInt(0) : time_seconds,
    !isLikeNone(window_steps),
    isLikeNone(window_steps) ? BigInt(0) : window_steps
  );
  return ret !== 0;
}
exports.verify_totp_code = verify_totp_code;

/**
 * Verify a signature with SHA1 (for legacy providers like GitHub).
 * @param {string} key
 * @param {string} message
 * @param {string} signature_hex
 * @returns {boolean}
 */
function verify_webhook_sha1(key, message, signature_hex) {
  const ptr0 = passStringToWasm0(key, wasm.__wbindgen_export, wasm.__wbindgen_export2);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(message, wasm.__wbindgen_export, wasm.__wbindgen_export2);
  const len1 = WASM_VECTOR_LEN;
  const ptr2 = passStringToWasm0(signature_hex, wasm.__wbindgen_export, wasm.__wbindgen_export2);
  const len2 = WASM_VECTOR_LEN;
  const ret = wasm.verify_webhook_sha1(ptr0, len0, ptr1, len1, ptr2, len2);
  return ret !== 0;
}
exports.verify_webhook_sha1 = verify_webhook_sha1;

/**
 * Verify a webhook signature (constant-time comparison).
 *
 * # Arguments
 * * `key` - The secret key
 * * `message` - The message/payload
 * * `signature_hex` - The expected signature in hex format
 *
 * # Returns
 * true if signature matches, false otherwise
 * @param {string} key
 * @param {string} message
 * @param {string} signature_hex
 * @returns {boolean}
 */
function verify_webhook_sha256(key, message, signature_hex) {
  const ptr0 = passStringToWasm0(key, wasm.__wbindgen_export, wasm.__wbindgen_export2);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(message, wasm.__wbindgen_export, wasm.__wbindgen_export2);
  const len1 = WASM_VECTOR_LEN;
  const ptr2 = passStringToWasm0(signature_hex, wasm.__wbindgen_export, wasm.__wbindgen_export2);
  const len2 = WASM_VECTOR_LEN;
  const ret = wasm.verify_webhook_sha256(ptr0, len0, ptr1, len1, ptr2, len2);
  return ret !== 0;
}
exports.verify_webhook_sha256 = verify_webhook_sha256;
function __wbg_get_imports() {
  const import0 = {
    __proto__: null,
    __wbg___wbindgen_throw_bb96b2010945f0bc: function (arg0, arg1) {
      throw new Error(getStringFromWasm0(arg0, arg1));
    },
    __wbg_now_8b265300afd5f2b9: function () {
      const ret = Date.now();
      return ret;
    },
    __wbindgen_cast_0000000000000001: function (arg0, arg1) {
      // Cast intrinsic for `Ref(String) -> Externref`.
      const ret = getStringFromWasm0(arg0, arg1);
      return addHeapObject(ret);
    },
  };
  return {
    __proto__: null,
    "./foodshare_crypto_bg.js": import0,
  };
}

function addHeapObject(obj) {
  if (heap_next === heap.length) heap.push(heap.length + 1);
  const idx = heap_next;
  heap_next = heap[idx];

  heap[idx] = obj;
  return idx;
}

function dropObject(idx) {
  if (idx < 1028) return;
  heap[idx] = heap_next;
  heap_next = idx;
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

function getObject(idx) {
  return heap[idx];
}

let heap = new Array(1024).fill(undefined);
heap.push(undefined, null, true, false);

let heap_next = heap.length;

function isLikeNone(x) {
  return x === undefined || x === null;
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

function takeObject(idx) {
  const ret = getObject(idx);
  dropObject(idx);
  return ret;
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
    path.join(process.cwd(), "src", "wasm", "foodshare-crypto", filename),
    path.join(process.cwd(), "foodshare-web", "src", "wasm", "foodshare-crypto", filename),
    path.join(process.cwd(), "..", "foodshare-web", "src", "wasm", "foodshare-crypto", filename),
  ];
  for (const c of candidates) {
    if (fs.existsSync(/*turbopackIgnore: true*/ c)) return c;
  }
  return candidates[0];
}
const wasmPath = __resolveWasmPath("foodshare_crypto_bg.wasm");
const wasmBytes = require("fs").readFileSync(/*turbopackIgnore: true*/ wasmPath);
const wasmModule = new WebAssembly.Module(wasmBytes);
let wasmInstance = new WebAssembly.Instance(wasmModule, __wbg_get_imports());
let wasm = wasmInstance.exports;
