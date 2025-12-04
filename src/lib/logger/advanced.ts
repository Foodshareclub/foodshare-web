/**
 * Advanced Logger with Source Maps and Performance Tracking
 * Production-ready logging with advanced features
 */

import { createLogger } from "./base";
import type { PerformanceMark, SourceMapInfo, PerformanceReport } from "./types";

class AdvancedLogger {
  private performanceMarks: Map<string, PerformanceMark> = new Map();
  private logger = createLogger("AdvancedLogger");

  /**
   * Start performance measurement
   */
  startMeasure(name: string) {
    const mark: PerformanceMark = {
      name,
      startTime: performance.now(),
    };
    this.performanceMarks.set(name, mark);

    if (process.env.NODE_ENV !== "production") {
      this.logger.debug(`Started measuring: ${name}`);
    }
  }

  /**
   * End performance measurement
   */
  endMeasure(name: string): number | null {
    const mark = this.performanceMarks.get(name);
    if (!mark) {
      this.logger.warn(`No performance mark found for: ${name}`);
      return null;
    }

    const duration = performance.now() - mark.startTime;
    mark.duration = duration;

    const emoji = duration < 100 ? "⚡" : duration < 500 ? "🐢" : "🐌";
    const color = duration < 100 ? "#10B981" : duration < 500 ? "#F59E0B" : "#EF4444";

    console.log(
      `%c${emoji} [${new Date().toISOString().split("T")[1].split(".")[0]}] Performance: ${name} took ${Math.round(duration)}ms`,
      `color: ${color}; font-weight: bold;`
    );

    this.performanceMarks.delete(name);
    return duration;
  }

  /**
   * Measure async function execution
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startMeasure(name);
    try {
      const result = await fn();
      this.endMeasure(name);
      return result;
    } catch (error) {
      this.endMeasure(name);
      throw error;
    }
  }

  /**
   * Measure sync function execution
   */
  measure<T>(name: string, fn: () => T): T {
    this.startMeasure(name);
    try {
      const result = fn();
      this.endMeasure(name);
      return result;
    } catch (error) {
      this.endMeasure(name);
      throw error;
    }
  }

  /**
   * Parse error stack trace with source maps
   */
  parseStackTrace(error: Error): SourceMapInfo[] {
    if (!error.stack) return [];

    const stackLines = error.stack.split("\n");
    const parsed: SourceMapInfo[] = [];

    for (const line of stackLines) {
      // Match patterns like: at functionName (file.ts:123:45)
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (match) {
        parsed.push({
          source: match[1],
          file: match[2],
          line: parseInt(match[3], 10),
          column: parseInt(match[4], 10),
        });
      }
    }

    return parsed;
  }

  /**
   * Log with stack trace analysis
   */
  logWithStack(message: string, error: Error, context?: Record<string, unknown>) {
    const stackInfo = this.parseStackTrace(error);

    console.group(`%c❌ ${message}`, "color: #EF4444; font-weight: bold;");
    console.error("Error:", error.message);

    if (stackInfo.length > 0) {
      console.group("📍 Stack Trace");
      stackInfo.forEach((info, index) => {
        console.log(`%c${index + 1}. ${info.source}`, "color: #8B5CF6; font-weight: bold;");
        console.log(`   File: ${info.file}:${info.line}:${info.column}`);
      });
      console.groupEnd();
    }

    if (context) {
      console.log("%cContext:", "color: #06B6D4; font-weight: bold;", context);
    }

    console.groupEnd();
  }

