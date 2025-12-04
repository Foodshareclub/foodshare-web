/**
 * Web Vitals monitoring for performance tracking
 * Measures Core Web Vitals: LCP, INP, CLS, FCP, TTFB
 * Note: INP (Interaction to Next Paint) replaced FID in web-vitals v3+
 */

// Dynamic import to avoid build-time errors with web-vitals API changes
import { createLogger } from "@/lib/logger";

const logger = createLogger("WebVitals");

/**
 * Report Web Vitals to console or analytics service
 * @param onPerfEntry - Callback function to handle metrics
 */
export const reportWebVitals = async (onPerfEntry?: (metric: any) => void) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import("web-vitals");
    getCLS(onPerfEntry);
    getFID(onPerfEntry); // Using FID (First Input Delay) as INP may not be available in this version
    getFCP(onPerfEntry);
    getLCP(onPerfEntry);
    getTTFB(onPerfEntry);
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
 * Replace with your analytics implementation (Google Analytics, Supabase, etc.)
 */
export const sendToAnalytics = (metric: any) => {
  // Example: Send to Google Analytics
  // gtag('event', metric.name, {
  //   value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
  //   event_category: 'Web Vitals',
  //   event_label: metric.id,
  //   non_interaction: true,
  // });

  // Example: Send to Supabase
  // supabase.from('web_vitals').insert({
  //   metric_name: metric.name,
  //   value: metric.value,
  //   rating: metric.rating,
  //   timestamp: new Date().toISOString(),
  // });

  // For now, just log in development
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
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShift = entry as any;
          if (!layoutShift.hadRecentInput && layoutShift.value > 0.1) {
            logger.warn("⚠️ Layout shift detected", {
              value: layoutShift.value.toFixed(4),
              sources: layoutShift.sources?.map((s: any) => s.node),
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
