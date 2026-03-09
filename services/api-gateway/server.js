const express = require('express');
const rawProxy = require('express-http-proxy');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const Redis = require('ioredis');
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

const proxy = (target, options = {}) => rawProxy(target, {
  ...options,
  proxyReqOptDecorator: async (proxyReqOpts, srcReq) => {
    let decoratedOpts = proxyReqOpts;

    if (typeof options.proxyReqOptDecorator === 'function') {
      decoratedOpts = await options.proxyReqOptDecorator(proxyReqOpts, srcReq) || proxyReqOpts;
    }

    decoratedOpts.headers = decoratedOpts.headers || {};
    decoratedOpts.headers['x-internal-gateway-token'] = INTERNAL_GATEWAY_TOKEN;

    if (srcReq?.id) {
      decoratedOpts.headers['x-request-id'] = srcReq.id;
    }

    return decoratedOpts;
  }
});

// Trust proxy headers in containerized environments
app.set('trust proxy', 1);

// Standard Optimizations for both gateways
app.use(compression());
app.use(helmet());

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
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With', 'X-User-Id'],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
// Express 5 + path-to-regexp is stricter with string wildcards.
// Use a RegExp matcher for global preflight handling.
app.options(/.*/, cors(corsOptions));
app.use(express.json());

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
  next();
});

// Log requests
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    requestId: req.id
  });
  next();
});

// Phase 7: Reduced Data Mode for mobile optimization
app.use(addDataModeHeaders);
app.use(reducedDataMode);

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
      console.warn(`[rate-limit] username soft-threshold reached for ip=${req.ip} url=${req.originalUrl}`);
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
      console.warn(`[rate-limit] username check throttled for ip=${req.ip} url=${req.originalUrl}`);
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
    console.info('[API Gateway] skipping global rate limiter (development mode)');
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

// Phase 6: GraphQL API Integration
const { graphqlHTTP } = require('express-graphql');
const { schema, root } = require('./graphql-schema');

// GraphQL endpoint
app.use('/graphql', authMiddleware, graphqlHTTP((req) => ({
  schema: schema,
  rootValue: root,
  graphiql: process.env.NODE_ENV !== 'production', // Enable GraphiQL in development
  context: {
    userId: req.user?.id,
    user: req.user
  },
  customFormatErrorFn: (error) => ({
    message: error.message,
    locations: error.locations,
    path: error.path
  })
})));

// GraphQL playground (development only)
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
              <p><strong>GraphiQL Interface:</strong> <a href="/graphql">Open GraphiQL</a></p>
              <p><strong>Authentication:</strong> Required (Bearer token)</p>
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

// Metrics tracking middleware
app.use(healthChecker.metricsMiddleware());

// Health check
app.get('/health', (req, res) => {
  res.json(healthChecker.getBasicHealth());
});

// Data mode info endpoint (Phase 7)
app.get('/api/data-mode/info', (req, res) => {
  res.json(getDataModeStats());
});

// Rate limiting has been removed; the rate-limit-status endpoint is no longer needed and has been deleted.

// Phase 7: Webhooks System
app.use('/api/webhooks', authMiddleware, webhookRoutes);

// Phase 6: API Versioning System
const API_VERSION = process.env.API_VERSION || 'v1';
const SUPPORTED_VERSIONS = ['v1', 'v2'];

// API version middleware
const versionMiddleware = (req, res, next) => {
  // Extract version from URL path (/v1/api/..., /v2/api/...)
  const versionMatch = req.path.match(/^\/(v\d+)\//);

  if (versionMatch) {
    const requestedVersion = versionMatch[1];

    if (!SUPPORTED_VERSIONS.includes(requestedVersion)) {
      return res.status(400).json({
        error: 'Unsupported API version',
        requestedVersion,
        supportedVersions: SUPPORTED_VERSIONS,
        message: `API version ${requestedVersion} is not supported. Please use one of: ${SUPPORTED_VERSIONS.join(', ')}`
      });
    }

    req.apiVersion = requestedVersion;

    // Strip version segment from URL so existing /api/* proxy mounts work
    // for both /api/* and /vN/api/* forms.
    req.url = req.url.replace(/^\/v\d+(?=\/)/, '');

    // Add deprecation warning for old versions
    if (requestedVersion === 'v1') {
      res.setHeader('X-API-Deprecation', 'v1 API will be deprecated on 2026-12-31. Please migrate to v2.');
      res.setHeader('X-API-Migration-Guide', 'https://docs.milonexa.com/api/migration/v1-to-v2');
    }
  } else {
    // Default to v1 if no version specified
    req.apiVersion = 'v1';
  }

  res.setHeader('X-API-Version', req.apiVersion);
  next();
};

// Apply version middleware globally
app.use(versionMiddleware);

// API version info endpoint
app.get('/api/version', (req, res) => {
  res.json({
    currentVersion: API_VERSION,
    requestedVersion: req.apiVersion,
    supportedVersions: SUPPORTED_VERSIONS,
    deprecations: {
      v1: {
        sunsetDate: '2026-12-31',
        migrationGuide: 'https://docs.milonexa.com/api/migration/v1-to-v2',
        changes: [
          'Authentication: JWT tokens now require refresh tokens',
          'Pagination: Changed from offset-based to cursor-based',
          'Response format: All timestamps now in ISO 8601 format',
          'Error codes: Standardized error response structure'
        ]
      }
    },
    changelog: {
      v2: {
        releaseDate: '2026-06-01',
        features: [
          'GraphQL API support',
          'WebSocket subscriptions for real-time updates',
          'Improved rate limiting with per-endpoint policies',
          'Enhanced filtering and search capabilities'
        ]
      },
      v1: {
        releaseDate: '2025-01-01',
        status: 'deprecated',
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
        releaseDate: '2026-06-01',
        status: 'current',
        changes: [
          { type: 'feature', description: 'Added GraphQL API gateway' },
          { type: 'feature', description: 'Implemented WebSocket subscriptions' },
          { type: 'improvement', description: 'Enhanced rate limiting with Redis' },
          { type: 'breaking', description: 'Changed pagination to cursor-based' },
          { type: 'breaking', description: 'Standardized timestamp format to ISO 8601' }
        ]
      },
      {
        version: 'v1',
        releaseDate: '2025-01-01',
        status: 'deprecated',
        sunsetDate: '2026-12-31',
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
  '/api/content/videos/public',
  '/api/media/public',
  '/api/shop/public',
  '/api/collaboration/public',
  '/api/collaboration/meetings/public',
  '/api/user/register',
  '/api/user/login',
  '/api/user/check-username',
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
  console.log(`API Gateway running on port ${PORT}`);
  console.log('Service routes configured:');
  Object.entries(services).forEach(([name, url]) => {
    console.log(`  - ${name}: ${url}`);
  });
});

// ----------------------------------------------------------
// Optional admin-only listener (separate port for security)
// ----------------------------------------------------------
