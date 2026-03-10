# Workstream E Implementation Guide
# Backend Service Standardization

**Status:** ✅ Completed March 10, 2026  
**Deliverables:** E1 (Service Blueprint), E2 (Reliability Patterns), E3 (Security Standards)

---

## Executive Summary

Workstream E establishes consistent quality baselines across all 9 backend services. This workstream delivers:

- **E1: Service Blueprint Standard** - Standardized folder structure, validation, response wrappers, structured logging
- **E2: Reliability & Scalability Patterns** - Graceful shutdown, health checks, backpressure handling
- **E3: Security Standards** - Authorization checks, input sanitization, secrets validation

---

## Architecture Overview

### Services Covered

1. **user-service** (PORT 8001) - User authentication, profiles, organizations
2. **content-service** (PORT 8002) - Posts, comments, likes, feeds
3. **messaging-service** (PORT 8003) - Chat, notifications, WebRTC calls
4. **collaboration-service** (PORT 8004) - Wikis, databases, whiteboards, meetings
5. **media-service** (PORT 8005) - Image/video upload, processing, storage
6. **shop-service** (PORT 8006) - Products, cart, orders, payments
7. **ai-service** (PORT 8007) - AI content generation, recommendations
8. **streaming-service** (PORT 9) - IPFM/IPTV radio and TV streaming
9. **security-service** - Admin panel security and moderation

### Shared Utilities

All new shared utilities are located in `services/shared/`:

```
services/shared/
├── validation.js              # Request schema validation (Joi-based)
├── graceful-shutdown.js       # SIGTERM/SIGINT handling
├── health-check.js            # Liveness and readiness probes
├── sanitization.js            # Input sanitization (XSS, SQL injection prevention)
├── authorization.js           # Role-based access control (RBAC)
├── response-wrapper.js        # Standardized response format (updated)
├── errorHandling.js           # ✅ Existing - AppError classes
├── logger.js                  # ✅ Existing - Pino structured logging
├── security-utils.js          # ✅ Existing - Forwarded identity guard
├── env-validator.js           # ✅ Existing - Startup environment validation
└── SERVICE_BLUEPRINT.md       # Complete service template and guide
```

---

## E1: Service Blueprint Standard

### Standard Folder Structure

```
service-name/
├── server.js                   # Entry point with graceful shutdown
├── src/
│   ├── routes/                # Route definitions
│   │   ├── index.js          # Route aggregator
│   │   ├── public.routes.js  # Public endpoints
│   │   └── protected.routes.js # Protected endpoints
│   ├── controllers/           # Business logic controllers
│   ├── services/              # Service layer (data access)
│   ├── validators/            # Joi validation schemas
│   ├── models/                # Sequelize models
│   └── repositories/          # Optional: Complex queries
├── migrations/                # Database migrations
└── tests/                     # Unit, integration, E2E tests
```

### Request Schema Validation

**File:** `services/shared/validation.js`

**Features:**
- Joi-based schema validation
- Pre-built common schemas (id, email, password, username, pagination)
- Helper validators for common cases
- File upload validation
- Automatic error formatting

**Usage Example:**

```javascript
const { validate, validators, Joi } = require('../shared/validation');

// Pre-built validators
router.get('/resources', validators.pagination(), handler);
router.get('/resources/:id', validators.idParam('id'), handler);
router.post('/register', validators.userRegistration(), handler);

// Custom validation
router.post('/resources', validate({
  body: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    content: Joi.string().min(1).max(10000).required(),
    type: Joi.string().valid('text', 'image', 'video'),
    tags: Joi.array().items(Joi.string()).max(10)
  })
}), handler);
```

**Common Schemas:**
- `commonSchemas.id` - UUID validation
- `commonSchemas.email` - Email with normalization
- `commonSchemas.password` - 8-128 chars with strength requirements
- `commonSchemas.username` - 3-30 alphanumeric chars
- `commonSchemas.pagination` - page, limit, sort, sortBy
- `commonSchemas.timestamp` - ISO 8601 date
- `commonSchemas.url` - Valid URL
- `commonSchemas.phoneNumber` - E.164 format

