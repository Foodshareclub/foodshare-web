/**
 * Enhanced Logger
 * Advanced logging features for debugging complex flows
 */

import { COLORS, EMOJI, STYLES, ANSI, getTimingStyle, getStatusStyle } from './styles';
import type { LogContext } from './types';

const IS_BROWSER = typeof window !== 'undefined';
const IS_DEV = process.env.NODE_ENV !== 'production';

function timestamp(): string {
  return new Date().toISOString().split('T')[1].slice(0, 12);
}

function formatJson(obj: unknown, indent = 2): string {
  try {
    return JSON.stringify(obj, null, indent);
  } catch {
    return String(obj);
  }
}

/**
 * Enhanced browser logging
 */
const browserEnhanced = {
  /**
   * Log HTTP request with full details
   */
  request(method: string, url: string, options?: {
    headers?: Record<string, string>;
    body?: unknown;
    params?: Record<string, string>;
  }) {
    const time = timestamp();
    
    console.groupCollapsed(
      `${EMOJI.network} %c${time} %c${method} %c${url}`,
      STYLES.muted,
      STYLES.labelPrimary,
      `color: ${COLORS.cyan};`
    );
    
    if (options?.headers) {
      console.log('%c📋 Headers', STYLES.label);
      console.table(options.headers);
    }
    
    if (options?.params) {
      console.log('%c🔍 Params', STYLES.label);
      console.table(options.params);
    }
    
    if (options?.body) {
      console.log('%c📦 Body', STYLES.label);
      console.log(options.body);
    }
    
    console.groupEnd();
  },

  /**
   * Log HTTP response with full details
   */
  response(method: string, url: string, status: number, duration: number, options?: {
    headers?: Record<string, string>;
    body?: unknown;
    size?: number;
  }) {
    const time = timestamp();
    const { emoji, style } = getStatusStyle(status);
    const { style: timeStyle } = getTimingStyle(duration);
    
    console.groupCollapsed(
      `${emoji} %c${time} %c${method} %c${url} %c${status} %c${duration.toFixed(0)}ms`,
      STYLES.muted,
      STYLES.label,
      `color: ${COLORS.cyan};`,
      style,
      timeStyle
    );
    
    if (options?.headers) {
      console.log('%c📋 Response Headers', STYLES.label);
      console.table(options.headers);
    }
    
    if (options?.body) {
      console.log('%c📦 Response Body', STYLES.label);
      if (typeof options.body === 'object') {
        console.dir(options.body, { depth: 4 });
      } else {
        console.log(options.body);
      }
    }
    
    if (options?.size) {
      console.log(`%c📊 Size: ${(options.size / 1024).toFixed(2)} KB`, STYLES.muted);
    }
    
    console.groupEnd();
  },

  /**
   * Log state change (before/after)
   */
  stateChange(name: string, before: unknown, after: unknown, context?: LogContext) {
    const time = timestamp();
    
    console.groupCollapsed(
      `🔄 %c${time} %cState: %c${name}`,
      STYLES.muted,
      STYLES.label,
      `color: ${COLORS.purple}; font-weight: 600;`
    );
    
    if (context) {
      console.log('%c📋 Context', STYLES.label, context);
    }
    
    console.log('%c⬅️ Before', `color: ${COLORS.error}; font-weight: 600;`);
    console.dir(before, { depth: 3 });
    
    console.log('%c➡️ After', `color: ${COLORS.success}; font-weight: 600;`);
    console.dir(after, { depth: 3 });
    
    // Show diff for objects
    if (typeof before === 'object' && typeof after === 'object' && before && after) {
      const changes = getObjectDiff(before as Record<string, unknown>, after as Record<string, unknown>);
      if (changes.length > 0) {
        console.log('%c📝 Changes', STYLES.label);
        console.table(changes);
      }
    }
    
    console.groupEnd();
  },

  /**
   * Log a user action/event
   */
  action(action: string, payload?: unknown, context?: LogContext) {
    const time = timestamp();
    
    if (payload || context) {
      console.groupCollapsed(
        `👆 %c${time} %c${action}`,
        STYLES.muted,
        `color: ${COLORS.pink}; font-weight: 600;`
      );
      
      if (context) {
        console.log('%c📋 Context', STYLES.label, context);
      }
      
      if (payload !== undefined) {
        console.log('%c📦 Payload', STYLES.label, payload);
      }
      
      console.groupEnd();
    } else {
      console.log(
        `👆 %c${time} %c${action}`,
        STYLES.muted,
        `color: ${COLORS.pink}; font-weight: 600;`
      );
    }
  },

  /**
   * Log a flow/sequence of operations
   */
  flow(name: string, steps: Array<{ name: string; status: 'pending' | 'success' | 'error' | 'skipped'; duration?: number; error?: string }>) {
    const time = timestamp();
    const allSuccess = steps.every(s => s.status === 'success' || s.status === 'skipped');
    const hasError = steps.some(s => s.status === 'error');
    
    const emoji = hasError ? '❌' : allSuccess ? '✅' : '⏳';
    const totalDuration = steps.reduce((sum, s) => sum + (s.duration || 0), 0);
    
    console.groupCollapsed(
      `${emoji} %c${time} %cFlow: %c${name} %c${totalDuration.toFixed(0)}ms`,
      STYLES.muted,
      STYLES.label,
      `color: ${COLORS.purple}; font-weight: 600;`,
      getTimingStyle(totalDuration).style
    );
    
    steps.forEach((step, i) => {
      const stepEmoji = step.status === 'success' ? '✅' 
        : step.status === 'error' ? '❌' 
        : step.status === 'skipped' ? '⏭️' 
        : '⏳';
      const stepColor = step.status === 'success' ? COLORS.success 
        : step.status === 'error' ? COLORS.error 
        : COLORS.muted;
      
      console.log(
        `%c${i + 1}. ${stepEmoji} %c${step.name}${step.duration ? ` %c(${step.duration.toFixed(0)}ms)` : ''}`,
        `color: ${stepColor};`,
        'font-weight: 600;',
        step.duration ? STYLES.muted : ''
      );
      
      if (step.error) {
        console.log(`   %c↳ ${step.error}`, `color: ${COLORS.error};`);
      }
    });
    
    console.groupEnd();
  },

  /**
   * Log with syntax-highlighted JSON
   */
  json(label: string, data: unknown) {
    const time = timestamp();
    
    console.groupCollapsed(
      `📄 %c${time} %c${label}`,
      STYLES.muted,
      `color: ${COLORS.cyan}; font-weight: 600;`
    );
    
    if (typeof data === 'object' && data !== null) {
      console.dir(data, { depth: 10, colors: true });
    } else {
      console.log(data);
    }
    
    console.groupEnd();
  },

  /**
   * Log a diff between two values
   */
  diff(label: string, a: unknown, b: unknown) {
    const time = timestamp();
    
    console.group(
      `📊 %c${time} %cDiff: %c${label}`,
      STYLES.muted,
      STYLES.label,
      `color: ${COLORS.purple}; font-weight: 600;`
    );
    
    console.log('%c─ Removed', `color: ${COLORS.error}; font-weight: 600;`);
    console.log(a);
    
    console.log('%c+ Added', `color: ${COLORS.success}; font-weight: 600;`);
    console.log(b);
    
    console.groupEnd();
  },

  /**
   * Log a metric/measurement
   */
  metric(name: string, value: number, unit: string, threshold?: { warn: number; error: number }) {
    const time = timestamp();
    
    let emoji = '📊';
    let color: string = COLORS.info;
    
    if (threshold) {
      if (value >= threshold.error) {
        emoji = '🔴';
        color = COLORS.error;
      } else if (value >= threshold.warn) {
        emoji = '🟡';
        color = COLORS.warn;
      } else {
        emoji = '🟢';
        color = COLORS.success;
      }
    }
    
    console.log(
      `${emoji} %c${time} %c${name}: %c${value}${unit}`,
      STYLES.muted,
      `color: ${COLORS.muted};`,
      `color: ${color}; font-weight: bold;`
    );
  },

  /**
   * Create a named group for related logs
   */
  group(name: string, icon = '📁') {
    console.group(`${icon} %c${name}`, `color: ${COLORS.purple}; font-weight: 600;`);
  },

  /**
   * Create a collapsed named group
   */
  groupCollapsed(name: string, icon = '📁') {
    console.groupCollapsed(`${icon} %c${name}`, `color: ${COLORS.purple}; font-weight: 600;`);
  },

  /**
   * End a group
   */
  groupEnd() {
    console.groupEnd();
  },

  /**
   * Clear console
   */
  clear() {
    console.clear();
  },

  /**
   * Count occurrences
   */
  count(label: string) {
    console.count(label);
  },

  /**
   * Reset count
   */
  countReset(label: string) {
    console.countReset(label);
  },
};

