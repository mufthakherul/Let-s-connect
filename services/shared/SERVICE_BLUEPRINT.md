# Service Blueprint Template
# Workstream E1: Service blueprint standard

This template demonstrates the standard structure and patterns for all backend services.

## Directory Structure

```
service-name/
├── Dockerfile
├── package.json
├── server.js                    # Main entry point
├── jest.config.js              # Test configuration
├── src/
│   ├── routes/                 # Route definitions
│   │   ├── index.js           # Route aggregator
│   │   ├── public.routes.js   # Public endpoints
│   │   └── protected.routes.js # Protected endpoints
│   ├── controllers/            # Business logic controllers
│   │   ├── resource.controller.js
│   │   └── ...
│   ├── services/               # Service layer (data access logic)
│   │   ├── resource.service.js
│   │   └── ...
│   ├── validators/             # Request validation schemas
│   │   ├── resource.validator.js
│   │   └── ...
│   ├── models/                 # Database models (Sequelize)
│   │   ├── index.js           # Model loader
│   │   ├── Resource.js
│   │   └── ...
│   └── repositories/           # Optional: Data access layer
│       ├── resource.repository.js
│       └── ...
├── migrations/                 # Database migrations
│   ├── YYYYMMDDHHMMSS-create-resource.js
│   └── ...
└── tests/                      # Tests
    ├── unit/
    ├── integration/
    └── e2e/
```

## server.js Template

