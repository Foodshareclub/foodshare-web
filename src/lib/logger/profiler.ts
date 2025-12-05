/**
 * Performance Profiler
 * Track and visualize performance metrics
 */

import { COLORS, STYLES, ANSI } from './styles';

const IS_BROWSER = typeof window !== 'undefined';

interface ProfileEntry {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memory?: number;
  children: ProfileEntry[];
  parent?: ProfileEntry;
}

interface ProfileReport {
  totalDuration: number;
  entries: Array<{
    name: string;
    duration: number;
    percentage: number;
    calls: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
  }>;
  timeline: ProfileEntry[];
}

class Profiler {
  private entries: Map<string, ProfileEntry[]> = new Map();
  private activeStack: ProfileEntry[] = [];
  private rootEntries: ProfileEntry[] = [];
  private isEnabled = true;

  /**
   * Enable/disable profiler
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Start profiling a section
   */
  start(name: string): void {
    if (!this.isEnabled) return;

    const entry: ProfileEntry = {
      name,
      startTime: performance.now(),
      children: [],
    };

    // Link to parent if exists
    if (this.activeStack.length > 0) {
      const parent = this.activeStack[this.activeStack.length - 1];
      entry.parent = parent;
      parent.children.push(entry);
    } else {
      this.rootEntries.push(entry);
    }

    this.activeStack.push(entry);

    // Store in entries map
    if (!this.entries.has(name)) {
      this.entries.set(name, []);
    }
    this.entries.get(name)!.push(entry);
  }

  /**
   * End profiling a section
   */
  end(name: string): number | null {
    if (!this.isEnabled) return null;

    const entry = this.activeStack.pop();
    if (!entry || entry.name !== name) {
      console.warn(`Profiler: Mismatched end() call for "${name}"`);
      return null;
    }

    entry.endTime = performance.now();
    entry.duration = entry.endTime - entry.startTime;

    // Capture memory if available
    if (IS_BROWSER && 'memory' in performance) {
      const memory = (performance as Performance & { memory: { usedJSHeapSize: number } }).memory;
      entry.memory = memory.usedJSHeapSize;
    }

    return entry.duration;
  }