/**
 * Get diff between two objects
 */
function getObjectDiff(before: Record<string, unknown>, after: Record<string, unknown>): Array<{ key: string; before: unknown; after: unknown }> {
  const changes: Array<{ key: string; before: unknown; after: unknown }> = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  
  for (const key of allKeys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changes.push({ key, before: before[key], after: after[key] });
    }
  }
  
  return changes;
}


/**
 * Server-side enhanced logging
 */
const serverEnhanced = {
  request(method: string, url: string, options?: {
    headers?: Record<string, string>;
    body?: unknown;
    params?: Record<string, string>;
  }) {
    const time = timestamp();
    console.log(`${EMOJI.network} ${ANSI.gray}${time}${ANSI.reset} ${ANSI.bold}${method}${ANSI.reset} ${ANSI.cyan}${url}${ANSI.reset}`);
    
    if (options?.headers) {
      console.log(`   ${ANSI.gray}Headers:${ANSI.reset}`, options.headers);
    }
    if (options?.body) {
      console.log(`   ${ANSI.gray}Body:${ANSI.reset}`, options.body);
    }
  },

  response(method: string, url: string, status: number, duration: number, options?: {
    headers?: Record<string, string>;
    body?: unknown;
    size?: number;
  }) {
    const time = timestamp();
    const statusColor = status >= 200 && status < 300 ? ANSI.green : status >= 400 ? ANSI.red : ANSI.yellow;
    const durationColor = duration < 100 ? ANSI.green : duration < 500 ? ANSI.yellow : ANSI.red;
    
    console.log(
      `${status >= 200 && status < 300 ? '✅' : '❌'} ${ANSI.gray}${time}${ANSI.reset} ${ANSI.bold}${method}${ANSI.reset} ${ANSI.cyan}${url}${ANSI.reset} ${statusColor}${status}${ANSI.reset} ${durationColor}${duration.toFixed(0)}ms${ANSI.reset}`
    );
    
    if (options?.body && IS_DEV) {
      console.log(`   ${ANSI.gray}Response:${ANSI.reset}`, typeof options.body === 'string' ? options.body.slice(0, 200) : options.body);
    }
  },

  stateChange(name: string, before: unknown, after: unknown, _context?: LogContext) {
    const time = timestamp();
    console.log(`🔄 ${ANSI.gray}${time}${ANSI.reset} ${ANSI.magenta}State: ${name}${ANSI.reset}`);
    console.log(`   ${ANSI.red}Before:${ANSI.reset}`, before);
    console.log(`   ${ANSI.green}After:${ANSI.reset}`, after);
  },

  action(action: string, payload?: unknown, _context?: LogContext) {
    const time = timestamp();
    console.log(`👆 ${ANSI.gray}${time}${ANSI.reset} ${ANSI.magenta}${action}${ANSI.reset}`);
    if (payload) {
      console.log(`   ${ANSI.cyan}→${ANSI.reset}`, payload);
    }
  },

  flow(name: string, steps: Array<{ name: string; status: 'pending' | 'success' | 'error' | 'skipped'; duration?: number; error?: string }>) {
    const time = timestamp();
    const hasError = steps.some(s => s.status === 'error');
    const emoji = hasError ? '❌' : '✅';
    
    console.log(`${emoji} ${ANSI.gray}${time}${ANSI.reset} ${ANSI.magenta}Flow: ${name}${ANSI.reset}`);
    
    steps.forEach((step, i) => {
      const stepEmoji = step.status === 'success' ? '✅' : step.status === 'error' ? '❌' : step.status === 'skipped' ? '⏭️' : '⏳';
      const color = step.status === 'success' ? ANSI.green : step.status === 'error' ? ANSI.red : ANSI.gray;
      console.log(`   ${i + 1}. ${stepEmoji} ${color}${step.name}${ANSI.reset}${step.duration ? ` ${ANSI.gray}(${step.duration.toFixed(0)}ms)${ANSI.reset}` : ''}`);
      if (step.error) {
        console.log(`      ${ANSI.red}↳ ${step.error}${ANSI.reset}`);
      }
    });
  },

  json(label: string, data: unknown) {
    const time = timestamp();
    console.log(`📄 ${ANSI.gray}${time}${ANSI.reset} ${ANSI.cyan}${label}${ANSI.reset}`);
    console.log(formatJson(data));
  },

  diff(label: string, a: unknown, b: unknown) {
    const time = timestamp();
    console.log(`📊 ${ANSI.gray}${time}${ANSI.reset} ${ANSI.magenta}Diff: ${label}${ANSI.reset}`);
    console.log(`   ${ANSI.red}- ${formatJson(a)}${ANSI.reset}`);
    console.log(`   ${ANSI.green}+ ${formatJson(b)}${ANSI.reset}`);
  },

  metric(name: string, value: number, unit: string, threshold?: { warn: number; error: number }) {
    const time = timestamp();
    let color: string = ANSI.blue;
    let emoji = '📊';
    
    if (threshold) {
      if (value >= threshold.error) {
        color = ANSI.red;
        emoji = '🔴';
      } else if (value >= threshold.warn) {
        color = ANSI.yellow;
        emoji = '🟡';
      } else {
        color = ANSI.green;
        emoji = '🟢';
      }
    }
    
    console.log(`${emoji} ${ANSI.gray}${time}${ANSI.reset} ${name}: ${color}${value}${unit}${ANSI.reset}`);
  },

  group(name: string, _icon = '📁') {
    console.log(`\n${ANSI.magenta}━━━ ${name} ━━━${ANSI.reset}`);
  },

  groupCollapsed(name: string, icon = '📁') {
    serverEnhanced.group(name, icon);
  },

  groupEnd() {
    console.log(`${ANSI.gray}${'─'.repeat(40)}${ANSI.reset}\n`);
  },

  clear() {
    console.clear();
  },

  count(label: string) {
    console.count(label);
  },

  countReset(label: string) {
    console.countReset(label);
  },
};

