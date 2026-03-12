const express = require('express');
const rawProxy = require('express-http-proxy');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const Redis = require('ioredis');
const axios = require('axios');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger-config');
const webhookRoutes = require('./webhook-routes');
const postmanGenerator = require('./postman-generator');
const { reducedDataMode, addDataModeHeaders, getDataModeStats } = require('./reduced-data-mode');
const logger = require('../shared/logger');
const response = require('../shared/response-wrapper');
const { globalErrorHandler, AppError, catchAsync } = require('../shared/errorHandling');
const { v4: uuidv4 } = require('uuid');
const { HealthChecker } = require('../shared/monitoring');
const { getRequiredEnv } = require('../shared/security-utils');
const { assertEnvValid } = require('../shared/env-validator');
const compression = require('compression');
const { getServiceTimeout, executeWithRetry, getCircuitBreakerStates, resetCircuitBreaker } = require('./resilience-config');
const { requestLoggingMiddleware } = require('../shared/logging-utils');
const {
  routeGovernanceMiddleware,
  classificationAuthMiddleware,
  routeRegistryHandler,
  routeOwnershipHandler,
  selectRateLimiter
} = require('./route-governance');
require('dotenv').config({ quiet: true });

// Validate environment at startup
try {
  assertEnvValid({
    strict: process.env.NODE_ENV === 'production',
    additionalSecrets: ['ADMIN_API_SECRET']
  });
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const app = express();
const healthChecker = new HealthChecker('api-gateway');
// main HTTP port for user-facing API gateway
const PORT = process.env.PORT || 8000;
// port where the dedicated security (admin backend) service listens
// default moved to 9102 to avoid conflicts
const SECURITY_PORT = process.env.SECURITY_PORT || 9102;

const JWT_SECRET = getRequiredEnv('JWT_SECRET');
const INTERNAL_GATEWAY_TOKEN = getRequiredEnv('INTERNAL_GATEWAY_TOKEN');
// secret token used by admin frontend/backend for extra protection
const ADMIN_API_SECRET = process.env.ADMIN_API_SECRET || 'change-me';

const proxy = (target, options = {}) => {
  // Extract service name from target URL for resilience config
  const serviceName = target.match(/http:\/\/([^-:]+)/)?.[1] || 'unknown';
  const timeout = options.timeout || getServiceTimeout(serviceName);

  return rawProxy(target, {
    ...options,
    timeout,
    proxyReqOptDecorator: async (proxyReqOpts, srcReq) => {
      let decoratedOpts = proxyReqOpts;

      if (typeof options.proxyReqOptDecorator === 'function') {
        decoratedOpts = await options.proxyReqOptDecorator(proxyReqOpts, srcReq) || proxyReqOpts;
      }

      decoratedOpts.headers = decoratedOpts.headers || {};
      decoratedOpts.headers['x-internal-gateway-token'] = INTERNAL_GATEWAY_TOKEN;

      if (srcReq?.id) {
        decoratedOpts.headers['x-request-id'] = srcReq.id;
        decoratedOpts.headers['x-correlation-id'] = srcReq.id;
      }

      if (srcReq?.traceContext?.traceparent) {
        decoratedOpts.headers.traceparent = srcReq.traceContext.traceparent;
      } else if (srcReq?.headers?.traceparent) {
        decoratedOpts.headers.traceparent = srcReq.headers.traceparent;
      }

      if (srcReq?.headers?.tracestate) {
        decoratedOpts.headers.tracestate = srcReq.headers.tracestate;
      }

      return decoratedOpts;
    },
    proxyErrorHandler: (err, res, next) => {
      // Log timeout and connection errors
      if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
        logger.error(`Proxy error for ${serviceName}:`, {
          code: err.code,
          message: err.message,
          target
        });
      }
      next(err);
    }
  });
};

// Trust proxy headers in containerized environments
app.set('trust proxy', 1);

// Phase 3 — Performance: response-time tracking (set before all other middleware)
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  // Override res.end to inject the header before the response is finalized
  const origEnd = res.end.bind(res);
  res.end = function responseTimeEnd(...args) {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`);
    }
    return origEnd(...args);
  };
  next();
});

// Phase 3 — Performance: smart compression (skip small responses and already-compressed content)
app.use(compression({
  level: 6,
  threshold: 1024, // only compress responses > 1 KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Phase 4 — Security: hardened helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Remove unsafe-inline; use nonces in production for inline scripts if needed
      scriptSrc: ["'self'", 'https://accounts.google.com'],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      mediaSrc: ["'self'", 'https:', 'blob:'],
      connectSrc: ["'self'", 'wss:', 'https:'],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false
}));

// Phase 4 — Security: strip server identification headers
app.disable('x-powered-by');

// helper used by admin-only instance
function requireAdminSecret(req, res, next) {
  const secret = req.headers['x-admin-secret'] || req.query.admin_secret;
  if (secret !== ADMIN_API_SECRET) {
    return res.status(403).json({ error: 'Forbidden - invalid admin token' });
  }
  next();
}

const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  if (corsOrigins.includes(origin)) {
    return true;
  }

  return (
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.endsWith('.app.github.dev')
  );
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With', 'X-User-Id', 'X-API-Version'],
  exposedHeaders: [
    'X-API-Version',
    'X-API-Latest-Version',
    'X-Response-Time',
    'X-Request-Id',
    'X-Correlation-Id',
    'Deprecation',
    'Sunset',
    'X-API-Deprecation',
    'X-API-Migration-Guide',
    'Link'
  ],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
// Express 5 + path-to-regexp is stricter with string wildcards.
// Use a RegExp matcher for global preflight handling.
app.options(/.*/, cors(corsOptions));

// Skip JSON body parsing for Stripe webhook routes so the raw body is preserved
// for signature verification in the downstream shop-service.
const jsonParser = express.json({ limit: '10mb' });
const urlencodedParser = express.urlencoded({ extended: true, limit: '10mb' });
app.use((req, res, next) => {
  if (req.path === '/api/shop/webhooks/stripe') {
    return next(); // forward raw body untouched for Stripe signature verification
  }
  jsonParser(req, res, (err) => {
    if (err) return next(err);
    urlencodedParser(req, res, (err2) => {
      if (err2) return next(err2);
      next();
    });
  });
});

// --------- ADMIN ROUTING REDIRECT ----------
// forward any /admin traffic to the dedicated security service
// SECURITY_PORT should match the port where security-service is running
if (SECURITY_PORT) {
  app.use('/admin', proxy(`http://localhost:${SECURITY_PORT}`));
}

