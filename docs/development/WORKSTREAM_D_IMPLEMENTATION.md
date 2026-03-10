# Workstream D Implementation Guide
# API Gateway Contract Modernization

**Status:** ✅ Completed March 10, 2026  
**Deliverables:** D1 (Policy Hardening), D2 (Route Governance), D3 (Reliability Controls)

---

## Executive Summary

Workstream D modernizes the API Gateway with standardized contracts, route governance, and reliability controls. This workstream delivers:

- **D1: Policy Hardening** - Standardized error envelopes, trace propagation, normalized authentication
- **D2: Route Governance** - Route registry, API versioning lifecycle, OpenAPI contracts, ownership tracking
- **D3: Reliability Controls** - Timeouts, retries, circuit breakers (✅ already implemented in resilience-config.js)

---

## Architecture Overview

### New Components

```
services/api-gateway/
├── route-registry.js          # Central route definitions with metadata
├── error-envelope.js          # Standardized error responses & tracing
├── contract-generator.js      # OpenAPI 3.0 spec generation
├── route-governance.js        # Route policy enforcement middleware
└── resilience-config.js       # ✅ Existing reliability controls (D3)
```

### Integration Points

1. **Trace Context** - Added early in middleware chain for request tracking
2. **Route Governance** - Applied after version middleware for route classification
3. **Error Envelope** - Global error handler at the end of middleware chain
4. **Rate Limiting** - Classification-based limits from route registry
5. **OpenAPI Generation** - Auto-generated from route registry

---

## D1: Policy Hardening

### Standardized Error Envelopes

**Problem:** Inconsistent error formats across services make client error handling difficult.

**Solution:** `error-envelope.js` provides standardized error responses:

```javascript
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ],
    "trace": {
      "requestId": "123e4567-e89b-12d3-a456-426614174000",
      "traceId": "abc123",
      "parentSpanId": "def456",
      "timestamp": "2026-03-10T12:00:00Z",
      "path": "/api/user/register",
      "method": "POST"
    }
  }
}
```

**Error Categories (10 standard types):**
- `VALIDATION_ERROR` (400)
- `AUTHENTICATION_ERROR` (401)
- `AUTHORIZATION_ERROR` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `RATE_LIMIT_EXCEEDED` (429)
- `INTERNAL_ERROR` (500)
- `SERVICE_UNAVAILABLE` (503)
- `GATEWAY_TIMEOUT` (504)
- `CIRCUIT_OPEN` (503)

### Trace Propagation

**Problem:** Difficult to track requests across microservices.

**Solution:** `traceContextMiddleware` generates/propagates trace IDs:

```javascript
// Generated headers
x-request-id: 123e4567-e89b-12d3-a456-426614174000
x-trace-id: abc123def456
x-parent-span-id: parent789

// Propagated to downstream services via getTraceHeaders(req)
```

### Normalized Authentication Guards

**Problem:** Inconsistent auth checks across routes.

**Solution:** `classificationAuthMiddleware` uses route classifications:

```javascript
// PUBLIC routes - no auth required
// AUTHENTICATED routes - JWT required
// ADMIN routes - JWT + admin role required
// INTERNAL routes - internal service-to-service only
```

---

## D2: Route Governance

### Route Registry

**Central route definitions** with governance metadata:

```javascript
// services/api-gateway/route-registry.js
{
  path: '/api/content/posts',
  methods: ['GET', 'POST'],
  service: 'content',
  class: 'AUTHENTICATED',      // Route classification
  sla: 'STANDARD',              // SLA tier (99.5%, p95 < 500ms)
  version: 'v1',                // API version
  owner: 'content-team',        // Ownership for accountability
  description: 'Manage content posts',
  deprecated: false,
  contract: '/contracts/content-service/posts.yaml'
}
```

**30+ routes registered** covering all services:
- user-service: 6 routes
- content-service: 6 routes
- messaging-service: 4 routes
- media-service: 3 routes
- shop-service: 3 routes
- ai-service: 2 routes
- collaboration-service: 3 routes
- streaming-service: 2 routes
- internal: 2 routes

### Route Classifications

