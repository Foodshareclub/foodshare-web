/**
 * Cache Invalidation
 *
 * Smart cache invalidation strategies:
 * - Tag-based invalidation
 * - Pattern-based invalidation
 * - Realtime-triggered invalidation
 * - TTL-based expiry
 *
 * @module lib/cache/invalidation
 */

import { getCache } from "./multi-layer";
import { subscribeToChanges, type SubscriptionHandle } from "@/lib/realtime";

// =============================================================================
// Types
// =============================================================================

export interface InvalidationRule {
  /** Rule ID */
  id: string;
  /** Table to watch */
  table: string;
  /** Event types to watch */
  events: ("INSERT" | "UPDATE" | "DELETE")[];
  /** Filter for specific rows */
  filter?: string;
  /** Tags to invalidate */
  tags?: string[];
  /** Key patterns to invalidate */
  patterns?: RegExp[];
  /** Custom invalidation function */
  invalidate?: (payload: unknown) => Promise<void>;
}

export interface InvalidationManagerConfig {
  /** Enable realtime invalidation (default: true) */
  enableRealtime?: boolean;
  /** Debounce invalidation in ms (default: 100) */
  debounceMs?: number;
  /** Callback when invalidation occurs */
  onInvalidate?: (rule: InvalidationRule, count: number) => void;
}

// =============================================================================
// Invalidation Manager
// =============================================================================

const DEFAULT_CONFIG: Required<InvalidationManagerConfig> = {
  enableRealtime: true,
  debounceMs: 100,
  onInvalidate: () => {},
};

/**
 * Cache Invalidation Manager
 *
 * @example
 * ```ts
 * const manager = new InvalidationManager();
 *
 * // Invalidate product cache when products table changes
 * manager.addRule({
 *   id: 'products',
 *   table: 'products',
 *   events: ['INSERT', 'UPDATE', 'DELETE'],
 *   tags: ['products', 'feed'],
 * });
 *
 * // Invalidate specific user's cache
 * manager.addRule({
 *   id: 'user-profile',
 *   table: 'profiles',
 *   events: ['UPDATE'],
 *   invalidate: async (payload) => {
 *     const userId = payload.new.id;
 *     await cacheDeleteByPattern(new RegExp(`user:${userId}`));
 *   },
 * });
 *
 * // Start listening
 * manager.start();
 * ```
 */
export class InvalidationManager {
  private config: Required<InvalidationManagerConfig>;
  private rules = new Map<string, InvalidationRule>();
  private subscriptions = new Map<string, SubscriptionHandle>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private pendingInvalidations = new Map<string, Set<InvalidationRule>>();

  constructor(config: InvalidationManagerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add an invalidation rule
   */
  addRule(rule: InvalidationRule): void {
    this.rules.set(rule.id, rule);

    // Subscribe if realtime is enabled and manager is started
    if (this.config.enableRealtime && this.subscriptions.size > 0) {
      this.subscribeToRule(rule);
    }
  }

  /**
   * Remove an invalidation rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);

    // Unsubscribe if no more rules for this table
    const rule = this.rules.get(ruleId);
    if (rule) {
      const hasOtherRules = Array.from(this.rules.values()).some(
        (r) => r.table === rule.table && r.id !== ruleId
      );

      if (!hasOtherRules) {
        const sub = this.subscriptions.get(rule.table);
        if (sub) {
          sub.unsubscribe();
          this.subscriptions.delete(rule.table);
        }
      }
    }
  }

  /**
   * Start listening for changes
   */
  start(): void {
    if (!this.config.enableRealtime) return;

    for (const rule of this.rules.values()) {
      this.subscribeToRule(rule);
    }
  }

  /**
   * Stop listening for changes
   */
  stop(): void {
    for (const sub of this.subscriptions.values()) {
      sub.unsubscribe();
    }
    this.subscriptions.clear();

    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.pendingInvalidations.clear();
  }

  /**
   * Subscribe to a rule's table
   */
  private subscribeToRule(rule: InvalidationRule): void {
    // Check if already subscribed to this table
    if (this.subscriptions.has(rule.table)) return;

    const handle = subscribeToChanges({
      table: rule.table,
      event: "*",
      filter: rule.filter,
      onData: (payload) => this.handleChange(rule.table, payload),
    });

    this.subscriptions.set(rule.table, handle);
  }

  /**
   * Handle a realtime change
   */
  private handleChange(table: string, payload: unknown): void {
    const eventType = (payload as { eventType?: string }).eventType?.toUpperCase();

    // Find matching rules
    const matchingRules = Array.from(this.rules.values()).filter(
      (rule) =>
        rule.table === table &&
        rule.events.includes(eventType as "INSERT" | "UPDATE" | "DELETE")
    );

    if (matchingRules.length === 0) return;

    // Add to pending invalidations
    let pending = this.pendingInvalidations.get(table);
    if (!pending) {
      pending = new Set();
      this.pendingInvalidations.set(table, pending);
    }

    for (const rule of matchingRules) {
      pending.add(rule);
    }

    // Debounce invalidation
    const existingTimer = this.debounceTimers.get(table);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.executeInvalidations(table, payload);
    }, this.config.debounceMs);

