const express = require('express');
const proxy = require('express-http-proxy');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger-config');
const webhookRoutes = require('./webhook-routes');
const postmanGenerator = require('./postman-generator');
const { reducedDataMode, addDataModeHeaders, getDataModeStats } = require('./reduced-data-mode');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Trust proxy headers in containerized environments
app.set('trust proxy', 1);

// Redis client for rate limiting
const redisClient = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
const sendRedisCommand = (...args) => redisClient.call(...args);

// Security middleware
app.use(helmet());

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
app.options('*', cors(corsOptions));
app.use(express.json());

// Phase 7: Reduced Data Mode for mobile optimization
app.use(addDataModeHeaders);
app.use(reducedDataMode);

// Phase 6: Enhanced Rate Limiting with Redis

// Global rate limiter (fallback for unauthenticated requests)
const globalLimiter = rateLimit({
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
const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per window per user
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: sendRedisCommand,
    prefix: 'rl:user:'
  }),
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise fall back to IP
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
  message: { error: 'Rate limit exceeded. Please try again later.' }
});

// Endpoint-specific rate limiters
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: sendRedisCommand,
    prefix: 'rl:strict:'
  }),
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'Too many attempts. Please wait before trying again.' }
});

const mediaUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: sendRedisCommand,
    prefix: 'rl:upload:'
  }),
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'Upload limit reached. Please try again later.' }
});

const aiRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 AI requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: sendRedisCommand,
    prefix: 'rl:ai:'
  }),
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'AI request limit reached. Please try again later.' }
});

// Apply global rate limiter
app.use(globalLimiter);

// Authentication middleware for private routes
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    // Forward authenticated user ID to downstream services
    req.headers['x-user-id'] = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
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
            <h1>GraphQL API - Let's Connect</h1>
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Data mode info endpoint (Phase 7)
app.get('/api/data-mode/info', (req, res) => {
  res.json(getDataModeStats());
});

// Phase 6: Rate limit status endpoint
app.get('/api/rate-limit-status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.ip;

    // Define max limits for each tier
    const maxLimits = {
      global: 100,
      user: 500,
      strict: 10,
      upload: 50,
      ai: 100
    };

    const keys = [
      `rl:global:${req.ip}`,
      `rl:user:${userId}`,
      `rl:strict:${userId}`,
      `rl:upload:${userId}`,
      `rl:ai:${userId}`
    ];

    const limits = {};

    for (const key of keys) {
      const ttl = await redisClient.ttl(key);
      const count = await redisClient.get(key);

      const limitType = key.split(':')[1];
      const used = count ? parseInt(count) : 0;
      const max = maxLimits[limitType] || 100;

      limits[limitType] = {
        used: used,
        remaining: Math.max(0, max - used),
        limit: max,
        resetIn: ttl > 0 ? ttl : 0,
        key: key
      };
    }

    res.json({
      userId,
      limits,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Rate limit status error:', error);
    res.status(500).json({ error: 'Failed to fetch rate limit status' });
  }
});

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

    // Add deprecation warning for old versions
    if (requestedVersion === 'v1') {
      res.setHeader('X-API-Deprecation', 'v1 API will be deprecated on 2026-12-31. Please migrate to v2.');
      res.setHeader('X-API-Migration-Guide', 'https://docs.letsconnect.com/api/migration/v1-to-v2');
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
        migrationGuide: 'https://docs.letsconnect.com/api/migration/v1-to-v2',
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
  '/api/media/public',
  '/api/shop/public',
  '/api/collaboration/public',
  '/api/collaboration/meetings/public',
  '/api/user/register',
  '/api/user/login',
  '/api/auth/oauth/google/authorize',
  '/api/auth/oauth/google/callback',
  '/api/auth/oauth/github/authorize',
  '/api/auth/oauth/github/callback'
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

// Apply user-based rate limiter after authentication
const applyUserLimiter = (req, res, next) => {
  // Only apply to authenticated requests
  if (req.user) {
    return userLimiter(req, res, next);
  }
  next();
};

// Authentication endpoints with strict rate limiting (must be before /api/user proxy)
app.use('/api/user/login', strictLimiter);
app.use('/api/user/register', strictLimiter);
app.use('/api/user/password-reset', strictLimiter);
app.use('/api/user/forgot', strictLimiter);
app.use('/api/user/reset-password', strictLimiter);

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

// Media Service routes with upload limiter
app.use('/api/media/upload', createAuthProxy(services.media), mediaUploadLimiter, proxy(services.media, {
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

// AI Service routes with AI-specific limiter
app.use('/api/ai', createAuthProxy(services.ai), aiRequestLimiter, proxy(services.ai, {
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
    proxyReqPathResolver: function (req) {
      return `/oauth/google/callback${req.url.substring(req.url.indexOf('?'))}`;;
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
      return `/oauth/github/callback${req.url.substring(req.url.indexOf('?'))}`;;
    }
  })(req, res, next);
});

// Phase 7: Swagger/OpenAPI Documentation
// Swagger UI options
const swaggerOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Let\'s Connect API Documentation',
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
    res.setHeader('Content-Disposition', 'attachment; filename="lets-connect-api.postman_collection.json"');
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
        <title>Let's Connect API Documentation</title>
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

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log('Service routes configured:');
  Object.entries(services).forEach(([name, url]) => {
    console.log(`  - ${name}: ${url}`);
  });
});
