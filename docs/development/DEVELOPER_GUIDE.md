# Developer Guide - Let's Connect Platform

> **Complete technical guide for developers working on the Let's Connect platform**

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Development Environment Setup](#development-environment-setup)
3. [Project Structure](#project-structure)
4. [Backend Services](#backend-services)
5. [Frontend Development](#frontend-development)
6. [API Development](#api-development)
7. [Database](#database)
8. [Testing](#testing)
9. [Deployment](#deployment)
10. [Best Practices](#best-practices)

---

## Architecture Overview

### System Architecture

Let's Connect uses a **microservices architecture** with:

```
Frontend (React)
      ↓
API Gateway (Express)
      ↓
   ┌──────┴──────┬────────┬───────┬──────────┬──────────┬──────────┬──────────┐
   ↓             ↓        ↓       ↓          ↓          ↓          ↓          ↓
User        Content   Messaging  Media    Shop      AI      Streaming  Collaboration
Service     Service    Service  Service  Service  Service   Service    Service
      ↓         ↓          ↓        ↓        ↓        ↓         ↓          ↓
      └─────────┴──────────┴────────┴────────┴────────┴─────────┴──────────┘
                                    ↓
                         ┌──────────┴──────────┐
                         ↓                     ↓
                    PostgreSQL              Redis
                         ↓
                       MinIO
```

### Technology Stack

**Frontend:**
- React 18
- Material-UI
- Zustand (state management)
- React Query (data fetching)
- Socket.IO Client (real-time)

**Backend:**
- Node.js 18+
- Express.js
- Sequelize ORM
- Socket.IO (WebSocket)
- JWT authentication

**Databases:**
- PostgreSQL (primary data)
- Redis (cache & pub/sub)
- Elasticsearch (search - optional)

**Storage:**
- MinIO (S3-compatible object storage)

**Infrastructure:**
- Docker & Docker Compose
- Kubernetes (production)
- Nginx (reverse proxy)

---

## Development Environment Setup

### Prerequisites

- Node.js 18+ ([download](https://nodejs.org/))
- Docker & Docker Compose ([download](https://docker.com/))
- Git ([download](https://git-scm.com/))
- Code editor (VS Code recommended)

### Quick Start

1. **Clone Repository:**
```bash
git clone https://github.com/mufthakherul/Lets-connect.git
cd Lets-connect
```

2. **Set Up Environment:**
```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
nano .env
```

Required environment variables:
```bash
JWT_SECRET=your-secret-key-here
DB_PASSWORD=your-db-password
ADMIN_API_SECRET=your-admin-secret
OLLAMA_MODEL=llama3.2  # Local AI — no API key needed
```

3. **Start Infrastructure:**
```bash
# Start PostgreSQL and Redis
docker compose up postgres redis -d
```

4. **Install Dependencies:**
```bash
# Frontend
cd frontend && npm install --legacy-peer-deps

# Services (example: user-service)
cd services/user-service && npm install
```

5. **Run Database Migrations:**
```bash
cd services/user-service
npm run migrate
```

6. **Start Services:**

**Option A: All services with Docker:**
```bash
docker compose up --build -d
```

**Option B: Individual services (for development):**
```bash
# Terminal 1: API Gateway
cd services/api-gateway && npm start

# Terminal 2: User Service
cd services/user-service && npm start

# Terminal 3: Content Service
cd services/content-service && npm start

# Terminal 4: Frontend
cd frontend && npm start
```

7. **Access Application:**
```
Frontend: http://localhost:3000
API Gateway: http://localhost:8000
Admin Panel: http://localhost:3001 (with --profile admin)
```

### Development Tools

**Recommended VS Code Extensions:**
- ESLint
- Prettier
- Docker
- GitLens
- REST Client
- Thunder Client

**Useful Commands:**
```bash
# View logs
docker compose logs -f [service-name]

# Restart service
docker compose restart [service-name]

# Check service health
curl http://localhost:8000/health

# Database access
docker compose exec postgres psql -U postgres -d letsconnect

# Redis CLI
docker compose exec redis redis-cli
```

---

## Project Structure

```
Let-s-connect/
├── frontend/                    # React frontend
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom hooks
│   │   ├── store/              # Zustand stores
│   │   ├── utils/              # Utility functions
│   │   └── App.js              # Main app component
│   ├── public/                 # Static assets
│   └── package.json
│
├── admin_frontend/             # Admin dashboard (optional)
│   └── src/components/
│
├── services/                   # Backend microservices
│   ├── api-gateway/           # API Gateway & routing
│   ├── user-service/          # User management
│   ├── content-service/       # Posts, comments, etc.
│   ├── messaging-service/     # Real-time messaging
│   ├── media-service/         # File uploads & management
│   ├── shop-service/          # E-commerce
│   ├── ai-service/            # AI features
│   ├── streaming-service/     # Radio & TV streaming
│   ├── collaboration-service/ # Docs, projects, wiki
│   └── shared/                # Shared utilities
│       ├── db-sync-policy.js  # Database sync policy
│       ├── logger.js          # Logging utility
│       ├── errorHandling.js   # Error handlers
│       └── caching.js         # Cache utilities
│
├── k8s/                       # Kubernetes manifests
├── scripts/                   # Utility scripts
├── docs/                      # Documentation
│   ├── admin/                 # Admin guides
│   ├── user/                  # User guides
│   ├── development/           # Developer docs
│   └── deployment/            # Deployment guides
│
├── Archives/                  # Archived code/docs
│   ├── Archive_codes/
│   └── Archive_docs/
│
├── docker-compose.yml         # Docker Compose config
├── .env.example              # Example environment vars
└── README.md
```

### Service Structure (Example: user-service)

```
user-service/
├── src/
│   ├── models/               # Sequelize models
│   │   ├── index.js
│   │   ├── User.js
│   │   ├── Profile.js
│   │   └── Page.js
│   ├── routes/               # API routes
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── admin.js
│   │   └── pages.js
│   ├── middleware/           # Express middleware
│   │   ├── auth.js
│   │   └── validate.js
│   └── utils/                # Service utilities
│       └── jwt.js
├── migrations/               # Database migrations
├── server.js                 # Entry point
├── Dockerfile
└── package.json
```

---

## Backend Services

### Creating a New Service

1. **Create Service Directory:**
```bash
mkdir services/my-service
cd services/my-service
npm init -y
```

2. **Install Dependencies:**
```bash
npm install express sequelize pg pg-hstore
npm install --save-dev nodemon
```

3. **Create Entry Point (`server.js`):**
```javascript
const express = require('express');
const { syncWithPolicy } = require('../shared/db-sync-policy');
const logger = require('../shared/logger');

const app = express();
const PORT = process.env.PORT || 8005;

// Middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'my-service' });
});

// Routes
app.use('/api/myresource', require('./src/routes/myresource'));

// Start server
app.listen(PORT, async () => {
  logger.info(`My Service running on port ${PORT}`);
  
  // Sync database
  await syncWithPolicy('my-service');
});
```

4. **Add to API Gateway:**
```javascript
// services/api-gateway/server.js
app.use('/api/myresource', createProxyMiddleware({
  target: 'http://my-service:8005',
  changeOrigin: true
}));
```

5. **Add to Docker Compose:**
```yaml
# docker-compose.yml
my-service:
  build:
    context: ./services/my-service
  environment:
    - DB_HOST=postgres
    - REDIS_HOST=redis
  depends_on:
    - postgres
    - redis
```

### Database Models

Using Sequelize ORM:

```javascript
// services/user-service/src/models/User.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        len: [3, 30],
        isAlphanumeric: true
      }
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('user', 'moderator', 'admin'),
      defaultValue: 'user'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    timestamps: true,
    paranoid: true  // Soft deletes
  });

  // Associations
  User.associate = (models) => {
    User.hasOne(models.Profile);
    User.hasMany(models.Post);
  };

  return User;
};
```

### API Routes

```javascript
// services/user-service/src/routes/users.js
const express = require('express');
const router = express.Router();
const { User, Profile } = require('../models');
const authenticateJWT = require('../middleware/auth');

// Get user profile
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [Profile],
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    // Verify user can only update their own profile
    if (req.user.id !== parseInt(req.params.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update allowed fields only
    const { bio, location, website } = req.body;
    await user.update({ bio, location, website });
    
    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
```

### Authentication Middleware

```javascript
// services/shared/auth-middleware.js
const jwt = require('jsonwebtoken');

const authenticateJWT = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token.' });
  }
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }
    next();
  };
};

module.exports = { authenticateJWT, requireRole };
```

### Caching with Redis

```javascript
// services/shared/caching.js
const Redis = require('ioredis');
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

// Cache wrapper
async function cacheWrapper(key, ttl, fetchFunction) {
  // Try to get from cache
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch data
  const data = await fetchFunction();
  
  // Store in cache
  await redis.setex(key, ttl, JSON.stringify(data));
  
  return data;
}

// Example usage
router.get('/posts', async (req, res) => {
  const posts = await cacheWrapper(
    'posts:recent',
    300,  // 5 minutes
    async () => await Post.findAll({ limit: 20, order: [['createdAt', 'DESC']] })
  );
  
  res.json(posts);
});
```

---

## Frontend Development

### Component Structure

```javascript
// frontend/src/components/Post.js
import React, { useState } from 'react';
import { Card, CardContent, Typography, IconButton } from '@mui/material';
import { Favorite, Comment, Share } from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

const Post = ({ post }) => {
  const [liked, setLiked] = useState(post.isLiked);
  const queryClient = useQueryClient();
  
  const likeMutation = useMutation({
    mutationFn: () => api.post(`/api/content/posts/${post.id}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries(['posts']);
      setLiked(!liked);
    }
  });
  
  return (
    <Card>
      <CardContent>
        <Typography variant="h6">{post.title}</Typography>
        <Typography variant="body1">{post.content}</Typography>
        
        <Box sx={{ mt: 2 }}>
          <IconButton onClick={() => likeMutation.mutate()}>
            <Favorite color={liked ? 'error' : 'default'} />
          </IconButton>
          <IconButton>
            <Comment />
          </IconButton>
          <IconButton>
            <Share />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
};

export default Post;
```

### State Management with Zustand

```javascript
// frontend/src/store/authStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      login: (userData, token) => {
        set({
          user: userData,
          token,
          isAuthenticated: true
        });
      },
      
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false
        });
      },
      
      updateUser: (updates) => {
        set((state) => ({
          user: { ...state.user, ...updates }
        }));
      }
    }),
    {
      name: 'auth-storage'
    }
  )
);

export default useAuthStore;
```

### Data Fetching with React Query

```javascript
// frontend/src/hooks/usePosts.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

export const usePosts = (filter = {}) => {
  return useQuery({
    queryKey: ['posts', filter],
    queryFn: async () => {
      const { data } = await api.get('/api/content/posts', { params: filter });
      return data;
    },
    staleTime: 30000  // 30 seconds
  });
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (postData) => api.post('/api/content/posts', postData),
    onSuccess: () => {
      queryClient.invalidateQueries(['posts']);
    }
  });
};
```

### Websocket Integration

```javascript
// frontend/src/hooks/useSocket.js
import { useEffect } from 'use';
import { io } from 'socket.io-client';
import useAuthStore from '../store/authStore';

const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:8003', {
  autoConnect: false
});