\`\`\`javascript
/**
 * Service Name
 * Description of what this service does
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

// Shared utilities
const logger = require('../shared/logger');
const { asyncHandler } = require('../shared/errorHandling');
const { initGracefulShutdown, createDatabaseCleanup } = require('../shared/graceful-shutdown');
const { createHealthCheck, setupHealthRoutes } = require('../shared/health-check');
const { validateEnv } = require('../shared/env-validator');
const { securityAuditMiddleware } = require('../shared/sanitization');
const { createForwardedIdentityGuard } = require('../shared/security-utils');
const responseWrapper = require('../shared/response-wrapper');

// Service-specific imports
const routes = require('./src/routes');
const db = require('./src/models');

// Environment configuration
const PORT = process.env.PORT || 8001;
const SERVICE_NAME = 'service-name';

// Validate environment variables at startup
const envValidation = validateEnv({
  strict: process.env.NODE_ENV === 'production',
  additionalSecrets: [],
  skipDatabase: false
});

if (!envValidation.valid) {
  logger.error('Environment validation failed', {
    errors: envValidation.errors
  });
  process.exit(1);
}

// Initialize Express app
const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || require('uuid').v4();
  res.setHeader('X-Request-Id', req.id);
  next();
});

// Forwarded identity guard (ensure requests come from gateway)
app.use(createForwardedIdentityGuard());

// Security audit logging
app.use(securityAuditMiddleware(logger));

// Request logging
app.use((req, res, next) => {
  logger.info('Request received', {
    method: req.method,
    path: req.path,
    userId: req.headers['x-user-id'],
    requestId: req.id
  });
  next();
});

// Initialize health checks
const healthCheck = createHealthCheck(SERVICE_NAME, {
  version: process.env.npm_package_version || '1.0.0',
  database: db.sequelize
});

// Setup health routes (must be before graceful shutdown middleware)
setupHealthRoutes(app, healthCheck);

// Mount service routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
  responseWrapper.error(
    req,
    res,
    'NOT_FOUND',
    \`Endpoint \${req.method} \${req.path} not found\`,
    404
  );
});

// Global error handler
const { errorHandler } = require('../shared/errorHandling');
app.use(errorHandler);

// Start server
const server = app.listen(PORT, async () => {
  logger.info(\`\${SERVICE_NAME} started\`, {
    port: PORT,
    env: process.env.NODE_ENV
  });
  
  // Sync database (development only)
  if (process.env.NODE_ENV === 'development') {
    try {
      await db.sequelize.sync();
      logger.info('Database synchronized');
    } catch (error) {
      logger.error('Database sync failed', { error: error.message });
    }
  }
});

// Setup graceful shutdown
const shutdownManager = initGracefulShutdown(app, server, {
  shutdownTimeout: 30000,
  healthcheckGracePeriod: 5000,
  logger
});

// Register database cleanup
shutdownManager.registerCleanup(
  'database',
  createDatabaseCleanup(db.sequelize),
  10
);

module.exports = { app, server, shutdownManager };
\`\`\`

## routes/index.js Template

\`\`\`javascript
const express = require('express');
const router = express.Router();

// Import route modules
const publicRoutes = require('./public.routes');
const protectedRoutes = require('./protected.routes');

// Mount routes
router.use('/public', publicRoutes);
router.use('/', protectedRoutes); // Requires authentication

module.exports = router;
\`\`\`

## routes/protected.routes.js Template

\`\`\`javascript
const express = require('express');
const router = express.Router();

// Shared utilities
const { asyncHandler } = require('../../shared/errorHandling');
const { requireAuth, requirePermission, Permissions } = require('../../shared/authorization');
const { validators, validate, Joi } = require('../../shared/validation');

// Service imports
const resourceController = require('../controllers/resource.controller');
const resourceValidator = require('../validators/resource.validator');

// Auth middleware applies to all routes in this file
router.use(requireAuth);

/**
 * Get all resources
 * GET /api/resources
 */
router.get(
  '/resources',
  validators.pagination(),
  asyncHandler(resourceController.getAll)
);

/**
 * Get resource by ID
 * GET /api/resources/:id
 */
router.get(
  '/resources/:id',
  validators.idParam('id'),
  asyncHandler(resourceController.getById)
);

/**
 * Create resource
 * POST /api/resources
 */
router.post(
  '/resources',
  requirePermission(Permissions.CONTENT_CREATE),
  validate(resourceValidator.create),
  asyncHandler(resourceController.create)
);

/**
 * Update resource
 * PUT /api/resources/:id
 */
router.put(
  '/resources/:id',
  validators.idParam('id'),
  requirePermission(Permissions.CONTENT_UPDATE),
  validate(resourceValidator.update),
  asyncHandler(resourceController.update)
);

/**
 * Delete resource
 * DELETE /api/resources/:id
 */
router.delete(
  '/resources/:id',
  validators.idParam('id'),
  requirePermission(Permissions.CONTENT_DELETE),
  asyncHandler(resourceController.delete)
);

module.exports = router;
\`\`\`

## validators/resource.validator.js Template

\`\`\`javascript
const { Joi, commonSchemas } = require('../../shared/validation');

/**
 * Validation schemas for resource endpoints
 */
module.exports = {
  /**
   * Create resource schema
   */
  create: {
    body: Joi.object({
      title: Joi.string().min(3).max(200).required(),
      content: Joi.string().min(1).max(10000).required(),
      type: Joi.string().valid('text', 'image', 'video').default('text'),
      tags: Joi.array().items(Joi.string()).max(10),
      isPublic: Joi.boolean().default(true)
    })
  },
  
  /**
   * Update resource schema
   */
  update: {
    body: Joi.object({
      title: Joi.string().min(3).max(200),
      content: Joi.string().min(1).max(10000),
      type: Joi.string().valid('text', 'image', 'video'),
      tags: Joi.array().items(Joi.string()).max(10),
      isPublic: Joi.boolean()
    }).min(1) // At least one field required
  }
};
\`\`\`

## controllers/resource.controller.js Template

\`\`\`javascript
const resourceService = require('../services/resource.service');
const responseWrapper = require('../../shared/response-wrapper');
const { NotFoundError, AuthorizationError } = require('../../shared/errorHandling');
const { sanitizeText, sanitizeRichText } = require('../../shared/sanitization');
const { isOwner } = require('../../shared/authorization');
const logger = require('../../shared/logger');

/**
 * Get all resources with pagination
 */
exports.getAll = async (req, res) => {
  const { page, limit, sort, sortBy } = req.query;
  const userId = req.headers['x-user-id'];
  
  const result = await resourceService.findAll({
    page: parseInt(page),
    limit: parseInt(limit),
    sort,
    sortBy,
    userId
  });
  
  return responseWrapper.paginated(req, res, result.data, {
    page: parseInt(page),
    limit: parseInt(limit),
    total: result.total
  });
};

/**
 * Get resource by ID
 */
exports.getById = async (req, res) => {
  const { id } = req.params;
  const userId = req.headers['x-user-id'];
  
  const resource = await resourceService.findById(id, userId);
  
  if (!resource) {
    throw new NotFoundError('Resource', id);
  }
  
  return responseWrapper.success(req, res, resource);
};

/**
 * Create resource
 */
exports.create = async (req, res) => {
  const userId = req.headers['x-user-id'];
  
  if (!userId) {
    throw new AuthorizationError('User ID required');
  }
  
  // Sanitize input
  const sanitizedData = {
    ...req.body,
    title: sanitizeText(req.body.title),
    content: sanitizeRichText(req.body.content)
  };
  
  const resource = await resourceService.create({
    ...sanitizedData,
    userId
  });
  
  logger.info('Resource created', {
    resourceId: resource.id,
    userId,
    requestId: req.id
  });
  
  return responseWrapper.success(req, res, resource, {}, 201);
};

/**
 * Update resource
 */
exports.update = async (req, res) => {
  const { id } = req.params;
  const userId = req.headers['x-user-id'];
  const isAdmin = req.headers['x-user-is-admin'] === 'true';
  
  // Check ownership
  const existing = await resourceService.findById(id);
  
  if (!existing) {
    throw new NotFoundError('Resource', id);
  }
  
  if (!isOwner({ id: userId }, existing) && !isAdmin) {
    throw new AuthorizationError('You do not own this resource');
  }
  
  // Sanitize input
  const sanitizedData = {
    ...req.body
  };
  
  if (req.body.title) {
    sanitizedData.title = sanitizeText(req.body.title);
  }
  if (req.body.content) {
    sanitizedData.content = sanitizeRichText(req.body.content);
  }
  
  const resource = await resourceService.update(id, sanitizedData);
  
  logger.info('Resource updated', {
    resourceId: id,
    userId,
    requestId: req.id
  });
  
  return responseWrapper.success(req, res, resource);
};

/**
 * Delete resource
 */
exports.delete = async (req, res) => {
  const { id } = req.params;
  const userId = req.headers['x-user-id'];
  const isAdmin = req.headers['x-user-is-admin'] === 'true';
  
  // Check ownership
  const existing = await resourceService.findById(id);
  
  if (!existing) {
    throw new NotFoundError('Resource', id);
  }
  
  if (!isOwner({ id: userId }, existing) && !isAdmin) {
    throw new AuthorizationError('You do not own this resource');
  }
  
  await resourceService.delete(id);
  
  logger.info('Resource deleted', {
    resourceId: id,
    userId,
    requestId: req.id
  });
  
  return responseWrapper.success(req, res, null, { deleted: true });
};
\`\`\`

## services/resource.service.js Template

\`\`\`javascript
const db = require('../models');
const { DatabaseError } = require('../../shared/errorHandling');
const logger = require('../../shared/logger');

const Resource = db.Resource;

/**
 * Find all resources with pagination
 */
exports.findAll = async (options = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = 'desc',
      sortBy = 'createdAt',
      userId = null
    } = options;
    
    const offset = (page - 1) * limit;
    
    const where = {};
    if (userId) {
      where.userId = userId;
    }
    
    const { count, rows } = await Resource.findAndCountAll({
      where,
      limit,
      offset,
      order: [[sortBy, sort.toUpperCase()]],
      attributes: { exclude: ['deletedAt'] }
    });
    
    return {
      data: rows,
      total: count
    };
  } catch (error) {
    logger.error('Failed to find resources', { error: error.message });
    throw new DatabaseError('Failed to retrieve resources', error);
  }
};

/**
 * Find resource by ID
 */
exports.findById = async (id, userId = null) => {
  try {
    const where = { id };
    if (userId) {
      where.userId = userId;
    }
    
    return await Resource.findOne({ where });
  } catch (error) {
    logger.error('Failed to find resource', { id, error: error.message });
    throw new DatabaseError('Failed to retrieve resource', error);
  }
};

/**
 * Create resource
 */
exports.create = async (data) => {
  try {
    return await Resource.create(data);
  } catch (error) {
    logger.error('Failed to create resource', { error: error.message });
    throw new DatabaseError('Failed to create resource', error);
  }
};

/**
 * Update resource
 */
exports.update = async (id, data) => {
  try {
    const resource = await Resource.findByPk(id);
    
    if (!resource) {
      return null;
    }
    
    await resource.update(data);
    return resource;
  } catch (error) {
    logger.error('Failed to update resource', { id, error: error.message });
    throw new DatabaseError('Failed to update resource', error);
  }
};

/**
 * Delete resource
 */
exports.delete = async (id) => {
  try {
    const resource = await Resource.findByPk(id);
    
    if (!resource) {
      return false;
    }
    
    await resource.destroy();
    return true;
  } catch (error) {
    logger.error('Failed to delete resource', { id, error: error.message });
    throw new DatabaseError('Failed to delete resource', error);
  }
};
\`\`\`

## Key Principles

### 1. Separation of Concerns
- **Routes**: HTTP endpoint definitions and middleware
- **Controllers**: Request/response handling and business logic orchestration
- **Services**: Core business logic and data manipulation
- **Validators**: Request schema validation
- **Models**: Database schema and relationships

### 2. Error Handling
- Use AppError classes from errorHandling.js
- Wrap async routes with asyncHandler
- Let the global error handler format responses

### 3. Security
- Always validate and sanitize user input
- Check authorization at controller boundaries
- Use prepared statements (Sequelize handles this)
- Log security-relevant events

### 4. Response Format
- Use responseWrapper for consistent responses
- Include request IDs for tracing
- Return appropriate HTTP status codes

### 5. Logging
- Log important events (create, update, delete)
- Include context (userId, resourceId, requestId)
- Use appropriate log levels

### 6. Testing
- Unit tests for services
- Integration tests for controllers
- E2E tests for critical flows

## Migration Checklist

- [ ] Create service directory structure
- [ ] Implement server.js with graceful shutdown
- [ ] Setup health checks (/health, /ready)
- [ ] Create route files with validation
- [ ] Implement controllers with sanitization
- [ ] Implement service layer
- [ ] Add authorization checks
- [ ] Add structured logging
- [ ] Write tests
- [ ] Document API endpoints
- [ ] Configure environment variables
