/**
 * Logger Initialization
 * Sets up the logging system on app start
 */

import { theme } from './console-theme';
import { interceptor } from './interceptor';
import { profiler } from './profiler';
import { pretty } from './pretty';
import { COLORS } from './styles';

const IS_BROWSER = typeof window !== 'undefined';
const IS_DEV = process.env.NODE_ENV !== 'production';

interface InitOptions {
  /** Show FoodShare banner on start */
  showBanner?: boolean;
  /** Intercept all console output */
  interceptConsole?: boolean;
  /** Enable performance profiler */
  enableProfiler?: boolean;
  /** Log environment info */
  showEnvInfo?: boolean;
  /** Custom app name */
  appName?: string;
  /** Custom version */
  version?: string;
}

const defaultOptions: InitOptions = {
  showBanner: true,
  interceptConsole: false,
  enableProfiler: true,
  showEnvInfo: true,
};

let isInitialized = false;

/**
 * Initialize the logging system
 */
export function initLogger(options: InitOptions = {}): void {
  if (isInitialized) return;
  isInitialized = true;

  const opts = { ...defaultOptions, ...options };

  // Only run in browser or server based on context
  if (IS_BROWSER) {
    initBrowser(opts);
  } else {
    initServer(opts);
  }
}

/**
 * Browser initialization
 */
function initBrowser(opts: InitOptions): void {
  // Clear console for fresh start in dev
  if (IS_DEV) {
    console.clear();
  }

  // Show banner
  if (opts.showBanner) {
    theme.banner();
  }

  // Show environment info
  if (opts.showEnvInfo) {
    console.log('');
    theme.envInfo();
    
    if (opts.version) {
      console.log(
        `%c📦 Version: %c${opts.version}`,
        `color: ${COLORS.muted};`,
        `color: ${COLORS.cyan}; font-weight: bold;`
      );
    }
    
    console.log(
      `%c🌐 URL: %c${window.location.href}`,
      `color: ${COLORS.muted};`,
      `color: ${COLORS.cyan};`
    );
    
    console.log('');
  }

  // Start console interceptor
  if (opts.interceptConsole) {
    interceptor.start();
    pretty.debug('Console interceptor enabled');
  }

  // Enable profiler
  if (opts.enableProfiler) {
    profiler.setEnabled(true);
  }

  // Add global helpers for debugging
  if (IS_DEV) {
    addGlobalHelpers();
  }

  pretty.success('Logger initialized', { component: 'Logger' });
}

/**
 * Server initialization
 */
function initServer(opts: InitOptions): void {
  // Show banner
  if (opts.showBanner) {
    theme.banner();
  }

  // Show environment info
  if (opts.showEnvInfo) {
    theme.envInfo();
    
    if (opts.version) {
      pretty.info(`Version: ${opts.version}`);
    }
  }

  // Start console interceptor
  if (opts.interceptConsole) {
    interceptor.start();
  }

  // Enable profiler
  if (opts.enableProfiler) {
    profiler.setEnabled(true);
  }

  pretty.success('Logger initialized', { component: 'Logger' });
}

/**
 * Add global debugging helpers (dev only)
 */
function addGlobalHelpers(): void {
  if (!IS_BROWSER) return;

  // Extend window with debugging utilities
  const helpers = {
    // Logger utilities
    $log: pretty,
    $profiler: profiler,
    $interceptor: interceptor,
    
    // Quick actions
    $clearLogs: () => {
      console.clear();
      interceptor.clearBuffer();
      pretty.success('Logs cleared');
    },
    
    $exportLogs: () => {
      const data = interceptor.exportBuffer();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `foodshare-logs-${new Date().toISOString().slice(0, 19)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      pretty.success('Logs exported');
    },
    
    $profile: () => {
      profiler.printReport();
    },
    
    $timeline: () => {
      profiler.printTimeline();
    },
    
    $help: () => {
      console.log(`
%c🍽️ FoodShare Debug Helpers

%c$log%c          - Pretty logger (info, warn, error, success, api, db)
%c$profiler%c     - Performance profiler
%c$interceptor%c  - Console interceptor
%c$clearLogs()%c  - Clear all logs
%c$exportLogs()%c - Export logs as JSON
%c$profile()%c    - Print performance report
%c$timeline()%c   - Print profile timeline
%c$help()%c       - Show this help
`,
        `color: ${COLORS.primary}; font-weight: bold; font-size: 14px;`,
        `color: ${COLORS.cyan}; font-weight: bold;`, `color: ${COLORS.muted};`,
        `color: ${COLORS.cyan}; font-weight: bold;`, `color: ${COLORS.muted};`,
        `color: ${COLORS.cyan}; font-weight: bold;`, `color: ${COLORS.muted};`,
        `color: ${COLORS.cyan}; font-weight: bold;`, `color: ${COLORS.muted};`,
        `color: ${COLORS.cyan}; font-weight: bold;`, `color: ${COLORS.muted};`,
        `color: ${COLORS.cyan}; font-weight: bold;`, `color: ${COLORS.muted};`,
        `color: ${COLORS.cyan}; font-weight: bold;`, `color: ${COLORS.muted};`,
        `color: ${COLORS.cyan}; font-weight: bold;`, `color: ${COLORS.muted};`
      );
    },
  };

  // Add to window
  Object.assign(window, helpers);

  // Log available helpers
  console.log(
    `%c💡 Debug helpers available. Type %c$help()%c for list.`,
    `color: ${COLORS.muted};`,
    `color: ${COLORS.cyan}; font-weight: bold;`,
    `color: ${COLORS.muted};`
  );
}

/**
 * Check if logger is initialized
 */
export function isLoggerInitialized(): boolean {
  return isInitialized;
}

/**
 * Reset logger (for testing)
 */
export function resetLogger(): void {
  isInitialized = false;
  interceptor.stop();
  profiler.clear();
}

export default initLogger;
