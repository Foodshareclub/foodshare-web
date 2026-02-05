/**
 * Enterprise Health Management API
 * - Circuit breaker controls
 * - Real-time metrics
 * - System diagnostics
 * - Performance analytics
 */

import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

interface SystemDiagnostics {
  redis: {
    connected: boolean;
    latency: number;
    memory_usage: string;
    connections: number;
  };
  circuit_breakers: Array<{
    service: string;
    state: 'open' | 'closed' | 'half-open';
    failure_count: number;
    last_failure: string;
    next_attempt: string;
  }>;
  performance: {
    avg_response_time: number;
    p95_response_time: number;
    error_rate: number;
    throughput: number;
  };
}

class HealthManagementAPI {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!
    });
  }

  async getSystemDiagnostics(): Promise<SystemDiagnostics> {
    const start = Date.now();
    
    try {
      const [
        redisInfo,
        circuitBreakerKeys,
        metrics,
        performanceData
      ] = await Promise.all([
        this.redis.info().catch(() => 'unavailable'),
        this.redis.keys('cb:*'),
        this.redis.hgetall('metrics:health'),
        this.redis.hgetall('perf:health')
      ]);

      // Parse Redis info
      const redisStats = this.parseRedisInfo(redisInfo as string);
      
      // Get circuit breaker states
      const circuitBreakers = await this.getCircuitBreakerStates(circuitBreakerKeys);
      
      // Calculate performance metrics
      const performance = this.calculatePerformanceMetrics(metrics, performanceData);

      return {
        redis: {
          connected: true,
          latency: Date.now() - start,
          memory_usage: redisStats.memory || 'unknown',
          connections: redisStats.connections || 0
        },
        circuit_breakers: circuitBreakers,
        performance
      };

    } catch (error) {
      return {
        redis: {
          connected: false,
          latency: Date.now() - start,
          memory_usage: 'unavailable',
          connections: 0
        },
        circuit_breakers: [],
        performance: {
          avg_response_time: 0,
          p95_response_time: 0,
          error_rate: 0,
          throughput: 0
        }
      };
    }
  }

  private parseRedisInfo(info: string): { memory?: string; connections?: number } {
    if (info === 'unavailable') return {};
    
    const lines = info.split('\n');
    const result: { memory?: string; connections?: number } = {};
    
    for (const line of lines) {
      if (line.startsWith('used_memory_human:')) {
        result.memory = line.split(':')[1]?.trim();
      }
      if (line.startsWith('connected_clients:')) {
        result.connections = parseInt(line.split(':')[1]?.trim() || '0');
      }
    }
    
    return result;
  }

  private async getCircuitBreakerStates(keys: string[]): Promise<Array<{
    service: string;
    state: 'open' | 'closed' | 'half-open';
    failure_count: number;
    last_failure: string;
    next_attempt: string;
  }>> {
    if (keys.length === 0) return [];
    
    const states = await this.redis.mget(...keys);
    
    return keys.map((key, index) => {
      const service = key.replace('cb:', '');
      const stateData = states[index];
      
      if (!stateData) {
        return {
          service,
          state: 'closed' as const,
          failure_count: 0,
          last_failure: 'never',
          next_attempt: 'n/a'
        };
      }
      
      const parsed = JSON.parse(stateData as string);
      return {
        service,
        state: parsed.state,
        failure_count: parsed.failureCount,
        last_failure: parsed.lastFailure ? new Date(parsed.lastFailure).toISOString() : 'never',
        next_attempt: parsed.nextAttempt ? new Date(parsed.nextAttempt).toISOString() : 'n/a'
      };
    });
  }

  private calculatePerformanceMetrics(
    metrics: Record<string, string>, 
    perfData: Record<string, string>
  ): {
    avg_response_time: number;
    p95_response_time: number;
    error_rate: number;
    throughput: number;
  } {
    const totalChecks = parseInt(metrics.checks_total || '0');
    const failedChecks = parseInt(metrics.checks_failed || '0');
    const latencySum = parseInt(metrics.latency_sum || '0');
    
    const avgResponseTime = totalChecks > 0 ? Math.round(latencySum / totalChecks) : 0;
    const errorRate = totalChecks > 0 ? (failedChecks / totalChecks) * 100 : 0;
    
    // Estimate throughput (checks per minute)
    const throughput = parseFloat(perfData.throughput || '0');
    
    // P95 would require histogram data, using approximation
    const p95ResponseTime = avgResponseTime * 1.5; // Rough estimate
    
    return {
      avg_response_time: avgResponseTime,
      p95_response_time: Math.round(p95ResponseTime),
      error_rate: Math.round(errorRate * 100) / 100,
      throughput: Math.round(throughput * 100) / 100
    };
  }

  async resetCircuitBreaker(service: string): Promise<boolean> {
    try {
      const key = `cb:${service}`;
      await this.redis.del(key);
      
      console.log(JSON.stringify({
        level: 'info',
        message: 'Circuit breaker reset',
        service,
        timestamp: new Date().toISOString()
      }));
      
      return true;
    } catch (error) {
      console.error(JSON.stringify({
        level: 'error',
        message: 'Failed to reset circuit breaker',
        service,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      }));
      
      return false;
    }
  }

  async forceHealthCheck(service: string): Promise<boolean> {
    try {
      // Reset the health check timestamp to force immediate check
      const healthKey = `health:${service}`;
      const current = await this.redis.get(healthKey) as string;
      
      if (current) {
        const healthData = JSON.parse(current);
        healthData.timestamp = 0; // Force next check
        healthData.version = Date.now(); // Update version
        
        await this.redis.setex(healthKey, 3600, JSON.stringify(healthData));
      }
      
      console.log(JSON.stringify({
        level: 'info',
        message: 'Forced health check',
        service,
        timestamp: new Date().toISOString()
      }));
      
      return true;
    } catch (error) {
      console.error(JSON.stringify({
        level: 'error',
        message: 'Failed to force health check',
        service,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      }));
      
      return false;
    }
  }

  async getMetricsExport(): Promise<string> {
    try {
      const [metrics, perfData, healthKeys] = await Promise.all([
        this.redis.hgetall('metrics:health'),
        this.redis.hgetall('perf:health'),
        this.redis.keys('health:*')
      ]);

      const totalChecks = parseInt(metrics.checks_total || '0');
      const failedChecks = parseInt(metrics.checks_failed || '0');
      const successfulChecks = totalChecks - failedChecks;
      const latencySum = parseInt(metrics.latency_sum || '0');
      const costSaved = parseFloat(metrics.cost_saved_usd || '0');
      const circuitBreakerTrips = parseInt(metrics.circuit_breaker_trips || '0');

      // Prometheus format metrics
      const prometheusMetrics = [
        `# HELP health_checks_total Total number of health checks performed`,
        `# TYPE health_checks_total counter`,
        `health_checks_total{status="success"} ${successfulChecks}`,
        `health_checks_total{status="failure"} ${failedChecks}`,
        ``,
        `# HELP health_check_latency_sum Sum of health check latencies in milliseconds`,
        `# TYPE health_check_latency_sum counter`,
        `health_check_latency_sum ${latencySum}`,
        ``,
        `# HELP health_check_cost_saved_usd Total cost saved in USD`,
        `# TYPE health_check_cost_saved_usd counter`,
        `health_check_cost_saved_usd ${costSaved}`,
        ``,
        `# HELP circuit_breaker_trips_total Total circuit breaker trips`,
        `# TYPE circuit_breaker_trips_total counter`,
        `circuit_breaker_trips_total ${circuitBreakerTrips}`,
        ``,
        `# HELP health_services_count Number of monitored services`,
        `# TYPE health_services_count gauge`,
        `health_services_count ${healthKeys.length}`,
        ``
      ].join('\n');

      return prometheusMetrics;
    } catch (error) {
      throw new Error(`Failed to export metrics: ${(error as Error).message}`);
    }
  }
}