// Add Correlation ID (Request ID)
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Correlation-Id', requestId);
  next();
});

// Distributed trace context propagation (W3C traceparent)
app.use(healthChecker.tracingMiddleware());

// Enhanced structured logging (Phase 2)
app.use(requestLoggingMiddleware('api-gateway'));

// Phase 7: Reduced Data Mode for mobile optimization
app.use(addDataModeHeaders);
app.use(reducedDataMode);

// API Versioning System — registered early so ALL routes (including /api/metrics,
// /health/*, webhooks, etc.) consistently receive X-API-Version + X-API-Latest-Version headers.
// v2 is the current production version. v1 is legacy-supported but deprecated.
const CURRENT_API_VERSION = 'v2';
const SUPPORTED_VERSIONS = ['v1', 'v2'];
const DEPRECATED_VERSIONS = ['v1'];
const V1_SUNSET_DATE = '2027-06-30';

// Version resolution order:
//  1. URL path prefix  — /v2/api/... or /v1/api/...
//  2. Request header   — X-API-Version: v2
//  3. Default          — CURRENT_API_VERSION ('v2')
const versionMiddleware = (req, res, next) => {
  const versionMatch = req.path.match(/^\/(v\d+)\//);

  if (versionMatch) {
    const requestedVersion = versionMatch[1];
    if (!SUPPORTED_VERSIONS.includes(requestedVersion)) {
      return res.status(400).json({
        error: 'Unsupported API version',
        requestedVersion,
        supportedVersions: SUPPORTED_VERSIONS,
        currentVersion: CURRENT_API_VERSION,
        message: `API version ${requestedVersion} is not supported. Use one of: ${SUPPORTED_VERSIONS.join(', ')}`
      });
    }
    req.apiVersion = requestedVersion;
    // Strip version prefix so downstream /api/* proxy mounts work transparently.
    req.url = req.url.replace(/^\/v\d+(?=\/)/, '');
  } else {
    const headerVersion = req.headers['x-api-version'];
    req.apiVersion = (headerVersion && SUPPORTED_VERSIONS.includes(headerVersion))
      ? headerVersion
      : CURRENT_API_VERSION;
  }

  // Version + latest-version headers on every response
  res.setHeader('X-API-Version', req.apiVersion);
  res.setHeader('X-API-Latest-Version', CURRENT_API_VERSION);

  // RFC 8594 deprecation headers for v1 callers
  if (DEPRECATED_VERSIONS.includes(req.apiVersion)) {
    // Deprecation: true (RFC 8594 §2.2 boolean form)
    res.setHeader('Deprecation', 'true');
    // Sunset: HTTP-date (RFC 7231) format required by RFC 8594 §3
    res.setHeader('Sunset', new Date(V1_SUNSET_DATE + 'T23:59:59Z').toUTCString());
    res.setHeader('X-API-Deprecation', `v1 is deprecated. Sunset: ${V1_SUNSET_DATE}. Migrate to v2.`);
    res.setHeader('X-API-Migration-Guide', 'https://docs.milonexa.com/api/migration/v1-to-v2');
    res.setHeader('Link', `<https://docs.milonexa.com/api/migration/v1-to-v2>; rel="successor-version"`);
  }

  next();
};

app.use(versionMiddleware);

// feature toggle for rate limiting
const RATE_LIMITING_ENABLED = process.env.RATE_LIMITING_ENABLED !== 'false';

const getIpRateLimitKey = (req) => rateLimit.ipKeyGenerator(req.ip);
const getUserOrIpRateLimitKey = (req) => req.user?.id || getIpRateLimitKey(req);

let redisClient, sendRedisCommand;
let globalLimiter, userLimiter, strictLimiter, mediaUploadLimiter, aiRequestLimiter, usernameSoftLimiter, usernameLimiter;

if (RATE_LIMITING_ENABLED) {
  // Redis client for rate limiting
  redisClient = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
  sendRedisCommand = (...args) => redisClient.call(...args);

  // Global rate limiter (fallback for unauthenticated requests)
  globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: sendRedisCommand,
      prefix: 'rl:global:'
    }),
    message: { error: 'Too many requests from this IP, please try again later.' }
  });

  // User-based rate limiter (for authenticated requests)
  userLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 requests per window per user
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: sendRedisCommand,
      prefix: 'rl:user:'
    }),
    keyGenerator: (req) => getUserOrIpRateLimitKey(req),
    skip: (req) => {
      return req.path === '/health';
    },
    message: { error: 'Rate limit exceeded. Please try again later.' }
  });

  // Endpoint-specific rate limiters
  strictLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: sendRedisCommand,
      prefix: 'rl:strict:'
    }),
    keyGenerator: (req) => getUserOrIpRateLimitKey(req),
    message: { error: 'Too many attempts. Please wait before trying again.' }
  });

  mediaUploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 uploads per hour
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: sendRedisCommand,
      prefix: 'rl:upload:'
    }),
    keyGenerator: (req) => getUserOrIpRateLimitKey(req),
    message: { error: 'Upload limit reached. Please try again later.' }
  });

  aiRequestLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // 100 AI requests per hour
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: sendRedisCommand,
      prefix: 'rl:ai:'
    }),
    keyGenerator: (req) => getUserOrIpRateLimitKey(req),
    message: { error: 'AI request limit reached. Please try again later.' }
  });

  // Username availability checks - protect against enumeration
  usernameSoftLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({ sendCommand: sendRedisCommand, prefix: 'rl:username-soft:' }),
    keyGenerator: (req) => getIpRateLimitKey(req),
    handler: (req, res) => {
      logger.warn({ ip: req.ip, url: req.originalUrl }, '[rate-limit] username soft-threshold reached — captcha required');
      res.set('X-Captcha-Required', '1');
      res.set('Retry-After', String(Math.ceil(60 * 60)));
      return res.status(429).json({ error: 'captcha_required', message: 'CAPTCHA required for further username checks' });
    }
  });

  usernameLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: sendRedisCommand,
      prefix: 'rl:username:'
    }),
    keyGenerator: (req) => getIpRateLimitKey(req),
    handler: (req, res) => {
      logger.warn({ ip: req.ip, url: req.originalUrl }, '[rate-limit] username check throttled');
      res.set('Retry-After', String(Math.ceil(60 * 60)));
      return res.status(429).json({ error: 'Too many username checks. Please try again later.' });
    }
  });
}