```javascript
ROUTE_CLASSES = {
  PUBLIC: 'PUBLIC',              // No auth, 100 req/15min
  AUTHENTICATED: 'AUTHENTICATED', // JWT required, 500 req/15min
  ADMIN: 'ADMIN',                // Admin role, 1000 req/15min
  INTERNAL: 'INTERNAL'           // Service-to-service, 10000 req/1min
}
```

### SLA Tiers

```javascript
SLA_TIERS = {
  CRITICAL: {
    uptime: '99.9%',
    p95Latency: '200ms',
    timeout: 5000
  },
  STANDARD: {
    uptime: '99.5%',
    p95Latency: '500ms',
    timeout: 30000
  },
  BEST_EFFORT: {
    uptime: '95%',
    p95Latency: '2000ms',
    timeout: 60000
  }
}
```

### API Versioning

**Lifecycle Management:**

```javascript
apiVersions = {
  v1: {
    version: 'v1',
    status: 'deprecated',
    introduced: '2025-01-01',
    deprecated: '2026-06-01',
    sunset: '2026-12-31',
    notes: 'Legacy API, migrate to v2'
  },
  v2: {
    version: 'v2',
    status: 'stable',
    introduced: '2026-06-01',
    notes: 'Current stable release'
  }
}
```

**Deprecation Headers:**

```http
X-API-Deprecation: true
Warning: 299 - "This endpoint is deprecated and will be removed in a future version"
Sunset: 2026-12-31
```

### OpenAPI Contract Generation

**Auto-generated from route registry:**

```javascript
const { generateOpenAPISpec, exportContract } = require('./contract-generator');

// Generate OpenAPI 3.0 spec
const spec = generateOpenAPISpec('v1');

// Export as JSON or YAML
const json = exportContract('v1', 'json');
const yaml = exportContract('v1', 'yaml');
```

**Generated endpoints:**
- `/api/docs/contracts/v1` - OpenAPI 3.0 JSON spec
- `/api/docs/contracts/v2` - OpenAPI 3.0 JSON spec (when available)
- `/api/docs/routes` - Route registry with filters
- `/api/docs/ownership` - Route ownership by service

---

## D3: Reliability Controls

**✅ Already implemented in `resilience-config.js`** (no changes needed):

### Timeouts

```javascript
SERVICE_TIMEOUTS = {
  'user-service': 5000,
  'content-service': 10000,
  'messaging-service': 30000,
  'media-service': 60000,
  'shop-service': 30000,
  'ai-service': 60000,
  'collaboration-service': 30000,
  'streaming-service': 60000
}
```

### Retry Policies

```javascript
RETRY_POLICIES = {
  'user-service': { retries: 3, factor: 2 },
  'content-service': { retries: 2, factor: 2 },
  'messaging-service': { retries: 1, factor: 1.5 },
  // ... per-service configs
}
```

### Circuit Breakers

```javascript
class CircuitBreaker {
  states: ['CLOSED', 'OPEN', 'HALF_OPEN']
  
  // Thresholds
  failureThreshold: 5        // Open after 5 failures
  openTimeout: 60000         // Try recovery after 60s
  halfOpenMaxAttempts: 3     // Test with 3 requests
}
```

---

## Integration Guide

### Step 1: Add Trace Context (Early Middleware)

```javascript
// services/api-gateway/server.js
const { traceContextMiddleware } = require('./error-envelope');

// Add AFTER helmet/cors but BEFORE request logging
app.use(traceContextMiddleware);
```

### Step 2: Add Route Governance (After Version Middleware)

```javascript
const { routeGovernanceMiddleware } = require('./route-governance');

// Add AFTER versionMiddleware
app.use(routeGovernanceMiddleware);
```

### Step 3: Add Error Envelope (Global Error Handler)

```javascript
const { errorEnvelopeMiddleware } = require('./error-envelope');

// REPLACE existing globalErrorHandler with:
app.use(errorEnvelopeMiddleware);
```

### Step 4: Add Contract Endpoints

