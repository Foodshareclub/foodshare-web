/**
 * Debug Utilities
 * Helpful debugging tools for development
 */

import { pretty } from "./pretty";
import { ANSI, COLORS, STYLES } from "./styles";

const IS_BROWSER = typeof window !== "undefined";
const IS_DEV = process.env.NODE_ENV !== "production";

/**
 * Trace function calls with timing
 */
export function trace<T extends (...args: unknown[]) => unknown>(fn: T, name?: string): T {
  const fnName = name || fn.name || "anonymous";

  return ((...args: Parameters<T>) => {
    const start = performance.now();

    if (IS_BROWSER) {
      console.groupCollapsed(
        `%c🔍 ${fnName}(%c${args.length} args%c)`,
        `color: ${COLORS.purple}; font-weight: bold;`,
        `color: ${COLORS.muted};`,
        `color: ${COLORS.purple}; font-weight: bold;`,
      );
      if (args.length > 0) {
        console.log("%c📥 Arguments:", STYLES.label, args);
      }
    } else {
      console.log(`${ANSI.magenta}🔍 ${fnName}(${args.length} args)${ANSI.reset}`);
    }

    try {
      const result = fn(...args);

      // Handle promises
      if (result instanceof Promise) {
        return result.then(
          (value) => {
            const duration = performance.now() - start;
            if (IS_BROWSER) {
              console.log("%c📤 Result:", STYLES.label, value);
              console.log(`%c⏱️ ${duration.toFixed(2)}ms`, `color: ${duration < 100 ? COLORS.success : COLORS.warn};`);
              console.groupEnd();
            } else {
              console.log(`   ${ANSI.green}✓ ${duration.toFixed(2)}ms${ANSI.reset}`);
            }
            return value;
          },
          (error) => {
            const duration = performance.now() - start;
            if (IS_BROWSER) {
              console.log("%c❌ Error:", STYLES.labelError, error);
              console.log(`%c⏱️ ${duration.toFixed(2)}ms`, `color: ${COLORS.error};`);
              console.groupEnd();
            } else {
              console.log(`   ${ANSI.red}✗ ${error} (${duration.toFixed(2)}ms)${ANSI.reset}`);
            }
            throw error;
          },
        ) as ReturnType<T>;
      }

      const duration = performance.now() - start;
      if (IS_BROWSER) {
        console.log("%c📤 Result:", STYLES.label, result);
        console.log(`%c⏱️ ${duration.toFixed(2)}ms`, `color: ${duration < 100 ? COLORS.success : COLORS.warn};`);
        console.groupEnd();
      } else {
        console.log(`   ${ANSI.green}✓ ${duration.toFixed(2)}ms${ANSI.reset}`);
      }

      return result as ReturnType<T>;
    } catch (error) {
      const duration = performance.now() - start;
      if (IS_BROWSER) {
        console.log("%c❌ Error:", STYLES.labelError, error);
        console.log(`%c⏱️ ${duration.toFixed(2)}ms`, `color: ${COLORS.error};`);
        console.groupEnd();
      } else {
        console.log(`   ${ANSI.red}✗ ${error} (${duration.toFixed(2)}ms)${ANSI.reset}`);
      }
      throw error;
    }
  }) as T;
}

/**
 * Assert with beautiful error logging
 */
export function assert(condition: unknown, message: string, data?: unknown): asserts condition {
  if (!condition) {
    if (IS_BROWSER) {
      console.group(`%c❌ Assertion Failed: ${message}`, `color: ${COLORS.error}; font-weight: bold;`);
      if (data !== undefined) {
        console.log("%c📦 Data:", STYLES.label, data);
      }
      console.trace("Stack trace:");
      console.groupEnd();
    } else {
      console.log(`${ANSI.red}${ANSI.bold}❌ Assertion Failed: ${message}${ANSI.reset}`);
      if (data !== undefined) {
        console.log("   Data:", data);
      }
    }

    if (IS_DEV) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }
}

/**
 * Log with stack trace
 */
export function logWithTrace(message: string, data?: unknown): void {
  if (IS_BROWSER) {
    console.group(`%c📍 ${message}`, `color: ${COLORS.purple}; font-weight: bold;`);
    if (data !== undefined) {
      console.log("%c📦 Data:", STYLES.label, data);
    }
    console.trace("Called from:");
    console.groupEnd();
  } else {
    console.log(`${ANSI.magenta}📍 ${message}${ANSI.reset}`);
    if (data !== undefined) {
      console.log("   Data:", data);
    }
    console.trace("Called from:");
  }
}

/**
 * Measure execution time of a code block
 */
