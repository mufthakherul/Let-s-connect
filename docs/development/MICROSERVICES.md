# Microservices Architecture Guide

This document describes the architecture, boundaries, and patterns used across Milonexa's microservices.

---

## Table of Contents

1. [Service Responsibilities](#1-service-responsibilities)
2. [Inter-Service Communication](#2-inter-service-communication)
3. [Shared Module (`services/shared/`)](#3-shared-module-servicesshared)
4. [Adding a New Service](#4-adding-a-new-service)
5. [Service Startup Pattern](#5-service-startup-pattern)
6. [Circuit Breaker Pattern](#6-circuit-breaker-pattern)
7. [Route Governance](#7-route-governance)
8. [Internal Headers](#8-internal-headers)
9. [Service Health Endpoints](#9-service-health-endpoints)
10. [API Response Format](#10-api-response-format)

---

## 1. Service Responsibilities

### `api-gateway` (port 8000)

The single entry point for all external requests.

**Responsibilities:**
- JWT authentication and token validation
- Request routing to downstream services
- Rate limiting (Redis sliding window via `express-rate-limit`)
- Circuit breaker per downstream service
- `x-user-id` header injection for authenticated requests
- `x-request-id` header injection for distributed tracing
- Swagger/OpenAPI documentation (`/api-docs`)
- GraphQL endpoint (`/graphql`) via `graphql-http`
- Health aggregation endpoint (`/health/ready`)

**Does NOT:**
- Contain business logic
- Access the database directly
- Store state (stateless by design)

### `user-service` (port 8001)

**Responsibilities:**
- User registration and authentication (email/password + OAuth)
- JWT access and refresh token issuance
- User profiles, profile photos
- Friend requests and connections
- Page management
- Notifications
- User settings (privacy, preferences)
- Email verification and password reset (OTP)
- 2FA/TOTP setup
- OAuth provider integration (Google, GitHub, Discord, Apple)

**Models:** User, Profile, Friend, Page, Notification, Settings

### `content-service` (port 8002)

**Responsibilities:**
- Posts (create, read, update, delete, share)
- Social feed (home feed, user feed, group feed)
- Comments and nested replies
- Reactions (like, love, etc.)
- Groups and communities
- Blogs and articles
- Content moderation flags (`isFlagged`, `flagReason`, `toxicityScore`)
- Video content metadata (not storage — that's media-service)
- Bookmarks and saved content

**Models:** Post, Comment, Group, Community, Blog, Video, Reaction

### `messaging-service` (port 8003)

**Responsibilities:**
- Direct messages and group conversations
- Discord-style servers and channels
- Real-time messaging via Socket.io
- Message reactions, pins, and thread replies
- WebRTC call signaling
- Typing indicators and presence
- Message history and search
- Read receipts

**Models:** Conversation, Message, Server, Channel, WebRTCCall

### `collaboration-service` (port 8004)

**Responsibilities:**
- Collaborative document editing (Google Docs-style)
- Document versioning
- Wiki pages and wiki history
- Tasks and issues (Jira-style)
- Projects and milestones
- Meeting scheduling
- Real-time collaborative sessions

**Models:** Document, DocumentVersion, CollaborativeSession, Wiki, WikiHistory, Task, Issue, Project, Milestone, Meeting

### `media-service` (port 8005)

**Responsibilities:**
- File upload handling (multipart/form-data)
- Media metadata storage
- MinIO S3 object storage proxy
- Image resizing and thumbnails
- Video processing metadata
- Pre-signed URL generation for direct client uploads
- Media access control

**Models:** MediaFile

### `shop-service` (port 8006)

**Responsibilities:**
- Product catalog (CRUD)
- Shopping cart
- Order processing
- Stripe payment integration
- Order history
- Product reviews and ratings
- Wishlist
- Inventory management

**Models:** Product, Order, Cart, Review, Wishlist

### `ai-service` (port 8007)

**Responsibilities:**
- AI-powered text completions (Gemini API or Ollama)
- Content recommendations
- Smart search suggestions
- Toxicity detection for content moderation
- AI-assisted writing
- Semantic search integration

**Models:** (No persistent models — stateless inference service)

### `streaming-service` (port 8009)

**Responsibilities:**
- Radio station catalog and streaming URLs
- TV channel catalog
- Live stream metadata
- Stream scheduling

**Models:** RadioStation, TvChannel

### `security-service` (port 9102)

**Responsibilities:**
- Admin security operations
- Audit trail (immutable admin action logs)
- Content moderation queue
- Admin proxying and access control
- Break-glass emergency access
- IP allowlist enforcement
- Threat detection and alerting

---

## 2. Inter-Service Communication

### Synchronous: HTTP via API Gateway

External clients always go through the API gateway. The gateway injects the authenticated user's ID as a header.

```
Client → api-gateway:8000 → user-service:8001
                           → content-service:8002
                           → ...
```

For direct service-to-service calls that bypass the gateway (internal), services use the `INTERNAL_GATEWAY_TOKEN`:

```js
const response = await axios.get(`http://user-service:8001/internal/users/${userId}`, {
  headers: {
    'x-internal-gateway-token': process.env.INTERNAL_GATEWAY_TOKEN
  }
});
```

### Asynchronous: Redis Pub/Sub Event Bus

For decoupled, fire-and-forget events, services use the shared `EventBus`:

```js
const { EventBus } = require('../shared/event-bus');

// Publisher (user-service after registration)
await bus.publish('user.registered', { userId, email, username });

// Subscriber (content-service — create welcome post)
bus.subscribe('user.registered', async ({ userId }) => {
  await createWelcomeContent(userId);
});
```

See [EVENT_BUS.md](EVENT_BUS.md) for the full event catalog.

---

## 3. Shared Module (`services/shared/`)

The `services/shared/` directory contains utilities shared across all services. Services require these modules relative to their own directory.

### `logger.js`

Winston structured JSON logger with configurable level.

```js
const { createLogger } = require('../shared/logger');
const logger = createLogger('user-service');

logger.info('User registered', { userId, email });
logger.error('Database error', { error: err.message });
```

### `response-wrapper.js`

Standardised API response format. All responses use this wrapper.

```js
const response = require('../shared/response-wrapper');

// Success response
response.success(req, res, data, meta, statusCode);
// → { success: true, data: {...}, meta: {...}, requestId: '...' }

// Error response
response.error(req, res, statusCode, message, details);
// → { success: false, error: { message, details }, requestId: '...' }
```

### `errorHandling.js`

`AppError` class for structured business errors, plus Express global error middleware.

```js
const { AppError } = require('../shared/errorHandling');

// Throw a structured error
throw new AppError('User not found', 404, 'USER_NOT_FOUND');

// In router setup, register the global handler last:
const { errorHandler } = require('../shared/errorHandling');
app.use(errorHandler);
```

### `db-sync-policy.js`

Sequelize sync mode controller. Reads `DB_SCHEMA_MODE` env var.

```js
const { syncWithPolicy } = require('../shared/db-sync-policy');
const sequelize = require('./db');

// Call this after all models are defined
await syncWithPolicy(sequelize);
// migrate → sequelize.sync({ alter: false })
// alter   → sequelize.sync({ alter: true })
// force   → sequelize.sync({ force: true })  ← DANGEROUS
```

### `caching.js`

Redis-backed cache with graceful degradation.

```js
const { CacheManager } = require('../shared/caching');
const cache = new CacheManager({ redisUrl: process.env.REDIS_URL });

await cache.set('user_profile', userId, userData, 900); // TTL: 15 min
const cached = await cache.get('user_profile', userId);
await cache.invalidate('user_profile', userId);
```

See [CACHING.md](CACHING.md) for full documentation.

### `event-bus.js`

Redis pub/sub event bus for async inter-service communication.

```js
const { EventBus } = require('../shared/event-bus');
const Redis = require('ioredis');

const publishClient = new Redis(process.env.REDIS_URL);
const subscribeClient = new Redis(process.env.REDIS_URL);
const bus = new EventBus(publishClient, subscribeClient);
```

See [EVENT_BUS.md](EVENT_BUS.md) for full documentation.

### `monitoring.js`

Prometheus metrics and health check utilities.

```js
const { HealthChecker, registerMetrics } = require('../shared/monitoring');

const healthChecker = new HealthChecker();
healthChecker.addCheck('database', async () => sequelize.authenticate());
healthChecker.addCheck('redis', async () => redisClient.ping());

// Register in Express
app.get('/health', healthChecker.handler());
app.get('/metrics', metricsHandler());
```

### `security-utils.js`

Utility for requiring environment variables at startup.

```js
const { getRequiredEnv } = require('../shared/security-utils');

// Throws immediately at startup if variable is missing
const jwtSecret = getRequiredEnv('JWT_SECRET');
const encryptionKey = getRequiredEnv('ENCRYPTION_KEY');
```

This pattern ensures that services fail fast with a clear error message rather than silently using undefined secrets.

---

## 4. Adding a New Service

To add a new microservice to the platform:

### Step 1: Create the service directory

```bash
mkdir -p services/my-new-service/src
cd services/my-new-service
npm init -y
npm install express dotenv sequelize pg ioredis
npm install --save-dev jest nodemon
```

### Step 2: Create `src/index.js` following the startup pattern

See [Service Startup Pattern](#5-service-startup-pattern) below.

### Step 3: Add to `docker-compose.yml`

```yaml
my-new-service:
  build: ./services/my-new-service
  ports:
    - "8010:8010"
  environment:
    - NODE_ENV=${NODE_ENV}
    - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
    - REDIS_URL=${REDIS_URL}
    - JWT_SECRET=${JWT_SECRET}
    - INTERNAL_GATEWAY_TOKEN=${INTERNAL_GATEWAY_TOKEN}
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
  networks:
    - milonexa-net
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8010/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

### Step 4: Register route in `api-gateway`

Add the new service to the API gateway's routing configuration and circuit breaker config (`services/api-gateway/src/resilience-config.js`).

### Step 5: Add to CI matrix

Add `my-new-service` to the matrix in `.github/workflows/ci.yml`.

### Step 6: Add a `Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 8010
CMD ["node", "src/index.js"]
```

---

## 5. Service Startup Pattern

All services follow this consistent startup pattern:

```js
// src/index.js
require('dotenv').config();
const express = require('express');
const { getRequiredEnv } = require('../shared/security-utils');
const { createLogger } = require('../shared/logger');
const { syncWithPolicy } = require('../shared/db-sync-policy');
const { errorHandler } = require('../shared/errorHandling');
const { HealthChecker } = require('../shared/monitoring');
const sequelize = require('./db');
const router = require('./routes');

const logger = createLogger('my-service');
const PORT = process.env.PORT || 8010;

// Validate required secrets at startup
getRequiredEnv('JWT_SECRET');
getRequiredEnv('ENCRYPTION_KEY');
getRequiredEnv('INTERNAL_GATEWAY_TOKEN');

async function start() {
  try {
    // Sync database schema
    await syncWithPolicy(sequelize);
    logger.info('Database synced');

    const app = express();
    app.use(express.json({ limit: '10mb' }));

    // Health check
    const health = new HealthChecker();
    health.addCheck('database', () => sequelize.authenticate());
    app.get('/health', health.handler());
    app.get('/health/ready', health.handler());

    // Routes
    app.use('/api', router);

    // Global error handler (must be last)
    app.use(errorHandler);

    app.listen(PORT, () => {
      logger.info(`my-service running on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start service', { error: err.message });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await sequelize.close();
  process.exit(0);
});

start();
```

---

## 6. Circuit Breaker Pattern

The API gateway implements per-service circuit breakers configured in `services/api-gateway/src/resilience-config.js`.

States:
- **Closed** — Normal operation; requests flow through
- **Open** — Service is failing; requests fail fast without hitting the service
- **Half-Open** — Testing if service recovered; one request allowed through

Circuit breaker configuration per service:

```js
// services/api-gateway/src/resilience-config.js
module.exports = {
  'user-service': {
    failureThreshold: 5,       // Open after 5 consecutive failures
    successThreshold: 2,       // Close after 2 successes in half-open
    timeout: 30000,            // 30s before trying half-open
    requestTimeout: 10000,     // 10s per request timeout
  },
  'content-service': {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
    requestTimeout: 15000,
  },
  // ... other services
};
```

When a circuit is open, the gateway returns:

```json
{
  "success": false,
  "error": {
    "message": "Service temporarily unavailable",
    "code": "CIRCUIT_OPEN"
  }
}
```

---

## 7. Route Governance

Routes are classified in `services/api-gateway/src/route-governance.js`:

| Classification | Auth Required | Rate Limit | Example Routes |
|---|---|---|---|
| `public` | No | Standard | `GET /api/content/posts`, `GET /api/shop/products` |
| `authenticated` | Yes (JWT) | Standard | `POST /api/content/posts`, `GET /api/user/profile` |
| `admin` | Yes (admin role) | Strict | `GET /api/security/audit`, admin panel APIs |
| `internal` | Yes (gateway token) | None | `/internal/*` endpoints between services |

---

## 8. Internal Headers

Headers injected or consumed by the API gateway:

| Header | Direction | Description |
|---|---|---|
| `x-user-id` | Gateway → Service | Authenticated user's UUID, injected by gateway after JWT validation |
| `x-internal-gateway-token` | Service → Service | Shared secret for bypassing public auth on internal routes |
| `x-request-id` | Gateway → All | UUID for distributed request tracing. Returned in all responses. |
| `x-api-version` | Client → Gateway | Requested API version (`v1`, `v2`). Defaults to `v2`. |
| `authorization` | Client → Gateway | `Bearer <accessToken>` JWT for authentication |

Services trust `x-user-id` only when `x-internal-gateway-token` is also present or when the request comes from the gateway subnet.

---

## 9. Service Health Endpoints

Every service implements two health endpoints:

### `GET /health`

Returns the service's own health status:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "user-service",
  "version": "1.0.0",
  "uptime": 3600
}
```

Returns HTTP 200 if healthy, HTTP 503 if not.

### `GET /health/ready`

Returns health of all dependencies (database, Redis, etc.):

```json
{
  "status": "ready",
  "checks": {
    "database": { "status": "healthy", "latency": 2 },
    "redis": { "status": "healthy", "latency": 1 }
  }
}
```

Returns HTTP 200 if all checks pass, HTTP 503 if any fail. Used by load balancers and Kubernetes readiness probes.

---

## 10. API Response Format

All API responses follow the `response-wrapper.js` format:

### Success

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  },
  "requestId": "uuid-v4"
}
```

### Error

```json
{
  "success": false,
  "error": {
    "message": "User not found",
    "code": "USER_NOT_FOUND",
    "details": null
  },
  "requestId": "uuid-v4"
}
```

### Pagination meta

```json
{
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```