```javascript
const { generateOpenAPISpec } = require('./contract-generator');
const { routeRegistryHandler, routeOwnershipHandler } = require('./route-governance');

// OpenAPI contracts
app.get('/api/docs/contracts/:version', (req, res) => {
  const spec = generateOpenAPISpec(req.params.version);
  res.json(spec);
});

// Route registry
app.get('/api/docs/routes', routeRegistryHandler);

// Route ownership
app.get('/api/docs/ownership', routeOwnershipHandler);
```

### Step 5: Update Rate Limiting (Optional)

```javascript
const { selectRateLimiter, getRateLimitPolicy } = require('./route-governance');

// Use classification-based rate limiting
app.use((req, res, next) => {
  const limiter = selectRateLimiter(req.routeConfig, {
    global: globalLimiter,
    user: userLimiter,
    admin: /* create admin limiter */
  });
  
  if (limiter) {
    return limiter(req, res, next);
  }
  next();
});
```

---

## Usage Examples

### Client: Handling Standardized Errors

```javascript
// React Query error handler
const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      onError: (error) => {
        const { code, message, trace } = error.response.data.error;
        
        console.error('API Error', {
          code,           // VALIDATION_ERROR
          message,        // User-friendly message
          requestId: trace.requestId,  // For debugging
          timestamp: trace.timestamp
        });
        
        // Show user-friendly error
        if (code === 'VALIDATION_ERROR') {
          showValidationErrors(error.response.data.error.details);
        } else if (code === 'RATE_LIMIT_EXCEEDED') {
          showRateLimitMessage(error.response.headers['retry-after']);
        }
      }
    }
  }
});
```

### Backend: Using StandardError

```javascript
// In a service endpoint
const { StandardError } = require('../api-gateway/error-envelope');

app.post('/api/user/register', async (req, res, next) => {
  try {
    if (!req.body.email) {
      throw StandardError.validation([
        { field: 'email', message: 'Email is required' }
      ]);
    }
    
    // ... registration logic
    
    res.status(201).json(successEnvelope(req, { userId: newUser.id }));
  } catch (error) {
    next(error);
  }
});
```

### Monitoring: Route Statistics

```bash
# Get route statistics
curl http://localhost:8000/api/docs/routes

# Get route ownership
curl http://localhost:8000/api/docs/ownership

# Download OpenAPI v1 contract
curl http://localhost:8000/api/docs/contracts/v1 > openapi-v1.json

# Check circuit breaker states
curl http://localhost:8000/health/circuits
```

---

## Testing

### Error Envelope Tests

```javascript
// Test standardized error format
describe('Error Envelope', () => {
  it('should return validation error envelope', async () => {
    const res = await request(app)
      .post('/api/user/register')
      .send({ email: 'invalid' });
    
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.trace.requestId).toBeDefined();
  });
  
  it('should propagate trace headers', async () => {
    const res = await request(app)
      .get('/api/content/posts')
      .set('Authorization', 'Bearer token')
      .set('x-request-id', 'test-123');
    
    expect(res.headers['x-request-id']).toBe('test-123');
    expect(res.headers['x-trace-id']).toBeDefined();
  });
});
```

### Route Governance Tests

```javascript
describe('Route Governance', () => {
  it('should add route classification headers', async () => {
    const res = await request(app)
      .get('/api/content/posts')
      .set('Authorization', 'Bearer token');
    
    expect(res.headers['x-route-class']).toBe('AUTHENTICATED');
    expect(res.headers['x-route-sla']).toBe('STANDARD');
    expect(res.headers['x-route-owner']).toBe('content-team');
  });
  
  it('should return deprecation headers', async () => {
    const res = await request(app).get('/api/v1/legacy/endpoint');
    
    expect(res.headers['x-api-deprecation']).toBe('true');
    expect(res.headers['warning']).toContain('deprecated');
    expect(res.headers['sunset']).toBe('2026-12-31');
  });
});
```

### Contract Generation Tests

```javascript
describe('Contract Generator', () => {
  it('should generate valid OpenAPI 3.0 spec', () => {
    const spec = generateOpenAPISpec('v1');
    
    expect(spec.openapi).toBe('3.0.3');
    expect(spec.info.title).toBeDefined();
    expect(spec.paths).toBeDefined();
    expect(spec.components.schemas).toBeDefined();
  });
  
  it('should include deprecation warnings', () => {
    const spec = generateOpenAPISpec('v1');
    const deprecatedRoutes = Object.values(spec.paths)
      .flatMap(methods => Object.values(methods))
      .filter(op => op.deprecated);
    
    expect(deprecatedRoutes.length).toBeGreaterThan(0);
  });
});
```

