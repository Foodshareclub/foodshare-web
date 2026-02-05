# Enterprise Health Monitoring System v2.0

Production-grade health monitoring with circuit breakers, rate limiting, and observability.

## Features

### Core Capabilities
- ✅ **Circuit Breakers** - Automatic failure detection with recovery
- ✅ **Retry with Exponential Backoff** - Smart retry logic with jitter
- ✅ **Optimistic Locking** - Atomic updates with Redis INCR versioning
- ✅ **Request Deduplication** - Prevents duplicate concurrent checks
- ✅ **Response Caching** - 5-second TTL for performance
- ✅ **Rate Limiting** - 100 requests/minute per client
- ✅ **Authentication** - API key protection
- ✅ **Structured Logging** - JSON logs with context
- ✅ **Prometheus Metrics** - Standard metrics export
- ✅ **Connection Pooling** - Singleton Redis instance

### Performance Optimizations
- Uses `SCAN` instead of `KEYS` for Redis queries
- In-memory response caching (5s TTL)
- Request deduplication for concurrent calls
- Singleton pattern prevents connection leaks

### Security
- API key authentication
- Rate limiting per client (IP or API key)
- Sanitized responses (no internal details exposed)
- Secure headers

## API Endpoints

### GET /api/health/v2
Main health check endpoint.

**Headers:**
```
X-API-Key: your-api-key (optional, required if HEALTH_API_KEY env var is set)
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-05T17:00:00.000Z",
  "duration": 45,
  "services": [
    {
      "id": "redis",
      "status": "healthy",
      "latency": 12,
      "timestamp": 1738780800000,
      "version": 42,
      "consecutiveFailures": 0,
      "lastSuccess": 1738780800000
    }
  ],
  "metrics": {
    "checks_total": 1000,
    "checks_failed": 5,
    "success_rate": "99.50%",
    "avg_latency": "15ms",
    "cost_saved": "$0.000120",
    "circuit_breaker_trips": 2
  },
  "system": {
    "version": "2.0.0",
    "timestamp": "2026-02-05T17:00:00.000Z"
  }
}
```

**Status Codes:**
- `200` - Healthy or degraded
- `503` - Down
- `401` - Unauthorized
- `429` - Rate limit exceeded

### GET /api/health/v2/manage
Management and diagnostics endpoint.

**Query Parameters:**
- `?action=diagnostics` - System diagnostics
- `?action=metrics` - Prometheus metrics export

### POST /api/health/v2/manage
Management actions.

**Body:**
```json
{
  "action": "reset_circuit_breaker",
  "service": "redis"
}
```

**Actions:**
- `reset_circuit_breaker` - Reset circuit breaker for a service
- `force_health_check` - Force immediate health check

## Environment Variables

```bash
# Required
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Optional
HEALTH_API_KEY=your-secret-key  # Enable authentication
```

## Circuit Breaker Configuration

- **Failure Threshold:** 5 consecutive failures
- **Recovery Timeout:** 30 seconds
- **Half-Open Max Calls:** 3

## Rate Limiting

- **Default:** 100 requests per minute per client
- **Window:** Sliding window (60 seconds)
- **Identifier:** API key or IP address

## Metrics

### Prometheus Format
Access at `/api/health/v2/manage?action=metrics`

```
# HELP health_checks_total Total number of health checks performed
# TYPE health_checks_total counter
health_checks_total{status="success"} 995
health_checks_total{status="failure"} 5

# HELP health_check_latency_sum Sum of health check latencies in milliseconds
# TYPE health_check_latency_sum counter
health_check_latency_sum 15000

# HELP circuit_breaker_trips_total Total circuit breaker trips
# TYPE circuit_breaker_trips_total counter
circuit_breaker_trips_total 2
```

## Usage Examples

### Basic Health Check
```bash
curl https://your-app.com/api/health/v2
```

### With Authentication
```bash
curl https://your-app.com/api/health/v2 \
  -H "X-API-Key: your-secret-key"
```

### Get Diagnostics
```bash
curl https://your-app.com/api/health/v2/manage?action=diagnostics \
  -H "X-API-Key: your-secret-key"
```

### Reset Circuit Breaker
```bash
curl -X POST https://your-app.com/api/health/v2/manage \
  -H "X-API-Key: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"action":"reset_circuit_breaker","service":"redis"}'
```

### Export Prometheus Metrics
```bash
curl https://your-app.com/api/health/v2/manage?action=metrics \
  -H "X-API-Key: your-secret-key"
```

## Architecture

### Components

1. **RedisPool** - Singleton connection manager
2. **RateLimiter** - Sliding window rate limiting
3. **RequestDeduplicator** - Prevents duplicate concurrent requests
4. **ResponseCache** - In-memory caching with TTL
5. **CircuitBreaker** - Failure detection and recovery
6. **RetryPolicy** - Exponential backoff with jitter
7. **Logger** - Structured JSON logging

### Data Flow

```
Request → Auth → Rate Limit → Deduplication → Cache Check
                                                    ↓
                                              Cache Miss
                                                    ↓
                                          Circuit Breaker
                                                    ↓
                                            Service Check
                                                    ↓
                                          Update Metrics
                                                    ↓
                                            Cache Result
                                                    ↓
                                              Response
```

## Performance

### Benchmarks
- **Cold start:** ~50ms
- **Cached response:** <5ms
- **Concurrent requests:** Deduplicated to single check
- **Memory:** <10MB per instance

### Scalability
- Handles 100+ req/s per instance
- Horizontal scaling supported
- Redis as single source of truth

## Monitoring

### Logs
All logs are structured JSON:

```json
{
  "level": "info",
  "message": "Health check completed",
  "timestamp": "2026-02-05T17:00:00.000Z",
  "service": "health-monitor",
  "status": "healthy",
  "duration": 45,
  "cached": false
}
```

### Metrics
Track these key metrics:
- `health_checks_total` - Total checks performed
- `health_check_latency_sum` - Cumulative latency
- `circuit_breaker_trips_total` - Circuit breaker activations
- `cost_saved_usd` - Estimated cost savings

## Troubleshooting

### Circuit Breaker Stuck Open
```bash
curl -X POST /api/health/v2/manage \
  -d '{"action":"reset_circuit_breaker","service":"redis"}'
```

### High Latency
- Check Redis connection
- Review circuit breaker status
- Check for concurrent request storms

### Rate Limit Errors
- Increase rate limit in code
- Use API key for higher limits
- Implement client-side caching

## Migration from v1

1. Update endpoint: `/api/health` → `/api/health/v2`
2. Add `X-API-Key` header if authentication enabled
3. Update monitoring to use new metric names
4. Review circuit breaker thresholds

## License

MIT
