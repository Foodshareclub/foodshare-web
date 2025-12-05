/**
 * Table Logger
 * Beautiful table formatting for console output
 */

import { COLORS, STYLES, ANSI } from './styles';

const IS_BROWSER = typeof window !== 'undefined';

interface TableColumn {
  key: string;
  label?: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: (value: unknown) => string;
}

/**
 * Format value for display
 */
function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return '—';
  if (typeof value === 'boolean') return value ? '✓' : '✗';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return `[${value.length}]`;
  if (typeof value === 'object') return '{...}';
  return String(value);
}

/**
 * Pad string to width
 */
function pad(str: string, width: number, align: 'left' | 'center' | 'right' = 'left'): string {
  const len = str.length;
  if (len >= width) return str.slice(0, width);
  
  const padding = width - len;
  if (align === 'right') return ' '.repeat(padding) + str;
  if (align === 'center') {
    const left = Math.floor(padding / 2);
    const right = padding - left;
    return ' '.repeat(left) + str + ' '.repeat(right);
  }
  return str + ' '.repeat(padding);
}

/**
 * Browser table logging
 */
const browserTable = {
  /**
   * Log data as a styled table
   */
  log<T extends Record<string, unknown>>(
    title: string,
    data: T[],
    columns?: TableColumn[]
  ): void {
    if (data.length === 0) {
      console.log(`%c📊 ${title}: %cNo data`, `color: ${COLORS.purple}; font-weight: bold;`, `color: ${COLORS.muted};`);
      return;
    }

    // Auto-detect columns if not provided
    const cols: TableColumn[] = columns || Object.keys(data[0]).map(key => ({ key, label: key }));

    console.group(`%c📊 ${title}`, `color: ${COLORS.purple}; font-weight: bold;`);
    
    // Use native console.table for browser
    const tableData = data.map(row => {
      const formatted: Record<string, unknown> = {};
      cols.forEach(col => {
        const value = row[col.key];
        formatted[col.label || col.key] = col.format ? col.format(value) : formatValue(value);
      });
      return formatted;
    });
    
    console.table(tableData);
    console.log(`%c${data.length} rows`, `color: ${COLORS.muted}; font-size: 11px;`);
    console.groupEnd();
  },

  /**
   * Log key-value pairs as a vertical table
   */
  keyValue(title: string, data: Record<string, unknown>): void {
    console.group(`%c📋 ${title}`, `color: ${COLORS.purple}; font-weight: bold;`);
    
    Object.entries(data).forEach(([key, value]) => {
      const formattedValue = formatValue(value);
      const valueColor = typeof value === 'boolean' 
        ? (value ? COLORS.success : COLORS.error)
        : typeof value === 'number' 
          ? COLORS.cyan 
          : COLORS.dark;
      
      console.log(
        `%c${key}: %c${formattedValue}`,
        `color: ${COLORS.muted};`,
        `color: ${valueColor}; font-weight: 600;`
      );
    });
    
    console.groupEnd();
  },

  /**
   * Log a comparison table (before/after)
   */
  compare<T extends Record<string, unknown>>(
    title: string,
    before: T,
    after: T
  ): void {
    const allKeys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
    
    console.group(`%c🔄 ${title}`, `color: ${COLORS.purple}; font-weight: bold;`);
    
    const tableData = allKeys.map(key => {
      const beforeVal = formatValue(before[key]);
      const afterVal = formatValue(after[key]);
      const changed = JSON.stringify(before[key]) !== JSON.stringify(after[key]);
      
      return {
        Property: key,
        Before: beforeVal,
        After: afterVal,
        Changed: changed ? '✓' : '',
      };
    });
    
    console.table(tableData);
    
    const changedCount = tableData.filter(r => r.Changed).length;
    console.log(`%c${changedCount} of ${allKeys.length} properties changed`, `color: ${COLORS.muted}; font-size: 11px;`);
    console.groupEnd();
  },

  /**
   * Log a summary/stats table
   */
  stats(title: string, stats: Record<string, number | string>): void {
    console.group(`%c📈 ${title}`, `color: ${COLORS.purple}; font-weight: bold;`);
    
    Object.entries(stats).forEach(([label, value]) => {
      const isNumber = typeof value === 'number';
      console.log(
        `%c${label} %c${isNumber ? value.toLocaleString() : value}`,
        `color: ${COLORS.muted}; min-width: 120px; display: inline-block;`,
        `color: ${COLORS.cyan}; font-weight: bold; font-size: 14px;`
      );
    });
    
    console.groupEnd();
  },

  /**
   * Log a tree structure
   */
  tree(title: string, data: Record<string, unknown>, depth = 0, maxDepth = 4): void {
    if (depth === 0) {
      console.group(`%c🌳 ${title}`, `color: ${COLORS.purple}; font-weight: bold;`);
    }

    const indent = '  '.repeat(depth);
    const entries = Object.entries(data);

    entries.forEach(([key, value], index) => {
      const isLast = index === entries.length - 1;
      const prefix = isLast ? '└─' : '├─';
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && depth < maxDepth) {
        console.log(`%c${indent}${prefix} ${key}:`, `color: ${COLORS.purple};`);
        browserTable.tree('', value as Record<string, unknown>, depth + 1, maxDepth);
      } else {
        const formattedValue = formatValue(value);
        console.log(
          `%c${indent}${prefix} %c${key}: %c${formattedValue}`,
          `color: ${COLORS.muted};`,
          `color: ${COLORS.purple};`,
          `color: ${COLORS.cyan};`
        );
      }
    });

    if (depth === 0) {
      console.groupEnd();
    }
  },
};

/**
 * Server-side table logging
 */
