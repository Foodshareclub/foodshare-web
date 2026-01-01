/**
 * Offline Operation Queue
 *
 * Queues mutations when offline, syncs when back online.
 * Uses IndexedDB for persistence across browser sessions.
 *
 * SYNC: Mirrors Android SyncManager patterns
 *
 * @module lib/api/offline-queue
 */

import { enterpriseClient, ErrorCodes, type EnterpriseResult } from "./enterprise-client";

// =============================================================================
// Types
// =============================================================================

export type OperationType = "CREATE" | "UPDATE" | "DELETE";

export interface QueuedOperation {
  /** Unique operation ID */
  id: string;
  /** Operation type */
  type: OperationType;
  /** API endpoint */
  endpoint: string;
  /** HTTP method */
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  /** Request payload */
  payload?: unknown;
  /** Query parameters */
  query?: Record<string, string | number | boolean | undefined>;
  /** Idempotency key for safe retries */
  idempotencyKey: string;
  /** When the operation was queued */
  createdAt: number;
  /** Number of retry attempts */
  retryCount: number;
  /** Last error message */
  lastError?: string;
  /** Priority (lower = higher priority) */
  priority: number;
  /** Entity type for conflict resolution */
  entityType?: string;
  /** Entity ID for conflict resolution */
  entityId?: string;
}

export interface OfflineQueueConfig {
  /** Maximum retry attempts per operation (default: 5) */
  maxRetries?: number;
  /** Delay between retries in ms (default: 5000) */
  retryDelayMs?: number;
  /** Maximum queue size (default: 100) */
  maxQueueSize?: number;
  /** Batch size for sync (default: 5) */
  syncBatchSize?: number;
  /** Callback when operation succeeds */
  onSuccess?: (operation: QueuedOperation, result: unknown) => void;
  /** Callback when operation fails permanently */
  onFailure?: (operation: QueuedOperation, error: unknown) => void;
  /** Callback when queue changes */
  onQueueChange?: (queue: QueuedOperation[]) => void;
}

// =============================================================================
// IndexedDB Setup
// =============================================================================

const DB_NAME = "foodshare-offline-queue";
const DB_VERSION = 1;
const STORE_NAME = "operations";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("Failed to open offline queue DB:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("priority", "priority", { unique: false });
        store.createIndex("entityType", "entityType", { unique: false });
      }
    };
  });

  return dbPromise;
}

// =============================================================================
// Offline Queue Class
// =============================================================================

const DEFAULT_CONFIG: Required<OfflineQueueConfig> = {
  maxRetries: 5,
  retryDelayMs: 5000,
  maxQueueSize: 100,
  syncBatchSize: 5,
  onSuccess: () => {},
  onFailure: () => {},
  onQueueChange: () => {},
};

/**
 * Offline Operation Queue
 *
 * @example
 * ```ts
 * const queue = new OfflineQueue({
 *   onSuccess: (op, result) => console.log('Synced:', op.id),
 *   onFailure: (op, error) => console.error('Failed:', op.id, error),
 * });
 *
 * // Queue an operation
 * await queue.enqueue({
 *   type: 'CREATE',
 *   endpoint: 'api-v1-products',
 *   method: 'POST',
 *   payload: { title: 'My Product' },
 * });
 *
 * // Start syncing when online
 * queue.startSync();
 * ```
 */
