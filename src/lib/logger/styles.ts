/**
 * Logger Styles
 * Beautiful console styling for browser and server logs
 */

// Brand colors
export const COLORS = {
  primary: '#FF2D55',
  teal: '#00A699',
  orange: '#FC642D',
  
  // Log levels
  debug: '#6B7280',
  info: '#3B82F6',
  warn: '#F59E0B',
  error: '#EF4444',
  success: '#10B981',
  
  // Accents
  purple: '#8B5CF6',
  cyan: '#06B6D4',
  pink: '#EC4899',
  
  // Neutral
  muted: '#9CA3AF',
  dark: '#1F2937',
  light: '#F3F4F6',
} as const;

// Emoji mapping
export const EMOJI = {
  debug: '🔍',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
  success: '✅',
  
  // Actions
  api: '🌐',
  db: '🗄️',
  auth: '🔐',
  cache: '💾',
  render: '🎨',
  
  // Performance
  fast: '⚡',
  slow: '🐢',
  critical: '🐌',
  
  // Events
  mount: '🎬',
  unmount: '🎬',
  update: '🔄',
  click: '👆',
  
  // Status
  loading: '⏳',
  complete: '✨',
  network: '📡',
  memory: '🧠',
} as const;

// Console style presets
export const STYLES = {
  // Headers
  header: `
    background: linear-gradient(135deg, ${COLORS.primary}, ${COLORS.orange});
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: bold;
  `.replace(/\s+/g, ' ').trim(),
  
  // Log levels
  debug: `color: ${COLORS.debug}; font-weight: normal;`,
  info: `color: ${COLORS.info}; font-weight: bold;`,
  warn: `color: ${COLORS.warn}; font-weight: bold;`,
  error: `color: ${COLORS.error}; font-weight: bold;`,
  success: `color: ${COLORS.success}; font-weight: bold;`,
  
  // Labels
  label: `
    background: ${COLORS.dark};
    color: ${COLORS.light};
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 600;
  `.replace(/\s+/g, ' ').trim(),
  
  labelPrimary: `
    background: ${COLORS.primary};
    color: white;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 600;
  `.replace(/\s+/g, ' ').trim(),
  
  labelSuccess: `
    background: ${COLORS.success};
    color: white;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 600;
  `.replace(/\s+/g, ' ').trim(),
  
  labelWarning: `
    background: ${COLORS.warn};
    color: white;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 600;
  `.replace(/\s+/g, ' ').trim(),
  
  labelError: `
    background: ${COLORS.error};
    color: white;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 600;
  `.replace(/\s+/g, ' ').trim(),
  
  // Text styles
  bold: 'font-weight: bold;',
  muted: `color: ${COLORS.muted};`,
  code: `
    background: ${COLORS.dark};
    color: ${COLORS.cyan};
    padding: 2px 4px;
    border-radius: 3px;
    font-family: monospace;
  `.replace(/\s+/g, ' ').trim(),
  
  // Timing
  fast: `color: ${COLORS.success}; font-weight: bold;`,
  medium: `color: ${COLORS.warn}; font-weight: bold;`,
  slow: `color: ${COLORS.error}; font-weight: bold;`,
} as const;

// Server-side ANSI colors
export const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  
  // Backgrounds
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
} as const;

/**
 * Get timing style based on duration
 */
export function getTimingStyle(duration: number): { emoji: string; style: string; color: string } {
  if (duration < 100) {
    return { emoji: EMOJI.fast, style: STYLES.fast, color: COLORS.success };
  }
  if (duration < 500) {
    return { emoji: EMOJI.slow, style: STYLES.medium, color: COLORS.warn };
  }
  return { emoji: EMOJI.critical, style: STYLES.slow, color: COLORS.error };
}

/**
 * Get status style based on HTTP status code
 */
export function getStatusStyle(status: number): { emoji: string; style: string; color: string } {
  if (status >= 200 && status < 300) {
    return { emoji: EMOJI.success, style: STYLES.success, color: COLORS.success };
  }
  if (status >= 400 && status < 500) {
    return { emoji: EMOJI.warn, style: STYLES.warn, color: COLORS.warn };
  }
  if (status >= 500) {
    return { emoji: EMOJI.error, style: STYLES.error, color: COLORS.error };
  }
  return { emoji: EMOJI.info, style: STYLES.info, color: COLORS.info };
}