  /**
   * Profile an async function
   */
  async profileAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.start(name);
    try {
      const result = await fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * Profile a sync function
   */
  profile<T>(name: string, fn: () => T): T {
    this.start(name);
    try {
      const result = fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * Generate profile report
   */
  getReport(): ProfileReport {
    const aggregated = new Map<string, {
      durations: number[];
      calls: number;
    }>();

    // Aggregate entries
    this.entries.forEach((entries, name) => {
      const durations = entries
        .filter(e => e.duration !== undefined)
        .map(e => e.duration!);
      
      aggregated.set(name, {
        durations,
        calls: durations.length,
      });
    });

    // Calculate total duration from root entries
    const totalDuration = this.rootEntries
      .filter(e => e.duration !== undefined)
      .reduce((sum, e) => sum + e.duration!, 0);

    // Build report entries
    const reportEntries = Array.from(aggregated.entries()).map(([name, data]) => {
      const total = data.durations.reduce((a, b) => a + b, 0);
      return {
        name,
        duration: total,
        percentage: totalDuration > 0 ? (total / totalDuration) * 100 : 0,
        calls: data.calls,
        avgDuration: data.calls > 0 ? total / data.calls : 0,
        minDuration: Math.min(...data.durations),
        maxDuration: Math.max(...data.durations),
      };
    }).sort((a, b) => b.duration - a.duration);

    return {
      totalDuration,
      entries: reportEntries,
      timeline: this.rootEntries,
    };
  }

  /**
   * Print profile report to console
   */
  printReport(): void {
    const report = this.getReport();

    if (IS_BROWSER) {
      console.group('%c📊 Performance Profile', `color: ${COLORS.purple}; font-weight: bold; font-size: 14px;`);
      
      console.log(`%cTotal Duration: ${report.totalDuration.toFixed(2)}ms`, `color: ${COLORS.cyan}; font-weight: bold;`);
      console.log('');

      // Print table
      const tableData = report.entries.map(e => ({
        Name: e.name,
        'Total (ms)': e.duration.toFixed(2),
        '%': e.percentage.toFixed(1),
        Calls: e.calls,
        'Avg (ms)': e.avgDuration.toFixed(2),
        'Min (ms)': e.minDuration.toFixed(2),
        'Max (ms)': e.maxDuration.toFixed(2),
      }));
      console.table(tableData);

      // Print flame graph visualization
      console.log('');
      console.log('%c🔥 Flame Graph', `color: ${COLORS.orange}; font-weight: bold;`);
      this.printFlameGraph(report.entries, report.totalDuration);

      console.groupEnd();
    } else {
      console.log(`\n${ANSI.magenta}${ANSI.bold}📊 Performance Profile${ANSI.reset}`);
      console.log(`${ANSI.cyan}Total Duration: ${report.totalDuration.toFixed(2)}ms${ANSI.reset}\n`);

      // Print entries
      report.entries.forEach(e => {
        const bar = '█'.repeat(Math.round(e.percentage / 5));
        const color = e.percentage > 50 ? ANSI.red : e.percentage > 20 ? ANSI.yellow : ANSI.green;
        console.log(
          `${color}${bar.padEnd(20)}${ANSI.reset} ${e.name.padEnd(30)} ${e.duration.toFixed(2).padStart(10)}ms (${e.percentage.toFixed(1)}%) x${e.calls}`
        );
      });
      console.log('');
    }
  }

  /**
   * Print flame graph visualization
   */
  private printFlameGraph(entries: ProfileReport['entries'], total: number): void {
    const barWidth = 50;

    entries.slice(0, 10).forEach(entry => {
      const width = Math.round((entry.duration / total) * barWidth);
      const bar = '█'.repeat(width);
      const color = entry.percentage > 50 ? COLORS.error : entry.percentage > 20 ? COLORS.warn : COLORS.success;

      console.log(
        `%c${bar.padEnd(barWidth)} %c${entry.name} %c${entry.duration.toFixed(1)}ms`,
        `color: ${color};`,
        `color: ${COLORS.dark}; font-weight: 600;`,
        `color: ${COLORS.muted};`
      );
    });
  }

  /**
   * Print timeline tree
   */
  printTimeline(): void {
    if (IS_BROWSER) {
      console.group('%c⏱️ Profile Timeline', `color: ${COLORS.purple}; font-weight: bold;`);
      this.printTimelineNode(this.rootEntries, 0);
      console.groupEnd();
    } else {
      console.log(`\n${ANSI.magenta}${ANSI.bold}⏱️ Profile Timeline${ANSI.reset}`);
      this.printTimelineNode(this.rootEntries, 0);
      console.log('');
    }
  }

  private printTimelineNode(entries: ProfileEntry[], depth: number): void {
    const indent = '  '.repeat(depth);

    entries.forEach((entry, index) => {
      const isLast = index === entries.length - 1;
      const prefix = isLast ? '└─' : '├─';
      const duration = entry.duration?.toFixed(2) || '?';
      const color = (entry.duration || 0) > 100 ? COLORS.error : (entry.duration || 0) > 50 ? COLORS.warn : COLORS.success;

      if (IS_BROWSER) {
        console.log(
          `%c${indent}${prefix} %c${entry.name} %c${duration}ms`,
          `color: ${COLORS.muted};`,
          `color: ${COLORS.purple}; font-weight: 600;`,
          `color: ${color};`
        );
      } else {
        const ansiColor = (entry.duration || 0) > 100 ? ANSI.red : (entry.duration || 0) > 50 ? ANSI.yellow : ANSI.green;
        console.log(`${ANSI.gray}${indent}${prefix}${ANSI.reset} ${ANSI.magenta}${entry.name}${ANSI.reset} ${ansiColor}${duration}ms${ANSI.reset}`);
      }

      if (entry.children.length > 0) {
        this.printTimelineNode(entry.children, depth + 1);
      }
    });
  }

  /**
   * Clear all profile data
   */
  clear(): void {
    this.entries.clear();
    this.activeStack = [];
    this.rootEntries = [];
  }

  /**
   * Export profile data as JSON
   */
  export(): string {
    return JSON.stringify(this.getReport(), null, 2);
  }
}

// Singleton instance
export const profiler = new Profiler();

export default profiler;
