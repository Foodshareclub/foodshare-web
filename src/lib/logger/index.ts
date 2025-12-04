/**
 * Logger Module
 * Centralized logging system with base and advanced features
 */

// Types
export type { LogLevel, LogContext, ErrorLog, PerformanceMark, SourceMapInfo, PerformanceReport } from "./types";

// Base Logger
export { Logger, logger, createLogger, getErrorHistory, exportErrorHistory, clearErrorHistory } from "./base";

// Advanced Logger
export { AdvancedLogger, advancedLogger } from "./advanced";

// Re-export logger as default for convenience
export { logger as default } from "./base";
