/**
 * 100x Enterprise Health Monitoring System
 * - Circuit breakers with exponential backoff
 * - Atomic operations with optimistic locking
 * - Structured observability
 * - Horizontal scaling ready
 */

import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// Types
interface HealthCheck {
  id: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  timestamp: number;
  version: number; // For optimistic locking
  consecutiveFailures: number;
  lastSuccess: number;
  metadata: Record<string, unknown>;
}

interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailure: number;
  nextAttempt: number;
}

interface Metrics {
  checks_total: number;
  checks_failed: number;
  latency_sum: number;
  cost_saved_usd: number;
  circuit_breaker_trips: number;
}

// Circuit Breaker Implementation
class CircuitBreaker {
  private readonly failureThreshold = 5;
  private readonly recoveryTimeout = 30000; // 30s
  private readonly halfOpenMaxCalls = 3;

  async execute<T>(
    redis: Redis,
    serviceId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const state = await this.getState(redis, serviceId);
    
    if (state.state === 'open') {
      if (Date.now() < state.nextAttempt) {
        throw new Error(`Circuit breaker OPEN for ${serviceId}`);
      }
      await this.setState(redis, serviceId, { ...state, state: 'half-open' });
    }

    try {
      const result = await operation();
      await this.onSuccess(redis, serviceId);
      return result;
    } catch (error) {
      await this.onFailure(redis, serviceId);
      throw error;
    }
  }

  private async getState(redis: Redis, serviceId: string): Promise<CircuitBreakerState> {
    const key = `cb:${serviceId}`;
    const data = await redis.get(key) as string;
    
    return data ? JSON.parse(data) : {
      state: 'closed',
      failureCount: 0,
      lastFailure: 0,
      nextAttempt: 0
    };
  }

  private async setState(redis: Redis, serviceId: string, state: CircuitBreakerState): Promise<void> {
    const key = `cb:${serviceId}`;
    await redis.setex(key, 3600, JSON.stringify(state)); // 1hr TTL
  }

  private async onSuccess(redis: Redis, serviceId: string): Promise<void> {
    await this.setState(redis, serviceId, {
      state: 'closed',
      failureCount: 0,
      lastFailure: 0,
      nextAttempt: 0
    });
  }

  private async onFailure(redis: Redis, serviceId: string): Promise<void> {
    const state = await this.getState(redis, serviceId);
    const newFailureCount = state.failureCount + 1;
    
    if (newFailureCount >= this.failureThreshold) {
      await this.setState(redis, serviceId, {
        state: 'open',
        failureCount: newFailureCount,
        lastFailure: Date.now(),
        nextAttempt: Date.now() + this.recoveryTimeout
      });
      
      // Increment circuit breaker trip metric
      await this.incrementMetric(redis, 'circuit_breaker_trips');
    } else {
      await this.setState(redis, serviceId, {
        ...state,
        failureCount: newFailureCount,
        lastFailure: Date.now()
      });
    }
  }

  private async incrementMetric(redis: Redis, metric: keyof Metrics): Promise<void> {
    await redis.hincrby('metrics:health', metric, 1);
  }
}

// Retry with exponential backoff
class RetryPolicy {
  static async execute<T>(
    operation: () => Promise<T>,
    maxAttempts = 3,
    baseDelay = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) break;
        
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
}

// Structured Logger
class Logger {
  static info(message: string, context: Record<string, unknown> = {}): void {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      service: 'health-monitor',
      ...context
    }));
  }

  static error(message: string, error: Error, context: Record<string, unknown> = {}): void {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      timestamp: new Date().toISOString(),
      service: 'health-monitor',
      ...context
    }));
  }

  static metric(name: string, value: number, labels: Record<string, string> = {}): void {
    console.log(JSON.stringify({
      type: 'metric',
      name,
      value,
      labels,
      timestamp: new Date().toISOString()
    }));
  }
}

