/**
 * Network Logger
 * Beautiful network request/response logging with waterfall visualization
 */

import { COLORS, EMOJI, STYLES, ANSI } from './styles';

const IS_BROWSER = typeof window !== 'undefined';

interface NetworkEntry {
  id: string;
  method: string;
  url: string;
  startTime: number;
  endTime?: number;
  status?: number;
  size?: number;
  type?: 'fetch' | 'xhr' | 'ws';
  error?: string;
}

const networkLog: NetworkEntry[] = [];
const MAX_ENTRIES = 100;

function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function formatTime(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: COLORS.success,
    POST: COLORS.info,
    PUT: COLORS.warn,
    PATCH: COLORS.orange,
    DELETE: COLORS.error,
  };
  return colors[method.toUpperCase()] || COLORS.muted;
}

function getStatusEmoji(status?: number): string {
  if (!status) return '⏳';
  if (status >= 200 && status < 300) return '✅';
  if (status >= 300 && status < 400) return '↪️';
  if (status >= 400 && status < 500) return '⚠️';
  if (status >= 500) return '❌';
  return '❓';
}

/**
 * Browser network logging
 */
const browserNetwork = {
  /**
   * Log request start
   */
  start(method: string, url: string, type: 'fetch' | 'xhr' | 'ws' = 'fetch'): string {
    const id = generateId();
    const entry: NetworkEntry = {
      id,
      method: method.toUpperCase(),
      url,
      startTime: performance.now(),
      type,
    };
    
    networkLog.push(entry);
    if (networkLog.length > MAX_ENTRIES) {
      networkLog.shift();
    }

    console.log(
      `${EMOJI.network} %c${method.toUpperCase()} %c${url} %c⏳ pending...`,
      `background: ${getMethodColor(method)}; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;`,
      `color: ${COLORS.cyan};`,
      `color: ${COLORS.muted}; font-style: italic;`
    );

    return id;
  },

  /**
   * Log request end
   */
  end(id: string, status: number, size?: number, error?: string): void {
    const entry = networkLog.find(e => e.id === id);
    if (!entry) return;

    entry.endTime = performance.now();
    entry.status = status;
    entry.size = size;
    entry.error = error;

    const duration = entry.endTime - entry.startTime;
    const emoji = getStatusEmoji(status);
    const durationColor = duration < 100 ? COLORS.success : duration < 500 ? COLORS.warn : COLORS.error;
    const statusColor = status >= 200 && status < 300 ? COLORS.success : status >= 400 ? COLORS.error : COLORS.warn;

    const parts = [
      `${emoji} %c${entry.method}`,
      `%c${entry.url}`,
      `%c${status}`,
      `%c${formatTime(duration)}`,
    ];
    const styles = [
      `background: ${getMethodColor(entry.method)}; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;`,
      `color: ${COLORS.cyan};`,
      `background: ${statusColor}; color: white; padding: 2px 6px; border-radius: 3px;`,
      `color: ${durationColor}; font-weight: bold;`,
    ];

    if (size) {
      parts.push(`%c${formatSize(size)}`);
      styles.push(`color: ${COLORS.muted};`);
    }

    if (error) {
      parts.push(`%c${error}`);
      styles.push(`color: ${COLORS.error};`);
    }

    console.log(parts.join(' '), ...styles);
  },

  /**
   * Log a complete request (start + end)
   */
  log(method: string, url: string, status: number, duration: number, options?: {
    size?: number;
    requestBody?: unknown;
    responseBody?: unknown;
    headers?: Record<string, string>;
  }): void {
    const emoji = getStatusEmoji(status);
    const durationColor = duration < 100 ? COLORS.success : duration < 500 ? COLORS.warn : COLORS.error;
    const statusColor = status >= 200 && status < 300 ? COLORS.success : status >= 400 ? COLORS.error : COLORS.warn;

    if (options?.requestBody || options?.responseBody || options?.headers) {
      console.groupCollapsed(
        `${emoji} %c${method.toUpperCase()} %c${url} %c${status} %c${formatTime(duration)}`,
        `background: ${getMethodColor(method)}; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;`,
        `color: ${COLORS.cyan};`,
        `background: ${statusColor}; color: white; padding: 2px 6px; border-radius: 3px;`,
        `color: ${durationColor}; font-weight: bold;`
      );

      if (options.headers) {
        console.log('%c📋 Headers', STYLES.label);
        console.table(options.headers);
      }

      if (options.requestBody) {
        console.log('%c📤 Request', STYLES.label);
        console.dir(options.requestBody, { depth: 4 });
      }

      if (options.responseBody) {
        console.log('%c📥 Response', STYLES.label);
        console.dir(options.responseBody, { depth: 4 });
      }

      if (options.size) {
        console.log(`%c📊 Size: ${formatSize(options.size)}`, `color: ${COLORS.muted};`);
      }

      console.groupEnd();
    } else {
      const parts = [
        `${emoji} %c${method.toUpperCase()}`,
        `%c${url}`,
        `%c${status}`,
        `%c${formatTime(duration)}`,
      ];
      const styles = [
        `background: ${getMethodColor(method)}; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;`,
        `color: ${COLORS.cyan};`,
        `background: ${statusColor}; color: white; padding: 2px 6px; border-radius: 3px;`,
        `color: ${durationColor}; font-weight: bold;`,
      ];

      if (options?.size) {
        parts.push(`%c${formatSize(options.size)}`);
        styles.push(`color: ${COLORS.muted};`);
      }

      console.log(parts.join(' '), ...styles);
    }
  },

  /**
   * Print network waterfall
   */
  waterfall(): void {
    if (networkLog.length === 0) {
      console.log('%c📡 No network requests logged', `color: ${COLORS.muted};`);
      return;
    }

    const completed = networkLog.filter(e => e.endTime);
    if (completed.length === 0) {
      console.log('%c📡 No completed requests', `color: ${COLORS.muted};`);
      return;
    }

    const minStart = Math.min(...completed.map(e => e.startTime));
    const maxEnd = Math.max(...completed.map(e => e.endTime!));
    const totalDuration = maxEnd - minStart;
    const barWidth = 40;

    console.group('%c📡 Network Waterfall', `color: ${COLORS.purple}; font-weight: bold; font-size: 14px;`);
    
    completed.forEach(entry => {
      const start = entry.startTime - minStart;
      const duration = entry.endTime! - entry.startTime;
      const startPos = Math.round((start / totalDuration) * barWidth);
      const barLen = Math.max(1, Math.round((duration / totalDuration) * barWidth));
      
      const bar = ' '.repeat(startPos) + '█'.repeat(barLen);
      const emoji = getStatusEmoji(entry.status);
      
      console.log(
        `${emoji} %c${entry.method.padEnd(6)} %c${bar} %c${formatTime(duration).padStart(8)} %c${entry.url.slice(0, 50)}`,
        `color: ${getMethodColor(entry.method)}; font-weight: bold;`,
        `color: ${entry.status && entry.status >= 400 ? COLORS.error : COLORS.success};`,
        `color: ${COLORS.muted};`,
        `color: ${COLORS.cyan};`
      );
    });

    console.log(`%c${'─'.repeat(60)}`, `color: ${COLORS.muted};`);
    console.log(`%cTotal: ${formatTime(totalDuration)} | ${completed.length} requests`, `color: ${COLORS.muted};`);
    console.groupEnd();
  },

  /**
   * Clear network log
   */
  clear(): void {
    networkLog.length = 0;
    console.log('%c📡 Network log cleared', `color: ${COLORS.muted};`);
  },

  /**
   * Get network log entries
   */
  getEntries(): NetworkEntry[] {
    return [...networkLog];
  },
};