### Response Wrappers

**File:** `services/shared/response-wrapper.js` (updated)

**Success Response:**

```javascript
const responseWrapper = require('../shared/response-wrapper');

// Standard success response
responseWrapper.success(req, res, data, meta, statusCode);

// Example
responseWrapper.success(req, res, { userId: '123' }, {}, 201);

// Output:
{
  "success": true,
  "data": { "userId": "123" },
  "meta": {
    "requestId": "abc-def-ghi",
    "timestamp": "2026-03-10T12:00:00Z"
  }
}
```

**Paginated Response:**

```javascript
responseWrapper.paginated(req, res, items, {
  page: 1,
  limit: 20,
  total: 150
});

// Output:
{
  "success": true,
  "data": [...items...],
  "meta": {
    "requestId": "abc-def-ghi",
    "timestamp": "2026-03-10T12:00:00Z",
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasMore": true
    }
  }
}
```

**Error Response (use AppError classes instead):**

```javascript
responseWrapper.error(req, res, 'VALIDATION_ERROR', 'Invalid input', 400, details);
```

### Structured Logging

**File:** `services/shared/logger.js` (existing)

**Usage:**

```javascript
const logger = require('../shared/logger');

// Log with context
logger.info('Resource created', {
  resourceId: resource.id,
  userId: req.user?.id,
  requestId: req.id
});

logger.error('Database query failed', {
  error: error.message,
  stack: error.stack,
  query: 'SELECT * FROM ...',
  requestId: req.id
});

logger.warn('Deprecated endpoint accessed', {
  path: req.path,
  userId: req.user?.id
});
```

**Best Practices:**
- Always include `requestId` for request correlation
- Include relevant context (userId, resourceId, etc.)
- Use appropriate log levels (debug, info, warn, error)
- Don't log sensitive data (passwords, tokens, PII)

---

## E2: Reliability & Scalability Patterns

### Graceful Shutdown

**File:** `services/shared/graceful-shutdown.js`

**Features:**
- SIGTERM/SIGINT signal handling
- Configurable shutdown timeout (default: 30s)
- Health check grace period (5s to mark unhealthy)
- Sequential cleanup handlers with priorities
- Active connection tracking
- Uncaught exception handling

**Usage:**

```javascript
const { initGracefulShutdown, createDatabaseCleanup } = require('../shared/graceful-shutdown');

// Initialize graceful shutdown
const server = app.listen(PORT);
const shutdownManager = initGracefulShutdown(app, server, {
  shutdownTimeout: 30000,
  healthcheckGracePeriod: 5000,
  logger
});

// Register cleanup handlers
shutdownManager.registerCleanup(
  'database',
  createDatabaseCleanup(db.sequelize),
  10  // Priority (lower = higher priority)
);

shutdownManager.registerCleanup(
  'redis',
  createRedisCleanup(redisClient),
  20
);

// Custom cleanup
shutdownManager.registerCleanup('custom', async () => {
  await myResource.close();
}, 30);
```

**Shutdown Sequence:**

1. Receive SIGTERM/SIGINT signal
2. Wait for health check grace period (5s) - gives load balancer time to remove instance
3. Close all active HTTP connections
4. Run cleanup handlers in priority order (low to high)
5. Exit with code 0 (success) or 1 (error)

**Kubernetes Integration:**

```yaml
spec:
  containers:
  - name: service
    lifecycle:
      preStop:
        exec:
          command: ["/bin/sh", "-c", "sleep 5"]  # Matches healthcheckGracePeriod
    livenessProbe:
      httpGet:
        path: /health
        port: 8001
      initialDelaySeconds: 10
      periodSeconds: 10
    readinessProbe:
      httpGet:
        path: /ready
        port: 8001
      initialDelaySeconds: 5
      periodSeconds: 5
```

### Health Checks

**File:** `services/shared/health-check.js`