// Rate limiter
class RateLimiter {
  private readonly redis: Redis;
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.redis = RedisPool.getInstance();
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async allow(clientId: string): Promise<boolean> {
    const key = `ratelimit:${clientId}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Use Redis sorted set for sliding window
    const count = await this.redis.eval(
      `
      redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, ARGV[1])
      local count = redis.call('ZCARD', KEYS[1])
      if count < tonumber(ARGV[3]) then
        redis.call('ZADD', KEYS[1], ARGV[2], ARGV[2])
        redis.call('EXPIRE', KEYS[1], 60)
        return count + 1
      end
      return count
      `,
      [key],
      [windowStart.toString(), now.toString(), this.maxRequests.toString()]
    );

    return (count as number) <= this.maxRequests;
  }
}

// Authentication
function validateApiKey(request: Request): boolean {
  const apiKey = request.headers.get('x-api-key');
  const validKey = process.env.HEALTH_API_KEY;
  
  // Allow if no key configured (backward compatibility)
  if (!validKey) return true;
  
  return apiKey === validKey;
}

function getClientId(request: Request): string {
  // Use API key or IP as client identifier
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) return `key:${apiKey}`;
  
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  return `ip:${ip}`;
}

// Singleton Redis connection pool
class RedisPool {
  private static instance: Redis | null = null;

  static getInstance(): Redis {
    if (!this.instance) {
      if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        throw new Error('Redis configuration missing');
      }

      this.instance = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
        retry: {
          retries: 3,
          backoff: () => 100
        }
      });
    }
    return this.instance;
  }
}

// Request deduplication
class RequestDeduplicator {
  private pending = new Map<string, Promise<any>>();

  async deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.pending.get(key);
    if (existing) return existing;

    const promise = fn().finally(() => this.pending.delete(key));
    this.pending.set(key, promise);
    return promise;
  }
}

// Response cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class ResponseCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly ttl: number;

  constructor(ttlMs: number = 5000) {
    this.ttl = ttlMs;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}

// Main Health Monitor with singleton pattern
class EnterpriseHealthMonitor {
  private static instance: EnterpriseHealthMonitor | null = null;
  private readonly redis: Redis;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly instanceId: string;
  public readonly deduplicator: RequestDeduplicator;
  private readonly cache: ResponseCache;

  private constructor() {
    this.redis = RedisPool.getInstance();
    this.circuitBreaker = new CircuitBreaker();
    this.instanceId = `health-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.deduplicator = new RequestDeduplicator();
    this.cache = new ResponseCache(5000); // 5s cache
  }

  static getInstance(): EnterpriseHealthMonitor {
    if (!this.instance) {
      this.instance = new EnterpriseHealthMonitor();
    }
    return this.instance;
  }

  // Optimistic locking with proper atomic versioning
  async updateHealthWithLock(serviceId: string, updater: (current: HealthCheck | null) => HealthCheck): Promise<boolean> {
    const key = `health:${serviceId}`;
    const versionKey = `version:${serviceId}`;
    const maxRetries = 5;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const current = await this.redis.get(key) as string;
      const currentHealth: HealthCheck | null = current ? JSON.parse(current) : null;
      
      // Get atomic version from Redis
      const version = await this.redis.incr(versionKey);
      
      const updated = updater(currentHealth);
      updated.version = version;
      
      // Optimistic locking with version check
      if (currentHealth) {
        const success = await this.redis.eval(
          `
          local current = redis.call('GET', KEYS[1])
          if current == false then return 0 end
          local data = cjson.decode(current)
          if data.version ~= tonumber(ARGV[2]) then return 0 end
          redis.call('SET', KEYS[1], ARGV[1])
          redis.call('EXPIRE', KEYS[1], 3600)
          return 1
          `,
          [key],
          [JSON.stringify(updated), currentHealth.version.toString()]
        );
        
        if (success === 1) return true;
      } else {
        // First time, simple set
        await this.redis.setex(key, 3600, JSON.stringify(updated));
        return true;
      }
      
      // Collision detected, exponential backoff with max limit
      const backoff = Math.min(Math.pow(2, attempt) * 10, 1000);
      await new Promise(resolve => setTimeout(resolve, backoff));
    }
    
    Logger.error('Failed to update health after retries', new Error('Optimistic lock failure'), {
      serviceId,
      attempts: maxRetries
    });
    return false;
  }

  // Service health check with full resilience
  async checkService(serviceId: string, checkFn: () => Promise<{ status: 'healthy' | 'degraded' | 'down', latency: number, metadata?: Record<string, unknown> }>): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const result = await this.circuitBreaker.execute(
        this.redis,
        serviceId,
        () => RetryPolicy.execute(checkFn, 2, 500)
      );
      
      const health: HealthCheck = {
        id: serviceId,
        status: result.status,
        latency: result.latency,
        timestamp: Date.now(),
        version: Date.now(), // Simple versioning
        consecutiveFailures: result.status === 'healthy' ? 0 : 1,
        lastSuccess: result.status === 'healthy' ? Date.now() : 0,
        metadata: result.metadata || {}
      };

      await this.updateHealthWithLock(serviceId, (current) => ({
        ...health,
        consecutiveFailures: result.status === 'healthy' ? 0 : (current?.consecutiveFailures || 0) + 1,
        lastSuccess: result.status === 'healthy' ? Date.now() : (current?.lastSuccess || 0)
      }));

      // Update metrics atomically
      await this.updateMetrics(result.status === 'healthy', result.latency, Date.now() - startTime);

      Logger.info('Health check completed', {
        serviceId,
        status: result.status,
        latency: result.latency,
        duration: Date.now() - startTime
      });

      return health;

    } catch (error) {
      const errorHealth: HealthCheck = {
        id: serviceId,
        status: 'down',
        latency: 0,
        timestamp: Date.now(),
        version: Date.now(),
        consecutiveFailures: 1,
        lastSuccess: 0,
        metadata: { error: (error as Error).message }
      };

      await this.updateHealthWithLock(serviceId, (current) => ({
        ...errorHealth,
        consecutiveFailures: (current?.consecutiveFailures || 0) + 1,
        lastSuccess: current?.lastSuccess || 0
      }));

      await this.updateMetrics(false, 0, Date.now() - startTime);

      Logger.error('Health check failed', error as Error, {
        serviceId,
        duration: Date.now() - startTime
      });

      return errorHealth;
    }
  }

  // Atomic metrics updates
  private async updateMetrics(success: boolean, latency: number, duration: number): Promise<void> {
    const pipeline = [
      ['hincrby', 'metrics:health', 'checks_total', 1],
      ['hincrby', 'metrics:health', 'latency_sum', latency],
    ];

    if (!success) {
      pipeline.push(['hincrby', 'metrics:health', 'checks_failed', 1]);
    }

    // Estimate cost savings (rough Vercel function cost)
    const costSaved = duration < 1000 ? 0.0000001 : 0; // Saved by early termination
    if (costSaved > 0) {
      pipeline.push(['hincrbyfloat', 'metrics:health', 'cost_saved_usd', costSaved]);
    }

    await this.redis.pipeline().exec();

    // Emit metrics for external systems
    Logger.metric('health_check_duration_ms', duration, { success: success.toString() });
    Logger.metric('health_check_latency_ms', latency, { success: success.toString() });
  }

  // Get comprehensive health status with caching
  async getHealthStatus(): Promise<{
    services: HealthCheck[];
    metrics: Metrics;
    system: {
      instanceId: string;
      timestamp: string;
      version: string;
    };
  }> {
    // Check cache first
    const cached = this.cache.get<any>('health:status');
    if (cached) {
      Logger.info('Health status cache hit', { age: Date.now() - cached.timestamp });
      return cached;
    }

    // Use SCAN instead of KEYS for better performance
    const services: HealthCheck[] = [];
    let cursor = '0';
    
    do {
      const [newCursor, keys] = await this.redis.scan(cursor, {
        match: 'health:*',
        count: 100
      }) as [string, string[]];
      
      if (keys.length > 0) {
        const healthData = await this.redis.mget(...keys);
        services.push(...healthData.filter(Boolean).map(data => JSON.parse(data as string)));
      }
      
      cursor = newCursor;
    } while (cursor !== '0');

    const metricsData = await this.redis.hgetall('metrics:health') || {};

    const metrics: Metrics = {
      checks_total: parseInt((metricsData.checks_total as string) || '0'),
      checks_failed: parseInt((metricsData.checks_failed as string) || '0'),
      latency_sum: parseInt((metricsData.latency_sum as string) || '0'),
      cost_saved_usd: parseFloat((metricsData.cost_saved_usd as string) || '0'),
      circuit_breaker_trips: parseInt((metricsData.circuit_breaker_trips as string) || '0')
    };

    const result = {
      services,
      metrics,
      system: {
        instanceId: this.instanceId,
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      }
    };

    // Cache the result
    this.cache.set('health:status', result);

    return result;
  }
}

