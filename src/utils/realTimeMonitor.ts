/**
 * Real-Time Monitoring System
 * Live performance and error monitoring with alerts
 */

import { createLogger } from "@/lib/logger";
import { productionErrorReporter } from "./productionErrorReporter";
import { getPerformanceMemory } from "@/types/web-apis.types";

const logger = createLogger("RealTimeMonitor");

interface MetricThreshold {
  warning: number;
  critical: number;
}

interface MonitoringConfig {
  fps: MetricThreshold;
  memory: MetricThreshold;
  errorRate: MetricThreshold;
  responseTime: MetricThreshold;
}

interface PerformanceMetrics {
  fps: number;
  memory: number;
  errorRate: number;
  avgResponseTime: number;
  timestamp: number;
}

class RealTimeMonitor {
  private config: MonitoringConfig = {
    fps: { warning: 30, critical: 20 },
    memory: { warning: 70, critical: 85 },
    errorRate: { warning: 5, critical: 10 },
    responseTime: { warning: 500, critical: 1000 },
  };

  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 100;
  private monitoringInterval?: number;
  private fpsFrames: number[] = [];
  private lastFrameTime = performance.now();
  private errorCount = 0;
  private requestTimes: number[] = [];
  private isMonitoring = false;

  /**
   * Start real-time monitoring
   */
  start() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    logger.success("Real-time monitoring started");

    // Monitor FPS
    this.startFPSMonitoring();

    // Monitor metrics every 5 seconds
    this.monitoringInterval = window.setInterval(() => {
      this.collectMetrics();
    }, 5000);

    // Monitor network requests
    this.monitorNetworkRequests();