**Features:**
- Liveness probe (`/health`) - lightweight, no dependencies
- Readiness probe (`/ready`) - full dependency checks
- Configurable dependency timeouts
- Required vs. optional dependencies
- Automatic status determination (healthy, degraded, unhealthy)

**Usage:**

```javascript
const { createHealthCheck, setupHealthRoutes } = require('../shared/health-check');

// Create health check manager
const healthCheck = createHealthCheck('user-service', {
  version: '1.0.0',
  database: db.sequelize,        // Auto-registered as required
  redis: redisClient,             // Auto-registered as optional
  redisRequired: false,
  shutdownManager                 // Integrates with graceful shutdown
});

// Register custom checks
healthCheck.registerDependency('external-api', async () => {
  const response = await axios.get('https://api.external.com/health');
  if (response.status !== 200) {
    throw new Error('API unhealthy');
  }
}, {
  required: false,
  timeout: 3000,
  metadata: { url: 'https://api.external.com' }
});

// Setup routes
setupHealthRoutes(app, healthCheck);
```

**Endpoint Responses:**

**GET /health (Liveness):**

```json
{
  "status": "healthy",
  "service": "user-service",
  "version": "1.0.0",
  "uptime": 123456,
  "timestamp": "2026-03-10T12:00:00Z",
  "shutting_down": false
}
```

**GET /ready (Readiness):**

```json
{
  "status": "healthy",
  "service": "user-service",
  "version": "1.0.0",
  "uptime": 123456,
  "timestamp": "2026-03-10T12:00:00Z",
  "checks": [
    {
      "name": "database",
      "status": "healthy",
      "responseTime": 15,
      "error": null,
      "metadata": {},
      "timestamp": "2026-03-10T12:00:00Z"
    },
    {
      "name": "redis",
      "status": "healthy",
      "responseTime": 8,
      "error": null,
      "metadata": {},
      "timestamp": "2026-03-10T12:00:00Z"
    },
    {
      "name": "memory",
      "status": "healthy",
      "responseTime": 2,
      "error": null,
      "metadata": {},
      "timestamp": "2026-03-10T12:00:00Z"
    }
  ]
}
```

**Status Determination:**
- `healthy` - All required checks passed
- `degraded` - Required checks passed, but optional checks failed
- `unhealthy` - At least one required check failed

### Backpressure Strategy

**Best Practices:**

1. **Rate Limiting** - Use route classifications from Workstream D
2. **Request Timeouts** - Set per-endpoint timeouts for long operations
3. **Queue Management** - Use bull/bee-queue for async job processing
4. **Database Connection Pooling** - Configure Sequelize pools per service profile

**Sequelize Pool Configuration:**

```javascript
// config/database.js
module.exports = {
  production: {
    // ... connection details
    pool: {
      max: 20,              // Maximum connections
      min: 5,               // Minimum connections
      acquire: 30000,       // Max time to get connection (ms)
      idle: 10000,          // Max time connection can be idle (ms)
      evict: 1000           // How often to check for idle connections (ms)
    },
    retry: {
      max: 3                // Max retry attempts
    }
  }
};
```

**Async Job Offloading:**

```javascript
// For expensive operations (email, image processing, reports)
const Queue = require('bull');
const emailQueue = new Queue('email', process.env.REDIS_URL);

// Producer
await emailQueue.add('welcome-email', { userId, email });

// Consumer (separate process)
emailQueue.process('welcome-email', async (job) => {
  await sendWelcomeEmail(job.data);
});
```

---

## E3: Security Standards

### Authorization (RBAC)

**File:** `services/shared/authorization.js`

**Features:**
- Role-based access control (admin, moderator, user, guest)
- Permission-based access control
- Role hierarchy
- Ownership checks
- Authorization middleware

**Roles:**
```javascript
const Roles = {
  ADMIN: 'admin',         // Full access (hierarchy: 100)
  MODERATOR: 'moderator', // Moderation access (hierarchy: 50)
  USER: 'user',           // Normal user (hierarchy: 10)
  GUEST: 'guest'          // Limited access (hierarchy: 0)
};
```