const serverTable = {
  log<T extends Record<string, unknown>>(
    title: string,
    data: T[],
    columns?: TableColumn[]
  ): void {
    if (data.length === 0) {
      console.log(`${ANSI.magenta}📊 ${title}:${ANSI.reset} ${ANSI.gray}No data${ANSI.reset}`);
      return;
    }

    const cols: TableColumn[] = columns || Object.keys(data[0]).map(key => ({ key, label: key, width: 15 }));
    
    console.log(`\n${ANSI.magenta}${ANSI.bold}📊 ${title}${ANSI.reset}`);
    
    // Header
    const header = cols.map(col => pad(col.label || col.key, col.width || 15, col.align)).join(' │ ');
    const separator = cols.map(col => '─'.repeat(col.width || 15)).join('─┼─');
    
    console.log(`${ANSI.gray}┌─${separator.replace(/┼/g, '┬')}─┐${ANSI.reset}`);
    console.log(`${ANSI.gray}│ ${ANSI.bold}${header}${ANSI.reset}${ANSI.gray} │${ANSI.reset}`);
    console.log(`${ANSI.gray}├─${separator}─┤${ANSI.reset}`);
    
    // Rows
    data.forEach(row => {
      const rowStr = cols.map(col => {
        const value = row[col.key];
        const formatted = col.format ? col.format(value) : formatValue(value);
        return pad(formatted, col.width || 15, col.align);
      }).join(' │ ');
      console.log(`${ANSI.gray}│${ANSI.reset} ${rowStr} ${ANSI.gray}│${ANSI.reset}`);
    });
    
    console.log(`${ANSI.gray}└─${separator.replace(/┼/g, '┴')}─┘${ANSI.reset}`);
    console.log(`${ANSI.gray}${data.length} rows${ANSI.reset}\n`);
  },

  keyValue(title: string, data: Record<string, unknown>): void {
    console.log(`\n${ANSI.magenta}${ANSI.bold}📋 ${title}${ANSI.reset}`);
    
    const maxKeyLen = Math.max(...Object.keys(data).map(k => k.length));
    
    Object.entries(data).forEach(([key, value]) => {
      const paddedKey = key.padEnd(maxKeyLen);
      console.log(`  ${ANSI.gray}${paddedKey}${ANSI.reset} : ${ANSI.cyan}${formatValue(value)}${ANSI.reset}`);
    });
    console.log('');
  },

  compare<T extends Record<string, unknown>>(title: string, before: T, after: T): void {
    const allKeys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
    
    console.log(`\n${ANSI.magenta}${ANSI.bold}🔄 ${title}${ANSI.reset}`);
    
    allKeys.forEach(key => {
      const beforeVal = formatValue(before[key]);
      const afterVal = formatValue(after[key]);
      const changed = JSON.stringify(before[key]) !== JSON.stringify(after[key]);
      
      if (changed) {
        console.log(`  ${ANSI.yellow}${key}${ANSI.reset}: ${ANSI.red}${beforeVal}${ANSI.reset} → ${ANSI.green}${afterVal}${ANSI.reset}`);
      } else {
        console.log(`  ${ANSI.gray}${key}: ${beforeVal}${ANSI.reset}`);
      }
    });
    console.log('');
  },

  stats(title: string, stats: Record<string, number | string>): void {
    console.log(`\n${ANSI.magenta}${ANSI.bold}📈 ${title}${ANSI.reset}`);
    
    Object.entries(stats).forEach(([label, value]) => {
      const formatted = typeof value === 'number' ? value.toLocaleString() : value;
      console.log(`  ${ANSI.gray}${label}:${ANSI.reset} ${ANSI.cyan}${ANSI.bold}${formatted}${ANSI.reset}`);
    });
    console.log('');
  },

  tree(title: string, data: Record<string, unknown>, depth = 0, maxDepth = 4): void {
    if (depth === 0) {
      console.log(`\n${ANSI.magenta}${ANSI.bold}🌳 ${title}${ANSI.reset}`);
    }

    const indent = '  '.repeat(depth + 1);
    const entries = Object.entries(data);

    entries.forEach(([key, value], index) => {
      const isLast = index === entries.length - 1;
      const prefix = isLast ? '└─' : '├─';
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && depth < maxDepth) {
        console.log(`${indent}${ANSI.gray}${prefix}${ANSI.reset} ${ANSI.magenta}${key}:${ANSI.reset}`);
        serverTable.tree('', value as Record<string, unknown>, depth + 1, maxDepth);
      } else {
        console.log(`${indent}${ANSI.gray}${prefix}${ANSI.reset} ${ANSI.magenta}${key}:${ANSI.reset} ${ANSI.cyan}${formatValue(value)}${ANSI.reset}`);
      }
    });

    if (depth === 0) {
      console.log('');
    }
  },
};

/**
 * Table logger - auto-detects environment
 */
export const table = {
  log: <T extends Record<string, unknown>>(title: string, data: T[], columns?: TableColumn[]) =>
    IS_BROWSER ? browserTable.log(title, data, columns) : serverTable.log(title, data, columns),
  
  keyValue: (title: string, data: Record<string, unknown>) =>
    IS_BROWSER ? browserTable.keyValue(title, data) : serverTable.keyValue(title, data),
  
  compare: <T extends Record<string, unknown>>(title: string, before: T, after: T) =>
    IS_BROWSER ? browserTable.compare(title, before, after) : serverTable.compare(title, before, after),
  
  stats: (title: string, stats: Record<string, number | string>) =>
    IS_BROWSER ? browserTable.stats(title, stats) : serverTable.stats(title, stats),
  
  tree: (title: string, data: Record<string, unknown>, maxDepth?: number) =>
    IS_BROWSER ? browserTable.tree(title, data, 0, maxDepth) : serverTable.tree(title, data, 0, maxDepth),
};

export type { TableColumn };
export default table;