// Apply global rate limiter conditionally
if (RATE_LIMITING_ENABLED) {
  if (process.env.NODE_ENV !== 'development') {
    app.use(globalLimiter);
  } else {
    logger.info('[API Gateway] skipping global rate limiter (development mode)');
  }
}

// shared function to apply user limiter when enabled
const applyUserLimiter = (req, res, next) => {
  if (!RATE_LIMITING_ENABLED) return next();
  if (process.env.NODE_ENV === 'development') return next();
  if (req.originalUrl.startsWith('/api/streaming') ||
    req.originalUrl.startsWith('/api/user/notifications')) {
    return next();
  }
  if (req.user) {
    return userLimiter(req, res, next);
  }
  next();
};

// Route-governance-aware limiter selector
const governanceRateLimiter = (req, res, next) => {
  if (!RATE_LIMITING_ENABLED || process.env.NODE_ENV === 'development') {
    return next();
  }

  const limiter = selectRateLimiter(req.routeConfig, {
    global: globalLimiter,
    user: userLimiter,
    admin: userLimiter
  });

  if (!limiter) {
    return next();
  }

  // Global limiter is already attached app-wide above.
  if (limiter === globalLimiter) {
    return next();
  }

  return limiter(req, res, next);
};

// rate limiting has been disabled entirely; no middleware applied.
// Authentication middleware for private routes
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(new AppError('No token provided', 401, 'AUTHENTICATION_ERROR'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Forward key user attributes
    req.headers['x-user-id'] = decoded.id;
    req.headers['x-user-role'] = decoded.role || '';
    req.headers['x-user-email'] = decoded.email || '';
    req.headers['x-user-is-admin'] = (decoded.isAdmin === true || decoded.role === 'admin') ? 'true' : 'false';
    req.headers['x-request-id'] = req.id;

    next();
  } catch (error) {
    return next(new AppError('Invalid or expired token', 401, 'AUTHENTICATION_ERROR'));
  }
};

// Phase 6: GraphQL API Integration (graphql-http — supports graphql@16)
const { createHandler } = require('graphql-http/lib/use/express');
const { schema, root } = require('./graphql-schema');

// GraphQL endpoint
// graphql-http wraps the Express request; req.raw is the original Express request.
// authMiddleware sets req.user before this handler runs, so req.raw.user is the decoded JWT.
app.use('/graphql', authMiddleware, createHandler({
  schema,
  rootValue: root,
  context: (req) => ({
    userId: req.raw.user?.id,
    user: req.raw.user
  }),
  formatError: (error) => ({
    message: error.message,
    locations: error.locations,
    path: error.path
  })
}));

