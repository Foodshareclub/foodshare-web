/**
 * Web Vitals monitoring for performance tracking
 * Measures Core Web Vitals: LCP, INP, CLS, FCP, TTFB
 * Note: INP (Interaction to Next Paint) replaced FID in web-vitals v3+
 */

// Dynamic import to avoid build-time errors with web-vitals API changes
import { createLogger } from "@/lib/logger";
import type { Metric } from "web-vitals";

const logger = createLogger("WebVitals");

/**
 * Report Web Vitals to console or analytics service
 * @param onPerfEntry - Callback function to handle metrics
 */
export const reportWebVitals = async (onPerfEntry?: (metric: Metric) => void) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    const { onCLS, onINP, onFCP, onLCP, onTTFB } = await import("web-vitals");
    onCLS(onPerfEntry);
    onINP(onPerfEntry);
    onFCP(onPerfEntry);
    onLCP(onPerfEntry);
    onTTFB(onPerfEntry);
  }
};

/**
 * Log Web Vitals to console (development only)
 */
export const logWebVitals = () => {
  if (process.env.NODE_ENV !== 'production') {
    reportWebVitals((metric) => {
      const { name, value, rating } = metric;
      const emoji = rating === "good" ? "✅" : rating === "needs-improvement" ? "⚠️" : "❌";
      logger.debug(`${emoji} ${name}: ${Math.round(value)}ms (${rating})`);
    });
  }
};

/**
 * Send Web Vitals to analytics service
 * Sends metrics to Google Analytics 4 if configured
 */
export const sendToAnalytics = (metric: Metric) => {
  // Send to Google Analytics 4
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_category: 'Web Vitals',
      event_label: metric.id,
      metric_rating: metric.rating,
      non_interaction: true,
    });
  }

  // Also log in development
  if (process.env.NODE_ENV !== 'production') {
    logger.debug("Web Vital", metric);
  }
};

/**
 * Monitor long tasks (>50ms) that block the main thread
 */
export const monitorLongTasks = () => {
  if (process.env.NODE_ENV !== 'production' && "PerformanceObserver" in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            logger.warn("⚠️ Long task detected", {
              duration: `${Math.round(entry.duration)}ms`,
              startTime: `${Math.round(entry.startTime)}ms`,
              name: entry.name,
            });
          }
        }
      });

      observer.observe({ entryTypes: ["longtask"] });
    } catch (e) {
      // Long task API not supported
    }
  }
};

/**
 * Monitor layout shifts (CLS contributors)
 */
export const monitorLayoutShifts = () => {
  if (process.env.NODE_ENV !== 'production' && "PerformanceObserver" in window) {
    try {
      interface LayoutShiftEntry extends PerformanceEntry {
        hadRecentInput: boolean;
        value: number;
        sources?: Array<{ node: Node | null }>;
      }

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShift = entry as LayoutShiftEntry;
          if (!layoutShift.hadRecentInput && layoutShift.value > 0.1) {
            logger.warn("⚠️ Layout shift detected", {
              value: layoutShift.value.toFixed(4),
              sources: layoutShift.sources?.map((s) => s.node),
            });
          }
        }
      });

      observer.observe({ entryTypes: ["layout-shift"] });
    } catch (e) {
      // Layout shift API not supported
    }
  }
};

/**
 * Initialize all performance monitoring
 * Call this in your main entry point (index.tsx)
 */
export const initPerformanceMonitoring = () => {
  logWebVitals();
  monitorLongTasks();
  monitorLayoutShifts();
};