export class OfflineQueue {
  private config: Required<OfflineQueueConfig>;
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  constructor(config: OfflineQueueConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Listen for online/offline events
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);
    }
  }

  /**
   * Handle coming online
   */
  private handleOnline = () => {
    this.isOnline = true;
    console.log("[OfflineQueue] Online - starting sync");
    this.startSync();
  };

  /**
   * Handle going offline
   */
  private handleOffline = () => {
    this.isOnline = false;
    console.log("[OfflineQueue] Offline - pausing sync");
    this.stopSync();
  };

  /**
   * Enqueue an operation
   */
  async enqueue(
    operation: Omit<QueuedOperation, "id" | "createdAt" | "retryCount" | "idempotencyKey" | "priority">
  ): Promise<string> {
    const queue = await this.getQueue();

    if (queue.length >= this.config.maxQueueSize) {
      throw new Error("Offline queue is full");
    }

    const id = crypto.randomUUID();
    const queuedOp: QueuedOperation = {
      ...operation,
      id,
      idempotencyKey: crypto.randomUUID(),
      createdAt: Date.now(),
      retryCount: 0,
      priority: this.getPriority(operation.type),
    };

    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(queuedOp);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    this.config.onQueueChange(await this.getQueue());

    // Try to sync immediately if online
    if (this.isOnline && !this.isSyncing) {
      this.syncNext();
    }

    return id;
  }

  /**
   * Get priority based on operation type
   */
  private getPriority(type: OperationType): number {
    switch (type) {
      case "DELETE":
        return 1; // Highest priority
      case "UPDATE":
        return 2;
      case "CREATE":
        return 3; // Lowest priority
      default:
        return 5;
    }
  }

  /**
   * Get all queued operations
   */
  async getQueue(): Promise<QueuedOperation[]> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const index = store.index("priority");
        const request = index.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [];
    }
  }

  /**
   * Get queue size
   */
  async getQueueSize(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  /**
   * Remove an operation from the queue
   */
  async remove(id: string): Promise<void> {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    this.config.onQueueChange(await this.getQueue());
  }

  /**
   * Update an operation in the queue
   */
  private async update(operation: QueuedOperation): Promise<void> {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(operation);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all operations from the queue
   */
  async clear(): Promise<void> {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    this.config.onQueueChange([]);
  }

  /**
   * Start automatic sync
   */
  startSync(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.syncNext();
      }
    }, this.config.retryDelayMs);

    // Sync immediately
    if (this.isOnline && !this.isSyncing) {
      this.syncNext();
    }
  }

  /**
   * Stop automatic sync
   */
  stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Sync next batch of operations
   */
  private async syncNext(): Promise<void> {
    if (this.isSyncing || !this.isOnline) return;

    this.isSyncing = true;

    try {
      const queue = await this.getQueue();
      const batch = queue.slice(0, this.config.syncBatchSize);

      for (const operation of batch) {
        await this.processOperation(operation);
      }
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Process a single operation
   */
  private async processOperation(operation: QueuedOperation): Promise<void> {
    try {
      const result = await this.executeOperation(operation);

      if (result.success) {
        await this.remove(operation.id);
        this.config.onSuccess(operation, result.data);
      } else {
        await this.handleOperationError(operation, result.error);
      }
    } catch (error) {
      await this.handleOperationError(operation, error);
    }
  }

  /**
   * Execute an operation via the API client
   */
  private async executeOperation(
    operation: QueuedOperation
  ): Promise<EnterpriseResult<unknown>> {
    const { endpoint, method, payload, query, idempotencyKey } = operation;

    switch (method) {
      case "POST":
        return enterpriseClient.post(endpoint, payload, {
          query,
          idempotencyKey,
          skipDeduplication: true,
        });

      case "PUT":
        return enterpriseClient.put(endpoint, payload, {
          query,
          idempotencyKey,
          skipDeduplication: true,
        });

      case "PATCH":
        return enterpriseClient.patch(endpoint, payload, {
          query,
          idempotencyKey,
          skipDeduplication: true,
        });

      case "DELETE":
        return enterpriseClient.delete(endpoint, {
          query,
          skipDeduplication: true,
        });

      default:
        return {
          success: false,
          error: { code: "INTERNAL_ERROR", message: `Unknown method: ${method}` },
        };
    }
  }

  /**
   * Handle operation error
   */
  private async handleOperationError(
    operation: QueuedOperation,
    error: unknown
  ): Promise<void> {
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error && "message" in error
          ? String((error as { message: unknown }).message)
          : "Unknown error";

    // Check if error is retryable
    const isRetryable = this.isRetryableError(error);

    if (!isRetryable || operation.retryCount >= this.config.maxRetries) {
      // Permanent failure
      await this.remove(operation.id);
      this.config.onFailure(operation, error);
      return;
    }

    // Update retry count
    operation.retryCount++;
    operation.lastError = errorMessage;
    await this.update(operation);
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      const nonRetryable: string[] = [
        ErrorCodes.VALIDATION_ERROR,
        ErrorCodes.NOT_FOUND,
        ErrorCodes.UNAUTHORIZED,
        ErrorCodes.FORBIDDEN,
        ErrorCodes.CONFLICT,
      ];
      return !nonRetryable.includes(code);
    }
    return true;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopSync();
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
    }
  }
}

// =============================================================================
// Default Instance
// =============================================================================

let defaultQueue: OfflineQueue | null = null;

/**
 * Get the default offline queue instance
 */
export function getOfflineQueue(config?: OfflineQueueConfig): OfflineQueue {
  if (!defaultQueue) {
    defaultQueue = new OfflineQueue(config);
  }
  return defaultQueue;
}

/**
 * Enqueue an operation to the default queue
 */
export async function enqueueOffline(
  operation: Omit<QueuedOperation, "id" | "createdAt" | "retryCount" | "idempotencyKey" | "priority">
): Promise<string> {
  return getOfflineQueue().enqueue(operation);
}

// =============================================================================
// React Hook
// =============================================================================

/**
 * Hook for using offline queue in React components
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { queue, enqueue, isOnline } = useOfflineQueue();
 *
 *   const handleCreate = async () => {
 *     if (!isOnline) {
 *       await enqueue({
 *         type: 'CREATE',
 *         endpoint: 'api-v1-products',
 *         method: 'POST',
 *         payload: { title: 'My Product' },
 *       });
 *       toast('Saved offline - will sync when online');
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <p>Pending operations: {queue.length}</p>
 *       <p>Status: {isOnline ? 'Online' : 'Offline'}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useOfflineQueue() {
  // This would be implemented with React hooks
  // For now, return the queue interface
  const queue = getOfflineQueue();

  return {
    enqueue: queue.enqueue.bind(queue),
    getQueue: queue.getQueue.bind(queue),
    getQueueSize: queue.getQueueSize.bind(queue),
    clear: queue.clear.bind(queue),
    startSync: queue.startSync.bind(queue),
    stopSync: queue.stopSync.bind(queue),
  };
}