// GraphQL playground (development only) — served as a standalone HTML page
// pointing at the /graphql endpoint which graphql-http handles.
if (process.env.NODE_ENV !== 'production') {
  app.get('/graphql/playground', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>GraphQL Playground</title>
          <style>
            body { margin: 0; font-family: Arial, sans-serif; }
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            h1 { color: #333; }
            .info { background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .example { background: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 5px; margin: 10px 0; }
            pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
            code { color: #d63384; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>GraphQL API - Milonexa</h1>
            <div class="info">
              <p><strong>Endpoint:</strong> <code>/graphql</code></p>
              <p><strong>Authentication:</strong> Required (Bearer token in Authorization header)</p>
              <p><strong>Tool:</strong> Use <a href="https://studio.apollographql.com/sandbox/explorer" target="_blank">Apollo Sandbox</a> or any GraphQL client pointed at <code>/graphql</code>.</p>
            </div>
            
            <h2>Example Queries</h2>
            
            <div class="example">
              <h3>Get Current User</h3>
              <pre>query {
  user(id: "your-user-id") {
    id
    username
    email
    firstName
    lastName
  }
}</pre>
            </div>
            
            <div class="example">
              <h3>Get Posts Feed</h3>
              <pre>query {
  posts(limit: 20, offset: 0) {
    posts {
      id
      content
      likes
      comments
      createdAt
    }
    total
    hasMore
  }
}</pre>
            </div>
            
            <div class="example">
              <h3>Get Notifications</h3>
              <pre>query {
  notifications(unreadOnly: true, limit: 10) {
    id
    type
    title
    body
    isRead
    createdAt
  }
}</pre>
            </div>
            
            <div class="example">
              <h3>Create Post</h3>
              <pre>mutation {
  createPost(content: "Hello from GraphQL!", type: "text") {
    id
    content
    createdAt
  }
}</pre>
            </div>
            
            <div class="example">
              <h3>Mark Notification as Read</h3>
              <pre>mutation {
  markNotificationRead(id: "notification-id") {
    id
    isRead
  }
}</pre>
            </div>
          </div>
        </body>
      </html>
    `);
  });
}

// Enhanced health checks
app.get('/health/ready', async (req, res) => {
  try {
    const health = await healthChecker.runChecks();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// Prometheus metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(healthChecker.getPrometheusMetrics());
});

// Phase 7 — Observability: human-readable API performance summary (JSON)
app.get('/api/metrics/summary', requireAdminSecret, (req, res) => {
  const { requests, errors, totalResponseTime, inflightRequests } = healthChecker.metrics;
  const uptime = Math.floor((Date.now() - healthChecker.startTime) / 1000);
  const avgResponseTimeMs = requests > 0
    ? (totalResponseTime / requests).toFixed(2)
    : 0;
  const errorRate = requests > 0
    ? ((errors / requests) * 100).toFixed(2)
    : 0;
  const mem = process.memoryUsage();

  res.json({
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime,
    requests: {
      total: requests,
      errors,
      inflight: inflightRequests,
      errorRate: `${errorRate}%`,
      avgResponseTimeMs: Number(avgResponseTimeMs)
    },
    memory: {
      heapUsedMB: Number((mem.heapUsed / 1024 / 1024).toFixed(1)),
      rssUsedMB: Number((mem.rss / 1024 / 1024).toFixed(1))
    },
    circuits: getCircuitBreakerStates()
  });
});

// Metrics tracking middleware
app.use(healthChecker.metricsMiddleware());

// Health check
app.get('/health', (req, res) => {
  res.json(healthChecker.getBasicHealth());
});

// Circuit breaker status endpoint (Phase 2 - Resilience monitoring)
app.get('/health/circuits', (req, res) => {
  const circuits = getCircuitBreakerStates();
  const hasOpenCircuits = circuits.some(c => c.state === 'OPEN');

  res.status(hasOpenCircuits ? 503 : 200).json({
    status: hasOpenCircuits ? 'degraded' : 'healthy',
    circuits,
    timestamp: new Date().toISOString()
  });
});

// Manual circuit breaker reset endpoint (admin use)
app.post('/health/circuits/:serviceName/reset', requireAdminSecret, (req, res) => {
  const { serviceName } = req.params;
  const success = resetCircuitBreaker(serviceName);

  if (success) {
    logger.info(`Circuit breaker reset for ${serviceName}`);
    res.json({ success: true, message: `Circuit breaker for ${serviceName} reset` });
  } else {
    res.status(404).json({ success: false, message: `Circuit breaker for ${serviceName} not found` });
  }
});

// Data mode info endpoint (Phase 7)
app.get('/api/data-mode/info', (req, res) => {
  res.json(getDataModeStats());
});

// Rate limiting has been removed; the rate-limit-status endpoint is no longer needed and has been deleted.

// Apply route governance on all API routes
app.use('/api', routeGovernanceMiddleware, governanceRateLimiter, classificationAuthMiddleware);

// Phase 7: Webhooks System (registered after governance so it is subject to governance + version headers)
app.use('/api/webhooks', authMiddleware, webhookRoutes);

// Governance introspection endpoints (admin secret required)
app.get('/api/internal/routes', requireAdminSecret, routeRegistryHandler);
app.get('/api/internal/route-ownership', requireAdminSecret, routeOwnershipHandler);

// API version info endpoint
app.get('/api/version', (req, res) => {
  res.json({
    platform: 'Milonexa',
    currentVersion: CURRENT_API_VERSION,
    defaultVersion: CURRENT_API_VERSION,
    requestedVersion: req.apiVersion,
    supportedVersions: SUPPORTED_VERSIONS,
    deprecatedVersions: DEPRECATED_VERSIONS,
    deprecations: {
      v1: {
        sunsetDate: V1_SUNSET_DATE,
        status: 'deprecated',
        migrationGuide: 'https://docs.milonexa.com/api/migration/v1-to-v2',
        breakingChanges: [
          'Pagination changed from offset-based to cursor-based',
          'All timestamps return ISO 8601 format',
          'Standardized error response envelope (code, message, details)',
          'GraphQL endpoint available at /graphql'
        ]
      }
    },
    releases: {
      v2: {
        releaseDate: '2026-03-12',
        status: 'current',
        maturity: 'production',
        features: [
          'GraphQL API (graphql-http, graphql@16)',
          'X-Response-Time header on every response',
          'Smart compression (threshold 1 KB, Brotli-compatible)',
          'Redis-backed tiered rate limiting (global / user / strict / AI)',
          'W3C traceparent distributed tracing',
          'Prometheus metrics at /metrics',
          'Per-route circuit breakers with automatic retry',
          'Deep readiness probe (/health/ready)',
          'Redis pub/sub event bus (shared/event-bus.js)',
          'Route governance with classification (PUBLIC / PRIVATE / ADMIN)',
          'Unified search fan-out across user, content, streaming',
          'Reduced data mode for mobile clients',
          'Webhooks system for external integrations',
          'API key header versioning (X-API-Version)',
          'RFC 8594 Deprecation/Sunset headers for v1 callers'
        ]
      },
      v1: {
        releaseDate: '2025-01-01',
        status: 'deprecated',
        maturity: 'legacy',
        sunsetDate: V1_SUNSET_DATE,
        features: [
          'RESTful API',
          'JWT authentication',
          'Basic rate limiting'
        ]
      }
    }
  });
});

// API changelog endpoint
app.get('/api/changelog', (req, res) => {
  res.json({
    versions: [
      {
        version: 'v2',
        releaseDate: '2026-03-12',
        status: 'current',
        maturity: 'production',
        changes: [
          { type: 'feature', description: 'GraphQL API endpoint (/graphql) using graphql-http + graphql@16' },
          { type: 'feature', description: 'X-Response-Time response header for all requests' },
          { type: 'feature', description: 'Smart compression (1 KB threshold, level 6)' },
          { type: 'feature', description: 'Redis pub/sub event bus for async service communication' },
          { type: 'feature', description: 'Prometheus metrics endpoint (/metrics)' },
          { type: 'feature', description: 'JSON performance summary (/api/metrics/summary)' },
          { type: 'feature', description: 'Route governance with classification and per-route rate limiting' },
          { type: 'feature', description: 'W3C traceparent distributed tracing propagation' },
          { type: 'feature', description: 'Unified search across users, posts, groups, channels' },
          { type: 'feature', description: 'Reduced data mode for mobile bandwidth savings' },
          { type: 'feature', description: 'Kubernetes startup probe, PodDisruptionBudget, HPA 2-10 replicas' },
          { type: 'improvement', description: 'Deep readiness probe (/health/ready) with dependency checks' },
          { type: 'improvement', description: 'Per-service circuit breakers with configurable thresholds' },
          { type: 'improvement', description: 'X-API-Version header-based versioning supported' },
          { type: 'improvement', description: 'RFC 8594 Deprecation + Sunset headers for v1 callers' },
          { type: 'security', description: 'app.disable(x-powered-by) to remove server fingerprint' },
          { type: 'security', description: 'Helmet CSP, HSTS preload, Referrer-Policy hardened' },
          { type: 'security', description: 'All rate-limit events emit structured pino log entries' }
        ]
      },
      {
        version: 'v1',
        releaseDate: '2025-01-01',
        status: 'deprecated',
        maturity: 'legacy',
        sunsetDate: V1_SUNSET_DATE,
        changes: [
          { type: 'feature', description: 'Initial API release' },
          { type: 'feature', description: 'RESTful endpoints for all services' },
          { type: 'feature', description: 'JWT-based authentication' }
        ]
      }
    ]
  });
});

// Service routes configuration
const services = {
  user: 'http://user-service:8001',
  content: 'http://content-service:8002',
  messaging: 'http://messaging-service:8003',
  collaboration: 'http://collaboration-service:8004',
  media: 'http://media-service:8005',
  shop: 'http://shop-service:8006',
  ai: 'http://ai-service:8007',
  streaming: 'http://streaming-service:8009'
};

// Public routes (no authentication required)
const publicRoutes = [
  '/api/content/public',
  '/api/content/search',
  '/api/content/groups',
  '/api/content/discover/groups',
  '/api/content/discover/content',
  '/api/content/videos/public',
  '/api/media/public',
  '/api/shop/public',
  '/api/shop/webhooks/stripe',
  '/api/collaboration/public',
  '/api/collaboration/meetings/public',
  '/api/user/search',
  '/api/user/pages/search',
  '/api/user/discover/people',
  '/api/ai/search/summary',
  '/api/ai/search/semantic-expand',
  '/api/user/register',
  '/api/user/login',
  '/api/user/logout',
  '/api/user/refresh',
  '/api/user/forgot-password',
  '/api/user/reset-password',
  '/api/user/verify-email',
  '/api/user/resend-verification',
  '/api/user/check-username',
  '/api/user/check-email',
  '/api/user/public/stats',
  '/api/public/',
  '/api/auth/oauth/google/authorize',
  '/api/auth/oauth/google/callback',
  '/api/auth/oauth/github/authorize',
  '/api/auth/oauth/github/callback',
  '/api/messaging/webhooks/',
  '/api/messaging/bots/telegram/webhook/'
];

// Check if route is public
const isPublicRoute = (path) => {
  return publicRoutes.some(route => path.startsWith(route));
};

// Proxy middleware with conditional authentication
const createAuthProxy = (target) => {
  return (req, res, next) => {
    if (isPublicRoute(req.originalUrl)) {
      return next();
    }
    return authMiddleware(req, res, next);
  };
};

// rate limiting has been removed; authenticated routes are no longer throttled.
// Authentication endpoints – rate limiting removed (nothing applied here)
// e.g. app.use('/api/user/login', /* no limiter */);
// rate limiting removed from registration and password reset endpoints
// app.use('/api/user/register', /* no limiter */);
// app.use('/api/user/password-reset', /* no limiter */);

// --- public streaming proxy ------------------------------------------------
// The client uses /api/streaming/proxy?url=... to fetch remote images/playlists.
// These requests should not require authentication or rate limiting because
// they are triggered implicitly by browsing the radio/TV UI.  Configure a
// bare proxy ahead of the auth middleware so the gateway simply forwards the
// request to the streaming-service without adding headers.
app.use(
  '/api/streaming/proxy',
  proxy(services.streaming, {
    proxyReqPathResolver: (req) => req.originalUrl.replace('/api/streaming', ''),
    userResHeaderDecorator: (headers) => headers // leave headers intact
  })
);
// rate limiting removed from forgot/reset-password
// app.use('/api/user/forgot', /* no limiter */);
// app.use('/api/user/reset-password', /* no limiter */);

// --- /api/public/* — platform-level public endpoints served directly by the gateway ---
app.get('/api/public/features', (req, res) => {
  res.json({
    success: true,
    data: {
      features: [
        { id: 'social-feed', title: 'Social Feed', description: 'Share posts, images, and videos with your network. Rich text, emoji reactions, and real-time updates.', icon: 'Groups', category: 'social', available: true },
        { id: 'real-time-chat', title: 'Real-time Chat', description: 'Message friends, groups, and communities with end-to-end encrypted conversations.', icon: 'Chat', category: 'communication', available: true },
        { id: 'live-streaming', title: 'Live TV & Radio', description: 'Stream live TV channels and internet radio stations with adaptive bitrate playback.', icon: 'Tv', category: 'media', available: true },
        { id: 'video-platform', title: 'Video Platform', description: 'Upload, watch and share videos with channel subscriptions and playlists.', icon: 'VideoLibrary', category: 'media', available: true },
        { id: 'groups', title: 'Groups & Communities', description: 'Create and join groups, manage events, and collaborate with like-minded people.', icon: 'Group', category: 'social', available: true },
        { id: 'pages', title: 'Creator Pages', description: 'Build a professional presence for businesses, creators, and organizations.', icon: 'Pages', category: 'creator', available: true },
        { id: 'collaboration', title: 'Collaboration', description: 'Create docs, wikis, tasks, and manage projects together in real time.', icon: 'Description', category: 'productivity', available: true },
        { id: 'shop', title: 'Marketplace', description: 'Buy and sell products with integrated payments, reviews, and order management.', icon: 'ShoppingCart', category: 'commerce', available: true },
        { id: 'meetings', title: 'Video Meetings', description: 'Schedule and join secure video meetings and webinars with screen sharing.', icon: 'VideoCall', category: 'communication', available: true },
        { id: 'ai-assistant', title: 'AI Assistant', description: 'AI-powered content suggestions, smart search, and conversation summaries.', icon: 'AutoAwesome', category: 'ai', available: true }
      ]
    }
  });
});

app.get('/api/public/stats', (req, res) => {
  // Proxy to user-service for live user count; serve gateway-level stats as fallback
  res.json({
    success: true,
    data: {
      platform: 'Milonexa',
      version: '2.0.0',
      uptime: process.uptime(),
      services: Object.keys(services).length,
      features: 10,
      userCount: 52000
    }
  });
});

// ─── Unified Search Endpoint ────────────────────────────────────────────────
// Fans out to user-service (users/pages), content-service (posts/groups),
// and streaming-service (channels) in parallel and merges results.
app.get('/api/search', authMiddleware, applyUserLimiter, async (req, res) => {
  const { q, types, limit: limitStr, page: pageStr } = req.query;
  if (!q || String(q).trim().length === 0) {
    return res.status(400).json({ error: 'Query parameter "q" is required', code: 'MISSING_QUERY' });
  }

  const query = String(q).trim();
  const limit = Math.min(20, Math.max(1, parseInt(limitStr) || 10));
  const page = Math.max(1, parseInt(pageStr) || 1);
  const requestedTypes = types ? String(types).split(',').map((t) => t.trim()) : ['users', 'posts', 'groups', 'channels'];

  const gatewayToken = INTERNAL_GATEWAY_TOKEN;
  const userId = req.userId;

  const headers = {
    'x-internal-gateway-token': gatewayToken,
    'x-user-id': userId || '',
    'x-request-id': req.id || ''
  };

  const fanOut = async (type) => {
    try {
      if (type === 'users') {
        // user-service /search uses query= param
        const resp = await axios.get(`${services.user}/search?query=${encodeURIComponent(query)}&type=users&limit=${limit}&page=${page}`, { headers, timeout: 3000 });
        return { type, items: resp.data?.data || resp.data?.results || [] };
      }
      if (type === 'pages') {
        // pages search is a dedicated endpoint
        const resp = await axios.get(`${services.user}/pages/search?query=${encodeURIComponent(query)}&limit=${limit}&page=${page}`, { headers, timeout: 3000 });
        return { type, items: resp.data?.data || resp.data?.results || [] };
      }
      if (type === 'posts' || type === 'groups') {
        // content-service /search uses query= param
        const resp = await axios.get(`${services.content}/search?query=${encodeURIComponent(query)}&type=${type}&limit=${limit}&page=${page}`, { headers, timeout: 3000 });
        return { type, items: resp.data?.data || resp.data?.results || [] };
      }
      if (type === 'channels') {
        const resp = await axios.get(`${services.streaming}/channels/search?q=${encodeURIComponent(query)}&limit=${limit}&page=${page}`, { headers, timeout: 3000 });
        return { type, items: resp.data?.data || resp.data?.results || resp.data?.channels || [] };
      }
      return { type, items: [] };
    } catch (err) {
      logger.warn(`[search] fan-out failed for type=${type}: ${err.message}`);
      return { type, items: [], error: err.message };
    }
  };

  try {
    const results = await Promise.all(requestedTypes.map(fanOut));
    const resultMap = {};
    results.forEach(({ type, items, error }) => {
      resultMap[type] = { items, count: items.length, ...(error ? { error } : {}) };
    });
    const totalCount = results.reduce((sum, { items }) => sum + items.length, 0);

    res.json({
      success: true,
      data: {
        query,
        totalCount,
        results: resultMap,
        meta: { page, limit, types: requestedTypes }
      }
    });
  } catch (err) {
    logger.error('[search] unified search error:', err);
    res.status(500).json({ error: 'Search failed', code: 'SEARCH_ERROR' });
  }
});

// Expose username availability (rate limiting has been removed)
app.use('/api/user/check-username', RATE_LIMITING_ENABLED ? usernameSoftLimiter : (req, res, next) => next(), RATE_LIMITING_ENABLED ? usernameLimiter : (req, res, next) => next(), proxy(services.user, {
  proxyReqPathResolver: function (req) {
    return req.originalUrl.replace('/api/user', '');
  }
}));

// Backward-compatible alias: route /api/user/notifications* to messaging-service.
app.use('/api/user/notifications', authMiddleware, applyUserLimiter, proxy(services.messaging, {
  proxyReqPathResolver: function (req) {
    return req.originalUrl.replace('/api/user', '');
  }
}));

// User Service routes
app.use('/api/user', createAuthProxy(services.user), applyUserLimiter, proxy(services.user, {
  proxyReqPathResolver: function (req) {
    return req.originalUrl.replace('/api/user', '');
  }
}));

// Content Service routes
app.use('/api/content', createAuthProxy(services.content), applyUserLimiter, proxy(services.content, {
  proxyReqPathResolver: function (req) {
    return req.originalUrl.replace('/api/content', '');
  }
}));

// Messaging Service routes
app.use('/api/messaging', createAuthProxy(services.messaging), applyUserLimiter, proxy(services.messaging, {
  proxyReqPathResolver: function (req) {
    return req.originalUrl.replace('/api/messaging', '');
  }
}));

// Collaboration Service routes
app.use('/api/collaboration', createAuthProxy(services.collaboration), applyUserLimiter, proxy(services.collaboration, {
  proxyReqPathResolver: function (req) {
    return req.originalUrl.replace('/api/collaboration', '');
  }
}));

// Media Service upload route (upload limiter removed)
app.use('/api/media/upload', createAuthProxy(services.media), applyUserLimiter, proxy(services.media, {
  proxyReqPathResolver: function (req) {
    return req.originalUrl.replace('/api/media', '');
  }
}));

app.use('/api/media', createAuthProxy(services.media), applyUserLimiter, proxy(services.media, {
  proxyReqPathResolver: function (req) {
    return req.originalUrl.replace('/api/media', '');
  }
}));

// Shop Service routes
app.use('/api/shop', createAuthProxy(services.shop), applyUserLimiter, proxy(services.shop, {
  proxyReqPathResolver: function (req) {
    return req.originalUrl.replace('/api/shop', '');
  }
}));

// AI Service routes (rate limiting removed)
app.use('/api/ai', createAuthProxy(services.ai), applyUserLimiter, proxy(services.ai, {
  proxyReqPathResolver: function (req) {
    return req.originalUrl.replace('/api/ai', '');
  }
}));

// Streaming Service routes (IPFM/IPTV)
app.use('/api/streaming', createAuthProxy(services.streaming), applyUserLimiter, proxy(services.streaming, {
  proxyReqPathResolver: function (req) {
    return req.originalUrl.replace('/api/streaming', '');
  }
}));

// WebRTC Call routes (Phase 4) - proxy to messaging service
app.use('/calls', createAuthProxy(services.messaging), proxy(services.messaging, {
  proxyReqPathResolver: function (req) {
    return req.originalUrl; // Keep the /calls prefix
  }
}));

// Database routes (Phase 4) - proxy to collaboration service
app.use('/databases', createAuthProxy(services.collaboration), proxy(services.collaboration, {
  proxyReqPathResolver: function (req) {
    return req.originalUrl; // Keep the /databases prefix
  }
}));

// Wiki routes (Phase 4) - proxy to collaboration service
app.use('/wikis', createAuthProxy(services.collaboration), proxy(services.collaboration, {
  proxyReqPathResolver: function (req) {
    return req.originalUrl; // Keep the /wikis prefix
  }
}));

// OAuth Routes (proxy to user-service)
// Google OAuth authorize endpoint
app.get('/api/auth/oauth/google/authorize', (req, res, next) => {
  const returnUrl = encodeURIComponent(req.query.returnUrl || 'http://localhost:3000');
  const userServiceUrl = `${services.user}/oauth/google/authorize?returnUrl=${returnUrl}`;
  proxy(services.user, {
    proxyReqPathResolver: function (req) {
      return `/oauth/google/authorize?returnUrl=${returnUrl}`;
    }
  })(req, res, next);
});

// Google OAuth callback endpoint
app.get('/api/auth/oauth/google/callback', (req, res, next) => {
  proxy(services.user, {
    proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
      // user-service callback accepts POST body code/query code. Keep GET query path.
      return proxyReqOpts;
    },
    proxyReqPathResolver: function (req) {
      const qIndex = req.url.indexOf('?');
      const query = qIndex >= 0 ? req.url.substring(qIndex) : '';
      return `/oauth/google/callback${query}`;
    }
  })(req, res, next);
});

// GitHub OAuth authorize endpoint
app.get('/api/auth/oauth/github/authorize', (req, res, next) => {
  const returnUrl = encodeURIComponent(req.query.returnUrl || 'http://localhost:3000');
  proxy(services.user, {
    proxyReqPathResolver: function (req) {
      return `/oauth/github/authorize?returnUrl=${returnUrl}`;
    }
  })(req, res, next);
});

// GitHub OAuth callback endpoint
app.get('/api/auth/oauth/github/callback', (req, res, next) => {
  proxy(services.user, {
    proxyReqPathResolver: function (req) {
      const qIndex = req.url.indexOf('?');
      const query = qIndex >= 0 ? req.url.substring(qIndex) : '';
      return `/oauth/github/callback${query}`;
    }
  })(req, res, next);
});

// Phase 7: Swagger/OpenAPI Documentation
// Swagger UI options
const swaggerOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Milonexa API Documentation',
  customfavIcon: '/favicon.ico'
};

// Swagger JSON endpoint
app.get('/api/docs/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Swagger UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));

// Postman Collection export (Phase 7)
app.get('/api/docs/postman', (req, res) => {
  try {
    const collection = postmanGenerator.exportPostmanCollection();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="milonexa-api.postman_collection.json"');
    res.send(collection);
  } catch (error) {
    console.error('Postman collection generation error:', error);
    res.status(500).json({ error: 'Failed to generate Postman collection' });
  }
});

// Postman Collection info
app.get('/api/docs/postman/info', (req, res) => {
  try {
    const info = postmanGenerator.getCollectionInfo();
    res.json(info);
  } catch (error) {
    console.error('Postman collection info error:', error);
    res.status(500).json({ error: 'Failed to get collection info' });
  }
});

// Redoc alternative documentation (optional, lighter weight)
app.get('/api/redoc', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Milonexa API Documentation</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
        <style>
          body {
            margin: 0;
            padding: 0;
          }
        </style>
      </head>
      <body>
        <redoc spec-url='/api/docs/swagger.json'></redoc>
        <script src="https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js"></script>
      </body>
    </html>
  `);
});

// Friendly root endpoint (avoid default "Cannot GET /")
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'api-gateway',
    message: 'API Gateway is running.',
    docs: '/api/docs',
    health: '/health'
  });
});

// Phase 19: Web Vitals analytics ingestion endpoint
app.post('/api/analytics/vitals', (req, res) => {
  const metric = req.body;
  if (metric && metric.name) {
    // Store in Redis with short TTL for real-time dashboards; log for aggregation
    if (redisClient && redisClient.status === 'ready') {
      const key = `vitals:${metric.name}:${Date.now()}`;
      redisClient.setEx(key, 86400, JSON.stringify(metric)).catch(() => {});
    }
    logger.info({ name: metric.name, value: metric.value, rating: metric.rating, url: metric.url }, '[Vitals]');
  }
  res.status(204).end();
});


// Standard route fallback
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `The requested endpoint '${req.originalUrl}' does not exist.`
    }
  });
});

// Global Error Handling
app.use(globalErrorHandler);

app.listen(PORT, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV }, 'API Gateway running');
  logger.info({ services: Object.keys(services) }, 'Service routes configured');
});

// ----------------------------------------------------------
// Optional admin-only listener (separate port for security)
// ----------------------------------------------------------
