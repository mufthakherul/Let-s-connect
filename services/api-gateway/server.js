const express = require('express');
const proxy = require('express-http-proxy');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

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

// User Service routes
app.use('/api/user', createAuthProxy(services.user), proxy(services.user, {
  proxyReqPathResolver: function (req) {
    return req.originalUrl.replace('/api/user', '');
  }
}));

// Content Service routes
app.use('/api/content', createAuthProxy(services.content), proxy(services.content, {
  proxyReqPathResolver: function (req) {
    return req.originalUrl.replace('/api/content', '');
  }
}));

// Messaging Service routes
app.use('/api/messaging', createAuthProxy(services.messaging), proxy(services.messaging, {
  proxyReqPathResolver: function (req) {
    return req.originalUrl.replace('/api/messaging', '');
  }
}));

// Collaboration Service routes
app.use('/api/collaboration', createAuthProxy(services.collaboration), proxy(services.collaboration, {
  proxyReqPathResolver: function (req) {
    return req.originalUrl.replace('/api/collaboration', '');
  }
}));

// Media Service routes
app.use('/api/media', createAuthProxy(services.media), proxy(services.media, {
  proxyReqPathResolver: function (req) {
    return req.originalUrl.replace('/api/media', '');
  }
}));

// Shop Service routes
app.use('/api/shop', createAuthProxy(services.shop), proxy(services.shop, {
  proxyReqPathResolver: function (req) {
    return req.originalUrl.replace('/api/shop', '');
  }
}));

// AI Service routes
app.use('/api/ai', createAuthProxy(services.ai), proxy(services.ai, {
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
