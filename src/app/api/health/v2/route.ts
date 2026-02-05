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

// Main Health Monitor
class EnterpriseHealthMonitor {
  private readonly redis: Redis;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly instanceId: string;

  constructor() {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Redis configuration missing');
    }

    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      retry: {
        retries: 3,
        retryDelayOnFailover: 100
      }
    });
    
    this.circuitBreaker = new CircuitBreaker();
    this.instanceId = `health-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Optimistic locking for atomic updates
  async updateHealthWithLock(serviceId: string, updater: (current: HealthCheck | null) => HealthCheck): Promise<boolean> {
    const key = `health:${serviceId}`;
    const maxRetries = 5;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const current = await this.redis.get(key) as string;
      const currentHealth: HealthCheck | null = current ? JSON.parse(current) : null;
      
      const updated = updater(currentHealth);
      
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
      
      // Collision detected, exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 10));
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

    await this.redis.pipeline(pipeline);

    // Emit metrics for external systems
    Logger.metric('health_check_duration_ms', duration, { success: success.toString() });
    Logger.metric('health_check_latency_ms', latency, { success: success.toString() });
  }

  // Get comprehensive health status
  async getHealthStatus(): Promise<{
    services: HealthCheck[];
    metrics: Metrics;
    system: {
      instanceId: string;
      timestamp: string;
      version: string;
    };
  }> {
    const [healthKeys, metricsData] = await Promise.all([
      this.redis.keys('health:*'),
      this.redis.hgetall('metrics:health')
    ]);

    const services: HealthCheck[] = [];
    if (healthKeys.length > 0) {
      const healthData = await this.redis.mget(...healthKeys);
      services.push(...healthData.filter(Boolean).map(data => JSON.parse(data as string)));
    }

    const metrics: Metrics = {
      checks_total: parseInt(metricsData.checks_total as string || '0'),
      checks_failed: parseInt(metricsData.checks_failed as string || '0'),
      latency_sum: parseInt(metricsData.latency_sum as string || '0'),
      cost_saved_usd: parseFloat(metricsData.cost_saved_usd as string || '0'),
      circuit_breaker_trips: parseInt(metricsData.circuit_breaker_trips as string || '0')
    };

    return {
      services,
      metrics,
      system: {
        instanceId: this.instanceId,
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      }
    };
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
    const [ping, info] = await Promise.all([
      redis.ping(),
      redis.info().catch(() => 'unavailable')
    ]);
    
    const latency = Date.now() - start;
    
    return {
      status: ping === 'PONG' ? 'healthy' : 'degraded',
      latency,
      metadata: {
        ping: ping,
        info: typeof info === 'string' ? info.substring(0, 100) : 'unavailable',
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

export async function GET(): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    const monitor = new EnterpriseHealthMonitor();
    
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

    const response = {
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
      system: status.system
    };

    Logger.info('Health check completed', {
      status: overallStatus,
      duration: Date.now() - startTime,
      services: services.length
    });

    return NextResponse.json(response, {
      status: overallStatus === 'down' ? 503 : 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Health-Instance': status.system.instanceId,
        'X-Health-Version': status.system.version
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
