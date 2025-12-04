/**
 * Performance Monitoring Utilities
 * Track and report performance metrics for Email CRM
 */

import { createLogger } from "@/lib/logger";

const logger = createLogger("PerformanceMonitor");

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
  }

  /**
   * Initialize performance observers
   */
  private initializeObservers(): void {
    if (typeof window === "undefined" || !window.PerformanceObserver) {
      return;
    }

    try {
      // Observe long tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric({
            name: "long-task",
            value: entry.duration,
            timestamp: entry.startTime,
            metadata: {
              entryType: entry.entryType,
            },
          });
        }
      });
      longTaskObserver.observe({ entryTypes: ["longtask"] });
      this.observers.push(longTaskObserver);
    } catch (e) {
      logger.debug("Long task observation not supported");
    }

    try {
      // Observe resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resourceEntry = entry as PerformanceResourceTiming;
          if (
            resourceEntry.initiatorType === "fetch" ||
            resourceEntry.initiatorType === "xmlhttprequest"
          ) {
            this.recordMetric({
              name: "api-call",
              value: resourceEntry.duration,
              timestamp: resourceEntry.startTime,
              metadata: {
                url: resourceEntry.name,
                initiatorType: resourceEntry.initiatorType,
              },
            });
          }
        }
      });
      resourceObserver.observe({ entryTypes: ["resource"] });
      this.observers.push(resourceObserver);
    } catch (e) {
      logger.debug("Resource timing observation not supported");
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only last 100 metrics to prevent memory issues
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }

    // Log in development
    if (process.env.NODE_ENV === "development") {
      logger.debug(`Performance: ${metric.name}`, {
        duration: `${metric.value.toFixed(2)}ms`,
        ...metric.metadata
      });
    }
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter((m) => m.name === name);
  }

  /**
   * Get average metric value by name
   */
  getAverageMetric(name: string): number {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return 0;

    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Disconnect all observers
   */
  disconnect(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Measure function execution time
 */
export function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>,
  metadata?: Record<string, unknown>
): T | Promise<T> {
  const startTime = performance.now();

  const result = fn();

  if (result instanceof Promise) {
    return result.finally(() => {
      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric({
        name,
        value: duration,
        timestamp: startTime,
        metadata,
      });
    }) as T;
  } else {
    const duration = performance.now() - startTime;
    performanceMonitor.recordMetric({
      name,
      value: duration,
      timestamp: startTime,
      metadata,
    });
    return result;
  }
}

/**
 * React hook for measuring component render time
 */
export function useMeasureRender(componentName: string): void {
  if (typeof window === "undefined") return;

  const startTime = performance.now();

  React.useEffect(() => {
    const duration = performance.now() - startTime;
    performanceMonitor.recordMetric({
      name: "component-render",
      value: duration,
      timestamp: startTime,
      metadata: {
        component: componentName,
      },
    });
  });
}

// Re-export React for the hook
import React from "react";

/**
 * Get Web Vitals metrics
 * Uses web-vitals v5 API (onCLS, onINP, onFCP, onLCP, onTTFB)
 */
export async function getWebVitals(): Promise<Record<string, number>> {
  if (typeof window === "undefined") return {};

  try {
    const { onCLS, onINP, onFCP, onLCP, onTTFB } = await import("web-vitals");

    const vitals: Record<string, number> = {};

    onCLS((metric) => {
      vitals.CLS = metric.value;
      performanceMonitor.recordMetric({
        name: "web-vital-cls",
        value: metric.value,
        timestamp: Date.now(),
      });
    });

    onINP((metric) => {
      vitals.INP = metric.value;
      performanceMonitor.recordMetric({
        name: "web-vital-inp",
        value: metric.value,
        timestamp: Date.now(),
      });
    });

    onFCP((metric) => {
      vitals.FCP = metric.value;
      performanceMonitor.recordMetric({
        name: "web-vital-fcp",
        value: metric.value,
        timestamp: Date.now(),
      });
    });

    onLCP((metric) => {
      vitals.LCP = metric.value;
      performanceMonitor.recordMetric({
        name: "web-vital-lcp",
        value: metric.value,
        timestamp: Date.now(),
      });
    });

    onTTFB((metric) => {
      vitals.TTFB = metric.value;
      performanceMonitor.recordMetric({
        name: "web-vital-ttfb",
        value: metric.value,
        timestamp: Date.now(),
      });
    });

    return vitals;
  } catch (e) {
    logger.debug("Web Vitals not available");
    return {};
  }
}

/**
 * Report performance metrics to analytics
 */
export function reportPerformanceMetrics(): void {
  const metrics = performanceMonitor.getMetrics();

  // Group by metric name
  const grouped = metrics.reduce(
    (acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric.value);
      return acc;
    },
    {} as Record<string, number[]>
  );

  // Calculate averages
  const averages = Object.entries(grouped).reduce(
    (acc, [name, values]) => {
      const sum = values.reduce((a, b) => a + b, 0);
      acc[name] = {
        average: sum / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length,
      };
      return acc;
    },
    {} as Record<string, { average: number; min: number; max: number; count: number }>
  );

  if (process.env.NODE_ENV === "development") {
    logger.debug("Performance metrics summary", averages);
  }

  // TODO: Send to analytics service in production
  // sendToAnalytics('performance-metrics', averages);
}
