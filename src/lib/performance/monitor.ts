/**
 * Performance monitoring utilities.
 *
 * Canonical implementations live here — import from `@/lib/performance`
 * directly in new code.
 */
export interface PerformanceMetrics {
  renderTime: number;
  memoryUsageMB: number;
  cpuUsageMS: number;
}

let metrics: PerformanceMetrics[] = [];

export function usePerformanceMonitor() {
  const track = (renderTime: number) => {
    const memoryUsage =
      typeof performance !== "undefined"
        ? (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize /
            1024 /
            1024 || 0
        : 0;
    const cpuUsage =
      typeof process !== "undefined"
        ? (process as unknown as { usage: { userTime: number } }).usage.userTime / 1000 || 0
        : 0;

    metrics.push({
      renderTime,
      memoryUsageMB: memoryUsage,
      cpuUsageMS: cpuUsage,
    });

    // Keep only last 100 entries
    if (metrics.length > 100) {
      metrics = metrics.slice(-100);
    }
  };

  const getAverageRenderTime = (): number => {
    if (metrics.length === 0) return 0;
    const avg = metrics.reduce((sum, m) => sum + m.renderTime, 0) / metrics.length;
    return avg;
  };

  return { track, getAverageRenderTime, metrics };
}