    this.debounceTimers.set(table, timer);
  }

  /**
   * Execute pending invalidations
   */
  private async executeInvalidations(table: string, payload: unknown): Promise<void> {
    const pending = this.pendingInvalidations.get(table);
    if (!pending || pending.size === 0) return;

    const cache = getCache();

    for (const rule of pending) {
      let invalidatedCount = 0;

      // Custom invalidation
      if (rule.invalidate) {
        await rule.invalidate(payload);
        invalidatedCount++;
      }

      // Tag-based invalidation
      if (rule.tags) {
        for (const tag of rule.tags) {
          invalidatedCount += await cache.deleteByTag(tag);
        }
      }

      // Pattern-based invalidation
      if (rule.patterns) {
        for (const pattern of rule.patterns) {
          invalidatedCount += await cache.deleteByPattern(pattern);
        }
      }

      this.config.onInvalidate(rule, invalidatedCount);
    }

    pending.clear();
    this.debounceTimers.delete(table);
  }

  /**
   * Manually trigger invalidation for a rule
   */
  async invalidateRule(ruleId: string): Promise<number> {
    const rule = this.rules.get(ruleId);
    if (!rule) return 0;

    const cache = getCache();
    let invalidatedCount = 0;

    if (rule.tags) {
      for (const tag of rule.tags) {
        invalidatedCount += await cache.deleteByTag(tag);
      }
    }

    if (rule.patterns) {
      for (const pattern of rule.patterns) {
        invalidatedCount += await cache.deleteByPattern(pattern);
      }
    }

    this.config.onInvalidate(rule, invalidatedCount);
    return invalidatedCount;
  }

  /**
   * Manually invalidate by tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    return getCache().deleteByTag(tag);
  }

  /**
   * Manually invalidate by pattern
   */
  async invalidateByPattern(pattern: RegExp): Promise<number> {
    return getCache().deleteByPattern(pattern);
  }

  /**
   * Get all rules
   */
  getRules(): InvalidationRule[] {
    return Array.from(this.rules.values());
  }
}

// =============================================================================
// Default Instance
// =============================================================================

let defaultManager: InvalidationManager | null = null;

/**
 * Get the default invalidation manager
 */
export function getInvalidationManager(
  config?: InvalidationManagerConfig
): InvalidationManager {
  if (!defaultManager) {
    defaultManager = new InvalidationManager(config);
  }
  return defaultManager;
}

/**
 * Add an invalidation rule
 */
export function addInvalidationRule(rule: InvalidationRule): void {
  getInvalidationManager().addRule(rule);
}

/**
 * Remove an invalidation rule
 */
export function removeInvalidationRule(ruleId: string): void {
  getInvalidationManager().removeRule(ruleId);
}

/**
 * Start invalidation manager
 */
export function startInvalidationManager(): void {
  getInvalidationManager().start();
}

/**
 * Stop invalidation manager
 */
export function stopInvalidationManager(): void {
  getInvalidationManager().stop();
}

// =============================================================================
// Common Invalidation Rules
// =============================================================================

/**
 * Create common invalidation rules for FoodShare
 */
export function createCommonInvalidationRules(): InvalidationRule[] {
  return [
    {
      id: "products",
      table: "products",
      events: ["INSERT", "UPDATE", "DELETE"],
      tags: ["products", "feed", "search"],
      patterns: [/^product:/, /^feed:/, /^search:/],
    },
    {
      id: "profiles",
      table: "profiles",
      events: ["UPDATE"],
      tags: ["profiles"],
      patterns: [/^profile:/, /^user:/],
    },
    {
      id: "messages",
      table: "messages",
      events: ["INSERT"],
      tags: ["messages", "chat"],
      patterns: [/^chat:/, /^room:/],
    },
    {
      id: "reviews",
      table: "reviews",
      events: ["INSERT", "UPDATE", "DELETE"],
      tags: ["reviews"],
      patterns: [/^review:/, /^user-reviews:/],
    },
    {
      id: "favorites",
      table: "favorites",
      events: ["INSERT", "DELETE"],
      tags: ["favorites"],
      patterns: [/^favorites:/, /^user-favorites:/],
    },
  ];
}

/**
 * Initialize common invalidation rules
 */
export function initializeCommonInvalidation(): void {
  const manager = getInvalidationManager();
  const rules = createCommonInvalidationRules();

  for (const rule of rules) {
    manager.addRule(rule);
  }

  manager.start();
}
