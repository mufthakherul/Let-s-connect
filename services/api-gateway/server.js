const express = require('express');
const proxy = require('express-http-proxy');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Redis client for rate limiting
const redisClient = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Phase 6: Enhanced Rate Limiting with Redis

// Global rate limiter (fallback for unauthenticated requests)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    client: redisClient,
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
    client: redisClient,
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
    client: redisClient,
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
    client: redisClient,
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
    client: redisClient,
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Phase 6: Rate limit status endpoint
app.get('/api/rate-limit-status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.ip;
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
      limits[limitType] = {
        remaining: count ? parseInt(count) : 0,
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

// Service routes configuration
const services = {
  user: 'http://user-service:8001',
  content: 'http://content-service:8002',
  messaging: 'http://messaging-service:8003',
  collaboration: 'http://collaboration-service:8004',
  media: 'http://media-service:8005',
  shop: 'http://shop-service:8006',
  ai: 'http://ai-service:8007'
};

// Public routes (no authentication required)
const publicRoutes = [
  '/api/content/public',
  '/api/media/public',
  '/api/shop/public',
  '/api/collaboration/public',
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

// User Service routes
app.use('/api/user', createAuthProxy(services.user), applyUserLimiter, proxy(services.user, {
  proxyReqPathResolver: function (req) {
    return req.originalUrl.replace('/api/user', '');
  }
}));

// Authentication endpoints with strict rate limiting
app.use('/api/user/login', strictLimiter);
app.use('/api/user/register', strictLimiter);
app.use('/api/user/password-reset', strictLimiter);

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