/**
 * Enhanced logger - auto-detects environment
 */
export const enhanced = {
  request: (method: string, url: string, options?: { headers?: Record<string, string>; body?: unknown; params?: Record<string, string> }) =>
    IS_BROWSER ? browserEnhanced.request(method, url, options) : serverEnhanced.request(method, url, options),
  
  response: (method: string, url: string, status: number, duration: number, options?: { headers?: Record<string, string>; body?: unknown; size?: number }) =>
    IS_BROWSER ? browserEnhanced.response(method, url, status, duration, options) : serverEnhanced.response(method, url, status, duration, options),
  
  stateChange: (name: string, before: unknown, after: unknown, context?: LogContext) =>
    IS_BROWSER ? browserEnhanced.stateChange(name, before, after, context) : serverEnhanced.stateChange(name, before, after, context),
  
  action: (action: string, payload?: unknown, context?: LogContext) =>
    IS_BROWSER ? browserEnhanced.action(action, payload, context) : serverEnhanced.action(action, payload, context),
  
  flow: (name: string, steps: Array<{ name: string; status: 'pending' | 'success' | 'error' | 'skipped'; duration?: number; error?: string }>) =>
    IS_BROWSER ? browserEnhanced.flow(name, steps) : serverEnhanced.flow(name, steps),
  
  json: (label: string, data: unknown) =>
    IS_BROWSER ? browserEnhanced.json(label, data) : serverEnhanced.json(label, data),
  
  diff: (label: string, a: unknown, b: unknown) =>
    IS_BROWSER ? browserEnhanced.diff(label, a, b) : serverEnhanced.diff(label, a, b),
  
  metric: (name: string, value: number, unit: string, threshold?: { warn: number; error: number }) =>
    IS_BROWSER ? browserEnhanced.metric(name, value, unit, threshold) : serverEnhanced.metric(name, value, unit, threshold),
  
  group: (name: string, icon?: string) =>
    IS_BROWSER ? browserEnhanced.group(name, icon) : serverEnhanced.group(name, icon),
  
  groupCollapsed: (name: string, icon?: string) =>
    IS_BROWSER ? browserEnhanced.groupCollapsed(name, icon) : serverEnhanced.groupCollapsed(name, icon),
  
  groupEnd: () =>
    IS_BROWSER ? browserEnhanced.groupEnd() : serverEnhanced.groupEnd(),
  
  clear: () =>
    IS_BROWSER ? browserEnhanced.clear() : serverEnhanced.clear(),
  
  count: (label: string) =>
    IS_BROWSER ? browserEnhanced.count(label) : serverEnhanced.count(label),
  
  countReset: (label: string) =>
    IS_BROWSER ? browserEnhanced.countReset(label) : serverEnhanced.countReset(label),
};

export default enhanced;