export const useSocket = () => {
  const { token } = useAuthStore();
  
  useEffect(() => {
    if (token) {
      socket.auth = { token };
      socket.connect();
      
      return () => socket.disconnect();
    }
  }, [token]);
  
  return socket;
};

// Usage in component
const Chat = () => {
  const socket = useSocket();
  
  useEffect(() => {
    socket.on('new_message', (message) => {
      // Handle new message
    });
    
    return () => socket.off('new_message');
  }, [socket]);
};
```

---

## API Development

### API Documentation

All API endpoints are documented in [docs/development/API.md](./API.md).

### Creating New Endpoints

**Steps:**

1. **Define Route:**
```javascript
// services/content-service/src/routes/posts.js
router.post('/', authenticateJWT, async (req, res) => {
  // Implementation
});
```

2. **Add Validation:**
```javascript
const { body, validationResult } = require('express-validator');

router.post('/', [
  authenticateJWT,
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('content').trim().isLength({ min: 1, max: 10000 }),
  body('visibility').isIn(['public', 'friends', 'private'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  // Implementation
});
```

3. **Implement Business Logic:**
```javascript
const { Post } = require('../models');

router.post('/', [...validation], async (req, res) => {
  try {
    const post = await Post.create({
      userId: req.user.id,
      title: req.body.title,
      content: req.body.content,
      visibility: req.body.visibility || 'public'
    });
    
    res.status(201).json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

4. **Add to API Gateway:**
```javascript
// services/api-gateway/server.js
app.use('/api/content', createProxyMiddleware({
  target: 'http://content-service:8002',
  changeOrigin: true
}));
```

5. **Document Endpoint:**
```markdown
## Create Post

POST /api/content/posts

**Headers:**
- Authorization: Bearer {token}

**Body:**
\```json
{
  "title": "My Post Title",
  "content": "Post content here",
  "visibility": "public"
}
\```

**Response:**
\```json
{
  "id": 123,
  "userId": 1,
  "title": "My Post Title",
  "content": "Post content here",
  "visibility": "public",
  "createdAt": "2026-03-09T10:00:00Z"
}
\```
```

### Error Handling

```javascript
// services/shared/errorHandling.js
class APIError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const errorHandler = (err, req, res, next) => {
  const logger = require('./logger');
  
  logger.error('API Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  if (err instanceof APIError) {
    return res.status(err.status).json({ error: err.message });
  }
  
  res.status(500).json({ error: 'Internal server error' });
};

module.exports = { APIError, errorHandler };
```

---

## Database

### Migrations

Create database migrations:

```bash
# Create migration
npx sequelize-cli migration:generate --name add-tags-to-posts

# Run migrations
npx sequelize-cli db:migrate

# Rollback migration
npx sequelize-cli db:migrate:undo
```

Example migration:

```javascript
// migrations/20260309-add-tags-to-posts.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Posts', 'tags', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: true,
      defaultValue: []
    });
  },
  
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Posts', 'tags');
  }
};
```

### Database Best Practices

1. **Always use migrations** for schema changes
2. **Add indexes** for frequently queried fields
3. **Use transactions** for multi-step operations
4. **Avoid N+1 queries** (use eager loading)
5. **Implement soft deletes** (paranoid: true)

---

## Testing

### Unit Tests

```javascript
// services/user-service/tests/auth.test.js
const request = require('supertest');
const app = require('../server');

describe('POST /api/user/register', () => {
  it('should create a new user', async () => {
    const res = await request(app)
      .post('/api/user/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });
    
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
  });
  
  it('should reject duplicate username', async () => {
    // Create first user
    await request(app)
      .post('/api/user/register')
      .send({
        username: 'testuser2',
        email: 'test2@example.com',
        password: 'password123'
      });
    
    // Try to create with same username
    const res = await request(app)
      .post('/api/user/register')
      .send({
        username: 'testuser2',
        email: 'different@example.com',
        password: 'password123'
      });
    
    expect(res.statusCode).toBe(400);
  });
});
```

### Integration Tests

```javascript
// frontend/tests/smoke.spec.js (Playwright)
const { test, expect } = require('@playwright/test');

test('user can register and login', async ({ page }) => {
  // Go to homepage
  await page.goto('http://localhost:3000');
  
  // Click sign up
  await page.click('text=Sign Up');
  
  // Fill registration form
  await page.fill('input[name="username"]', 'newuser');
  await page.fill('input[name="email"]', 'newuser@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Should be redirected to home
  await expect(page).toHaveURL('http://localhost:3000/home');
  
  // Should see username in navigation
  await expect(page.locator('text=newuser')).toBeVisible();
});
```

### Run Tests

```bash
# Backend tests
cd services/user-service
npm test

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

---

## Deployment

See [Deployment Guide](../deployment/DEPLOYMENT_GUIDE.md) for detailed instructions.

**Quick Deploy:**

```bash
# Production build
docker compose -f docker-compose.prod.yml up -d --build

# Kubernetes
kubectl apply -f k8s/
```

---

## Best Practices

### Code Style

- Use **ES6+** syntax
- Follow **Airbnb JavaScript Style Guide**
- Use **Prettier** for formatting
- Use **ESLint** for linting

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/new-feature
```

**Commit Message Format:**
```
feat: new feature
fix: bug fix
docs: documentation
style: formatting
refactor: code restructuring
test: add tests
chore: maintenance
```

### Security

1. **Never commit secrets** to git
2. **Validate all inputs**
3. **Use parameterized queries**
4. **Implement rate limiting**
5. **Enable CORS properly**
6. **Use HTTPS in production**
7. **Keep dependencies updated**

### Performance

1. **Enable caching** (Redis)
2. **Use database indexes**
3. **Implement pagination**
4. **Optimize images**
5. **Use CDN for static assets**
6. **Enable gzip compression**
7. **Monitor performance metrics**

---

**Happy Coding! 🚀**

For questions or issues, see [README.md](../../README.md) or open an issue on GitHub.

---

**Last Updated:** March 9, 2026
**Version:** 2.5.0