  /**
   * Log memory usage
   */
  logMemoryUsage(): { used: number; total: number; limit: number; percentage: number } | null {
    if ("memory" in performance) {
      const memory = (performance as Performance & { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      const used = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      const total = Math.round(memory.totalJSHeapSize / 1024 / 1024);
      const limit = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
      const percentage = Math.round((used / limit) * 100);

      const emoji = percentage < 50 ? "✅" : percentage < 80 ? "⚠️" : "❌";
      const color = percentage < 50 ? "#10B981" : percentage < 80 ? "#F59E0B" : "#EF4444";

      console.log(
        `%c${emoji} Memory: ${used}MB / ${limit}MB (${percentage}%)`,
        `color: ${color}; font-weight: bold;`
      );

      return { used, total, limit, percentage };
    }
    return null;
  }

  /**
   * Log network request with timing
   */
  logNetworkRequest(method: string, url: string, status: number, duration: number, size?: number) {
    const emoji = status >= 200 && status < 300 ? "✅" : status >= 400 ? "❌" : "⚠️";
    const color = status >= 200 && status < 300 ? "#10B981" : status >= 400 ? "#EF4444" : "#F59E0B";

    const sizeStr = size ? ` (${this.formatBytes(size)})` : "";

    console.log(
      `%c${emoji} [${new Date().toISOString().split("T")[1].split(".")[0]}] ${method} ${url} → ${status} (${duration}ms)${sizeStr}`,
      `color: ${color}; font-weight: bold;`
    );
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }

  /**
   * Create performance report
   */
  createPerformanceReport(): PerformanceReport {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const paint = performance.getEntriesByType("paint");
    const resources = performance.getEntriesByType("resource");

    const report: PerformanceReport = {
      navigation: navigation
        ? {
            domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart),
            loadComplete: Math.round(navigation.loadEventEnd - navigation.fetchStart),
            domInteractive: Math.round(navigation.domInteractive - navigation.fetchStart),
            dns: Math.round(navigation.domainLookupEnd - navigation.domainLookupStart),
            tcp: Math.round(navigation.connectEnd - navigation.connectStart),
            request: Math.round(navigation.responseStart - navigation.requestStart),
            response: Math.round(navigation.responseEnd - navigation.responseStart),
          }
        : null,
      paint: paint.map((p) => ({
        name: p.name,
        startTime: Math.round(p.startTime),
      })),
      resources: {
        total: resources.length,
        scripts: resources.filter((r) => r.name.includes(".js")).length,
        styles: resources.filter((r) => r.name.includes(".css")).length,
        images: resources.filter((r) => /\.(jpg|jpeg|png|gif|webp|svg)/.test(r.name)).length,
        totalSize: resources.reduce((sum, r) => sum + ((r as PerformanceResourceTiming).transferSize || 0), 0),
      },
      memory: this.logMemoryUsage(),
    };

    console.group("%c📊 Performance Report", "color: #8B5CF6; font-weight: bold; font-size: 16px");
    console.table(report.navigation);
    console.table(report.paint);
    console.log("%cResources:", "color: #06B6D4; font-weight: bold;", report.resources);
    console.groupEnd();

    return report;
  }

  /**
   * Monitor long tasks
   */
  monitorLongTasks(threshold: number = 50) {
    if (typeof window !== "undefined" && "PerformanceObserver" in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > threshold) {
              console.warn(
                `%c🐌 Long task detected: ${Math.round(entry.duration)}ms`,
                "color: #F59E0B; font-weight: bold;",
                { name: entry.name, startTime: Math.round(entry.startTime) }
              );
            }
          }
        });

        observer.observe({ entryTypes: ["longtask"] });
        this.logger.success("Long task monitoring enabled");
      } catch {
        this.logger.warn("Long task API not supported");
      }
    }
  }

  /**
   * Track user interactions
   */
  trackInteraction(action: string, target: string, metadata?: Record<string, unknown>) {
    const timestamp = new Date().toISOString();

    console.log(
      `%c👆 [${timestamp.split("T")[1].split(".")[0]}] User: ${action} → ${target}`,
      "color: #8B5CF6; font-weight: bold;",
      metadata || ""
    );

    // Store for analytics
    if (process.env.NODE_ENV === "production" && typeof window !== "undefined") {
      try {
        const interactions = JSON.parse(localStorage.getItem("user_interactions") || "[]");
        interactions.push({ action, target, metadata, timestamp });

        // Keep only last 50 interactions
        if (interactions.length > 50) {
          interactions.shift();
        }

        localStorage.setItem("user_interactions", JSON.stringify(interactions));
      } catch {
        // Silently fail
      }
    }
  }

  /**
   * Create error fingerprint for deduplication
   */
  createErrorFingerprint(error: Error): string {
    const stack = error.stack || "";
    const message = error.message || "";
    const name = error.name || "";

    // Create a simple hash
    const str = `${name}:${message}:${stack.split("\n")[0]}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `err_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Batch log multiple messages
   */
  batch(messages: Array<{ level: "info" | "warn" | "error"; message: string; data?: unknown }>) {
    console.group("%c📦 Batch Logs", "color: #06B6D4; font-weight: bold;");
    messages.forEach(({ level, message, data }) => {
      const emoji = level === "info" ? "ℹ️" : level === "warn" ? "⚠️" : "❌";
      const color = level === "info" ? "#3B82F6" : level === "warn" ? "#F59E0B" : "#EF4444";
      console.log(`%c${emoji} ${message}`, `color: ${color}; font-weight: bold;`, data || "");
    });
    console.groupEnd();
  }
}

// Create singleton instance
export const advancedLogger = new AdvancedLogger();

// Export class for testing
export { AdvancedLogger };

export default advancedLogger;
