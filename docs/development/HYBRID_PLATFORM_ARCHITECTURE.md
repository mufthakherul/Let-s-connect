# Hybrid-Grade API Platform Architecture

**Milonexa — Next-Generation Platform Design**  
_Version 1.0 — Phase 1–9 Completion Summary_

---

## 1. Vision

The Milonexa API platform is designed as a **Hybrid-Grade API Architecture** that combines:

| Characteristic | Approach |
|---|---|
| **Enterprise reliability** | Circuit breakers, retry logic, health checks, PDB |
| **Standard production practices** | JWT auth, rate limiting, Redis caching, Prometheus metrics |
| **Lightweight flexibility** | Modular service boundaries, opt-in features, reduced data mode |

---

## 2. Architecture Overview

```
 ┌────────────────────────────────────────────────────────────┐
 │  Client Layer (Web, Mobile, Admin)                         │
 └─────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / WSS
 ┌─────────────────────────▼──────────────────────────────────┐
 │  API Gateway  (port 8000)                                  │
 │  ├── Route governance + classification                     │
 │  ├── JWT authentication + user identity forwarding        │
 │  ├── Tiered rate limiting (Redis-backed)                   │
 │  ├── Circuit breakers + retry (per service)                │
 │  ├── Compression, ETag, response-time headers              │
 │  ├── W3C trace context propagation                         │
 │  ├── GraphQL endpoint (graphql-http)                       │
 │  └── REST proxy to 8 domain services                      │
 └──┬────┬────┬────┬────┬────┬────┬────┬──────────────────────┘
    │    │    │    │    │    │    │    │
  user  cont msg  col  med  shop  ai  stream  (services)
```

---

## 3. Phase Completion Summary

### Phase 1 — Repository Intelligence
- Analyzed 9 microservices, API gateway, shared utilities
- Identified critical CI failure: `express-graphql@0.12.0` incompatible with `graphql@^16`
- Documented performance bottlenecks and security gaps

### Phase 2 — Hybrid Architecture Design
**Implemented:**
- Route governance with classification (PUBLIC, PRIVATE, ADMIN, INTERNAL)
- Domain-driven proxy routing with service isolation
- API versioning (`v1` deprecated, `v2` current) with migration headers
- GraphQL gateway with `graphql-http` (graphql@16 compatible)

**Architecture boundary decisions:**
- Services communicate only through the gateway (no direct service-to-service HTTP)
- Shared state (Redis, Postgres) accessed via dedicated clients per service
- Event-driven communication uses Redis pub/sub via `shared/event-bus.js`

### Phase 3 — Extreme Performance Engineering
**Implemented:**
- `X-Response-Time` header on all responses (request lifecycle timing)
- Smart compression: threshold 1 KB, level 6, skips pre-compressed content
- Redis-backed rate limiting with per-route policies
- Prometheus histogram metrics (request duration buckets: 5ms → 10s)
- Connection pooling via `shared/pool-config.js` with min/max settings

**Caching strategy** (`shared/cache-strategy.js`):
| Data Type | TTL | Rationale |
|---|---|---|
| Feed | 30s | High churn, personalized |
| Post list | 60s | Dynamic content |
| User profile | 300s | Semi-stable |
| Categories | 3600s | Rarely changes |

### Phase 4 — Advanced Security Architecture
**Implemented:**
- Helmet CSP, HSTS (1 year + preload), Referrer-Policy
- `x-powered-by` header disabled (server fingerprint reduction)
- Structured rate limit security events via `logger.warn` (not `console.warn`)
- Forwarded identity guard: services reject requests without valid gateway token
- JWT verification with `x-user-id`, `x-user-role`, `x-user-is-admin` forwarding
- OAuth CSRF protection via server-side state store (10 min TTL, max 1000 entries)
- Input sanitization via `shared/sanitization.js`
- Username enumeration protection with soft/hard rate limiters + CAPTCHA trigger

**Security layers:**
```
Request → Helmet → CORS → Rate Limit → JWT → Authorization → Handler
```

### Phase 5 — Cloud-Native Optimization
**Kubernetes improvements (`k8s/api-gateway.yaml`):**
- `readinessProbe`: now uses `/health/ready` (deep health check with dependency checks)
- `livenessProbe`: uses `/health` (lightweight liveness)
- `startupProbe`: 30 × 5s = 150s max startup grace period (avoids premature kills)
- `PodDisruptionBudget`: `minAvailable: 1` ensures rolling updates maintain availability
- HPA: 2–10 replicas, CPU 70% / Memory 80% thresholds