**Permissions:**
```javascript
const Permissions = {
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  USER_DELETE: 'user:delete',
  USER_BAN: 'user:ban',
  
  CONTENT_CREATE: 'content:create',
  CONTENT_READ: 'content:read',
  CONTENT_UPDATE: 'content:update',
  CONTENT_DELETE: 'content:delete',
  CONTENT_MODERATE: 'content:moderate',
  
  ADMIN_ACCESS: 'admin:access',
  ADMIN_SETTINGS: 'admin:settings',
  
  SHOP_MANAGE: 'shop:manage',
  SHOP_ORDERS: 'shop:orders',
  
  MODERATE_CONTENT: 'moderate:content',
  MODERATE_USERS: 'moderate:users'
};
```

**Usage:**

```javascript
const {
  requireAuth,
  requireRole,
  requirePermission,
  requireOwnership,
  requireAdmin,
  requireModerator,
  Roles,
  Permissions
} = require('../shared/authorization');

// Require authentication
router.use(requireAuth);

// Require specific role
router.post('/admin/settings', requireAdmin, controller.updateSettings);
router.post('/moderate/content', requireModerator, controller.moderate);

// Require permission
router.post('/posts', requirePermission(Permissions.CONTENT_CREATE), controller.create);
router.delete('/users/:id', requirePermission(Permissions.USER_DELETE), controller.delete);

// Require multiple permissions (any)
router.put('/posts/:id', 
  requirePermission(Permissions.CONTENT_UPDATE, Permissions.CONTENT_MODERATE),
  controller.update
);

// Require ownership or admin
router.put('/posts/:id',
  requireOwnership(async (req) => {
    return await Post.findByPk(req.params.id);
  }),
  controller.update
);
```

**Controller Usage:**

```javascript
const { isOwner, hasRole, hasPermission, Roles } = require('../shared/authorization');

exports.updatePost = async (req, res) => {
  const post = await Post.findByPk(req.params.id);
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];
  
  // Check ownership or admin
  if (!isOwner({ id: userId }, post) && !hasRole({ role: userRole }, Roles.ADMIN)) {
    throw new AuthorizationError('You do not own this post');
  }
  
  // Update post
  await post.update(req.body);
  return responseWrapper.success(req, res, post);
};
```

### Input Sanitization

**File:** `services/shared/sanitization.js`

**Features:**
- XSS prevention
- SQL injection detection
- HTML sanitization (strict and rich text modes)
- Email, URL, filename sanitization
- Security audit logging

**Usage:**

```javascript
const {
  sanitizeText,
  sanitizeRichText,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeFilename,
  sanitizeFields,
  createSanitizationMiddleware,
  securityAuditMiddleware
} = require('../shared/sanitization');

// Manual sanitization
const sanitized = {
  username: sanitizeText(input.username, { maxLength: 30, lowercase: true }),
  email: sanitizeEmail(input.email),
  bio: sanitizeRichText(input.bio),
  website: sanitizeUrl(input.website, { allowedProtocols: ['http', 'https'] }),
  avatar: sanitizeFilename(input.avatar)
};

// Middleware for automatic sanitization
router.post('/posts',
  createSanitizationMiddleware({
    title: 'text',
    content: 'richText',
    author: 'text',
    website: 'url'
  }),
  controller.create
);

// Security audit middleware (logs suspicious input)
app.use(securityAuditMiddleware(logger));
```

**Sanitization Functions:**

| Function | Purpose | Example |
|----------|---------|---------|
| `sanitizeText(input, options)` | Remove all HTML, trim, limit length | `"Hello <script>alert('xss')</script>"` → `"Hello"` |
| `sanitizeRichText(input, options)` | Allow safe HTML tags (p, strong, em, a, etc.) | Preserves formatting, removes dangerous tags |
| `sanitizeEmail(input)` | Normalize email, validate format | `"User@Example.COM"` → `"user@example.com"` |
| `sanitizeUrl(input, options)` | Validate URL, check protocol | Ensures http/https only |
| `sanitizeFilename(input)` | Remove path traversal, dangerous chars | `"../../etc/passwd"` → `"etcpasswd"` |
| `sanitizePhoneNumber(input)` | Extract digits, normalize format | `"+1 (555) 123-4567"` → `"+15551234567"` |

