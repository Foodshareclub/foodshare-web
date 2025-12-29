/**
 * Logger Types
 * Shared type definitions for the logging system
 */

export type LogLevel = "debug" | "info" | "warn" | "error" | "success";

export interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: unknown;
}

export interface ErrorLog {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  stack?: string;
  userAgent?: string;
  url?: string;
}

export interface PerformanceMark {
  name: string;
  startTime: number;
  duration?: number;
}

export interface SourceMapInfo {
  file: string;
  line: number;
  column: number;
  source: string;
}

export interface PerformanceReport {
  navigation: {
    domContentLoaded: number;
    loadComplete: number;
    domInteractive: number;
    dns: number;
    tcp: number;
    request: number;
    response: number;
  } | null;
  paint: Array<{ name: string; startTime: number }>;
  resources: {
    total: number;
    scripts: number;
    styles: number;
    images: number;
    totalSize: number;
  };
  memory: {
    used: number;
    total: number;
    limit: number;
    percentage: number;
  } | null;
}