// API Routes
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  
  const api = new HealthManagementAPI();
  
  try {
    switch (action) {
      case 'diagnostics':
        const diagnostics = await api.getSystemDiagnostics();
        return NextResponse.json(diagnostics);
        
      case 'metrics':
        const metricsExport = await api.getMetricsExport();
        return new NextResponse(metricsExport, {
          headers: {
            'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'
          }
        });
        
      default:
        // Default: return comprehensive status
        const diagnosticsDefault = await api.getSystemDiagnostics();
        return NextResponse.json({
          status: 'operational',
          timestamp: new Date().toISOString(),
          diagnostics: diagnosticsDefault,
          endpoints: {
            diagnostics: '?action=diagnostics',
            metrics: '?action=metrics',
            management: 'POST with actions'
          }
        });
    }
  } catch (error) {
    return NextResponse.json({
      error: 'Management API failure',
      message: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { action, service } = await request.json();
    const api = new HealthManagementAPI();
    
    switch (action) {
      case 'reset_circuit_breaker':
        if (!service) {
          return NextResponse.json({ error: 'Service name required' }, { status: 400 });
        }
        
        const resetSuccess = await api.resetCircuitBreaker(service);
        return NextResponse.json({
          success: resetSuccess,
          message: resetSuccess ? `Circuit breaker reset for ${service}` : 'Reset failed',
          timestamp: new Date().toISOString()
        });
        
      case 'force_health_check':
        if (!service) {
          return NextResponse.json({ error: 'Service name required' }, { status: 400 });
        }
        
        const forceSuccess = await api.forceHealthCheck(service);
        return NextResponse.json({
          success: forceSuccess,
          message: forceSuccess ? `Health check forced for ${service}` : 'Force check failed',
          timestamp: new Date().toISOString()
        });
        
      default:
        return NextResponse.json({
          error: 'Invalid action',
          available_actions: ['reset_circuit_breaker', 'force_health_check'],
          timestamp: new Date().toISOString()
        }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({
      error: 'Invalid request',
      message: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 400 });
  }
}