**Rich Text Config:**

Allows safe HTML tags for formatted content:
- Formatting: `<p>`, `<br>`, `<strong>`, `<em>`, `<u>`, `<s>`, `<code>`, `<pre>`
- Headings: `<h1>` through `<h6>`
- Lists: `<ul>`, `<ol>`, `<li>`
- Links: `<a href="...">` (forced to `target="_blank" rel="noopener noreferrer"`)
- Quotes: `<blockquote>`

**XSS/SQL Injection Detection:**

```javascript
const { detectXss, detectSqlInjection } = require('../shared/sanitization');

if (detectXss(userInput)) {
  logger.warn('XSS attempt detected', { userId, input: userInput });
}

if (detectSqlInjection(userInput)) {
  logger.warn('SQL injection attempt detected', { userId, input: userInput });
}
```

### Secrets Validation

**File:** `services/shared/env-validator.js` (existing, enhanced)

**Features:**
- Validates required environment variables at startup
- Detects placeholder secrets (your-secret-key, change-this, etc.)
- Fail-fast on missing/insecure secrets in production
- Configurable strict/lenient modes

**Usage:**

```javascript
const { validateEnv } = require('../shared/env-validator');

// Validate at startup
const validation = validateEnv({
  strict: process.env.NODE_ENV === 'production',
  additionalSecrets: ['STRIPE_SECRET_KEY', 'AWS_SECRET_ACCESS_KEY'],
  skipDatabase: false
});

if (!validation.valid) {
  logger.error('Environment validation failed', { errors: validation.errors });
  process.exit(1);
}
```

**Checked Secrets:**
- `JWT_SECRET`
- `INTERNAL_GATEWAY_TOKEN`
- `ADMIN_API_SECRET`
- `ADMIN_JWT_SECRET`
- Database credentials (POSTGRES_PASSWORD, APP_DB_PASSWORD)
- Custom secrets via `additionalSecrets` option

---

## Migration Guide

### Step 1: Update server.js

```javascript
// Add graceful shutdown
const { initGracefulShutdown, createDatabaseCleanup } = require('../shared/graceful-shutdown');

const server = app.listen(PORT);
const shutdownManager = initGracefulShutdown(app, server);
shutdownManager.registerCleanup('database', createDatabaseCleanup(db.sequelize), 10);

// Add health checks
const { createHealthCheck, setupHealthRoutes } = require('../shared/health-check');
const healthCheck = createHealthCheck('service-name', { database: db.sequelize });
setupHealthRoutes(app, healthCheck);

// Add security audit
const { securityAuditMiddleware } = require('../shared/sanitization');
app.use(securityAuditMiddleware(logger));

// Validate environment
const { validateEnv } = require('../shared/env-validator');
const validation = validateEnv({ strict: process.env.NODE_ENV === 'production' });
if (!validation.valid) {
  logger.error('Environment validation failed', validation);
  process.exit(1);
}
```

### Step 2: Add Validation to Routes

```javascript
const { validate, validators, Joi } = require('../shared/validation');

// Before: No validation
router.post('/posts', controller.create);

// After: With validation
router.post('/posts',
  validate({
    body: Joi.object({
      title: Joi.string().min(3).max(200).required(),
      content: Joi.string().required()
    })
  }),
  controller.create
);
```

### Step 3: Add Authorization Checks

```javascript
const { requireAuth, requirePermission, Permissions } = require('../shared/authorization');

// Apply to all routes
router.use(requireAuth);

// Per-route permissions
router.post('/posts', requirePermission(Permissions.CONTENT_CREATE), controller.create);
router.delete('/posts/:id', requirePermission(Permissions.CONTENT_DELETE), controller.delete);
```

### Step 4: Sanitize Input in Controllers

