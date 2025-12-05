/**
 * Console Interceptor
 * Intercepts and beautifies all console output globally
 */

import { COLORS, EMOJI, STYLES, ANSI } from './styles';

const IS_BROWSER = typeof window !== 'undefined';
const IS_DEV = process.env.NODE_ENV !== 'production';

// Store original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
  group: console.group,
  groupCollapsed: console.groupCollapsed,
  groupEnd: console.groupEnd,
  table: console.table,
  trace: console.trace,
  time: console.time,
  timeEnd: console.timeEnd,
  clear: console.clear,
};

let isIntercepting = false;
let logBuffer: Array<{ level: string; args: unknown[]; timestamp: Date }> = [];
const MAX_BUFFER = 500;

function timestamp(): string {
  return new Date().toISOString().split('T')[1].slice(0, 12);
}

/**
 * Format arguments for pretty output
 */
function formatArgs(args: unknown[]): unknown[] {
  return args.map(arg => {
    if (arg instanceof Error) {
      return `${arg.name}: ${arg.message}`;
    }
    return arg;
  });
}

/**
 * Browser interceptor
 */
function interceptBrowser(): void {
  if (!IS_BROWSER || isIntercepting) return;
  isIntercepting = true;

  console.log = (...args: unknown[]) => {
    bufferLog('log', args);
    const time = timestamp();
    originalConsole.log(
      `%c${time}`,
      `color: ${COLORS.muted}; font-size: 10px;`,
      ...formatArgs(args)
    );
  };

  console.info = (...args: unknown[]) => {
    bufferLog('info', args);
    const time = timestamp();
    originalConsole.log(
      `%cℹ️ ${time}`,
      `color: ${COLORS.info}; font-weight: bold;`,
      ...formatArgs(args)
    );
  };

  console.warn = (...args: unknown[]) => {
    bufferLog('warn', args);
    const time = timestamp();
    originalConsole.warn(
      `%c⚠️ ${time}`,
      `color: ${COLORS.warn}; font-weight: bold;`,
      ...formatArgs(args)
    );
  };

  console.error = (...args: unknown[]) => {
    bufferLog('error', args);
    const time = timestamp();
    originalConsole.error(
      `%c❌ ${time}`,
      `color: ${COLORS.error}; font-weight: bold;`,
      ...formatArgs(args)
    );
  };

  console.debug = (...args: unknown[]) => {
    if (!IS_DEV) return;
    bufferLog('debug', args);
    const time = timestamp();
    originalConsole.log(
      `%c🔍 ${time}`,
      `color: ${COLORS.debug};`,
      ...formatArgs(args)
    );
  };
}

/**
 * Server interceptor
 */
function interceptServer(): void {
  if (IS_BROWSER || isIntercepting) return;
  isIntercepting = true;

  console.log = (...args: unknown[]) => {
    bufferLog('log', args);
    const time = timestamp();
    originalConsole.log(`${ANSI.gray}${time}${ANSI.reset}`, ...formatArgs(args));
  };

  console.info = (...args: unknown[]) => {
    bufferLog('info', args);
    const time = timestamp();
    originalConsole.log(`${ANSI.blue}ℹ️ ${time}${ANSI.reset}`, ...formatArgs(args));
  };

  console.warn = (...args: unknown[]) => {
    bufferLog('warn', args);
    const time = timestamp();
    originalConsole.warn(`${ANSI.yellow}⚠️ ${time}${ANSI.reset}`, ...formatArgs(args));
  };

  console.error = (...args: unknown[]) => {
    bufferLog('error', args);
    const time = timestamp();
    originalConsole.error(`${ANSI.red}❌ ${time}${ANSI.reset}`, ...formatArgs(args));
  };

  console.debug = (...args: unknown[]) => {
    if (!IS_DEV) return;
    bufferLog('debug', args);
    const time = timestamp();
    originalConsole.log(`${ANSI.gray}🔍 ${time}${ANSI.reset}`, ...formatArgs(args));
  };
}

/**
 * Buffer log for history
 */
function bufferLog(level: string, args: unknown[]): void {
  logBuffer.push({ level, args, timestamp: new Date() });
  if (logBuffer.length > MAX_BUFFER) {
    logBuffer.shift();
  }
}

/**
 * Restore original console
 */
function restore(): void {
  if (!isIntercepting) return;
  
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.debug = originalConsole.debug;
  
  isIntercepting = false;
}

/**
 * Get log buffer
 */
function getBuffer(): Array<{ level: string; args: unknown[]; timestamp: Date }> {
  return [...logBuffer];
}

/**
 * Clear log buffer
 */
function clearBuffer(): void {
  logBuffer = [];
}

/**
 * Export buffer as JSON
 */
function exportBuffer(): string {
  return JSON.stringify(logBuffer.map(entry => ({
    ...entry,
    timestamp: entry.timestamp.toISOString(),
    args: entry.args.map(arg => {
      try {
        return JSON.parse(JSON.stringify(arg));
      } catch {
        return String(arg);
      }
    }),
  })), null, 2);
}

export const interceptor = {
  /** Start intercepting console output */
  start: () => IS_BROWSER ? interceptBrowser() : interceptServer(),
  /** Stop intercepting and restore original console */
  stop: restore,
  /** Check if currently intercepting */
  isActive: () => isIntercepting,
  /** Get buffered logs */
  getBuffer,
  /** Clear buffered logs */
  clearBuffer,
  /** Export buffer as JSON */
  exportBuffer,
  /** Access original console methods */
  original: originalConsole,
};

export default interceptor;
