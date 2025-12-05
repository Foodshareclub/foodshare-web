/**
 * Logger Module
 * Centralized logging system with beautiful, structured output
 * 
 * @example
 * // Basic usage
 * import { pretty } from '@/lib/logger';
 * pretty.info('User logged in', { userId: '123' });
 * pretty.api('GET', '/api/products', 200, 45);
 * pretty.db('SELECT', 'posts', 12, 50);
 * 
 * @example
 * // In components
 * import { useLogger } from '@/hooks/useLogger';
 * const log = useLogger('ProductCard');
 * log.info('Product loaded', product);
 * 
 * @example
 * // Wrap fetch calls
 * import { loggedFetch } from '@/lib/logger';
 * const res = await loggedFetch('/api/products');
 * 
 * @example
 * // Network request logging with waterfall
 * import { network } from '@/lib/logger';
 * network.log('GET', '/api/products', 200, 45, { size: 1024 });
 * network.waterfall(); // View timing diagram
 */

// Types
export type { LogLevel, LogContext, ErrorLog, PerformanceMark, SourceMapInfo, PerformanceReport } from "./types";

// Base Logger (legacy)
export { Logger, logger, createLogger, getErrorHistory, exportErrorHistory, clearErrorHistory } from "./base";

// Advanced Logger (legacy)
export { AdvancedLogger, advancedLogger } from "./advanced";

// Pretty Logger (recommended for basic logging)
export { pretty } from "./pretty";

// Enhanced Logger (for complex flows, state changes, request/response)
export { enhanced } from "./enhanced";

// Fetch utilities
export { loggedFetch, createLoggedFetch, loggedQuery } from "./fetch";

// Styles (for custom formatting)
export { COLORS, EMOJI, STYLES, ANSI, getTimingStyle, getStatusStyle } from "./styles";

// Console Theme (ASCII art, progress bars, themed output)
export { 
  theme,
  printBanner,
  printSection,
  printEnvInfo,
  printKeyValue,
  printSuccessBox,
  printErrorBox,
  printWarningBox,
  printProgress,
  printTimelineEvent,
} from "./console-theme";

// Network Logger (request/response logging with waterfall visualization)
export { network } from "./network";
export type { NetworkEntry } from "./network";

// Table Logger (beautiful table formatting)
export { table } from "./table";
export type { TableColumn } from "./table";

// Debug Utilities (trace, assert, measure, inspect)
export { 
  debug,
  trace,
  assert,
  measure,
  checkpoint,
  inspect,
  devLog,
  deprecated,
  todo,
  createDebugger,
} from "./debug";

// Console Interceptor (global console beautification with buffer)
export { interceptor } from "./interceptor";

// Performance Profiler (track and visualize performance)
export { profiler } from "./profiler";

// Logger Initialization (setup on app start)
export { initLogger, isLoggerInitialized, resetLogger } from "./init";

// Re-export pretty as default
export { pretty as default } from "./pretty";