```javascript
const { sanitizeText, sanitizeRichText } = require('../shared/sanitization');

exports.create = async (req, res) => {
  const sanitized = {
    title: sanitizeText(req.body.title),
    content: sanitizeRichText(req.body.content)
  };
  
  const post = await Post.create({ ...sanitized, userId: req.user.id });
  return responseWrapper.success(req, res, post, {}, 201);
};
```

### Step 5: Update Response Format

```javascript
const responseWrapper = require('../shared/response-wrapper');

// Before
res.status(200).json({ success: true, data: post });

// After
responseWrapper.success(req, res, post);

// Pagination
responseWrapper.paginated(req, res, posts, { page, limit, total });
```

### Step 6: Add Structured Logging

```javascript
const logger = require('../shared/logger');

logger.info('Post created', {
  postId: post.id,
  userId: req.user.id,
  requestId: req.id
});
```

---

## Testing

### Unit Tests (Services)

```javascript
const resourceService = require('../src/services/resource.service');

describe('Resource Service', () => {
  it('should create resource', async () => {
    const data = { title: 'Test', content: 'Content' };
    const resource = await resourceService.create(data);
    
    expect(resource).toBeDefined();
    expect(resource.title).toBe('Test');
  });
});
```

### Integration Tests (Controllers)

```javascript
const request = require('supertest');
const app = require('../server').app;

describe('Resource Controller', () => {
  it('should create resource', async () => {
    const res = await request(app)
      .post('/api/resources')
      .set('Authorization', 'Bearer token')
      .send({ title: 'Test', content: 'Content' });
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
  
  it('should reject invalid input', async () => {
    const res = await request(app)
      .post('/api/resources')
      .set('Authorization', 'Bearer token')
      .send({ title: 'X' }); // Too short
    
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

### E2E Tests (Health Checks)

```javascript
describe('Health Checks', () => {
  it('should return healthy status', async () => {
    const res = await request(app).get('/health');
    
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });
  
  it('should check all dependencies', async () => {
    const res = await request(app).get('/ready');
    
    expect(res.status).toBe(200);
    expect(res.body.checks).toBeDefined();
    expect(res.body.checks.length).toBeGreaterThan(0);
  });
});
```

---

## Metrics & Monitoring

### Key Metrics

**Service Health:**
- Liveness status (healthy/unhealthy)
- Readiness status (healthy/degraded/unhealthy)
- Dependency response times
- Uptime

**Request Metrics:**
- Request rate (requests/sec)
- Response time (p50, p95, p99)
- Error rate (%)
- Validation failures

**Security Metrics:**
- Authentication failures
- Authorization failures
- XSS/SQL injection attempts
- Rate limit hits

### Prometheus Metrics

```javascript
// In health-check.js or separate metrics middleware
const register = new promClient.Registry();

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

// Expose /metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(register.metrics());
});
```

---

## Benefits

**For Development Team:**
- Consistent patterns across all services
- Reduced boilerplate code
- Faster onboarding for new developers
- Easier code reviews

**For Operations:**
- Standardized health checks for monitoring
- Graceful shutdown for zero-downtime deployments
- Better observability with structured logs
- Predictable error handling

**For Security:**
- Centralized authorization logic
- Automatic input sanitization
- Security audit logging
- Secrets validation at startup

**For Users:**
- Faster response times (backpressure handling)
- Better error messages (standardized format)
- More reliable service (health checks, graceful shutdown)

---

## References

- Service Blueprint: `services/shared/SERVICE_BLUEPRINT.md`
- Validation: `services/shared/validation.js`
- Graceful Shutdown: `services/shared/graceful-shutdown.js`
- Health Checks: `services/shared/health-check.js`
- Sanitization: `services/shared/sanitization.js`
- Authorization: `services/shared/authorization.js`
- Response Wrapper: `services/shared/response-wrapper.js`
- Error Handling: `services/shared/errorHandling.js`

---

**Implemented by:** Platform Team  
**Date:** March 10, 2026  
**Status:** ✅ Complete - Ready for Service Migration