    // Monitor errors
    this.monitorErrors();
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    logger.info("Real-time monitoring stopped");
  }

  /**
   * Start FPS monitoring
   */
  private startFPSMonitoring() {
    const measureFPS = () => {
      if (!this.isMonitoring) return;

      const now = performance.now();
      const delta = now - this.lastFrameTime;
      const fps = 1000 / delta;

      this.fpsFrames.push(fps);
      if (this.fpsFrames.length > 60) {
        this.fpsFrames.shift();
      }

      this.lastFrameTime = now;
      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }

  /**
   * Monitor network requests
   */
  private monitorNetworkRequests() {
    if (!("PerformanceObserver" in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "resource") {
            const resource = entry as PerformanceResourceTiming;
            this.requestTimes.push(resource.duration);

            // Keep only last 50 requests
            if (this.requestTimes.length > 50) {
              this.requestTimes.shift();
            }

            // Alert on slow requests
            if (resource.duration > this.config.responseTime.critical) {
              logger.warn(
                `Slow request detected: ${resource.name} (${Math.round(resource.duration)}ms)`
              );
            }
          }
        }
      });

      observer.observe({ entryTypes: ["resource"] });
    } catch (error) {
      logger.warn("Network monitoring not supported");
    }
  }

  /**
   * Monitor errors
   */
  private monitorErrors() {
    window.addEventListener("error", () => {
      this.errorCount++;
    });

    window.addEventListener("unhandledrejection", () => {
      this.errorCount++;
    });
  }

  /**
   * Collect current metrics
   */
  private collectMetrics() {
    const fps = this.calculateAverageFPS();
    const memory = this.getMemoryUsage();
    const errorRate = this.calculateErrorRate();
    const avgResponseTime = this.calculateAvgResponseTime();

    const metrics: PerformanceMetrics = {
      fps,
      memory,
      errorRate,
      avgResponseTime,
      timestamp: Date.now(),
    };

    this.metrics.push(metrics);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Check thresholds and alert
    this.checkThresholds(metrics);

    // Log metrics in dev
    if (process.env.NODE_ENV !== 'production') {
      this.logMetrics(metrics);
    }
  }

  /**
   * Calculate average FPS
   */
  private calculateAverageFPS(): number {
    if (this.fpsFrames.length === 0) return 60;
    const sum = this.fpsFrames.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.fpsFrames.length);
  }

  /**
   * Get memory usage percentage
   */
  private getMemoryUsage(): number {
    const memory = getPerformanceMemory();
    if (memory) {
      return Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);
    }
    return 0;
  }

  /**
   * Calculate error rate (errors per minute)
   */
  private calculateErrorRate(): number {
    // Reset counter every minute
    const rate = this.errorCount;
    this.errorCount = 0;
    return rate;
  }

  /**
   * Calculate average response time
   */
  private calculateAvgResponseTime(): number {
    if (this.requestTimes.length === 0) return 0;
    const sum = this.requestTimes.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.requestTimes.length);
  }

  /**
   * Check thresholds and alert
   */
  private checkThresholds(metrics: PerformanceMetrics) {
    const alerts: string[] = [];

    // Check FPS
    if (metrics.fps < this.config.fps.critical) {
      alerts.push(`Critical: FPS dropped to ${metrics.fps}`);
    } else if (metrics.fps < this.config.fps.warning) {
      alerts.push(`Warning: FPS at ${metrics.fps}`);
    }

    // Check memory
    if (metrics.memory > this.config.memory.critical) {
      alerts.push(`Critical: Memory usage at ${metrics.memory}%`);
    } else if (metrics.memory > this.config.memory.warning) {
      alerts.push(`Warning: Memory usage at ${metrics.memory}%`);
    }

    // Check error rate
    if (metrics.errorRate > this.config.errorRate.critical) {
      alerts.push(`Critical: ${metrics.errorRate} errors/min`);
    } else if (metrics.errorRate > this.config.errorRate.warning) {
      alerts.push(`Warning: ${metrics.errorRate} errors/min`);
    }

    // Check response time
    if (metrics.avgResponseTime > this.config.responseTime.critical) {
      alerts.push(`Critical: Avg response time ${metrics.avgResponseTime}ms`);
    } else if (metrics.avgResponseTime > this.config.responseTime.warning) {
      alerts.push(`Warning: Avg response time ${metrics.avgResponseTime}ms`);
    }

    // Log alerts
    if (alerts.length > 0) {
      alerts.forEach((alert) => {
        logger.warn(alert);

        // Report to production error reporter
        if (process.env.NODE_ENV === 'production' && alert.startsWith("Critical")) {
          productionErrorReporter.reportError(new Error(alert), "error", { metrics });
        }
      });
    }
  }

  /**
   * Log metrics
   */
  private logMetrics(metrics: PerformanceMetrics) {
    const fpsEmoji = metrics.fps >= 50 ? "✅" : metrics.fps >= 30 ? "⚠️" : "❌";
    const memEmoji = metrics.memory < 50 ? "✅" : metrics.memory < 80 ? "⚠️" : "❌";
    const errEmoji = metrics.errorRate === 0 ? "✅" : metrics.errorRate < 5 ? "⚠️" : "❌";
    const resEmoji =
      metrics.avgResponseTime < 200 ? "✅" : metrics.avgResponseTime < 500 ? "⚠️" : "❌";

    console.log(
      `%c📊 Metrics: ${fpsEmoji} FPS:${metrics.fps} | ${memEmoji} Mem:${metrics.memory}% | ${errEmoji} Err:${metrics.errorRate}/min | ${resEmoji} Res:${metrics.avgResponseTime}ms`,
      "color: #8B5CF6; font-weight: bold;"
    );
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics[this.metrics.length - 1] || null;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary() {
    if (this.metrics.length === 0) return null;

    const avgFPS = Math.round(
      this.metrics.reduce((sum, m) => sum + m.fps, 0) / this.metrics.length
    );
    const avgMemory = Math.round(
      this.metrics.reduce((sum, m) => sum + m.memory, 0) / this.metrics.length
    );
    const totalErrors = this.metrics.reduce((sum, m) => sum + m.errorRate, 0);
    const avgResponseTime = Math.round(
      this.metrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / this.metrics.length
    );

    return {
      avgFPS,
      avgMemory,
      totalErrors,
      avgResponseTime,
      samples: this.metrics.length,
      duration: this.metrics.length * 5, // seconds
    };
  }

  /**
   * Export metrics as CSV
   */
  exportMetricsCSV(): string {
    const headers = ["Timestamp", "FPS", "Memory %", "Errors/min", "Avg Response Time (ms)"];
    const rows = this.metrics.map((m) => [
      new Date(m.timestamp).toISOString(),
      m.fps,
      m.memory,
      m.errorRate,
      m.avgResponseTime,
    ]);

    return [headers, ...rows].map((row) => row.join(",")).join("\n");
  }

  /**
   * Create visual chart (ASCII)
   */
  createASCIIChart(metric: keyof Omit<PerformanceMetrics, "timestamp">): string {
    const data = this.metrics.map((m) => m[metric]);
    if (data.length === 0) return "No data";

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const height = 10;

    const chart: string[] = [];
    for (let i = height; i >= 0; i--) {
      const threshold = min + (range * i) / height;
      const line = data.map((value) => (value >= threshold ? "█" : " ")).join("");
      chart.push(`${Math.round(threshold).toString().padStart(4)} │${line}`);
    }

    chart.push(`     └${"─".repeat(data.length)}`);
    return chart.join("\n");
  }
}

// Create singleton instance
export const realTimeMonitor = new RealTimeMonitor();

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  realTimeMonitor.start();
}

// Expose to window for debugging
if (typeof window !== "undefined") {
  (window as any).__monitor = realTimeMonitor;
}

export default realTimeMonitor;