**CI pipeline (`.github/workflows/ci.yml`):**
- Upgraded Node.js 18 → **Node.js 20** across all CI jobs
  - Fixes `EBADENGINE` warnings for `react-router-dom@7.13.1` and `dompurify@3.3.2`
  - Enables native compatibility with latest npm ecosystem packages

### Phase 6 — Distributed Systems Evolution
**Implemented: `services/shared/event-bus.js`**
- Redis pub/sub event bus for async, decoupled service communication
- Versioned event envelope (`v: "1"`) for schema evolution compatibility
- Fire-and-forget semantics with graceful Redis unavailability handling
- Channel naming: `events:{domain}.{action}` (e.g. `events:user.registered`)
- Multi-handler fan-out per channel with isolated error handling

**Standard domain events:**
```
user.registered        user.deactivated
post.created           post.flagged
message.sent           notification.created
payment.completed      order.placed
```

**Future evolution path:**
1. Current: Redis pub/sub (single-instance, in-memory durability)
2. Next: Redis Streams for persistent, consumer-group semantics
3. Future: Kafka or NATS JetStream for multi-datacenter fan-out

### Phase 7 — Observability and Reliability
**Implemented:**
- Structured logging throughout via `pino` (JSON, ISO timestamps, log levels)
- `X-Request-Id` and `X-Correlation-Id` propagated to all downstream services
- W3C `traceparent` header propagated end-to-end
- `/health` — liveness (uptime, timestamp)
- `/health/ready` — readiness (all dependency checks: DB, Redis)
- `/health/circuits` — circuit breaker states for all services
- `/metrics` — Prometheus text format (counters, histograms, gauges)
- `/api/metrics/summary` — JSON performance summary (admin-protected)

**Error handling:**
- `AppError` class with structured `code`, `statusCode`, `details`
- `globalErrorHandler` middleware with environment-aware stack traces
- `catchAsync` / `asyncHandler` wrappers for controller error propagation

### Phase 8 — Self-Improving Architecture Loop

**Iteration 1 — Initial Design**
- Basic proxy gateway → identified: no circuit breakers, no metrics, no rate limiting

**Iteration 2 — Reliability Layer**
- Added circuit breakers, retry logic, connection timeouts per service
- Added Redis rate limiting with multiple tiers

**Iteration 3 — Security Hardening**
- Replaced `express-graphql` (deprecated, graphql@14/15 only) with `graphql-http`
- Added CORS validation, CSP, HSTS, forwarded identity guard
- Structured security event logging

**Iteration 4 — Observability**
- Added Prometheus metrics, W3C trace context, request ID correlation
- Added deep readiness probe vs. shallow liveness probe distinction

**Iteration 5 — Cloud-Native + Distributed**
- Kubernetes startup probe, PDB, Node.js 20 in CI
- Redis pub/sub event bus for future event-driven evolution

**Remaining improvement opportunities:**
- Redis Streams migration for event bus persistence
- OpenTelemetry SDK integration for distributed tracing
- Service mesh (Istio/Linkerd) for mTLS between services
- CQRS pattern in content-service for read/write separation

### Phase 9 — Engineering Quality
**Code standards applied:**
- No `console.*` in production paths — all replaced with structured `logger.*`
- `asyncHandler`/`catchAsync` wrappers prevent unhandled promise rejections
- Shared utilities are domain-agnostic and reusable across all 9 services
- Configuration validated at startup (fail-fast on missing secrets)
- Package dependency hygiene: removed deprecated `express-graphql`

---

## 4. Technology Decisions

| Component | Choice | Rationale |
|---|---|---|
| GraphQL runtime | `graphql-http@1.x` | Official successor to express-graphql; supports graphql@16 |
| Rate limiting | `express-rate-limit` + Redis store | Distributed, survives pod restarts |
| Auth | JWT (RS256 capable) | Stateless, scalable across services |
| Metrics | Prometheus text format | Standard; scraped by existing Prometheus deployment |
| Caching | Redis + in-process TTL | Fast, shared across replicas |
| Event bus | Redis pub/sub | Zero new infrastructure; upgrade path to Streams/Kafka |
| Container registry | Docker + k8s manifests | Already established; HPA for autoscaling |

---

## 5. Security Notes

See `docs/development/SECURITY_NOTES.md` for full security posture.

Key protections:
- All secrets validated at startup with `assertEnvValid()`
- Internal token (`INTERNAL_GATEWAY_TOKEN`) required for service-to-service calls
- Rate limits enforced per IP and per user to prevent enumeration and abuse
- CSP headers prevent XSS via injected scripts
- HSTS with preload ensures HTTPS enforcement
