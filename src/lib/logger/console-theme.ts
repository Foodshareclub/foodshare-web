/**
 * Console Theme
 * Beautiful ASCII art and themed console output
 */

import { ANSI, COLORS } from './styles';

const IS_BROWSER = typeof window !== 'undefined';

/**
 * FoodShare ASCII banner
 */
const ASCII_BANNER = `
  ███████╗ ██████╗  ██████╗ ██████╗ ███████╗██╗  ██╗ █████╗ ██████╗ ███████╗
  ██╔════╝██╔═══██╗██╔═══██╗██╔══██╗██╔════╝██║  ██║██╔══██╗██╔══██╗██╔════╝
  █████╗  ██║   ██║██║   ██║██║  ██║███████╗███████║███████║██████╔╝█████╗  
  ██╔══╝  ██║   ██║██║   ██║██║  ██║╚════██║██╔══██║██╔══██║██╔══██╗██╔══╝  
  ██║     ╚██████╔╝╚██████╔╝██████╔╝███████║██║  ██║██║  ██║██║  ██║███████╗
  ╚═╝      ╚═════╝  ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
`;

/**
 * Print the FoodShare banner
 */
export function printBanner(): void {
  if (IS_BROWSER) {
    console.log(
      `%c${ASCII_BANNER}`,
      `color: ${COLORS.primary}; font-family: monospace; font-size: 10px;`
    );
    console.log(
      '%c🍽️ Reducing food waste, one share at a time',
      `color: ${COLORS.muted}; font-style: italic; padding-left: 20px;`
    );
    console.log('');
  } else {
    console.log(`${ANSI.magenta}${ASCII_BANNER}${ANSI.reset}`);
    console.log(`${ANSI.gray}  🍽️ Reducing food waste, one share at a time${ANSI.reset}\n`);
  }
}

/**
 * Print a section header
 */
export function printSection(title: string, icon = '📦'): void {
  const line = '═'.repeat(50);
  
  if (IS_BROWSER) {
    console.log(
      `%c${icon} ${title}\n%c${line}`,
      `color: ${COLORS.primary}; font-weight: bold; font-size: 14px;`,
      `color: ${COLORS.muted};`
    );
  } else {
    console.log(`\n${ANSI.magenta}${ANSI.bold}${icon} ${title}${ANSI.reset}`);
    console.log(`${ANSI.gray}${line}${ANSI.reset}`);
  }
}

/**
 * Print environment info
 */
export function printEnvInfo(): void {
  const env = process.env.NODE_ENV || 'development';
  const isProduction = env === 'production';
  
  if (IS_BROWSER) {
    console.log(
      `%c🌍 Environment: %c${env.toUpperCase()}`,
      'color: #6B7280;',
      isProduction 
        ? `background: ${COLORS.success}; color: white; padding: 2px 6px; border-radius: 3px;`
        : `background: ${COLORS.warn}; color: white; padding: 2px 6px; border-radius: 3px;`
    );
  } else {
    const color = isProduction ? ANSI.green : ANSI.yellow;
    console.log(`${ANSI.gray}🌍 Environment: ${color}${env.toUpperCase()}${ANSI.reset}`);
  }
}

/**
 * Print a key-value pair
 */
export function printKeyValue(key: string, value: string | number | boolean, icon?: string): void {
  const prefix = icon ? `${icon} ` : '';
  
  if (IS_BROWSER) {
    console.log(
      `%c${prefix}${key}: %c${value}`,
      `color: ${COLORS.muted};`,
      `color: ${COLORS.cyan}; font-weight: 600;`
    );
  } else {
    console.log(`${ANSI.gray}${prefix}${key}: ${ANSI.cyan}${value}${ANSI.reset}`);
  }
}

/**
 * Print a success box
 */
export function printSuccessBox(message: string): void {
  if (IS_BROWSER) {
    console.log(
      `%c ✅ ${message} `,
      `background: ${COLORS.success}; color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold;`
    );
  } else {
    console.log(`${ANSI.bgGreen}${ANSI.bold} ✅ ${message} ${ANSI.reset}`);
  }
}

/**
 * Print an error box
 */
export function printErrorBox(message: string): void {
  if (IS_BROWSER) {
    console.log(
      `%c ❌ ${message} `,
      `background: ${COLORS.error}; color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold;`
    );
  } else {
    console.log(`${ANSI.bgRed}${ANSI.bold} ❌ ${message} ${ANSI.reset}`);
  }
}

/**
 * Print a warning box
 */
export function printWarningBox(message: string): void {
  if (IS_BROWSER) {
    console.log(
      `%c ⚠️ ${message} `,
      `background: ${COLORS.warn}; color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold;`
    );
  } else {
    console.log(`${ANSI.bgYellow}${ANSI.bold} ⚠️ ${message} ${ANSI.reset}`);
  }
}

/**
 * Print a progress indicator
 */
export function printProgress(current: number, total: number, label?: string): void {
  const percentage = Math.round((current / total) * 100);
  const filled = Math.round(percentage / 5);
  const empty = 20 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  
  const text = label ? `${label}: ` : '';
  
  if (IS_BROWSER) {
    console.log(
      `%c${text}%c${bar}%c ${percentage}%`,
      `color: ${COLORS.muted};`,
      `color: ${COLORS.primary};`,
      `color: ${COLORS.cyan}; font-weight: bold;`
    );
  } else {
    console.log(`${ANSI.gray}${text}${ANSI.magenta}${bar}${ANSI.cyan} ${percentage}%${ANSI.reset}`);
  }
}

/**
 * Print a timeline event
 */
export function printTimelineEvent(time: string, event: string, status: 'success' | 'error' | 'pending' = 'success'): void {
  const statusIcon = status === 'success' ? '●' : status === 'error' ? '●' : '○';
  const statusColor = status === 'success' ? COLORS.success : status === 'error' ? COLORS.error : COLORS.muted;
  
  if (IS_BROWSER) {
    console.log(
      `%c${time} %c${statusIcon} %c${event}`,
      `color: ${COLORS.muted}; font-family: monospace;`,
      `color: ${statusColor};`,
      `color: ${COLORS.dark};`
    );
  } else {
    const ansiColor = status === 'success' ? ANSI.green : status === 'error' ? ANSI.red : ANSI.gray;
    console.log(`${ANSI.gray}${time} ${ansiColor}${statusIcon}${ANSI.reset} ${event}`);
  }
}

export const theme = {
  banner: printBanner,
  section: printSection,
  envInfo: printEnvInfo,
  keyValue: printKeyValue,
  successBox: printSuccessBox,
  errorBox: printErrorBox,
  warningBox: printWarningBox,
  progress: printProgress,
  timeline: printTimelineEvent,
};

export default theme;