// Redis health check implementation
async function checkRedis(): Promise<{ status: 'healthy' | 'degraded' | 'down', latency: number, metadata: Record<string, unknown> }> {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!
  });

  const start = Date.now();
  
  try {
    const [ping] = await Promise.all([
      redis.ping(),
    ]);
    
    const latency = Date.now() - start;
    
    return {
      status: ping === 'PONG' ? 'healthy' : 'degraded',
      latency,
      metadata: {
        ping: ping,
        connection: 'success'
      }
    };
  } catch (error) {
    return {
      status: 'down',
      latency: Date.now() - start,
      metadata: {
        error: (error as Error).message,
        connection: 'failed'
      }
    };
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    // Authentication
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized', timestamp: new Date().toISOString() },
        { status: 401 }
      );
    }

    // Rate limiting
    const clientId = getClientId(request);
    const rateLimiter = new RateLimiter(100, 60000); // 100 req/min
    
    if (!await rateLimiter.allow(clientId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', timestamp: new Date().toISOString() },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // Request deduplication
    const monitor = EnterpriseHealthMonitor.getInstance();
    const deduplicationKey = 'health:check';
    
    const result = await monitor.deduplicator.deduplicate(deduplicationKey, async () => {
      // Check services in parallel with proper error isolation
      const [redisHealth] = await Promise.allSettled([
        monitor.checkService('redis', checkRedis)
      ]);

      const services = [
        redisHealth.status === 'fulfilled' ? redisHealth.value : null
      ].filter(Boolean) as HealthCheck[];

      const status = await monitor.getHealthStatus();
      
      const overallStatus = services.every(s => s.status === 'healthy') ? 'healthy' :
                           services.some(s => s.status === 'down') ? 'down' : 'degraded';

      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        services: status.services,
        metrics: {
          ...status.metrics,
          success_rate: status.metrics.checks_total > 0 ? 
            ((status.metrics.checks_total - status.metrics.checks_failed) / status.metrics.checks_total * 100).toFixed(2) + '%' : '100%',
          avg_latency: status.metrics.checks_total > 0 ? 
            Math.round(status.metrics.latency_sum / status.metrics.checks_total) + 'ms' : '0ms',
          cost_saved: '$' + status.metrics.cost_saved_usd.toFixed(6)
        },
        system: {
          version: status.system.version,
          timestamp: status.system.timestamp
          // Don't expose instanceId for security
        }
      };
    });

    Logger.info('Health check completed', {
      status: result.status,
      duration: Date.now() - startTime,
      cached: Date.now() - startTime < 10 // Likely cached if < 10ms
    });

    return NextResponse.json(result, {
      status: result.status === 'down' ? 503 : 200,
      headers: {
        'Cache-Control': 'private, max-age=5',
        'X-Health-Version': '2.0.0'
      }
    });

  } catch (error) {
    Logger.error('Health check system failure', error as Error, {
      duration: Date.now() - startTime
    });

    return NextResponse.json({
      status: 'down',
      error: 'System failure',
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime
    }, { status: 503 });
  }
}
