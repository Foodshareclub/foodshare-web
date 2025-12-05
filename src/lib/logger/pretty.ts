/**
 * Pretty Logger
 * Beautiful, structured console output for browser and server
 */

import type { LogLevel, LogContext } from './types';
import { COLORS, EMOJI, STYLES, ANSI, getTimingStyle, getStatusStyle } from './styles';

const IS_BROWSER = typeof window !== 'undefined';
const IS_DEV = process.env.NODE_ENV !== 'production';

/**
 * Format timestamp
 */
function timestamp(): string {
  return new Date().toISOString().split('T')[1].slice(0, 12); // HH:MM:SS.mmm
}

/**
 * Format duration
 */
function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format bytes
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Browser-specific pretty logging
 */
const browserLog = {
  /**
   * Log with level styling
   */
  log(level: LogLevel, message: string, context?: LogContext, data?: unknown) {
    const emoji = EMOJI[level];
    const style = STYLES[level];
    const time = timestamp();
    
    const contextStr = context?.component ? ` [${context.component}]` : '';
    const prefix = `${emoji} %c${time}%c${contextStr}`;
    
    if (data || (context && Object.keys(context).length > 1)) {
      console.groupCollapsed(
        `${prefix} %c${message}`,
        STYLES.muted,
        `color: ${COLORS.purple}; font-weight: 600;`,
        style
      );
      
      if (context && Object.keys(context).length > 1) {
        const { component: _, ...rest } = context;
        if (Object.keys(rest).length > 0) {
          console.log('%c📋 Context', STYLES.label, rest);
        }
      }
      
      if (data !== undefined) {
        console.log('%c📦 Data', STYLES.label, data);
      }
      
      console.groupEnd();
    } else {
      console.log(
        `${prefix} %c${message}`,
        STYLES.muted,
        `color: ${COLORS.purple}; font-weight: 600;`,
        style
      );
    }
  },

  /**
   * API request log
   */
  api(method: string, url: string, status?: number, duration?: number, size?: number) {
    const { emoji, style } = status ? getStatusStyle(status) : { emoji: EMOJI.loading, style: STYLES.info };
    const time = timestamp();
    
    const parts = [
      `${emoji} %c${time}`,
      `%c${method}`,
      `%c${url}`,
    ];
    const styles = [
      STYLES.muted,
      STYLES.labelPrimary,
      `color: ${COLORS.cyan};`,
    ];
    
    if (status) {
      const statusLabel = status >= 200 && status < 300 ? STYLES.labelSuccess 
        : status >= 400 ? STYLES.labelError 
        : STYLES.labelWarning;
      parts.push(`%c${status}`);
      styles.push(statusLabel);
    }
    
    if (duration !== undefined) {
      const { style: timeStyle } = getTimingStyle(duration);
      parts.push(`%c${formatDuration(duration)}`);
      styles.push(timeStyle);
    }
    
    if (size !== undefined) {
      parts.push(`%c${formatBytes(size)}`);
      styles.push(STYLES.muted);
    }
    
    console.log(parts.join(' '), ...styles);
  },

  /**
   * Database query log
   */
  db(operation: string, table: string, duration?: number, rowCount?: number) {
    const time = timestamp();
    const { emoji: timeEmoji, style: timeStyle } = duration ? getTimingStyle(duration) : { emoji: '', style: '' };
    
    const parts = [`${EMOJI.db} %c${time}`, `%c${operation.toUpperCase()}`, `%c${table}`];
    const styles = [STYLES.muted, STYLES.labelPrimary, `color: ${COLORS.teal}; font-weight: 600;`];
    
    if (duration !== undefined) {
      parts.push(`%c${timeEmoji} ${formatDuration(duration)}`);
      styles.push(timeStyle);
    }
    
    if (rowCount !== undefined) {
      parts.push(`%c(${rowCount} rows)`);
      styles.push(STYLES.muted);
    }
    
    console.log(parts.join(' '), ...styles);
  },

  /**
   * Performance measurement
   */
  perf(name: string, duration: number, metadata?: Record<string, unknown>) {
    const { emoji, style, color } = getTimingStyle(duration);
    const time = timestamp();
    
    if (metadata) {
      console.groupCollapsed(
        `${emoji} %c${time} %c${name} %c${formatDuration(duration)}`,
        STYLES.muted,
        `color: ${COLORS.purple}; font-weight: 600;`,
        style
      );
      console.log('%c📊 Metrics', STYLES.label, metadata);
      console.groupEnd();
    } else {
      console.log(
        `${emoji} %c${time} %c${name} %c${formatDuration(duration)}`,
        STYLES.muted,
        `color: ${COLORS.purple}; font-weight: 600;`,
        style
      );
    }
  },

  /**
   * Render/component lifecycle
   */
  render(component: string, event: 'mount' | 'unmount' | 'update', props?: Record<string, unknown>) {
    if (!IS_DEV) return;
    
    const emoji = event === 'mount' ? '🟢' : event === 'unmount' ? '🔴' : '🔵';
    const time = timestamp();
    
    if (props) {
      console.groupCollapsed(
        `${emoji} %c${time} %c${component} %c${event}`,
        STYLES.muted,
        `color: ${COLORS.purple}; font-weight: 600;`,
        STYLES.label
      );
      console.log('%c📦 Props', STYLES.label, props);
      console.groupEnd();
    } else {
      console.log(
        `${emoji} %c${time} %c${component} %c${event}`,
        STYLES.muted,
        `color: ${COLORS.purple}; font-weight: 600;`,
        STYLES.label
      );
    }
  },

  /**
   * Auth events
   */
  auth(event: string, userId?: string, metadata?: Record<string, unknown>) {
    const time = timestamp();
    
    console.groupCollapsed(
      `${EMOJI.auth} %c${time} %c${event}${userId ? ` %c${userId}` : ''}`,
      STYLES.muted,
      `color: ${COLORS.pink}; font-weight: 600;`,
      userId ? STYLES.code : ''
    );
    if (metadata) {
      console.log('%c📋 Details', STYLES.label, metadata);
    }
    console.groupEnd();
  },

  /**
   * Cache operations
   */
  cache(operation: 'hit' | 'miss' | 'set' | 'invalidate', key: string, metadata?: Record<string, unknown>) {
    const emoji = operation === 'hit' ? '✅' : operation === 'miss' ? '❌' : operation === 'set' ? '💾' : '🗑️';
    const color = operation === 'hit' ? COLORS.success : operation === 'miss' ? COLORS.warn : COLORS.info;
    const time = timestamp();
    
    console.log(
      `${emoji} %c${time} %cCACHE %c${operation.toUpperCase()} %c${key}`,
      STYLES.muted,
      STYLES.label,
      `color: ${color}; font-weight: 600;`,
      STYLES.code
    );
  },

  /**
   * Error with stack trace
   */
  error(message: string, error?: Error, context?: LogContext) {
    const time = timestamp();
    
    console.group(
      `${EMOJI.error} %c${time} %c${message}`,
      STYLES.muted,
      STYLES.error
    );
    
    if (context) {
      console.log('%c📋 Context', STYLES.label, context);
    }
    
    if (error) {
      console.log('%c🔍 Error', STYLES.labelError, error.message);
      if (error.stack) {
        console.groupCollapsed('%c📍 Stack Trace', STYLES.label);
        console.log(error.stack);
        console.groupEnd();
      }
    }
    
    console.groupEnd();
  },

  /**
   * Table output
   */
  table(title: string, data: Record<string, unknown>[] | Record<string, unknown>) {
    console.group(`📊 %c${title}`, `color: ${COLORS.purple}; font-weight: 600;`);
    console.table(data);
    console.groupEnd();
  },

  /**
   * Divider for visual separation
   */
  divider(label?: string) {
    if (label) {
      console.log(
        `%c────────── ${label} ──────────`,
        `color: ${COLORS.muted}; font-weight: bold;`
      );
    } else {
      console.log('%c' + '─'.repeat(50), `color: ${COLORS.muted};`);
    }
  },

  /**
   * FoodShare branded header
   */
  banner() {
    console.log(
      '%c 🍽️ FoodShare ',
      STYLES.header,
      '\n%cReducing food waste, one share at a time',
      `color: ${COLORS.muted}; font-style: italic;`
    );
  },
};


