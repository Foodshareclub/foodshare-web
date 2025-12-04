/**
 * Performance Monitoring Utility
 *
 * Tracks and logs performance metrics in development
 * Helps identify optimization opportunities
 */

import { apiCache } from "@/lib/api-cache";
import { createLogger } from "@/lib/logger";

const logger = createLogger("PerformanceMonitor");

interface PerformanceMetrics {
  cacheStats: ReturnType<typeof apiCache.getStats>;
  memoryUsage?: any; // MemoryInfo type not available in all environments
  timing: PerformanceTiming;
  navigation: PerformanceNavigationTiming | null;
  resources: PerformanceResourceTiming[];
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics | null = null;
  private intervalId: number | null = null;

  /**
   * Start monitoring (dev only)
   */
  start(intervalMs: number = 30000) {
    if (process.env.NODE_ENV !== 'production') return;

    logger.debug("📊 Performance monitoring started");

    // Initial metrics
    this.logMetrics();

    // Periodic logging
    this.intervalId = window.setInterval(() => {
      this.logMetrics();
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.debug("📊 Performance monitoring stopped");
    }
  }

  /**
   * Collect current metrics
   */
  collectMetrics(): PerformanceMetrics {
    const timing = performance.timing;
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];

    return {
      cacheStats: apiCache.getStats(),
      memoryUsage: (performance as any).memory,
      timing,
      navigation,
      resources,
    };
  }

  /**
   * Log metrics to console
   */
  logMetrics() {
    this.metrics = this.collectMetrics();

    // Cache stats
    logger.debug("🗄️ Cache", this.metrics.cacheStats);

    // Memory usage (Chrome only)
    if (this.metrics.memoryUsage) {
      logger.debug("💾 Memory", {
        used: `${(this.metrics.memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        total: `${(this.metrics.memoryUsage.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        limit: `${(this.metrics.memoryUsage.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`,
      });
    }

    // Page load timing
    if (this.metrics.navigation) {
      logger.debug("⏱️ Timing", {
        domContentLoaded: `${this.metrics.navigation.domContentLoadedEventEnd.toFixed(0)}ms`,
        loadComplete: `${this.metrics.navigation.loadEventEnd.toFixed(0)}ms`,
        domInteractive: `${this.metrics.navigation.domInteractive.toFixed(0)}ms`,
      });
    }

    // Resource counts
    const resourcesByType = this.groupResourcesByType(this.metrics.resources);
    logger.debug("📦 Resources", resourcesByType);
  }

  /**
   * Group resources by type
   */
  private groupResourcesByType(resources: PerformanceResourceTiming[]) {
    const groups: Record<string, number> = {};

    resources.forEach((resource) => {
      const type = this.getResourceType(resource.name);
      groups[type] = (groups[type] || 0) + 1;
    });

    return groups;
  }

  /**
   * Determine resource type from URL
   */
  private getResourceType(url: string): string {
    if (url.includes(".js")) return "JavaScript";
    if (url.includes(".css")) return "CSS";
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)/)) return "Images";
    if (url.match(/\.(woff|woff2|ttf|eot)/)) return "Fonts";
    if (url.includes("/api/") || url.includes("supabase")) return "API";
    return "Other";
  }

  /**
   * Get Web Vitals
   */
  getWebVitals() {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;

    if (!navigation) return null;

    return {
      // First Contentful Paint
      FCP: performance.getEntriesByName("first-contentful-paint")[0]?.startTime || 0,

      // Largest Contentful Paint
      LCP: this.getLCP(),

      // First Input Delay (requires user interaction)
      FID: this.getFID(),

      // Cumulative Layout Shift
      CLS: this.getCLS(),

      // Time to Interactive
      TTI: navigation.domInteractive,

      // Total Blocking Time
      TBT: this.getTBT(),
    };
  }

  /**
   * Get Largest Contentful Paint
   */
  private getLCP(): number {
    const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
    return lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : 0;
  }

  /**
   * Get First Input Delay
   */
  private getFID(): number {
    const fidEntries = performance.getEntriesByType("first-input");
    return fidEntries.length > 0
      ? (fidEntries[0] as any).processingStart - fidEntries[0].startTime
      : 0;
  }

  /**
   * Get Cumulative Layout Shift
   */
  private getCLS(): number {
    let cls = 0;
    const clsEntries = performance.getEntriesByType("layout-shift");

    clsEntries.forEach((entry: any) => {
      if (!entry.hadRecentInput) {
        cls += entry.value;
      }
    });

    return cls;
  }

  /**
   * Get Total Blocking Time
   */
  private getTBT(): number {
    let tbt = 0;
    const longTasks = performance.getEntriesByType("longtask");

    longTasks.forEach((task: any) => {
      if (task.duration > 50) {
        tbt += task.duration - 50;
      }
    });

    return tbt;
  }

  /**
   * Log Web Vitals
   */
  logWebVitals() {
    const vitals = this.getWebVitals();

    if (!vitals) {
      logger.warn("Web Vitals not available yet");
      return;
    }

    logger.debug("🎯 Web Vitals", {
      FCP: `${vitals.FCP.toFixed(0)}ms ${this.getVitalRating(vitals.FCP, 1800, 3000)}`,
      LCP: `${vitals.LCP.toFixed(0)}ms ${this.getVitalRating(vitals.LCP, 2500, 4000)}`,
      FID: `${vitals.FID.toFixed(0)}ms ${this.getVitalRating(vitals.FID, 100, 300)}`,
      CLS: `${vitals.CLS.toFixed(3)} ${this.getVitalRating(vitals.CLS, 0.1, 0.25)}`,
      TTI: `${vitals.TTI.toFixed(0)}ms`,
      TBT: `${vitals.TBT.toFixed(0)}ms`,
    });
  }

  /**
   * Get rating for Web Vital
   */
  private getVitalRating(value: number, good: number, needsImprovement: number): string {
    if (value <= good) return "✅ Good";
    if (value <= needsImprovement) return "⚠️ Needs Improvement";
    return "❌ Poor";
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify(this.collectMetrics(), null, 2);
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-start in development
if (process.env.NODE_ENV !== 'production') {
  // Start monitoring after page load
  window.addEventListener("load", () => {
    setTimeout(() => {
      performanceMonitor.start(30000); // Log every 30 seconds
      performanceMonitor.logWebVitals();
    }, 2000); // Wait 2s for initial metrics
  });

  // Expose to window for manual access
  (window as any).performanceMonitor = performanceMonitor;
  (window as any).logPerformance = () => performanceMonitor.logMetrics();
  (window as any).logWebVitals = () => performanceMonitor.logWebVitals();
}