/**
 * Server-side network logging
 */
const serverNetwork = {
  start(method: string, url: string, _type: 'fetch' | 'xhr' | 'ws' = 'fetch'): string {
    const id = generateId();
    console.log(`${EMOJI.network} ${ANSI.bold}${method.toUpperCase()}${ANSI.reset} ${ANSI.cyan}${url}${ANSI.reset} ${ANSI.gray}⏳ pending...${ANSI.reset}`);
    return id;
  },

  end(id: string, status: number, size?: number, error?: string): void {
    const statusColor = status >= 200 && status < 300 ? ANSI.green : status >= 400 ? ANSI.red : ANSI.yellow;
    let line = `${getStatusEmoji(status)} ${statusColor}${status}${ANSI.reset}`;
    if (size) line += ` ${ANSI.gray}${formatSize(size)}${ANSI.reset}`;
    if (error) line += ` ${ANSI.red}${error}${ANSI.reset}`;
    console.log(line);
  },

  log(method: string, url: string, status: number, duration: number, options?: {
    size?: number;
    requestBody?: unknown;
    responseBody?: unknown;
  }): void {
    const statusColor = status >= 200 && status < 300 ? ANSI.green : status >= 400 ? ANSI.red : ANSI.yellow;
    const durationColor = duration < 100 ? ANSI.green : duration < 500 ? ANSI.yellow : ANSI.red;
    
    let line = `${getStatusEmoji(status)} ${ANSI.bold}${method.toUpperCase()}${ANSI.reset} ${ANSI.cyan}${url}${ANSI.reset} ${statusColor}${status}${ANSI.reset} ${durationColor}${formatTime(duration)}${ANSI.reset}`;
    if (options?.size) line += ` ${ANSI.gray}${formatSize(options.size)}${ANSI.reset}`;
    
    console.log(line);
  },

  waterfall(): void {
    console.log(`${ANSI.gray}Waterfall view not available on server${ANSI.reset}`);
  },

  clear(): void {
    networkLog.length = 0;
  },

  getEntries(): NetworkEntry[] {
    return [...networkLog];
  },
};

/**
 * Network logger - auto-detects environment
 */
export const network = {
  start: (method: string, url: string, type?: 'fetch' | 'xhr' | 'ws') =>
    IS_BROWSER ? browserNetwork.start(method, url, type) : serverNetwork.start(method, url, type),
  
  end: (id: string, status: number, size?: number, error?: string) =>
    IS_BROWSER ? browserNetwork.end(id, status, size, error) : serverNetwork.end(id, status, size, error),
  
  log: (method: string, url: string, status: number, duration: number, options?: { size?: number; requestBody?: unknown; responseBody?: unknown; headers?: Record<string, string> }) =>
    IS_BROWSER ? browserNetwork.log(method, url, status, duration, options) : serverNetwork.log(method, url, status, duration, options),
  
  waterfall: () =>
    IS_BROWSER ? browserNetwork.waterfall() : serverNetwork.waterfall(),
  
  clear: () =>
    IS_BROWSER ? browserNetwork.clear() : serverNetwork.clear(),
  
  getEntries: () =>
    IS_BROWSER ? browserNetwork.getEntries() : serverNetwork.getEntries(),
};

export type { NetworkEntry };
export default network;