/**
 * Server-side pretty logging (Node.js with ANSI colors)
 */
const serverLog = {
  log(level: LogLevel, message: string, context?: LogContext, data?: unknown) {
    const time = timestamp();
    const emoji = EMOJI[level];
    const color = level === 'error' ? ANSI.red 
      : level === 'warn' ? ANSI.yellow 
      : level === 'success' ? ANSI.green 
      : level === 'debug' ? ANSI.gray 
      : ANSI.blue;
    
    const contextStr = context?.component ? ` ${ANSI.magenta}[${context.component}]${ANSI.reset}` : '';
    
    console.log(
      `${emoji} ${ANSI.gray}${time}${ANSI.reset}${contextStr} ${color}${message}${ANSI.reset}`
    );
    
    if (data) {
      console.log(`   ${ANSI.cyan}→${ANSI.reset}`, data);
    }
  },

  api(method: string, url: string, status?: number, duration?: number, size?: number) {
    const time = timestamp();
    const statusColor = status && status >= 200 && status < 300 ? ANSI.green 
      : status && status >= 400 ? ANSI.red 
      : ANSI.yellow;
    const durationColor = duration && duration < 100 ? ANSI.green 
      : duration && duration < 500 ? ANSI.yellow 
      : ANSI.red;
    
    let line = `${EMOJI.api} ${ANSI.gray}${time}${ANSI.reset} ${ANSI.bold}${method}${ANSI.reset} ${ANSI.cyan}${url}${ANSI.reset}`;
    
    if (status) line += ` ${statusColor}${status}${ANSI.reset}`;
    if (duration !== undefined) line += ` ${durationColor}${formatDuration(duration)}${ANSI.reset}`;
    if (size !== undefined) line += ` ${ANSI.gray}${formatBytes(size)}${ANSI.reset}`;
    
    console.log(line);
  },

  db(operation: string, table: string, duration?: number, rowCount?: number) {
    const time = timestamp();
    const durationColor = duration && duration < 50 ? ANSI.green 
      : duration && duration < 200 ? ANSI.yellow 
      : ANSI.red;
    
    let line = `${EMOJI.db} ${ANSI.gray}${time}${ANSI.reset} ${ANSI.bold}${operation.toUpperCase()}${ANSI.reset} ${ANSI.cyan}${table}${ANSI.reset}`;
    
    if (duration !== undefined) line += ` ${durationColor}${formatDuration(duration)}${ANSI.reset}`;
    if (rowCount !== undefined) line += ` ${ANSI.gray}(${rowCount} rows)${ANSI.reset}`;
    
    console.log(line);
  },

  perf(name: string, duration: number, _metadata?: Record<string, unknown>) {
    const time = timestamp();
    const color = duration < 100 ? ANSI.green : duration < 500 ? ANSI.yellow : ANSI.red;
    const emoji = duration < 100 ? EMOJI.fast : duration < 500 ? EMOJI.slow : EMOJI.critical;
    
    console.log(
      `${emoji} ${ANSI.gray}${time}${ANSI.reset} ${ANSI.magenta}${name}${ANSI.reset} ${color}${formatDuration(duration)}${ANSI.reset}`
    );
  },

  error(message: string, error?: Error, context?: LogContext) {
    const time = timestamp();
    
    console.log(`${EMOJI.error} ${ANSI.gray}${time}${ANSI.reset} ${ANSI.red}${ANSI.bold}${message}${ANSI.reset}`);
    
    if (context) {
      console.log(`   ${ANSI.cyan}Context:${ANSI.reset}`, context);
    }
    
    if (error) {
      console.log(`   ${ANSI.red}Error:${ANSI.reset} ${error.message}`);
      if (error.stack && process.env.NODE_ENV !== 'production') {
        console.log(`   ${ANSI.gray}${error.stack.split('\n').slice(1).join('\n   ')}${ANSI.reset}`);
      }
    }
  },

  divider(label?: string) {
    const line = '─'.repeat(50);
    if (label) {
      console.log(`${ANSI.gray}────────── ${label} ──────────${ANSI.reset}`);
    } else {
      console.log(`${ANSI.gray}${line}${ANSI.reset}`);
    }
  },

  banner() {
    console.log(`\n${ANSI.bold}${ANSI.magenta}🍽️  FoodShare${ANSI.reset}`);
    console.log(`${ANSI.gray}Reducing food waste, one share at a time${ANSI.reset}\n`);
  },
};