---

## Metrics & Monitoring

### Key Metrics

**Route Statistics:**
- Total routes: 30+
- By classification: PUBLIC (8), AUTHENTICATED (16), ADMIN (4), INTERNAL (2)
- By SLA tier: CRITICAL (5), STANDARD (20), BEST_EFFORT (5)
- Deprecated routes: Track and alert

**Performance:**
- Request latency by SLA tier
- SLA compliance (% requests meeting p95 target)
- Circuit breaker states (CLOSED/OPEN/HALF_OPEN)
- Rate limit hit rate by classification

### Prometheus Metrics

```prometheus
# Route access by classification
http_requests_total{route_class="AUTHENTICATED",route="/api/content/posts"} 1234

# SLA compliance
http_request_duration_seconds{route_sla="STANDARD",le="0.5"} 0.95

# Circuit breaker state
circuit_breaker_state{service="content-service"} 0  # 0=CLOSED, 1=OPEN, 2=HALF_OPEN

# Deprecated route usage
deprecated_route_requests_total{route="/api/v1/legacy"} 56
```

---

## Migration Checklist

- [ ] **Phase 1: Trace Context**
  - [ ] Add `traceContextMiddleware` early in chain
  - [ ] Verify request IDs in logs
  - [ ] Test trace header propagation to services
  
- [ ] **Phase 2: Route Governance**
  - [ ] Add `routeGovernanceMiddleware` after version middleware
  - [ ] Verify route classification headers in responses
  - [ ] Test deprecation warnings on legacy routes
  
- [ ] **Phase 3: Error Envelope**
  - [ ] Replace `globalErrorHandler` with `errorEnvelopeMiddleware`
  - [ ] Update client error handlers to use new format
  - [ ] Test all error categories (validation, auth, rate limit, etc.)
  
- [ ] **Phase 4: Contract Documentation**
  - [ ] Add OpenAPI contract endpoints
  - [ ] Add route registry endpoints
  - [ ] Generate and publish contracts for all services
  - [ ] Update API documentation links
  
- [ ] **Phase 5: Rate Limiting Integration** (Optional)
  - [ ] Create classification-based rate limiters
  - [ ] Update route proxies to use `selectRateLimiter`
  - [ ] Test rate limits by classification
  
- [ ] **Phase 6: Monitoring**
  - [ ] Add Prometheus metrics for route classifications
  - [ ] Create Grafana dashboards for SLA tracking
  - [ ] Set up alerts for SLA violations
  - [ ] Monitor deprecated route usage

---

## Benefits

**For Platform Team:**
- Single source of truth for all routes
- Clear ownership and accountability
- Automated contract generation
- Better incident debugging with trace IDs

**For Service Teams:**
- Clear SLA requirements
- Standardized error handling
- Deprecation lifecycle management
- Self-service contract documentation

**For Clients:**
- Consistent error format across all endpoints
- Predictable rate limits by route type
- Clear deprecation timelines
- Auto-generated API documentation

---

## Future Enhancements

- **Auto-migration tool** - Automated v1 → v2 request/response transformation
- **Contract testing** - Validate services against published contracts
- **SLA monitoring** - Real-time SLA compliance tracking and alerting
- **Dynamic routing** - Traffic splitting for A/B testing
- **Smart retries** - Retry budgets and adaptive backoff
- **Regional routing** - Geo-based service discovery

---

## References

- Route Registry: `services/api-gateway/route-registry.js`
- Error Envelope: `services/api-gateway/error-envelope.js`
- Contract Generator: `services/api-gateway/contract-generator.js`
- Route Governance: `services/api-gateway/route-governance.js`
- Resilience Config: `services/api-gateway/resilience-config.js`
- Server Integration: `services/api-gateway/server.js`

---

**Implemented by:** Platform Team  
**Date:** March 10, 2026  
**Status:** ✅ Complete - Ready for Integration