export function measure<T>(name: string, fn: () => T): T {
  const start = performance.now();

  try {
    const result = fn();

    if (result instanceof Promise) {
      return result.then(
        (value) => {
          const duration = performance.now() - start;
          pretty.perf(name, duration);
          return value;
        },
        (error) => {
          const duration = performance.now() - start;
          pretty.perf(`${name} (failed)`, duration);
          throw error;
        },
      ) as T;
    }

    const duration = performance.now() - start;
    pretty.perf(name, duration);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    pretty.perf(`${name} (failed)`, duration);
    throw error;
  }
}

/**
 * Create a debug checkpoint
 */
let checkpointCounter = 0;
export function checkpoint(label?: string): void {
  checkpointCounter++;
  const id = label || `Checkpoint ${checkpointCounter}`;

  if (IS_BROWSER) {
    console.log(
      `%c🚩 ${id}`,
      `background: ${COLORS.orange}; color: white; padding: 2px 8px; border-radius: 3px; font-weight: bold;`,
    );
  } else {
    console.log(`${ANSI.yellow}🚩 ${id}${ANSI.reset}`);
  }
}

/**
 * Log object with type information
 */
export function inspect(label: string, value: unknown): void {
  const type = value === null ? "null" : Array.isArray(value) ? `array[${value.length}]` : typeof value;

  if (IS_BROWSER) {
    console.groupCollapsed(
      `%c🔎 ${label} %c(${type})`,
      `color: ${COLORS.purple}; font-weight: bold;`,
      `color: ${COLORS.muted};`,
    );

    if (typeof value === "object" && value !== null) {
      console.dir(value, { depth: 10 });
    } else {
      console.log(value);
    }

    // Show prototype chain for objects
    if (typeof value === "object" && value !== null) {
      const proto = Object.getPrototypeOf(value);
      if (proto && proto.constructor.name !== "Object") {
        console.log(`%c🔗 Prototype: ${proto.constructor.name}`, `color: ${COLORS.muted};`);
      }
    }

    console.groupEnd();
  } else {
    console.log(`${ANSI.magenta}🔎 ${label}${ANSI.reset} ${ANSI.gray}(${type})${ANSI.reset}`);
    console.log(value);
  }
}

/**
 * Conditional logging (only in dev)
 */
export function devLog(message: string, data?: unknown): void {
  if (!IS_DEV) return;
  pretty.debug(message, undefined, data);
}

/**
 * Log deprecation warning
 */
export function deprecated(feature: string, alternative?: string): void {
  const message = alternative ? `${feature} is deprecated. Use ${alternative} instead.` : `${feature} is deprecated.`;

  if (IS_BROWSER) {
    console.warn(
      `%c⚠️ DEPRECATED: %c${message}`,
      `background: ${COLORS.warn}; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;`,
      `color: ${COLORS.warn};`,
    );
    console.trace("Called from:");
  } else {
    console.warn(`${ANSI.yellow}⚠️ DEPRECATED: ${message}${ANSI.reset}`);
  }
}

/**
 * Log TODO/FIXME markers
 */
export function todo(message: string, priority: "low" | "medium" | "high" = "medium"): void {
  if (!IS_DEV) return;

  const emoji = priority === "high" ? "🔴" : priority === "medium" ? "🟡" : "🟢";
  const color = priority === "high" ? COLORS.error : priority === "medium" ? COLORS.warn : COLORS.success;

  if (IS_BROWSER) {
    console.log(`%c${emoji} TODO: %c${message}`, `color: ${color}; font-weight: bold;`, `color: ${COLORS.dark};`);
  } else {
    const ansiColor = priority === "high" ? ANSI.red : priority === "medium" ? ANSI.yellow : ANSI.green;
    console.log(`${ansiColor}${emoji} TODO: ${message}${ANSI.reset}`);
  }
}

/**
 * Create a scoped debugger
 */
export function createDebugger(namespace: string) {
  const prefix = `[${namespace}]`;

  return {
    log: (message: string, data?: unknown) => devLog(`${prefix} ${message}`, data),
    trace: <T extends (...args: unknown[]) => unknown>(fn: T, name?: string) =>
      trace(fn, `${prefix} ${name || fn.name}`),
    measure: <T>(name: string, fn: () => T) => measure(`${prefix} ${name}`, fn),
    checkpoint: (label?: string) => checkpoint(`${prefix} ${label || ""}`),
    inspect: (label: string, value: unknown) => inspect(`${prefix} ${label}`, value),
    assert: (condition: unknown, message: string, data?: unknown) => assert(condition, `${prefix} ${message}`, data),
    todo: (message: string, priority?: "low" | "medium" | "high") => todo(`${prefix} ${message}`, priority),
    deprecated: (feature: string, alternative?: string) => deprecated(`${prefix} ${feature}`, alternative),
  };
}

export const debug = {
  trace,
  assert,
  logWithTrace,
  measure,
  checkpoint,
  inspect,
  devLog,
  deprecated,
  todo,
  createDebugger,
};

export default debug;