/**
 * Pretty Logger - auto-detects environment
 */
export const pretty = {
  log: (level: LogLevel, message: string, context?: LogContext, data?: unknown) => 
    IS_BROWSER ? browserLog.log(level, message, context, data) : serverLog.log(level, message, context, data),
  
  debug: (message: string, context?: LogContext, data?: unknown) => 
    IS_DEV && (IS_BROWSER ? browserLog.log('debug', message, context, data) : serverLog.log('debug', message, context, data)),
  
  info: (message: string, context?: LogContext, data?: unknown) => 
    IS_BROWSER ? browserLog.log('info', message, context, data) : serverLog.log('info', message, context, data),
  
  warn: (message: string, context?: LogContext, data?: unknown) => 
    IS_BROWSER ? browserLog.log('warn', message, context, data) : serverLog.log('warn', message, context, data),
  
  error: (message: string, error?: Error, context?: LogContext) => 
    IS_BROWSER ? browserLog.error(message, error, context) : serverLog.error(message, error, context),
  
  success: (message: string, context?: LogContext, data?: unknown) => 
    IS_BROWSER ? browserLog.log('success', message, context, data) : serverLog.log('success', message, context, data),
  
  api: (method: string, url: string, status?: number, duration?: number, size?: number) => 
    IS_BROWSER ? browserLog.api(method, url, status, duration, size) : serverLog.api(method, url, status, duration, size),
  
  db: (operation: string, table: string, duration?: number, rowCount?: number) => 
    IS_BROWSER ? browserLog.db(operation, table, duration, rowCount) : serverLog.db(operation, table, duration, rowCount),
  
  perf: (name: string, duration: number, metadata?: Record<string, unknown>) => 
    IS_BROWSER ? browserLog.perf(name, duration, metadata) : serverLog.perf(name, duration, metadata),
  
  render: (component: string, event: 'mount' | 'unmount' | 'update', props?: Record<string, unknown>) => 
    IS_BROWSER && browserLog.render(component, event, props),
  
  auth: (event: string, userId?: string, metadata?: Record<string, unknown>) => 
    IS_BROWSER && browserLog.auth(event, userId, metadata),
  
  cache: (operation: 'hit' | 'miss' | 'set' | 'invalidate', key: string, metadata?: Record<string, unknown>) => 
    IS_BROWSER && browserLog.cache(operation, key, metadata),
  
  table: (title: string, data: Record<string, unknown>[] | Record<string, unknown>) => 
    IS_BROWSER && browserLog.table(title, data),
  
  divider: (label?: string) => 
    IS_BROWSER ? browserLog.divider(label) : serverLog.divider(label),
  
  banner: () => 
    IS_BROWSER ? browserLog.banner() : serverLog.banner(),
};

export default pretty;
