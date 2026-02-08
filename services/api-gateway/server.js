const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
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
  '/api/user/login'
];

// Check if route is public
const isPublicRoute = (path) => {
  return publicRoutes.some(route => path.startsWith(route));
};

// Proxy middleware with conditional authentication
const createAuthProxy = (target) => {
  return (req, res, next) => {
    if (isPublicRoute(req.path)) {
      return next();
    }
    authMiddleware(req, res, next);
  };
};

// User Service routes
app.use('/api/user', 
  createAuthProxy(services.user),
  createProxyMiddleware({ 
    target: services.user,
    changeOrigin: true,
    pathRewrite: { '^/api/user': '' }
  })
);

// Content Service routes
app.use('/api/content', 
  createAuthProxy(services.content),
  createProxyMiddleware({ 
    target: services.content,
    changeOrigin: true,
    pathRewrite: { '^/api/content': '' }
  })
);

// Messaging Service routes
app.use('/api/messaging', 
  authMiddleware,
  createProxyMiddleware({ 
    target: services.messaging,
    changeOrigin: true,
    pathRewrite: { '^/api/messaging': '' },
    ws: true
  })
);

// Collaboration Service routes
app.use('/api/collaboration', 
  createAuthProxy(services.collaboration),
  createProxyMiddleware({ 
    target: services.collaboration,
    changeOrigin: true,
    pathRewrite: { '^/api/collaboration': '' }
  })
);

// Media Service routes
app.use('/api/media', 
  createAuthProxy(services.media),
  createProxyMiddleware({ 
    target: services.media,
    changeOrigin: true,
    pathRewrite: { '^/api/media': '' }
  })
);

// Shop Service routes
app.use('/api/shop', 
  createAuthProxy(services.shop),
  createProxyMiddleware({ 
    target: services.shop,
    changeOrigin: true,
    pathRewrite: { '^/api/shop': '' }
  })
);

// AI Service routes
app.use('/api/ai', 
  authMiddleware,
  createProxyMiddleware({ 
    target: services.ai,
    changeOrigin: true,
    pathRewrite: { '^/api/ai': '' }
  })
);

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
